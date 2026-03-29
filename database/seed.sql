USE reimburse_ai;

-- Company
INSERT IGNORE INTO companies (id, name, country, currency_code, currency_symbol, expense_policy_text) VALUES
(1, 'Odoo India Pvt Ltd', 'India', 'INR', '₹',
'Expense Policy:\n- Meals: Max ₹500 per person. Alcohol not reimbursable.\n- Travel: Economy class only for flights under 4 hours.\n- Accommodation: Max ₹5000/night. Luxury hotels require VP approval.\n- Entertainment: Must have business justification. Weekend entertainment requires manager note.\n- Office Supplies: Max ₹2000 per item without pre-approval.');

-- Users (passwords: admin123 / manager123 / employee123)
-- bcrypt hashes generated with 12 rounds
INSERT IGNORE INTO users (id, company_id, name, email, password_hash, role) VALUES
(1, 1, 'Admin User', 'admin@odoo.in',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMJjuF8ODqkqHAcbDXRf5Y4qfC', 'admin');

INSERT IGNORE INTO users (id, company_id, name, email, password_hash, role) VALUES
(2, 1, 'Ravi Shankar', 'ravi@odoo.in',
 '$2b$12$92IXUNpkjO8quTcD0gMkaezScDDDroTzV27FKAenTVeqJzS.VWgQq', 'manager'),
(3, 1, 'Sarah Finance', 'sarah@odoo.in',
 '$2b$12$92IXUNpkjO8quTcD0gMkaezScDDDroTzV27FKAenTVeqJzS.VWgQq', 'manager');

INSERT IGNORE INTO users (id, company_id, name, email, password_hash, role, manager_id) VALUES
(4, 1, 'Priya Mehta', 'priya@odoo.in',
 '$2b$12$KJHM7.Z0nXhOQ5hq7p/jAuDMfEJYW3mIiYMp9HHG5XtBz6Z2ioqiW', 'employee', 2),
(5, 1, 'Arjun Kapoor', 'arjun@odoo.in',
 '$2b$12$KJHM7.Z0nXhOQ5hq7p/jAuDMfEJYW3mIiYMp9HHG5XtBz6Z2ioqiW', 'employee', 2),
(6, 1, 'Neha Singh', 'neha@odoo.in',
 '$2b$12$KJHM7.Z0nXhOQ5hq7p/jAuDMfEJYW3mIiYMp9HHG5XtBz6Z2ioqiW', 'employee', 3),
(7, 1, 'Amit Sharma', 'amit@odoo.in',
 '$2b$12$KJHM7.Z0nXhOQ5hq7p/jAuDMfEJYW3mIiYMp9HHG5XtBz6Z2ioqiW', 'employee', 3);

-- Approval Rules
INSERT IGNORE INTO approval_rules (id, company_id, name, category, min_amount, is_manager_approver, approval_mode) VALUES
(1, 1, 'All expenses > ₹1000', NULL, 1000.00, TRUE, 'sequential'),
(2, 1, 'Travel (any amount)', 'Travel', NULL, TRUE, 'sequential'),
(3, 1, 'Large expenses > ₹10000', NULL, 10000.00, TRUE, 'sequential');

-- Assign Sarah as Finance approver for rules 1 and 2
INSERT IGNORE INTO approval_rule_approvers (rule_id, user_id, sequence_order) VALUES
(1, 3, 1),
(2, 3, 1),
(3, 3, 1),
(3, 1, 2);

-- Budgets
INSERT IGNORE INTO budgets (company_id, department_name, category, budget_amount, period, period_start, period_end) VALUES
(1, 'Engineering', 'Travel', 50000.00, 'monthly', '2025-03-01', '2025-03-31'),
(1, 'Engineering', 'Meals', 20000.00, 'monthly', '2025-03-01', '2025-03-31'),
(1, 'Engineering', 'Office Supplies', 15000.00, 'monthly', '2025-03-01', '2025-03-31'),
(1, 'Marketing', 'Entertainment', 30000.00, 'monthly', '2025-03-01', '2025-03-31');

-- Sample expenses in various states
INSERT IGNORE INTO expenses (id, company_id, employee_id, title, amount, currency,
    amount_in_company_currency, exchange_rate, category, description,
    expense_date, vendor_name, risk_score, policy_flags, status, submitted_at, approved_at) VALUES
(1, 1, 4, 'Team Lunch', 2400.00, 'INR', 2400.00, 1.0, 'Meals',
 'Lunch with engineering team', '2025-03-10', 'Haldirams', 5, '[]', 'approved',
 '2025-03-10 10:00:00', '2025-03-10 14:00:00'),
(2, 1, 4, 'Bangalore Flight', 12500.00, 'INR', 12500.00, 1.0, 'Travel',
 'Flight to client meeting in Bangalore', '2025-03-15', 'IndiGo Airlines', 15, '[]',
 'approved', '2025-03-14 09:00:00', '2025-03-15 11:00:00'),
(3, 1, 5, 'Hotel Stay Bangalore', 8500.00, 'INR', 8500.00, 1.0, 'Accommodation',
 '2 nights stay at hotel', '2025-03-15', 'Marriott Bengaluru', 35,
 '["Luxury hotel — exceeds accommodation policy"]', 'pending', '2025-03-15 12:00:00', NULL),
(4, 1, 6, 'Office Supplies', 3200.00, 'INR', 3200.00, 1.0, 'Office Supplies',
 'Printer cartridges and stationery', '2025-03-20', 'Amazon Business', 5, '[]',
 'draft', NULL, NULL),
(5, 1, 4, 'Client Dinner', 6800.00, 'INR', 6800.00, 1.0, 'Entertainment',
 'Dinner with enterprise client', '2025-03-22', 'Taj Vivanta', 25,
 '["Weekend entertainment — needs business justification"]', 'pending',
 '2025-03-22 20:00:00', NULL),
(6, 1, 7, 'AWS Training', 15000.00, 'INR', 15000.00, 1.0, 'Training',
 'AWS Solutions Architect course', '2025-03-18', 'Simplilearn', 5, '[]',
 'approved', '2025-03-17 08:00:00', '2025-03-18 10:00:00'),
(7, 1, 5, 'Cab to Airport', 850.00, 'INR', 850.00, 1.0, 'Travel',
 'Cab fare to IGI airport', '2025-03-14', 'Ola Cabs', 5, '[]',
 'approved', '2025-03-14 06:00:00', '2025-03-14 09:00:00'),
(8, 1, 6, 'Medical Checkup', 4500.00, 'INR', 4500.00, 1.0, 'Medical',
 'Annual health checkup reimbursement', '2025-03-05', 'Apollo Hospitals', 5, '[]',
 'approved', '2025-03-06 09:00:00', '2025-03-06 14:00:00');

-- Set current approver for pending expenses
UPDATE expenses SET current_approver_id = 2, current_approval_step = 0 WHERE id = 3;
UPDATE expenses SET current_approver_id = 2, current_approval_step = 0 WHERE id = 5;

-- Approval records for approved expenses
INSERT IGNORE INTO expense_approvals (expense_id, approver_id, sequence_order, status, comments, actioned_at) VALUES
(1, 2, 0, 'approved', 'Approved — reasonable amount', '2025-03-10 14:00:00'),
(2, 2, 0, 'approved', 'Business trip approved', '2025-03-15 11:00:00'),
(2, 3, 1, 'approved', 'Finance approved', '2025-03-15 11:30:00'),
(6, 3, 0, 'approved', 'Training is pre-approved for Q1', '2025-03-18 10:00:00'),
(7, 2, 0, 'approved', 'OK', '2025-03-14 09:00:00'),
(8, 3, 0, 'approved', 'Medical approved', '2025-03-06 14:00:00');

-- Pending approval records
INSERT IGNORE INTO expense_approvals (expense_id, approver_id, sequence_order, status) VALUES
(3, 2, 0, 'pending'),
(5, 2, 0, 'pending');

-- Audit logs
INSERT IGNORE INTO audit_logs (company_id, user_id, action, entity_type, entity_id, details) VALUES
(1, 1, 'COMPANY_CREATED', 'company', 1, '{"name": "Odoo India Pvt Ltd"}'),
(1, 1, 'USER_CREATED', 'user', 2, '{"name": "Ravi Shankar", "role": "manager"}'),
(1, 4, 'EXPENSE_SUBMITTED', 'expense', 1, '{"title": "Team Lunch"}'),
(1, 2, 'EXPENSE_APPROVED', 'expense', 1, '{"comments": "Approved"}');
