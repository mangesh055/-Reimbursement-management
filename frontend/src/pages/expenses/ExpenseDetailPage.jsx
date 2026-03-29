import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getExpense } from '../../api/expenses'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/common/Badge'
import RiskScoreBadge from '../../components/common/RiskScoreBadge'
import useAuthStore from '../../store/authStore'
import { CheckCircle, Clock, XCircle, ChevronLeft, Image } from 'lucide-react'

const StepIcon = ({ status }) => {
  if (status === 'approved') return <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#052e16', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={14} color="#22c55e" /></div>
  if (status === 'rejected') return <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2d0a0a', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><XCircle size={14} color="#ef4444" /></div>
  if (status === 'skipped') return <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#111', border: '2px solid #4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 10, color: '#6b7280' }}>—</span></div>
  return <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1c1a08', border: '2px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="pulse"><Clock size={13} color="#f59e0b" /></div>
}

export default function ExpenseDetailPage() {
  const { id } = useParams()
  const { company } = useAuthStore()
  const sym = company?.currency_symbol || '₹'

  const { data: expense, isLoading } = useQuery({
    queryKey: ['expense', id],
    queryFn: () => getExpense(id).then(r => r.data)
  })

  if (isLoading) return <PageWrapper title="Expense Detail"><div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>Loading...</div></PageWrapper>
  if (!expense) return <PageWrapper title="Expense Detail"><div>Not found</div></PageWrapper>

  return (
    <PageWrapper title="Expense Detail">
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link to="/expenses" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13, marginBottom: 20 }}>
          <ChevronLeft size={16} /> Back to Expenses
        </Link>

        {/* Header card */}
        <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{expense.title}</h2>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{expense.vendor_name} · {expense.expense_date}</div>
            </div>
            <Badge status={expense.status} size="md" />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>AMOUNT</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{sym}{Number(expense.amount_in_company_currency).toLocaleString('en-IN')}</div>
              {expense.currency !== company?.currency_code && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{expense.currency} {expense.amount} @ {expense.exchange_rate}</div>}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>CATEGORY</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{expense.category}</div>
              {expense.ai_suggested_category && expense.ai_suggested_category !== expense.category && (
                <div style={{ fontSize: 11, color: '#818cf8' }}>AI suggested: {expense.ai_suggested_category} ({expense.ai_category_confidence}%)</div>
              )}
            </div>
            {expense.description && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>DESCRIPTION</div>
                <div style={{ fontSize: 13 }}>{expense.description}</div>
              </div>
            )}
          </div>

          {/* AI Analysis */}
          {(expense.policy_flags?.length > 0 || expense.risk_score != null) && (
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#818cf8', marginBottom: 8 }}>🤖 AI Analysis</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <RiskScoreBadge score={expense.risk_score} />
                {expense.policy_flags?.map((f, i) => (
                  <span key={i} style={{ fontSize: 12, background: '#1c1a08', color: '#fbbf24', border: '1px solid #92400e', padding: '3px 10px', borderRadius: 6 }}>⚠ {f}</span>
                ))}
              </div>
              {expense.risk_reason && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>{expense.risk_reason}</div>}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: expense.receipt_url ? '1fr 1fr' : '1fr', gap: 16 }}>
          {/* Approval Timeline */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Approval Timeline</h3>
            {expense.approvals?.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                {expense.status === 'draft' ? 'Not yet submitted for approval' : 'No approval steps found'}
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                {expense.approvals.map((a, i) => (
                  <div key={a.id} style={{ display: 'flex', gap: 12, marginBottom: i < expense.approvals.length - 1 ? 20 : 0, position: 'relative' }}>
                    {i < expense.approvals.length - 1 && (
                      <div style={{ position: 'absolute', left: 13, top: 28, width: 2, height: 20, background: 'var(--border-color)' }} />
                    )}
                    <StepIcon status={a.status} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{a.approver_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Step {a.sequence_order + 1} · <Badge status={a.status} /></div>
                      {a.comments && <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 4, fontStyle: 'italic' }}>"{a.comments}"</div>}
                      {a.actioned_at && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{new Date(a.actioned_at).toLocaleString()}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {expense.rejection_reason && (
              <div style={{ marginTop: 16, padding: 12, background: '#2d0a0a', borderRadius: 8, border: '1px solid #7f1d1d', fontSize: 13, color: '#f87171' }}>
                ❌ Rejection reason: {expense.rejection_reason}
              </div>
            )}
          </div>

          {/* Receipt */}
          {expense.receipt_url && (
            <div className="glass-card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><Image size={16} /> Receipt</h3>
              <img src={`http://localhost:8000${expense.receipt_url}`} alt="Receipt" style={{ width: '100%', borderRadius: 8, maxHeight: 300, objectFit: 'contain', background: 'rgba(0,0,0,0.3)' }} />
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
