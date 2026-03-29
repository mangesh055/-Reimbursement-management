import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getPendingApprovals, actionApproval, getAIAssist } from '../../api/approvals'
import PageWrapper from '../../components/layout/PageWrapper'
import RiskScoreBadge from '../../components/common/RiskScoreBadge'
import Modal from '../../components/common/Modal'
import useAuthStore from '../../store/authStore'
import { CheckCircle, XCircle, Sparkles, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

export default function ApprovalsPage() {
  const { company } = useAuthStore()
  const sym = company?.currency_symbol || '₹'
  const qc = useQueryClient()
  const [comment, setComment] = useState({})
  const [aiModal, setAiModal] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [acting, setActing] = useState(null)

  const { data: pending, isLoading } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: () => getPendingApprovals().then(r => r.data)
  })

  const handleAction = async (expenseId, action) => {
    setActing(expenseId + action)
    try {
      await actionApproval(expenseId, { action, comments: comment[expenseId] || '' })
      toast.success(action === 'approved' ? 'Expense approved ✅' : 'Expense rejected ❌')
      qc.invalidateQueries({ queryKey: ['pending-approvals'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Action failed')
    } finally {
      setActing(null)
    }
  }

  const handleAIAssist = async (exp) => {
    setAiModal({ expense: exp, summary: null })
    setAiLoading(true)
    try {
      const r = await getAIAssist(exp.id)
      setAiModal({ expense: exp, summary: r.data.summary })
    } catch {
      setAiModal({ expense: exp, summary: 'AI analysis unavailable at the moment.' })
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <PageWrapper title="Pending Approvals">
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>Loading...</div>
      ) : pending?.length === 0 ? (
        <div className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>All caught up!</div>
          <div style={{ color: 'var(--text-secondary)' }}>No pending approvals at this time.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {pending.map(exp => (
            <div key={exp.id} className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: 13, flexShrink: 0 }}>
                      {exp.employee_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{exp.employee_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Submitted {new Date(exp.submitted_at || Date.now()).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <h3 style={{ margin: '8px 0 4px', fontSize: 16, fontWeight: 700 }}>{exp.title}</h3>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{exp.category} · {exp.expense_date}</div>
                  {exp.vendor_name && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{exp.vendor_name}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{sym}{Number(exp.amount).toLocaleString('en-IN')}</div>
                  <RiskScoreBadge score={exp.risk_score} />
                </div>
              </div>

              {/* Policy flags */}
              {exp.policy_flags?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {exp.policy_flags.map((f, i) => (
                    <span key={i} style={{ fontSize: 11, background: '#1c1a08', color: '#fbbf24', border: '1px solid #92400e', padding: '3px 10px', borderRadius: 6 }}>⚠ {f}</span>
                  ))}
                </div>
              )}

              {/* Comment */}
              <textarea
                value={comment[exp.id] || ''}
                onChange={e => setComment(prev => ({ ...prev, [exp.id]: e.target.value }))}
                className="form-input"
                placeholder="Add a comment (optional)..."
                rows={2}
                style={{ marginBottom: 12, resize: 'vertical' }}
              />

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => handleAIAssist(exp)} className="btn-secondary" style={{ fontSize: 13 }}>
                  <Sparkles size={14} style={{ color: '#818cf8' }} />
                  AI Assist
                </button>
                <Link to={`/expenses/${exp.id}`} className="btn-secondary" style={{ fontSize: 13, textDecoration: 'none' }}>
                  <Eye size={14} />
                  View
                </Link>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => handleAction(exp.id, 'rejected')}
                  disabled={acting === exp.id + 'rejected'}
                  className="btn-danger" style={{ fontSize: 13 }}
                >
                  <XCircle size={14} />
                  {acting === exp.id + 'rejected' ? 'Rejecting...' : 'Reject'}
                </button>
                <button
                  onClick={() => handleAction(exp.id, 'approved')}
                  disabled={acting === exp.id + 'approved'}
                  className="btn-success" style={{ fontSize: 13 }}
                >
                  <CheckCircle size={14} />
                  {acting === exp.id + 'approved' ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Assist Modal */}
      <Modal isOpen={!!aiModal} onClose={() => setAiModal(null)} title="💡 AI Manager Summary" width={500}>
        {aiModal && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{aiModal.expense.title}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{aiModal.expense.employee_name} · {sym}{Number(aiModal.expense.amount).toLocaleString('en-IN')}</div>
            </div>
            <div style={{ padding: 16, background: 'rgba(99,102,241,0.08)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)', lineHeight: 1.7 }}>
              {aiLoading ? (
                <div className="pulse" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>🤖 Generating AI summary...</div>
              ) : (
                <p style={{ margin: 0, fontSize: 14, color: '#e8e8f0' }}>{aiModal.summary}</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setAiModal(null)} className="btn-secondary">Close</button>
              <button onClick={() => { handleAction(aiModal.expense.id, 'rejected'); setAiModal(null) }} className="btn-danger">Reject</button>
              <button onClick={() => { handleAction(aiModal.expense.id, 'approved'); setAiModal(null) }} className="btn-success">Approve</button>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  )
}
