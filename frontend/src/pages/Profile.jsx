import { useContext, useState } from 'react'
import { AuthContext } from '../context/auth-context'

const accountFields = [['name', 'Full name'], ['phone_number', 'Phone number']]
const researcherFields = [...accountFields, ['organization', 'Organization'], ['designation', 'Designation'], ['country', 'Country'], ['research_domain', 'Primary research domain']]

export default function Profile() {
  const { user, updateUser } = useContext(AuthContext)
  const isResearcher = user?.role === 'researcher'
  const roleName = user?.role?.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase()) || 'Account'
  const fields = isResearcher ? researcherFields : accountFields
  const [form, setForm] = useState(() => Object.fromEntries(fields.map(([key]) => [key, user?.[key] || ''])))
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault(); setError(''); setMessage('')
    if (Object.values(form).some(value => !value.trim())) { setError('Complete every profile field before saving.'); return }
    setSaving(true)
    try { await updateUser(form); setMessage(isResearcher ? 'Research profile updated successfully.' : 'Account profile updated successfully.') } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  if (!user) return null
  return <div className="research-profile-page"><section className="profile-hero"><div><p className="eyebrow">{isResearcher ? 'RESEARCH PROFILE' : `${roleName.toUpperCase()} PROFILE`}</p><h1>{isResearcher ? 'Shape your research signal.' : `Manage your ${roleName} account.`}</h1><p>{isResearcher ? 'Keep your research context current to improve the intelligence and recommendations you receive.' : 'Keep your personal account details current for a clear and secure platform experience.'}</p></div><div className="profile-identity"><span>{user.name?.slice(0, 1).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div></section><section className="profile-editor profile-editor-wide" aria-labelledby="profile-details-heading"><div className="panel-heading"><div><p className="eyebrow">PROFILE DETAILS</p><h2 id="profile-details-heading">{isResearcher ? 'Your research context' : 'Your account details'}</h2></div></div><form onSubmit={submit} className="form-grid">{fields.map(([field, label]) => <label key={field}>{label}<input value={form[field]} maxLength={field === 'phone_number' ? 20 : undefined} onChange={event => setForm(current => ({ ...current, [field]: event.target.value }))} required /></label>)}{error && <p className="error full" role="alert">{error}</p>}{message && <p className="success full" role="status">{message}</p>}<button className="primary-button full" disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button></form></section></div>
}
