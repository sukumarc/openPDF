import React, { useState, useEffect, useRef } from 'react'
import { File, CheckCircle2, RefreshCw, MoveLeft, MoveRight, Trash2, Copy, Plus } from 'lucide-react'

// Component to render individual page thumbnail using pdf.js
function PageThumbnail({ pdfDoc, pageNum }) {
  const canvasRef = useRef(null)
  const renderTaskRef = useRef(null)

  useEffect(() => {
    if (!pdfDoc) return

    let isMounted = true

    pdfDoc.getPage(pageNum).then((page) => {
      if (!isMounted) return

      const canvas = canvasRef.current
      if (!canvas) return

      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }

      const viewport = page.getViewport({ scale: 0.2 })
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
        className="max-h-full max-w-full shadow-lg object-contain"
      />
    </div>
  )
}

export default function OrganizeTool() {
  const [file, setFile] = useState(null)
  const [pdfDocJs, setPdfDocJs] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [pages, setPages] = useState([]) // Array of objects: { id: string, originalIndex: number }
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

      const initialPages = []
      for (let i = 0; i < doc.numPages; i++) {
        initialPages.push({
          id: `page-${Math.random()}-${i}`,
          originalIndex: i
        })
      }
      setPages(initialPages)
    } catch (err) {
      console.error('Error parsing PDF:', err)
      alert('Failed to load PDF. Check internet connection or cache status.')
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  const movePage = (index, direction) => {
    if (direction === 'left' && index === 0) return
    if (direction === 'right' && index === pages.length - 1) return

    const targetIndex = direction === 'left' ? index - 1 : index + 1
    setPages((prev) => {
      const updated = [...prev]
      const temp = updated[index]
      updated[index] = updated[targetIndex]
      updated[targetIndex] = temp
      return updated
    })
    setSuccess(false)
  }

  const duplicatePage = (index) => {
    setPages((prev) => {
      const updated = [...prev]
      const sourcePage = updated[index]
      updated.splice(index + 1, 0, {
        id: `page-${Math.random()}-${Date.now()}`,
        originalIndex: sourcePage.originalIndex
      })
      return updated
    })
    setSuccess(false)
  }

  const deletePage = (index) => {
    setPages((prev) => prev.filter((_, i) => i !== index))
    setSuccess(false)
  }

  const handleSave = async () => {
    if (!file || pages.length === 0) {
      alert('Document has no pages to export.')
      return
    }

    setLoading(true)
    try {
      const { PDFDocument } = window.PDFLib
      const arrayBuffer = await file.arrayBuffer()
      const srcDoc = await PDFDocument.load(arrayBuffer)
      
      const newDoc = await PDFDocument.create()
      const pageIndices = pages.map((p) => p.originalIndex)
      
      const copiedPages = await newDoc.copyPages(srcDoc, pageIndices)
      copiedPages.forEach((page) => newDoc.addPage(page))

      const modifiedPdfBytes = await newDoc.save()
      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' })

      if (window.download) {
        window.download(blob, `${file.name.replace('.pdf', '')}_reorganized.pdf`, 'application/pdf')
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${file.name.replace('.pdf', '')}_reorganized.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }

      setSuccess(true)
    } catch (err) {
      console.error('Failed to reorganize PDF:', err)
      alert(`Save failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-blue-500" /> Organize Pages
        </h2>
        <p className="text-zinc-400 text-xs">
          Reorder, duplicate, or delete pages in your document. Export a clean new PDF when done.
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
            <Plus className="w-6 h-6 text-zinc-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <span className="text-sm font-semibold text-zinc-300">Click to upload or drag a PDF</span>
          <span className="text-zinc-500 text-xs">Only single PDF files are supported</span>
        </label>
      ) : (
        /* Preview Grid and Toolbar */
        <div className="space-y-6 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <File className="w-8 h-8 text-blue-400 shrink-0" />
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-zinc-200 truncate max-w-[280px]">
                  {file.name}
                </p>
                <p className="text-zinc-500 text-xs font-medium">
                  {pageCount} original pages • {pages.length} active pages
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setFile(null)
                setPdfDocJs(null)
                setPages([])
                setSuccess(false)
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
            >
              Clear
            </button>
          </div>

          {/* Reordering Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-6 max-h-[420px] overflow-y-auto pr-1 py-2">
            {pages.map((page, idx) => (
              <div key={page.id} className="flex flex-col items-center gap-2 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800">
                <PageThumbnail
                  pdfDoc={pdfDocJs}
                  pageNum={page.originalIndex + 1}
                />
                
                {/* Visual Label */}
                <div className="text-[10px] font-bold text-zinc-400">
                  Pos {idx + 1} (Page {page.originalIndex + 1})
                </div>

                {/* Control Actions */}
                <div className="flex items-center gap-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => movePage(idx, 'left')}
                    className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
                  >
                    <MoveLeft className="w-3 h-3" />
                  </button>
                  <button
                    disabled={idx === pages.length - 1}
                    onClick={() => movePage(idx, 'right')}
                    className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
                  >
                    <MoveRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => duplicatePage(idx)}
                    className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100"
                    title="Duplicate Page"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deletePage(idx)}
                    className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:border-red-500 text-zinc-400 hover:text-red-500"
                    title="Delete Page"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end">
            <button
              disabled={loading || pages.length === 0}
              onClick={handleSave}
              className="px-6 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-blue-600/10 flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Saving Layout...
                </>
              ) : (
                'Save Reorganized PDF'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium px-4 py-3 rounded-xl">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          PDF compiled successfully! Your reorganized document has been downloaded.
        </div>
      )}
    </div>
  )
}
