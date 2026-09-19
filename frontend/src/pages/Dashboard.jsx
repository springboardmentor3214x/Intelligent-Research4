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

      <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f766e', background: '#f0fdfa', padding: '0.25rem 0.65rem', borderRadius: '999px', border: '1px solid #ccfbf1', display: 'inline-block', marginBottom: '0.5rem' }}>
              Researcher Profile
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f2942', margin: '0 0 0.5rem 0' }}>Research Portfolio &amp; Details</h2>
            <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>Manage your research areas, keywords, publications, and patents.</p>
          </div>
          <Link to="/profile" className="btn-primary" style={{ marginTop: '1.25rem', padding: '0.65rem 1.2rem', textDecoration: 'none', borderRadius: '10px', fontWeight: 600, textAlign: 'center' }}>
            Manage Profile &rarr;
          </Link>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2563eb', background: '#eff6ff', padding: '0.25rem 0.65rem', borderRadius: '999px', border: '1px solid #dbeafe', display: 'inline-block', marginBottom: '0.5rem' }}>
              Literature Discovery &amp; AI
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f2942', margin: '0 0 0.5rem 0' }}>Research Papers &amp; AI Analysis</h2>
            <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>Discover papers across repositories, generate structured AI findings, and track research trends.</p>
          </div>
          <Link to="/research-papers" className="btn-primary" style={{ marginTop: '1.25rem', padding: '0.65rem 1.2rem', textDecoration: 'none', borderRadius: '10px', fontWeight: 600, textAlign: 'center' }}>
            Explore Papers &rarr;
          </Link>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7c3aed', background: '#f5f3ff', padding: '0.25rem 0.65rem', borderRadius: '999px', border: '1px solid #ede9fe', display: 'inline-block', marginBottom: '0.5rem' }}>
              Grant Intelligence
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f2942', margin: '0 0 0.5rem 0' }}>AI Funding Semantic Matching</h2>
            <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>Personalized funding recommendations based on semantic similarity to your researcher profile.</p>
          </div>
          <Link to="/funding" className="btn-primary" style={{ marginTop: '1.25rem', padding: '0.65rem 1.2rem', textDecoration: 'none', borderRadius: '10px', fontWeight: 600, textAlign: 'center' }}>
            Match Funding &rarr;
          </Link>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f766e', background: '#f0fdfa', padding: '0.25rem 0.65rem', borderRadius: '999px', border: '1px solid #ccfbf1', display: 'inline-block', marginBottom: '0.5rem' }}>
              Patent Landscape
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f2942', margin: '0 0 0.5rem 0' }}>Patent Landscape &amp; AI Clustering</h2>
            <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>Explore EPO patent records, sentence embeddings, KMeans clustering, and PCA maps.</p>
          </div>
          <Link to="/patents" className="btn-primary" style={{ marginTop: '1.25rem', padding: '0.65rem 1.2rem', textDecoration: 'none', borderRadius: '10px', fontWeight: 600, textAlign: 'center' }}>
            Open Patent Landscape &rarr;
          </Link>
        </div>
      </div>
    </section>
  )
}

