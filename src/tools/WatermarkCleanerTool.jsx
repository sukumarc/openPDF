import React, { useState, useEffect, useRef } from 'react'
import {
  Eraser,
  FileUp,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Sliders,
  Eye,
  Layers,
  Sun,
  Contrast,
  Search,
  Check
} from 'lucide-react'

export default function WatermarkCleanerTool() {
  const [file, setFile] = useState(null)
  const [pdfDocProxy, setPdfDocProxy] = useState(null)
  const [totalPages, setTotalPages] = useState(0)
  const [previewPage, setPreviewPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [convertedPdfUrl, setConvertedPdfUrl] = useState(null)
  const [pdfSize, setPdfSize] = useState(null)

  // Cleaning Parameters
  const [watermarkPhrase, setWatermarkPhrase] = useState('DRAFT')
  const [filterMode, setFilterMode] = useState('luminance') // 'luminance' (background threshold), 'highpass'
  const [threshold, setThreshold] = useState(225) // Pixels lighter than this become pure white (0-255)
  const [darkenTextFactor, setDarkenTextFactor] = useState(1.2) // Contrast boost for real text

  const originalCanvasRef = useRef(null)
  const previewCanvasRef = useRef(null)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file.')
      return
    }

    setFile(selectedFile)
    setError('')
    setConvertedPdfUrl(null)
    setLoading(true)

    try {
      if (!window.pdfjsLib) {
        throw new Error('PDF.js library is loading. Please try again.')
      }

      const arrayBuffer = await selectedFile.arrayBuffer()
      const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer })
      const doc = await loadingTask.promise

      setPdfDocProxy(doc)
      setTotalPages(doc.numPages)
      setPreviewPage(1)
    } catch (err) {
      console.error('Failed to load PDF:', err)
      setError(err.message || 'Failed to inspect PDF.')
    } finally {
      setLoading(false)
    }
  }

  // Live Canvas Preview of Watermark Cleaning
  useEffect(() => {
    if (!pdfDocProxy || previewPage < 1) return

    let isMounted = true

    const renderPreview = async () => {
      try {
        const page = await pdfDocProxy.getPage(previewPage)
        const viewport = page.getViewport({ scale: 1.2 })

        const origCanvas = originalCanvasRef.current
        if (!origCanvas) return
        origCanvas.width = viewport.width
        origCanvas.height = viewport.height

        const origCtx = origCanvas.getContext('2d')
        await page.render({ canvasContext: origCtx, viewport }).promise

        if (!isMounted) return

        const procCanvas = previewCanvasRef.current
        if (!procCanvas) return
        procCanvas.width = viewport.width
        procCanvas.height = viewport.height

        const procCtx = procCanvas.getContext('2d')
        procCtx.drawImage(origCanvas, 0, 0)

        const imgData = procCtx.getImageData(0, 0, procCanvas.width, procCanvas.height)
        const data = imgData.data

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]

          const luminance = 0.299 * r + 0.587 * g + 0.114 * b

          // If pixel is lighter than threshold (e.g. 225), it's faint background or watermark -> scrub to pure white
          if (luminance >= threshold) {
            data[i] = 255
            data[i + 1] = 255
            data[i + 2] = 255
          } else {
            // Foreground text: boost contrast so real text stays crisp
            data[i] = Math.max(0, Math.min(255, (r - 128) * darkenTextFactor + 128))
            data[i + 1] = Math.max(0, Math.min(255, (g - 128) * darkenTextFactor + 128))
            data[i + 2] = Math.max(0, Math.min(255, (b - 128) * darkenTextFactor + 128))
          }
        }

        procCtx.putImageData(imgData, 0, 0)
      } catch (err) {
        console.error('Preview render error:', err)
      }
    }

    renderPreview()

    return () => {
      isMounted = false
    }
  }, [pdfDocProxy, previewPage, threshold, darkenTextFactor])

  const handleCleanWatermarks = async () => {
    if (!pdfDocProxy) return
    setCleaning(true)
    setProgress(5)
    setError('')

    try {
      const { PDFDocument } = window.PDFLib
      const newPdfDoc = await PDFDocument.create()

      const offCanvas = document.createElement('canvas')
      const offCtx = offCanvas.getContext('2d')

      const stepProgress = 85 / totalPages

      for (let p = 1; p <= totalPages; p++) {
        const page = await pdfDocProxy.getPage(p)
        const viewport = page.getViewport({ scale: 2.0 }) // 2.0x high resolution

        offCanvas.width = viewport.width
        offCanvas.height = viewport.height

        await page.render({ canvasContext: offCtx, viewport }).promise

        const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height)
        const data = imgData.data

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]

          const luminance = 0.299 * r + 0.587 * g + 0.114 * b

          if (luminance >= threshold) {
            data[i] = 255
            data[i + 1] = 255
            data[i + 2] = 255
          } else {
            data[i] = Math.max(0, Math.min(255, (r - 128) * darkenTextFactor + 128))
            data[i + 1] = Math.max(0, Math.min(255, (g - 128) * darkenTextFactor + 128))
            data[i + 2] = Math.max(0, Math.min(255, (b - 128) * darkenTextFactor + 128))
          }
        }

        offCtx.putImageData(imgData, 0, 0)

        // Convert cleaned canvas to high quality JPEG
        const jpegUrl = offCanvas.toDataURL('image/jpeg', 0.94)
        const jpegData = jpegUrl.split(',')[1]
        const jpegBytes = Uint8Array.from(atob(jpegData), (c) => c.charCodeAt(0))

        const embeddedImage = await newPdfDoc.embedJpg(jpegBytes)
        const ptWidth = viewport.width / 2.0
        const ptHeight = viewport.height / 2.0

        const newPage = newPdfDoc.addPage([ptWidth, ptHeight])
        newPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: ptWidth,
          height: ptHeight
        })

        setProgress(Math.round(10 + p * stepProgress))
      }

      const pdfBytes = await newPdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      setConvertedPdfUrl(url)
      setPdfSize((blob.size / 1024).toFixed(1) + ' KB')
      setProgress(100)
    } catch (err) {
      console.error('Watermark Cleaner Error:', err)
      setError(err.message || 'Failed to scrub watermarks from PDF.')
    } finally {
      setCleaning(false)
    }
  }

  const handleDownload = () => {
    if (!convertedPdfUrl || !file) return
    const originalName = file.name.replace(/\.pdf$/i, '')
    const downloadName = `${originalName}-Cleaned.pdf`

    if (window.download) {
      fetch(convertedPdfUrl)
        .then((res) => res.blob())
        .then((blob) => {
          window.download(blob, downloadName, 'application/pdf')
        })
    } else {
      const a = document.createElement('a')
      a.href = convertedPdfUrl
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
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Eraser className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  Watermark & Artifact Cleaner
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    Artifact Eraser
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Scrub faint background watermark stamps, evaluation banners, and draft overlays while preserving sharp foreground text
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
          <div className="border-2 border-dashed border-zinc-800 hover:border-rose-500/50 rounded-2xl p-8 md:p-12 text-center transition-colors bg-zinc-900/30 group">
            <input
              type="file"
              id="cleaner-input"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="cleaner-input"
              className="flex flex-col items-center justify-center cursor-pointer space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center group-hover:scale-105 group-hover:border-rose-500/50 transition-all">
                <FileUp className="w-8 h-8 text-rose-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-200">Click to select watermarked PDF document</p>
                <p className="text-xs text-zinc-500 mt-1">Removes background stamps, draft logos, and sample notices</p>
              </div>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold">
                Select PDF File
              </span>
            </label>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-rose-500 rounded-full animate-spin"></div>
            <p className="text-sm text-zinc-400 font-medium">Scanning background luminance and color layers...</p>
          </div>
        )}

        {/* Step 2: Live Before / After Preview & Threshold Controls */}
        {file && !loading && totalPages > 0 && (
          <div className="space-y-6">
            {/* Filter Tuning Controls */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-rose-400" />
                  Watermark Eraser Sensitivity
                </h3>
                <span className="text-xs text-zinc-500 font-mono">
                  {totalPages} Pages • File: {file.name}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Background Scrub Threshold */}
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-400" /> Background Whiten Threshold
                    </span>
                    <span className="font-mono text-zinc-200">{threshold} / 255</span>
                  </div>
                  <input
                    type="range"
                    min="180"
                    max="250"
                    step="1"
                    value={threshold}
                    onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
                    className="w-full accent-rose-500 bg-zinc-800 h-1.5 rounded cursor-pointer"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Lower value cleans darker watermarks; higher value preserves lighter background details.
                  </p>
                </div>

                {/* Text Sharpness Multiplier */}
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Contrast className="w-3.5 h-3.5 text-blue-400" /> Foreground Text Contrast Boost
                    </span>
                    <span className="font-mono text-zinc-200">{darkenTextFactor.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="2.0"
                    step="0.1"
                    value={darkenTextFactor}
                    onChange={(e) => setDarkenTextFactor(parseFloat(e.target.value))}
                    className="w-full accent-rose-500 bg-zinc-800 h-1.5 rounded cursor-pointer"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Reinforces font stroke weights and ensures dark text remains crystal sharp.
                  </p>
                </div>
              </div>
            </div>

            {/* Live Side-by-Side Comparison */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-rose-400" />
                  Live Preview Comparison (Page {previewPage} of {totalPages})
                </h3>

                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Preview Page:</span>
                    <select
                      value={previewPage}
                      onChange={(e) => setPreviewPage(Number(e.target.value))}
                      className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200"
                    >
                      {Array.from({ length: totalPages }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Page {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Document */}
                <div className="flex flex-col items-center p-3 bg-zinc-950/60 rounded-lg border border-zinc-800">
                  <span className="text-xs font-semibold text-zinc-400 mb-2">Original (With Watermarks)</span>
                  <div className="max-h-80 overflow-hidden flex items-center justify-center rounded shadow">
                    <canvas ref={originalCanvasRef} className="max-w-full max-h-72 object-contain" />
                  </div>
                </div>

                {/* Cleaned Document */}
                <div className="flex flex-col items-center p-3 bg-zinc-950/60 rounded-lg border border-zinc-800">
                  <span className="text-xs font-semibold text-rose-400 mb-2">Cleaned (Watermarks Scrubbed)</span>
                  <div className="max-h-80 overflow-hidden flex items-center justify-center rounded shadow">
                    <canvas ref={previewCanvasRef} className="max-w-full max-h-72 object-contain" />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                onClick={() => {
                  setFile(null)
                  setPdfDocProxy(null)
                  setConvertedPdfUrl(null)
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
              >
                Upload different document
              </button>

              <button
                onClick={handleCleanWatermarks}
                disabled={cleaning}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer transition-all"
              >
                {cleaning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Scrubbing Watermarks ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Eraser className="w-4 h-4" />
                    <span>Scrub All Watermarks & Clean PDF</span>
                  </>
                )}
              </button>
            </div>

            {/* Success Download Card */}
            {convertedPdfUrl && (
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Cleaned PDF Ready!</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Watermark layers removed across {totalPages} pages • Size: {pdfSize}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download Cleaned PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
