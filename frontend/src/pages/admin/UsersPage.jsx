import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getUsers, createUser, updateUser, deleteUser } from '../../api/users'
import PageWrapper from '../../components/layout/PageWrapper'
import Modal from '../../components/common/Modal'
import Badge from '../../components/common/Badge'
import { Plus, Trash2, Edit } from 'lucide-react'
import toast from 'react-hot-toast'

export default function UsersPage() {
  const qc = useQueryClient()
  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => getUsers().then(r => r.data) })
  const [modal, setModal] = useState(null) // { mode: 'create'|'edit', user? }
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee', manager_id: '' })

  const managers = (users || []).filter(u => u.role === 'manager' || u.role === 'admin')

  const handleSave = async () => {
    try {
      if (modal.mode === 'create') {
        await createUser({ ...form, manager_id: form.manager_id || undefined })
        toast.success('User created')
      } else {
        await updateUser(modal.user.id, { role: form.role, manager_id: form.manager_id || undefined })
        toast.success('User updated')
      }
      qc.invalidateQueries({ queryKey: ['users'] })
      setModal(null)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this user?')) return
    await deleteUser(id)
    qc.invalidateQueries({ queryKey: ['users'] })
    toast.success('User deactivated')
  }

  const openCreate = () => { setForm({ name: '', email: '', password: '', role: 'employee', manager_id: '' }); setModal({ mode: 'create' }) }
  const openEdit = (u) => { setForm({ role: u.role, manager_id: u.manager_id || '' }); setModal({ mode: 'edit', user: u }) }

  return (
    <PageWrapper title="User Management">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Add User</button>
      </div>

      <div className="glass-card">
        {isLoading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div> : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Manager</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {(users || []).map(u => {
                const mgr = (users || []).find(m => m.id === u.manager_id)
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>{u.name?.[0]?.toUpperCase()}</div>
                        {u.name}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{u.email}</td>
                    <td><span style={{ textTransform: 'capitalize', fontSize: 13, fontWeight: 500 }}>{u.role}</span></td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{mgr?.name || '—'}</td>
                    <td><Badge status={u.is_active ? 'approved' : 'cancelled'} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(u)} className="btn-secondary" style={{ padding: '5px 9px', fontSize: 12 }}><Edit size={12} /></button>
                        {u.is_active && <button onClick={() => handleDelete(u.id)} className="btn-danger" style={{ padding: '5px 9px', fontSize: 12 }}><Trash2 size={12} /></button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Add User' : 'Edit User'}>
        {modal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {modal.mode === 'create' && (
              <>
                <div><label style={{ display: 'block', marginBottom: 5, fontSize: 13 }}>Name</label><input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="form-input" placeholder="Full name" /></div>
                <div><label style={{ display: 'block', marginBottom: 5, fontSize: 13 }}>Email</label><input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="form-input" type="email" /></div>
                <div><label style={{ display: 'block', marginBottom: 5, fontSize: 13 }}>Password</label><input value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} className="form-input" type="password" /></div>
              </>
            )}
            <div><label style={{ display: 'block', marginBottom: 5, fontSize: 13 }}>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} className="form-input">
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {form.role === 'employee' && (
              <div><label style={{ display: 'block', marginBottom: 5, fontSize: 13 }}>Manager</label>
                <select value={form.manager_id} onChange={e => setForm(f => ({...f, manager_id: e.target.value}))} className="form-input">
                  <option value="">No manager</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary">Save</button>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  )
}
