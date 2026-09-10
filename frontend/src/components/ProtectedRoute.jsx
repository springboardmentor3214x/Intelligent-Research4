import { useContext } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import Loading from './Loading'
export default function ProtectedRoute() { const { token, loading } = useContext(AuthContext); const location = useLocation(); if (loading) return <Loading />; return token ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} /> }
