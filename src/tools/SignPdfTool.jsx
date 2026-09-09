import React, { useState, useRef, useEffect } from 'react'
import {
  PenTool,
  Type,
  Image as ImageIcon,
  Download,
  FileUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ShieldCheck,
  Move,
  ChevronLeft,
  ChevronRight,
  Stamp
} from 'lucide-react'

export default function SignPdfTool() {
  const [file, setFile] = useState(null)
  const [fileBuffer, setFileBuffer] = useState(null)
  const [pdfDocProxy, setPdfDocProxy] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageDimensions, setPageDimensions] = useState({ width: 600, height: 800 })

  // Mode: 'draw' | 'type' | 'upload'
  const [sigMode, setSigMode] = useState('draw')

  // Draw mode state
  const [isDrawing, setIsDrawing] = useState(false)
  const [penColor, setPenColor] = useState('#000000')
  const [penWidth, setPenWidth] = useState(3)
  const drawCanvasRef = useRef(null)

  // Type mode state
  const [typedName, setTypedName] = useState('')
  const [typedFont, setTypedFont] = useState('cursive')
  const [typedColor, setTypedColor] = useState('#000080')

  // Upload mode state
  const [uploadedSigUrl, setUploadedSigUrl] = useState(null)
  const uploadInputRef = useRef(null)

  // Active Signature Data URL
  const [signatureDataUrl, setSignatureDataUrl] = useState(null)

  // Placement Box State (percentages 0-100 for responsive alignment)
  const [sigPosition, setSigPosition] = useState({ x: 40, y: 75, width: 25, height: 10 })
  const [targetPages, setTargetPages] = useState('current') // 'current' | 'all' | 'last'
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Processing state
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const pdfCanvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const previewContainerRef = useRef(null)

  // Load PDF into PDF.js proxy
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

      if (!window.pdfjsLib) {
        throw new Error('PDF processing library not loaded. Please refresh.')
      }

      const loadingTask = window.pdfjsLib.getDocument({ data: buffer.slice(0) })
      const doc = await loadingTask.promise
      setPdfDocProxy(doc)
      setPageCount(doc.numPages)
      setCurrentPage(1)
    } catch (err) {
      console.error('Failed to load PDF:', err)
      setError('Failed to inspect PDF: ' + err.message)
    }
  }

  // Render current PDF page to canvas
  useEffect(() => {
    if (!pdfDocProxy || !pdfCanvasRef.current) return

    let isCancelled = false
    const renderPage = async () => {
      try {
        const page = await pdfDocProxy.getPage(currentPage)
        const viewport = page.getViewport({ scale: 1.2 })

        const canvas = pdfCanvasRef.current
        if (!canvas) return
        canvas.width = viewport.width
        canvas.height = viewport.height
        setPageDimensions({ width: viewport.width, height: viewport.height })

        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        await page.render({ canvasContext: ctx, viewport }).promise
      } catch (err) {
        if (!isCancelled) {
          console.error('Error rendering page:', err)
        }
      }
    }

    renderPage()
    return () => {
      isCancelled = true
    }
  }, [pdfDocProxy, currentPage])

  // Canvas drawing handlers
  const startDrawing = (e) => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.strokeStyle = penColor
    ctx.lineWidth = penWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    setIsDrawing(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      const canvas = drawCanvasRef.current
      if (canvas) {
        setSignatureDataUrl(canvas.toDataURL('image/png'))
      }
    }
  }

  const clearDrawing = () => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureDataUrl(null)
  }

  // Generate typed signature canvas
  useEffect(() => {
    if (sigMode !== 'type' || !typedName) return
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 120
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = typedColor
    ctx.font = `italic 42px ${typedFont}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(typedName, 200, 60)
    setSignatureDataUrl(canvas.toDataURL('image/png'))
  }, [typedName, typedFont, typedColor, sigMode])

  // Handle uploaded signature
  const handleSignatureUpload = (e) => {
    const imgFile = e.target.files?.[0]
    if (!imgFile) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const dataUrl = canvas.toDataURL('image/png')
        setUploadedSigUrl(dataUrl)
        setSignatureDataUrl(dataUrl)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(imgFile)
  }

  // Dragging signature on PDF Preview
  const handleDragStart = (e) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleDrag = (e) => {
    if (!isDragging || !previewContainerRef.current) return
    const rect = previewContainerRef.current.getBoundingClientRect()
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100

    setSigPosition((prev) => ({
      ...prev,
      x: Math.max(0, Math.min(100 - prev.width, prev.x + deltaX)),
      y: Math.max(0, Math.min(100 - prev.height, prev.y + deltaY))
    }))
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  // Sign and save PDF
  const handleSignPdf = async () => {
    if (!file || !fileBuffer || !signatureDataUrl) {
      setError('Please create or upload a signature and place it on the PDF.')
      return
    }

    setSigning(true)
    setError(null)

    try {
      const { PDFDocument } = window.PDFLib || (await import('pdf-lib'))
      const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true })

      // Fetch signature PNG bytes
      const sigImgBytes = await fetch(signatureDataUrl).then((r) => r.arrayBuffer())
      const embeddedSig = await pdfDoc.embedPng(sigImgBytes)

      const pages = pdfDoc.getPages()
      let pagesToSign = []

      if (targetPages === 'current') {
        pagesToSign = [pages[currentPage - 1]]
      } else if (targetPages === 'all') {
        pagesToSign = pages
      } else if (targetPages === 'last') {
        pagesToSign = [pages[pages.length - 1]]
      }

      pagesToSign.forEach((p) => {
        const { width: pWidth, height: pHeight } = p.getSize()
        const sigW = (sigPosition.width / 100) * pWidth
        const sigH = (sigPosition.height / 100) * pHeight
        const sigX = (sigPosition.x / 100) * pWidth
        // PDF coordinates are (0,0) at bottom-left
        const sigY = pHeight - (sigPosition.y / 100) * pHeight - sigH

        p.drawImage(embeddedSig, {
          x: sigX,
          y: sigY,
          width: sigW,
          height: sigH
        })
      })

      const signedBytes = await pdfDoc.save()
      const outputName = `${file.name.replace(/\.pdf$/i, '')}_signed.pdf`

      if (window.download) {
        window.download(signedBytes, outputName, 'application/pdf')
      } else {
        const blob = new Blob([signedBytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = outputName
        a.click()
        URL.revokeObjectURL(url)
      }

      setSuccess(true)
    } catch (err) {
      console.error('Signing failed:', err)
      setError('Failed to stamp signature: ' + err.message)
    } finally {
      setSigning(false)
    }
  }

  const reset = () => {
    setFile(null)
    setFileBuffer(null)
    setPdfDocProxy(null)
    setPageCount(0)
    setCurrentPage(1)
    setSignatureDataUrl(null)
    setUploadedSigUrl(null)
    setTypedName('')
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
            <PenTool className="w-6 h-6 text-amber-500" />
            Sign PDF Document
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Draw, type, or upload transparent digital signatures with visual drag-and-drop placement.
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
              <p className="font-semibold text-white">PDF Signed & Saved Successfully</p>
              <p className="text-xs text-emerald-300 mt-0.5">
                Your signature has been permanently embedded onto the PDF.
              </p>
            </div>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sign Another
          </button>
        </div>
      )}

      {/* Main Container */}
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
            Select a PDF document to sign
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Drag and drop or browse from your computer (never uploaded)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Signature Generator Controls */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
              {/* Signature Mode Tabs */}
              <div className="flex p-1 bg-zinc-950 rounded-xl border border-zinc-800">
                <button
                  onClick={() => setSigMode('draw')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                    sigMode === 'draw'
                      ? 'bg-amber-500 text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" /> Draw
                </button>
                <button
                  onClick={() => setSigMode('type')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                    sigMode === 'type'
                      ? 'bg-amber-500 text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" /> Type
                </button>
                <button
                  onClick={() => setSigMode('upload')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                    sigMode === 'upload'
                      ? 'bg-amber-500 text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Upload
                </button>
              </div>

              {/* Mode 1: Draw Signature */}
              {sigMode === 'draw' && (
                <div className="space-y-3">
                  <div className="border border-zinc-700 bg-white rounded-xl overflow-hidden touch-none relative">
                    <canvas
                      ref={drawCanvasRef}
                      width={380}
                      height={140}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="w-full h-[140px] cursor-crosshair"
                    />
                    <button
                      type="button"
                      onClick={clearDrawing}
                      className="absolute bottom-2 right-2 p-1.5 bg-zinc-900/80 hover:bg-zinc-900 text-white rounded-lg text-xs flex items-center gap-1 shadow"
                    >
                      <Trash2 className="w-3 h-3" /> Clear
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">Color:</span>
                      {['#000000', '#000080', '#8b0000', '#006400'].map((col) => (
                        <button
                          key={col}
                          onClick={() => setPenColor(col)}
                          style={{ backgroundColor: col }}
                          className={`w-5 h-5 rounded-full border-2 ${
                            penColor === col ? 'border-amber-400 scale-110' : 'border-transparent'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">Width:</span>
                      <input
                        type="range"
                        min="1"
                        max="6"
                        value={penWidth}
                        onChange={(e) => setPenWidth(Number(e.target.value))}
                        className="w-20 accent-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Mode 2: Type Signature */}
              {sigMode === 'type' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder="Type your full name..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {['cursive', 'Caveat, cursive', 'Dancing Script, cursive', 'serif'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setTypedFont(f)}
                        className={`p-2 rounded-lg border text-xs text-center ${
                          typedFont === f
                            ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                        }`}
                        style={{ fontFamily: f }}
                      >
                        {typedName || 'Sample Signature'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode 3: Upload Image */}
              {sigMode === 'upload' && (
                <div className="space-y-3">
                  <div
                    onClick={() => uploadInputRef.current?.click()}
                    className="border border-dashed border-zinc-700 bg-zinc-950 rounded-xl p-6 text-center cursor-pointer hover:border-amber-500"
                  >
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleSignatureUpload}
                      className="hidden"
                    />
                    <ImageIcon className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
                    <p className="text-xs text-zinc-300 font-medium">Upload Signature PNG / JPG</p>
                    <p className="text-[11px] text-zinc-500">Transparent PNG recommended</p>
                  </div>
                </div>
              )}

              {/* Signature Size & Scale Controls */}
              <div className="space-y-3 pt-3 border-t border-zinc-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Signature Size:</span>
                  <span className="text-zinc-200 font-semibold">{sigPosition.width}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={sigPosition.width}
                  onChange={(e) =>
                    setSigPosition((prev) => ({
                      ...prev,
                      width: Number(e.target.value),
                      height: Number(e.target.value) * 0.4
                    }))
                  }
                  className="w-full accent-amber-500"
                />

                <div className="pt-2">
                  <label className="text-xs text-zinc-400 block mb-1.5">Apply Signature To:</label>
                  <select
                    value={targetPages}
                    onChange={(e) => setTargetPages(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="current">Current Page Only (Page {currentPage})</option>
                    <option value="all">All Pages ({pageCount} pages)</option>
                    <option value="last">Last Page Only (Page {pageCount})</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="px-4 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSignPdf}
                disabled={signing || !signatureDataUrl}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20"
              >
                {signing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Stamping...
                  </>
                ) : (
                  <>
                    <Stamp className="w-4 h-4" /> Embed Signature & Download
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Interactive PDF Placement Preview */}
          <div className="lg:col-span-7 space-y-3">
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

            <div
              ref={previewContainerRef}
              onMouseMove={handleDrag}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-4 overflow-hidden flex justify-center items-center select-none min-h-[500px]"
            >
              <canvas ref={pdfCanvasRef} className="max-w-full max-h-[600px] object-contain shadow-2xl rounded" />

              {/* Draggable signature overlay */}
              {signatureDataUrl && (
                <div
                  onMouseDown={handleDragStart}
                  style={{
                    left: `${sigPosition.x}%`,
                    top: `${sigPosition.y}%`,
                    width: `${sigPosition.width}%`,
                    height: `${sigPosition.height}%`
                  }}
                  className={`absolute border-2 border-dashed border-amber-500 bg-amber-500/10 rounded cursor-grab active:cursor-grabbing flex items-center justify-center p-1 group z-10 ${
                    isDragging ? 'opacity-80 scale-105' : ''
                  }`}
                >
                  <img
                    src={signatureDataUrl}
                    alt="Signature"
                    className="w-full h-full object-contain pointer-events-none"
                  />
                  <div className="absolute -top-6 left-0 bg-amber-500 text-zinc-950 text-[10px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                    <Move className="w-2.5 h-2.5" /> Drag to position
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
