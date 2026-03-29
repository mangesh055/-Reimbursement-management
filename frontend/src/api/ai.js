import api from './axios'

export const ocrReceipt = (formData) => api.post('/ai/ocr', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
export const categorizeExpense = (data) => api.post('/ai/categorize', data)
export const getAIAssist = (expenseId) => api.get(`/approvals/assist/${expenseId}`)
export const chatWithAI = (message) => api.post('/ai/chat', { message })
