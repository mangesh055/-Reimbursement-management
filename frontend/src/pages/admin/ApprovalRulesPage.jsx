import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getApprovalRules, createApprovalRule, updateApprovalRule, deleteApprovalRule } from '../../api/approvalRules'
import { getUsers } from '../../api/users'
import PageWrapper from '../../components/layout/PageWrapper'
import Modal from '../../components/common/Modal'
import { Plus, Trash2, Edit, GripVertical } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = ['Travel', 'Meals', 'Accommodation', 'Office Supplies', 'Entertainment', 'Training', 'Medical', 'Miscellaneous']

const defaultForm = () => ({
  name: '', description: '', category: '', min_amount: '', max_amount: '',
  is_manager_approver: true, approval_mode: 'sequential',
  minimum_approval_percentage: '', specific_approver_id: '',
  approvers: []
})

export default function ApprovalRulesPage() {
  const qc = useQueryClient()
  const { data: rules, isLoading } = useQuery({ queryKey: ['rules'], queryFn: () => getApprovalRules().then(r => r.data) })
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => getUsers().then(r => r.data) })
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(defaultForm())

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        min_amount: form.min_amount || null, max_amount: form.max_amount || null,
        minimum_approval_percentage: form.minimum_approval_percentage || null,
        specific_approver_id: form.specific_approver_id || null,
        category: form.category || null,
        approvers: form.approvers.map((a, i) => ({ user_id: parseInt(a.user_id), sequence_order: i + 1, is_required: true }))
      }
      if (modal.mode === 'create') await createApprovalRule(payload)
      else await updateApprovalRule(modal.rule.id, payload)
      toast.success(modal.mode === 'create' ? 'Rule created' : 'Rule updated')
      qc.invalidateQueries({ queryKey: ['rules'] })
      setModal(null)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save rule')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this rule?')) return
    await deleteApprovalRule(id)
    qc.invalidateQueries({ queryKey: ['rules'] })
    toast.success('Rule deactivated')
  }

  const addApprover = () => setForm(f => ({ ...f, approvers: [...f.approvers, { user_id: '' }] }))
  const removeApprover = (i) => setForm(f => ({ ...f, approvers: f.approvers.filter((_, idx) => idx !== i) }))
  const setApprover = (i, val) => setForm(f => ({ ...f, approvers: f.approvers.map((a, idx) => idx === i ? { user_id: val } : a) }))

  const openCreate = () => { setForm(defaultForm()); setModal({ mode: 'create' }) }
  const openEdit = (r) => {
    setForm({
      name: r.name, description: r.description || '', category: r.category || '',
      min_amount: r.min_amount || '', max_amount: r.max_amount || '',
      is_manager_approver: r.is_manager_approver, approval_mode: r.approval_mode,
      minimum_approval_percentage: r.minimum_approval_percentage || '',
      specific_approver_id: r.specific_approver_id || '',
      approvers: (r.approvers || []).map(a => ({ user_id: String(a.user_id) }))
    })
    setModal({ mode: 'edit', rule: r })
  }

  return (
    <PageWrapper title="Approval Rules">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Create Rule</button>
      </div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(rules || []).length === 0 && <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>No rules yet. Create one to enable approval workflows.</div>}
          {(rules || []).map(r => (
            <div key={r.id} className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600 }}>{r.name}</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span>Mode: <strong style={{ color: '#818cf8' }}>{r.approval_mode}</strong></span>
                    {r.category && <span>Category: {r.category}</span>}
                    {r.min_amount && <span>Min: ₹{r.min_amount}</span>}
                    {r.max_amount && <span>Max: ₹{r.max_amount}</span>}
                    {r.is_manager_approver && <span>✓ Manager first</span>}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(r.approvers || []).map((a, i) => (
                      <span key={a.id} style={{ fontSize: 11, background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)' }}>
                        {i + 1}. {a.approver_name}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(r)} className="btn-secondary" style={{ padding: '7px 11px' }}><Edit size={14} /></button>
                  <button onClick={() => handleDelete(r.id)} className="btn-danger" style={{ padding: '7px 11px' }}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Create Approval Rule' : 'Edit Rule'} width={600}>
        {modal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Rule Name *</label><input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="form-input" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="form-input">
                  <option value="">All categories</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Approval Mode</label>
                <select value={form.approval_mode} onChange={e => setForm(f => ({...f, approval_mode: e.target.value}))} className="form-input">
                  <option value="sequential">Sequential</option>
                  <option value="conditional">Conditional</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={{ fontSize: 13, display: 'block', marginBottom: 5 }}>Min Amount</label><input type="number" value={form.min_amount} onChange={e => setForm(f => ({...f, min_amount: e.target.value}))} className="form-input" placeholder="No minimum" /></div>
              <div><label style={{ fontSize: 13, display: 'block', marginBottom: 5 }}>Max Amount</label><input type="number" value={form.max_amount} onChange={e => setForm(f => ({...f, max_amount: e.target.value}))} className="form-input" placeholder="No maximum" /></div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_manager_approver} onChange={e => setForm(f => ({...f, is_manager_approver: e.target.checked}))} />
              Manager must approve first
            </label>
            {(form.approval_mode === 'conditional' || form.approval_mode === 'hybrid') && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: 13, display: 'block', marginBottom: 5 }}>Min Approval %</label><input type="number" value={form.minimum_approval_percentage} onChange={e => setForm(f => ({...f, minimum_approval_percentage: e.target.value}))} className="form-input" placeholder="e.g. 60" min="1" max="100" /></div>
                <div><label style={{ fontSize: 13, display: 'block', marginBottom: 5 }}>Auto-approve if this person approves</label>
                  <select value={form.specific_approver_id} onChange={e => setForm(f => ({...f, specific_approver_id: e.target.value}))} className="form-input">
                    <option value="">None</option>
                    {(users || []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
            )}
            {/* Approvers list */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Approvers (in order)</label>
              {form.approvers.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <GripVertical size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 20 }}>{i + 1}.</span>
                  <select value={a.user_id} onChange={e => setApprover(i, e.target.value)} className="form-input" style={{ flex: 1 }}>
                    <option value="">Select approver</option>
                    {(users || []).map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                  <button onClick={() => removeApprover(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>✕</button>
                </div>
              ))}
              <button onClick={addApprover} className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px', marginTop: 4 }}><Plus size={12} /> Add Approver</button>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary">Save Rule</button>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  )
}
