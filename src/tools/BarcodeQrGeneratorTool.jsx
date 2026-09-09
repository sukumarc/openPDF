import React, { useState } from 'react'
import {
  QrCode,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Grid,
  FileSpreadsheet,
  Upload,
  Plus,
  Trash2,
  Printer,
  Sliders,
  Type,
  LayoutGrid
} from 'lucide-react'

export default function BarcodeQrGeneratorTool() {
  const [codeType, setCodeType] = useState('qrcode') // 'qrcode', 'code128', 'ean13', 'upc'
  const [inputMode, setInputMode] = useState('single') // 'single', 'batch'

  // Single Item state
  const [singleValue, setSingleValue] = useState('https://openpdf.dev')
  const [singleCaption, setSingleCaption] = useState('OpenPDF Official')

  // Batch Items state
  const [batchText, setBatchText] = useState(
    'SKU-1001, Laptop Stand Pro\nSKU-1002, USB-C Dock 10-in-1\nSKU-1003, Wireless Mouse MX\nSKU-1004, Mechanical Keyboard RGB\nSKU-1005, 4K Monitor Arm Heavy\nSKU-1006, Noise-Cancelling Headset'
  )

  // Label Layout Settings
  const [template, setTemplate] = useState('avery5160') // 'avery5160' (3x10), 'avery5163' (2x5), 'grid3x8', 'single'
  const [pageSize, setPageSize] = useState('letter') // 'letter', 'a4'
  const [showBorder, setShowBorder] = useState(true)
  const [showCaption, setShowCaption] = useState(true)

  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [convertedPdfUrl, setConvertedPdfUrl] = useState(null)
  const [pdfSize, setPdfSize] = useState(null)

  // Parse batch items
  const getItemsToGenerate = () => {
    if (inputMode === 'single') {
      return [{ code: singleValue.trim(), caption: singleCaption.trim() }]
    }

    const lines = batchText.split('\n')
    const items = []
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const parts = trimmed.split(',')
      const code = parts[0]?.trim() || ''
      const caption = parts.slice(1).join(',').trim() || code
      if (code) {
        items.push({ code, caption })
      }
    }
    return items
  }

  // Render a single QR or Barcode onto an HTML5 Canvas
  const renderCodeToCanvas = async (value, type) => {
    const canvas = document.createElement('canvas')

    if (type === 'qrcode') {
      if (!window.QRCode) {
        throw new Error('QRCode library is loading. Please try again.')
      }
      canvas.width = 400
      canvas.height = 400
      await window.QRCode.toCanvas(canvas, value, {
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      })
    } else {
      // Barcode via JsBarcode
      if (!window.JsBarcode) {
        throw new Error('JsBarcode library is loading. Please try again.')
      }

      const format = type === 'code128' ? 'CODE128' : type === 'ean13' ? 'EAN13' : 'UPC'

      window.JsBarcode(canvas, value, {
        format: format,
        width: 3,
        height: 120,
        displayValue: false, // caption handled separately
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000'
      })
    }

    return canvas
  }

  const handleGeneratePdf = async () => {
    const items = getItemsToGenerate()
    if (items.length === 0) {
      setError('Please provide at least one code value.')
      return
    }

    setConverting(true)
    setProgress(10)
    setError('')

    try {
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib
      const pdfDoc = await PDFDocument.create()

      // Sheet Dimensions (Points)
      // US Letter: 612 x 792 pt
      // A4: 595.28 x 841.89 pt
      let sheetWidth = pageSize === 'a4' ? 595.28 : 612.0
      let sheetHeight = pageSize === 'a4' ? 841.89 : 792.0

      // Layout Grid parameters
      let cols = 3
      let rows = 10
      let marginX = 25
      let marginY = 36

      if (template === 'avery5160') {
        cols = 3
        rows = 10
        marginX = 20
        marginY = 36
      } else if (template === 'avery5163') {
        cols = 2
        rows = 5
        marginX = 30
        marginY = 36
      } else if (template === 'grid3x8') {
        cols = 3
        rows = 8
        marginX = 25
        marginY = 30
      } else if (template === 'single') {
        cols = 1
        rows = 1
        marginX = 40
        marginY = 40
      }

      const labelsPerPage = cols * rows
      const cellWidth = (sheetWidth - marginX * 2) / cols
      const cellHeight = (sheetHeight - marginY * 2) / rows

      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

      let currentPage = null
      const totalPagesNeeded = Math.ceil(items.length / labelsPerPage)

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const pageIdx = Math.floor(i / labelsPerPage)
        const itemOnPageIdx = i % labelsPerPage

        if (itemOnPageIdx === 0) {
          currentPage = pdfDoc.addPage([sheetWidth, sheetHeight])
        }

        const colIdx = itemOnPageIdx % cols
        const rowIdx = Math.floor(itemOnPageIdx / cols)

        // PDF coordinates: (0,0) is bottom-left
        const labelX = marginX + colIdx * cellWidth
        const labelY = sheetHeight - marginY - (rowIdx + 1) * cellHeight

        // Draw Label Boundary Box
        if (showBorder) {
          currentPage.drawRectangle({
            x: labelX + 3,
            y: labelY + 3,
            width: cellWidth - 6,
            height: cellHeight - 6,
            borderColor: rgb(0.85, 0.85, 0.88),
            borderWidth: 0.5,
            color: rgb(0.99, 0.99, 1.0)
          })
        }

        // Generate Code Canvas & Embed
        try {
          const canvas = await renderCodeToCanvas(item.code, codeType)
          const dataUrl = canvas.toDataURL('image/png')
          const base64Data = dataUrl.split(',')[1]
          const imgBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))

          const embeddedImg = await pdfDoc.embedPng(imgBytes)

          const captionHeight = showCaption ? 16 : 0
          const availCodeW = cellWidth - 16
          const availCodeH = cellHeight - 14 - captionHeight

          const scale = Math.min(availCodeW / embeddedImg.width, availCodeH / embeddedImg.height, 1)
          const imgDrawW = embeddedImg.width * scale
          const imgDrawH = embeddedImg.height * scale

          const imgX = labelX + (cellWidth - imgDrawW) / 2
          const imgY = labelY + captionHeight + (cellHeight - captionHeight - imgDrawH) / 2

          currentPage.drawImage(embeddedImg, {
            x: imgX,
            y: imgY,
            width: imgDrawW,
            height: imgDrawH
          })

          // Draw Caption Text
          if (showCaption && item.caption) {
            const maxChars = Math.floor(cellWidth / 6)
            const safeCaption =
              item.caption.length > maxChars ? item.caption.substring(0, maxChars - 3) + '...' : item.caption

            const captionFontSize = Math.min(9, Math.max(7, Math.floor(cellWidth / 25)))
            const textWidth = fontRegular.widthOfTextAtSize(safeCaption, captionFontSize)

            currentPage.drawText(safeCaption, {
              x: labelX + (cellWidth - textWidth) / 2,
              y: labelY + 6,
              size: captionFontSize,
              font: fontBold,
              color: rgb(0.15, 0.15, 0.2)
            })
          }
        } catch (codeErr) {
          console.warn(`Could not render code for "${item.code}":`, codeErr)
        }

        setProgress(Math.round(10 + ((i + 1) / items.length) * 85))
      }

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      setConvertedPdfUrl(url)
      setPdfSize((blob.size / 1024).toFixed(1) + ' KB')
      setProgress(100)
    } catch (err) {
      console.error('Barcode PDF Generator Error:', err)
      setError(err.message || 'Failed to generate barcode sheet PDF.')
    } finally {
      setConverting(false)
    }
  }

  const handleDownload = () => {
    if (!convertedPdfUrl) return
    const downloadName = `Barcode-${codeType.toUpperCase()}-Labels.pdf`

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
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  Batch QR & Barcode Sheet Generator
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400">
                    Label Sheets
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Generate print-ready Avery label sticker sheets and asset tags for QR codes, Code-128, and EAN-13 barcodes
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

        {/* Code Format & Input Selection */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-violet-400" />
              Symbology & Generator Mode
            </h3>

            {/* Mode Switcher */}
            <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
              <button
                onClick={() => setInputMode('single')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  inputMode === 'single' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Single Item
              </button>
              <button
                onClick={() => setInputMode('batch')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  inputMode === 'batch' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Bulk / Batch List
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setCodeType('qrcode')}
              className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                codeType === 'qrcode'
                  ? 'bg-violet-500/10 border-violet-500 text-violet-300'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <p className="text-xs font-bold text-zinc-200">2D QR Code</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">URLs, Text & Wi-Fi</p>
            </button>

            <button
              onClick={() => setCodeType('code128')}
              className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                codeType === 'code128'
                  ? 'bg-violet-500/10 border-violet-500 text-violet-300'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <p className="text-xs font-bold text-zinc-200">Code 128 Barcode</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Alphanumeric SKUs</p>
            </button>

            <button
              onClick={() => setCodeType('ean13')}
              className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                codeType === 'ean13'
                  ? 'bg-violet-500/10 border-violet-500 text-violet-300'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <p className="text-xs font-bold text-zinc-200">EAN-13 Retail</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">13-digit retail barcode</p>
            </button>

            <button
              onClick={() => setCodeType('upc')}
              className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                codeType === 'upc'
                  ? 'bg-violet-500/10 border-violet-500 text-violet-300'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <p className="text-xs font-bold text-zinc-200">UPC-A Standard</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">12-digit product code</p>
            </button>
          </div>
        </div>

        {/* Input Data Box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Type className="w-4 h-4 text-violet-400" />
            {inputMode === 'single' ? 'Code Value & Description' : 'Batch Code List (CSV / Comma Separated)'}
          </h3>

          {inputMode === 'single' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Code Payload / Value</label>
                <input
                  type="text"
                  value={singleValue}
                  onChange={(e) => setSingleValue(e.target.value)}
                  placeholder="e.g. https://domain.com or SKU-1002"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Human-Readable Label Caption</label>
                <input
                  type="text"
                  value={singleCaption}
                  onChange={(e) => setSingleCaption(e.target.value)}
                  placeholder="e.g. Product Inventory Tag"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder="Value, Caption per line..."
                rows={6}
                className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 font-mono leading-relaxed focus:outline-none focus:border-violet-500 resize-none"
              />
              <p className="text-[11px] text-zinc-500">
                Format: <code>Code_Value, Optional Caption</code> (one item per line). Total:{' '}
                {getItemsToGenerate().length} labels to generate.
              </p>
            </div>
          )}
        </div>

        {/* Sheet & Template Settings */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-violet-400" />
            Printable Label Sheet Template
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Sheet Template */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Sheet Template</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
              >
                <option value="avery5160">Avery 5160 (3×10 = 30 Labels)</option>
                <option value="avery5163">Avery 5163 (2×5 = 10 Large Labels)</option>
                <option value="grid3x8">Grid 3×8 (24 Labels)</option>
                <option value="single">Single Large Code Per Page</option>
              </select>
            </div>

            {/* Paper Size */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Paper Size</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
              >
                <option value="letter">US Letter (8.5 × 11.0 in)</option>
                <option value="a4">A4 (8.3 × 11.7 in)</option>
              </select>
            </div>

            {/* Show Border */}
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={showBorder}
                  onChange={(e) => setShowBorder(e.target.checked)}
                  className="rounded bg-zinc-950 border-zinc-700 text-violet-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                Draw Label Cut Borders
              </label>
            </div>

            {/* Show Caption */}
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={showCaption}
                  onChange={(e) => setShowCaption(e.target.checked)}
                  className="rounded bg-zinc-950 border-zinc-700 text-violet-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                Include Text Captions
              </label>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p className="text-xs text-zinc-500">
            Vector high-resolution barcodes and QR matrices rendered directly into standard printable PDF sheets.
          </p>

          <button
            onClick={handleGeneratePdf}
            disabled={converting}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 cursor-pointer transition-all"
          >
            {converting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Compiling Barcode Sheet ({progress}%)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Printable Label PDF</span>
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
                <h4 className="text-sm font-bold text-white">Printable Barcode Sheet Ready!</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Generated {getItemsToGenerate().length} label stickers • Size: {pdfSize}
                </p>
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              Download Sticker Sheet PDF
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
