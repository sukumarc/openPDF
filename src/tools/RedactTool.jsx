import React, { useState, useRef, useEffect } from 'react'
import { EyeOff, Download, FileUp, RefreshCw, Trash2, CheckCircle2, AlertCircle, Layers, Square, Undo2 } from 'lucide-react'

export default function RedactTool() {
  const [file, setFile] = useState(null)
  const [doc, setDoc] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [activePage, setActivePage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Redaction boxes mapped by page number: { [pageNum]: [{ x, y, width, height, canvasWidth, canvasHeight }] }
  const [redactions, setRedactions] = useState({})
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState(null)
  const [currentBox, setCurrentBox] = useState(null)

  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const overlayCanvasRef = useRef(null)

  // Handle file upload
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
    setRedactions({})
    setActivePage(1)

    try {
      const buffer = await selectedFile.arrayBuffer()
      const loadingTask = window.pdfjsLib.getDocument({ data: buffer })
      const pdfDoc = await loadingTask.promise
      setDoc(pdfDoc)
      setPageCount(pdfDoc.numPages)
    } catch (err) {
      console.error('Failed to load PDF:', err)
      setError('Failed to parse PDF file: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Render current page onto canvas
  useEffect(() => {
    if (!doc || !activePage) return

    let isCancelled = false

    const renderPage = async () => {
      try {
        const page = await doc.getPage(activePage)
        const viewport = page.getViewport({ scale: 1.2 })

        const canvas = canvasRef.current
        const overlay = overlayCanvasRef.current
        if (!canvas || !overlay) return

        canvas.width = viewport.width
        canvas.height = viewport.height
        overlay.width = viewport.width
        overlay.height = viewport.height

        const ctx = canvas.getContext('2d')
        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise

        if (!isCancelled) {
          redrawOverlay()
        }
      } catch (err) {
        console.error('Failed to render page for redaction:', err)
      }
    }

    renderPage()

    return () => {
      isCancelled = true
    }
  }, [doc, activePage, redactions])

  // Redraw black boxes on overlay canvas
  const redrawOverlay = () => {
    const overlay = overlayCanvasRef.current
    if (!overlay) return
    const ctx = overlay.getContext('2d')
    ctx.clearRect(0, 0, overlay.width, overlay.height)

    const pageBoxes = redactions[activePage] || []
    ctx.fillStyle = '#000000'

    pageBoxes.forEach((box) => {
      ctx.fillRect(box.x, box.y, box.width, box.height)
    })
  }

  // Mouse drag drawing handlers
  const handleMouseDown = (e) => {
    const rect = overlayCanvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDrawing(true)
    setStartPos({ x, y })
    setCurrentBox({ x, y, width: 0, height: 0 })
  }

  const handleMouseMove = (e) => {
    if (!isDrawing || !startPos) return
    const rect = overlayCanvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const currentX = e.clientX - rect.left
    const currentY = e.clientY - rect.top

    const x = Math.min(startPos.x, currentX)
    const y = Math.min(startPos.y, currentY)
    const width = Math.abs(currentX - startPos.x)
    const height = Math.abs(currentY - startPos.y)

    const box = { x, y, width, height }
    setCurrentBox(box)

    // Draw live preview rectangle
    redrawOverlay()
    const ctx = overlayCanvasRef.current.getContext('2d')
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 1.5
    ctx.fillRect(x, y, width, height)
    ctx.strokeRect(x, y, width, height)
  }

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox || currentBox.width < 5 || currentBox.height < 5) {
      setIsDrawing(false)
      setStartPos(null)
      setCurrentBox(null)
      redrawOverlay()
      return
    }

    const overlay = overlayCanvasRef.current
    const newBox = {
      ...currentBox,
      canvasWidth: overlay.width,
      canvasHeight: overlay.height
    }

    setRedactions((prev) => ({
      ...prev,
      [activePage]: [...(prev[activePage] || []), newBox]
    }))

    setIsDrawing(false)
    setStartPos(null)
    setCurrentBox(null)
  }

  const removeLastRedaction = () => {
    setRedactions((prev) => {
      const pageBoxes = [...(prev[activePage] || [])]
      pageBoxes.pop()
      return { ...prev, [activePage]: pageBoxes }
    })
  }

  const clearPageRedactions = () => {
    setRedactions((prev) => ({ ...prev, [activePage]: [] }))
  }

  // Apply redactions and save final PDF
  const handleApplyRedaction = async () => {
    if (!file) return
    setSaving(true)
    setError(null)

    try {
      const buffer = await file.arrayBuffer()
      const { PDFDocument, rgb } = window.PDFLib
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })

      const pages = pdfDoc.getPages()

      Object.keys(redactions).forEach((pageNumStr) => {
        const pageIndex = parseInt(pageNumStr, 10) - 1
        const page = pages[pageIndex]
        if (!page) return

        const pageBoxes = redactions[pageNumStr] || []
        const { width: pdfWidth, height: pdfHeight } = page.getSize()

        pageBoxes.forEach((box) => {
          // Translate top-left canvas coordinates to bottom-left PDF coordinates
          const scaleX = pdfWidth / box.canvasWidth
          const scaleY = pdfHeight / box.canvasHeight

          const drawX = box.x * scaleX
          const drawY = pdfHeight - (box.y + box.height) * scaleY
          const drawW = box.width * scaleX
          const drawH = box.height * scaleY

          page.drawRectangle({
            x: drawX,
            y: drawY,
            width: drawW,
            height: drawH,
            color: rgb(0, 0, 0)
          })
        })
      })

      const pdfBytes = await pdfDoc.save()
      if (window.download) {
        window.download(pdfBytes, `${file.name.replace(/\.pdf$/i, '')}_redacted.pdf`, 'application/pdf')
      }
      setSuccess(true)
    } catch (err) {
      console.error('Redaction save failed:', err)
      setError('Failed to apply redactions: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const totalRedactionsCount = Object.values(redactions).reduce((acc, curr) => acc + curr.length, 0)

  const reset = () => {
    setFile(null)
    setDoc(null)
    setRedactions({})
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
            <EyeOff className="w-6 h-6 text-blue-500" />
            Visual PDF Redactor
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Draw permanent black redaction boxes over sensitive text, numbers, or images before sharing.
          </p>
        </div>

        {file && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors w-fit"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Start Over
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
          <span>Redacted PDF created and downloaded successfully!</span>
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
            <EyeOff className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Select a PDF to Redact</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            Click and drag over sensitive sections to permanently burn solid black boxes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls Sidebar */}
          <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5 h-fit">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider text-zinc-400">
              Redaction Controls
            </h3>

            {/* Page Navigation */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300">Active Page</label>
              <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-xs">
                <button
                  onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                  disabled={activePage <= 1}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded text-zinc-200 font-semibold"
                >
                  Prev
                </button>
                <span className="font-mono text-zinc-300">
                  Page {activePage} of {pageCount}
                </span>
                <button
                  onClick={() => setActivePage((p) => Math.min(pageCount, p + 1))}
                  disabled={activePage >= pageCount}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded text-zinc-200 font-semibold"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Redaction Tools */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <label className="text-xs font-medium text-zinc-300">Page Actions</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={removeLastRedaction}
                  disabled={!(redactions[activePage] || []).length}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-xs text-zinc-300 rounded-lg transition-colors"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Undo</span>
                </button>

                <button
                  onClick={clearPageRedactions}
                  disabled={!(redactions[activePage] || []).length}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-30 text-xs text-red-400 border border-red-500/30 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Page</span>
                </button>
              </div>
            </div>

            {/* Redaction Count Stats */}
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-xs space-y-1 text-zinc-400">
              <div className="flex justify-between">
                <span>This Page:</span>
                <span className="text-zinc-200 font-semibold">{(redactions[activePage] || []).length} boxes</span>
              </div>
              <div className="flex justify-between">
                <span>Total Redactions:</span>
                <span className="text-zinc-200 font-semibold">{totalRedactionsCount} boxes</span>
              </div>
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApplyRedaction}
              disabled={saving || totalRedactionsCount === 0}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Applying Redactions...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Burn & Download PDF</span>
                </>
              )}
            </button>
          </div>

          {/* Interactive Canvas Canvas Area */}
          <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-between w-full text-xs text-zinc-400">
              <span className="font-semibold text-zinc-300">Click & Drag to draw black redaction boxes</span>
              <span className="text-[11px] text-zinc-500 font-mono">Page {activePage}</span>
            </div>

            <div className="relative bg-zinc-950 border border-zinc-800 rounded-xl overflow-auto max-h-[620px] max-w-full flex items-center justify-center p-2">
              <canvas ref={canvasRef} className="block shadow-lg" />
              <canvas
                ref={overlayCanvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="absolute top-2 left-2 cursor-crosshair"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
