import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSpendByCategory, getSpendTrend, getBudgetUtilization, getTopSpenders } from '../../api/analytics'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import PageWrapper from '../../components/layout/PageWrapper'
import useAuthStore from '../../store/authStore'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#14b8a6']

export default function AnalyticsPage() {
  const { company } = useAuthStore()
  const sym = company?.currency_symbol || '₹'
  const fmt = v => `${sym}${Number(v || 0).toLocaleString('en-IN')}`

  const { data: categories } = useQuery({ queryKey: ['spend-cat'], queryFn: () => getSpendByCategory({}).then(r => r.data) })
  const { data: trend } = useQuery({ queryKey: ['trend-12'], queryFn: () => getSpendTrend(12).then(r => r.data) })
  const { data: budgets } = useQuery({ queryKey: ['budget-util-full'], queryFn: () => getBudgetUtilization().then(r => r.data) })
  const { data: topSpenders } = useQuery({ queryKey: ['top-10'], queryFn: () => getTopSpenders(10).then(r => r.data) })

  return (
    <PageWrapper title="Analytics">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
        {/* Monthly Trend */}
        <div className="glass-card" style={{ padding: 20, gridColumn: 'span 2' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>📈 Monthly Spend Trend (12 months)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d5e" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9090b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9090b8' }} tickFormatter={v => `${sym}${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#1a1a35', border: '1px solid #2d2d5e', borderRadius: 8 }} formatter={v => [fmt(v), 'Total']} />
              <Line type="monotone" dataKey="total" stroke="url(#gradient)" strokeWidth={3} dot={{ fill: '#6366f1', r: 5 }} activeDot={{ r: 7 }} />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Spend by Category */}
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>🥧 Spend by Category</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={categories || []} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={3}>
                {(categories || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1a35', border: '1px solid #2d2d5e', borderRadius: 8 }} formatter={v => [fmt(v), 'Spent']} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {(categories || []).map((c, i) => (
              <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                {c.category}
              </div>
            ))}
          </div>
        </div>

        {/* Budget Utilization */}
        {budgets && budgets.length > 0 && (
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>💰 Budget Utilization</h3>
            {budgets.map(b => (
              <div key={b.id} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                  <span style={{ fontWeight: 500 }}>{b.department} {b.category ? `· ${b.category}` : ''}</span>
                  <span style={{ color: b.pct_used > 90 ? '#f87171' : b.pct_used > 70 ? '#fbbf24' : '#4ade80', fontWeight: 600 }}>{b.pct_used}%</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    background: b.pct_used > 90 ? '#ef4444' : b.pct_used > 70 ? '#f59e0b' : '#6366f1',
                    width: `${Math.min(b.pct_used, 100)}%`,
                    transition: 'width 0.5s ease'
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
                  {fmt(b.spent)} of {fmt(b.budget)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top Spenders */}
        {topSpenders && topSpenders.length > 0 && (
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>🏆 Top Spenders</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topSpenders} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d5e" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9090b8' }} tickFormatter={v => `${sym}${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#9090b8' }} width={90} />
                <Tooltip contentStyle={{ background: '#1a1a35', border: '1px solid #2d2d5e', borderRadius: 8 }} formatter={v => [fmt(v), 'Spent']} />
                <Bar dataKey="total" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
