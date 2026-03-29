from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from app.models.expense import Expense
from app.models.expense_approval import ExpenseApproval
from app.models.approval_rule import ApprovalRule, ApprovalRuleApprover
from app.models.notification import Notification
from app.services import audit_service
import logging

logger = logging.getLogger(__name__)


def find_matching_rule(expense: Expense, db: Session) -> Optional[ApprovalRule]:
    """Find the best matching approval rule for an expense."""
    rules = (db.query(ApprovalRule)
             .filter(ApprovalRule.company_id == expense.company_id,
                     ApprovalRule.is_active == True)
             .all())
    # Score rules: category-specific beats generic; tighter amount range beats wider
    best_rule = None
    best_score = -1
    amount = float(expense.amount_in_company_currency)
    for rule in rules:
        # Check amount range
        if rule.min_amount is not None and amount < float(rule.min_amount):
            continue
        if rule.max_amount is not None and amount > float(rule.max_amount):
            continue
        score = 0
        if rule.category and rule.category == expense.category:
            score += 10
        elif rule.category:
            continue  # category rule that doesn't match
        if rule.min_amount is not None:
            score += 1
        if rule.max_amount is not None:
            score += 1
        if score > best_score:
            best_score = score
            best_rule = rule
    return best_rule


def build_approval_chain(expense: Expense, rule: Optional[ApprovalRule], db: Session):
    """Create ExpenseApproval rows for the expense based on the matching rule."""
    steps = []
    seq = 0

    # Step 0: Manager (if rule says so, or no rule)
    if rule is None or rule.is_manager_approver:
        manager_id = expense.employee.manager_id if expense.employee else None
        if manager_id:
            steps.append(ExpenseApproval(
                expense_id=expense.id,
                rule_id=rule.id if rule else None,
                approver_id=manager_id,
                sequence_order=seq,
                status="pending"
            ))
            seq += 1

    # Additional approvers from rule
    if rule:
        for ra in sorted(rule.approvers, key=lambda x: x.sequence_order):
            # Skip if already added as manager
            already = any(s.approver_id == ra.user_id for s in steps)
            if not already:
                steps.append(ExpenseApproval(
                    expense_id=expense.id,
                    rule_id=rule.id,
                    approver_id=ra.user_id,
                    sequence_order=seq,
                    status="pending"
                ))
                seq += 1

    for step in steps:
        db.add(step)

    if steps:
        expense.current_approver_id = steps[0].approver_id
        expense.current_approval_step = 0
    return steps


