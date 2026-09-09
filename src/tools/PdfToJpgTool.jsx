import React, { useState, useRef, useEffect } from 'react'
import { Image, Download, FileUp, Sparkles, RefreshCw, Layers, CheckCircle2, AlertCircle, Eye } from 'lucide-react'

export default function PdfToJpgTool() {
  const [file, setFile] = useState(null)
  const [doc, setDoc] = useState(null)
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Options
  const [format, setFormat] = useState('jpeg') // 'jpeg' | 'png'
  const [dpi, setDpi] = useState(150) // 150, 300, 600
  const [quality, setQuality] = useState(85) // 10 - 100 for JPEG

  const fileInputRef = useRef(null)

  // Handle PDF file selection
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.endsWith('.pdf')) {
      setError('Please select a valid PDF file.')
      return
    }

    setFile(selectedFile)
    setError(null)
    setSuccess(false)
    setLoading(true)
    setPages([])

    try {
      const buffer = await selectedFile.arrayBuffer()
      const loadingTask = window.pdfjsLib.getDocument({ data: buffer })
      const pdfDoc = await loadingTask.promise
      setDoc(pdfDoc)

      const pagePreviews = []
      const numPages = pdfDoc.numPages

      for (let i = 1; i <= Math.min(numPages, 12); i++) {
        const page = await pdfDoc.getPage(i)
        const viewport = page.getViewport({ scale: 0.3 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height

        await page.render({
          canvasContext: canvas.getContext('2d'),
          viewport: viewport
        }).promise

        pagePreviews.push({
          pageNumber: i,
          previewUrl: canvas.toDataURL('image/jpeg', 0.7)
        })
      }

      setPages(pagePreviews)
    } catch (err) {
      console.error('Failed to load PDF preview:', err)
      setError('Error loading PDF file: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Convert single page
  const convertPage = async (pageNumber, targetDpi) => {
    if (!doc) return null
    const page = await doc.getPage(pageNumber)
    const scale = targetDpi / 72
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height

    const ctx = canvas.getContext('2d', { alpha: false })
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise

    return new Promise((resolve) => {
      if (format === 'png') {
        canvas.toBlob((blob) => resolve(blob), 'image/png')
      } else {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality / 100)
      }
    })
  }

  // Download single page
  const handleDownloadSingle = async (pageNumber) => {
    try {
      setProcessing(true)
      const blob = await convertPage(pageNumber, dpi)
      if (blob && window.download) {
        const ext = format === 'png' ? 'png' : 'jpg'
        window.download(blob, `${file.name.replace(/\.pdf$/i, '')}_page_${pageNumber}.${ext}`, `image/${ext}`)
      }
    } catch (err) {
      setError('Failed to convert page: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  // Convert all pages and download as ZIP
  const handleDownloadAllZip = async () => {
    if (!doc || !file) return
    setProcessing(true)
    setProgress(0)
    setError(null)

    try {
      const zip = new window.JSZip()
      const total = doc.numPages
      const ext = format === 'png' ? 'png' : 'jpg'
      const baseName = file.name.replace(/\.pdf$/i, '')

      for (let i = 1; i <= total; i++) {
        const blob = await convertPage(i, dpi)
        if (blob) {
          zip.file(`${baseName}_page_${String(i).padStart(3, '0')}.${ext}`, blob)
        }
        setProgress(Math.round((i / total) * 100))
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      if (window.download) {
        window.download(zipBlob, `${baseName}_images.zip`, 'application/zip')
      }
      setSuccess(true)
    } catch (err) {
      console.error('ZIP conversion failed:', err)
      setError('Conversion failed: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const reset = () => {
    setFile(null)
    setDoc(null)
    setPages([])
    setError(null)
    setSuccess(false)
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Image className="w-6 h-6 text-blue-500" />
            PDF to JPG / PNG Converter
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Convert PDF pages into high-resolution images locally without server uploads.
          </p>
        </div>

        {file && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors w-fit"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Start Over
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
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
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform border border-blue-500/20">
            <FileUp className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Select a PDF file</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            Drop your PDF here to export crystal-clear images at 150, 300, or 600 DPI.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Sidebar */}
          <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-6 h-fit">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider text-zinc-400">
              Export Settings
            </h3>

            {/* Format Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300">Image Format</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFormat('jpeg')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                    format === 'jpeg'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                      : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:text-white'
                  }`}
                >
                  JPG (Compact)
                </button>
                <button
                  onClick={() => setFormat('png')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                    format === 'png'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                      : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:text-white'
                  }`}
                >
                  PNG (Lossless)
                </button>
              </div>
            </div>

            {/* DPI Preset */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300">Resolution (DPI)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: 150, label: '150 DPI', sub: 'Web' },
                  { val: 300, label: '300 DPI', sub: 'Print' },
                  { val: 600, label: '600 DPI', sub: 'HD' }
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => setDpi(item.val)}
                    className={`py-2 px-2 text-center rounded-lg border transition-all ${
                      dpi === item.val
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                        : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-semibold">{item.label}</div>
                    <div className="text-[10px] opacity-70">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* JPEG Quality Slider */}
            {format === 'jpeg' && (
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-zinc-300">JPEG Quality</span>
                  <span className="text-blue-400 font-semibold">{quality}%</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            )}

            {/* Document Info */}
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-xs space-y-1.5 text-zinc-400">
              <div className="flex justify-between">
                <span>File:</span>
                <span className="text-zinc-200 font-medium truncate max-w-[150px]">{file.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Pages:</span>
                <span className="text-zinc-200 font-medium">{doc?.numPages || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Original Size:</span>
                <span className="text-zinc-200 font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={handleDownloadAllZip}
              disabled={processing || loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Converting ({progress}%)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download All as ZIP</span>
                </>
              )}
            </button>

            {/* Progress Bar */}
            {processing && (
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
          </div>

          {/* Preview Grid */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Page Previews ({doc?.numPages || 0} pages)
              </h3>
              <span className="text-xs text-zinc-500">Click any page to download individually</span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm text-zinc-400">Rendering preview canvases...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto p-1 pr-2">
                {pages.map((p) => (
                  <div
                    key={p.pageNumber}
                    className="group relative bg-zinc-950 border border-zinc-800 hover:border-blue-500/50 rounded-xl p-3 flex flex-col items-center gap-2 transition-all shadow-md"
                  >
                    <div className="w-full aspect-[3/4] bg-zinc-900 rounded-lg overflow-hidden flex items-center justify-center border border-zinc-800/80">
                      <img
                        src={p.previewUrl}
                        alt={`Page ${p.pageNumber}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between w-full text-xs text-zinc-400 px-1">
                      <span className="font-medium">Page {p.pageNumber}</span>
                      <button
                        onClick={() => handleDownloadSingle(p.pageNumber)}
                        disabled={processing}
                        title="Download this page"
                        className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-blue-600 rounded-md transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
