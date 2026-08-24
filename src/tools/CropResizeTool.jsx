import React, { useState } from 'react'
import { FileUp, File, CheckCircle2, RefreshCw, Maximize2 } from 'lucide-react'

export default function CropResizeTool() {
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [resizeFormat, setResizeFormat] = useState('original') // 'original', 'a4', 'letter', 'legal', 'a3'
  const [cropLeft, setCropLeft] = useState(0)
  const [cropRight, setCropRight] = useState(0)
  const [cropTop, setCropTop] = useState(0)
  const [cropBottom, setCropBottom] = useState(0)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Standard sizes in points (1 inch = 72 points)
  const formatSizes = {
    a4: { width: 595.27, height: 841.89 },
    letter: { width: 612.0, height: 792.0 },
    legal: { width: 612.0, height: 1008.0 },
    a3: { width: 841.89, height: 1190.55 }
  }

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile || selectedFile.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.')
      return
    }

    setFile(selectedFile)
    setLoading(true)
    setSuccess(false)

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
      alert('Failed to inspect PDF. Make sure PDF-lib is loaded.')
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!file) return

    setLoading(true)
    setSuccess(false)
    try {
      const { PDFDocument } = window.PDFLib
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const pages = pdfDoc.getPages()

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]

        // 1. Resizing page if option selected
        if (resizeFormat !== 'original') {
          const targetSize = formatSizes[resizeFormat]
          if (targetSize) {
            page.setSize(targetSize.width, targetSize.height)
          }
        }

        // 2. Cropping margins (via CropBox updates)
        const left = parseFloat(cropLeft) || 0
        const right = parseFloat(cropRight) || 0
        const top = parseFloat(cropTop) || 0
        const bottom = parseFloat(cropBottom) || 0

        if (left > 0 || right > 0 || top > 0 || bottom > 0) {
          const { x, y, width, height } = page.getMediaBox()
          
          // Constrain CropBox to stay within MediaBox boundaries
          const newX = x + left
          const newY = y + bottom
          const newWidth = Math.max(10, width - (left + right))
          const newHeight = Math.max(10, height - (top + bottom))

          page.setCropBox(newX, newY, newWidth, newHeight)
        }
      }

      const modifiedPdfBytes = await pdfDoc.save()
      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' })

      if (window.download) {
        window.download(blob, `${file.name.replace('.pdf', '')}_modified.pdf`, 'application/pdf')
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${file.name.replace('.pdf', '')}_modified.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }

      setSuccess(true)
    } catch (err) {
      console.error('Failed to resize/crop PDF:', err)
      alert(`Modification failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Maximize2 className="w-5 h-5 text-blue-500" /> Crop &amp; Resize PDF
        </h2>
        <p className="text-zinc-400 text-xs">
          Change page layouts to A4 or other standard shapes, and trim margins client-side.
        </p>
      </div>

      {/* File Dropzone */}
      {!file ? (
        <label className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60 rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-700">
            <Maximize2 className="w-6 h-6 text-zinc-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <span className="text-sm font-semibold text-zinc-300">Click to upload or drag a PDF</span>
          <span className="text-zinc-500 text-xs">Only single PDF files are supported</span>
        </label>
      ) : (
        /* Configuration Form */
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <File className="w-8 h-8 text-blue-400 shrink-0" />
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-zinc-200 truncate max-w-[280px]">
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
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
            >
              Change File
            </button>
          </div>

          <div className="space-y-6">
            {/* Page Resize Config */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Resize Page Dimensions
              </h3>
              <select
                value={resizeFormat}
                onChange={(e) => setResizeFormat(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none"
              >
                <option value="original">Keep Original Page Dimensions</option>
                <option value="a4">Convert to A4 (595 x 841 pt)</option>
                <option value="letter">Convert to US Letter (612 x 792 pt)</option>
                <option value="legal">Convert to US Legal (612 x 1008 pt)</option>
                <option value="a3">Convert to A3 (841 x 1190 pt)</option>
              </select>
            </div>

            {/* Margin Cropping Config */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Crop Margins (Values in Points / px)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400">Left Crop</label>
                  <input
                    type="number"
                    min="0"
                    value={cropLeft}
                    onChange={(e) => setCropLeft(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400">Right Crop</label>
                  <input
                    type="number"
                    min="0"
                    value={cropRight}
                    onChange={(e) => setCropRight(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400">Top Crop</label>
                  <input
                    type="number"
                    min="0"
                    value={cropTop}
                    onChange={(e) => setCropTop(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400">Bottom Crop</label>
                  <input
                    type="number"
                    min="0"
                    value={cropBottom}
                    onChange={(e) => setCropBottom(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none"
                  />
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 leading-normal">
                Standard units are points (72 points = 1 inch). Increasing crop values will shift the display box inwards, trimming the layout pages.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end">
            <button
              disabled={loading}
              onClick={handleApply}
              className="px-6 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-blue-600/10 flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Applying Modifications...
                </>
              ) : (
                'Apply & Save PDF'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium px-4 py-3 rounded-xl">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Modifications compiled successfully! Your resized/cropped PDF has been downloaded.
        </div>
      )}
    </div>
  )
}
