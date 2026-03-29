import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../api/axios'
import PageWrapper from '../../components/layout/PageWrapper'
import useAuthStore from '../../store/authStore'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { company: storeCompany } = useAuthStore()
  const qc = useQueryClient()
  const { data: company } = useQuery({ queryKey: ['company-me'], queryFn: () => api.get('/companies/me').then(r => r.data) })
  const [policy, setPolicy] = useState('')

  React.useEffect(() => {
    if (company) setPolicy(company.expense_policy_text || '')
  }, [company])

  const handleSave = async () => {
    try {
      await api.put('/companies/me', { expense_policy_text: policy })
      qc.invalidateQueries({ queryKey: ['company-me'] })
      toast.success('Policy updated! AI will now check receipts against this policy.')
    } catch {
      toast.error('Failed to update')
    }
  }

  return (
    <PageWrapper title="Company Settings">
      <div style={{ maxWidth: 700 }}>
        <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Company Info</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[['Company Name', company?.name], ['Country', company?.country], ['Currency', `${company?.currency_code} (${company?.currency_symbol})`]].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{value || '—'}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>🤖 Expense Policy</h3>
            <span style={{ fontSize: 11, background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '2px 8px', borderRadius: 6 }}>AI-checked on every expense</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 14px' }}>Gemini AI will check all new expenses against this policy and flag violations automatically.</p>
          <textarea
            value={policy}
            onChange={e => setPolicy(e.target.value)}
            className="form-input"
            rows={10}
            placeholder="Enter your expense policy here...&#10;&#10;Example:&#10;- Meals: Max ₹500 per person. No alcohol.&#10;- Travel: Economy class for flights under 4 hours.&#10;- Hotels: Max ₹5000/night. Luxury hotels need VP approval."
            style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button onClick={handleSave} className="btn-primary">
              <Save size={14} />
              Save Policy
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
