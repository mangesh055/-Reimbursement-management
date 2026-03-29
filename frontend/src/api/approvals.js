import api from './axios'

export const getPendingApprovals = () => api.get('/approvals/pending')
export const actionApproval = (expenseId, data) => api.post(`/approvals/${expenseId}/action`, data)
export const getAIAssist = (expenseId) => api.get(`/approvals/assist/${expenseId}`)
