import { useContext, useState } from 'react'
import { AuthContext } from '../context/auth-context'

const fields = ['name', 'phone_number', 'organization', 'designation', 'country', 'research_domain']
function ProfileForm({ user, updateUser }) {
  const [form, setForm] = useState(() => Object.fromEntries(fields.map(field => [field, user[field] || '']))); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [saving, setSaving] = useState(false)
  async function submit(event) { event.preventDefault(); setError(''); setMessage(''); if (Object.values(form).some(value => !value.trim())) { setError('All profile fields are required.'); return } setSaving(true); try { await updateUser(form); setMessage('Profile updated successfully.') } catch (err) { setError(err.message) } finally { setSaving(false) } }
  return <section className="auth-card register-card"><div className="card-heading"><p className="eyebrow">MY PROFILE</p><h1>Your research profile</h1><p>Email: {user.email}</p></div><form onSubmit={submit} className="form-grid">{fields.map(field => <label key={field}>{field.replaceAll('_', ' ')}<input value={form[field]} onChange={event => setForm(current => ({ ...current, [field]: event.target.value }))} required /></label>)}{error && <p className="error full" role="alert">{error}</p>}{message && <p className="success full" role="status">{message}</p>}<button className="primary-button full" disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button></form></section>
}
export default function Profile() { const { user, updateUser } = useContext(AuthContext); return user ? <ProfileForm key={user.id} user={user} updateUser={updateUser} /> : null }
