import React, { useState, useRef } from 'react'
import { Unlock, Lock, Eye, EyeOff, ShieldCheck, Download, FileUp, RefreshCw, CheckCircle2, AlertCircle, KeyRound, FileCheck, Layers } from 'lucide-react'

export default function UnlockPdfTool() {
  const [file, setFile] = useState(null)
  const [fileBuffer, setFileBuffer] = useState(null)
  const [isEncrypted, setIsEncrypted] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [downloadBlob, setDownloadBlob] = useState(null)
  const [previews, setPreviews] = useState([])

  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file.')
      return
    }

    setFile(selectedFile)
    setError(null)
    setSuccess(false)
    setDownloadBlob(null)
    setPreviews([])
    setPassword('')
    setLoading(true)

    try {
      const buffer = await selectedFile.arrayBuffer()
      setFileBuffer(buffer)

      // Check if PDF is encrypted using PDF.js
      if (!window.pdfjsLib) {
        throw new Error('PDF processing library not loaded. Please refresh the page.')
      }

      let requiresPassword = false
      let pdfDoc = null

      try {
        const loadingTask = window.pdfjsLib.getDocument({
          data: buffer.slice(0),
          onPassword: (callback, reason) => {
            requiresPassword = true
            setIsEncrypted(true)
          }
        })
        pdfDoc = await loadingTask.promise
      } catch (err) {
        if (err.name === 'PasswordException' || err.message?.toLowerCase().includes('password')) {
          requiresPassword = true
          setIsEncrypted(true)
        } else {
          throw err
        }
      }

      if (requiresPassword) {
        setIsEncrypted(true)
        setStats({
          status: 'Locked with Password',
          fileSize: (selectedFile.size / 1024).toFixed(1) + ' KB'
        })
      } else if (pdfDoc) {
        setIsEncrypted(false)
        setStats({
          status: 'No Open Password Required',
          pageCount: pdfDoc.numPages,
          fileSize: (selectedFile.size / 1024).toFixed(1) + ' KB'
        })
      }
    } catch (err) {
      console.error('Failed to read PDF:', err)
      setError('Failed to inspect PDF: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = async () => {
    if (!file || !fileBuffer) return

    setUnlocking(true)
    setError(null)
    setProgress(0)

    try {
      const { PDFDocument } = window.PDFLib || await import('pdf-lib')
      let unlockedDoc = null
      let totalPages = 0

      if (isEncrypted && !password) {
        setError('Please enter the password to unlock this document.')
        setUnlocking(false)
        return
      }

      // Try unlocking with PDF.js
      const loadingTask = window.pdfjsLib.getDocument({
        data: fileBuffer.slice(0),
        password: password || undefined
      })

      const pdfJsDoc = await loadingTask.promise
      totalPages = pdfJsDoc.numPages

      // Create a fresh unencrypted PDF document
      unlockedDoc = await PDFDocument.create()
      const previewUrls = []

      for (let i = 1; i <= totalPages; i++) {
        setProgress(Math.round((i / totalPages) * 100))
        const page = await pdfJsDoc.getPage(i)
        const viewport = page.getViewport({ scale: 2.0 })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')

        await page.render({ canvasContext: ctx, viewport }).promise

        const imgDataUrl = canvas.toDataURL('image/jpeg', 0.95)
        if (i <= 4) {
          previewUrls.push(imgDataUrl)
        }

        const imgBytes = await fetch(imgDataUrl).then((res) => res.arrayBuffer())
        const embeddedImage = await unlockedDoc.embedJpg(imgBytes)

        const pdfPage = unlockedDoc.addPage([viewport.width / 2, viewport.height / 2])
        pdfPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: viewport.width / 2,
          height: viewport.height / 2
        })
      }

      setPreviews(previewUrls)

      const outputBytes = await unlockedDoc.save()
      const blob = new Blob([outputBytes], { type: 'application/pdf' })
      setDownloadBlob(blob)
      setSuccess(true)

      const outputFilename = `${file.name.replace(/\.pdf$/i, '')}_unlocked.pdf`
      if (window.download) {
        window.download(outputBytes, outputFilename, 'application/pdf')
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = outputFilename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Unlock failed:', err)
      if (err.name === 'PasswordException' || err.message?.toLowerCase().includes('password')) {
        setError('Incorrect password. Please verify and try again.')
      } else {
        setError('Failed to unlock PDF: ' + err.message)
      }
    } finally {
      setUnlocking(false)
    }
  }

  const reset = () => {
    setFile(null)
    setFileBuffer(null)
    setIsEncrypted(false)
    setPassword('')
    setStats(null)
    setError(null)
    setSuccess(false)
    setDownloadBlob(null)
    setPreviews([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Unlock className="w-6 h-6 text-emerald-500" />
            Unlock & Decrypt PDF
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Remove password protection and strip security restrictions completely client-side.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% In-Memory Decryption
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Unlock Failed</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {success && (
        <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-emerald-400">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-semibold text-white">PDF Unlocked & Saved Successfully</p>
              <p className="text-xs text-emerald-300 mt-0.5">
                All password protection and editing/printing restrictions have been permanently removed.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (downloadBlob) {
                const url = URL.createObjectURL(downloadBlob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${file.name.replace(/\.pdf$/i, '')}_unlocked.pdf`
                a.click()
                URL.revokeObjectURL(url)
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> Download Again
          </button>
        </div>
      )}

      {/* Main Upload / Workflow */}
      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 bg-zinc-900/30 hover:bg-zinc-900/60 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group text-center"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 group-hover:bg-emerald-500/10 flex items-center justify-center mb-4 transition-colors">
            <FileUp className="w-8 h-8 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h3 className="text-base font-semibold text-zinc-200 group-hover:text-white">
            Select an encrypted PDF to unlock
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Drag and drop or browse from your computer (never uploaded)
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* File summary */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                isEncrypted
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                {isEncrypted ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-semibold text-zinc-100 text-sm">{file.name}</h4>
                <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                  <span>Size: {stats?.fileSize}</span>
                  {stats?.pageCount && <span>• {stats.pageCount} Pages</span>}
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                    isEncrypted ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {stats?.status}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Choose Different File
            </button>
          </div>

          {/* Password Prompt */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-zinc-200">
                {isEncrypted ? 'Document Password Required' : 'Decryption & Permission Stripping'}
              </h3>
            </div>

            {isEncrypted ? (
              <div className="space-y-3 max-w-md">
                <label className="text-xs font-medium text-zinc-300">
                  Enter Password to Unlock <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUnlock()
                    }}
                    placeholder="Enter document password"
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-zinc-500">
                  Password is processed strictly inside your browser memory and never transmitted anywhere.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-xs text-zinc-300">
                This document does not have an open password. Clicking Unlock will strip any background permission restrictions (such as print or copy limits) and produce a completely clean, unencrypted file.
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {unlocking && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-2">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Decrypting and reconstructing unencumbered pages...</span>
                <span className="font-semibold text-emerald-400">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Previews if unlocked */}
          {previews.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                Decrypted Page Previews
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative aspect-[3/4] bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 shadow-sm">
                    <img src={src} alt={`Page ${idx + 1}`} className="w-full h-full object-contain" />
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-zinc-300">
                      Page {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action button */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleUnlock}
              disabled={unlocking || loading || (isEncrypted && !password)}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-emerald-950/50"
            >
              {unlocking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Decrypting PDF...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  Unlock & Remove Password
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
