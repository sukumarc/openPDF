import React, { useState } from 'react'
import { Scissors, File, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

export default function SplitTool() {
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [splitStrategy, setSplitStrategy] = useState('all') // 'all' or 'range'
  const [customRange, setCustomRange] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile || selectedFile.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.')
      return
    }

    setFile(selectedFile)
    setSuccess(false)
    setErrorMsg('')
    setLoading(true)

    try {
      if (!window.PDFLib) {
        throw new Error('PDF-lib dependency not loaded.')
      }

      const { PDFDocument } = window.PDFLib
      const arrayBuffer = await selectedFile.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      setPageCount(pdfDoc.getPageCount())
    } catch (err) {
      console.error('Error loading PDF details:', err)
      setErrorMsg('Failed to inspect PDF page count. Make sure the file is not corrupted.')
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  const parseRanges = (rangeStr, maxPages) => {
    const indices = []
    const parts = rangeStr.split(',')
    
    for (const part of parts) {
      const trimmed = part.trim()
      if (!trimmed) continue
      
      if (trimmed.includes('-')) {
        const bounds = trimmed.split('-')
        if (bounds.length !== 2) throw new Error(`Invalid range format: ${trimmed}`)
        const start = parseInt(bounds[0].trim(), 10)
        const end = parseInt(bounds[1].trim(), 10)
        
        if (isNaN(start) || isNaN(end)) throw new Error(`Invalid numbers in range: ${trimmed}`)
        if (start < 1 || end > maxPages || start > end) {
          throw new Error(`Range ${trimmed} is out of bounds (1 to ${maxPages})`)
        }
        
        for (let i = start; i <= end; i++) {
          indices.push(i - 1) // Convert to 0-indexed page index
        }
      } else {
        const page = parseInt(trimmed, 10)
        if (isNaN(page)) throw new Error(`Invalid page number: ${trimmed}`)
        if (page < 1 || page > maxPages) {
          throw new Error(`Page ${page} is out of bounds (1 to ${maxPages})`)
        }
        indices.push(page - 1) // Convert to 0-indexed page index
      }
    }
    return indices
  }

  const handleSplit = async () => {
    if (!file) return
    if (!window.PDFLib) {
      alert('PDF libraries are not initialized.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    setSuccess(false)

    try {
      const { PDFDocument } = window.PDFLib
      const arrayBuffer = await file.arrayBuffer()
      const srcDoc = await PDFDocument.load(arrayBuffer)

      if (splitStrategy === 'all') {
        // Option 1: Split every page individually and zip them
        if (!window.JSZip) {
          throw new Error('JSZip dependency is not loaded.')
        }

        const zip = new window.JSZip()
        
        for (let i = 0; i < pageCount; i++) {
          const singlePageDoc = await PDFDocument.create()
          const [copiedPage] = await singlePageDoc.copyPages(srcDoc, [i])
          singlePageDoc.addPage(copiedPage)
          
          const pdfBytes = await singlePageDoc.save()
          zip.file(`page_${i + 1}.pdf`, pdfBytes)
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' })
        
        if (window.download) {
          window.download(zipBlob, `${file.name.replace('.pdf', '')}_split_pages.zip`, 'application/zip')
        } else {
          triggerFileDownload(zipBlob, `${file.name.replace('.pdf', '')}_split_pages.zip`)
        }
      } else {
        // Option 2: Extract custom range as a single new PDF
        if (!customRange.trim()) {
          throw new Error('Please enter a custom page range.')
        }

        const targetIndices = parseRanges(customRange, pageCount)
        if (targetIndices.length === 0) {
          throw new Error('No valid pages found in range.')
        }

        const extractDoc = await PDFDocument.create()
        const copiedPages = await extractDoc.copyPages(srcDoc, targetIndices)
        copiedPages.forEach((page) => extractDoc.addPage(page))

        const pdfBytes = await extractDoc.save()
        const blob = new Blob([pdfBytes], { type: 'application/pdf' })

        if (window.download) {
          window.download(blob, `${file.name.replace('.pdf', '')}_extracted.pdf`, 'application/pdf')
        } else {
          triggerFileDownload(blob, `${file.name.replace('.pdf', '')}_extracted.pdf`)
        }
      }

      setSuccess(true)
    } catch (err) {
      console.error('PDF Splitting error:', err)
      setErrorMsg(err.message || 'Failed to split PDF file.')
    } finally {
      setLoading(false)
    }
  }

  const triggerFileDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Scissors className="w-5 h-5 text-blue-500" /> Split PDF
        </h2>
        <p className="text-zinc-400 text-xs">
          Extract selected pages or split all pages into individual files entirely in your browser.
        </p>
      </div>

      {/* File dropzone if no file selected */}
      {!file ? (
        <label className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60 rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-700">
            <Scissors className="w-6 h-6 text-zinc-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <span className="text-sm font-semibold text-zinc-300">Click to upload or drag a PDF</span>
          <span className="text-zinc-500 text-xs">Only single PDF files are supported</span>
        </label>
      ) : (
        /* Document configuration area */
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <File className="w-8 h-8 text-blue-400 shrink-0" />
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-zinc-200 truncate max-w-[320px]">
                  {file.name}
                </p>
                <p className="text-zinc-500 text-xs font-medium">
                  {pageCount} pages • {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null)
                setSuccess(false)
                setErrorMsg('')
              }}
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-955 border border-zinc-850 hover:border-zinc-750 px-3 py-1.5 rounded-lg"
            >
              Change File
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Splitting Strategy
            </h3>

            {/* Split options radios */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label
                onClick={() => setSplitStrategy('all')}
                className={`p-4 rounded-xl border flex flex-col gap-1 cursor-pointer transition-colors ${
                  splitStrategy === 'all'
                    ? 'bg-blue-600/10 border-blue-500 text-zinc-100'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="text-sm font-bold">Split All Pages</span>
                <span className="text-[11px] leading-relaxed">
                  Extracts every page as an individual file and downloads them as a single `.zip` folder.
                </span>
              </label>

              <label
                onClick={() => setSplitStrategy('range')}
                className={`p-4 rounded-xl border flex flex-col gap-1 cursor-pointer transition-colors ${
                  splitStrategy === 'range'
                    ? 'bg-blue-600/10 border-blue-500 text-zinc-100'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="text-sm font-bold">Custom Page Ranges</span>
                <span className="text-[11px] leading-relaxed">
                  Extracts selected pages and ranges into a single, merged PDF document.
                </span>
              </label>
            </div>

            {/* Range configuration input */}
            {splitStrategy === 'range' && (
              <div className="space-y-2 pt-2 animate-fadeIn">
                <label className="text-xs font-bold text-zinc-400">Specify Page Ranges</label>
                <input
                  type="text"
                  placeholder="e.g. 1-3, 5, 8-10"
                  value={customRange}
                  onChange={(e) => setCustomRange(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none placeholder:text-zinc-600"
                />
                <p className="text-[10px] text-zinc-500 leading-normal">
                  Use commas to separate values and dashes for ranges. Values must stay between 1 and {pageCount}. (e.g. "1-2, 4" will output pages 1, 2, and 4).
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end">
            <button
              disabled={loading || (splitStrategy === 'range' && !customRange.trim())}
              onClick={handleSplit}
              className="px-6 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-blue-600/10 flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Processing PDF...
                </>
              ) : (
                'Split PDF'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium px-4 py-3 rounded-xl">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Extraction successful! Your file has been compiled and downloaded.
        </div>
      )}

      {/* Error banner */}
      {errorMsg && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}
    </div>
  )
}
