import React, { useState } from 'react'
import { FileDown, File, CheckCircle2, RefreshCw, Sliders, ShieldCheck } from 'lucide-react'


export default function CompressTool() {
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [level, setLevel] = useState('medium') // 'light', 'medium', 'heavy'
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sizes, setSizes] = useState({ original: 0, compressed: 0 })
  const [wasDiscarded, setWasDiscarded] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile || selectedFile.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.')
      return
    }

    setFile(selectedFile)
    setLoading(true)
    setSuccess(false)
    setWasDiscarded(false)
    setProgress(0)
    setSizes({ original: selectedFile.size, compressed: 0 })

    try {
      if (!window.pdfjsLib) {
        throw new Error('PDF.js dependency not loaded.')
      }

      const arrayBuffer = await selectedFile.arrayBuffer()
      const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer })
      const doc = await loadingTask.promise
      setPageCount(doc.numPages)
    } catch (err) {
      console.error('Error reading PDF for compression:', err)
      alert('Failed to inspect PDF structure. Make sure libraries are available.')
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCompress = async () => {
    if (!file) return

    setLoading(true)
    setSuccess(false)
    setWasDiscarded(false)
    setProgress(0)

    try {
      // Map configuration presets matching the Ghostscript WASM background worker args
      const levelConfigs = {
        light: { preset: '/printer', color: 300, gray: 300, jpeg: 80 },
        medium: { preset: '/ebook', color: 150, gray: 150, jpeg: 60 },
        heavy: { preset: '/screen', color: 72, gray: 72, jpeg: 40 }
      }

      const activeConfig = levelConfigs[level]

      const result = await new Promise((resolve, reject) => {
        const psDataURL = URL.createObjectURL(file)
        const worker = new Worker('/background-worker.js')

        const cleanup = () => {
          URL.revokeObjectURL(psDataURL)
          worker.terminate()
        }

        worker.onmessage = async (e) => {
          if (e.data && e.data.type === 'progress') {
            const pageNum = e.data.page || 0
            const total = e.data.total || pageCount || 1
            setProgress(Math.round((pageNum / total) * 100))
            return
          }

          try {
            if (e.data.error) {
              throw new Error(e.data.error)
            }

            // Fetch compressed file from worker's output URL
            const response = await fetch(e.data.pdfDataURL)
            const arrayBuffer = await response.arrayBuffer()

            resolve({
              bytes: new Uint8Array(arrayBuffer),
              size: arrayBuffer.byteLength,
              wasFallback: e.data.wasFallback
            })
          } catch (err) {
            reject(err)
          } finally {
            cleanup()
          }
        }

        worker.onerror = (err) => {
          cleanup()
          reject(new Error('Ghostscript WebAssembly Worker failed to execute.'))
        }

        // Configuration mapping matching ihatepdf's structure
        const config = {
          quality: activeConfig.preset,
          contentType: 'auto',
          colorImageResolution: activeConfig.color,
          grayImageResolution: activeConfig.gray,
          monoImageResolution: 300,
          downsampling: 'Bicubic',
          embedFonts: true,
          optimizeFonts: true,
          jpegQuality: activeConfig.jpeg
        }

        // Post task to WebWorker
        worker.postMessage({
          data: { psDataURL, config },
          target: 'wasm'
        })
      })

      setSizes({
        original: file.size,
        compressed: result.size
      })
      setWasDiscarded(result.wasFallback)

      if (window.download) {
        window.download(result.bytes, `${file.name.replace('.pdf', '')}_compressed.pdf`, 'application/pdf')
      } else {
        const blob = new Blob([result.bytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${file.name.replace('.pdf', '')}_compressed.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }

      setSuccess(true)
    } catch (err) {
      console.error('PDF Compression failed:', err)
      alert(`Compression failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizesArr = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizesArr[i]
  }

  const savingsPercent = sizes.compressed
    ? Math.max(0, ((sizes.original - sizes.compressed) / sizes.original) * 100).toFixed(1)
    : 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <FileDown className="w-5 h-5 text-blue-500" /> Compress PDF (Ghostscript WASM)
        </h2>
        <p className="text-zinc-400 text-xs">
          Reduce the file size of your PDF document. Powered by Ghostscript WebAssembly running 100% locally.
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
            <FileDown className="w-6 h-6 text-zinc-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <span className="text-sm font-semibold text-zinc-300">Click to upload or drag a PDF</span>
          <span className="text-zinc-500 text-xs">Only single PDF files are supported</span>
        </label>
      ) : (
        /* Configuration UI */
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <File className="w-8 h-8 text-blue-400 shrink-0" />
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-zinc-200 truncate max-w-[280px]">
                  {file.name}
                </p>
                <p className="text-zinc-500 text-xs font-medium">
                  {pageCount} pages • {formatSize(sizes.original)}
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

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-zinc-500" /> Compression Quality
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setLevel('light')}
                className={`p-4 rounded-xl border flex flex-col gap-1 text-left transition-colors select-none ${level === 'light'
                    ? 'bg-blue-600/10 border-blue-500 text-zinc-100'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
              >
                <span className="text-xs font-bold">Light Compression</span>
                <span className="text-[10px] leading-normal text-zinc-500">
                  ~20–30% smaller. 300 DPI print quality. Optimizes font subsets & streams.
                </span>
              </button>

              <button
                onClick={() => setLevel('medium')}
                className={`p-4 rounded-xl border flex flex-col gap-1 text-left transition-colors select-none ${level === 'medium'
                    ? 'bg-blue-600/10 border-blue-500 text-zinc-100'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
              >
                <span className="text-xs font-bold">Medium Compression</span>
                <span className="text-[10px] leading-normal text-zinc-500">
                  ~40–50% smaller. 150 DPI for web & email. Re-compresses larger images.
                </span>
              </button>

              <button
                onClick={() => setLevel('heavy')}
                className={`p-4 rounded-xl border flex flex-col gap-1 text-left transition-colors select-none ${level === 'heavy'
                    ? 'bg-blue-600/10 border-blue-500 text-zinc-100'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
              >
                <span className="text-xs font-bold">Heavy Compression</span>
                <span className="text-[10px] leading-normal text-zinc-500">
                  ~60–70% smaller. 72 DPI screen resolution. Smallest size, draft quality.
                </span>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {loading && (
            <div className="space-y-2 pt-2 animate-fadeIn">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                  {progress > 0
                    ? `Optimizing streams and pages...`
                    : `Initializing Ghostscript WebAssembly runtime...`
                  }
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-850">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(3, progress)}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              100% Offline execution
            </div>
            <button
              disabled={loading}
              onClick={handleCompress}
              className="px-6 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-blue-600/10 flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Compressing PDF...
                </>
              ) : (
                'Compress PDF'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          {wasDiscarded ? (
            <div className="flex flex-col gap-1 text-blue-400 text-xs font-medium">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Original file was already fully optimized!</span>
              </div>
              <p className="text-zinc-500 pl-7 text-[10px]">
                Ghostscript wasm completed processing, but the output size was equal to or larger than your original file. We returned the original PDF to avoid size inflation.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Compression successful! Your file has been compiled and downloaded.
            </div>
          )}
          {sizes.compressed > 0 && !wasDiscarded && (
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-zinc-800 text-center">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Before</p>
                <p className="text-sm font-semibold text-zinc-300">{formatSize(sizes.original)}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">After</p>
                <p className="text-sm font-semibold text-zinc-100">{formatSize(sizes.compressed)}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Storage Saved</p>
                <p className="text-sm font-bold text-emerald-400">-{savingsPercent}%</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
