import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ClaimPage } from './auth/ClaimPage'
import { LoginPage } from './auth/LoginPage'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { CreateDish } from './dishes/CreateDish'
import { EditDish } from './dishes/EditDish'
import { SignupPage } from './dishes/SignupPage'
import { CookSummary } from './screens/CookSummary'
import { ThisWeek } from './screens/ThisWeek'

// Route tree (router-agnostic so tests can mount it in a MemoryRouter). Public:
// /login and /claim/:token. Everything else sits behind ProtectedRoute, which
// redirects to /login without a session.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/claim/:token" element={<ClaimPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<ThisWeek />} />
        <Route path="/cook-summary" element={<CookSummary />} />
        <Route path="/dishes/new" element={<CreateDish />} />
        <Route path="/dishes/:dishId/edit" element={<EditDish />} />
        <Route path="/dishes/:dishId/signup" element={<SignupPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
