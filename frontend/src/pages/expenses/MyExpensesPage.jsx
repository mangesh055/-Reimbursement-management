import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { getExpenses, submitExpense, cancelExpense } from '../../api/expenses'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/common/Badge'
import RiskScoreBadge from '../../components/common/RiskScoreBadge'
import useAuthStore from '../../store/authStore'
import { Plus, Filter, Eye, Send, X } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_OPTS = ['', 'draft', 'pending', 'approved', 'rejected', 'cancelled']

export default function MyExpensesPage() {
  const { user, company } = useAuthStore()
  const navigate = useNavigate()
  const sym = company?.currency_symbol || '₹'
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['expenses', status, page],
    queryFn: () => getExpenses({ status: status || undefined, page, limit: 15 }).then(r => r.data)
  })

  const handleSubmit = async (id) => {
    try {
      await submitExpense(id)
      toast.success('Submitted for approval!')
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Submit failed')
    }
  }

  const handleCancel = async (id) => {
    try {
      await cancelExpense(id)
      toast.success('Expense cancelled')
      refetch()
    } catch {}
    refetch()
  }

  return (
    <PageWrapper title={user?.role === 'employee' ? 'My Expenses' : 'All Expenses'}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="form-input" style={{ width: 150, padding: '8px 12px' }}>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Status'}</option>)}
          </select>
        </div>
        {user?.role === 'employee' && (
          <Link to="/expenses/new" className="btn-primary"><Plus size={16} /> New Expense</Link>
        )}
      </div>

      <div className="glass-card">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
        ) : data?.items?.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>No expenses found</div>
            {user?.role === 'employee' && <Link to="/expenses/new" className="btn-primary"><Plus size={14} /> Add your first expense</Link>}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(e => (
                <tr key={e.id}>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{e.title}</div>
                    {e.vendor_name && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{e.vendor_name}</div>}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{e.expense_date}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{sym}{Number(e.amount_in_company_currency).toLocaleString('en-IN')}</div>
                    {e.currency !== company?.currency_code && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{e.currency} {e.amount}</div>}
                  </td>
                  <td style={{ fontSize: 12 }}>{e.category}</td>
                  <td><RiskScoreBadge score={e.risk_score} /></td>
                  <td>
                    <Badge status={e.status} />
                    {e.policy_flags?.length > 0 && <div style={{ marginTop: 4 }}>⚠️ {e.policy_flags.length} flag(s)</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => navigate(`/expenses/${e.id}`)} className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }}>
                        <Eye size={12} />
                      </button>
                      {e.status === 'draft' && user?.role === 'employee' && (
                        <button onClick={() => handleSubmit(e.id)} className="btn-primary" style={{ padding: '6px 10px', fontSize: 12 }}>
                          <Send size={12} />
                        </button>
                      )}
                      {['draft', 'pending'].includes(e.status) && user?.role === 'employee' && (
                        <button onClick={() => handleCancel(e.id)} className="btn-danger" style={{ padding: '6px 10px', fontSize: 12 }}>
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data?.total > 15 && (
          <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{data.total} total</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>Previous</button>
              <button disabled={page * 15 >= data.total} onClick={() => setPage(p => p + 1)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>Next</button>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
