import React, { useState, useRef } from 'react'
import { FileText, Download, FileUp, RefreshCw, Eye, CheckCircle2, AlertCircle, FileCode } from 'lucide-react'

export default function WordToPdfTool() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [converting, setConverting] = useState(false)
  const [htmlPreview, setHtmlPreview] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const fileInputRef = useRef(null)
  const previewRef = useRef(null)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.docx') && !selectedFile.name.endsWith('.doc')) {
      setError('Please select a valid Word document (.docx).')
      return
    }

    setFile(selectedFile)
    setError(null)
    setSuccess(false)
    setLoading(true)
    setHtmlPreview('')

    try {
      const buffer = await selectedFile.arrayBuffer()

      // Parse with mammoth for clean structured HTML
      if (window.mammoth) {
        const result = await window.mammoth.convertToHtml({ arrayBuffer: buffer })
        setHtmlPreview(result.value)
      } else {
        setError('Word parser library is loading, please try again.')
      }
    } catch (err) {
      console.error('Failed to parse docx:', err)
      setError('Failed to read Word file: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConvertToPdf = async () => {
    if (!previewRef.current || !file) return
    setConverting(true)
    setError(null)

    try {
      // Use html2pdf or jspdf/html2canvas for multi-page export
      if (window.html2pdf) {
        const opt = {
          margin: [15, 15, 15, 15],
          filename: `${file.name.replace(/\.docx?$/i, '')}.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        }

        await window.html2pdf().set(opt).from(previewRef.current).save()
        setSuccess(true)
      } else {
        // Fallback using html2canvas & jspdf
        const canvas = await window.html2canvas(previewRef.current, { scale: 2 })
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4')
        const imgWidth = 210
        const pageHeight = 295
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        let heightLeft = imgHeight
        let position = 0

        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
        }

        pdf.save(`${file.name.replace(/\.docx?$/i, '')}.pdf`)
        setSuccess(true)
      }
    } catch (err) {
      console.error('Conversion failed:', err)
      setError('Failed to generate PDF: ' + err.message)
    } finally {
      setConverting(false)
    }
  }

  const reset = () => {
    setFile(null)
    setHtmlPreview('')
    setError(null)
    setSuccess(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-blue-500" />
            Word (.docx) to PDF Converter
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Convert Word documents (.docx) to high-fidelity PDF documents entirely in your browser.
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
          <span>Document successfully converted to PDF and downloaded!</span>
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
            accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform border border-blue-500/20">
            <FileUp className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Select a Word document (.docx)</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            Drop your DOCX file here for instant, client-side PDF conversion.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5 h-fit">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider text-zinc-400">
              Document Info
            </h3>

            <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-xs space-y-2 text-zinc-400">
              <div className="flex justify-between">
                <span>File Name:</span>
                <span className="text-zinc-200 font-medium truncate max-w-[150px]">{file.name}</span>
              </div>
              <div className="flex justify-between">
                <span>File Size:</span>
                <span className="text-zinc-200 font-medium">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex justify-between">
                <span>Output Format:</span>
                <span className="text-zinc-200 font-medium">Standard A4 PDF</span>
              </div>
            </div>

            <button
              onClick={handleConvertToPdf}
              disabled={converting || loading || !htmlPreview}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {converting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Converting to PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Convert & Download PDF</span>
                </>
              )}
            </button>
          </div>

          {/* Document Preview */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                Document Live Preview
              </h3>
              <span className="text-xs text-zinc-500">Rendered locally</span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm text-zinc-400">Parsing Word document...</p>
              </div>
            ) : (
              <div className="bg-white text-zinc-900 rounded-xl p-8 max-h-[600px] overflow-y-auto shadow-inner border border-zinc-700">
                <div
                  ref={previewRef}
                  className="prose prose-sm max-w-none text-zinc-800 leading-relaxed font-sans"
                  dangerouslySetInnerHTML={{ __html: htmlPreview }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
