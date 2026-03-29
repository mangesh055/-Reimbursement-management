import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { signup as signupAPI } from '../../api/auth'
import useAuthStore from '../../store/authStore'
import { UserPlus } from 'lucide-react'
import api from '../../api/axios'

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 characters'),
  company_name: z.string().min(2, 'Company name required'),
  country: z.string().min(1, 'Select a country'),
})

export default function SignupPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [countries, setCountries] = useState([])
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  useEffect(() => {
    // Fetch country list
    fetch('https://restcountries.com/v3.1/all?fields=name,flag')
      .then(r => r.json())
      .then(data => {
        const list = data.map(c => ({ name: c.name.common, flag: c.flag }))
          .sort((a, b) => a.name.localeCompare(b.name))
        setCountries(list)
      }).catch(() => setCountries([
        { name: 'India', flag: '🇮🇳' }, { name: 'United States', flag: '🇺🇸' },
        { name: 'United Kingdom', flag: '🇬🇧' }, { name: 'Germany', flag: '🇩🇪' }
      ]))
  }, [])

  const onSubmit = async (data) => {
    try {
      const r = await signupAPI(data)
      setAuth(r.data.access_token, r.data.user, r.data.company)
      toast.success('Account created! Welcome to ReimburseAI 🎉')
      navigate('/dashboard')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Signup failed')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 70% 30%, rgba(139,92,246,0.12) 0%, transparent 60%), var(--bg-primary)',
      padding: 20
    }}>
      <div style={{ width: 480, maxWidth: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>💸</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }} className="gradient-text">Create Company Account</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0', fontSize: 13 }}>You'll be the admin. Add employees after setup.</p>
        </div>

        <div className="glass-card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 13, fontWeight: 500 }}>Your Name</label>
                <input {...register('name')} className="form-input" placeholder="John Doe" />
                {errors.name && <span style={{ color: '#ef4444', fontSize: 11, display: 'block', marginTop: 3 }}>{errors.name.message}</span>}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 13, fontWeight: 500 }}>Company Name</label>
                <input {...register('company_name')} className="form-input" placeholder="Acme Corp" />
                {errors.company_name && <span style={{ color: '#ef4444', fontSize: 11, display: 'block', marginTop: 3 }}>{errors.company_name.message}</span>}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontSize: 13, fontWeight: 500 }}>Email</label>
              <input {...register('email')} className="form-input" placeholder="you@company.com" type="email" />
              {errors.email && <span style={{ color: '#ef4444', fontSize: 11, display: 'block', marginTop: 3 }}>{errors.email.message}</span>}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontSize: 13, fontWeight: 500 }}>Password</label>
              <input {...register('password')} className="form-input" placeholder="••••••••" type="password" />
              {errors.password && <span style={{ color: '#ef4444', fontSize: 11, display: 'block', marginTop: 3 }}>{errors.password.message}</span>}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontSize: 13, fontWeight: 500 }}>Country</label>
              <select {...register('country')} className="form-input" defaultValue="">
                <option value="" disabled>Select country (auto-detects currency)</option>
                {countries.map(c => (
                  <option key={c.name} value={c.name}>{c.flag} {c.name}</option>
                ))}
              </select>
              {errors.country && <span style={{ color: '#ef4444', fontSize: 11, display: 'block', marginTop: 3 }}>{errors.country.message}</span>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: 6, justifyContent: 'center', padding: '13px 20px' }}>
              <UserPlus size={16} />
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#818cf8', fontWeight: 500 }}>Sign in →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
