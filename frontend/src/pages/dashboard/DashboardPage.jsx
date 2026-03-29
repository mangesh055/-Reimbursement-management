import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDashboard, getSpendByCategory, getSpendTrend, getBudgetUtilization, getTopSpenders } from '../../api/analytics'
import { getExpenses } from '../../api/expenses'
import { getPendingApprovals } from '../../api/approvals'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/common/Badge'
import RiskScoreBadge from '../../components/common/RiskScoreBadge'
import useAuthStore from '../../store/authStore'
import { Receipt, CheckCircle, Clock, TrendingUp, Users, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#14b8a6']

const StatCard = ({ label, value, icon: Icon, color = '#6366f1', sub }) => (
  <div className="stat-card" style={{ flex: '1 1 180px' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} style={{ color }} />
      </div>
    </div>
    <div style={{ fontSize: 26, fontWeight: 800, color: '#e8e8f0' }}>{value ?? '—'}</div>
    {sub && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>}
  </div>
)

export default function DashboardPage() {
  const { user, company } = useAuthStore()
  const sym = company?.currency_symbol || '₹'

  const { data: dash } = useQuery({ queryKey: ['dashboard'], queryFn: () => getDashboard().then(r => r.data) })
  const { data: expenses } = useQuery({ queryKey: ['expenses-recent'], queryFn: () => getExpenses({ limit: 5 }).then(r => r.data) })
  const { data: categories } = useQuery({ queryKey: ['spend-category'], queryFn: () => getSpendByCategory({}).then(r => r.data) })
  const { data: trend } = useQuery({ queryKey: ['spend-trend'], queryFn: () => getSpendTrend(6).then(r => r.data) })
  const { data: budgets } = useQuery({ queryKey: ['budget-util'], queryFn: () => getBudgetUtilization().then(r => r.data), enabled: user?.role !== 'employee' })
  const { data: pending } = useQuery({ queryKey: ['pending-approvals'], queryFn: () => getPendingApprovals().then(r => r.data), enabled: user?.role !== 'employee' })
  const { data: topSpenders } = useQuery({ queryKey: ['top-spenders'], queryFn: () => getTopSpenders(5).then(r => r.data), enabled: user?.role === 'admin' })

  const fmt = (n) => `${sym}${(n || 0).toLocaleString('en-IN')}`

  return (
    <PageWrapper title={`Welcome back, ${user?.name?.split(' ')[0] || 'there'} 👋`}>
      {/* Stats Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Submitted" value={dash?.total ?? 0} icon={Receipt} color="#6366f1" />
        <StatCard label="Pending" value={dash?.pending ?? 0} icon={Clock} color="#f59e0b" />
        <StatCard label="Approved" value={dash?.approved ?? 0} icon={CheckCircle} color="#22c55e" />
        <StatCard label="Approved YTD" value={fmt(dash?.approved_ytd)} icon={TrendingUp} color="#3b82f6" />
        {user?.role !== 'employee' && (
          <StatCard label="Pending for You" value={dash?.pending_for_me ?? 0} icon={AlertTriangle} color="#ef4444" />
        )}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 28 }}>
        {/* Spend Trend */}
        {trend && (
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Monthly Spend Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d5e" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9090b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9090b8' }} tickFormatter={v => `${sym}${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: '#1a1a35', border: '1px solid #2d2d5e', borderRadius: 8 }} formatter={v => [fmt(v), 'Total']} />
                <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Category Pie */}
        {categories && (
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Spend by Category</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categories} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={75} label={({ category, percent }) => `${category} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a35', border: '1px solid #2d2d5e', borderRadius: 8 }} formatter={v => [fmt(v), 'Spent']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Lower row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Recent Expenses */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Recent Expenses</h3>
            <Link to="/expenses" style={{ fontSize: 12, color: '#818cf8' }}>View all →</Link>
          </div>
          {expenses?.items?.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>No expenses yet</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Title</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {expenses?.items?.slice(0, 5).map(e => (
                  <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/expenses/${e.id}`}>
                    <td style={{ fontSize: 13 }}>{e.title}</td>
                    <td style={{ fontSize: 13, fontWeight: 500 }}>{sym}{Number(e.amount_in_company_currency).toLocaleString('en-IN')}</td>
                    <td><Badge status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pending Approvals for manager/admin */}
        {user?.role !== 'employee' && pending && (
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Pending Approvals</h3>
              <Link to="/approvals" style={{ fontSize: 12, color: '#818cf8' }}>Review all →</Link>
            </div>
            {pending.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>All caught up! ✅</div>
            ) : pending.slice(0, 5).map(e => (
              <Link key={e.id} to="/approvals" style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ padding: '12px 0', borderBottom: '1px solid rgba(42,42,90,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e8f0' }}>{e.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{e.employee_name} · {e.category}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{sym}{Number(e.amount).toLocaleString('en-IN')}</div>
                    <RiskScoreBadge score={e.risk_score} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Top Spenders for admin */}
        {user?.role === 'admin' && topSpenders && topSpenders.length > 0 && (
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Top Spenders</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topSpenders} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d5e" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9090b8' }} tickFormatter={v => `${sym}${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#9090b8' }} width={80} />
                <Tooltip contentStyle={{ background: '#1a1a35', border: '1px solid #2d2d5e', borderRadius: 8 }} formatter={v => [fmt(v), 'Spent']} />
                <Bar dataKey="total" fill="#6366f1" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
