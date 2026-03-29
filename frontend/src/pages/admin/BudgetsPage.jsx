import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getBudgets, createBudget, deleteBudget } from '../../api/budgets'
import PageWrapper from '../../components/layout/PageWrapper'
import Modal from '../../components/common/Modal'
import useAuthStore from '../../store/authStore'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const CATS = ['Travel', 'Meals', 'Accommodation', 'Office Supplies', 'Entertainment', 'Training', 'Medical', 'Miscellaneous']
const defaultForm = { department_name: '', category: '', budget_amount: '', period: 'monthly', period_start: '', period_end: '' }

export default function BudgetsPage() {
  const { company } = useAuthStore()
  const sym = company?.currency_symbol || '₹'
  const qc = useQueryClient()
  const { data: budgets } = useQuery({ queryKey: ['budgets-admin'], queryFn: () => getBudgets().then(r => r.data) })
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(defaultForm)

  const handleCreate = async () => {
    try {
      await createBudget({ ...form, category: form.category || null })
      toast.success('Budget created')
      qc.invalidateQueries({ queryKey: ['budgets-admin'] })
      setModal(false)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed')
    }
  }

  const handleDelete = async (id) => {
    await deleteBudget(id)
    qc.invalidateQueries({ queryKey: ['budgets-admin'] })
    toast.success('Budget removed')
  }

  return (
    <PageWrapper title="Budgets">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => { setForm(defaultForm); setModal(true) }} className="btn-primary"><Plus size={15} /> Add Budget</button>
      </div>

      <div className="glass-card">
        <table className="data-table">
          <thead><tr><th>Department</th><th>Category</th><th>Budget</th><th>Period</th><th>Duration</th><th>Actions</th></tr></thead>
          <tbody>
            {(budgets || []).map(b => (
              <tr key={b.id}>
                <td style={{ fontWeight: 500 }}>{b.department_name}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{b.category || 'All'}</td>
                <td style={{ fontWeight: 600 }}>{sym}{Number(b.budget_amount).toLocaleString('en-IN')}</td>
                <td><span style={{ textTransform: 'capitalize', fontSize: 13 }}>{b.period}</span></td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{b.period_start} → {b.period_end}</td>
                <td>
                  <button onClick={() => handleDelete(b.id)} className="btn-danger" style={{ padding: '5px 9px', fontSize: 12 }}><Trash2 size={12} /></button>
                </td>
              </tr>
            ))}
            {(budgets || []).length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>No budgets set up yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add Budget">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={{ fontSize: 13, display: 'block', marginBottom: 5 }}>Department Name *</label><input value={form.department_name} onChange={e => setForm(f => ({...f, department_name: e.target.value}))} className="form-input" placeholder="e.g. Engineering" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={{ fontSize: 13, display: 'block', marginBottom: 5 }}>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="form-input">
                <option value="">All categories</option>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: 13, display: 'block', marginBottom: 5 }}>Period</label>
              <select value={form.period} onChange={e => setForm(f => ({...f, period: e.target.value}))} className="form-input">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div><label style={{ fontSize: 13, display: 'block', marginBottom: 5 }}>Budget Amount ({sym}) *</label><input type="number" value={form.budget_amount} onChange={e => setForm(f => ({...f, budget_amount: e.target.value}))} className="form-input" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={{ fontSize: 13, display: 'block', marginBottom: 5 }}>Start Date</label><input type="date" value={form.period_start} onChange={e => setForm(f => ({...f, period_start: e.target.value}))} className="form-input" /></div>
            <div><label style={{ fontSize: 13, display: 'block', marginBottom: 5 }}>End Date</label><input type="date" value={form.period_end} onChange={e => setForm(f => ({...f, period_end: e.target.value}))} className="form-input" /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleCreate} className="btn-primary">Create Budget</button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  )
}
