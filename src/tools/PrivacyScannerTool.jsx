import React, { useState, useRef } from 'react'
import { ShieldCheck, ShieldAlert, ShieldX, FileUp, RefreshCw, Eye, AlertTriangle, CheckCircle2, Copy, Check, Search, Layers, Lock } from 'lucide-react'

// PII Regex Patterns
const PII_PATTERNS = [
  {
    id: 'aadhaar',
    name: 'Aadhaar Number (India)',
    category: 'Government ID',
    severity: 'High',
    regex: /\b\d{4}\s\d{4}\s\d{4}\b/g,
    mask: (val) => val.slice(0, 4) + ' XXXX ' + val.slice(-4)
  },
  {
    id: 'pan',
    name: 'PAN Card (India)',
    category: 'Tax ID',
    severity: 'High',
    regex: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g,
    mask: (val) => val.slice(0, 2) + 'XXX' + val.slice(-2)
  },
  {
    id: 'credit_card',
    name: 'Credit / Debit Card',
    category: 'Financial',
    severity: 'Critical',
    regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    mask: (val) => 'XXXX-XXXX-XXXX-' + val.slice(-4)
  },
  {
    id: 'email',
    name: 'Email Address',
    category: 'Contact Info',
    severity: 'Medium',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    mask: (val) => {
      const [user, domain] = val.split('@')
      return user.slice(0, 2) + '***@' + domain
    }
  },
  {
    id: 'phone',
    name: 'Phone Number',
    category: 'Contact Info',
    severity: 'Medium',
    regex: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    mask: (val) => val.slice(0, 3) + ' XXX-' + val.slice(-4)
  },
  {
    id: 'ssn',
    name: 'Social Security Number (SSN)',
    category: 'Government ID',
    severity: 'Critical',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    mask: (val) => 'XXX-XX-' + val.slice(-4)
  },
  {
    id: 'gstin',
    name: 'GSTIN (India Tax)',
    category: 'Tax ID',
    severity: 'Medium',
    regex: /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}\b/g,
    mask: (val) => val.slice(0, 4) + 'XXXX' + val.slice(-4)
  }
]

