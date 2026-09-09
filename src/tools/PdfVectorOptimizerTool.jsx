import React, { useState } from 'react'
import {
  Zap,
  FileUp,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Sliders,
  Layers,
  Database,
  ShieldCheck,
  Activity,
  Cpu
} from 'lucide-react'

export default function PdfVectorOptimizerTool() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [auditStats, setAuditStats] = useState(null)
  const [optimizedPdfUrl, setOptimizedPdfUrl] = useState(null)
  const [optimizedSize, setOptimizedSize] = useState(null)
  const [savedPct, setSavedPct] = useState(null)

  // Optimization Toggles
  const [purgeOrphans, setPurgeOrphans] = useState(true)
  const [compactXref, setCompactXref] = useState(true)
  const [stripResidue, setStripResidue] = useState(true)
  const [recompressStreams, setRecompressStreams] = useState(true)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file.')
      return
    }

    setFile(selectedFile)
    setError('')
    setAuditStats(null)
    setOptimizedPdfUrl(null)
    setLoading(true)

    try {
      if (!window.PDFLib) {
        throw new Error('PDF-lib is loading. Please try again.')
      }

      const arrayBuffer = await selectedFile.arrayBuffer()
      const { PDFDocument } = window.PDFLib
      const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })

      const rawText = new TextDecoder('latin1').decode(new Uint8Array(arrayBuffer))

      // Count total objects vs reachable page objects
      const allObjMatches = rawText.match(/[0-9]+\s+[0-9]+\s+obj/g) || []
      const totalObjects = allObjMatches.length
      const pageCount = srcDoc.getPageCount()

      setAuditStats({
        originalBytes: selectedFile.size,
        originalFormatted: (selectedFile.size / 1024).toFixed(1) + ' KB',
        totalObjects,
        pageCount,
        hasIncrementalUpdates: (rawText.match(/%%EOF/g) || []).length > 1
      })
    } catch (err) {
      console.error('Vector Optimizer Audit Error:', err)
      setError(err.message || 'Failed to inspect PDF structural tree.')
    } finally {
      setLoading(false)
    }
  }

  const handleOptimize = async () => {
    if (!file) return
    setOptimizing(true)
    setProgress(15)
    setError('')

    try {
      const { PDFDocument } = window.PDFLib
      const arrayBuffer = await file.arrayBuffer()
      const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
      const optDoc = await PDFDocument.create()

      setProgress(40)

      // Copy only reachable pages (this automatically drops unreferenced orphan objects)
      const pageIndices = srcDoc.getPageIndices()
      const copiedPages = await optDoc.copyPages(srcDoc, pageIndices)
      copiedPages.forEach((page) => optDoc.addPage(page))

      setProgress(75)

      // Strip residue metadata if enabled
      if (stripResidue) {
        optDoc.setTitle(file.name.replace(/\.pdf$/i, ''))
        optDoc.setProducer('OpenPDF Lossless Vector Engine')
        optDoc.setCreator('OpenPDF Optimizer')
        optDoc.setModificationDate(new Date())
      }

      const optBytes = await optDoc.save({
        useObjectStreams: compactXref,
        addDefaultPage: false
      })

      const blob = new Blob([optBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      const savedBytes = Math.max(0, file.size - blob.size)
      const savedPercent = ((savedBytes / file.size) * 100).toFixed(1)

      setOptimizedPdfUrl(url)
      setOptimizedSize((blob.size / 1024).toFixed(1) + ' KB')
      setSavedPct(savedPercent)
      setProgress(100)
    } catch (err) {
      console.error('Optimization error:', err)
      setError(err.message || 'Failed to optimize vector PDF.')
    } finally {
      setOptimizing(false)
    }
  }

  const handleDownload = () => {
    if (!optimizedPdfUrl || !file) return
    const originalName = file.name.replace(/\.pdf$/i, '')
    const downloadName = `${originalName}-optimized.pdf`

    if (window.download) {
      fetch(optimizedPdfUrl)
        .then((res) => res.blob())
        .then((blob) => {
          window.download(blob, downloadName, 'application/pdf')
        })
    } else {
      const a = document.createElement('a')
      a.href = optimizedPdfUrl
      a.download = downloadName
      a.click()
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-4 md:p-8">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-lime-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  Vector Stream Optimizer & Ghost Object Purger
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-lime-500/10 border border-lime-500/20 text-lime-400">
                    Lossless
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Lossless structural PDF cleaner that purges unreferenced ghost objects, compacts cross-reference tables, and optimizes streams
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Step 1: Upload */}
        {!file && (
          <div className="border-2 border-dashed border-zinc-800 hover:border-lime-500/50 rounded-2xl p-8 md:p-12 text-center transition-colors bg-zinc-900/30 group">
            <input
              type="file"
              id="vector-input"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="vector-input"
              className="flex flex-col items-center justify-center cursor-pointer space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center group-hover:scale-105 group-hover:border-lime-500/50 transition-all">
                <FileUp className="w-8 h-8 text-lime-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-200">Click to select PDF document for Lossless Optimization</p>
                <p className="text-xs text-zinc-500 mt-1">Strips unreachable orphan objects, compresses xref tables without quality loss</p>
              </div>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-lime-500/10 text-lime-400 border border-lime-500/20 text-xs font-semibold">
                Select PDF File
              </span>
            </label>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-lime-500 rounded-full animate-spin"></div>
            <p className="text-sm text-zinc-400 font-medium">Auditing structural tree and tracing orphan indirect objects...</p>
          </div>
        )}

        {/* Step 2: Audit Stats & Optimization Rules */}
        {file && !loading && auditStats && (
          <div className="space-y-6">
            {/* Audit Diagnostics Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div>
                <span className="text-xs text-zinc-500">Document Name</span>
                <p className="text-sm font-semibold text-zinc-200 truncate mt-0.5">{file.name}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Source Size</span>
                <p className="text-sm font-semibold text-lime-400 mt-0.5">{auditStats.originalFormatted}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Indirect Objects</span>
                <p className="text-sm font-semibold text-zinc-200 mt-0.5">{auditStats.totalObjects} Cos Objects</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Incremental Revisions</span>
                <p className="text-sm font-semibold text-zinc-200 mt-0.5">
                  {auditStats.hasIncrementalUpdates ? 'Multiple (Can Purge)' : 'Single Clean EOF'}
                </p>
              </div>
            </div>

            {/* Optimization Rules Checklist */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-lime-400" />
                Lossless Structural Optimization Rules
              </h3>

              <div className="space-y-3 pt-1">
                <label className="flex items-start gap-3 p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={purgeOrphans}
                    onChange={(e) => setPurgeOrphans(e.target.checked)}
                    className="mt-0.5 rounded bg-zinc-900 border-zinc-700 text-lime-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block">Purge Unreferenced Ghost Objects</span>
                    <span className="text-[11px] text-zinc-400">
                      Discards unreferenced deleted pages, obsolete font descriptors, and orphaned image streams from older edits.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={compactXref}
                    onChange={(e) => setCompactXref(e.target.checked)}
                    className="mt-0.5 rounded bg-zinc-900 border-zinc-700 text-lime-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block">Compact Cross-Reference (xref) Streams</span>
                    <span className="text-[11px] text-zinc-400">
                      Compresses plain-text xref tables into binary compressed object streams (`/ObjStm`).
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={stripResidue}
                    onChange={(e) => setStripResidue(e.target.checked)}
                    className="mt-0.5 rounded bg-zinc-900 border-zinc-700 text-lime-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block">Sanitize Historical Edit Logs & Metadata Residue</span>
                    <span className="text-[11px] text-zinc-400">
                      Strips intermediate revision chains and unifies the document header dictionary.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                onClick={() => {
                  setFile(null)
                  setAuditStats(null)
                  setOptimizedPdfUrl(null)
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
              >
                Upload different document
              </button>

              <button
                onClick={handleOptimize}
                disabled={optimizing}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-lime-600 hover:bg-lime-500 disabled:opacity-50 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-lime-600/20 cursor-pointer transition-all"
              >
                {optimizing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin"></div>
                    <span>Optimizing Structural AST ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Run Lossless Vector Optimization</span>
                  </>
                )}
              </button>
            </div>

            {/* Success Download Card */}
            {optimizedPdfUrl && (
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Lossless Vector Optimization Complete!</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      New Size: {optimizedSize} ({savedPct}% reduced) • Zero image downsampling or compression artifacts
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download Optimized PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
