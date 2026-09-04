import { useContext } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
export default function RoleRoute({ roles }) { const { user } = useContext(AuthContext); return user && roles.includes(user.role) ? <Outlet /> : <Navigate to="/" replace /> }
