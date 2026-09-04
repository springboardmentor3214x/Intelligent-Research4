import { useContext } from 'react'
import { AuthContext } from '../context/auth-context'

export default function Dashboard() {
  const { user } = useContext(AuthContext)
  return <section className="dashboard"><p className="eyebrow">YOUR INTELLIGENCE HUB</p><h1>Welcome, {user?.name}</h1><p className="dashboard-lead">Your account is secure and ready for your research and innovation work.</p><div className="profile-grid"><article><span>Email</span><strong>{user?.email}</strong></article><article><span>Account role</span><strong>{user?.role?.replaceAll('_', ' ')}</strong></article><article><span>Organization</span><strong>{user?.organization || 'Not provided'}</strong></article><article><span>Research domain</span><strong>{user?.research_domain || 'Not provided'}</strong></article></div></section>
}
