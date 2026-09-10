import { useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'

export default function Dashboard() {
  const { user } = useContext(AuthContext)
  return (
    <section className="dashboard">
      <p className="eyebrow">YOUR INTELLIGENCE HUB</p>
      <h1>Welcome, {user?.name}</h1>
      <p className="dashboard-lead">Your account is secure and ready for your research and innovation work.</p>
      
      <div className="profile-grid">
        <article><span>Email</span><strong>{user?.email}</strong></article>
        <article><span>Account role</span><strong>{user?.role?.replaceAll('_', ' ')}</strong></article>
        <article><span>Organization</span><strong>{user?.organization || 'Not provided'}</strong></article>
        <article><span>Research domain</span><strong>{user?.research_domain || 'Not provided'}</strong></article>
      </div>

      <div style={{ marginTop: '2.5rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.75rem 2rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f766e', background: '#f0fdfa', padding: '0.25rem 0.65rem', borderRadius: '999px', border: '1px solid #ccfbf1', display: 'inline-block', marginBottom: '0.5rem' }}>
            Module 5: Patent Intelligence
          </span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f2942', margin: 0 }}>Patent Landscape &amp; AI Clustering</h2>
          <p style={{ color: '#64748b', fontSize: '0.92rem', margin: '0.35rem 0 0 0' }}>Explore real European Patent Office records, all-MiniLM-L6-v2 embeddings, and KMeans semantic clusters.</p>
        </div>
        <Link to="/patents" className="btn-primary" style={{ padding: '0.75rem 1.4rem', textDecoration: 'none', borderRadius: '10px', fontWeight: 600 }}>
          Open Patent Landscape &rarr;
        </Link>
      </div>
    </section>
  )
}
