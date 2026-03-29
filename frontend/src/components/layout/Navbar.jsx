import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import useUIStore from '../../store/uiStore'
import api from '../../api/axios'

export default function Navbar({ title }) {
  const { user, logout } = useAuthStore()
  const { toggleSidebar } = useUIStore()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)

  useEffect(() => {
    api.get('/notifications').then(r => setNotifications(r.data)).catch(() => {})
  }, [])

  const unread = notifications.filter(n => !n.is_read).length

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const markAllRead = () => {
    api.put('/notifications/read-all').then(() => {
      setNotifications(n => n.map(x => ({ ...x, is_read: true })))
      setShowNotifs(false)
    })
  }

  return (
    <header style={{
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 24px', height: 60,
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={toggleSidebar} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}>
          <Menu size={20} />
        </button>
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#e8e8f0' }}>{title}</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', position: 'relative', padding: 4 }}
          >
            <Bell size={20} />
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                background: '#ef4444', borderRadius: '50%', width: 16, height: 16,
                fontSize: 10, fontWeight: 700, color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>{unread > 9 ? '9+' : unread}</span>
            )}
          </button>
          {showNotifs && (
            <div style={{
              position: 'absolute', right: 0, top: 36,
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 12, width: 320, maxHeight: 400, overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)', zIndex: 100
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications</span>
                {unread > 0 && <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12 }}>Mark all read</button>}
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>No notifications</div>
              ) : notifications.slice(0, 10).map(n => (
                <div key={n.id} style={{
                  padding: '12px 16px',
                  background: n.is_read ? 'transparent' : 'rgba(99,102,241,0.08)',
                  borderBottom: '1px solid rgba(42,42,90,0.4)',
                  cursor: n.expense_id ? 'pointer' : 'default'
                }} onClick={() => n.expense_id && navigate(`/expenses/${n.expense_id}`)}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e8f0' }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{n.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
