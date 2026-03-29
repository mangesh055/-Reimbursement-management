import React from 'react'

export default function RiskScoreBadge({ score }) {
  if (score == null) return null
  const isLow = score <= 30
  const isMed = score <= 60
  const { color, bg, label } = isLow
    ? { color: '#4ade80', bg: '#052e16', label: 'Low' }
    : isMed
    ? { color: '#fbbf24', bg: '#1c1a08', label: 'Medium' }
    : { color: '#f87171', bg: '#2d0a0a', label: 'High' }

  return (
    <span style={{
      background: bg, color, border: `1px solid ${color}33`,
      borderRadius: 8, padding: '3px 10px',
      fontSize: 12, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', gap: 5
    }}>
      🛡️ {score}/100 · {label}
    </span>
  )
}
