import React, { useState, useRef } from 'react'
import { FileText, Download, FileUp, RefreshCw, Layers, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react'

export default function PdfToWordTool() {
  const [file, setFile] = useState(null)
  const [doc, setDoc] = useState(null)
  const [extractedPreview, setExtractedPreview] = useState([])
  const [loading, setLoading] = useState(false)
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)
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
    setExtractedPreview([])

    try {
      const buffer = await selectedFile.arrayBuffer()
      const loadingTask = window.pdfjsLib.getDocument({ data: buffer })
      const pdfDoc = await loadingTask.promise
      setDoc(pdfDoc)

      // Sample first 2 pages text for preview
      const previewSnippets = []
      for (let i = 1; i <= Math.min(pdfDoc.numPages, 3); i++) {
        const page = await pdfDoc.getPage(i)
        const textContent = await page.getTextContent()
        const text = textContent.items.map((item) => item.str).join(' ')
        previewSnippets.push({ pageNum: i, text: text.substring(0, 300) + '...' })
      }
      setExtractedPreview(previewSnippets)
    } catch (err) {
      console.error('Failed to load PDF:', err)
      setError('Failed to read PDF file: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConvertToDocx = async () => {
    if (!doc || !file) return
    setConverting(true)
    setProgress(0)
    setError(null)

    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx || {}

      if (!Document || !Packer) {
        throw new Error('Word generation engine is initializing, please try again in a moment.')
      }

      const totalPages = doc.numPages
      const docChildren = []

      for (let i = 1; i <= totalPages; i++) {
        const page = await doc.getPage(i)
        const textContent = await page.getTextContent()

        // Group items by line according to Y-coordinate transform
        const linesMap = {}
        textContent.items.forEach((item) => {
          const y = Math.round(item.transform[5])
          if (!linesMap[y]) linesMap[y] = []
          linesMap[y].push(item)
        })

        // Sort lines from top to bottom
        const sortedY = Object.keys(linesMap).sort((a, b) => b - a)

        sortedY.forEach((y) => {
          const lineItems = linesMap[y].sort((a, b) => a.transform[4] - b.transform[4])
          const lineText = lineItems.map((item) => item.str).join(' ').trim()

          if (lineText) {
            // Check if font size indicates heading
            const fontSize = Math.abs(lineItems[0]?.transform[0] || 12)
            if (fontSize > 16) {
              docChildren.push(
                new Paragraph({
                  text: lineText,
                  heading: HeadingLevel.HEADING_1,
                  spacing: { before: 200, after: 100 }
                })
              )
            } else if (fontSize > 13) {
              docChildren.push(
                new Paragraph({
                  text: lineText,
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 150, after: 80 }
                })
              )
            } else {
              docChildren.push(
                new Paragraph({
                  children: [new TextRun({ text: lineText, size: 22 })],
                  spacing: { after: 120 }
                })
              )
            }
          }
        })

        // Add page break if not the last page
        if (i < totalPages) {
          docChildren.push(new Paragraph({ pageBreakBefore: true }))
        }

        setProgress(Math.round((i / totalPages) * 100))
      }

      const wordDoc = new Document({
        sections: [
          {
            properties: {},
            children: docChildren
          }
        ]
      })

      const docxBlob = await Packer.toBlob(wordDoc)
      if (window.download) {
        window.download(docxBlob, `${file.name.replace(/\.pdf$/i, '')}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      }
      setSuccess(true)
    } catch (err) {
      console.error('DOCX conversion failed:', err)
      setError('Conversion failed: ' + err.message)
    } finally {
      setConverting(false)
    }
  }

  const reset = () => {
    setFile(null)
    setDoc(null)
    setExtractedPreview([])
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
            <FileText className="w-6 h-6 text-blue-500" />
            PDF to Word (.docx) Converter
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Extract text and structure from your PDF into an editable Word (.docx) document locally.
          </p>
        </div>

        {file && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors w-fit"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Convert Another
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
          <span>Word document (.docx) generated and downloaded successfully!</span>
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
            Extract text layers, paragraphs, and headings into a clean Microsoft Word (.docx) file.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5 h-fit">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider text-zinc-400">
              Export Settings
            </h3>

            <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-xs space-y-2 text-zinc-400">
              <div className="flex justify-between">
                <span>File:</span>
                <span className="text-zinc-200 font-medium truncate max-w-[150px]">{file.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Pages:</span>
                <span className="text-zinc-200 font-medium">{doc?.numPages || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Output:</span>
                <span className="text-zinc-200 font-medium">Editable .docx</span>
              </div>
            </div>

            <button
              onClick={handleConvertToDocx}
              disabled={converting || loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {converting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Converting ({progress}%)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export as Word (.docx)</span>
                </>
              )}
            </button>
          </div>

          {/* Text Structure Preview */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Document Text Preview
            </h3>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm text-zinc-400">Extracting text layers...</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {extractedPreview.map((item) => (
                  <div key={item.pageNum} className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 space-y-1.5">
                    <span className="text-xs font-semibold text-blue-400">Page {item.pageNum}</span>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans line-clamp-4">
                      {item.text}
                    </p>
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
