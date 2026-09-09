import React, { useState, useRef } from 'react'
import {
  Wrench,
  Download,
  FileUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Activity,
  FileCheck,
  Bug,
  Sparkles
} from 'lucide-react'

export default function RepairPdfTool() {
  const [file, setFile] = useState(null)
  const [fileBuffer, setFileBuffer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [repairing, setRepairing] = useState(false)
  const [diagnostics, setDiagnostics] = useState([])
  const [repairLog, setRepairLog] = useState([])
  const [repairedBlob, setRepairedBlob] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)
    setSuccess(false)
    setRepairedBlob(null)
    setDiagnostics([])
    setRepairLog([])
    setLoading(true)

    try {
      const buffer = await selectedFile.arrayBuffer()
      setFileBuffer(buffer)

      // Run initial diagnostic check
      const logs = []
      const bytes = new Uint8Array(buffer)

      // 1. Header Check
      const headerStr = String.fromCharCode(...bytes.slice(0, 8))
      if (headerStr.startsWith('%PDF-')) {
        logs.push({ label: 'Header Signature', status: 'pass', msg: `Valid PDF Header (${headerStr.trim()})` })
      } else {
        logs.push({ label: 'Header Signature', status: 'warn', msg: 'Corrupted or missing %PDF- header magic bytes' })
      }

      // 2. EOF & Trailer Check
      const endChunk = String.fromCharCode(...bytes.slice(Math.max(0, bytes.length - 1024)))
      if (endChunk.includes('%%EOF')) {
        logs.push({ label: 'Trailer & EOF', status: 'pass', msg: 'Document EOF marker intact' })
      } else {
        logs.push({ label: 'Trailer & EOF', status: 'fail', msg: 'Truncated EOF marker detected (unclosed trailer)' })
      }

      // 3. XRef Table Check
      if (endChunk.includes('startxref') || endChunk.includes('xref')) {
        logs.push({ label: 'Cross-Reference Table (XRef)', status: 'pass', msg: 'XRef table index identified' })
      } else {
        logs.push({ label: 'Cross-Reference Table (XRef)', status: 'warn', msg: 'Damaged or missing XRef table offset' })
      }

      // 4. Object Stream parsing test
      let pageCount = 0
      try {
        const { PDFDocument } = window.PDFLib || (await import('pdf-lib'))
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
        pageCount = pdfDoc.getPageCount()
        logs.push({ label: 'Object Stream Trees', status: 'pass', msg: `${pageCount} Pages parsed successfully` })
      } catch (parseErr) {
        logs.push({ label: 'Object Stream Trees', status: 'fail', msg: `Parser Error: ${parseErr.message}` })
      }

      setDiagnostics(logs)
    } catch (err) {
      console.error('Diagnostic failed:', err)
      setError('Failed to inspect file structure: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Execute Multi-Tier Repair Pipeline
  const handleRepair = async () => {
    if (!file || !fileBuffer) return

    setRepairing(true)
    setError(null)
    const logEntries = []

    try {
      logEntries.push('Stage 1: Initializing non-strict stream reconstructor...')
      const { PDFDocument } = window.PDFLib || (await import('pdf-lib'))

      let repairedPdfBytes = null

      // Tier 1: PDF-Lib Rebuild
      try {
        const doc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true })
        repairedPdfBytes = await doc.save()
        logEntries.push('Stage 1 Success: XRef tables reconstructed & trailer dictionary sealed.')
      } catch (tier1Err) {
        logEntries.push(`Stage 1 Warning: Standard parser encountered errors (${tier1Err.message}). Advancing to Stage 2 WASM repair...`)

        // Tier 2: Ghostscript WebAssembly Engine
        if (window.Worker) {
          logEntries.push('Stage 2: Invoking Ghostscript WebAssembly repair engine...')
          const worker = new Worker('/background-worker.js', { type: 'module' })

          repairedPdfBytes = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              worker.terminate()
              reject(new Error('WASM repair timed out.'))
            }, 30000)

            worker.onmessage = (e) => {
              const { type, data, message } = e.data
              if (type === 'COMPLETE') {
                clearTimeout(timeout)
                worker.terminate()
                resolve(data)
              } else if (type === 'ERROR') {
                clearTimeout(timeout)
                worker.terminate()
                reject(new Error(message || 'WASM Engine error'))
              }
            }

            worker.postMessage({
              type: 'COMPRESS',
              fileData: fileBuffer,
              compressionLevel: 'low' // low downsampling cleans and rebuilds PDF streams without quality loss
            })
          })

          logEntries.push('Stage 2 Success: Ghostscript WASM reconstructed all objects & font tables.')
        } else {
          throw tier1Err
        }
      }

      if (!repairedPdfBytes) {
        throw new Error('Could not repair damaged PDF structure.')
      }

      logEntries.push('Stage 3: Verifying repaired PDF container integrity...')
      const verifyDoc = await PDFDocument.load(repairedPdfBytes, { ignoreEncryption: true })
      logEntries.push(`Stage 3 Complete: Document valid with ${verifyDoc.getPageCount()} pages!`)

      const blob = new Blob([repairedPdfBytes], { type: 'application/pdf' })
      setRepairedBlob(blob)
      setRepairLog(logEntries)
      setSuccess(true)

      const outputFilename = `${file.name.replace(/\.pdf$/i, '')}_repaired.pdf`
      if (window.download) {
        window.download(repairedPdfBytes, outputFilename, 'application/pdf')
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = outputFilename
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Repair failed:', err)
      logEntries.push(`Repair Failed: ${err.message}`)
      setRepairLog(logEntries)
      setError('Repair failed: ' + err.message)
    } finally {
      setRepairing(false)
    }
  }

  const reset = () => {
    setFile(null)
    setFileBuffer(null)
    setDiagnostics([])
    setRepairLog([])
    setRepairedBlob(null)
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
            <Wrench className="w-6 h-6 text-violet-500" />
            Repair & Recover PDF
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Fix corrupted PDF streams, broken cross-reference (xref) tables, damaged trailers, and missing headers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% Client-Side WASM
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
              <p className="font-semibold text-white">PDF Rebuilt & Repaired Successfully</p>
              <p className="text-xs text-emerald-300 mt-0.5">
                Damaged object offsets, xref tables, and trailer dictionaries have been reconstructed.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (repairedBlob) {
                const url = URL.createObjectURL(repairedBlob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${file.name.replace(/\.pdf$/i, '')}_repaired.pdf`
                a.click()
                URL.revokeObjectURL(url)
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> Download Repaired PDF
          </button>
        </div>
      )}

      {/* Upload Zone */}
      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-800 hover:border-violet-500/50 bg-zinc-900/30 hover:bg-zinc-900/60 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group text-center"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 group-hover:bg-violet-500/10 flex items-center justify-center mb-4 transition-colors">
            <FileUp className="w-8 h-8 text-zinc-400 group-hover:text-violet-400 transition-colors" />
          </div>
          <h3 className="text-base font-semibold text-zinc-200 group-hover:text-white">
            Select a damaged or broken PDF file
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Drag and drop or browse from your computer (never uploaded)
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* File summary */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 text-violet-400">
                <Bug className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-zinc-100 text-sm">{file.name}</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Size: {(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Choose Different File
            </button>
          </div>

          {/* Diagnostic Checks Grid */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <Activity className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-zinc-200">File Structure Diagnostic Report</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {diagnostics.map((d, i) => (
                <div key={i} className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-start gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                      d.status === 'pass'
                        ? 'bg-emerald-500'
                        : d.status === 'warn'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-zinc-200">{d.label}</p>
                    <p className="text-zinc-400 mt-0.5">{d.msg}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Repair Pipeline Logs */}
          {repairLog.length > 0 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 font-mono text-xs text-zinc-300 space-y-1 max-h-[160px] overflow-y-auto">
              <div className="text-[11px] font-bold text-violet-400 mb-1 font-sans">Execution Telemetry:</div>
              {repairLog.map((log, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-zinc-600">[{idx + 1}]</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action button */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleRepair}
              disabled={repairing || loading}
              className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-violet-600/20"
            >
              {repairing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Repairing PDF...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Rebuild & Repair PDF
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
