import React, { useState, useEffect, useRef } from 'react'
import { RotateCw, File, RotateCcw, CheckCircle2, RefreshCw } from 'lucide-react'

// Component to render individual page thumbnail using pdf.js
function PageThumbnail({ pdfDoc, pageNum, rotation }) {
  const canvasRef = useRef(null)
  const renderTaskRef = useRef(null)

  useEffect(() => {
    if (!pdfDoc) return

    let isMounted = true

    pdfDoc.getPage(pageNum).then((page) => {
      if (!isMounted) return

      const canvas = canvasRef.current
      if (!canvas) return

      // Cancel previous render task if active
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }

      const viewport = page.getViewport({ scale: 0.25 })
      const context = canvas.getContext('2d')
      
      canvas.height = viewport.height
      canvas.width = viewport.width

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }

      const renderTask = page.render(renderContext)
      renderTaskRef.current = renderTask

      renderTask.promise.catch((err) => {
        if (err.name !== 'RenderingCancelledException') {
          console.error('Thumbnail render error:', err)
        }
      })
    })

    return () => {
      isMounted = false
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }
    }
  }, [pdfDoc, pageNum])

  return (
    <div className="relative border border-zinc-800 bg-zinc-950 rounded-lg p-2 flex items-center justify-center aspect-[3/4] overflow-hidden w-full">
      <canvas
        ref={canvasRef}
        style={{ transform: `rotate(${rotation}deg)` }}
        className="max-h-full max-w-full transition-transform duration-200 shadow-lg object-contain"
      />
      <div className="absolute bottom-2 left-2 bg-zinc-900/80 border border-zinc-800 px-1.5 py-0.5 rounded text-[9px] font-bold text-zinc-400">
        Page {pageNum}
      </div>
    </div>
  )
}

export default function RotateTool() {
  const [file, setFile] = useState(null)
  const [pdfDocJs, setPdfDocJs] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [rotations, setRotations] = useState([]) // Array of rotation degree angles per page
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

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
      if (!window.pdfjsLib) {
        throw new Error('PDF.js dependency not loaded.')
      }

      const arrayBuffer = await selectedFile.arrayBuffer()
      const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer })
      const doc = await loadingTask.promise
      
      setPdfDocJs(doc)
      setPageCount(doc.numPages)
      setRotations(new Array(doc.numPages).fill(0))
    } catch (err) {
      console.error('Error parsing PDF for preview:', err)
      alert('Failed to load PDF preview. Make sure PDF libraries are accessible.')
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  const rotatePage = (index, direction) => {
    const delta = direction === 'cw' ? 90 : -90
    setRotations((prev) => {
      const updated = [...prev]
      updated[index] = (updated[index] + delta) % 360
      return updated
    })
    setSuccess(false)
  }

  const rotateAll = (direction) => {
    const delta = direction === 'cw' ? 90 : -90
    setRotations((prev) => prev.map((angle) => (angle + delta) % 360))
    setSuccess(false)
  }

  const handleSave = async () => {
    if (!file || rotations.length === 0) return

    setLoading(true)
    try {
      const { PDFDocument } = window.PDFLib
      const arrayBuffer = await file.arrayBuffer()
      const srcDoc = await PDFDocument.load(arrayBuffer)
      const pages = srcDoc.getPages()

      for (let i = 0; i < pages.length; i++) {
        const addedRotation = rotations[i] || 0
        if (addedRotation === 0) continue

        const currentRotation = pages[i].getRotation().angle || 0
        // Apply the delta rotation safely in pdf-lib (must sum to multiple of 90)
        let finalRotation = (currentRotation + addedRotation) % 360
        if (finalRotation < 0) finalRotation += 360

        pages[i].setRotation({ angle: finalRotation })
      }

      const modifiedPdfBytes = await srcDoc.save()
      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' })

      if (window.download) {
        window.download(blob, `${file.name.replace('.pdf', '')}_rotated.pdf`, 'application/pdf')
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${file.name.replace('.pdf', '')}_rotated.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }

      setSuccess(true)
    } catch (err) {
      console.error('Failed to rotate PDF:', err)
      alert(`Rotation compilation failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <RotateCw className="w-5 h-5 text-blue-500" /> Rotate PDF Pages
        </h2>
        <p className="text-zinc-400 text-xs">
          Rotate individual pages or the entire document clockwise or counter-clockwise locally.
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
            <RotateCw className="w-6 h-6 text-zinc-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <span className="text-sm font-semibold text-zinc-300">Click to upload or drag a PDF</span>
          <span className="text-zinc-500 text-xs">Only single PDF files are supported</span>
        </label>
      ) : (
        /* Preview Grid and Toolbar */
        <div className="space-y-6 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4 gap-4">
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

            {/* Global controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => rotateAll('ccw')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Rotate All CCW
              </button>
              <button
                onClick={() => rotateAll('cw')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" /> Rotate All CW
              </button>
              <button
                onClick={() => {
                  setFile(null)
                  setPdfDocJs(null)
                  setRotations([])
                  setSuccess(false)
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Thumbnails Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-6 max-h-[420px] overflow-y-auto pr-1 py-2">
            {new Array(pageCount).fill(0).map((_, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <PageThumbnail
                  pdfDoc={pdfDocJs}
                  pageNum={idx + 1}
                  rotation={rotations[idx] || 0}
                />
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => rotatePage(idx, 'ccw')}
                    className="p-1.5 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => rotatePage(idx, 'cw')}
                    className="p-1.5 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end">
            <button
              disabled={loading}
              onClick={handleSave}
              className="px-6 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-blue-600/10 flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Saving Rotations...
                </>
              ) : (
                'Save Rotations'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium px-4 py-3 rounded-xl">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Rotations applied successfully! Your rotated PDF has been downloaded.
        </div>
      )}
    </div>
  )
}
