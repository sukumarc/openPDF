import React, { useState, useRef, useEffect } from 'react'
import {
  ScanText,
  Download,
  FileUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Languages,
  Copy,
  FileText,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

export default function OcrPdfTool() {
  const [file, setFile] = useState(null)
  const [fileBuffer, setFileBuffer] = useState(null)
  const [pdfDocProxy, setPdfDocProxy] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  // OCR Configuration
  const [language, setLanguage] = useState('eng')
  const [pageRange, setPageRange] = useState('all') // 'all' | 'current' | 'first3'

  // Processing state
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStatus, setCurrentStatus] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // OCR Results
  const [extractedPages, setExtractedPages] = useState([]) // Array of { pageNum, text, confidence, words: [] }
  const [downloadBlob, setDownloadBlob] = useState(null)
  const [copied, setCopied] = useState(false)

  const pdfCanvasRef = useRef(null)
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF document.')
      return
    }

    setFile(selectedFile)
    setError(null)
    setSuccess(false)
    setExtractedPages([])
    setDownloadBlob(null)

    try {
      const buffer = await selectedFile.arrayBuffer()
      setFileBuffer(buffer)

      if (!window.pdfjsLib) throw new Error('PDF.js library not ready.')
      const doc = await window.pdfjsLib.getDocument({ data: buffer.slice(0) }).promise
      setPdfDocProxy(doc)
      setPageCount(doc.numPages)
      setCurrentPage(1)
    } catch (err) {
      console.error('Failed to parse PDF:', err)
      setError('Failed to inspect PDF: ' + err.message)
    }
  }

  // Render current preview page
  useEffect(() => {
    if (!pdfDocProxy || !pdfCanvasRef.current) return

    let isCancelled = false
    const renderPreview = async () => {
      try {
        const page = await pdfDocProxy.getPage(currentPage)
        const viewport = page.getViewport({ scale: 1.2 })

        const canvas = pdfCanvasRef.current
        if (!canvas) return
        canvas.width = viewport.width
        canvas.height = viewport.height

        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        await page.render({ canvasContext: ctx, viewport }).promise
      } catch (err) {
        if (!isCancelled) console.error('Preview error:', err)
      }
    }

    renderPreview()
    return () => {
      isCancelled = true
    }
  }, [pdfDocProxy, currentPage])

  // Run On-Device WebAssembly OCR
  const handleRunOcr = async () => {
    if (!file || !fileBuffer || !pdfDocProxy) return

    setProcessing(true)
    setProgress(0)
    setError(null)
    setExtractedPages([])

    try {
      if (!window.Tesseract) {
        throw new Error('Tesseract OCR engine is loading. Please wait 2 seconds and try again.')
      }

      setCurrentStatus('Initializing WebAssembly OCR Worker...')
      const worker = await window.Tesseract.createWorker(language)

      const pagesToProcess = []
      if (pageRange === 'all') {
        for (let i = 1; i <= pageCount; i++) pagesToProcess.push(i)
      } else if (pageRange === 'current') {
        pagesToProcess.push(currentPage)
      } else if (pageRange === 'first3') {
        for (let i = 1; i <= Math.min(3, pageCount); i++) pagesToProcess.push(i)
      }

      const total = pagesToProcess.length
      const results = []

      // Create a searchable PDF document
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib || (await import('pdf-lib'))
      const searchableDoc = await PDFDocument.create()
      const font = await searchableDoc.embedFont(StandardFonts.Helvetica)

      for (let idx = 0; idx < total; idx++) {
        const pNum = pagesToProcess[idx]
        setCurrentStatus(`Rendering Page ${pNum} (${idx + 1}/${total})...`)
        setProgress(Math.round(((idx + 0.2) / total) * 100))

        const page = await pdfDocProxy.getPage(pNum)
        const viewport = page.getViewport({ scale: 2.0 }) // 2x high-DPI for crisp OCR

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')

        await page.render({ canvasContext: ctx, viewport }).promise

        setCurrentStatus(`Running Optical Character Recognition on Page ${pNum}...`)
        const { data } = await worker.recognize(canvas)

        const pageResult = {
          pageNum: pNum,
          text: data.text || '',
          confidence: Math.round(data.confidence || 0),
          words: (data.words || []).map((w) => ({
            text: w.text,
            bbox: w.bbox,
            confidence: w.confidence
          }))
        }
        results.push(pageResult)

        // Embed page image into searchable PDF
        const imgDataUrl = canvas.toDataURL('image/jpeg', 0.92)
        const imgBytes = await fetch(imgDataUrl).then((r) => r.arrayBuffer())
        const embeddedImg = await searchableDoc.embedJpg(imgBytes)

        const pdfPage = searchableDoc.addPage([viewport.width / 2, viewport.height / 2])
        pdfPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: viewport.width / 2,
          height: viewport.height / 2
        })

        // Draw invisible selectable text layer on top
        if (data.words && data.words.length > 0) {
          data.words.forEach((w) => {
            if (!w.text || !w.bbox) return
            const x = w.bbox.x0 / 2
            const y = (viewport.height - w.bbox.y1) / 2
            const wordWidth = (w.bbox.x1 - w.bbox.x0) / 2
            const fontSize = Math.max(6, (w.bbox.y1 - w.bbox.y0) / 2)

            try {
              pdfPage.drawText(w.text, {
                x,
                y,
                size: fontSize,
                font,
                color: rgb(0, 0, 0),
                opacity: 0 // Invisible text layer allows natural highlighting & Ctrl+F search
              })
            } catch (e) {
              // Ignore unsupported glyphs in font
            }
          })
        }

        setProgress(Math.round(((idx + 1) / total) * 100))
      }

      await worker.terminate()

      setExtractedPages(results)
      const outputBytes = await searchableDoc.save()
      const blob = new Blob([outputBytes], { type: 'application/pdf' })
      setDownloadBlob(blob)
      setSuccess(true)

      const outputFilename = `${file.name.replace(/\.pdf$/i, '')}_searchable_ocr.pdf`
      if (window.download) {
        window.download(outputBytes, outputFilename, 'application/pdf')
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = outputFilename
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('OCR failed:', err)
      setError('OCR Processing failed: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  // Copy full transcript text
  const handleCopyText = () => {
    const fullText = extractedPages
      .map((p) => `--- PAGE ${p.pageNum} (Confidence: ${p.confidence}%) ---\n${p.text}`)
      .join('\n\n')
    navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Download raw .txt
  const handleDownloadTxt = () => {
    const fullText = extractedPages
      .map((p) => `--- PAGE ${p.pageNum} (Confidence: ${p.confidence}%) ---\n${p.text}`)
      .join('\n\n')
    const blob = new Blob([fullText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${file.name.replace(/\.pdf$/i, '')}_ocr_transcript.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    setFile(null)
    setFileBuffer(null)
    setPdfDocProxy(null)
    setExtractedPages([])
    setDownloadBlob(null)
    setError(null)
    setSuccess(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ScanText className="w-6 h-6 text-violet-500" />
            OCR PDF (Optical Character Recognition)
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Convert scanned documents into searchable, selectable text PDFs with on-device WebAssembly AI.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% On-Device WASM
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Action Failed</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {success && (
        <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-emerald-400">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-semibold text-white">Searchable PDF Generated & Downloaded</p>
              <p className="text-xs text-emerald-300 mt-0.5">
                Recognized text has been embedded as an invisible selectable layer on top of page images.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold rounded-lg transition-colors"
            >
              <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy Text'}
            </button>
            <button
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> Download .TXT
            </button>
          </div>
        </div>
      )}

      {/* Upload Zone */}
      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-800 hover:border-violet-500/50 bg-zinc-900/30 hover:bg-zinc-900/60 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group text-center"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 group-hover:bg-violet-500/10 flex items-center justify-center mb-4 transition-colors">
            <FileUp className="w-8 h-8 text-zinc-400 group-hover:text-violet-400 transition-colors" />
          </div>
          <h3 className="text-base font-semibold text-zinc-200 group-hover:text-white">
            Select a scanned PDF for OCR
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Drag and drop or browse from your computer (never uploaded)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: OCR Configuration & Extracted Transcript */}
          <div className="lg:col-span-6 space-y-5">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
              {/* Language selection */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-semibold flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-violet-400" />
                  Recognition Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
                >
                  <option value="eng">English (Latin script, Numbers & Symbols)</option>
                  <option value="spa">Spanish (Español)</option>
                  <option value="fra">French (Français)</option>
                  <option value="deu">German (Deutsch)</option>
                </select>
              </div>

              {/* Page Range Selection */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-semibold">Page Scope</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: `All (${pageCount} pgs)` },
                    { id: 'current', label: `Current (Pg ${currentPage})` },
                    { id: 'first3', label: 'First 3 Pages' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setPageRange(item.id)}
                      className={`p-2 rounded-xl border text-xs text-center font-medium transition-colors ${
                        pageRange === item.id
                          ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Processing Progress */}
              {processing && (
                <div className="pt-2 border-t border-zinc-800 space-y-2">
                  <div className="flex justify-between text-xs text-zinc-300">
                    <span className="truncate pr-2">{currentStatus}</span>
                    <span className="font-semibold text-violet-400">{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {/* Extracted Text Preview if available */}
              {extractedPages.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">Recognized Text Output:</span>
                    <span className="text-[11px] text-zinc-500">
                      Avg Confidence: {Math.round(extractedPages.reduce((acc, p) => acc + p.confidence, 0) / extractedPages.length)}%
                    </span>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-200 font-mono max-h-[220px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {extractedPages.map((p) => p.text).join('\n\n')}
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="px-4 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRunOcr}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-violet-600/20"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Processing OCR...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Run On-Device OCR & Export
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: PDF Preview */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 px-4 py-2.5 rounded-xl text-xs">
              <span className="text-zinc-400">
                Source Document: Page <span className="text-white font-semibold">{currentPage}</span> of {pageCount}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage >= pageCount}
                  onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 overflow-hidden flex justify-center items-center shadow-inner min-h-[500px]">
              <canvas ref={pdfCanvasRef} className="max-w-full max-h-[600px] object-contain shadow-2xl rounded" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
