import api from './axios'

export const getDashboard = () => api.get('/analytics/dashboard')
export const getSpendByCategory = (params) => api.get('/analytics/spend-by-category', { params })
export const getSpendTrend = (months = 6) => api.get('/analytics/spend-trend', { params: { months } })
export const getBudgetUtilization = () => api.get('/analytics/budget-utilization')
export const getTopSpenders = (limit = 10) => api.get('/analytics/top-spenders', { params: { limit } })
