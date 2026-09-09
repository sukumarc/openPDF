import React, { useState, useRef, useEffect } from 'react'
import {
  Highlighter,
  Pencil,
  Type,
  Square,
  Circle,
  ArrowRight,
  Minus,
  Undo,
  Redo,
  Trash2,
  Download,
  FileUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Layers
} from 'lucide-react'

export default function AnnotatePdfTool() {
  const [file, setFile] = useState(null)
  const [fileBuffer, setFileBuffer] = useState(null)
  const [pdfDocProxy, setPdfDocProxy] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  // Active Tool: 'pen' | 'highlighter' | 'text' | 'rect' | 'circle' | 'arrow' | 'line'
  const [activeTool, setActiveTool] = useState('pen')
  const [color, setColor] = useState('#ef4444')
  const [lineWidth, setLineWidth] = useState(3)
  const [fontSize, setFontSize] = useState(16)
  const [textInput, setTextInput] = useState('')

  // Multi-page Annotation Layers: Map of pageNumber -> Array of action objects
  const [pageAnnotations, setPageAnnotations] = useState({})
  const [historyIndex, setHistoryIndex] = useState({})

  // Drawing in progress
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentPath, setCurrentPath] = useState([])

  // Status
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const pdfCanvasRef = useRef(null)
  const drawCanvasRef = useRef(null)
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
    setPageAnnotations({})

    try {
      const buffer = await selectedFile.arrayBuffer()
      setFileBuffer(buffer)

      if (!window.pdfjsLib) {
        throw new Error('PDF processing library not loaded.')
      }

      const loadingTask = window.pdfjsLib.getDocument({ data: buffer.slice(0) })
      const doc = await loadingTask.promise
      setPdfDocProxy(doc)
      setPageCount(doc.numPages)
      setCurrentPage(1)
    } catch (err) {
      console.error('Failed to parse PDF:', err)
      setError('Failed to inspect PDF: ' + err.message)
    }
  }

  // Render PDF Page & Redraw Annotation Layer
  useEffect(() => {
    if (!pdfDocProxy || !pdfCanvasRef.current || !drawCanvasRef.current) return

    let isCancelled = false
    const renderPageAndAnnotations = async () => {
      try {
        const page = await pdfDocProxy.getPage(currentPage)
        const viewport = page.getViewport({ scale: 1.2 })

        const pCanvas = pdfCanvasRef.current
        const dCanvas = drawCanvasRef.current
        if (!pCanvas || !dCanvas) return

        pCanvas.width = viewport.width
        pCanvas.height = viewport.height
        dCanvas.width = viewport.width
        dCanvas.height = viewport.height

        const pCtx = pCanvas.getContext('2d')
        pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height)
        await page.render({ canvasContext: pCtx, viewport }).promise

        // Draw stored annotations for this page
        redrawPageAnnotations(currentPage, dCanvas)
      } catch (err) {
        if (!isCancelled) console.error('Render error:', err)
      }
    }

    renderPageAndAnnotations()
    return () => {
      isCancelled = true
    }
  }, [pdfDocProxy, currentPage])

  // Helper to redraw all strokes/shapes for a given page
  const redrawPageAnnotations = (pageNum, canvas) => {
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const items = pageAnnotations[pageNum] || []

    items.forEach((item) => {
      ctx.save()
      ctx.strokeStyle = item.color
      ctx.fillStyle = item.color
      ctx.lineWidth = item.lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (item.tool === 'highlighter') {
        ctx.globalAlpha = 0.35
        ctx.lineWidth = item.lineWidth * 3
      }

      if (item.tool === 'pen' || item.tool === 'highlighter') {
        if (item.points.length > 1) {
          ctx.beginPath()
          ctx.moveTo(item.points[0].x, item.points[0].y)
          for (let i = 1; i < item.points.length; i++) {
            ctx.lineTo(item.points[i].x, item.points[i].y)
          }
          ctx.stroke()
        }
      } else if (item.tool === 'rect') {
        ctx.strokeRect(item.x, item.y, item.width, item.height)
      } else if (item.tool === 'circle') {
        ctx.beginPath()
        ctx.ellipse(
          item.x + item.width / 2,
          item.y + item.height / 2,
          Math.abs(item.width / 2),
          Math.abs(item.height / 2),
          0,
          0,
          Math.PI * 2
        )
        ctx.stroke()
      } else if (item.tool === 'line') {
        ctx.beginPath()
        ctx.moveTo(item.x1, item.y1)
        ctx.lineTo(item.x2, item.y2)
        ctx.stroke()
      } else if (item.tool === 'arrow') {
        drawArrow(ctx, item.x1, item.y1, item.x2, item.y2, item.lineWidth)
      } else if (item.tool === 'text') {
        ctx.font = `${item.fontSize}px sans-serif`
        ctx.fillText(item.text, item.x, item.y)
      }

      ctx.restore()
    })
  }

  // Draw arrow helper
  const drawArrow = (ctx, fromx, fromy, tox, toy, width) => {
    const headlen = width * 4 + 8
    const dx = tox - fromx
    const dy = toy - fromy
    const angle = Math.atan2(dy, dx)
    ctx.beginPath()
    ctx.moveTo(fromx, fromy)
    ctx.lineTo(tox, toy)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(tox, toy)
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6))
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6))
    ctx.closePath()
    ctx.fill()
  }

  // Mouse / Drawing Events
  const handleMouseDown = (e) => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (activeTool === 'text') {
      const textToPlace = prompt('Enter annotation text:', textInput || 'Note')
      if (textToPlace) {
        const newAnnotation = {
          tool: 'text',
          x,
          y,
          text: textToPlace,
          color,
          fontSize
        }
        addAnnotation(newAnnotation)
      }
      return
    }

    setIsDrawing(true)
    setStartPos({ x, y })
    setCurrentPath([{ x, y }])
  }

  const handleMouseMove = (e) => {
    if (!isDrawing || !drawCanvasRef.current) return
    const rect = drawCanvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const canvas = drawCanvasRef.current
    const ctx = canvas.getContext('2d')

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      setCurrentPath((prev) => [...prev, { x, y }])
      redrawPageAnnotations(currentPage, canvas)

      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = activeTool === 'highlighter' ? lineWidth * 3 : lineWidth
      ctx.globalAlpha = activeTool === 'highlighter' ? 0.35 : 1.0
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (currentPath.length > 1) {
        ctx.beginPath()
        ctx.moveTo(currentPath[0].x, currentPath[0].y)
        for (let i = 1; i < currentPath.length; i++) {
          ctx.lineTo(currentPath[i].x, currentPath[i].y)
        }
        ctx.stroke()
      }
      ctx.restore()
    } else {
      // Shape preview
      redrawPageAnnotations(currentPage, canvas)
      ctx.save()
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = lineWidth

      if (activeTool === 'rect') {
        ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y)
      } else if (activeTool === 'circle') {
        ctx.beginPath()
        ctx.ellipse(
          startPos.x + (x - startPos.x) / 2,
          startPos.y + (y - startPos.y) / 2,
          Math.abs((x - startPos.x) / 2),
          Math.abs((y - startPos.y) / 2),
          0,
          0,
          Math.PI * 2
        )
        ctx.stroke()
      } else if (activeTool === 'line') {
        ctx.beginPath()
        ctx.moveTo(startPos.x, startPos.y)
        ctx.lineTo(x, y)
        ctx.stroke()
      } else if (activeTool === 'arrow') {
        drawArrow(ctx, startPos.x, startPos.y, x, y, lineWidth)
      }
      ctx.restore()
    }
  }

  const handleMouseUp = (e) => {
    if (!isDrawing || !drawCanvasRef.current) return
    setIsDrawing(false)
    const rect = drawCanvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    let newAnnotation = null

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      newAnnotation = {
        tool: activeTool,
        points: currentPath,
        color,
        lineWidth
      }
    } else if (activeTool === 'rect') {
      newAnnotation = {
        tool: 'rect',
        x: startPos.x,
        y: startPos.y,
        width: x - startPos.x,
        height: y - startPos.y,
        color,
        lineWidth
      }
    } else if (activeTool === 'circle') {
      newAnnotation = {
        tool: 'circle',
        x: startPos.x,
        y: startPos.y,
        width: x - startPos.x,
        height: y - startPos.y,
        color,
        lineWidth
      }
    } else if (activeTool === 'line') {
      newAnnotation = {
        tool: 'line',
        x1: startPos.x,
        y1: startPos.y,
        x2: x,
        y2: y,
        color,
        lineWidth
      }
    } else if (activeTool === 'arrow') {
      newAnnotation = {
        tool: 'arrow',
        x1: startPos.x,
        y1: startPos.y,
        x2: x,
        y2: y,
        color,
        lineWidth
      }
    }

    if (newAnnotation) {
      addAnnotation(newAnnotation)
    }
  }

  const addAnnotation = (item) => {
    setPageAnnotations((prev) => {
      const currentList = prev[currentPage] || []
      const updated = { ...prev, [currentPage]: [...currentList, item] }
      if (drawCanvasRef.current) {
        redrawPageAnnotations(currentPage, drawCanvasRef.current)
      }
      return updated
    })
  }

  const undoAnnotation = () => {
    setPageAnnotations((prev) => {
      const currentList = prev[currentPage] || []
      if (currentList.length === 0) return prev
      const updatedList = currentList.slice(0, currentList.length - 1)
      const updated = { ...prev, [currentPage]: updatedList }
      if (drawCanvasRef.current) {
        redrawPageAnnotations(currentPage, drawCanvasRef.current)
      }
      return updated
    })
  }

  const clearCurrentPage = () => {
    setPageAnnotations((prev) => {
      const updated = { ...prev, [currentPage]: [] }
      if (drawCanvasRef.current) {
        const ctx = drawCanvasRef.current.getContext('2d')
        ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height)
      }
      return updated
    })
  }

  // Export Annotated PDF
  const handleSaveAnnotatedPdf = async () => {
    if (!file || !fileBuffer) return

    setSaving(true)
    setError(null)

    try {
      const { PDFDocument } = window.PDFLib || (await import('pdf-lib'))
      const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true })
      const pages = pdfDoc.getPages()

      // For every page that has annotations, render its overlay canvas to PNG and embed
      for (let pNum = 1; pNum <= pages.length; pNum++) {
        const items = pageAnnotations[pNum] || []
        if (items.length === 0) continue

        const p = pages[pNum - 1]
        const { width: pWidth, height: pHeight } = p.getSize()

        // Create temporary canvas matching page dimensions
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = pWidth * 2
        tempCanvas.height = pHeight * 2
        const ctx = tempCanvas.getContext('2d')
        ctx.scale(2, 2)

        // Draw items scaled to actual PDF points
        items.forEach((item) => {
          ctx.save()
          ctx.strokeStyle = item.color
          ctx.fillStyle = item.color
          ctx.lineWidth = item.lineWidth
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'

          // Convert from preview scale (1.2) to PDF points
          const scaleFactor = 1 / 1.2

          if (item.tool === 'highlighter') {
            ctx.globalAlpha = 0.35
            ctx.lineWidth = item.lineWidth * 3
          }

          if (item.tool === 'pen' || item.tool === 'highlighter') {
            if (item.points.length > 1) {
              ctx.beginPath()
              ctx.moveTo(item.points[0].x * scaleFactor, item.points[0].y * scaleFactor)
              for (let i = 1; i < item.points.length; i++) {
                ctx.lineTo(item.points[i].x * scaleFactor, item.points[i].y * scaleFactor)
              }
              ctx.stroke()
            }
          } else if (item.tool === 'rect') {
            ctx.strokeRect(
              item.x * scaleFactor,
              item.y * scaleFactor,
              item.width * scaleFactor,
              item.height * scaleFactor
            )
          } else if (item.tool === 'circle') {
            ctx.beginPath()
            ctx.ellipse(
              (item.x + item.width / 2) * scaleFactor,
              (item.y + item.height / 2) * scaleFactor,
              Math.abs((item.width / 2) * scaleFactor),
              Math.abs((item.height / 2) * scaleFactor),
              0,
              0,
              Math.PI * 2
            )
            ctx.stroke()
          } else if (item.tool === 'line') {
            ctx.beginPath()
            ctx.moveTo(item.x1 * scaleFactor, item.y1 * scaleFactor)
            ctx.lineTo(item.x2 * scaleFactor, item.y2 * scaleFactor)
            ctx.stroke()
          } else if (item.tool === 'arrow') {
            drawArrow(
              ctx,
              item.x1 * scaleFactor,
              item.y1 * scaleFactor,
              item.x2 * scaleFactor,
              item.y2 * scaleFactor,
              item.lineWidth
            )
          } else if (item.tool === 'text') {
            ctx.font = `${item.fontSize}px sans-serif`
            ctx.fillText(item.text, item.x * scaleFactor, item.y * scaleFactor)
          }

          ctx.restore()
        })

        const overlayDataUrl = tempCanvas.toDataURL('image/png')
        const overlayBytes = await fetch(overlayDataUrl).then((r) => r.arrayBuffer())
        const embeddedOverlay = await pdfDoc.embedPng(overlayBytes)

        p.drawImage(embeddedOverlay, {
          x: 0,
          y: 0,
          width: pWidth,
          height: pHeight
        })
      }

      const outputBytes = await pdfDoc.save()
      const outputFilename = `${file.name.replace(/\.pdf$/i, '')}_annotated.pdf`

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
      console.error('Annotation bake failed:', err)
      setError('Failed to export annotated PDF: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setFile(null)
    setFileBuffer(null)
    setPdfDocProxy(null)
    setPageAnnotations({})
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
            <Highlighter className="w-6 h-6 text-amber-500" />
            Annotate & Markup PDF
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Draw freehand markings, highlight text, add callout notes, rectangles, and arrows directly on pages.
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
              <p className="font-semibold text-white">Annotated PDF Exported Successfully</p>
              <p className="text-xs text-emerald-300 mt-0.5">
                All drawings and text markups have been baked permanently into the document.
              </p>
            </div>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Annotate Another File
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
            Select a PDF document to annotate
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Drag and drop or browse from your computer (never uploaded)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Annotation Toolbar & Style Controls */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
              {/* Tool Selection Grid */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-semibold">Markup Tools</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'pen', label: 'Pen', icon: Pencil },
                    { id: 'highlighter', label: 'Highlight', icon: Highlighter },
                    { id: 'text', label: 'Text Note', icon: Type },
                    { id: 'rect', label: 'Rectangle', icon: Square },
                    { id: 'circle', label: 'Circle', icon: Circle },
                    { id: 'arrow', label: 'Arrow', icon: ArrowRight },
                    { id: 'line', label: 'Line', icon: Minus }
                  ].map((t) => {
                    const Icon = t.icon
                    return (
                      <button
                        key={t.id}
                        onClick={() => setActiveTool(t.id)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-colors gap-1 ${
                          activeTool === t.id
                            ? 'border-amber-500 bg-amber-500/10 text-amber-300 shadow'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{t.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Color Picker Palette */}
              <div className="pt-2 border-t border-zinc-800">
                <label className="text-xs text-zinc-400 block mb-1.5 font-semibold">Color Palette</label>
                <div className="flex items-center gap-2">
                  {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#000000'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-full border-2 ${
                        color === c ? 'border-white scale-110' : 'border-transparent'
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-7 h-7 rounded-full border-0 bg-transparent cursor-pointer ml-auto"
                  />
                </div>
              </div>

              {/* Stroke Width Slider */}
              <div className="pt-2 border-t border-zinc-800">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-zinc-400">Stroke Thickness:</span>
                  <span className="text-zinc-200 font-semibold">{lineWidth}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Undo & Clear Controls */}
              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <button
                  onClick={undoAnnotation}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 hover:text-white"
                >
                  <Undo className="w-3.5 h-3.5" /> Undo Stroke
                </button>
                <button
                  onClick={clearCurrentPage}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Page
                </button>
              </div>
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
                onClick={handleSaveAnnotatedPdf}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving Annotations...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Save & Export PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: PDF Markup Canvas */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 px-4 py-2.5 rounded-xl text-xs">
              <span className="text-zinc-400">
                Page <span className="text-white font-semibold">{currentPage}</span> of {pageCount}
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

            <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-4 overflow-hidden flex justify-center items-center shadow-inner min-h-[520px] select-none">
              {/* PDF Background Canvas */}
              <canvas ref={pdfCanvasRef} className="max-w-full max-h-[600px] object-contain shadow-2xl rounded" />

              {/* Transparent Overlay Drawing Canvas */}
              <canvas
                ref={drawCanvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="absolute top-4 left-1/2 -translate-x-1/2 max-w-full max-h-[600px] object-contain cursor-crosshair touch-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
