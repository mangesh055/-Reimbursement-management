import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../api/axios'
import PageWrapper from '../../components/layout/PageWrapper'

export default function AuditLogPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => api.get('/audit-logs', { params: { page, limit: 30 } }).then(r => r.data)
  })

  const ACTION_COLORS = {
    EXPENSE_APPROVED: '#22c55e', EXPENSE_REJECTED: '#ef4444',
    EXPENSE_SUBMITTED: '#3b82f6', EXPENSE_CREATED: '#818cf8',
    USER_CREATED: '#14b8a6', COMPANY_CREATED: '#f59e0b',
  }

  return (
    <PageWrapper title="Audit Log">
      <div className="glass-card">
        {isLoading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div> : (
          <table className="data-table">
            <thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>Entity ID</th><th>User</th></tr></thead>
            <tbody>
              {(data?.items || []).map(l => (
                <tr key={l.id}>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleString()}</td>
                  <td>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600,
                      background: `${ACTION_COLORS[l.action] || '#6366f1'}20`,
                      color: ACTION_COLORS[l.action] || '#818cf8',
                      border: `1px solid ${ACTION_COLORS[l.action] || '#6366f1'}40`
                    }}>{l.action}</span>
                  </td>
                  <td style={{ fontSize: 13, textTransform: 'capitalize' }}>{l.entity_type}</td>
                  <td style={{ fontSize: 13 }}>#{l.entity_id}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>User #{l.user_id || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data?.total > 30 && (
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{data.total} total entries</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>Previous</button>
              <button disabled={page * 30 >= data.total} onClick={() => setPage(p => p + 1)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>Next</button>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