export default function PrivacyScannerTool({ onNavigateToRedact }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.pdf')) {
      setError('Please select a valid PDF file.')
      return
    }

    setFile(selectedFile)
    setError(null)
    setLoading(true)
    setResults(null)

    try {
      const buffer = await selectedFile.arrayBuffer()
      const loadingTask = window.pdfjsLib.getDocument({ data: buffer })
      const doc = await loadingTask.promise

      const findings = []
      let totalMatches = 0

      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum)
        const textContent = await page.getTextContent()
        const fullPageText = textContent.items.map((i) => i.str).join(' ')

        PII_PATTERNS.forEach((pattern) => {
          const matches = fullPageText.match(pattern.regex) || []
          if (matches.length > 0) {
            // Deduplicate per page
            const uniqueMatches = [...new Set(matches)]
            uniqueMatches.forEach((match) => {
              totalMatches++
              findings.push({
                id: Math.random().toString(36).substring(2, 9),
                type: pattern.name,
                category: pattern.category,
                severity: pattern.severity,
                pageNum,
                raw: match,
                masked: pattern.mask(match)
              })
            })
          }
        })
      }

      // Compute Risk Score (0 - 100)
      let riskLevel = 'Low'
      let riskScore = 0

      if (totalMatches > 0) {
        const hasCritical = findings.some((f) => f.severity === 'Critical')
        const hasHigh = findings.some((f) => f.severity === 'High')

        if (hasCritical || findings.length >= 5) {
          riskLevel = 'Critical'
          riskScore = Math.min(100, 70 + findings.length * 5)
        } else if (hasHigh || findings.length >= 2) {
          riskLevel = 'Medium'
          riskScore = Math.min(69, 40 + findings.length * 10)
        } else {
          riskLevel = 'Low'
          riskScore = Math.min(39, 15 + findings.length * 10)
        }
      }

      setResults({
        totalPages: doc.numPages,
        totalMatches,
        riskLevel,
        riskScore,
        findings
      })
    } catch (err) {
      console.error('Scan failed:', err)
      setError('Privacy scan failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyReport = () => {
    if (!results) return
    const reportText = [
      `--- OPENPDF PRIVACY SCAN REPORT ---`,
      `File: ${file.name}`,
      `Total Pages: ${results.totalPages}`,
      `Risk Level: ${results.riskLevel} (${results.riskScore}/100)`,
      `Total PII Findings: ${results.totalMatches}`,
      `\nFINDINGS BREAKDOWN:`,
      ...results.findings.map(
        (f) => `• [Page ${f.pageNum}] ${f.type} (${f.severity}): ${f.masked}`
      )
    ].join('\n')

    navigator.clipboard.writeText(reportText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const reset = () => {
    setFile(null)
    setResults(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const getRiskColor = (level) => {
    switch (level) {
      case 'Critical':
        return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'Medium':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      default:
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-blue-500" />
            Privacy & PII Risk Scanner
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Scan documents client-side to detect Aadhaar, PAN, SSN, Credit Cards, and personal credentials.
          </p>
        </div>

        {file && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors w-fit"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Scan Another File
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <ShieldX className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-800 hover:border-blue-500/50 bg-zinc-900/40 hover:bg-zinc-900/80 rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform border border-blue-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Select a PDF for Privacy Audit</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            Deeply inspects text layers to locate and flag sensitive credentials before sharing.
          </p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <div className="w-12 h-12 border-4 border-zinc-700 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="text-center space-y-1">
            <h4 className="text-sm font-semibold text-white">Auditing Document Security...</h4>
            <p className="text-xs text-zinc-500">Checking for Aadhaar, PAN, Card Numbers, and Emails</p>
          </div>
        </div>
      ) : results ? (
        <div className="space-y-6">
          {/* Summary Scorecard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Risk Score */}
            <div className={`p-5 rounded-2xl border ${getRiskColor(results.riskLevel)} flex flex-col justify-between`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">Risk Level</span>
                {results.riskLevel === 'Low' ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : (
                  <ShieldAlert className="w-5 h-5" />
                )}
              </div>
              <div className="my-3">
                <div className="text-3xl font-extrabold">{results.riskLevel} Risk</div>
                <div className="text-xs opacity-75 mt-0.5">Security Score: {100 - results.riskScore}/100</div>
              </div>
              <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-current opacity-80 transition-all duration-300"
                  style={{ width: `${results.riskScore}%` }}
                ></div>
              </div>
            </div>

            {/* Findings Count */}
            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Findings</span>
              <div className="my-2">
                <div className="text-3xl font-extrabold text-white">{results.totalMatches}</div>
                <p className="text-xs text-zinc-500 mt-1">Sensitive data occurrences detected</p>
              </div>
              <div className="text-xs text-zinc-400 font-medium">Across {results.totalPages} pages audited</div>
            </div>

            {/* Quick Actions */}
            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Security Actions</span>
              <div className="space-y-2">
                <button
                  onClick={handleCopyReport}
                  className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-750 text-xs font-medium text-zinc-200 rounded-lg flex items-center justify-center gap-2 transition-colors border border-zinc-700"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Report Copied!' : 'Copy Audit Report'}</span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">All auditing was computed locally in RAM</p>
            </div>
          </div>

          {/* Detailed Findings Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Detected Credentials & PII Items ({results.findings.length})
              </h3>
              {results.findings.length === 0 && (
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Clean Document
                </span>
              )}
            </div>

            {results.findings.length === 0 ? (
              <div className="p-8 text-center bg-zinc-950/60 rounded-xl border border-zinc-800 text-zinc-400 text-sm space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="font-semibold text-zinc-200">No High-Risk PII Detected!</p>
                <p className="text-xs text-zinc-500">
                  No Aadhaar, PAN card, Credit Card, or SSN patterns were discovered in the text layer.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                {results.findings.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          item.severity === 'Critical'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : item.severity === 'High'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {item.severity}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-200 truncate">{item.type}</div>
                        <div className="text-zinc-500 text-[11px]">Category: {item.category}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-mono text-zinc-300 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">
                        {item.masked}
                      </span>
                      <span className="text-zinc-500 font-medium">Page {item.pageNum}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
