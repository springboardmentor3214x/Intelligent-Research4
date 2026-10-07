import { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import Dashboard from './Dashboard'
import AdminDashboard from './AdminDashboard'

export default function RoleBasedDashboard() {
  const { user } = useContext(AuthContext)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role === 'administrator' || user.role === 'admin') {
    return <AdminDashboard />
  }

  return <Dashboard />
}