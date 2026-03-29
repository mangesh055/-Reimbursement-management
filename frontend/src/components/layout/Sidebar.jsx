import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Receipt, CheckCircle, BarChart3,
  Users, Shield, Wallet, FileText, Settings, ChevronLeft
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import useUIStore from '../../store/uiStore'
import clsx from 'clsx'

const NavItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      clsx('flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 text-white border border-indigo-500/40 shadow-lg shadow-indigo-500/10'
          : 'text-slate-400 hover:text-white hover:bg-white/5')
    }
  >
    <Icon size={18} />
    {label}
  </NavLink>
)

export default function Sidebar() {
  const { user, company } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const role = user?.role

  if (!sidebarOpen) return (
    <div style={{ width: 0, minWidth: 0 }} />
  )

  return (
    <aside style={{
      width: 250, minWidth: 250,
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border-color)',
      padding: '20px 12px',
      display: 'flex', flexDirection: 'column', gap: 4,
      height: '100vh', position: 'sticky', top: 0,
      overflowY: 'auto', zIndex: 10
    }}>
      {/* Logo */}
      <div style={{ padding: '12px 8px 20px', borderBottom: '1px solid var(--border-color)', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18
          }}>💸</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#e8e8f0' }}>ReimburseAI</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{company?.name || 'Company'}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />

        {/* Employee */}
        {role === 'employee' && (
          <>
            <NavItem to="/expenses" icon={Receipt} label="My Expenses" />
            <NavItem to="/expenses/new" icon={Receipt} label="New Expense" />
          </>
        )}

        {/* Manager */}
        {(role === 'manager' || role === 'admin') && (
          <>
            <NavItem to="/approvals" icon={CheckCircle} label="Approvals" />
            <NavItem to="/expenses" icon={Receipt} label="Expenses" />
          </>
        )}

        {/* Admin only */}
        {role === 'admin' && (
          <>
            <NavItem to="/analytics" icon={BarChart3} label="Analytics" />
            <NavItem to="/users" icon={Users} label="Users" />
            <NavItem to="/approval-rules" icon={Shield} label="Approval Rules" />
            <NavItem to="/budgets" icon={Wallet} label="Budgets" />
            <NavItem to="/audit-logs" icon={FileText} label="Audit Logs" />
            <NavItem to="/settings" icon={Settings} label="Settings" />
          </>
        )}

        {/* Manager analytics */}
        {role === 'manager' && (
          <NavItem to="/analytics" icon={BarChart3} label="Analytics" />
        )}
      </nav>

      {/* User badge */}
      <div style={{
        padding: '12px', borderRadius: 12,
        background: 'rgba(99,102,241,0.08)',
        border: '1px solid rgba(99,102,241,0.2)',
        marginTop: 8
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 14, color: 'white', flexShrink: 0
          }}>{user?.name?.[0]?.toUpperCase() || '?'}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
