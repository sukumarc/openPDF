import React, { useState, useRef } from 'react'
import { FileSearch, Download, FileUp, RefreshCw, Trash2, CheckCircle2, AlertCircle, ShieldCheck, Tag, Info } from 'lucide-react'

export default function MetadataEditorTool() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Metadata State
  const [metadata, setMetadata] = useState({
    title: '',
    author: '',
    subject: '',
    keywords: '',
    creator: '',
    producer: '',
    creationDate: '',
    modificationDate: ''
  })

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
    setSuccess(false)
    setLoading(true)

    try {
      const buffer = await selectedFile.arrayBuffer()
      const { PDFDocument } = window.PDFLib
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })

      setMetadata({
        title: pdfDoc.getTitle() || '',
        author: pdfDoc.getAuthor() || '',
        subject: pdfDoc.getSubject() || '',
        keywords: (pdfDoc.getKeywords() || '').toString(),
        creator: pdfDoc.getCreator() || '',
        producer: pdfDoc.getProducer() || '',
        creationDate: pdfDoc.getCreationDate() ? pdfDoc.getCreationDate().toISOString() : '',
        modificationDate: pdfDoc.getModificationDate() ? pdfDoc.getModificationDate().toISOString() : ''
      })
    } catch (err) {
      console.error('Failed to read metadata:', err)
      setError('Failed to parse PDF metadata: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Save modified metadata
  const handleSaveMetadata = async () => {
    if (!file) return
    setSaving(true)
    setError(null)

    try {
      const buffer = await file.arrayBuffer()
      const { PDFDocument } = window.PDFLib
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })

      pdfDoc.setTitle(metadata.title)
      pdfDoc.setAuthor(metadata.author)
      pdfDoc.setSubject(metadata.subject)
      pdfDoc.setKeywords(metadata.keywords ? metadata.keywords.split(',').map((k) => k.trim()) : [])
      pdfDoc.setCreator(metadata.creator)
      pdfDoc.setProducer(metadata.producer)

      const pdfBytes = await pdfDoc.save()
      if (window.download) {
        window.download(pdfBytes, `${file.name.replace(/\.pdf$/i, '')}_updated.pdf`, 'application/pdf')
      }
      setSuccess(true)
    } catch (err) {
      console.error('Save failed:', err)
      setError('Failed to save metadata: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Strip all metadata (Sanitize)
  const handleStripAllMetadata = async () => {
    if (!file) return
    setSaving(true)
    setError(null)

    try {
      const buffer = await file.arrayBuffer()
      const { PDFDocument } = window.PDFLib
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })

      // Clear all standard fields
      pdfDoc.setTitle('')
      pdfDoc.setAuthor('')
      pdfDoc.setSubject('')
      pdfDoc.setKeywords([])
      pdfDoc.setCreator('')
      pdfDoc.setProducer('')

      // Update state
      setMetadata({
        title: '',
        author: '',
        subject: '',
        keywords: '',
        creator: '',
        producer: '',
        creationDate: '',
        modificationDate: ''
      })

      const pdfBytes = await pdfDoc.save()
      if (window.download) {
        window.download(pdfBytes, `${file.name.replace(/\.pdf$/i, '')}_sanitized.pdf`, 'application/pdf')
      }
      setSuccess(true)
    } catch (err) {
      console.error('Sanitization failed:', err)
      setError('Failed to sanitize metadata: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setFile(null)
    setError(null)
    setSuccess(false)
    setMetadata({
      title: '',
      author: '',
      subject: '',
      keywords: '',
      creator: '',
      producer: '',
      creationDate: '',
      modificationDate: ''
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-blue-500" />
            PDF Metadata Editor & Stripper
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            View, edit, or sanitize metadata footprints (Author, Creation Tool, Tracking Tags) from PDF files.
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
          <span>PDF metadata updated and saved successfully!</span>
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
            <FileUp className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Select a PDF to Inspect Metadata</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            Inspect hidden author names, creation software, and tracking tags stored inside the PDF header.
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-base font-semibold text-white">{file.name}</h3>
              <p className="text-xs text-zinc-500">Size: {(file.size / 1024).toFixed(1)} KB</p>
            </div>

            <button
              onClick={handleStripAllMetadata}
              disabled={saving}
              className="flex items-center gap-2 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Strip All Metadata (Sanitize)</span>
            </button>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Document Title</label>
              <input
                type="text"
                value={metadata.title}
                onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                placeholder="e.g. Annual Financial Report"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Author</label>
              <input
                type="text"
                value={metadata.author}
                onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
                placeholder="e.g. John Doe"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Subject</label>
              <input
                type="text"
                value={metadata.subject}
                onChange={(e) => setMetadata({ ...metadata, subject: e.target.value })}
                placeholder="e.g. Quarterly Earnings"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Keywords (Comma-separated)</label>
              <input
                type="text"
                value={metadata.keywords}
                onChange={(e) => setMetadata({ ...metadata, keywords: e.target.value })}
                placeholder="e.g. finance, 2026, taxes"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Creator Application</label>
              <input
                type="text"
                value={metadata.creator}
                onChange={(e) => setMetadata({ ...metadata, creator: e.target.value })}
                placeholder="e.g. Microsoft Word / OpenPDF"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">PDF Producer Engine</label>
              <input
                type="text"
                value={metadata.producer}
                onChange={(e) => setMetadata({ ...metadata, producer: e.target.value })}
                placeholder="e.g. pdf-lib / Ghostscript"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Timestamps (Read-only reference) */}
          {(metadata.creationDate || metadata.modificationDate) && (
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-xs text-zinc-500 flex flex-wrap gap-6">
              {metadata.creationDate && <div>Created: <span className="text-zinc-400">{metadata.creationDate}</span></div>}
              {metadata.modificationDate && <div>Modified: <span className="text-zinc-400">{metadata.modificationDate}</span></div>}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleSaveMetadata}
            disabled={saving}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Metadata...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Save & Download Updated PDF</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
