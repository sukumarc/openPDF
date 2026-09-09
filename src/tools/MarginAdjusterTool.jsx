import React, { useState, useEffect, useRef } from 'react'
import {
  FileUp,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Maximize2,
  BoxSelect,
  Sliders,
  Eye,
  FileSpreadsheet,
  Move,
  Settings2
} from 'lucide-react'

export default function MarginAdjusterTool() {
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

  // Margin Settings (in millimeters)
  const [preset, setPreset] = useState('3ring') // '3ring', 'spiral', 'clipboard', 'uniform', 'custom'
  const [marginLeftMm, setMarginLeftMm] = useState(20) // 20mm ~ 0.75 in
  const [marginRightMm, setMarginRightMm] = useState(0)
  const [marginTopMm, setMarginTopMm] = useState(0)
  const [marginBottomMm, setMarginBottomMm] = useState(0)
  const [mirrorDuplex, setMirrorDuplex] = useState(true) // alternate left/right on even pages
  const [resizeMode, setResizeMode] = useState('scale') // 'scale' (fit to page) or 'expand' (expand canvas)
  const [showHoleGuides, setShowHoleGuides] = useState(true)

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

  const applyPreset = (presetKey) => {
    setPreset(presetKey)
    if (presetKey === '3ring') {
      setMarginLeftMm(20)
      setMarginRightMm(0)
      setMarginTopMm(0)
      setMarginBottomMm(0)
      setMirrorDuplex(true)
      setShowHoleGuides(true)
    } else if (presetKey === 'spiral') {
      setMarginLeftMm(15)
      setMarginRightMm(0)
      setMarginTopMm(0)
      setMarginBottomMm(0)
      setMirrorDuplex(true)
      setShowHoleGuides(false)
    } else if (presetKey === 'clipboard') {
      setMarginLeftMm(0)
      setMarginRightMm(0)
      setMarginTopMm(25)
      setMarginBottomMm(0)
      setMirrorDuplex(false)
      setShowHoleGuides(false)
    } else if (presetKey === 'uniform') {
      setMarginLeftMm(12)
      setMarginRightMm(12)
      setMarginTopMm(12)
      setMarginBottomMm(12)
      setMirrorDuplex(false)
      setShowHoleGuides(false)
    }
  }

  // Live Canvas Preview
  useEffect(() => {
    if (!pdfDocProxy || previewPage < 1) return

    let isMounted = true

    const renderPreview = async () => {
      try {
        const page = await pdfDocProxy.getPage(previewPage)
        const viewport = page.getViewport({ scale: 1.0 })

        const canvas = previewCanvasRef.current
        if (!canvas) return

        // Compute Margins in pixels (96 DPI preview: 1mm ~ 3.78px)
        const isEven = previewPage % 2 === 0
        const effLeftMm = mirrorDuplex && isEven ? marginRightMm : marginLeftMm
        const effRightMm = mirrorDuplex && isEven ? marginLeftMm : marginRightMm

        const leftPx = effLeftMm * 3.78
        const rightPx = effRightMm * 3.78
        const topPx = marginTopMm * 3.78
        const bottomPx = marginBottomMm * 3.78

        let targetWidth = viewport.width
        let targetHeight = viewport.height

        if (resizeMode === 'expand') {
          targetWidth += leftPx + rightPx
          targetHeight += topPx + bottomPx
        }

        canvas.width = targetWidth
        canvas.height = targetHeight

        const ctx = canvas.getContext('2d')

        // Fill background white
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, targetWidth, targetHeight)

        // Render page onto temporary offscreen canvas
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = viewport.width
        tempCanvas.height = viewport.height
        const tempCtx = tempCanvas.getContext('2d')

        await page.render({ canvasContext: tempCtx, viewport }).promise

        if (!isMounted) return

        if (resizeMode === 'scale') {
          // Scale content down inside margins
          const availW = targetWidth - leftPx - rightPx
          const availH = targetHeight - topPx - bottomPx
          const scale = Math.min(availW / viewport.width, availH / viewport.height, 1)

          const drawW = viewport.width * scale
          const drawH = viewport.height * scale
          const drawX = leftPx + (availW - drawW) / 2
          const drawY = topPx + (availH - drawH) / 2

          ctx.drawImage(tempCanvas, drawX, drawY, drawW, drawH)

          // Draw Margin Boundary Box
          ctx.strokeStyle = 'rgba(79, 70, 229, 0.4)'
          ctx.lineWidth = 1
          ctx.setLineDash([4, 4])
          ctx.strokeRect(leftPx, topPx, availW, availH)
        } else {
          // Expand canvas: draw original content at offset
          ctx.drawImage(tempCanvas, leftPx, topPx)

          // Draw Margin Guides
          ctx.strokeStyle = 'rgba(79, 70, 229, 0.4)'
          ctx.lineWidth = 1
          ctx.setLineDash([4, 4])
          ctx.strokeRect(leftPx, topPx, viewport.width, viewport.height)
        }

        // Draw 3-Ring Binder Punch Guides if enabled
        if (showHoleGuides && effLeftMm >= 15) {
          ctx.fillStyle = 'rgba(99, 102, 241, 0.35)'
          ctx.strokeStyle = 'rgba(79, 70, 229, 0.8)'
          ctx.lineWidth = 1.5
          ctx.setLineDash([])

          const holeRadius = 6
          const holeX = effLeftMm * 3.78 * 0.4
          const h1Y = targetHeight * 0.18
          const h2Y = targetHeight * 0.5
          const h3Y = targetHeight * 0.82

          ;[h1Y, h2Y, h3Y].forEach((hy) => {
            ctx.beginPath()
            ctx.arc(holeX, hy, holeRadius, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
          })
        }
      } catch (err) {
        console.error('Margin preview error:', err)
      }
    }

    renderPreview()

    return () => {
      isMounted = false
    }
  }, [
    pdfDocProxy,
    previewPage,
    marginLeftMm,
    marginRightMm,
    marginTopMm,
    marginBottomMm,
    mirrorDuplex,
    resizeMode,
    showHoleGuides
  ])

  const handleApplyMargins = async () => {
    if (!file || totalPages === 0) return
    setConverting(true)
    setProgress(10)
    setError('')

    try {
      const { PDFDocument } = window.PDFLib
      const arrayBuffer = await file.arrayBuffer()
      const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
      const newDoc = await PDFDocument.create()

      const embeddedPages = await newDoc.embedPdf(srcDoc)

      // 1 mm = 2.83465 PDF points
      const leftPt = marginLeftMm * 2.83465
      const rightPt = marginRightMm * 2.83465
      const topPt = marginTopMm * 2.83465
      const bottomPt = marginBottomMm * 2.83465

      for (let i = 0; i < embeddedPages.length; i++) {
        const embedded = embeddedPages[i]
        const origW = embedded.width
        const origH = embedded.height
        const isEven = (i + 1) % 2 === 0

        const effLeftPt = mirrorDuplex && isEven ? rightPt : leftPt
        const effRightPt = mirrorDuplex && isEven ? leftPt : rightPt

        if (resizeMode === 'expand') {
          const newW = origW + effLeftPt + effRightPt
          const newH = origH + topPt + bottomPt
          const newPage = newDoc.addPage([newW, newH])

          // In PDF coordinate space, (0,0) is bottom-left
          newPage.drawPage(embedded, {
            x: effLeftPt,
            y: bottomPt,
            width: origW,
            height: origH
          })
        } else {
          // Scale content to preserve original dimensions
          const newPage = newDoc.addPage([origW, origH])
          const availW = origW - effLeftPt - effRightPt
          const availH = origH - topPt - bottomPt

          const scale = Math.min(availW / origW, availH / origH, 1)
          const drawW = origW * scale
          const drawH = origH * scale

          const drawX = effLeftPt + (availW - drawW) / 2
          const drawY = bottomPt + (availH - drawH) / 2

          newPage.drawPage(embedded, {
            x: drawX,
            y: drawY,
            width: drawW,
            height: drawH
          })
        }

        setProgress(Math.round(15 + ((i + 1) / embeddedPages.length) * 80))
      }

      const pdfBytes = await newDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      setConvertedPdfUrl(url)
      setPdfSize((blob.size / 1024).toFixed(1) + ' KB')
      setProgress(100)
    } catch (err) {
      console.error('Margin Adjustment Error:', err)
      setError(err.message || 'Failed to adjust document margins.')
    } finally {
      setConverting(false)
    }
  }

  const handleDownload = () => {
    if (!convertedPdfUrl || !file) return
    const originalName = file.name.replace(/\.pdf$/i, '')
    const downloadName = `${originalName}-adjusted-margins.pdf`

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
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <BoxSelect className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  Margin & Binder Adjuster
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    Gutter Layout
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Expand page borders, add binder gutters for 3-hole punching, spiral binding, and duplex printing
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
          <div className="border-2 border-dashed border-zinc-800 hover:border-blue-500/50 rounded-2xl p-8 md:p-12 text-center transition-colors bg-zinc-900/30 group">
            <input
              type="file"
              id="margin-input"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="margin-input"
              className="flex flex-col items-center justify-center cursor-pointer space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center group-hover:scale-105 group-hover:border-blue-500/50 transition-all">
                <FileUp className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-200">Click to select PDF document</p>
                <p className="text-xs text-zinc-500 mt-1">Add binder margins, gutters, or expand canvas bounds</p>
              </div>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
                Select PDF File
              </span>
            </label>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-sm text-zinc-400 font-medium">Inspecting document geometry and bounding boxes...</p>
          </div>
        )}

        {/* Step 2: Margin Configuration & Live Visual Preview */}
        {file && !loading && totalPages > 0 && (
          <div className="space-y-6">
            {/* Presets Row */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  Binding & Margin Presets
                </h3>
                <span className="text-xs text-zinc-500">
                  {totalPages} Pages • File: {file.name}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => applyPreset('3ring')}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    preset === '3ring'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-300'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <p className="text-xs font-bold text-zinc-200">3-Ring Binder Gutter</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">20mm Left Gutter + Punch Holes</p>
                </button>

                <button
                  onClick={() => applyPreset('spiral')}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    preset === 'spiral'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-300'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <p className="text-xs font-bold text-zinc-200">Spiral / Coil Binding</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">15mm Inner Gutter</p>
                </button>

                <button
                  onClick={() => applyPreset('clipboard')}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    preset === 'clipboard'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-300'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <p className="text-xs font-bold text-zinc-200">Top Clipboard Gutter</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">25mm Top Margin</p>
                </button>

                <button
                  onClick={() => applyPreset('uniform')}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    preset === 'uniform'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-300'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <p className="text-xs font-bold text-zinc-200">Uniform Margins</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">12mm All 4 Sides</p>
                </button>
              </div>

              {/* 4-Way Margin Sliders */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-zinc-800/80">
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Left Gutter</span>
                    <span className="font-mono text-zinc-200">{marginLeftMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={marginLeftMm}
                    onChange={(e) => {
                      setMarginLeftMm(parseInt(e.target.value, 10))
                      setPreset('custom')
                    }}
                    className="w-full accent-blue-500 bg-zinc-800 h-1.5 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Right Margin</span>
                    <span className="font-mono text-zinc-200">{marginRightMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={marginRightMm}
                    onChange={(e) => {
                      setMarginRightMm(parseInt(e.target.value, 10))
                      setPreset('custom')
                    }}
                    className="w-full accent-blue-500 bg-zinc-800 h-1.5 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Top Margin</span>
                    <span className="font-mono text-zinc-200">{marginTopMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={marginTopMm}
                    onChange={(e) => {
                      setMarginTopMm(parseInt(e.target.value, 10))
                      setPreset('custom')
                    }}
                    className="w-full accent-blue-500 bg-zinc-800 h-1.5 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Bottom Margin</span>
                    <span className="font-mono text-zinc-200">{marginBottomMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={marginBottomMm}
                    onChange={(e) => {
                      setMarginBottomMm(parseInt(e.target.value, 10))
                      setPreset('custom')
                    }}
                    className="w-full accent-blue-500 bg-zinc-800 h-1.5 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Toggles & Resizing Engine Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-zinc-800/80 text-xs">
                {/* Mode */}
                <div>
                  <span className="text-zinc-500 block mb-1.5">Adjustment Mode</span>
                  <select
                    value={resizeMode}
                    onChange={(e) => setResizeMode(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="scale">Scale Content to Fit (Keep Standard Page Size)</option>
                    <option value="expand">Expand Canvas Bounds (Increase Page Width/Height)</option>
                  </select>
                </div>

                {/* Duplex Mirror */}
                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input
                      type="checkbox"
                      checked={mirrorDuplex}
                      onChange={(e) => setMirrorDuplex(e.target.checked)}
                      className="rounded bg-zinc-950 border-zinc-700 text-blue-500 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    Mirror Gutter on Even Pages (Duplex)
                  </label>
                </div>

                {/* Hole Punch Visualizer */}
                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input
                      type="checkbox"
                      checked={showHoleGuides}
                      onChange={(e) => setShowHoleGuides(e.target.checked)}
                      className="rounded bg-zinc-950 border-zinc-700 text-blue-500 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    Preview 3-Hole Binder Punch Circles
                  </label>
                </div>
              </div>
            </div>

            {/* Visual Canvas Margin Preview */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  Live Margin & Placement Preview (Page {previewPage} of {totalPages})
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
                          Page {i + 1} {i % 2 === 1 && mirrorDuplex ? '(Even / Mirrored)' : '(Odd)'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center p-6 bg-zinc-950/80 rounded-xl border border-zinc-800/80 min-h-[360px]">
                <div className="shadow-2xl rounded overflow-hidden border border-zinc-700/60 bg-white">
                  <canvas ref={previewCanvasRef} className="max-w-full max-h-[420px] object-contain" />
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
                onClick={handleApplyMargins}
                disabled={converting}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer transition-all"
              >
                {converting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Adjusting Document Margins ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Apply Margins & Export PDF</span>
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
                    <h4 className="text-sm font-bold text-white">Adjusted PDF Ready!</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Gutter & margins applied across {totalPages} pages • Size: {pdfSize}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download Adjusted PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
