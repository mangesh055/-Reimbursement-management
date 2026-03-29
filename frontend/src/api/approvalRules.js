import api from './axios'

export const getApprovalRules = () => api.get('/approval-rules')
export const createApprovalRule = (data) => api.post('/approval-rules', data)
export const updateApprovalRule = (id, data) => api.put(`/approval-rules/${id}`, data)
export const deleteApprovalRule = (id) => api.delete(`/approval-rules/${id}`)
