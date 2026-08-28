import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../services/authService'
import '../auth-enhancements.css'

const initial = { name: '', email: '', password: '', role: 'researcher', phone_number: '', organization: '', designation: '', country: '', research_domain: '' }
const roles = [['researcher', 'Researcher', 'Research profiles and funding discovery'], ['startup_founder', 'Startup Founder', 'Funding, patents, and commercialization'], ['innovation_manager', 'Innovation Manager', 'Portfolio and technology intelligence'], ['administrator', 'Administrator', 'Platform operations and user management']]
const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/

export default function Register() {
  const [form, setForm] = useState(initial); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false); const navigate = useNavigate()
  function change(event) { setForm(value => ({ ...value, [event.target.name]: event.target.value })) }
  async function submit(event) {
    event.preventDefault(); setError('')
    if (Object.values(form).some(value => !value.trim())) { setError('Please complete every registration field.'); return }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) { setError('Enter a valid email address.'); return }
    if (!passwordRule.test(form.password)) { setError('Use 12+ characters including uppercase, lowercase, a number, and a special character.'); return }
    setSubmitting(true); try { await register(form); navigate('/login', { replace: true }) } catch (err) { setError(err.message) } finally { setSubmitting(false) }
  }
  return <section className="auth-card register-card"><div className="card-heading"><p className="eyebrow">START EXPLORING</p><h1>Create your account</h1><p>All fields are required to create a complete research profile.</p></div><form onSubmit={submit} className="form-grid"><label>Name<input name="name" value={form.name} onChange={change} placeholder="Your full name" required /></label><label>Email address<input name="email" type="email" value={form.email} onChange={change} placeholder="name@organization.com" required /></label><label>Password<input name="password" type="password" value={form.password} onChange={change} minLength="12" placeholder="12+ characters" required /><small className="field-hint">Uppercase, lowercase, number, and special character.</small></label><fieldset className="role-picker full"><legend>Choose your role</legend><div className="role-options">{roles.map(([value, label, description]) => <button type="button" disabled={value === 'administrator'} title={value === 'administrator' ? 'Administrator accounts are created by the platform team.' : undefined} className={`role-option ${form.role === value ? 'selected' : ''}`} onClick={() => setForm(current => ({ ...current, role: value }))} key={value}><span className="role-dot" aria-hidden="true" /><span><strong>{label}</strong><small>{value === 'administrator' ? 'Provisioned by the platform team' : description}</small></span></button>)}</div></fieldset><label>Phone number<input name="phone_number" value={form.phone_number} onChange={change} minLength="7" placeholder="Your phone number" required /></label><label>Organization<input name="organization" value={form.organization} onChange={change} placeholder="University, startup, or company" required /></label><label>Designation<input name="designation" value={form.designation} onChange={change} placeholder="Your designation" required /></label><label>Country<input name="country" value={form.country} onChange={change} placeholder="Your country" required /></label><label className="full">Research domain<input name="research_domain" value={form.research_domain} onChange={change} placeholder="For example: clean energy, biotechnology" required /></label>{error && <p className="error full" role="alert">{error}</p>}<button className="primary-button full" disabled={submitting}>{submitting ? 'Creating account...' : 'Create account'}</button></form><p className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></p></section>
}
