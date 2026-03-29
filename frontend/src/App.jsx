import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'

import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import NewExpensePage from './pages/expenses/NewExpensePage'
import MyExpensesPage from './pages/expenses/MyExpensesPage'
import ExpenseDetailPage from './pages/expenses/ExpenseDetailPage'
import ApprovalsPage from './pages/approvals/ApprovalsPage'
import AnalyticsPage from './pages/analytics/AnalyticsPage'
import UsersPage from './pages/admin/UsersPage'
import ApprovalRulesPage from './pages/admin/ApprovalRulesPage'
import BudgetsPage from './pages/admin/BudgetsPage'
import AuditLogPage from './pages/admin/AuditLogPage'
import SettingsPage from './pages/admin/SettingsPage'

const RequireAuth = ({ children, roles }) => {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  const { token } = useAuthStore()
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/signup" element={token ? <Navigate to="/dashboard" /> : <SignupPage />} />

        <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />

        {/* Expenses */}
        <Route path="/expenses" element={<RequireAuth><MyExpensesPage /></RequireAuth>} />
        <Route path="/expenses/new" element={<RequireAuth roles={['employee']}><NewExpensePage /></RequireAuth>} />
        <Route path="/expenses/:id" element={<RequireAuth><ExpenseDetailPage /></RequireAuth>} />

        {/* Approvals */}
        <Route path="/approvals" element={<RequireAuth roles={['manager', 'admin']}><ApprovalsPage /></RequireAuth>} />

        {/* Analytics */}
        <Route path="/analytics" element={<RequireAuth roles={['manager', 'admin']}><AnalyticsPage /></RequireAuth>} />

        {/* Admin */}
        <Route path="/users" element={<RequireAuth roles={['admin']}><UsersPage /></RequireAuth>} />
        <Route path="/approval-rules" element={<RequireAuth roles={['admin']}><ApprovalRulesPage /></RequireAuth>} />
        <Route path="/budgets" element={<RequireAuth roles={['admin']}><BudgetsPage /></RequireAuth>} />
        <Route path="/audit-logs" element={<RequireAuth roles={['admin']}><AuditLogPage /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth roles={['admin']}><SettingsPage /></RequireAuth>} />

        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  )
}
