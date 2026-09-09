import React, { useState, useRef, useEffect } from 'react'
import {
  Binary,
  Download,
  FileUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronLeft,
  ChevronRight,
  Hash
} from 'lucide-react'

export default function PageNumbersTool() {
  const [file, setFile] = useState(null)
  const [fileBuffer, setFileBuffer] = useState(null)
  const [pdfDocProxy, setPdfDocProxy] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  // Numbering Configuration
  const [formatType, setFormatType] = useState('page_n_of_total') // 'number_only' | 'page_n' | 'page_n_of_total' | 'bates' | 'custom'
  const [customFormat, setCustomFormat] = useState('Page {n} of {total}')
  const [batesPrefix, setBatesPrefix] = useState('DOC-')
  const [batesDigits, setBatesDigits] = useState(6)

  // Position: 'top_left' | 'top_center' | 'top_right' | 'bottom_left' | 'bottom_center' | 'bottom_right'
  const [position, setPosition] = useState('bottom_center')

  // Page range / skip cover
  const [startFromPage, setStartFromPage] = useState(1)
  const [firstNumber, setFirstNumber] = useState(1)

  // Font styling
  const [fontSize, setFontSize] = useState(11)
  const [fontColor, setFontColor] = useState('#4b5563')
  const [marginOffset, setMarginOffset] = useState(25)

  // Processing state
  const [processing, setProcessing] = useState(false)
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

  // Format string generator
  const getPageText = (docPageNum, totalPages) => {
    if (docPageNum < startFromPage) return ''
    const currentNumber = docPageNum - startFromPage + firstNumber

    if (formatType === 'number_only') {
      return `${currentNumber}`
    } else if (formatType === 'page_n') {
      return `Page ${currentNumber}`
    } else if (formatType === 'page_n_of_total') {
      return `Page ${currentNumber} of ${totalPages - startFromPage + 1}`
    } else if (formatType === 'bates') {
      const padded = String(currentNumber).padStart(batesDigits, '0')
      return `${batesPrefix}${padded}`
    } else if (formatType === 'custom') {
      return customFormat
        .replace('{n}', currentNumber)
        .replace('{total}', totalPages - startFromPage + 1)
    }
    return `${currentNumber}`
  }

  // Live Canvas Preview with simulated pagination text
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

        const text = getPageText(currentPage, pageCount)
        if (!text) return

        ctx.font = `${fontSize * 1.2}px sans-serif`
        ctx.fillStyle = fontColor

        const scaledMargin = marginOffset * 1.2
        let textX = canvas.width / 2
        let textY = canvas.height - scaledMargin
        let align = 'center'

        if (position.includes('left')) {
          textX = scaledMargin
          align = 'left'
        } else if (position.includes('right')) {
          textX = canvas.width - scaledMargin
          align = 'right'
        }

        if (position.includes('top')) {
          textY = scaledMargin + fontSize * 1.2
        }

        ctx.textAlign = align
        ctx.fillText(text, textX, textY)
      } catch (err) {
        if (!isCancelled) console.error('Preview error:', err)
      }
    }

    renderPreview()
    return () => {
      isCancelled = true
    }
  }, [
    pdfDocProxy,
    currentPage,
    formatType,
    customFormat,
    batesPrefix,
    batesDigits,
    position,
    startFromPage,
    firstNumber,
    fontSize,
    fontColor,
    marginOffset
  ])

  // Apply Page Numbers via PDF-Lib
  const handleApplyNumbers = async () => {
    if (!file || !fileBuffer) return

    setProcessing(true)
    setError(null)

    try {
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib || (await import('pdf-lib'))
      const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true })
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

      // Hex to RGB
      const r = parseInt(fontColor.slice(1, 3), 16) / 255
      const g = parseInt(fontColor.slice(3, 5), 16) / 255
      const b = parseInt(fontColor.slice(5, 7), 16) / 255

      const pages = pdfDoc.getPages()
      const totalPages = pages.length

      pages.forEach((p, idx) => {
        const pageNum = idx + 1
        const text = getPageText(pageNum, totalPages)
        if (!text) return

        const { width: pWidth, height: pHeight } = p.getSize()
        const textWidth = font.widthOfTextAtSize(text, fontSize)
        const textHeight = font.heightAtSize(fontSize)

        let x = (pWidth - textWidth) / 2
        let y = marginOffset

        if (position.includes('left')) {
          x = marginOffset
        } else if (position.includes('right')) {
          x = pWidth - textWidth - marginOffset
        }

        if (position.includes('top')) {
          y = pHeight - marginOffset - textHeight
        }

        p.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(r, g, b)
        })
      })

      const outputBytes = await pdfDoc.save()
      const outputFilename = `${file.name.replace(/\.pdf$/i, '')}_numbered.pdf`

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
      console.error('Page numbering failed:', err)
      setError('Failed to number PDF: ' + err.message)
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
            <Binary className="w-6 h-6 text-amber-500" />
            Page Numbers & Bates Stamping
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Add headers, footers, customizable pagination ("Page X of Y"), and legal Bates numbering.
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
              <p className="font-semibold text-white">Page Numbers Added Successfully</p>
              <p className="text-xs text-emerald-300 mt-0.5">
                The numbered document has been saved and downloaded.
              </p>
            </div>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Number Another File
          </button>
        </div>
      )}

      {/* File Upload Zone */}
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
            Select a PDF to add page numbers
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Drag and drop or browse from your computer (never uploaded)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Numbering Controls */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
              {/* Template Style Selection */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5">Numbering Format</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'page_n_of_total', label: 'Page 1 of 10' },
                    { id: 'page_n', label: 'Page 1' },
                    { id: 'number_only', label: '1, 2, 3...' },
                    { id: 'bates', label: 'Bates (DOC-000001)' },
                    { id: 'custom', label: 'Custom Template' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setFormatType(item.id)}
                      className={`p-2 rounded-xl border text-xs text-left font-medium transition-colors ${
                        formatType === item.id
                          ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bates Configuration */}
              {formatType === 'bates' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Prefix</label>
                    <input
                      type="text"
                      value={batesPrefix}
                      onChange={(e) => setBatesPrefix(e.target.value)}
                      placeholder="e.g. DOC-"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Digits: {batesDigits}</label>
                    <input
                      type="range"
                      min="3"
                      max="8"
                      value={batesDigits}
                      onChange={(e) => setBatesDigits(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Custom Format Input */}
              {formatType === 'custom' && (
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">
                    Template string (use {'{n}'} and {'{total}'})
                  </label>
                  <input
                    type="text"
                    value={customFormat}
                    onChange={(e) => setCustomFormat(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100"
                  />
                </div>
              )}

              {/* Position Grid (6 zones) */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5">Position on Page</label>
                <div className="grid grid-cols-3 gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                  {[
                    { id: 'top_left', label: 'Top Left' },
                    { id: 'top_center', label: 'Top Center' },
                    { id: 'top_right', label: 'Top Right' },
                    { id: 'bottom_left', label: 'Bottom Left' },
                    { id: 'bottom_center', label: 'Bottom Center' },
                    { id: 'bottom_right', label: 'Bottom Right' }
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => setPosition(pos.id)}
                      className={`py-2 px-1 text-[11px] rounded-lg text-center font-medium transition-colors ${
                        position === pos.id
                          ? 'bg-amber-500 text-zinc-950 font-bold'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Range & Start Controls */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Start on Page</label>
                  <input
                    type="number"
                    min="1"
                    max={pageCount || 1}
                    value={startFromPage}
                    onChange={(e) => setStartFromPage(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100"
                  />
                  <span className="text-[10px] text-zinc-500">Set to 2 to skip cover</span>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">First Number</label>
                  <input
                    type="number"
                    min="1"
                    value={firstNumber}
                    onChange={(e) => setFirstNumber(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100"
                  />
                  <span className="text-[10px] text-zinc-500">Initial count index</span>
                </div>
              </div>

              {/* Font Size & Color */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Font Size: {fontSize}pt</label>
                  <input
                    type="range"
                    min="8"
                    max="20"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                      className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-xs text-zinc-300 font-mono">{fontColor}</span>
                  </div>
                </div>
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
                onClick={handleApplyNumbers}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Numbering...
                  </>
                ) : (
                  <>
                    <Hash className="w-4 h-4" /> Apply & Download PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Live PDF Preview */}
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