def process_approval_action(expense_id: int, approver_id: int,
                              action: str, comments: str, db: Session) -> Expense:
    """Core approval workflow engine."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise ValueError("Expense not found")
    if expense.status != "pending":
        raise ValueError("Expense is not pending approval")
    if expense.current_approver_id != approver_id:
        raise ValueError("You are not the current approver")

    # Update current approval step
    current_step = (db.query(ExpenseApproval)
                    .filter(ExpenseApproval.expense_id == expense_id,
                            ExpenseApproval.approver_id == approver_id,
                            ExpenseApproval.status == "pending")
                    .order_by(ExpenseApproval.sequence_order)
                    .first())
    if not current_step:
        raise ValueError("Approval step not found")

    current_step.status = action  # "approved" or "rejected"
    current_step.comments = comments
    current_step.actioned_at = datetime.utcnow()

    rule = current_step.rule

    if action == "rejected":
        expense.status = "rejected"
        expense.rejection_reason = comments
        _skip_remaining(expense_id, approver_id, db)
        audit_service.log_action(db, expense.company_id, "EXPENSE_REJECTED",
                                  "expense", expense_id, approver_id, {"comments": comments})
        db.commit()
        return expense

    # Approved — determine next step based on mode
    mode = rule.approval_mode if rule else "sequential"

    if mode == "sequential":
        _handle_sequential(expense, current_step, db)
    elif mode == "conditional":
        _handle_conditional(expense, current_step, rule, approver_id, db)
    elif mode == "hybrid":
        _handle_hybrid(expense, current_step, rule, approver_id, db)

    db.commit()
    return expense


def _handle_sequential(expense: Expense, current_step: ExpenseApproval, db: Session):
    next_step = (db.query(ExpenseApproval)
                 .filter(ExpenseApproval.expense_id == expense.id,
                         ExpenseApproval.sequence_order > current_step.sequence_order,
                         ExpenseApproval.status == "pending")
                 .order_by(ExpenseApproval.sequence_order)
                 .first())
    if next_step:
        expense.current_approver_id = next_step.approver_id
        expense.current_approval_step = next_step.sequence_order
        _notify_approver(next_step.approver_id, expense, db)
        audit_service.log_action(db, expense.company_id, "EXPENSE_APPROVAL_STEP_COMPLETED",
                                  "expense", expense.id, current_step.approver_id)
    else:
        _finalize_approved(expense, current_step.approver_id, db)


def _handle_conditional(expense: Expense, current_step: ExpenseApproval,
                         rule: ApprovalRule, approver_id: int, db: Session):
    # Check specific approver instant-approve
    if rule.specific_approver_id and approver_id == rule.specific_approver_id:
        _skip_remaining(expense.id, approver_id, db)
        _finalize_approved(expense, approver_id, db)
        return

    all_steps = (db.query(ExpenseApproval)
                 .filter(ExpenseApproval.expense_id == expense.id)
                 .all())
    total = len(all_steps)
    approved_count = sum(1 for s in all_steps if s.status == "approved")
    min_pct = rule.minimum_approval_percentage or 100

    if total > 0 and (approved_count / total) >= (min_pct / 100):
        _skip_remaining(expense.id, approver_id, db)
        _finalize_approved(expense, approver_id, db)
    else:
        remaining = sum(1 for s in all_steps if s.status == "pending")
        max_possible = approved_count + remaining
        if total > 0 and (max_possible / total) < (min_pct / 100):
            expense.status = "rejected"
            expense.rejection_reason = "Insufficient approvals to meet threshold"
            audit_service.log_action(db, expense.company_id, "EXPENSE_REJECTED",
                                      "expense", expense.id, approver_id)
        else:
            # Move to next pending approver
            next_step = (db.query(ExpenseApproval)
                         .filter(ExpenseApproval.expense_id == expense.id,
                                 ExpenseApproval.status == "pending",
                                 ExpenseApproval.approver_id != approver_id)
                         .order_by(ExpenseApproval.sequence_order)
                         .first())
            if next_step:
                expense.current_approver_id = next_step.approver_id
                expense.current_approval_step = next_step.sequence_order


def _handle_hybrid(expense: Expense, current_step: ExpenseApproval,
                    rule: ApprovalRule, approver_id: int, db: Session):
    if rule.specific_approver_id and approver_id == rule.specific_approver_id:
        _skip_remaining(expense.id, approver_id, db)
        _finalize_approved(expense, approver_id, db)
        return
    _handle_conditional(expense, current_step, rule, approver_id, db)


def _skip_remaining(expense_id: int, excluding_approver_id: int, db: Session):
    db.query(ExpenseApproval).filter(
        ExpenseApproval.expense_id == expense_id,
        ExpenseApproval.status == "pending",
        ExpenseApproval.approver_id != excluding_approver_id
    ).update({"status": "skipped"})


def _finalize_approved(expense: Expense, approver_id: int, db: Session):
    expense.status = "approved"
    expense.approved_at = datetime.utcnow()
    expense.current_approver_id = None
    audit_service.log_action(db, expense.company_id, "EXPENSE_APPROVED",
                              "expense", expense.id, approver_id)
    # Notify employee
    _notify_user(expense.employee_id, "Expense Approved! 🎉",
                 f'Your expense "{expense.title}" has been approved.', expense.id, db)


def _notify_approver(approver_id: int, expense: Expense, db: Session):
    _notify_user(approver_id, "New Expense Pending Approval",
                 f'"{expense.title}" from {expense.employee.name} needs your review.',
                 expense.id, db)


def _notify_user(user_id: int, title: str, body: str, expense_id: int, db: Session):
    notif = Notification(user_id=user_id, title=title, body=body, expense_id=expense_id)
    db.add(notif)
