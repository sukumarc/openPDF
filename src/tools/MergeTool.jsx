import React, { useState } from 'react'
import { FileUp, File, ArrowUp, ArrowDown, Trash2, CheckCircle2 } from 'lucide-react'

export default function MergeTool() {
  const [files, setFiles] = useState([])
  const [merging, setMerging] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(
      (file) => file.type === 'application/pdf'
    )
    setFiles((prev) => [...prev, ...selectedFiles])
    setSuccess(false)
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setSuccess(false)
  }

  const moveFile = (index, direction) => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === files.length - 1) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const updated = [...files]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    setFiles(updated)
    setSuccess(false)
  }

  const handleMerge = async () => {
    if (files.length < 2) {
      alert('Please add at least 2 PDF files to merge.')
      return
    }

    if (!window.PDFLib) {
      alert('PDF processing library (pdf-lib) is not loaded. Check internet connection or cache status.')
      return
    }

    setMerging(true)
    try {
      const { PDFDocument } = window.PDFLib
      const mergedDoc = await PDFDocument.create()

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer()
        const srcDoc = await PDFDocument.load(arrayBuffer)
        const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices())
        copiedPages.forEach((page) => mergedDoc.addPage(page))
      }

      const mergedPdfBytes = await mergedDoc.save()
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' })

      if (window.download) {
        window.download(blob, 'merged_document.pdf', 'application/pdf')
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'merged_document.pdf'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }

      setSuccess(true)
    } catch (err) {
      console.error('PDF Merging error:', err)
      alert(`Merging failed: ${err.message}`)
    } finally {
      setMerging(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <FileUp className="w-5 h-5 text-blue-500" /> Merge PDF files
        </h2>
        <p className="text-zinc-400 text-xs">
          Combine multiple PDF files into a single document. Reorder files to adjust the page sequence.
        </p>
      </div>

      {/* File Dropzone */}
      <label className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60 rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group">
        <input
          type="file"
          multiple
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-700">
          <FileUp className="w-6 h-6 text-zinc-500 group-hover:text-blue-400 transition-colors" />
        </div>
        <span className="text-sm font-semibold text-zinc-300">Click to upload or drag files</span>
        <span className="text-zinc-500 text-xs">Only PDF files are supported</span>
      </label>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-zinc-500 border-b border-zinc-800 pb-2">
            <span>Selected Files ({files.length})</span>
            <span>Arrange Order</span>
          </div>
          <div className="divide-y divide-zinc-800 max-h-[250px] overflow-y-auto pr-1">
            {files.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3 overflow-hidden">
                  <File className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-xs text-zinc-300 truncate max-w-[300px]">{file.name}</span>
                  <span className="text-[10px] text-zinc-500 shrink-0">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={idx === 0}
                    onClick={() => moveFile(idx, 'up')}
                    className="p-1 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={idx === files.length - 1}
                    onClick={() => moveFile(idx, 'down')}
                    className="p-1 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeFile(idx)}
                    className="p-1 rounded bg-zinc-950 border border-zinc-800 hover:border-red-500 text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-800">
            <button
              onClick={() => setFiles([])}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
            >
              Clear All
            </button>
            <button
              disabled={files.length < 2 || merging}
              onClick={handleMerge}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-blue-600/10 flex items-center gap-1.5"
            >
              {merging ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Merging...
                </>
              ) : (
                'Merge PDFs'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium px-4 py-3 rounded-xl">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          PDF compilation complete! Your merged document has been downloaded.
        </div>
      )}
    </div>
  )
}
