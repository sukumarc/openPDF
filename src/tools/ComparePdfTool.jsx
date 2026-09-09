import React, { useState, useRef, useEffect } from 'react'
import {
  GitCompare,
  FileUp,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Columns,
  Layers,
  Sparkles,
  FileText
} from 'lucide-react'

export default function ComparePdfTool() {
  const [fileA, setFileA] = useState(null)
  const [fileB, setFileB] = useState(null)
  const [docProxyA, setDocProxyA] = useState(null)
  const [docProxyB, setDocProxyB] = useState(null)

  const [pageCountA, setPageCountA] = useState(0)
  const [pageCountB, setPageCountB] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  // View Mode: 'side_by_side' | 'diff_overlay'
  const [viewMode, setViewMode] = useState('side_by_side')

  // Diff Stats
  const [diffPercentage, setDiffPercentage] = useState(0)
  const [computingDiff, setComputingDiff] = useState(false)
  const [error, setError] = useState(null)

  const canvasRefA = useRef(null)
  const canvasRefB = useRef(null)
  const diffCanvasRef = useRef(null)

  const inputRefA = useRef(null)
  const inputRefB = useRef(null)

  // Load File A
  const handleFileA = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileA(file)
    setError(null)

    try {
      const buffer = await file.arrayBuffer()
      if (!window.pdfjsLib) throw new Error('PDF library not ready.')
      const doc = await window.pdfjsLib.getDocument({ data: buffer.slice(0) }).promise
      setDocProxyA(doc)
      setPageCountA(doc.numPages)
    } catch (err) {
      setError('Failed to load Document A: ' + err.message)
    }
  }

  // Load File B
  const handleFileB = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileB(file)
    setError(null)

    try {
      const buffer = await file.arrayBuffer()
      if (!window.pdfjsLib) throw new Error('PDF library not ready.')
      const doc = await window.pdfjsLib.getDocument({ data: buffer.slice(0) }).promise
      setDocProxyB(doc)
      setPageCountB(doc.numPages)
    } catch (err) {
      setError('Failed to load Document B: ' + err.message)
    }
  }

  const maxPages = Math.max(pageCountA, pageCountB)

  // Render canvases & compute diff
  useEffect(() => {
    if (!docProxyA || !docProxyB) return

    let isCancelled = false

    const renderAndCompare = async () => {
      setComputingDiff(true)
      try {
        // Render Doc A Page
        let imgDataA = null
        if (currentPage <= pageCountA && canvasRefA.current) {
          const pageA = await docProxyA.getPage(currentPage)
          const viewportA = pageA.getViewport({ scale: 1.0 })
          const cA = canvasRefA.current
          cA.width = viewportA.width
          cA.height = viewportA.height
          const ctxA = cA.getContext('2d')
          await pageA.render({ canvasContext: ctxA, viewport: viewportA }).promise
          imgDataA = ctxA.getImageData(0, 0, cA.width, cA.height)
        }

        // Render Doc B Page
        let imgDataB = null
        if (currentPage <= pageCountB && canvasRefB.current) {
          const pageB = await docProxyB.getPage(currentPage)
          const viewportB = pageB.getViewport({ scale: 1.0 })
          const cB = canvasRefB.current
          cB.width = viewportB.width
          cB.height = viewportB.height
          const ctxB = cB.getContext('2d')
          await pageB.render({ canvasContext: ctxB, viewport: viewportB }).promise
          imgDataB = ctxB.getImageData(0, 0, cB.width, cB.height)
        }

        // Compute Pixel Diff if in Overlay Mode
        if (imgDataA && imgDataB && diffCanvasRef.current) {
          const diffCanvas = diffCanvasRef.current
          const width = Math.max(imgDataA.width, imgDataB.width)
          const height = Math.max(imgDataA.height, imgDataB.height)
          diffCanvas.width = width
          diffCanvas.height = height

          const diffCtx = diffCanvas.getContext('2d')
          const outputImg = diffCtx.createImageData(width, height)

          const dataA = imgDataA.data
          const dataB = imgDataB.data
          const out = outputImg.data

          let diffPixelCount = 0
          const totalPixels = width * height

          for (let i = 0; i < totalPixels * 4; i += 4) {
            const rA = dataA[i] ?? 255
            const gA = dataA[i + 1] ?? 255
            const bA = dataA[i + 2] ?? 255

            const rB = dataB[i] ?? 255
            const gB = dataB[i + 1] ?? 255
            const bB = dataB[i + 2] ?? 255

            const delta = Math.abs(rA - rB) + Math.abs(gA - gB) + Math.abs(bA - bB)

            if (delta > 35) {
              diffPixelCount++
              // Highlight change in vibrant neon red / magenta
              out[i] = 255 // R
              out[i + 1] = 0 // G
              out[i + 2] = 85 // B
              out[i + 3] = 230 // Alpha
            } else {
              // Dim background page
              const avg = (rA + gA + bA) / 3
              out[i] = avg
              out[i + 1] = avg
              out[i + 2] = avg
              out[i + 3] = 90
            }
          }

          diffCtx.putImageData(outputImg, 0, 0)
          const diffPercent = ((diffPixelCount / totalPixels) * 100).toFixed(2)
          if (!isCancelled) setDiffPercentage(diffPercent)
        }
      } catch (err) {
        if (!isCancelled) console.error('Compare error:', err)
      } finally {
        if (!isCancelled) setComputingDiff(false)
      }
    }

    renderAndCompare()
    return () => {
      isCancelled = true
    }
  }, [docProxyA, docProxyB, currentPage, viewMode])

  const reset = () => {
    setFileA(null)
    setFileB(null)
    setDocProxyA(null)
    setDocProxyB(null)
    setPageCountA(0)
    setPageCountB(0)
    setCurrentPage(1)
    setDiffPercentage(0)
    setError(null)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <GitCompare className="w-6 h-6 text-amber-500" />
            Compare Two PDF Documents
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Side-by-side synchronized comparison and pixel-level visual difference highlighting.
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

      {/* Dual Upload Section */}
      {(!fileA || !fileB) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Doc A */}
          <div
            onClick={() => inputRefA.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
              fileA
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-zinc-800 hover:border-amber-500/50 bg-zinc-900/30 hover:bg-zinc-900/60'
            }`}
          >
            <input ref={inputRefA} type="file" accept=".pdf" onChange={handleFileA} className="hidden" />
            <FileUp className={`w-10 h-10 mb-3 ${fileA ? 'text-emerald-400' : 'text-zinc-500'}`} />
            <h3 className="text-sm font-semibold text-zinc-200">
              {fileA ? fileA.name : 'Select Document A (Original / Baseline)'}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">{fileA ? `${pageCountA} Pages` : 'Upload primary PDF'}</p>
          </div>

          {/* Doc B */}
          <div
            onClick={() => inputRefB.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
              fileB
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-zinc-800 hover:border-amber-500/50 bg-zinc-900/30 hover:bg-zinc-900/60'
            }`}
          >
            <input ref={inputRefB} type="file" accept=".pdf" onChange={handleFileB} className="hidden" />
            <FileUp className={`w-10 h-10 mb-3 ${fileB ? 'text-emerald-400' : 'text-zinc-500'}`} />
            <h3 className="text-sm font-semibold text-zinc-200">
              {fileB ? fileB.name : 'Select Document B (Revised / Modified)'}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">{fileB ? `${pageCountB} Pages` : 'Upload revised PDF'}</p>
          </div>
        </div>
      )}

      {/* Comparison Viewport */}
      {fileA && fileB && (
        <div className="space-y-4">
          {/* Top Control Bar */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* View Mode Toggle */}
            <div className="flex p-1 bg-zinc-950 rounded-xl border border-zinc-800">
              <button
                onClick={() => setViewMode('side_by_side')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  viewMode === 'side_by_side'
                    ? 'bg-amber-500 text-zinc-950 shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Columns className="w-3.5 h-3.5" /> Side-by-Side
              </button>
              <button
                onClick={() => setViewMode('diff_overlay')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  viewMode === 'diff_overlay'
                    ? 'bg-amber-500 text-zinc-950 shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Visual Diff Overlay
              </button>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-3 text-xs">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-zinc-300">
                Page <span className="font-bold text-white">{currentPage}</span> of {maxPages}
              </span>
              <button
                disabled={currentPage >= maxPages}
                onClick={() => setCurrentPage((p) => Math.min(maxPages, p + 1))}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Diff Summary Badge & Reset */}
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Page Diff: {diffPercentage}%
              </div>
              <button
                onClick={reset}
                className="px-3 py-1 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Change Files
              </button>
            </div>
          </div>

          {/* Comparison Panels */}
          {viewMode === 'side_by_side' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Document A Side */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center">
                <div className="w-full flex items-center justify-between text-xs pb-2 mb-2 border-b border-zinc-800">
                  <span className="font-semibold text-zinc-300 truncate max-w-[220px]">
                    Original: {fileA.name}
                  </span>
                  <span className="text-zinc-500">Doc A</span>
                </div>
                <div className="flex justify-center items-center min-h-[480px]">
                  <canvas ref={canvasRefA} className="max-w-full max-h-[550px] object-contain shadow-2xl rounded" />
                </div>
              </div>

              {/* Document B Side */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center">
                <div className="w-full flex items-center justify-between text-xs pb-2 mb-2 border-b border-zinc-800">
                  <span className="font-semibold text-zinc-300 truncate max-w-[220px]">
                    Modified: {fileB.name}
                  </span>
                  <span className="text-zinc-500">Doc B</span>
                </div>
                <div className="flex justify-center items-center min-h-[480px]">
                  <canvas ref={canvasRefB} className="max-w-full max-h-[550px] object-contain shadow-2xl rounded" />
                </div>
              </div>
            </div>
          ) : (
            /* Visual Diff Overlay Mode */
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col items-center">
              <div className="w-full flex items-center justify-between text-xs pb-3 mb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Visual Pixel Diff Highlight</span>
                  <span className="text-zinc-400">
                    (Changes highlighted in <strong className="text-rose-400">Neon Red/Magenta</strong>)
                  </span>
                </div>
                <span className="text-xs text-zinc-400">{diffPercentage}% variance on page</span>
              </div>
              <div className="flex justify-center items-center min-h-[500px]">
                <canvas ref={diffCanvasRef} className="max-w-full max-h-[600px] object-contain shadow-2xl rounded" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
