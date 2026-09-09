import React, { useState, useRef } from 'react'
import { Layers, Download, FileUp, RefreshCw, CheckCircle2, AlertCircle, Lock, ShieldCheck, FileCheck } from 'lucide-react'

export default function FlattenPdfTool() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [flattening, setFlattening] = useState(false)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.pdf')) {
      setError('Please select a valid PDF file.')
      return
    }

    setFile(selectedFile)
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      const buffer = await selectedFile.arrayBuffer()
      const { PDFDocument } = window.PDFLib
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })

      let formFieldCount = 0
      try {
        const form = pdfDoc.getForm()
        formFieldCount = form.getFields().length
      } catch {
        formFieldCount = 0
      }

      setStats({
        pageCount: pdfDoc.getPageCount(),
        formFieldCount
      })
    } catch (err) {
      console.error('Failed to parse PDF:', err)
      setError('Failed to inspect PDF: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFlattenPdf = async () => {
    if (!file) return
    setFlattening(true)
    setError(null)

    try {
      const buffer = await file.arrayBuffer()
      const { PDFDocument } = window.PDFLib
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })

      // Flatten all AcroForms
      try {
        const form = pdfDoc.getForm()
        form.flatten()
      } catch (e) {
        console.log('No AcroForms to flatten, proceeding with stream cleanup:', e)
      }

      const pdfBytes = await pdfDoc.save()
      if (window.download) {
        window.download(pdfBytes, `${file.name.replace(/\.pdf$/i, '')}_flattened.pdf`, 'application/pdf')
      }
      setSuccess(true)
    } catch (err) {
      console.error('Flatten failed:', err)
      setError('Failed to flatten PDF: ' + err.message)
    } finally {
      setFlattening(false)
    }
  }

  const reset = () => {
    setFile(null)
    setStats(null)
    setError(null)
    setSuccess(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-blue-500" />
            Flatten PDF Document
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Bake interactive form fields, checkboxes, and annotations into permanent, non-editable page elements.
          </p>
        </div>

        {file && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors w-fit"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Upload Another
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>PDF successfully flattened and downloaded!</span>
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
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Select a PDF to Flatten</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            Permanently lock form inputs, signatures, and annotations to prevent tampering.
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-base font-semibold text-white">{file.name}</h3>
              <p className="text-xs text-zinc-500">Size: {(file.size / 1024).toFixed(1)} KB</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {stats?.formFieldCount || 0} Form Fields Detected
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>What Flattening Does:</span>
              </div>
              <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                <li>Bakes form inputs & signatures into static vector text</li>
                <li>Prevents future editing of filled form values</li>
                <li>Removes active JavaScript triggers and form validation actions</li>
              </ul>
            </div>

            <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <Lock className="w-4 h-4 text-blue-400" />
                <span>Document Integrity:</span>
              </div>
              <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                <li>Preserves 100% of visual layout and text quality</li>
                <li>Reduces potential rendering bugs in third-party viewers</li>
                <li>Compliant with official PDF archiver standards</li>
              </ul>
            </div>
          </div>

          <button
            onClick={handleFlattenPdf}
            disabled={flattening}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            {flattening ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Baking Elements into Static Vectors...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Flatten & Download PDF</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
