import React from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import AIChatWidget from '../common/AIChatWidget'

export default function PageWrapper({ title, children }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Navbar title={title} />
        <main style={{ flex: 1, overflow: 'auto', padding: 24, background: 'var(--bg-primary)' }}>
          <div className="fade-in">{children}</div>
        </main>
      </div>
      <AIChatWidget />
    </div>
  )
}
