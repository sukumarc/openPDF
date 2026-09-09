import React, { useState, useRef, useEffect } from 'react'
import {
  Moon,
  Sun,
  Download,
  FileUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Sparkles
} from 'lucide-react'

export default function InvertColorsTool() {
  const [file, setFile] = useState(null)
  const [fileBuffer, setFileBuffer] = useState(null)
  const [pdfDocProxy, setPdfDocProxy] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  // Color Theme: 'invert' | 'sepia' | 'slate' | 'monochrome'
  const [theme, setTheme] = useState('invert')
  const [contrast, setContrast] = useState(1.1)
  const [brightness, setBrightness] = useState(1.0)

  // Processing state
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const pdfCanvasRef = useRef(null)
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF file.')
      return
    }

    setFile(selectedFile)
    setError(null)
    setSuccess(false)

    try {
      const buffer = await selectedFile.arrayBuffer()
      setFileBuffer(buffer)

      if (!window.pdfjsLib) throw new Error('PDF library not ready.')
      const doc = await window.pdfjsLib.getDocument({ data: buffer.slice(0) }).promise
      setPdfDocProxy(doc)
      setPageCount(doc.numPages)
      setCurrentPage(1)
    } catch (err) {
      setError('Failed to inspect PDF: ' + err.message)
    }
  }

  // Apply pixel transformation to canvas imageData
  const applyColorMatrix = (ctx, width, height) => {
    const imgData = ctx.getImageData(0, 0, width, height)
    const data = imgData.data

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i]
      let g = data[i + 1]
      let b = data[i + 2]

      if (theme === 'invert') {
        // White-on-black color inversion
        r = 255 - r
        g = 255 - g
        b = 255 - b
      } else if (theme === 'sepia') {
        // Sepia tint
        const tr = 0.393 * r + 0.769 * g + 0.189 * b
        const tg = 0.349 * r + 0.686 * g + 0.168 * b
        const tb = 0.272 * r + 0.534 * g + 0.131 * b
        r = Math.min(255, tr)
        g = Math.min(255, tg)
        b = Math.min(255, tb)
      } else if (theme === 'slate') {
        // Slate Dark theme
        const gray = 0.299 * r + 0.587 * g + 0.114 * b
        const invGray = 255 - gray
        r = invGray * 0.85
        g = invGray * 0.9
        b = invGray * 1.0
      } else if (theme === 'monochrome') {
        // High contrast B&W
        const gray = (r + g + b) / 3
        const val = gray > 140 ? 255 : 0
        r = val
        g = val
        b = val
      }

      // Contrast & Brightness adjustments
      r = Math.min(255, Math.max(0, (r - 128) * contrast + 128 * brightness))
      g = Math.min(255, Math.max(0, (g - 128) * contrast + 128 * brightness))
      b = Math.min(255, Math.max(0, (b - 128) * contrast + 128 * brightness))

      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
    }

    ctx.putImageData(imgData, 0, 0)
  }

  // Live Canvas Preview
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

        // Apply theme transformation
        applyColorMatrix(ctx, canvas.width, canvas.height)
      } catch (err) {
        if (!isCancelled) console.error('Preview error:', err)
      }
    }

    renderPreview()
    return () => {
      isCancelled = true
    }
  }, [pdfDocProxy, currentPage, theme, contrast, brightness])

  // Transform all pages and export PDF
  const handleExportPdf = async () => {
    if (!file || !pdfDocProxy) return

    setProcessing(true)
    setProgress(0)
    setError(null)

    try {
      const { PDFDocument } = window.PDFLib || (await import('pdf-lib'))
      const outputPdf = await PDFDocument.create()

      for (let i = 1; i <= pageCount; i++) {
        setProgress(Math.round((i / pageCount) * 100))
        const page = await pdfDocProxy.getPage(i)
        const viewport = page.getViewport({ scale: 2.0 })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')

        await page.render({ canvasContext: ctx, viewport }).promise
        applyColorMatrix(ctx, canvas.width, canvas.height)

        const imgDataUrl = canvas.toDataURL('image/jpeg', 0.92)
        const imgBytes = await fetch(imgDataUrl).then((r) => r.arrayBuffer())
        const embeddedImg = await outputPdf.embedJpg(imgBytes)

        const pdfPage = outputPdf.addPage([viewport.width / 2, viewport.height / 2])
        pdfPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: viewport.width / 2,
          height: viewport.height / 2
        })
      }

      const outputBytes = await outputPdf.save()
      const outputFilename = `${file.name.replace(/\.pdf$/i, '')}_${theme}.pdf`

      if (window.download) {
        window.download(outputBytes, outputFilename, 'application/pdf')
      } else {
        const blob = new Blob([outputBytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = outputFilename
        a.click()
        URL.revokeObjectURL(url)
      }

      setSuccess(true)
    } catch (err) {
      console.error('Invert export failed:', err)
      setError('Failed to export transformed PDF: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const reset = () => {
    setFile(null)
    setFileBuffer(null)
    setPdfDocProxy(null)
    setPageCount(0)
    setCurrentPage(1)
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
            <Moon className="w-6 h-6 text-amber-500" />
            Invert Colors & Dark Mode PDF
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Convert PDFs to high-contrast Dark Mode (White-on-Black), Slate, or Warm Sepia for easy reading.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% Client-Side
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
        <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-4 text-emerald-400">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-semibold text-white">Dark Mode PDF Created Successfully</p>
              <p className="text-xs text-emerald-300 mt-0.5">
                The transformed document has been saved and downloaded.
              </p>
            </div>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Transform Another
          </button>
        </div>
      )}

      {/* Upload Zone */}
      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-800 hover:border-amber-500/50 bg-zinc-900/30 hover:bg-zinc-900/60 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group text-center"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 group-hover:bg-amber-500/10 flex items-center justify-center mb-4 transition-colors">
            <FileUp className="w-8 h-8 text-zinc-400 group-hover:text-amber-400 transition-colors" />
          </div>
          <h3 className="text-base font-semibold text-zinc-200 group-hover:text-white">
            Select a PDF document to invert
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Drag and drop or browse from your computer (never uploaded)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Color & Contrast Controls */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
              {/* Theme Selector */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-semibold">Reading Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'invert', label: 'Dark Mode (Inverted)', icon: Moon },
                    { id: 'slate', label: 'Dark Slate', icon: Sparkles },
                    { id: 'sepia', label: 'Warm Sepia', icon: Sun },
                    { id: 'monochrome', label: 'High Contrast B&W', icon: Sliders }
                  ].map((t) => {
                    const Icon = t.icon
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={`p-2.5 rounded-xl border text-xs text-left font-medium flex items-center gap-2 transition-colors ${
                          theme === t.id
                            ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{t.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Fine Tuning Sliders */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-zinc-400">Contrast:</span>
                    <span className="text-zinc-200 font-semibold">{contrast.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.8"
                    step="0.1"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-zinc-400">Brightness:</span>
                    <span className="text-zinc-200 font-semibold">{brightness.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.4"
                    step="0.1"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>

              {/* Progress indicator */}
              {processing && (
                <div className="pt-2 border-t border-zinc-800 space-y-1.5">
                  <div className="flex justify-between text-xs text-zinc-300">
                    <span>Rendering transformed pages...</span>
                    <span className="font-semibold text-amber-400">{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all duration-200" style={{ width: `${progress}%` }} />
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
                onClick={handleExportPdf}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Inverting Pages...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Export Transformed PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Live Inverted Preview */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 px-4 py-2.5 rounded-xl text-xs">
              <span className="text-zinc-400">
                Live Preview: Page <span className="text-white font-semibold">{currentPage}</span> of {pageCount}
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
