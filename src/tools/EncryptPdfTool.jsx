import React, { useState, useRef } from 'react'
import { Lock, Eye, EyeOff, ShieldCheck, Download, FileUp, RefreshCw, CheckCircle2, AlertCircle, KeyRound, Sliders, FileText } from 'lucide-react'
import { encryptPDF } from '@pdfsmaller/pdf-encrypt-lite'

export default function EncryptPdfTool() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [encrypting, setEncrypting] = useState(false)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [downloadBlob, setDownloadBlob] = useState(null)

  // Passwords
  const [userPassword, setUserPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [useOwnerPassword, setUseOwnerPassword] = useState(false)
  const [ownerPassword, setOwnerPassword] = useState('')
  const [showOwnerPassword, setShowOwnerPassword] = useState(false)

  // Granular Permissions
  const [allowPrinting, setAllowPrinting] = useState(true)
  const [allowModifying, setAllowModifying] = useState(false)
  const [allowCopying, setAllowCopying] = useState(false)
  const [allowFillingForms, setAllowFillingForms] = useState(true)

  const fileInputRef = useRef(null)

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { label: 'Empty', color: 'bg-zinc-700', width: '0%', textClass: 'text-zinc-400' }
    let score = 0
    if (pwd.length >= 6) score += 1
    if (pwd.length >= 10) score += 1
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1
    if (/[0-9]/.test(pwd)) score += 1
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1

    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '25%', textClass: 'text-red-400' }
    if (score <= 3) return { label: 'Medium', color: 'bg-yellow-500', width: '60%', textClass: 'text-yellow-400' }
    if (score === 4) return { label: 'Strong', color: 'bg-emerald-500', width: '85%', textClass: 'text-emerald-400' }
    return { label: 'Very Strong', color: 'bg-emerald-400', width: '100%', textClass: 'text-emerald-300' }
  }

  const strength = getPasswordStrength(userPassword)

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
    setLoading(true)

    try {
      const buffer = await selectedFile.arrayBuffer()
      const { PDFDocument } = window.PDFLib || await import('pdf-lib')
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
      setStats({
        pageCount: pdfDoc.getPageCount(),
        fileSize: (selectedFile.size / 1024).toFixed(1) + ' KB'
      })
    } catch (err) {
      console.error('Failed to read PDF:', err)
      setError('Failed to inspect PDF. It may already be encrypted: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEncrypt = async () => {
    if (!file) return

    if (!userPassword && !ownerPassword) {
      setError('Please provide at least a User Password or an Owner Password to secure the document.')
      return
    }

    if (userPassword && userPassword !== confirmPassword) {
      setError('User Password and Confirm Password do not match.')
      return
    }

    if (useOwnerPassword && !ownerPassword) {
      setError('Owner Password is enabled but left empty.')
      return
    }

    setEncrypting(true)
    setError(null)

    try {
      const fileBytes = new Uint8Array(await file.arrayBuffer())

      const options = {
        allowPrinting,
        allowModifying,
        allowCopying,
        allowFillingForms
      }

      if (useOwnerPassword && ownerPassword) {
        options.ownerPassword = ownerPassword
      }

      const encryptedBytes = await encryptPDF(fileBytes, userPassword || '', options)

      const blob = new Blob([encryptedBytes], { type: 'application/pdf' })
      setDownloadBlob(blob)
      setSuccess(true)

      const outputFilename = `${file.name.replace(/\.pdf$/i, '')}_protected.pdf`
      if (window.download) {
        window.download(encryptedBytes, outputFilename, 'application/pdf')
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
      console.error('Encryption failed:', err)
      setError('Encryption failed: ' + err.message)
    } finally {
      setEncrypting(false)
    }
  }

  const reset = () => {
    setFile(null)
    setStats(null)
    setError(null)
    setSuccess(false)
    setDownloadBlob(null)
    setUserPassword('')
    setConfirmPassword('')
    setOwnerPassword('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Lock className="w-6 h-6 text-emerald-500" />
            Protect & Encrypt PDF
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Standard 128-bit encryption with user password protection & granular permission restrictions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% Client-Side
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Action Failed</p>
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
              <p className="font-semibold text-white">PDF Protected & Downloaded Successfully</p>
              <p className="text-xs text-emerald-300 mt-0.5">
                The document is now encrypted and will require password authorization to open.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (downloadBlob) {
                const url = URL.createObjectURL(downloadBlob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${file.name.replace(/\.pdf$/i, '')}_protected.pdf`
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

      {/* Main Form */}
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
            Select a PDF document to encrypt
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
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-zinc-100 text-sm">{file.name}</h4>
                <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                  <span>Size: {stats?.fileSize || `${(file.size / 1024).toFixed(1)} KB`}</span>
                  {stats?.pageCount && <span>• {stats.pageCount} Pages</span>}
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

          {/* Encryption Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Password Configuration */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-zinc-200">Password Protection</h3>
              </div>

              {/* User Password */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">
                  Document Open Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
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

                {/* Password Strength Meter */}
                {userPassword && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400">Strength:</span>
                      <span className={`font-semibold ${strength.textClass}`}>{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: strength.width }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">
                  Confirm Open Password <span className="text-red-400">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Master / Owner Password toggle */}
              <div className="pt-2 border-t border-zinc-800/80">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={useOwnerPassword}
                    onChange={(e) => setUseOwnerPassword(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500/20"
                  />
                  Set separate Master / Owner Password (Optional)
                </label>

                {useOwnerPassword && (
                  <div className="relative mt-2">
                    <input
                      type={showOwnerPassword ? 'text' : 'password'}
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder="Owner / Admin password"
                      className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                    >
                      {showOwnerPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Granular Permissions */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-zinc-200">Document Permissions</h3>
              </div>

              <div className="space-y-3 pt-1">
                <label className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={allowPrinting}
                    onChange={(e) => setAllowPrinting(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-zinc-200">Allow Printing</p>
                    <p className="text-zinc-400">Permit users to print high-resolution copies of the PDF.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={allowCopying}
                    onChange={(e) => setAllowCopying(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-zinc-200">Allow Copying & Text Extraction</p>
                    <p className="text-zinc-400">Permit copying text and extracting graphics from the document.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={allowModifying}
                    onChange={(e) => setAllowModifying(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-zinc-200">Allow Modifying & Annotating</p>
                    <p className="text-zinc-400">Permit adding comments, notes, and modifying pages.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={allowFillingForms}
                    onChange={(e) => setAllowFillingForms(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-zinc-200">Allow Form Filling & Signing</p>
                    <p className="text-zinc-400">Permit filling out interactive forms and signing fields.</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleEncrypt}
              disabled={encrypting || loading}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-emerald-950/50"
            >
              {encrypting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Encrypting PDF...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Encrypt & Download PDF
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
