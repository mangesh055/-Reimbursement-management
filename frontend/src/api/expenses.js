import api from './axios'

export const getExpenses = (params) => api.get('/expenses', { params })
export const createExpense = (formData) => api.post('/expenses', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
export const getExpense = (id) => api.get(`/expenses/${id}`)
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data)
export const deleteExpense = (id) => api.delete(`/expenses/${id}`)
export const submitExpense = (id) => api.post(`/expenses/${id}/submit`)
export const cancelExpense = (id) => api.post(`/expenses/${id}/cancel`)
export const exportExpenses = (params) => api.get('/expenses/export', {
  params, responseType: 'blob'
})
