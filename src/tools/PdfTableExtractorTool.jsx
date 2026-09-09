import React, { useState, useEffect } from 'react'
import {
  FileSpreadsheet,
  FileUp,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Table as TableIcon,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  FileCode,
  FileText,
  RefreshCw,
  Plus,
  Trash2,
  Eye
} from 'lucide-react'

export default function PdfTableExtractorTool() {
  const [file, setFile] = useState(null)
  const [pdfDocProxy, setPdfDocProxy] = useState(null)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // Extracted Table Data: array of rows, where each row is an array of cell strings
  const [tableData, setTableData] = useState([])
  const [allPagesData, setAllPagesData] = useState({})
  const [yTolerance, setYTolerance] = useState(5) // pixel height tolerance for grouping rows

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file.')
      return
    }

    setFile(selectedFile)
    setError('')
    setTableData([])
    setAllPagesData({})
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
      setCurrentPage(1)
    } catch (err) {
      console.error('Failed to load PDF:', err)
      setError(err.message || 'Failed to inspect PDF.')
    } finally {
      setLoading(false)
    }
  }

  // Extract table structure from a specific page using spatial coordinates
  const extractTableFromPage = async (pageNum, docProxy = pdfDocProxy) => {
    if (!docProxy) return []
    setExtracting(true)
    setError('')

    try {
      const page = await docProxy.getPage(pageNum)
      const textContent = await page.getTextContent()
      const items = textContent.items

      if (!items || items.length === 0) {
        return []
      }

      // Filter out empty spaces
      const rawItems = items
        .filter((item) => item.str && item.str.trim() !== '')
        .map((item) => ({
          text: item.str.trim(),
          x: item.transform[4],
          y: item.transform[5],
          width: item.width || 10,
          height: item.height || 10
        }))

      // Group items into rows by Y coordinate (PDF origin is bottom-left)
      // Sort items descending by Y (top of page first)
      rawItems.sort((a, b) => b.y - a.y)

      const rows = []
      let currentRow = []
      let currentY = null

      for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i]

        if (currentY === null || Math.abs(currentY - item.y) <= yTolerance) {
          currentRow.push(item)
          currentY = item.y
        } else {
          // Sort items in completed row by X coordinate (left to right)
          currentRow.sort((a, b) => a.x - b.x)
          rows.push(currentRow)
          currentRow = [item]
          currentY = item.y
        }
      }

      if (currentRow.length > 0) {
        currentRow.sort((a, b) => a.x - b.x)
        rows.push(currentRow)
      }

      // Determine column boundaries across the entire page
      // Find all distinct X positions with small clustering tolerance
      const xPositions = []
      rows.forEach((row) => {
        row.forEach((cell) => {
          const matched = xPositions.find((x) => Math.abs(x - cell.x) <= 25)
          if (!matched) {
            xPositions.push(cell.x)
          }
        })
      })
      xPositions.sort((a, b) => a - b)

      const colCount = Math.max(xPositions.length, 1)

      // Map rows to normalized cell grid
      const grid = rows.map((row) => {
        const rowCells = new Array(colCount).fill('')
        row.forEach((item) => {
          // Find closest column index
          let closestIdx = 0
          let minDist = 999999
          for (let c = 0; c < xPositions.length; c++) {
            const dist = Math.abs(xPositions[c] - item.x)
            if (dist < minDist) {
              minDist = dist
              closestIdx = c
            }
          }

          if (rowCells[closestIdx]) {
            rowCells[closestIdx] += ' ' + item.text
          } else {
            rowCells[closestIdx] = item.text
          }
        })
        return rowCells
      })

      // Filter out completely empty rows
      const cleanGrid = grid.filter((r) => r.some((c) => c && c.trim()))
      return cleanGrid
    } catch (err) {
      console.error('Table extraction error:', err)
      setError(err.message || 'Failed to detect table structure.')
      return []
    } finally {
      setExtracting(false)
    }
  }

  // Extract on page change or doc load
  useEffect(() => {
    if (!pdfDocProxy) return

    const loadPage = async () => {
      if (allPagesData[currentPage]) {
        setTableData(allPagesData[currentPage])
      } else {
        const detected = await extractTableFromPage(currentPage)
        setTableData(detected)
        setAllPagesData((prev) => ({ ...prev, [currentPage]: detected }))
      }
    }

    loadPage()
  }, [pdfDocProxy, currentPage, yTolerance])

  // Extract all pages combined
  const handleExtractAllPages = async () => {
    if (!pdfDocProxy) return
    setExtracting(true)
    setError('')

    try {
      const combined = []
      for (let p = 1; p <= totalPages; p++) {
        const pageGrid = await extractTableFromPage(p)
        if (pageGrid.length > 0) {
          if (combined.length > 0 && totalPages > 1) {
            // Optional page divider marker row
            combined.push([`--- Page ${p} ---`])
          }
          combined.push(...pageGrid)
        }
      }
      setTableData(combined)
    } catch (err) {
      setError('Failed to extract all pages.')
    } finally {
      setExtracting(false)
    }
  }

  // Cell editing
  const handleCellChange = (rowIndex, colIndex, value) => {
    setTableData((prev) => {
      const next = prev.map((r) => [...r])
      if (next[rowIndex]) {
        next[rowIndex][colIndex] = value
      }
      return next
    })
  }

  const handleAddRow = () => {
    const colCount = tableData[0]?.length || 3
    setTableData((prev) => [...prev, new Array(colCount).fill('')])
  }

  const handleDeleteRow = (idx) => {
    setTableData((prev) => prev.filter((_, i) => i !== idx))
  }

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (tableData.length === 0) return

    if (!window.XLSX) {
      setError('Excel export library is loading. Please try again.')
      return
    }

    const ws = window.XLSX.utils.aoa_to_sheet(tableData)
    const wb = window.XLSX.utils.book_new()
    window.XLSX.utils.book_append_sheet(wb, ws, 'ExtractedTable')

    const baseName = file?.name ? file.name.replace(/\.pdf$/i, '') : 'Extracted-Data'
    const fileName = `${baseName}-Page${currentPage}.xlsx`

    window.XLSX.writeFile(wb, fileName)
  }

  // Export to CSV
  const handleExportCsv = () => {
    if (tableData.length === 0) return

    const csvContent = tableData
      .map((row) =>
        row
          .map((cell) => {
            const escaped = (cell || '').replace(/"/g, '""')
            return `"${escaped}"`
          })
          .join(',')
      )
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const baseName = file?.name ? file.name.replace(/\.pdf$/i, '') : 'Extracted-Data'
    const fileName = `${baseName}-Page${currentPage}.csv`

    if (window.download) {
      window.download(blob, fileName, 'text/csv')
    } else {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = fileName
      a.click()
    }
  }

  // Export to JSON
  const handleExportJson = () => {
    if (tableData.length === 0) return

    let outputJson = ''
    if (tableData.length > 1) {
      const headers = tableData[0]
      const rows = tableData.slice(1).map((r) => {
        const obj = {}
        headers.forEach((h, idx) => {
          const key = h && h.trim() ? h.trim() : `Column_${idx + 1}`
          obj[key] = r[idx] || ''
        })
        return obj
      })
      outputJson = JSON.stringify(rows, null, 2)
    } else {
      outputJson = JSON.stringify(tableData, null, 2)
    }

    const blob = new Blob([outputJson], { type: 'application/json' })
    const baseName = file?.name ? file.name.replace(/\.pdf$/i, '') : 'Extracted-Data'
    const fileName = `${baseName}-Page${currentPage}.json`

    if (window.download) {
      window.download(blob, fileName, 'application/json')
    } else {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = fileName
      a.click()
    }
  }

  // Copy TSV to Clipboard
  const handleCopyClipboard = () => {
    if (tableData.length === 0) return
    const tsv = tableData.map((row) => row.join('\t')).join('\n')
    navigator.clipboard.writeText(tsv)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  PDF Tables to Excel / CSV / JSON
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    Spatial AI
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Automatically detect tabular rows, column boundaries, and financial data in PDF documents for export to Excel, CSV, and JSON
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
          <div className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-8 md:p-12 text-center transition-colors bg-zinc-900/30 group">
            <input
              type="file"
              id="table-input"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="table-input"
              className="flex flex-col items-center justify-center cursor-pointer space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center group-hover:scale-105 group-hover:border-emerald-500/50 transition-all">
                <FileUp className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-200">Click to select PDF document with tables</p>
                <p className="text-xs text-zinc-500 mt-1">Extract financial sheets, invoices, schedules, and data tables</p>
              </div>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                Select PDF File
              </span>
            </label>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-emerald-500 rounded-full animate-spin"></div>
            <p className="text-sm text-zinc-400 font-medium">Scanning PDF text glyphs and spatial coordinates...</p>
          </div>
        )}

        {/* Step 2: Interactive Table Grid & Export */}
        {file && !loading && totalPages > 0 && (
          <div className="space-y-6">
            {/* Control Bar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Page Selector */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || extracting}
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded-lg text-zinc-200 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs text-zinc-300 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || extracting}
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded-lg text-zinc-200 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {totalPages > 1 && (
                  <button
                    onClick={handleExtractAllPages}
                    disabled={extracting}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${extracting ? 'animate-spin' : ''}`} />
                    Extract All Pages ({totalPages})
                  </button>
                )}

                {/* Sensitivity slider */}
                <div className="flex items-center gap-2 text-xs text-zinc-400 border-l border-zinc-800 pl-3">
                  <span>Row Grouping Tolerance:</span>
                  <select
                    value={yTolerance}
                    onChange={(e) => setYTolerance(Number(e.target.value))}
                    className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200"
                  >
                    <option value="3">Tight (3px)</option>
                    <option value="5">Standard (5px)</option>
                    <option value="8">Loose (8px)</option>
                    <option value="12">Wide (12px)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCopyClipboard}
                  disabled={tableData.length === 0}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-zinc-700 cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied TSV!' : 'Copy Table'}</span>
                </button>

                <button
                  onClick={handleExportCsv}
                  disabled={tableData.length === 0}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-zinc-700 cursor-pointer transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>CSV</span>
                </button>

                <button
                  onClick={handleExportJson}
                  disabled={tableData.length === 0}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-zinc-700 cursor-pointer transition-colors"
                >
                  <FileCode className="w-3.5 h-3.5 text-amber-400" />
                  <span>JSON</span>
                </button>

                <button
                  onClick={handleExportExcel}
                  disabled={tableData.length === 0}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Interactive Editable Table View */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
              <div className="bg-zinc-950/80 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-zinc-200">
                    Detected Table Grid ({tableData.length} Rows, {tableData[0]?.length || 0} Columns)
                  </span>
                </div>

                <button
                  onClick={handleAddRow}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
              </div>

              {extracting ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-3 border-zinc-800 border-t-emerald-500 rounded-full animate-spin"></div>
                  <p className="text-xs text-zinc-400">Extracting coordinates and segmenting cells...</p>
                </div>
              ) : tableData.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <TableIcon className="w-10 h-10 text-zinc-600 mx-auto" />
                  <p className="text-sm font-semibold text-zinc-300">No tabular text detected on Page {currentPage}</p>
                  <p className="text-xs text-zinc-500">
                    Try adjusting the row grouping tolerance above or navigate to a different page.
                  </p>
                </div>
              ) : (
                <div className="max-h-[480px] overflow-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-950 border-b border-zinc-800 sticky top-0 z-10">
                        <th className="p-2.5 text-zinc-500 w-10 text-center font-mono border-r border-zinc-800/80">#</th>
                        {tableData[0]?.map((_, colIdx) => (
                          <th
                            key={colIdx}
                            className="p-2.5 text-left text-zinc-300 font-semibold border-r border-zinc-800/80 last:border-r-0 bg-zinc-950"
                          >
                            Col {colIdx + 1}
                          </th>
                        ))}
                        <th className="p-2.5 w-10 text-center text-zinc-500"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {tableData.map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className={`hover:bg-zinc-800/40 transition-colors ${
                            rowIdx === 0 ? 'bg-zinc-900/90 font-semibold' : ''
                          }`}
                        >
                          <td className="p-2 text-center text-zinc-600 font-mono text-[10px] select-none border-r border-zinc-800/60">
                            {rowIdx + 1}
                          </td>
                          {row.map((cellVal, colIdx) => (
                            <td key={colIdx} className="p-1 border-r border-zinc-800/60 last:border-r-0">
                              <input
                                type="text"
                                value={cellVal}
                                onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                                className="w-full px-2 py-1 bg-transparent text-zinc-200 focus:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded"
                              />
                            </td>
                          ))}
                          <td className="p-1 text-center">
                            <button
                              onClick={() => handleDeleteRow(rowIdx)}
                              className="p-1 text-zinc-600 hover:text-red-400 rounded transition-colors"
                              title="Delete Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom Info Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
              <button
                onClick={() => {
                  setFile(null)
                  setPdfDocProxy(null)
                  setTableData([])
                }}
                className="text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
              >
                Upload different document
              </button>

              <p>All coordinate clustering runs directly in browser RAM with zero server processing.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
