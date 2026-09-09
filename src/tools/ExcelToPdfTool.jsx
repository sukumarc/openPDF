import React, { useState, useRef } from 'react'
import { FileSpreadsheet, Download, FileUp, RefreshCw, Eye, CheckCircle2, AlertCircle, Table } from 'lucide-react'

export default function ExcelToPdfTool() {
  const [file, setFile] = useState(null)
  const [workbook, setWorkbook] = useState(null)
  const [sheetNames, setSheetNames] = useState([])
  const [activeSheet, setActiveSheet] = useState('')
  const [sheetData, setSheetData] = useState([])
  const [loading, setLoading] = useState(false)
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // PDF Page Settings
  const [orientation, setOrientation] = useState('landscape') // 'landscape' | 'portrait'
  const [pageSize, setPageSize] = useState('a4') // 'a4' | 'letter'

  const fileInputRef = useRef(null)
  const tableContainerRef = useRef(null)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!/\.(xlsx|xls|csv)$/i.test(selectedFile.name)) {
      setError('Please upload a valid Excel (.xlsx, .xls) or CSV file.')
      return
    }

    setFile(selectedFile)
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      const buffer = await selectedFile.arrayBuffer()
      const XLSX = window.XLSX

      if (!XLSX) {
        throw new Error('Spreadsheet parser is loading, please try again.')
      }

      const wb = XLSX.read(buffer, { type: 'array' })
      setWorkbook(wb)
      setSheetNames(wb.SheetNames)

      const initialSheet = wb.SheetNames[0]
      setActiveSheet(initialSheet)
      loadSheetData(wb, initialSheet)
    } catch (err) {
      console.error('Failed to parse Excel:', err)
      setError('Failed to parse spreadsheet: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadSheetData = (wb, sheetName) => {
    const sheet = wb.Sheets[sheetName]
    const data = window.XLSX.utils.sheet_to_json(sheet, { header: 1 })
    setSheetData(data)
  }

  const handleSheetChange = (sheetName) => {
    setActiveSheet(sheetName)
    if (workbook) {
      loadSheetData(workbook, sheetName)
    }
  }

  const handleConvertToPdf = async () => {
    if (!sheetData.length || !file) return
    setConverting(true)
    setError(null)

    try {
      const { jsPDF } = window.jspdf

      const doc = new jsPDF({
        orientation: orientation,
        unit: 'pt',
        format: pageSize
      })

      // Title
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(`${file.name.replace(/\.[^/.]+$/, '')} - ${activeSheet}`, 40, 40)

      let startY = 60
      const margin = 40
      const pageWidth = doc.internal.pageSize.getWidth()
      const availableWidth = pageWidth - margin * 2

      // Compute column widths
      const maxCols = Math.max(...sheetData.map((r) => r.length))
      const colWidth = Math.min(120, availableWidth / (maxCols || 1))
      const rowHeight = 20

      doc.setFontSize(9)

      sheetData.forEach((row, rowIndex) => {
        // Page break check
        if (startY + rowHeight > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage()
          startY = margin
        }

        // Header style
        if (rowIndex === 0) {
          doc.setFillColor(37, 99, 235) // Blue header
          doc.rect(margin, startY, availableWidth, rowHeight, 'F')
          doc.setTextColor(255, 255, 255)
          doc.setFont('helvetica', 'bold')
        } else {
          doc.setFillColor(rowIndex % 2 === 0 ? 245 : 255, rowIndex % 2 === 0 ? 245 : 255, rowIndex % 2 === 0 ? 245 : 255)
          doc.rect(margin, startY, availableWidth, rowHeight, 'F')
          doc.setTextColor(30, 30, 30)
          doc.setFont('helvetica', 'normal')
        }

        // Draw row borders
        doc.setDrawColor(210, 210, 210)
        doc.rect(margin, startY, availableWidth, rowHeight)

        // Draw cell contents
        for (let c = 0; c < maxCols; c++) {
          const cellVal = row[c] !== undefined ? String(row[c]) : ''
          const cellX = margin + c * colWidth + 5
          doc.text(cellVal.substring(0, 18), cellX, startY + 14)
        }

        startY += rowHeight
      })

      doc.save(`${file.name.replace(/\.[^/.]+$/, '')}_${activeSheet}.pdf`)
      setSuccess(true)
    } catch (err) {
      console.error('Failed to convert Excel to PDF:', err)
      setError('PDF export failed: ' + err.message)
    } finally {
      setConverting(false)
    }
  }

  const reset = () => {
    setFile(null)
    setWorkbook(null)
    setSheetNames([])
    setSheetData([])
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
            <FileSpreadsheet className="w-6 h-6 text-blue-500" />
            Excel & CSV to PDF Converter
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Convert Excel workbooks (.xlsx, .xls) and CSV spreadsheets into formatted PDF tables locally.
          </p>
        </div>

        {file && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors w-fit"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Upload Another
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
          <span>Spreadsheet converted to PDF and downloaded successfully!</span>
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
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform border border-blue-500/20">
            <FileUp className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Select Excel (.xlsx, .xls) or CSV</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            Drop your spreadsheet here to format and convert to PDF.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Sidebar */}
          <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5 h-fit">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider text-zinc-400">
              PDF Formatting Settings
            </h3>

            {/* Sheet Selector */}
            {sheetNames.length > 1 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">Active Sheet</label>
                <select
                  value={activeSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                >
                  {sheetNames.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Orientation */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300">Orientation</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOrientation('landscape')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                    orientation === 'landscape'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                      : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:text-white'
                  }`}
                >
                  Landscape (Wide)
                </button>
                <button
                  onClick={() => setOrientation('portrait')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                    orientation === 'portrait'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                      : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:text-white'
                  }`}
                >
                  Portrait (Tall)
                </button>
              </div>
            </div>

            {/* Page Size */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300">Page Size</label>
              <div className="grid grid-cols-2 gap-2">
                {['a4', 'letter'].map((size) => (
                  <button
                    key={size}
                    onClick={() => setPageSize(size)}
                    className={`py-2 px-3 text-xs font-medium uppercase rounded-lg border transition-all ${
                      pageSize === size
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                        : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:text-white'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* File Info */}
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-xs space-y-1.5 text-zinc-400">
              <div className="flex justify-between">
                <span>Rows:</span>
                <span className="text-zinc-200 font-medium">{sheetData.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Columns:</span>
                <span className="text-zinc-200 font-medium">{sheetData[0]?.length || 0}</span>
              </div>
            </div>

            <button
              onClick={handleConvertToPdf}
              disabled={converting || loading || !sheetData.length}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {converting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Converting Table...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF Table</span>
                </>
              )}
            </button>
          </div>

          {/* Spreadsheet Table Preview */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Table className="w-4 h-4 text-blue-400" />
                Sheet Preview ({activeSheet})
              </h3>
              <span className="text-xs text-zinc-500">Showing first 25 rows</span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm text-zinc-400">Loading spreadsheet data...</p>
              </div>
            ) : (
              <div className="border border-zinc-800 rounded-xl overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <tbody>
                    {sheetData.slice(0, 25).map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={
                          rIdx === 0
                            ? 'bg-zinc-800 text-zinc-200 font-semibold border-b border-zinc-700'
                            : 'border-b border-zinc-850 hover:bg-zinc-850/50 text-zinc-300'
                        }
                      >
                        <td className="py-2 px-3 bg-zinc-950/80 text-zinc-500 font-mono text-[10px] w-8 border-r border-zinc-800 text-center select-none">
                          {rIdx + 1}
                        </td>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-2 px-3 border-r border-zinc-800/60 truncate max-w-[160px]">
                            {cell !== undefined ? String(cell) : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
