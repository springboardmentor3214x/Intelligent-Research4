import React, { useState, useEffect, useRef, useContext, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import { assistantService } from '../services/assistantService'
import './PlatformAIAssistant.css'

const QUICK_ACTIONS = [
  { id: 'search_ai', label: '🔬 Search Research', prompt: 'Find research papers and publications on Artificial Intelligence in healthcare' },
  { id: 'find_funding', label: '💰 Find Funding', prompt: 'What funding opportunities and grants are available for deep-tech innovation?' },
  { id: 'explore_patents', label: '📜 Explore Patents', prompt: 'Show me patent landscape and prior art records' },
  { id: 'tech_maturity', label: '⚙ Analyze Technology', prompt: 'Analyze technology maturity, S-Curve progression, and TRL stages' },
  { id: 'eval_innovation', label: '💡 Evaluate Innovation', prompt: 'Calculate innovation score and evaluate novelty for an idea' },
  { id: 'explore_comm', label: '🚀 Commercialization', prompt: 'How can I commercialize research discoveries and find industry partners?' },
  { id: 'gen_report', label: '📑 Generate Report', prompt: 'Create a full intelligence report about AI in healthcare' },
  { id: 'explain_platform', label: '🌐 Platform Help', prompt: 'What can I do on the ResearchIntel platform?' },
]

export default function PlatformAIAssistant() {
  const { token, user } = useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()

  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [loadingStage, setLoadingStage] = useState(0)
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: `Hello ${user?.name ? user.name.split(' ')[0] : 'there'}! I am **ResearchIntel Intelligence Copilot**.\n\nI can help you explore scientific research literature, analyze patent prior-art landscapes, discover active grant programs, evaluate technology S-Curves, calculate innovation scores, and generate multi-module executive reports.\n\nHow can I assist your scientific discovery today?`,
      actions: [
        { type: 'navigate', label: '🔬 Explore Research', route: '/research-papers' },
        { type: 'navigate', label: '💰 Find Grants', route: '/funding' },
        { type: 'navigate', label: '📜 Patent Landscape', route: '/patents' },
        { type: 'navigate', label: '⚙ Technology Intelligence', route: '/technologies' },
      ],
      sources: [],
      suggestions: [
        'Find funding for medical imaging AI',
        'Show patents related to computer vision',
        'What can this platform do?',
        'Generate an intelligence report',
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])

  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  // Scroll to latest message
  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, messages, scrollToBottom])

  // Multi-stage loading progression timer for truthful UI feedback
  useEffect(() => {
    let interval
    if (loading) {
      setLoadingStage(1)
      interval = setInterval(() => {
        setLoadingStage((prev) => (prev < 4 ? prev + 1 : prev))
      }, 500)
    } else {
      setLoadingStage(0)
    }
    return () => clearInterval(interval)
  }, [loading])

  // Handle global custom event for prompt quick-launch from Landing or any page
  useEffect(() => {
    const handleLaunchAssistant = (e) => {
      const prompt = e.detail?.prompt || ''
      setIsOpen(true)
      if (prompt) {
        handleSendMessage(prompt)
      }
    }
    window.addEventListener('launch-ri-assistant', handleLaunchAssistant)
    return () => window.removeEventListener('launch-ri-assistant', handleLaunchAssistant)
  }, [])

  const handleSendMessage = async (textToSend) => {
    const q = (textToSend || inputMessage).trim()
    if (!q || loading) return

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputMessage('')
    setLoading(true)
    setError('')

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }))

      const res = await assistantService.sendChatMessage(
        q,
        location.pathname,
        {},
        history,
        token
      )

      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: res.message,
        actions: res.actions || [],
        sources: res.sources || [],
        suggestions: res.suggestions || [],
        provider: res.provider || 'ResearchIntel Copilot Engine',
        topic: res.topic,
        confidence: res.confidence,
        evidence_coverage: res.evidence_coverage,
        generation_breakdown: res.generation_breakdown,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      console.error('Assistant error:', err)
      setError(err.message || 'Unable to communicate with ResearchIntel AI Assistant.')
      const errorMsg = {
        id: `assistant-err-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **I couldn't complete the analysis right now.**\n\nThe intelligence service may be temporarily unavailable or encountering a network timeout. You can retry your request or navigate directly to platform modules below.`,
        actions: [
          { type: 'retry', label: '🔄 Retry Request', query: q },
          { type: 'navigate', label: '📊 Go to Unified Dashboard', route: '/dashboard' },
          { type: 'navigate', label: '📜 Open Patent Landscape', route: '/patents' },
        ],
        sources: [],
        suggestions: ['Explore research literature', 'Find active funding grants', 'What can I do here?'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const handleActionClick = (action) => {
    if (action.type === 'retry' && action.query) {
      handleSendMessage(action.query)
    } else if (action.type === 'navigate' && action.route) {
      navigate(action.route)
      if (window.innerWidth < 768) {
        setIsOpen(false)
      }
    } else if (action.type === 'report') {
      navigate('/reports')
    }
  }

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: 'Conversation history cleared. How can I help you explore ResearchIntel platform intelligence?',
        actions: [
          { type: 'navigate', label: '🔬 Explore Research', route: '/research-papers' },
          { type: 'navigate', label: '💰 Find Grants', route: '/funding' },
          { type: 'navigate', label: '📜 Patent Landscape', route: '/patents' },
        ],
        sources: [],
        suggestions: ['Search emerging technologies', 'Find grants for AI', 'Generate intelligence report'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setError('')
  }

  return (
    <>
      {/* 1. Floating AI Assistant Launch Beacon */}
      {!isOpen && (
        <button
          className="ri-assistant-fab"
          onClick={() => setIsOpen(true)}
          aria-label="Open ResearchIntel Intelligence Copilot"
          title="Open ResearchIntel Intelligence Copilot"
        >
          <span className="fab-pulse" />
          <div className="fab-icon-wrap">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
            </svg>
          </div>
          <span className="fab-label">AI Copilot</span>
        </button>
      )}

      {/* 2. Slide-over Assistant Drawer / Modal */}
      {isOpen && (
        <div className={`ri-assistant-panel ${isExpanded ? 'expanded' : ''}`}>
          {/* Header */}
          <div className="ri-assistant-header">
            <div className="header-brand-wrap">
              <div className="header-ai-badge">
                <span className="beacon-dot" />
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div>
                <h3 className="header-title">ResearchIntel Intelligence Copilot</h3>
                <span className="header-subtitle">
                  <span className="header-status-indicator">●</span> Intelligence services connected
                </span>
              </div>
            </div>

            <div className="header-actions">
              <button
                className="header-btn"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Restore Size' : 'Maximize Panel'}
              >
                {isExpanded ? '❐' : '⤢'}
              </button>
              <button
                className="header-btn"
                onClick={clearChat}
                title="Clear Conversation / New Chat"
              >
                🗑️
              </button>
              <button
                className="header-btn close-btn"
                onClick={() => setIsOpen(false)}
                title="Close Assistant (Esc)"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div className="ri-assistant-body">
            {messages.map((m) => (
              <div key={m.id} className={`chat-message ${m.sender}`}>
                <div className="message-bubble">
                  {m.sender === 'assistant' && (
                    <div className="assistant-sender-tag">
                      <span><span className="ai-sparkle">✦</span> ResearchIntel Copilot</span>
                      {(m.confidence || m.evidence_coverage) && (
                        <div className="assistant-meta-badges">
                          {m.confidence && <span className="badge-confidence">Confidence: {m.confidence}</span>}
                          {m.evidence_coverage && <span className="badge-coverage">Coverage: {m.evidence_coverage}</span>}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="message-content">
                    {m.text.split('\n\n').map((para, pIdx) => {
                      if (para.startsWith('### ')) {
                        return <h4 key={pIdx} style={{ margin: '10px 0 6px', color: '#073b5c', fontSize: '13.5px', fontWeight: 800 }}>{para.replace('### ', '')}</h4>
                      }
                      if (para.startsWith('---')) {
                        return <hr key={pIdx} style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />
                      }
                      return (
                        <p key={pIdx} style={{ margin: '0 0 8px' }}>
                          {para.split('**').map((chunk, cIdx) =>
                            cIdx % 2 === 1 ? <strong key={cIdx}>{chunk}</strong> : chunk
                          )}
                        </p>
                      )
                    })}
                  </div>

                  {/* Collapsible Methodology Section */}
                  {m.generation_breakdown && (
                    <details className="methodology-accordion">
                      <summary className="methodology-summary">
                        <span>🔎 How this answer was generated</span>
                        <span>▾</span>
                      </summary>
                      <div className="methodology-content">
                        {m.generation_breakdown.pipeline && m.generation_breakdown.pipeline.map((step, sIdx) => (
                          <div key={sIdx} className="methodology-pipeline-step">
                            <span className="methodology-step-check">✓</span>
                            <span>{step}</span>
                          </div>
                        ))}
                        <div className="methodology-counts-grid">
                          <div className="methodology-count-item">
                            <strong>Research:</strong> {m.generation_breakdown.research_records || 0} records
                          </div>
                          <div className="methodology-count-item">
                            <strong>Grants:</strong> {m.generation_breakdown.funding_records || 0} records
                          </div>
                          <div className="methodology-count-item">
                            <strong>Patents:</strong> {m.generation_breakdown.patent_records || 0} records
                          </div>
                          <div className="methodology-count-item">
                            <strong>Technologies:</strong> {m.generation_breakdown.technology_records || 0} tracks
                          </div>
                        </div>
                      </div>
                    </details>
                  )}

                  {/* Empirical Evidence Sources Cards */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="message-sources-section">
                      <div className="sources-header">Verifiable Evidence &amp; References ({m.sources.length}):</div>
                      <div className="sources-grid">
                        {m.sources.map((src, sIdx) => (
                          <div
                            key={sIdx}
                            className="source-card"
                            onClick={() => src.route && navigate(src.route)}
                          >
                            <div className="source-card-top">
                              <span className={`source-category-tag ${src.category.toLowerCase()}`}>
                                {src.category}
                              </span>
                              {src.metric && <span className="source-metric">{src.metric}</span>}
                            </div>
                            <div className="source-title">{src.title}</div>
                            {src.subtitle && <div className="source-subtitle">{src.subtitle}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {m.actions && m.actions.length > 0 && (
                    <div className="message-actions-wrap">
                      {m.actions.map((act, aIdx) => (
                        <button
                          key={aIdx}
                          className="msg-action-btn"
                          onClick={() => handleActionClick(act)}
                        >
                          {act.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Suggestions Chips */}
                  {m.suggestions && m.suggestions.length > 0 && (
                    <div className="message-suggestions-wrap">
                      {m.suggestions.map((sug, sugIdx) => (
                        <button
                          key={sugIdx}
                          className="sug-chip"
                          onClick={() => handleSendMessage(sug)}
                        >
                          💬 {sug}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="message-timestamp">{m.timestamp}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-message assistant">
                <div className="message-bubble loading-bubble">
                  <div className="loading-header">
                    <div className="typing-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                    <span style={{ fontSize: '12px', color: '#073b5c', fontWeight: 700 }}>
                      Analyzing available ResearchIntel data...
                    </span>
                  </div>
                  <div className="loading-stages-list">
                    <div className="stage-item">
                      <span className="stage-check">✓</span> Understanding query &amp; context
                    </div>
                    {loadingStage >= 2 && (
                      <div className="stage-item">
                        <span className="stage-check">✓</span> Searching research &amp; funding registry
                      </div>
                    )}
                    {loadingStage >= 3 && (
                      <div className="stage-item">
                        <span className="stage-check">✓</span> Inspecting patent &amp; technology signals
                      </div>
                    )}
                    {loadingStage >= 4 && (
                      <div className="stage-item">
                        <span className="stage-spinner" /> Synthesizing multi-module intelligence
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Action Discovery Carousel */}
          <div className="ri-assistant-quick-prompts">
            <span className="quick-prompts-label">Quick Prompts:</span>
            <div className="quick-prompts-scroll">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.id}
                  className="quick-prompt-pill"
                  onClick={() => handleSendMessage(qa.prompt)}
                >
                  {qa.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Form Bar */}
          <div className="ri-assistant-footer">
            <div className="input-box-wrapper">
              <textarea
                ref={inputRef}
                className="assistant-input"
                placeholder="Ask about research, grants, patents, S-Curve, innovation scoring..."
                rows="1"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                className="assistant-send-btn"
                onClick={() => handleSendMessage()}
                disabled={loading || !inputMessage.trim()}
                title="Send query"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
