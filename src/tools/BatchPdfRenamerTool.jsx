import React, { useState } from 'react'
import {
  FileText,
  FileUp,
  Download,
  CheckCircle2,
  AlertCircle,
  FolderArchive,
  Sparkles,
  Sliders,
  RefreshCw,
  Trash2,
  ArrowRight,
  FolderOpen,
  Tag,
  Check
} from 'lucide-react'

export default function BatchPdfRenamerTool() {
  const [files, setFiles] = useState([])
  const [renamedList, setRenamedList] = useState([])
  const [loading, setLoading] = useState(false)
  const [packaging, setPackaging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  // Naming Pattern Template
  const [patternPreset, setPatternPreset] = useState('date_original')
  const [customPattern, setCustomPattern] = useState('{Date}_{OriginalName}')
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')

  const handleFilesSelected = async (e) => {
    const selectedFiles = Array.from(e.target.files || []).filter((f) =>
      f.name.toLowerCase().endsWith('.pdf')
    )

    if (selectedFiles.length === 0) {
      setError('Please select one or more PDF files.')
      return
    }

    setFiles(selectedFiles)
    setError('')
    setLoading(true)

    try {
      if (!window.pdfjsLib) {
        throw new Error('PDF.js library is loading. Please try again.')
      }

      const analyzed = []

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const arrayBuffer = await file.arrayBuffer()
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer })
        const doc = await loadingTask.promise

        const meta = await doc.getMetadata().catch(() => ({}))
        const firstPage = await doc.getPage(1)
        const textContent = await firstPage.getTextContent()

        const fullText = textContent.items.map((it) => it.str).join(' ')

        // 1. Extract Invoice Number
        const invoiceMatch = fullText.match(
          /(?:invoice\s*(?:#|no\.?|number)?\s*[:\-]?\s*([A-Z0-9\-]+))/i
        )
        const invoiceNo = invoiceMatch ? invoiceMatch[1].trim() : `INV-${i + 1}`

        // 2. Extract Date (YYYY-MM-DD or MM/DD/YYYY or Month DD, YYYY)
        const dateMatch =
          fullText.match(/\b(20\d{2}[-\/.](?:0[1-9]|1[0-2])[-\/.](?:0[1-9]|[12]\d|3[01]))\b/) ||
          fullText.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+20\d{2})\b/i)
        const extractedDate = dateMatch
          ? dateMatch[1].replace(/[\/,\s]+/g, '-')
          : new Date().toISOString().split('T')[0]

        // 3. Extract Title
        const docTitle =
          meta?.info?.Title?.trim() ||
          textContent.items.find((it) => it.str.trim().length > 5)?.str.trim() ||
          file.name.replace(/\.pdf$/i, '')

        // 4. Extract Author
        const author = meta?.info?.Author?.trim() || 'Author'

        analyzed.push({
          file,
          originalName: file.name,
          cleanOriginalName: file.name.replace(/\.pdf$/i, ''),
          size: (file.size / 1024).toFixed(1) + ' KB',
          invoiceNo,
          extractedDate,
          docTitle: docTitle.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30),
          author: author.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 20),
          index: String(i + 1).padStart(2, '0'),
          customName: ''
        })
      }

      setRenamedList(analyzed)
    } catch (err) {
      console.error('Batch analysis error:', err)
      setError(err.message || 'Failed to inspect PDF metadata.')
    } finally {
      setLoading(false)
    }
  }

  // Calculate new filename for an item based on pattern
  const computeFilename = (item, idx) => {
    if (item.customName && item.customName.trim()) {
      return item.customName.endsWith('.pdf') ? item.customName : `${item.customName}.pdf`
    }

    let pattern = customPattern

    if (patternPreset === 'date_original') {
      pattern = '{Date}_{OriginalName}'
    } else if (patternPreset === 'invoice_date') {
      pattern = 'Invoice_{InvoiceNo}_{Date}'
    } else if (patternPreset === 'author_title') {
      pattern = '{Author}_{Title}'
    } else if (patternPreset === 'index_name') {
      pattern = 'Doc_{Index}_{OriginalName}'
    }

    let res = pattern
      .replace(/{Date}/gi, item.extractedDate)
      .replace(/{OriginalName}/gi, item.cleanOriginalName)
      .replace(/{InvoiceNo}/gi, item.invoiceNo)
      .replace(/{Title}/gi, item.docTitle)
      .replace(/{Author}/gi, item.author)
      .replace(/{Index}/gi, item.index)

    if (prefix) res = `${prefix}_${res}`
    if (suffix) res = `${res}_${suffix}`

    // Sanitize
    res = res.replace(/[^a-zA-Z0-9._-]/g, '_')
    return res.endsWith('.pdf') ? res : `${res}.pdf`
  }

  // Rename and download as ZIP
  const handleDownloadAllAsZip = async () => {
    if (renamedList.length === 0) return
    setPackaging(true)
    setProgress(15)
    setError('')

    try {
      if (!window.JSZip) {
        throw new Error('JSZip library is loading. Please try again.')
      }

      const zip = new window.JSZip()
      const step = 80 / renamedList.length

      for (let i = 0; i < renamedList.length; i++) {
        const item = renamedList[i]
        const targetFilename = computeFilename(item, i)
        const fileBytes = await item.file.arrayBuffer()

        zip.file(targetFilename, fileBytes)
        setProgress(Math.round(15 + (i + 1) * step))
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const fileName = `Renamed-PDFs-Batch-${Date.now()}.zip`

      if (window.download) {
        window.download(zipBlob, fileName, 'application/zip')
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(zipBlob)
        a.download = fileName
        a.click()
      }

      setProgress(100)
    } catch (err) {
      console.error('ZIP Packaging Error:', err)
      setError(err.message || 'Failed to generate renamed ZIP archive.')
    } finally {
      setPackaging(false)
    }
  }

  const handleManualNameEdit = (idx, val) => {
    setRenamedList((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], customName: val }
      return next
    })
  }

  const handleRemoveItem = (idx) => {
    setRenamedList((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Tag className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  Smart Batch Renamer by Content
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    Bulk Automator
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Batch analyze multiple PDF documents, extract dynamic fields (Invoices, Dates, Titles), and rename into a organized ZIP
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

        {/* Step 1: Upload Multiple Files */}
        {renamedList.length === 0 && !loading && (
          <div className="border-2 border-dashed border-zinc-800 hover:border-amber-500/50 rounded-2xl p-8 md:p-12 text-center transition-colors bg-zinc-900/30 group">
            <input
              type="file"
              id="batch-input"
              multiple
              accept=".pdf"
              onChange={handleFilesSelected}
              className="hidden"
            />
            <label
              htmlFor="batch-input"
              className="flex flex-col items-center justify-center cursor-pointer space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center group-hover:scale-105 group-hover:border-amber-500/50 transition-all">
                <FolderOpen className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-200">Click to select multiple PDF files in bulk</p>
                <p className="text-xs text-zinc-500 mt-1">Select dozens of invoices, statements, or documents simultaneously</p>
              </div>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                Select Multiple PDFs
              </span>
            </label>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-amber-500 rounded-full animate-spin"></div>
            <p className="text-sm text-zinc-400 font-medium">Extracting metadata and dynamic text tags from files...</p>
          </div>
        )}

        {/* Step 2: Naming Pattern Builder & Batch Table */}
        {renamedList.length > 0 && !loading && (
          <div className="space-y-6">
            {/* Pattern Settings Box */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  Dynamic Renaming Pattern
                </h3>
                <span className="text-xs text-zinc-500 font-mono">{renamedList.length} Files Loaded</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Pattern Preset */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Naming Template</label>
                  <select
                    value={patternPreset}
                    onChange={(e) => setPatternPreset(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="date_original">Date + Original Name</option>
                    <option value="invoice_date">Invoice # + Date</option>
                    <option value="author_title">Author + Title</option>
                    <option value="index_name">Index (01, 02) + Name</option>
                    <option value="custom">Custom Tag Template</option>
                  </select>
                </div>

                {/* Custom Template Input */}
                {patternPreset === 'custom' && (
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Custom Template Tags</label>
                    <input
                      type="text"
                      value={customPattern}
                      onChange={(e) => setCustomPattern(e.target.value)}
                      placeholder="{Date}_{Title}_{Index}"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                {/* Prefix */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Optional Prefix</label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="e.g. Q3_2026"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Suffix */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Optional Suffix</label>
                  <input
                    type="text"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    placeholder="e.g. Verified"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-zinc-500">
                <span>Available dynamic tags:</span>
                <span className="font-mono bg-zinc-950 px-1.5 py-0.5 rounded text-amber-400 border border-zinc-800">
                  {'{Date}'}
                </span>
                <span className="font-mono bg-zinc-950 px-1.5 py-0.5 rounded text-amber-400 border border-zinc-800">
                  {'{OriginalName}'}
                </span>
                <span className="font-mono bg-zinc-950 px-1.5 py-0.5 rounded text-amber-400 border border-zinc-800">
                  {'{InvoiceNo}'}
                </span>
                <span className="font-mono bg-zinc-950 px-1.5 py-0.5 rounded text-amber-400 border border-zinc-800">
                  {'{Title}'}
                </span>
                <span className="font-mono bg-zinc-950 px-1.5 py-0.5 rounded text-amber-400 border border-zinc-800">
                  {'{Author}'}
                </span>
                <span className="font-mono bg-zinc-950 px-1.5 py-0.5 rounded text-amber-400 border border-zinc-800">
                  {'{Index}'}
                </span>
              </div>
            </div>

            {/* Batch Renamed Preview Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
              <div className="bg-zinc-950/80 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-zinc-200">
                    Renamed File List ({renamedList.length} Files)
                  </span>
                </div>

                <button
                  onClick={() => setRenamedList([])}
                  className="text-xs text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              <div className="max-h-80 overflow-auto divide-y divide-zinc-800/60">
                {renamedList.map((item, idx) => {
                  const targetName = computeFilename(item, idx)
                  return (
                    <div
                      key={idx}
                      className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs hover:bg-zinc-850/50 transition-colors"
                    >
                      {/* Left: Original Info */}
                      <div className="space-y-1 min-w-[240px]">
                        <p className="font-mono text-zinc-400 truncate">{item.originalName}</p>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                          <span>{item.size}</span>
                          <span>•</span>
                          <span>Extracted: {item.extractedDate}</span>
                        </div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-zinc-600 hidden md:block shrink-0" />

                      {/* Right: New Name Editor */}
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={item.customName || targetName}
                          onChange={(e) => handleManualNameEdit(idx, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                        />

                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-zinc-600 hover:text-red-400 rounded transition-colors"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                onClick={() => {
                  setFiles([])
                  setRenamedList([])
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
              >
                Upload different files
              </button>

              <button
                onClick={handleDownloadAllAsZip}
                disabled={packaging || renamedList.length === 0}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 cursor-pointer transition-all"
              >
                {packaging ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Packaging Renamed ZIP ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <FolderArchive className="w-4 h-4" />
                    <span>Download All Renamed Files (.ZIP)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
