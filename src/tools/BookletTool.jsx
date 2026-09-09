import React, { useState } from 'react'
import {
  FileUp,
  Download,
  BookCopy,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  Info,
  Layers,
  Settings2,
  Printer,
  FoldHorizontal
} from 'lucide-react'

export default function BookletTool() {
  const [file, setFile] = useState(null)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [convertedPdfUrl, setConvertedPdfUrl] = useState(null)
  const [pdfSize, setPdfSize] = useState(null)

  // Booklet Options
  const [sheetFormat, setSheetFormat] = useState('a4') // 'a4', 'letter', 'a3'
  const [centerGutterMm, setCenterGutterMm] = useState(0) // 0 to 20 mm
  const [showFoldGuide, setShowFoldGuide] = useState(true)
  const [bindingType, setBindingType] = useState('saddle') // 'saddle', 'sidebyside'

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
      if (!window.PDFLib) {
        throw new Error('PDF-lib is loading. Please try again.')
      }

      const arrayBuffer = await selectedFile.arrayBuffer()
      const { PDFDocument } = window.PDFLib
      const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
      setTotalPages(srcDoc.getPageCount())
    } catch (err) {
      console.error('Failed to read PDF:', err)
      setError(err.message || 'Failed to inspect PDF.')
    } finally {
      setLoading(false)
    }
  }

  // Calculate booklet imposition schedule
  const getBookletSchedule = () => {
    if (totalPages === 0) return []

    const paddedTotal = Math.ceil(totalPages / 4) * 4
    const totalSheets = paddedTotal / 4
    const schedule = []

    for (let i = 0; i < totalSheets; i++) {
      // Front Spread (Outer)
      const frontLeft = paddedTotal - 2 * i
      const frontRight = 2 * i + 1

      // Back Spread (Inner)
      const backLeft = 2 * i + 2
      const backRight = paddedTotal - 2 * i - 1

      schedule.push({
        sheetNum: i + 1,
        front: {
          left: frontLeft <= totalPages ? frontLeft : null,
          right: frontRight <= totalPages ? frontRight : null
        },
        back: {
          left: backLeft <= totalPages ? backLeft : null,
          right: backRight <= totalPages ? backRight : null
        }
      })
    }

    return schedule
  }

  const handleCreateBooklet = async () => {
    if (!file || totalPages === 0) return
    setConverting(true)
    setProgress(10)
    setError('')

    try {
      const { PDFDocument, rgb } = window.PDFLib
      const arrayBuffer = await file.arrayBuffer()
      const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
      const bookletDoc = await PDFDocument.create()

      // Define Landscape Sheet Sizes in points (72 pt / inch, 1 mm = 2.83465 pt)
      let sheetWidth = 841.89 // A4 Landscape
      let sheetHeight = 595.28

      if (sheetFormat === 'letter') {
        sheetWidth = 792.0 // Letter Landscape (11 x 8.5 in)
        sheetHeight = 612.0
      } else if (sheetFormat === 'a3') {
        sheetWidth = 1190.55 // A3 Landscape
        sheetHeight = 841.89
      }

      const gutterPt = centerGutterMm * 2.83465
      const halfWidth = (sheetWidth - gutterPt) / 2
      const halfHeight = sheetHeight

      // Embed all source pages
      const embeddedPages = await bookletDoc.embedPdf(srcDoc)

      const paddedTotal = Math.ceil(totalPages / 4) * 4
      const totalSheets = paddedTotal / 4
      const schedule = getBookletSchedule()

      const drawSpread = (leftPageNum, rightPageNum, isBack) => {
        const page = bookletDoc.addPage([sheetWidth, sheetHeight])

        // Helper to draw embedded page scaled to fit half sheet
        const drawEmbedded = (pageNum, xOffset) => {
          if (!pageNum || pageNum > embeddedPages.length) return
          const embedded = embeddedPages[pageNum - 1]

          // Scale to fit halfWidth x halfHeight with 10pt safety margins
          const margin = 10
          const availW = halfWidth - margin * 2
          const availH = halfHeight - margin * 2

          const scale = Math.min(availW / embedded.width, availH / embedded.height, 1)
          const drawW = embedded.width * scale
          const drawH = embedded.height * scale

          const posX = xOffset + (halfWidth - drawW) / 2
          const posY = (halfHeight - drawH) / 2

          page.drawPage(embedded, {
            x: posX,
            y: posY,
            width: drawW,
            height: drawH
          })
        }

        // Draw Left Page
        drawEmbedded(leftPageNum, 0)

        // Draw Right Page
        drawEmbedded(rightPageNum, halfWidth + gutterPt)

        // Draw subtle fold guide line
        if (showFoldGuide) {
          page.drawLine({
            start: { x: sheetWidth / 2, y: 15 },
            end: { x: sheetWidth / 2, y: sheetHeight - 15 },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.85),
            dashArray: [4, 4]
          })
        }
      }

      for (let i = 0; i < totalSheets; i++) {
        const item = schedule[i]

        // 1. Draw Front Spread
        drawSpread(item.front.left, item.front.right, false)

        // 2. Draw Back Spread
        drawSpread(item.back.left, item.back.right, true)

        setProgress(Math.round(15 + ((i + 1) / totalSheets) * 80))
      }

      const pdfBytes = await bookletDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      setConvertedPdfUrl(url)
      setPdfSize((blob.size / 1024).toFixed(1) + ' KB')
      setProgress(100)
    } catch (err) {
      console.error('Booklet creation error:', err)
      setError(err.message || 'Failed to generate booklet imposition.')
    } finally {
      setConverting(false)
    }
  }

  const handleDownload = () => {
    if (!convertedPdfUrl || !file) return
    const originalName = file.name.replace(/\.pdf$/i, '')
    const downloadName = `${originalName}-Booklet-PrintReady.pdf`

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

  const schedule = getBookletSchedule()
  const paddedTotal = Math.ceil(totalPages / 4) * 4
  const blankPagesAdded = paddedTotal - totalPages

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-4 md:p-8">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <BookCopy className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  Booklet & Imposition Creator
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    Saddle-Stitch
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Automatically calculate 2-up double-sided booklet impositions ready for printing, folding, and binding
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
          <div className="border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 rounded-2xl p-8 md:p-12 text-center transition-colors bg-zinc-900/30 group">
            <input
              type="file"
              id="booklet-input"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="booklet-input"
              className="flex flex-col items-center justify-center cursor-pointer space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center group-hover:scale-105 group-hover:border-indigo-500/50 transition-all">
                <FileUp className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-200">Click to select PDF document</p>
                <p className="text-xs text-zinc-500 mt-1">Convert manuals, zines, and multi-page docs into folded booklets</p>
              </div>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
                Select PDF File
              </span>
            </label>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-sm text-zinc-400 font-medium">Analyzing page layout and calculating imposition schedule...</p>
          </div>
        )}

        {/* Step 2: Settings & Imposition Preview */}
        {file && !loading && totalPages > 0 && (
          <div className="space-y-6">
            {/* Imposition Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div>
                <span className="text-xs text-zinc-500">Source Document</span>
                <p className="text-sm font-semibold text-zinc-200 truncate mt-0.5">{file.name}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Source Pages</span>
                <p className="text-sm font-semibold text-indigo-400 mt-0.5">{totalPages} Pages</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Physical Sheets Needed</span>
                <p className="text-sm font-semibold text-zinc-200 mt-0.5">
                  {schedule.length} Sheets ({schedule.length * 2} Spreads)
                </p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Auto Padding</span>
                <p className="text-sm font-semibold text-zinc-200 mt-0.5">
                  {blankPagesAdded > 0 ? `+${blankPagesAdded} Blank Pages` : 'Exact 4x Multiple'}
                </p>
              </div>
            </div>

            {/* Imposition & Print Options */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-indigo-400" />
                Sheet Imposition & Print Settings
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Physical Sheet Size */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Physical Paper Sheet Size</label>
                  <select
                    value={sheetFormat}
                    onChange={(e) => setSheetFormat(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="a4">A4 Landscape (Creates A5 Booklet)</option>
                    <option value="letter">US Letter Landscape (Creates Half-Letter Booklet)</option>
                    <option value="a3">A3 Landscape (Creates A4 Booklet)</option>
                  </select>
                </div>

                {/* Center Fold Gutter */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                    Center Spine Gutter ({centerGutterMm} mm)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={centerGutterMm}
                    onChange={(e) => setCenterGutterMm(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-500 bg-zinc-800 h-1.5 rounded cursor-pointer mt-3"
                  />
                </div>

                {/* Guides Toggle */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Print Guides</label>
                  <div className="flex items-center h-[38px]">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                      <input
                        type="checkbox"
                        checked={showFoldGuide}
                        onChange={(e) => setShowFoldGuide(e.target.checked)}
                        className="rounded bg-zinc-950 border-zinc-700 text-indigo-500 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      Draw Center Fold Line (Dashed)
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Imposition Schedule Map */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FoldHorizontal className="w-4 h-4 text-indigo-400" />
                  Imposition Spread Mapping
                </h3>
                <span className="text-xs text-zinc-500 font-mono">
                  {schedule.length} Total Physical Sheets
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-2">
                {schedule.map((sheet) => (
                  <div
                    key={sheet.sheetNum}
                    className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-3 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-zinc-300 border-b border-zinc-800 pb-1.5">
                      <span>Sheet {sheet.sheetNum}</span>
                      <span className="text-[10px] text-indigo-400 uppercase font-mono">2-Up Landscape</span>
                    </div>

                    {/* Front Spread */}
                    <div className="flex items-center justify-between bg-zinc-900/60 p-2 rounded border border-zinc-800/40">
                      <span className="text-zinc-500 text-[11px]">Side 1 (Front):</span>
                      <div className="flex items-center gap-2 font-mono font-bold">
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                          {sheet.front.left ? `Page ${sheet.front.left}` : 'Blank'}
                        </span>
                        <span className="text-zinc-600">|</span>
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                          {sheet.front.right ? `Page ${sheet.front.right}` : 'Blank'}
                        </span>
                      </div>
                    </div>

                    {/* Back Spread */}
                    <div className="flex items-center justify-between bg-zinc-900/60 p-2 rounded border border-zinc-800/40">
                      <span className="text-zinc-500 text-[11px]">Side 2 (Back):</span>
                      <div className="flex items-center gap-2 font-mono font-bold">
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                          {sheet.back.left ? `Page ${sheet.back.left}` : 'Blank'}
                        </span>
                        <span className="text-zinc-600">|</span>
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                          {sheet.back.right ? `Page ${sheet.back.right}` : 'Blank'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Printing Instructions Banner */}
            <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3 text-xs text-indigo-200">
              <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-indigo-300">How to Print Your Booklet:</p>
                <p className="text-zinc-400 leading-relaxed">
                  1. Print using your standard printer with <strong>Double-Sided / Duplex</strong> enabled.
                  <br />
                  2. Select <strong>Flip on Short Edge</strong> (or Short-Edge Binding).
                  <br />
                  3. Stack the printed sheets in order, fold in half along the center guide, and staple the spine!
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                onClick={() => {
                  setFile(null)
                  setTotalPages(0)
                  setConvertedPdfUrl(null)
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
              >
                Upload different document
              </button>

              <button
                onClick={handleCreateBooklet}
                disabled={converting}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
              >
                {converting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Generating Imposition Booklet ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Print-Ready Booklet PDF</span>
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
                    <h4 className="text-sm font-bold text-white">Booklet PDF Imposed!</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Ready for 2-sided printing • {schedule.length * 2} Landscape Pages • Size: {pdfSize}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download Booklet PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
