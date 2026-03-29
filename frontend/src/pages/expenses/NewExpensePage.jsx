import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { createExpense, submitExpense } from '../../api/expenses'
import { ocrReceipt } from '../../api/ai'
import PageWrapper from '../../components/layout/PageWrapper'
import FileUpload from '../../components/common/FileUpload'
import RiskScoreBadge from '../../components/common/RiskScoreBadge'
import useAuthStore from '../../store/authStore'
import { Save, Send, Sparkles } from 'lucide-react'

const CATEGORIES = ['Travel', 'Meals', 'Accommodation', 'Office Supplies', 'Entertainment', 'Training', 'Medical', 'Miscellaneous']
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'JPY', 'AUD', 'CAD']

export default function NewExpensePage() {
  const navigate = useNavigate()
  const { company } = useAuthStore()
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrResult, setOcrResult] = useState(null)
  const [aiResult, setAiResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [receiptFile, setReceiptFile] = useState(null)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      category: 'Miscellaneous',
      currency: company?.currency_code || 'INR',
      expense_date: new Date().toISOString().split('T')[0],
    }
  })

  const handleReceiptFile = async (file) => {
    setReceiptFile(file)
    if (!file) return
    setOcrLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await ocrReceipt(fd)
      const data = r.data
      setOcrResult(data)
      // Auto-fill form
      if (data.vendor_name) setValue('vendor_name', data.vendor_name)
      if (data.total_amount) setValue('amount', data.total_amount)
      if (data.currency_code) setValue('currency', data.currency_code)
      if (data.date) setValue('expense_date', data.date)
      if (data.description) setValue('description', data.description)
      toast.success(`OCR confidence: ${data.ocr_confidence}% ✓`)
    } catch {
      toast.error('OCR failed, fill manually')
    } finally {
      setOcrLoading(false)
    }
  }

  const onSubmit = async (data, saveAsDraft = false) => {
    setSubmitting(true)
    try {
      const fd = new FormData()
      Object.entries(data).forEach(([k, v]) => { if (v != null && v !== '') fd.append(k, v) })
      if (receiptFile) fd.append('receipt', receiptFile)
      const r = await createExpense(fd)
      const expense = r.data
      setAiResult({ policy_flags: expense.policy_flags, risk_score: expense.risk_score, risk_reason: expense.risk_reason, ai_suggested_category: expense.ai_suggested_category })

      if (!saveAsDraft) {
        await submitExpense(expense.id)
        toast.success('Expense submitted for approval! 🎉')
      } else {
        toast.success('Saved as draft')
      }
      navigate('/expenses')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save expense')
    } finally {
      setSubmitting(false)
    }
  }

  const category = watch('category')

  return (
    <PageWrapper title="New Expense">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <form onSubmit={handleSubmit((d) => onSubmit(d, false))}>
          {/* OCR Zone */}
          <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Sparkles size={18} style={{ color: '#818cf8' }} />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>AI Receipt Scanner</h3>
              <span style={{ fontSize: 11, background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>Powered by Gemini</span>
            </div>
            <FileUpload onFileSelect={handleReceiptFile} loading={ocrLoading} label="Upload receipt for auto-fill" />
            {ocrResult && (
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 11, background: '#052e16', color: '#4ade80', padding: '3px 10px', borderRadius: 6, border: '1px solid #166534' }}>
                  ✓ OCR Confidence: {ocrResult.ocr_confidence}%
                </span>
                {ocrResult.vendor_name && <span style={{ fontSize: 11, background: '#1a1a35', color: '#818cf8', padding: '3px 10px', borderRadius: 6 }}>🏪 {ocrResult.vendor_name}</span>}
              </div>
            )}
          </div>

          {/* AI flags */}
          {aiResult?.policy_flags?.length > 0 && (
            <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {aiResult.policy_flags.map((f, i) => (
                <div key={i} style={{ padding: '6px 12px', background: '#1c1a08', border: '1px solid #92400e', borderRadius: 8, fontSize: 12, color: '#fbbf24' }}>⚠ {f}</div>
              ))}
              {aiResult.risk_score != null && <RiskScoreBadge score={aiResult.risk_score} />}
            </div>
          )}

          {/* Form */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 600 }}>Expense Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Title *</label>
                <input {...register('title', { required: 'Title required' })} className="form-input" placeholder="e.g. Team lunch at Haldirams" />
                {errors.title && <span style={{ color: '#ef4444', fontSize: 12 }}>{errors.title.message}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Amount *</label>
                  <input {...register('amount', { required: 'Amount required', min: 0.01 })} type="number" step="0.01" className="form-input" placeholder="0.00" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Currency</label>
                  <select {...register('currency')} className="form-input">
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Category</label>
                  <select {...register('category')} className="form-input">
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>
                        {aiResult?.ai_suggested_category === c ? `✨ ${c} (AI)` : c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Date *</label>
                  <input {...register('expense_date', { required: 'Date required' })} type="date" className="form-input" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Vendor Name</label>
                <input {...register('vendor_name')} className="form-input" placeholder="Vendor or merchant name" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Description</label>
                <textarea {...register('description')} className="form-input" rows={3} placeholder="What was this expense for?" style={{ resize: 'vertical' }} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
            <button type="button" disabled={submitting} className="btn-secondary" onClick={handleSubmit((d) => onSubmit(d, true))}>
              <Save size={15} />
              Save as Draft
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              <Send size={15} />
              {submitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </PageWrapper>
  )
}
