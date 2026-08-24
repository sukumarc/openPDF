import React, { useState } from 'react'
import { FileUp, File, CheckCircle2, RefreshCw, FolderArchive } from 'lucide-react'

export default function PdfToZipTool() {
  const [file, setFile] = useState(null)
  const [pdfDocJs, setPdfDocJs] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [imageFormat, setImageFormat] = useState('jpeg') // 'jpeg', 'png'
  const [dpiScale, setDpiScale] = useState(1.5) // 1.0 (Web), 2.0 (High), 3.0 (Print)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
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
    setProgress(0)

    try {
      if (!window.pdfjsLib) {
        throw new Error('PDF.js dependency not loaded.')
      }

      const arrayBuffer = await selectedFile.arrayBuffer()
      const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer })
      const doc = await loadingTask.promise
      
      setPdfDocJs(doc)
      setPageCount(doc.numPages)
    } catch (err) {
      console.error('Error parsing PDF details:', err)
      alert('Failed to parse PDF file structures.')
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  const handleConvert = async () => {
    if (!file || !pdfDocJs) return

    if (!window.JSZip) {
      alert('Compression library (JSZip) is not initialized.')
      return
    }

    setLoading(true)
    setSuccess(false)
    setProgress(0)
    try {
      const zip = new window.JSZip()
      const formatString = imageFormat === 'jpeg' ? 'image/jpeg' : 'image/png'
      const ext = imageFormat === 'jpeg' ? 'jpg' : 'png'

      for (let i = 1; i <= pageCount; i++) {
        const page = await pdfDocJs.getPage(i)
        const viewport = page.getViewport({ scale: parseFloat(dpiScale) })

        const canvas = document.createElement('canvas')
        canvas.height = viewport.height
        canvas.width = viewport.width
        const context = canvas.getContext('2d')

        await page.render({ canvasContext: context, viewport }).promise

        // Extract base64 image data URL
        const dataUrl = canvas.toDataURL(formatString, 0.9)
        const base64Content = dataUrl.split(',')[1]

        zip.file(`page_${i}.${ext}`, base64Content, { base64: true })
        setProgress(Math.round((i / pageCount) * 100))
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })

      if (window.download) {
        window.download(zipBlob, `${file.name.replace('.pdf', '')}_pages.${ext}.zip`, 'application/zip')
      } else {
        const url = URL.createObjectURL(zipBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${file.name.replace('.pdf', '')}_pages.${ext}.zip`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }

      setSuccess(true)
    } catch (err) {
      console.error('PDF to ZIP conversion failed:', err)
      alert(`Conversion failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <FolderArchive className="w-5 h-5 text-blue-500" /> PDF to ZIP Images
        </h2>
        <p className="text-zinc-400 text-xs">
          Convert all pages of a PDF document into individual images and download them packaged in a single ZIP folder.
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
            <FolderArchive className="w-6 h-6 text-zinc-500 group-hover:text-blue-400 transition-colors" />
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
                  {pageCount} pages • {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null)
                setPdfDocJs(null)
                setProgress(0)
                setSuccess(false)
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
            >
              Change File
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image format config */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Output Image Format
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setImageFormat('jpeg')}
                  className={`py-2 px-4 rounded-lg border text-xs font-semibold text-center transition-colors select-none ${
                    imageFormat === 'jpeg'
                      ? 'bg-blue-600/10 border-blue-500 text-zinc-100'
                      : 'bg-zinc-950 border-zinc-850 text-zinc-450 hover:border-zinc-750 hover:text-zinc-200'
                  }`}
                >
                  JPEG Format
                </button>
                <button
                  onClick={() => setImageFormat('png')}
                  className={`py-2 px-4 rounded-lg border text-xs font-semibold text-center transition-colors select-none ${
                    imageFormat === 'png'
                      ? 'bg-blue-600/10 border-blue-500 text-zinc-100'
                      : 'bg-zinc-950 border-zinc-850 text-zinc-450 hover:border-zinc-750 hover:text-zinc-200'
                  }`}
                >
                  PNG Format
                </button>
              </div>
            </div>

            {/* DPI quality config */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Image Resolution (DPI Scale)
              </h3>
              <select
                value={dpiScale}
                onChange={(e) => setDpiScale(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none"
              >
                <option value="1.0">Standard Web Resolution (1.0x)</option>
                <option value="1.5">Medium / Preview Resolution (1.5x)</option>
                <option value="2.0">High Definition / Print (2.0x)</option>
                <option value="3.0">Archival Definition / Ultra (3.0x)</option>
              </select>
            </div>
          </div>

          {/* Progress bar */}
          {loading && progress > 0 && (
            <div className="space-y-2 pt-2 animate-fadeIn">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Rendering document canvas...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-850">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end">
            <button
              disabled={loading}
              onClick={handleConvert}
              className="px-6 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-blue-600/10 flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Generating Archive...
                </>
              ) : (
                'Convert & ZIP PDF'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium px-4 py-3 rounded-xl">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Extraction successful! Your image ZIP archive has been compiled and downloaded.
        </div>
      )}
    </div>
  )
}
