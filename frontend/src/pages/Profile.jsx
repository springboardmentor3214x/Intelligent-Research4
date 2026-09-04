import { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../context/auth-context'
import {
  getProfile,
  createProfile,
  updateProfile,
  addResearchArea,
  removeResearchArea,
  addKeyword,
  removeKeyword,
  addTechnologyArea,
  removeTechnologyArea,
  addPublication,
  removePublication,
  addPatent,
  removePatent,
} from '../services/profileService'
import Loading from '../components/Loading'
import './Profile.css'

export default function Profile() {
  const { token, user, updateUser } = useContext(AuthContext)
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Form states for basic/organization info
  const [editForm, setEditForm] = useState({
    name: '',
    organization: '',
    designation: '',
    country: '',
    phone_number: '',
    research_domain: '',
    research_interests: '',
  })
  const [isSavingBasic, setIsSavingBasic] = useState(false)

  // Sub-entity input states
  const [newArea, setNewArea] = useState('')
  const [newKeyword, setNewKeyword] = useState('')
  const [newTechArea, setNewTechArea] = useState('')

  // Publication Form State
  const [showPubModal, setShowPubModal] = useState(false)
  const [pubForm, setPubForm] = useState({
    title: '',
    authors: '',
    publication_date: '',
    journal_or_conference: '',
    doi: '',
    publication_link: '',
  })
  const [isSavingPub, setIsSavingPub] = useState(false)

  // Patent Form State
  const [showPatModal, setShowPatModal] = useState(false)
  const [patForm, setPatForm] = useState({
    patent_title: '',
    inventor: '',
    patent_number: '',
    filing_date: '',
    patent_status: 'Pending',
    patent_link: '',
  })
  const [isSavingPat, setIsSavingPat] = useState(false)

  // Fetch complete profile on load
  useEffect(() => {
    if (!token) return
    loadFullProfile()
  }, [token])

  async function loadFullProfile() {
    setLoading(true)
    setError('')
    try {
      const data = await getProfile(token)
      setProfileData(data)
      setEditForm({
        name: data.name || '',
        organization: data.organization || '',
        designation: data.designation || '',
        country: data.country || '',
        phone_number: data.phone_number || '',
        research_domain: data.research_domain || '',
        research_interests: data.research_interests || '',
      })
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('not found')) {
        // Profile does not exist yet for this user -> initialize with user object
        setEditForm({
          name: user?.name || '',
          organization: user?.organization || '',
          designation: user?.designation || '',
          country: user?.country || '',
          phone_number: user?.phone_number || '',
          research_domain: user?.research_domain || '',
          research_interests: '',
        })
        setProfileData(null)
      } else {
        setError(err.message || 'Failed to load research profile')
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle saving core profile & organization info
  async function handleSaveBasic(e) {
    e.preventDefault()
    setIsSavingBasic(true)
    setError('')
    setSuccessMsg('')
    try {
      let updated
      if (!profileData) {
        updated = await createProfile(token, editForm)
      } else {
        updated = await updateProfile(token, editForm)
      }
      setProfileData(updated)
      if (updateUser) {
        updateUser(updated)
      }
      setSuccessMsg('Profile and organization details saved successfully.')
    } catch (err) {
      setError(err.message || 'Failed to save profile.')
    } finally {
      setIsSavingBasic(false)
    }
  }

  // Research Area Handlers
  async function handleAddArea(e) {
    e.preventDefault()
    if (!newArea.trim()) return
    setError('')
    try {
      await addResearchArea(token, { name: newArea.trim() })
      setNewArea('')
      loadFullProfile()
    } catch (err) {
      setError(err.message || 'Failed to add research area.')
    }
  }

  async function handleRemoveArea(areaId) {
    setError('')
    try {
      await removeResearchArea(token, areaId)
      loadFullProfile()
    } catch (err) {
      setError(err.message || 'Failed to remove research area.')
    }
  }

  // Keyword Handlers
  async function handleAddKeyword(e) {
    e.preventDefault()
    if (!newKeyword.trim()) return
    setError('')
    try {
      await addKeyword(token, { name: newKeyword.trim() })
      setNewKeyword('')
      loadFullProfile()
    } catch (err) {
      setError(err.message || 'Failed to add keyword.')
    }
  }

  async function handleRemoveKeyword(kwId) {
    setError('')
    try {
      await removeKeyword(token, kwId)
      loadFullProfile()
    } catch (err) {
      setError(err.message || 'Failed to remove keyword.')
    }
  }

  // Technology Area Handlers
  async function handleAddTechArea(e) {
    e.preventDefault()
    if (!newTechArea.trim()) return
    setError('')
    try {
      await addTechnologyArea(token, { name: newTechArea.trim() })
      setNewTechArea('')
      loadFullProfile()
    } catch (err) {
      setError(err.message || 'Failed to add technology area.')
    }
  }

  async function handleRemoveTechArea(techId) {
    setError('')
    try {
      await removeTechnologyArea(token, techId)
      loadFullProfile()
    } catch (err) {
      setError(err.message || 'Failed to remove technology area.')
    }
  }

  // Publication Handlers
  async function handleCreatePub(e) {
    e.preventDefault()
    setIsSavingPub(true)
    setError('')
    try {
      await addPublication(token, {
        ...pubForm,
        publication_date: pubForm.publication_date || null,
      })
      setShowPubModal(false)
      setPubForm({
        title: '',
        authors: '',
        publication_date: '',
        journal_or_conference: '',
        doi: '',
        publication_link: '',
      })
      loadFullProfile()
    } catch (err) {
      setError(err.message || 'Failed to add publication.')
    } finally {
      setIsSavingPub(false)
    }
  }

  async function handleRemovePub(pubId) {
    if (!confirm('Are you sure you want to delete this publication?')) return
    setError('')
    try {
      await removePublication(token, pubId)
      loadFullProfile()
    } catch (err) {
      setError(err.message || 'Failed to remove publication.')
    }
  }

  // Patent Handlers
  async function handleCreatePat(e) {
    e.preventDefault()
    setIsSavingPat(true)
    setError('')
    try {
      await addPatent(token, {
        ...patForm,
        filing_date: patForm.filing_date || null,
      })
      setShowPatModal(false)
      setPatForm({
        patent_title: '',
        inventor: '',
        patent_number: '',
        filing_date: '',
        patent_status: 'Pending',
        patent_link: '',
      })
      loadFullProfile()
    } catch (err) {
      setError(err.message || 'Failed to add patent.')
    } finally {
      setIsSavingPat(false)
    }
  }

  async function handleRemovePat(patentId) {
    if (!confirm('Are you sure you want to delete this patent entry?')) return
    setError('')
    try {
      await removePatent(token, patentId)
      loadFullProfile()
    } catch (err) {
      setError(err.message || 'Failed to remove patent.')
    }
  }

  if (loading) {
    return <Loading />
  }

  const areas = profileData?.research_areas || []
  const keywords = profileData?.keywords || []
  const techAreas = profileData?.technology_areas || []
  const publications = profileData?.publications || []
  const patents = profileData?.patents || []

  return (
    <div className="profile-container">
      {/* Header Banner */}
      <header className="profile-header">
        <div className="profile-avatar">
          {editForm.name ? editForm.name[0].toUpperCase() : 'U'}
        </div>
        <div className="profile-meta">
          <h1>{editForm.name || 'Research Profile'}</h1>
          <p className="profile-subtitle">
            <span>{user?.email}</span> &bull;{' '}
            <span className="badge-role">{user?.role?.replaceAll('_', ' ')}</span> &bull;{' '}
            <span>{editForm.organization || 'No Organization'}</span>
          </p>
        </div>
      </header>

      {/* Notifications */}
      {error && <div className="profile-alert error-banner">{error}</div>}
      {successMsg && <div className="profile-alert success-banner">{successMsg}</div>}

      <div className="profile-grid-layout">
        {/* Left Column: Core Details */}
        <section className="profile-card core-details-card">
          <h2>Profile & Organization Details</h2>
          <form onSubmit={handleSaveBasic} className="profile-form">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Organization</label>
                <input
                  type="text"
                  placeholder="University, Company, Institute"
                  value={editForm.organization}
                  onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Designation</label>
                <input
                  type="text"
                  placeholder="Professor, Founder, Scientist"
                  value={editForm.designation}
                  onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  placeholder="e.g. United States, Germany"
                  value={editForm.country}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  placeholder="+1 234 567 8900"
                  value={editForm.phone_number}
                  onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Primary Research Domain *</label>
              <input
                type="text"
                placeholder="e.g. Artificial Intelligence, Clean Energy, Biotechnology"
                value={editForm.research_domain}
                onChange={(e) => setEditForm({ ...editForm, research_domain: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Research Interests / Bio</label>
              <textarea
                rows="3"
                placeholder="Describe your research focus, methodologies, or objectives..."
                value={editForm.research_interests}
                onChange={(e) => setEditForm({ ...editForm, research_interests: e.target.value })}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={isSavingBasic}>
              {isSavingBasic ? 'Saving Details...' : 'Save Profile Details'}
            </button>
          </form>
        </section>

        {/* Right Column: Tags & Taxonomies */}
        <section className="profile-card tags-card">
          {/* Research Areas */}
          <div className="tag-section">
            <h3>Research Areas</h3>
            <p className="section-hint">Specific fields and sub-disciplines of your work</p>
            <div className="tag-chip-container">
              {areas.length === 0 ? (
                <span className="empty-hint">No research areas added yet.</span>
              ) : (
                areas.map((area) => (
                  <span key={area.id} className="tag-chip">
                    {area.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveArea(area.id)}
                      className="btn-remove-tag"
                      title="Remove"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
            <form onSubmit={handleAddArea} className="tag-input-form">
              <input
                type="text"
                placeholder="Add research area (e.g. Neural Networks)..."
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
              />
              <button type="submit" className="btn-secondary">Add</button>
            </form>
          </div>

          <hr className="divider-line" />

          {/* Keywords */}
          <div className="tag-section">
            <h3>Keywords</h3>
            <p className="section-hint">Core topics and terms for discovery</p>
            <div className="tag-chip-container">
              {keywords.length === 0 ? (
                <span className="empty-hint">No keywords added yet.</span>
              ) : (
                keywords.map((kw) => (
                  <span key={kw.id} className="tag-chip keyword-chip">
                    {kw.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw.id)}
                      className="btn-remove-tag"
                      title="Remove"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
            <form onSubmit={handleAddKeyword} className="tag-input-form">
              <input
                type="text"
                placeholder="Add keyword (e.g. LLMs, CRISPR, Solar)..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
              />
              <button type="submit" className="btn-secondary">Add</button>
            </form>
          </div>

          <hr className="divider-line" />

          {/* Technology Areas */}
          <div className="tag-section">
            <h3>Technology Areas</h3>
            <p className="section-hint">Commercial, industrial, and applied tech categories</p>
            <div className="tag-chip-container">
              {techAreas.length === 0 ? (
                <span className="empty-hint">No technology areas added yet.</span>
              ) : (
                techAreas.map((tech) => (
                  <span key={tech.id} className="tag-chip tech-chip">
                    {tech.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveTechArea(tech.id)}
                      className="btn-remove-tag"
                      title="Remove"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
            <form onSubmit={handleAddTechArea} className="tag-input-form">
              <input
                type="text"
                placeholder="Add technology area (e.g. DeepTech, BioTech)..."
                value={newTechArea}
                onChange={(e) => setNewTechArea(e.target.value)}
              />
              <button type="submit" className="btn-secondary">Add</button>
            </form>
          </div>
        </section>
      </div>

      {/* Publications Section */}
      <section className="profile-card full-width-card">
        <div className="section-header-flex">
          <div>
            <h2>Publications</h2>
            <p className="section-hint">Published papers, conference proceedings, and preprints</p>
          </div>
          <button
            type="button"
            className="btn-primary-small"
            onClick={() => setShowPubModal(true)}
          >
            + Add Publication
          </button>
        </div>

        {publications.length === 0 ? (
          <div className="empty-state-box">
            <p>No publications listed yet.</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowPubModal(true)}
            >
              Add your first publication
            </button>
          </div>
        ) : (
          <div className="items-list">
            {publications.map((pub) => (
              <div key={pub.id} className="item-row">
                <div className="item-info">
                  <h4>{pub.title}</h4>
                  <p className="item-authors">Authors: {pub.authors}</p>
                  <p className="item-details">
                    {pub.journal_or_conference && (
                      <span><strong>Venue:</strong> {pub.journal_or_conference} &bull; </span>
                    )}
                    {pub.publication_date && (
                      <span><strong>Date:</strong> {pub.publication_date} &bull; </span>
                    )}
                    {pub.doi && <span><strong>DOI:</strong> {pub.doi}</span>}
                  </p>
                </div>
                <div className="item-actions">
                  {pub.publication_link && (
                    <a
                      href={pub.publication_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-button"
                    >
                      View Link
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemovePub(pub.id)}
                    className="btn-danger-small"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Patents Section */}
      <section className="profile-card full-width-card">
        <div className="section-header-flex">
          <div>
            <h2>Patents & IP</h2>
            <p className="section-hint">Filed and granted patents, innovations, and intellectual property</p>
          </div>
          <button
            type="button"
            className="btn-primary-small"
            onClick={() => setShowPatModal(true)}
          >
            + Add Patent
          </button>
        </div>

        {patents.length === 0 ? (
          <div className="empty-state-box">
            <p>No patents or IP records listed yet.</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowPatModal(true)}
            >
              Add your first patent
            </button>
          </div>
        ) : (
          <div className="items-list">
            {patents.map((pat) => (
              <div key={pat.id} className="item-row">
                <div className="item-info">
                  <h4>{pat.patent_title}</h4>
                  <p className="item-authors">Inventors: {pat.inventor}</p>
                  <p className="item-details">
                    {pat.patent_number && (
                      <span><strong>Patent #:</strong> {pat.patent_number} &bull; </span>
                    )}
                    {pat.filing_date && (
                      <span><strong>Filing Date:</strong> {pat.filing_date} &bull; </span>
                    )}
                    <span className="badge-status">{pat.patent_status || 'Pending'}</span>
                  </p>
                </div>
                <div className="item-actions">
                  {pat.patent_link && (
                    <a
                      href={pat.patent_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-button"
                    >
                      View Patent
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemovePat(pat.id)}
                    className="btn-danger-small"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal: Add Publication */}
      {showPubModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Add Publication</h3>
            <form onSubmit={handleCreatePub} className="modal-form">
              <div className="form-group">
                <label>Publication Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scalable Quantum Computing Systems"
                  value={pubForm.title}
                  onChange={(e) => setPubForm({ ...pubForm, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Authors *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jane Doe, Dr. John Smith"
                  value={pubForm.authors}
                  onChange={(e) => setPubForm({ ...pubForm, authors: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Journal / Conference</label>
                  <input
                    type="text"
                    placeholder="e.g. IEEE Transactions, Nature"
                    value={pubForm.journal_or_conference}
                    onChange={(e) => setPubForm({ ...pubForm, journal_or_conference: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Publication Date</label>
                  <input
                    type="date"
                    value={pubForm.publication_date}
                    onChange={(e) => setPubForm({ ...pubForm, publication_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>DOI</label>
                  <input
                    type="text"
                    placeholder="10.1000/182"
                    value={pubForm.doi}
                    onChange={(e) => setPubForm({ ...pubForm, doi: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Article Link</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={pubForm.publication_link}
                    onChange={(e) => setPubForm({ ...pubForm, publication_link: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowPubModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSavingPub}>
                  {isSavingPub ? 'Adding...' : 'Add Publication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Patent */}
      {showPatModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Add Patent Record</h3>
            <form onSubmit={handleCreatePat} className="modal-form">
              <div className="form-group">
                <label>Patent Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High-Efficiency Photovoltaic Nanostructure"
                  value={patForm.patent_title}
                  onChange={(e) => setPatForm({ ...patForm, patent_title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Inventors *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jane Doe"
                  value={patForm.inventor}
                  onChange={(e) => setPatForm({ ...patForm, inventor: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Patent Number</label>
                  <input
                    type="text"
                    placeholder="e.g. US-2026-012345"
                    value={patForm.patent_number}
                    onChange={(e) => setPatForm({ ...patForm, patent_number: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Filing Date</label>
                  <input
                    type="date"
                    value={patForm.filing_date}
                    onChange={(e) => setPatForm({ ...patForm, filing_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={patForm.patent_status}
                    onChange={(e) => setPatForm({ ...patForm, patent_status: e.target.value })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Published">Published</option>
                    <option value="Granted">Granted</option>
                    <option value="Licensed">Licensed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Patent URL / Reference</label>
                  <input
                    type="url"
                    placeholder="https://patents.google.com/..."
                    value={patForm.patent_link}
                    onChange={(e) => setPatForm({ ...patForm, patent_link: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowPatModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSavingPat}>
                  {isSavingPat ? 'Adding...' : 'Add Patent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
