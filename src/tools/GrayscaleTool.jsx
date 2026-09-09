import React, { useState, useEffect, useRef } from 'react'
import {
  FileUp,
  Download,
  Palette,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Sliders,
  Sun,
  Contrast,
  Eye,
  Layers,
  Printer
} from 'lucide-react'

export default function GrayscaleTool() {
  const [file, setFile] = useState(null)
  const [pdfDocProxy, setPdfDocProxy] = useState(null)
  const [totalPages, setTotalPages] = useState(0)
  const [previewPage, setPreviewPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [convertedPdfUrl, setConvertedPdfUrl] = useState(null)
  const [pdfSize, setPdfSize] = useState(null)

  // Grayscale Presets & Adjustments
  const [preset, setPreset] = useState('standard') // 'standard', 'highcontrast', 'inksaver', 'monochrome'
  const [contrast, setContrast] = useState(1.0) // 0.5 to 2.0
  const [brightness, setBrightness] = useState(0) // -50 to 50
  const [pageRange, setPageRange] = useState('all') // 'all', 'custom'
  const [customRangeStr, setCustomRangeStr] = useState('')

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
      setError(err.message || 'Failed to load PDF document.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Preset changes
  const applyPreset = (presetKey) => {
    setPreset(presetKey)
    if (presetKey === 'standard') {
      setContrast(1.0)
      setBrightness(0)
    } else if (presetKey === 'highcontrast') {
      setContrast(1.4)
      setBrightness(-10)
    } else if (presetKey === 'inksaver') {
      setContrast(1.1)
      setBrightness(25)
    } else if (presetKey === 'monochrome') {
      setContrast(2.0)
      setBrightness(0)
    }
  }

  // Render Sample Page for Live Preview
  useEffect(() => {
    if (!pdfDocProxy || previewPage < 1) return

    let isMounted = true

    const renderPreview = async () => {
      try {
        const page = await pdfDocProxy.getPage(previewPage)
        const viewport = page.getViewport({ scale: 1.2 })

        // Render original color page
        const origCanvas = originalCanvasRef.current
        if (!origCanvas) return
        origCanvas.width = viewport.width
        origCanvas.height = viewport.height

        const origCtx = origCanvas.getContext('2d')
        await page.render({ canvasContext: origCtx, viewport }).promise

        if (!isMounted) return

        // Render processed grayscale page
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

          // ITU-R BT.601 standard luminance
          let gray = 0.299 * r + 0.587 * g + 0.114 * b

          if (preset === 'monochrome') {
            // 1-bit thresholding
            gray = gray < 130 ? 0 : 255
          } else {
            // Apply contrast & brightness
            gray = (gray - 128) * contrast + 128 + brightness
            gray = Math.max(0, Math.min(255, gray))
          }

          data[i] = gray
          data[i + 1] = gray
          data[i + 2] = gray
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
  }, [pdfDocProxy, previewPage, preset, contrast, brightness])

  // Parse page range
  const getPagesToProcess = () => {
    if (pageRange === 'all' || !customRangeStr.trim()) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages = new Set()
    const parts = customRangeStr.split(',')

    for (const part of parts) {
      const trimmed = part.trim()
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map((n) => parseInt(n.trim(), 10))
        if (!isNaN(start) && !isNaN(end)) {
          for (let p = Math.max(1, start); p <= Math.min(totalPages, end); p++) {
            pages.add(p)
          }
        }
      } else {
        const p = parseInt(trimmed, 10)
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
          pages.add(p)
        }
      }
    }

    return Array.from(pages).sort((a, b) => a - b)
  }

  const handleConvertToGrayscale = async () => {
    if (!pdfDocProxy) return
    const targetPages = getPagesToProcess()
    if (targetPages.length === 0) {
      setError('Please specify a valid page range.')
      return
    }

    setConverting(true)
    setProgress(5)
    setError('')

    try {
      const { PDFDocument } = window.PDFLib
      const newPdfDoc = await PDFDocument.create()

      const offCanvas = document.createElement('canvas')
      const offCtx = offCanvas.getContext('2d')

      const stepProgress = 85 / targetPages.length

      for (let idx = 0; idx < targetPages.length; idx++) {
        const pageNum = targetPages[idx]
        const page = await pdfDocProxy.getPage(pageNum)
        const viewport = page.getViewport({ scale: 2.0 }) // Crisp 2x print quality

        offCanvas.width = viewport.width
        offCanvas.height = viewport.height

        await page.render({ canvasContext: offCtx, viewport }).promise

        const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height)
        const data = imgData.data

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]

          let gray = 0.299 * r + 0.587 * g + 0.114 * b

          if (preset === 'monochrome') {
            gray = gray < 130 ? 0 : 255
          } else {
            gray = (gray - 128) * contrast + 128 + brightness
            gray = Math.max(0, Math.min(255, gray))
          }

          data[i] = gray
          data[i + 1] = gray
          data[i + 2] = gray
        }

        offCtx.putImageData(imgData, 0, 0)

        // Convert canvas to compressed JPEG
        const jpegUrl = offCanvas.toDataURL('image/jpeg', 0.92)
        const jpegData = jpegUrl.split(',')[1]
        const jpegBytes = Uint8Array.from(atob(jpegData), (c) => c.charCodeAt(0))

        const embeddedImage = await newPdfDoc.embedJpg(jpegBytes)
        // Original page dimensions in points (viewport.width / scale)
        const originalPtWidth = viewport.width / 2.0
        const originalPtHeight = viewport.height / 2.0

        const newPage = newPdfDoc.addPage([originalPtWidth, originalPtHeight])
        newPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: originalPtWidth,
          height: originalPtHeight
        })

        setProgress(Math.round(10 + (idx + 1) * stepProgress))
      }

      const pdfBytes = await newPdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      setConvertedPdfUrl(url)
      setPdfSize((blob.size / 1024).toFixed(1) + ' KB')
      setProgress(100)
    } catch (err) {
      console.error('Grayscale Conversion Error:', err)
      setError(err.message || 'Failed to convert PDF to grayscale.')
    } finally {
      setConverting(false)
    }
  }

  const handleDownload = () => {
    if (!convertedPdfUrl || !file) return
    const originalName = file.name.replace(/\.pdf$/i, '')
    const downloadName = `${originalName}-grayscale.pdf`

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
              <div className="w-10 h-10 rounded-xl bg-zinc-700/20 border border-zinc-700/40 flex items-center justify-center">
                <Palette className="w-5 h-5 text-zinc-300" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  PDF to Grayscale & Monochrome
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-700/30 border border-zinc-600 text-zinc-300">
                    Ink Saver
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Convert color documents into pure grayscale or high-contrast monochrome for affordable printing & archival
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
          <div className="border-2 border-dashed border-zinc-800 hover:border-zinc-500 rounded-2xl p-8 md:p-12 text-center transition-colors bg-zinc-900/30 group">
            <input
              type="file"
              id="grayscale-input"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="grayscale-input"
              className="flex flex-col items-center justify-center cursor-pointer space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center group-hover:scale-105 group-hover:border-zinc-500 transition-all">
                <FileUp className="w-8 h-8 text-zinc-300" />
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-200">Click to select PDF document</p>
                <p className="text-xs text-zinc-500 mt-1">Convert color pages to pure monochrome grayscale</p>
              </div>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-semibold">
                Select PDF File
              </span>
            </label>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-zinc-400 rounded-full animate-spin"></div>
            <p className="text-sm text-zinc-400 font-medium">Loading document and rendering color matrices...</p>
          </div>
        )}

        {/* Step 2: Grayscale Options & Side-by-Side Preview */}
        {file && !loading && totalPages > 0 && (
          <div className="space-y-6">
            {/* Presets Bar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-zinc-400" />
                  Grayscale Conversion Profiles
                </h3>
                <span className="text-xs text-zinc-500">
                  {totalPages} Total Pages • File: {file.name}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => applyPreset('standard')}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    preset === 'standard'
                      ? 'bg-zinc-800 border-zinc-400 text-white'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <p className="text-xs font-bold text-zinc-200">Standard Grayscale</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Smooth 256-level tones</p>
                </button>

                <button
                  onClick={() => applyPreset('highcontrast')}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    preset === 'highcontrast'
                      ? 'bg-zinc-800 border-zinc-400 text-white'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <p className="text-xs font-bold text-zinc-200">High Contrast</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Crisp dark text & lines</p>
                </button>

                <button
                  onClick={() => applyPreset('inksaver')}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    preset === 'inksaver'
                      ? 'bg-zinc-800 border-zinc-400 text-white'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <p className="text-xs font-bold text-zinc-200">Ink / Toner Saver</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Lightened backgrounds</p>
                </button>

                <button
                  onClick={() => applyPreset('monochrome')}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    preset === 'monochrome'
                      ? 'bg-zinc-800 border-zinc-400 text-white'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <p className="text-xs font-bold text-zinc-200">1-Bit Monochrome</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Pure B&W (Fax mode)</p>
                </button>
              </div>

              {/* Fine Tuning Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Contrast className="w-3.5 h-3.5" /> Contrast Multiplier
                    </span>
                    <span className="font-mono text-zinc-300">{contrast.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={contrast}
                    onChange={(e) => {
                      setContrast(parseFloat(e.target.value))
                      setPreset('custom')
                    }}
                    className="w-full accent-zinc-400 bg-zinc-800 h-1.5 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5" /> Brightness Offset
                    </span>
                    <span className="font-mono text-zinc-300">{brightness > 0 ? `+${brightness}` : brightness}</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="5"
                    value={brightness}
                    onChange={(e) => {
                      setBrightness(parseInt(e.target.value, 10))
                      setPreset('custom')
                    }}
                    className="w-full accent-zinc-400 bg-zinc-800 h-1.5 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Page Scope */}
              <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="radio"
                      name="pagerange"
                      checked={pageRange === 'all'}
                      onChange={() => setPageRange('all')}
                      className="accent-zinc-400"
                    />
                    All Pages ({totalPages})
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="radio"
                      name="pagerange"
                      checked={pageRange === 'custom'}
                      onChange={() => setPageRange('custom')}
                      className="accent-zinc-400"
                    />
                    Custom Page Range
                  </label>
                </div>

                {pageRange === 'custom' && (
                  <input
                    type="text"
                    placeholder="e.g. 1-3, 5, 8"
                    value={customRangeStr}
                    onChange={(e) => setCustomRangeStr(e.target.value)}
                    className="px-3 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 w-36"
                  />
                )}
              </div>
            </div>

            {/* Live Side-by-Side Comparison */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-zinc-400" />
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
                {/* Original Color Preview */}
                <div className="flex flex-col items-center p-3 bg-zinc-950/60 rounded-lg border border-zinc-800">
                  <span className="text-xs font-semibold text-zinc-400 mb-2">Original Color</span>
                  <div className="max-h-80 overflow-hidden flex items-center justify-center rounded shadow">
                    <canvas ref={originalCanvasRef} className="max-w-full max-h-72 object-contain" />
                  </div>
                </div>

                {/* Processed Grayscale Preview */}
                <div className="flex flex-col items-center p-3 bg-zinc-950/60 rounded-lg border border-zinc-800">
                  <span className="text-xs font-semibold text-zinc-300 mb-2">Converted Grayscale</span>
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
                onClick={handleConvertToGrayscale}
                disabled={converting}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-zinc-200 hover:bg-white text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-white/5 cursor-pointer transition-all"
              >
                {converting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin"></div>
                    <span>Processing Grayscale ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4 text-zinc-900" />
                    <span>Convert Entire PDF to Grayscale</span>
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
                    <h4 className="text-sm font-bold text-white">Grayscale PDF Ready!</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Converted {getPagesToProcess().length} pages • Size: {pdfSize}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download Grayscale PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
