import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { login as loginAPI } from '../../api/auth'
import useAuthStore from '../../store/authStore'
import { Eye, EyeOff, LogIn } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [showPw, setShowPw] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    try {
      const r = await loginAPI(data)
      setAuth(r.data.access_token, r.data.user, r.data.company)
      toast.success(`Welcome back, ${r.data.user.name}!`)
      navigate('/dashboard')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 30% 30%, rgba(99,102,241,0.12) 0%, transparent 60%), var(--bg-primary)',
      padding: 20
    }}>
      <div style={{ width: 420, maxWidth: '100%' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28
          }}>💸</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }} className="gradient-text">ReimburseAI</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0', fontSize: 14 }}>AI-powered expense management</p>
        </div>

        <div className="glass-card" style={{ padding: 32 }}>
          <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 700 }}>Sign In</h2>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Email</label>
              <input {...register('email')} className="form-input" placeholder="you@company.com" type="email" />
              {errors.email && <span style={{ color: '#ef4444', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.email.message}</span>}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input {...register('password')} className="form-input" placeholder="••••••••" type={showPw ? 'text' : 'password'} style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span style={{ color: '#ef4444', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.password.message}</span>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: 8, justifyContent: 'center', padding: '13px 20px' }}>
              <LogIn size={16} />
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: '#818cf8', fontWeight: 500 }}>Create one →</Link>
          </div>

          {/* Demo hint */}
          <div style={{ marginTop: 16, padding: 12, background: 'rgba(99,102,241,0.08)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, marginBottom: 6 }}>🎯 Demo Credentials</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              Admin: admin@odoo.in / admin123<br />
              Manager: ravi@odoo.in / password<br />
              Employee: priya@odoo.in / password
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
