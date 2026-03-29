import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot } from 'lucide-react'
import { chatWithAI } from '../../api/ai'
import useAuthStore from '../../store/authStore'

const SUGGESTED = [
  "How much did I spend this month?",
  "What's my top spending category?",
  "Show my pending approvals",
  "Any flagged expenses this week?",
]

export default function AIChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const { user } = useAuthStore()
  const bottomRef = useRef()

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'bot', text: `Hi ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm ReimburseBot. Ask me anything about your expenses!` }])
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setLoading(true)
    try {
      const r = await chatWithAI(msg)
      setMessages(prev => [...prev, { role: 'bot', text: r.data.response }])
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I couldn't connect to the AI. Please try again." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 500,
          width: 54, height: 54, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none', cursor: 'pointer', color: 'white',
          boxShadow: '0 8px 30px rgba(99,102,241,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s', transform: open ? 'scale(0.9)' : 'scale(1)'
        }}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fade-in" style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 499,
          width: 360, height: 500,
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 16, display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={16} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>ReimburseBot</div>
              <div style={{ fontSize: 11, color: '#4ade80' }}>● Online</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '9px 13px',
                  borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: m.role === 'user' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.07)',
                  fontSize: 13, lineHeight: 1.5, color: '#e8e8f0',
                  border: m.role === 'bot' ? '1px solid var(--border-color)' : 'none'
                }}>{m.text}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: `pulse 1s ${i*0.2}s infinite` }} />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Thinking...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div style={{ padding: '0 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                  color: '#818cf8', borderRadius: 8, padding: '5px 10px',
                  fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                }}>{s}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '8px 12px 12px', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask about your expenses..."
              className="form-input"
              style={{ flex: 1, padding: '9px 12px', fontSize: 13 }}
            />
            <button onClick={() => send()} disabled={!input.trim() || loading} className="btn-primary" style={{ padding: '9px 12px' }}>
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
