import { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import Dashboard from './Dashboard'
import AdminDashboard from './AdminDashboard'
import StartupDashboard from './StartupDashboard'
import InnovationManagerDashboard from './InnovationManagerDashboard'

export default function RoleBasedDashboard() {
  const { user } = useContext(AuthContext)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const role = (user.role || '').toLowerCase().trim()

  if (role === 'administrator' || role === 'admin') {
    return <AdminDashboard />
  }

  if (role === 'startup_founder' || role === 'founder' || role === 'startup') {
    return <StartupDashboard />
  }

  if (role === 'innovation_manager' || role === 'manager' || role === 'innovation') {
    return <InnovationManagerDashboard />
  }

  // Default: Researcher
  return <Dashboard />
}