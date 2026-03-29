import React from 'react'
import clsx from 'clsx'

const statusConfig = {
  draft:     { label: 'Draft',     bg: '#1e1b3a', color: '#818cf8', border: '#3730a3' },
  pending:   { label: 'Pending',   bg: '#1c1a08', color: '#fbbf24', border: '#92400e' },
  approved:  { label: 'Approved',  bg: '#052e16', color: '#4ade80', border: '#166534' },
  rejected:  { label: 'Rejected',  bg: '#2d0a0a', color: '#f87171', border: '#7f1d1d' },
  cancelled: { label: 'Cancelled', bg: '#111111', color: '#6b7280', border: '#374151' },
  skipped:   { label: 'Skipped',   bg: '#111111', color: '#6b7280', border: '#374151' },
}

export default function Badge({ status, size = 'sm' }) {
  const cfg = statusConfig[status?.toLowerCase()] || statusConfig.draft
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      borderRadius: 8, padding: size === 'sm' ? '3px 10px' : '5px 14px',
      fontSize: size === 'sm' ? 12 : 13, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', gap: 5
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
      {cfg.label}
    </span>
  )
}
