import React, { useState, useRef, useEffect } from 'react'
import {
  Grid,
  Download,
  FileUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  LayoutGrid,
  Sliders,
  Sparkles
} from 'lucide-react'

export default function NUpTool() {
  const [file, setFile] = useState(null)
  const [fileBuffer, setFileBuffer] = useState(null)
  const [pageCount, setPageCount] = useState(0)

  // Layout Configuration
  const [nUpType, setNUpType] = useState('4') // '2' | '4' | '6' | '8' | '9' | '16'
  const [sheetSize, setSheetSize] = useState('a4') // 'a4' | 'letter' | 'a3'
  const [orientation, setOrientation] = useState('landscape') // 'portrait' | 'landscape'
  const [drawBorders, setDrawBorders] = useState(true)
  const [marginPadding, setMarginPadding] = useState(12)

  // Status
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF document.')
      return
    }

    setFile(selectedFile)
    setError(null)
    setSuccess(false)

    try {
      const buffer = await selectedFile.arrayBuffer()
      setFileBuffer(buffer)

      const { PDFDocument } = window.PDFLib || (await import('pdf-lib'))
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true })
      setPageCount(doc.getPageCount())
    } catch (err) {
      console.error('PDF inspect error:', err)
      setError('Failed to inspect PDF: ' + err.message)
    }
  }

  // Calculate Grid Dimension Rows & Cols
  const getGridConfig = () => {
    switch (nUpType) {
      case '2':
        return orientation === 'landscape' ? { cols: 2, rows: 1 } : { cols: 1, rows: 2 }
      case '4':
        return { cols: 2, rows: 2 }
      case '6':
        return orientation === 'landscape' ? { cols: 3, rows: 2 } : { cols: 2, rows: 3 }
      case '8':
        return orientation === 'landscape' ? { cols: 4, rows: 2 } : { cols: 2, rows: 4 }
      case '9':
        return { cols: 3, rows: 3 }
      case '16':
        return { cols: 4, rows: 4 }
      default:
        return { cols: 2, rows: 2 }
    }
  }

  const { cols, rows } = getGridConfig()
  const pagesPerSheet = cols * rows
  const resultingSheetCount = Math.ceil(pageCount / pagesPerSheet) || 0

  // Process N-up layout with PDF-Lib
  const handleGenerateNUp = async () => {
    if (!file || !fileBuffer) return

    setProcessing(true)
    setError(null)

    try {
      const { PDFDocument, rgb } = window.PDFLib || (await import('pdf-lib'))
      const srcDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true })
      const outDoc = await PDFDocument.create()

      // Sheet Dimensions in points
      let baseW = 595.28 // A4 portrait
      let baseH = 841.89

      if (sheetSize === 'letter') {
        baseW = 612
        baseH = 792
      } else if (sheetSize === 'a3') {
        baseW = 841.89
        baseH = 1190.55
      }

      const sheetW = orientation === 'landscape' ? baseH : baseW
      const sheetH = orientation === 'landscape' ? baseW : baseH

      const cellW = (sheetW - marginPadding * (cols + 1)) / cols
      const cellH = (sheetH - marginPadding * (rows + 1)) / rows

      const srcPages = srcDoc.getPages()
      const totalSrcPages = srcPages.length

      for (let i = 0; i < totalSrcPages; i += pagesPerSheet) {
        const sheet = outDoc.addPage([sheetW, sheetH])

        for (let cellIdx = 0; cellIdx < pagesPerSheet; cellIdx++) {
          const pageIndex = i + cellIdx
          if (pageIndex >= totalSrcPages) break

          const row = Math.floor(cellIdx / cols)
          const col = cellIdx % cols

          const cellX = marginPadding + col * (cellW + marginPadding)
          // PDF coordinates start from bottom-left
          const cellY = sheetH - marginPadding - (row + 1) * cellH - row * marginPadding

          // Draw tile border if enabled
          if (drawBorders) {
            sheet.drawRectangle({
              x: cellX,
              y: cellY,
              width: cellW,
              height: cellH,
              borderColor: rgb(0.75, 0.75, 0.75),
              borderWidth: 0.5,
              color: rgb(1, 1, 1)
            })
          }

          // Embed and scale source page
          const embeddedPage = await outDoc.embedPage(srcPages[pageIndex])
          const { width: origW, height: origH } = embeddedPage

          // Maintain aspect ratio inside cell
          const scale = Math.min((cellW - 8) / origW, (cellH - 8) / origH)
          const finalW = origW * scale
          const finalH = origH * scale

          const targetX = cellX + (cellW - finalW) / 2
          const targetY = cellY + (cellH - finalH) / 2

          sheet.drawPage(embeddedPage, {
            x: targetX,
            y: targetY,
            width: finalW,
            height: finalH
          })
        }
      }

      const outputBytes = await outDoc.save()
      const outputFilename = `${file.name.replace(/\.pdf$/i, '')}_${nUpType}up.pdf`

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
      console.error('N-up generation failed:', err)
      setError('Failed to generate N-up layout: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const reset = () => {
    setFile(null)
    setFileBuffer(null)
    setPageCount(0)
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
            <LayoutGrid className="w-6 h-6 text-violet-500" />
            N-up / Multiple Pages per Sheet
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Combine 2, 4, 6, 8, 9, or 16 pages onto a single sheet for presentation handouts and booklet printing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
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
              <p className="font-semibold text-white">N-up Document Generated Successfully</p>
              <p className="text-xs text-emerald-300 mt-0.5">
                {pageCount} source pages have been tiled into {resultingSheetCount} multi-page sheets.
              </p>
            </div>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Process Another File
          </button>
        </div>
      )}

      {/* Upload Zone */}
      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-800 hover:border-violet-500/50 bg-zinc-900/30 hover:bg-zinc-900/60 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group text-center"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 group-hover:bg-violet-500/10 flex items-center justify-center mb-4 transition-colors">
            <FileUp className="w-8 h-8 text-zinc-400 group-hover:text-violet-400 transition-colors" />
          </div>
          <h3 className="text-base font-semibold text-zinc-200 group-hover:text-white">
            Select a PDF document for N-up tiling
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Drag and drop or browse from your computer (never uploaded)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Layout Controls */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
              {/* N-up Grid Options */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-semibold">Pages per Sheet</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '2', label: '2-up (1x2)' },
                    { id: '4', label: '4-up (2x2)' },
                    { id: '6', label: '6-up (2x3)' },
                    { id: '8', label: '8-up (2x4)' },
                    { id: '9', label: '9-up (3x3)' },
                    { id: '16', label: '16-up (4x4)' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setNUpType(item.id)}
                      className={`p-2 rounded-xl border text-xs text-center font-medium transition-colors ${
                        nUpType === item.id
                          ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sheet Size & Orientation */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Sheet Format</label>
                  <select
                    value={sheetSize}
                    onChange={(e) => setSheetSize(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100"
                  >
                    <option value="a4">A4 (Standard)</option>
                    <option value="letter">US Letter</option>
                    <option value="a3">A3 (Poster / Ledger)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Orientation</label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100"
                  >
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </div>
              </div>

              {/* Margins & Border Toggles */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-zinc-400">Tile Margin Gap:</span>
                    <span className="text-zinc-200 font-semibold">{marginPadding}pt</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="30"
                    value={marginPadding}
                    onChange={(e) => setMarginPadding(Number(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                </div>

                <label className="flex items-center gap-2 pt-1 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={drawBorders}
                    onChange={(e) => setDrawBorders(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/20"
                  />
                  Draw thin separation cutting line around each page tile
                </label>
              </div>

              {/* Output stats */}
              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-400 space-y-1">
                <div className="flex justify-between">
                  <span>Input Pages:</span>
                  <span className="text-zinc-200 font-semibold">{pageCount} pages</span>
                </div>
                <div className="flex justify-between">
                  <span>Output Sheets:</span>
                  <span className="text-violet-400 font-semibold">{resultingSheetCount} sheets</span>
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
                onClick={handleGenerateNUp}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-violet-600/20"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Generating Sheets...
                  </>
                ) : (
                  <>
                    <LayoutGrid className="w-4 h-4" /> Export N-up PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Visual Layout Simulation */}
          <div className="lg:col-span-7 space-y-3">
            <div className="bg-zinc-900/60 border border-zinc-800 px-4 py-2.5 rounded-xl text-xs flex justify-between items-center">
              <span className="text-zinc-400">Sheet Layout Simulation ({cols} columns x {rows} rows)</span>
              <span className="text-zinc-500">{orientation.toUpperCase()}</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex justify-center items-center shadow-inner min-h-[460px]">
              <div
                style={{
                  aspectRatio: orientation === 'landscape' ? '1.414' : '0.707',
                  width: orientation === 'landscape' ? '92%' : '65%',
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
                }}
                className="bg-white rounded-lg shadow-2xl p-4 grid gap-2.5 border border-zinc-300"
              >
                {Array.from({ length: pagesPerSheet }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`rounded bg-zinc-100 flex flex-col items-center justify-center p-2 text-zinc-600 font-mono text-xs ${
                      drawBorders ? 'border border-dashed border-zinc-400' : 'border border-zinc-200'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-zinc-800">Page {idx + 1}</span>
                    <span className="text-[9px] text-zinc-400">Tile cell</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
