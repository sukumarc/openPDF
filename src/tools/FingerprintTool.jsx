import React, { useState, useRef } from 'react'
import { Fingerprint, Download, FileUp, RefreshCw, CheckCircle2, AlertCircle, Shield, Tag, Sparkles } from 'lucide-react'

export default function FingerprintTool() {
  const [file, setFile] = useState(null)
  const [recipient, setRecipient] = useState('')
  const [trackingId, setTrackingId] = useState('')
  const [mode, setMode] = useState('footer') // 'footer' | 'invisible' | 'both'
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const fileInputRef = useRef(null)

  // Generate random tracker ID on load
  const generateNewId = () => {
    return 'FP-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase()
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.pdf')) {
      setError('Please select a valid PDF file.')
      return
    }

    setFile(selectedFile)
    setError(null)
    setSuccess(false)
    setTrackingId(generateNewId())
  }

  const handleApplyFingerprint = async () => {
    if (!file || !recipient.trim()) {
      setError('Please specify a recipient or purpose identifier.')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const buffer = await file.arrayBuffer()
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const pages = pdfDoc.getPages()
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19)

      const fingerprintText = `CONFIDENTIAL • Prepared exclusively for ${recipient.trim()} • Ref: ${trackingId} • ${timestamp}`

      // Embed invisible metadata fingerprint
      pdfDoc.setKeywords([
        `fingerprint:${trackingId}`,
        `recipient:${recipient.trim()}`,
        `timestamp:${timestamp}`
      ])

      // If footer mode or both, stamp subtle micro-footer
      if (mode === 'footer' || mode === 'both') {
        pages.forEach((page) => {
          const { width } = page.getSize()
          page.drawText(fingerprintText, {
            x: 25,
            y: 12,
            size: 6.5,
            font,
            color: rgb(0.55, 0.55, 0.6)
          })
        })
      }

      const pdfBytes = await pdfDoc.save()
      if (window.download) {
        window.download(pdfBytes, `${file.name.replace(/\.pdf$/i, '')}_fingerprinted.pdf`, 'application/pdf')
      }
      setSuccess(true)
    } catch (err) {
      console.error('Fingerprinting failed:', err)
      setError('Failed to apply fingerprint: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const reset = () => {
    setFile(null)
    setRecipient('')
    setTrackingId('')
    setError(null)
    setSuccess(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Fingerprint className="w-6 h-6 text-blue-500" />
            Document Fingerprinting & Leak Tracker
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Embed unique recipient tracking serials and metadata markers to track and trace confidential document leaks.
          </p>
        </div>

        {file && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors w-fit"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Upload Another
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Document successfully fingerprinted and downloaded!</span>
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
            <Fingerprint className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Select a PDF to Fingerprint</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            Embed unique identification serials to identify which recipient leaked a sensitive file.
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-zinc-800 pb-4">
            <h3 className="text-base font-semibold text-white">{file.name}</h3>
            <p className="text-xs text-zinc-500">Size: {(file.size / 1024).toFixed(1)} KB</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Recipient Name / Organization</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. John Doe (Acme Corp)"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-zinc-300">Tracking Reference Serial</label>
                <button
                  type="button"
                  onClick={() => setTrackingId(generateNewId())}
                  className="text-blue-400 hover:text-blue-300 text-[11px]"
                >
                  Regenerate
                </button>
              </div>
              <input
                type="text"
                value={trackingId}
                readOnly
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-400 font-mono select-all"
              />
            </div>
          </div>

          {/* Stamping Mode */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300">Stamping Style</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'footer', label: 'Micro Footer', desc: 'Faint 6pt line at bottom of each page' },
                { id: 'invisible', label: 'Invisible Meta', desc: 'Hidden within PDF byte stream' },
                { id: 'both', label: 'Both (Recommended)', desc: 'Micro footer + metadata tag' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`p-3 text-left rounded-xl border transition-all ${
                    mode === m.id
                      ? 'bg-blue-600/10 border-blue-500/50 text-white'
                      : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-semibold text-zinc-200 mb-0.5">{m.label}</div>
                  <div className="text-[10px] text-zinc-500 leading-tight">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleApplyFingerprint}
            disabled={processing || !recipient.trim()}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Embedding Fingerprint...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Stamp Fingerprint & Download PDF</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
