import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { contactService } from '../services/contactService'
import Footer from '../components/Footer'
import './ContactUs.css'

export default function ContactUs() {
  const location = useLocation()
  const formRef = useRef(null)

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    organization: '',
    subject: '',
    category: 'General Inquiry',
    message: '',
  })

  const [formStatus, setFormStatus] = useState({
    submitting: false,
    submitted: false,
    error: '',
    successMessage: '',
  })

  const [activeFaq, setActiveFaq] = useState(null)

  // Document metadata for SEO
  useEffect(() => {
    document.title = 'Contact Us | ResearchIntel'
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Contact the ResearchIntel team for questions, collaboration, research, technology and innovation opportunities.'
      )
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Check if state preselected category
  useEffect(() => {
    if (location.state?.category) {
      setFormData((prev) => ({ ...prev, category: location.state.category }))
    }
  }, [location.state])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCategorySelect = (cat) => {
    setFormData((prev) => ({ ...prev, category: cat }))
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormStatus({ submitting: true, submitted: false, error: '', successMessage: '' })

    // Validation
    if (!formData.full_name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      setFormStatus({
        submitting: false,
        submitted: false,
        error: 'Please complete all required fields (*).',
        successMessage: '',
      })
      return
    }

    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      setFormStatus({
        submitting: false,
        submitted: false,
        error: 'Please provide a valid email address.',
        successMessage: '',
      })
      return
    }

    if (formData.message.trim().length < 10) {
      setFormStatus({
        submitting: false,
        submitted: false,
        error: 'Please enter a message with at least 10 characters.',
        successMessage: '',
      })
      return
    }

    try {
      const res = await contactService.submitContactForm({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        organization: formData.organization.trim() || null,
        subject: formData.subject.trim(),
        category: formData.category,
        message: formData.message.trim(),
      })

      setFormStatus({
        submitting: false,
        submitted: true,
        error: '',
        successMessage: res.message || 'Thank you! Your message has been sent successfully.',
      })

      // Reset form fields
      setFormData({
        full_name: '',
        email: '',
        organization: '',
        subject: '',
        category: 'General Inquiry',
        message: '',
      })
    } catch (err) {
      setFormStatus({
        submitting: false,
        submitted: false,
        error: err.message || 'Something went wrong. Please try again later.',
        successMessage: '',
      })
    }
  }

  const categories = [
    'General Inquiry',
    'Research',
    'Funding',
    'Patent Intelligence',
    'Technology Intelligence',
    'Innovation',
    'Commercialization',
    'Technical Support',
    'Partnership',
    'Feedback',
    'Other',
  ]

  const contactOptions = [
    {
      icon: '💬',
      title: 'General Questions',
      desc: 'For questions about the platform and its capabilities.',
      category: 'General Inquiry',
    },
    {
      icon: '🎓',
      title: 'Research Collaboration',
      desc: 'For research collaboration and academic opportunities.',
      category: 'Research',
    },
    {
      icon: '💡',
      title: 'Technology & Innovation',
      desc: 'For technology, innovation and commercialization discussions.',
      category: 'Technology Intelligence',
    },
    {
      icon: '🤝',
      title: 'Partnership',
      desc: 'For organizations interested in collaboration.',
      category: 'Partnership',
    },
    {
      icon: '🔧',
      title: 'Technical Support',
      desc: 'For issues using the platform.',
      category: 'Technical Support',
    },
  ]

  const faqs = [
    {
      q: 'What is this platform?',
      a: 'ResearchIntel is an AI-powered research, funding and innovation intelligence platform designed to connect research literature, funding opportunities, patents, technologies, and commercialization pathways into one unified ecosystem.',
    },
    {
      q: 'Who can use the platform?',
      a: 'The platform is built for researchers, academic faculty, startup founders, innovation managers, technology transfer officers, and enterprise R&D leaders seeking evidence-backed insights.',
    },
    {
      q: 'Can researchers find funding opportunities?',
      a: 'Yes. The Funding Intelligence module indexes active grant solicitations from government bodies, philanthropic trusts, and corporate sponsors, scoring relevance against your research domain and publication track record.',
    },
    {
      q: 'Can users explore patent intelligence?',
      a: 'Yes. You can explore international patent prior-art filings across EPO, USPTO, and WIPO with semantic vector clustering, assignee breakdowns, and technology domain whitespace analysis.',
    },
    {
      q: 'Can users compare technologies?',
      a: 'Yes. The Technology Intelligence and Compare modules allow side-by-side benchmarking of emerging deep-tech domains across S-Curve maturity stages, TRL levels, publication velocity, and patent momentum.',
    },
    {
      q: 'What is the AI Assistant?',
      a: 'The ResearchIntel AI Assistant Copilot is a conversational intelligence engine that helps you search papers, discover relevant grants, explain patent clusters, analyze technology maturity, and navigate directly across the platform.',
    },
    {
      q: 'Can the platform generate reports?',
      a: 'Yes. The Reports & Export Center generates customized executive briefs and unified multi-module intelligence dossiers exportable directly to publication-ready PDF or Excel formats.',
    },
    {
      q: 'Can organizations use the platform?',
      a: 'Yes. Universities, research institutions, venture studios, and enterprise R&D divisions can leverage our intelligence datasets for technology transfer, horizon scanning, and portfolio management.',
    },
    {
      q: 'How can I report a problem?',
      a: 'You can submit a technical support request using the Contact Form on this page by selecting the "Technical Support" category, or reach out directly to our platform development leads.',
    },
    {
      q: 'How can I collaborate with the team?',
      a: 'Select "Research Collaboration" or "Partnership" in the contact form, or connect with our team members via the provided emails and phone numbers below.',
    },
  ]

  return (
    <div className="contact-us-page">
      {/* =========================================================
          1. HERO SECTION
          ========================================================= */}
      <section className="contact-hero-section">
        <div className="section-container">
          <div className="contact-hero-inner">
            <span className="eyebrow-pill">
              <span className="eyebrow-pulse" />
              GET IN TOUCH
            </span>
            <h1 className="contact-hero-title">Let's Connect</h1>
            <p className="contact-hero-subtitle">
              Have a question about the platform, research intelligence, collaboration or innovation opportunities? We'd love to hear from you.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================
          2. CONTACT OPTIONS CARDS (Interactive Category Selectors)
          ========================================================= */}
      <section className="contact-options-section">
        <div className="section-container">
          <div className="section-header-centered">
            <span className="section-eyebrow">HOW CAN WE HELP?</span>
            <h2 className="section-main-heading">Choose an Inquiry Topic</h2>
            <p className="section-main-lead">
              Select a topic below to pre-select the appropriate contact category and route your inquiry directly to the right specialist.
            </p>
          </div>

          <div className="contact-options-grid">
            {contactOptions.map((opt, idx) => (
              <div
                key={idx}
                className={`contact-option-card ${formData.category === opt.category ? 'selected-option-card' : ''}`}
                onClick={() => handleCategorySelect(opt.category)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleCategorySelect(opt.category)}
              >
                <div className="option-icon">{opt.icon}</div>
                <h3 className="option-title">{opt.title}</h3>
                <p className="option-desc">{opt.desc}</p>
                <span className="option-action-link">Select Topic &darr;</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          3. MAIN CONTACT FORM & DIRECT TEAM CONTACT
          ========================================================= */}
      <section ref={formRef} className="contact-main-section">
        <div className="section-container">
          <div className="contact-split-grid">
            {/* Left: Functional Contact Form */}
            <div className="contact-form-container">
              <div className="form-header">
                <span className="form-eyebrow">DIRECT INQUIRY</span>
                <h2 className="form-title">Send a Message</h2>
                <p className="form-subtitle">
                  Fill in your details below and our team will get back to you promptly.
                </p>
              </div>

              {formStatus.submitted && (
                <div className="contact-alert success-alert" role="status">
                  <span className="alert-icon">✅</span>
                  <div>
                    <strong>Message Sent!</strong>
                    <p>{formStatus.successMessage}</p>
                  </div>
                </div>
              )}

              {formStatus.error && (
                <div className="contact-alert error-alert" role="alert">
                  <span className="alert-icon">⚠️</span>
                  <div>
                    <strong>Unable to send:</strong>
                    <p>{formStatus.error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="contact-form-element" noValidate>
                <div className="form-two-col">
                  <div className="form-field-group">
                    <label htmlFor="full_name">
                      Full Name <span className="req-star">*</span>
                    </label>
                    <input
                      id="full_name"
                      name="full_name"
                      type="text"
                      required
                      placeholder="e.g. Dr. Alex Morgan"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="contact-input"
                    />
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="email">
                      Email Address <span className="req-star">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="name@organization.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="contact-input"
                    />
                  </div>
                </div>

                <div className="form-two-col">
                  <div className="form-field-group">
                    <label htmlFor="organization">Organization / University</label>
                    <input
                      id="organization"
                      name="organization"
                      type="text"
                      placeholder="e.g. Stanford University / Tech Corp"
                      value={formData.organization}
                      onChange={handleInputChange}
                      className="contact-input"
                    />
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="category">Inquiry Category</label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="contact-select"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-field-group">
                  <label htmlFor="subject">
                    Subject <span className="req-star">*</span>
                  </label>
                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    required
                    placeholder="Summary of your inquiry..."
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="contact-input"
                  />
                </div>

                <div className="form-field-group">
                  <label htmlFor="message">
                    Message <span className="req-star">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows="5"
                    required
                    placeholder="Provide details about your research, partnership or inquiry..."
                    value={formData.message}
                    onChange={handleInputChange}
                    className="contact-textarea"
                  />
                  <small className="field-char-count">
                    {formData.message.length} characters (minimum 10)
                  </small>
                </div>

                <button
                  type="submit"
                  disabled={formStatus.submitting}
                  className="contact-submit-btn"
                >
                  {formStatus.submitting ? (
                    <>
                      <span className="spinner-icon" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Message</span>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right: Direct Team Contact Information */}
            <div className="contact-info-container">
              <div className="direct-team-card">
                <span className="card-badge">DIRECT ACCESS</span>
                <h3 className="team-contact-heading">Contact Our Team</h3>
                <p className="team-contact-lead">
                  Connect directly with the platform leads and researchers for immediate inquiries.
                </p>

                <div className="team-contact-list">
                  {/* Member 1: Tarun Chaudhari */}
                  <div className="team-contact-entry">
                    <img src="/Tarun.jpg" alt="Tarun Chaudhari" className="contact-avatar-img" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'grid'; }} />
                    <div className="contact-avatar-badge" style={{ display: 'none' }}>TC</div>
                    <div className="contact-entry-body">
                      <strong className="contact-person-name">Tarun Chaudhari</strong>
                      <span className="contact-person-role">Full-Stack &amp; AI Integration Lead</span>
                      <div className="contact-methods-box">
                        <a href="mailto:traunchaudhari1313@gmail.com" className="direct-link">
                          <span className="method-icon">✉️</span>
                          <span>traunchaudhari1313@gmail.com</span>
                        </a>
                        <a href="tel:9518391245" className="direct-link">
                          <span className="method-icon">📞</span>
                          <span>+91 9518391245</span>
                        </a>
                        <div className="contact-social-row">
                          <a href="https://github.com/tarun-1313" target="_blank" rel="noopener noreferrer" className="contact-social-pill">
                            <span>GitHub</span>
                          </a>
                          <a href="https://www.linkedin.com/in/tarun-chaudhari191313/" target="_blank" rel="noopener noreferrer" className="contact-social-pill">
                            <span>LinkedIn</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Member 2: Yug Thakkar */}
                  <div className="team-contact-entry">
                    <img src="/Yug.png" alt="Yug Thakkar" className="contact-avatar-img" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'grid'; }} />
                    <div className="contact-avatar-badge" style={{ display: 'none' }}>YT</div>
                    <div className="contact-entry-body">
                      <strong className="contact-person-name">Yug Thakkar</strong>
                      <span className="contact-person-role">Data &amp; Database Engineering Lead</span>
                      <div className="contact-methods-box">
                        <a href="mailto:yug.rt@somaiya.edu" className="direct-link">
                          <span className="method-icon">✉️</span>
                          <span>yug.rt@somaiya.edu</span>
                        </a>
                        <a href="tel:9653111370" className="direct-link">
                          <span className="method-icon">📞</span>
                          <span>+91 9653111370</span>
                        </a>
                        <div className="contact-social-row">
                          <a href="https://github.com/yug2405" target="_blank" rel="noopener noreferrer" className="contact-social-pill">
                            <span>GitHub</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Member 3: Priyanka Pradhan */}
                  <div className="team-contact-entry">
                    <div className="contact-avatar-badge" style={{ background: '#fdf4ff', color: '#9333ea', borderColor: '#f5d0fe' }}>PP</div>
                    <div className="contact-entry-body">
                      <strong className="contact-person-name">Priyanka Pradhan</strong>
                      <span className="contact-person-role">Backend &amp; Intelligence Engineer</span>
                      <div className="contact-methods-box">
                        <div className="contact-social-row">
                          <a
                            href="https://github.com/Priyanka-204"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-social-pill"
                            title="Priyanka Pradhan GitHub Profile"
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            <span>GitHub</span>
                          </a>
                        </div>
                        <p className="contact-request-note">
                          Email &amp; direct contact available upon request via form.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Member 4: Shruthi Thammi */}
                  <div className="team-contact-entry">
                    <div className="contact-avatar-badge" style={{ background: '#fdf4ff', color: '#9333ea', borderColor: '#f5d0fe' }}>ST</div>
                    <div className="contact-entry-body">
                      <strong className="contact-person-name">Shruthi Thammi</strong>
                      <span className="contact-person-role">Backend &amp; Systems Integration Engineer</span>
                      <div className="contact-methods-box">
                        <div className="contact-social-row">
                          <a
                            href="https://github.com/Shruthi-1005"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-social-pill"
                            title="Shruthi Thammi GitHub Profile"
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            <span>GitHub</span>
                          </a>
                        </div>
                        <p className="contact-request-note">
                          Email &amp; direct contact available upon request via form.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social Connect & Platform Inquiries Box */}
                <div className="connect-social-box">
                  <h4 className="social-box-heading">Connect With Us</h4>
                  <div className="social-buttons-flex">
                    <a
                      href="https://github.com/tarun-1313"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="contact-social-pill active-pill"
                      title="Team GitHub Repository & Profiles"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                      <span>GitHub</span>
                    </a>
                    <a
                      href="https://www.linkedin.com/in/tarun-chaudhari191313/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="contact-social-pill active-pill"
                      title="LinkedIn Network"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                      <span>LinkedIn</span>
                    </a>
                    <a
                      href="mailto:traunchaudhari1313@gmail.com"
                      className="contact-social-pill active-pill"
                      title="Direct Email Reachout"
                    >
                      <span className="method-icon">✉️</span>
                      <span>Email Us</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          4. FREQUENTLY ASKED QUESTIONS (Accordion)
          ========================================================= */}
      <section className="contact-faq-section">
        <div className="section-container">
          <div className="section-header-centered">
            <span className="section-eyebrow">HELP &amp; ANSWERS</span>
            <h2 className="section-main-heading">Frequently Asked Questions</h2>
            <p className="section-main-lead">
              Common questions about our analytical capabilities, data provenance, and platform usage.
            </p>
          </div>

          <div className="faq-accordion-container">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx
              return (
                <div
                  key={idx}
                  className={`faq-item-card ${isOpen ? 'faq-item-open' : ''}`}
                >
                  <button
                    type="button"
                    className="faq-question-btn"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                  >
                    <span className="faq-q-text">{faq.q}</span>
                    <span className="faq-chevron-icon" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.25s ease',
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="faq-answer-panel" role="region">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Enterprise Footer */}
      <Footer />
    </div>
  )
}
