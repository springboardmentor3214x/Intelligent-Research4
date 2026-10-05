import { useState } from 'react'
import './ReportDownloadPanel.css'

const REPORT_TYPES = [
  {
    value: 'funding',
    label: 'Funding Report',
    description: 'Funding opportunities and eligibility information.',
  },
  {
    value: 'patents',
    label: 'Patent Report',
    description: 'Patent activity, assignees and technology insights.',
  },
  {
    value: 'research-trends',
    label: 'Research Trend Report',
    description: 'Research activity and emerging research trends.',
  },
  {
    value: 'innovation',
    label: 'Innovation Intelligence',
    description: 'Technology, patents, research and innovation scoring.',
  },
  {
    value: 'commercialization',
    label: 'Commercialization Report',
    description: 'Productization, licensing and startup opportunities.',
  },
]

export default function ReportDownloadPanel() {
  const [reportType, setReportType] = useState('funding')
  const [technology, setTechnology] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const buildPayload = () => ({
    report_type: reportType,
    technology: technology.trim() || undefined,
  })

  const downloadFile = async (format) => {
    try {
      setLoading(true)
      setMessage('')
      setError('')

      const payload = buildPayload()

      const response = await fetch(
        `/reports/export/${format}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        throw new Error(
          `Report export failed: ${response.status}`
        )
      }

      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url

      const extension = format === 'pdf' ? 'pdf' : 'xlsx'

      link.download = `${reportType}-report.${extension}`

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.URL.revokeObjectURL(url)

      setMessage(
        `${format.toUpperCase()} report downloaded successfully.`
      )
    } catch (err) {
      console.error('Report download error:', err)
      setError(
        'Unable to download the report. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="report-download-panel">
      <div className="report-panel-header">
        <div>
          <span className="report-eyebrow">
            REPORTS & EXPORT
          </span>

          <h2>Generate Report</h2>

          <p>
            Select a report type and download the generated report.
          </p>
        </div>
      </div>

      <div className="report-form">
        <div className="report-field">
          <label htmlFor="report-type">
            Report Type
          </label>

          <select
            id="report-type"
            value={reportType}
            onChange={(event) =>
              setReportType(event.target.value)
            }
          >
            {REPORT_TYPES.map((report) => (
              <option
                key={report.value}
                value={report.value}
              >
                {report.label}
              </option>
            ))}
          </select>

          <small>
            {
              REPORT_TYPES.find(
                (item) => item.value === reportType
              )?.description
            }
          </small>
        </div>

        <div className="report-field">
          <label htmlFor="technology">
            Technology / Domain
          </label>

          <input
            id="technology"
            type="text"
            value={technology}
            onChange={(event) =>
              setTechnology(event.target.value)
            }
            placeholder="Example: Generative AI"
          />
        </div>
      </div>

      <div className="report-actions">
        <button
          type="button"
          className="download-button pdf"
          disabled={loading}
          onClick={() => downloadFile('pdf')}
        >
          {loading ? 'Generating...' : 'Download PDF'}
        </button>

        <button
          type="button"
          className="download-button excel"
          disabled={loading}
          onClick={() => downloadFile('excel')}
        >
          {loading ? 'Generating...' : 'Export Excel'}
        </button>
      </div>

      {message && (
        <div className="report-success">
          {message}
        </div>
      )}

      {error && (
        <div className="report-error">
          {error}
        </div>
      )}
    </div>
  )
}