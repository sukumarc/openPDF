import React, { useState, useRef } from 'react'
import { FileText, Download, FileUp, RefreshCw, Copy, Check, Search, AlertCircle, Layers } from 'lucide-react'

export default function ExtractTextTool() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [extractedText, setExtractedText] = useState('')
  const [pageCount, setPageCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState(null)

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
    setLoading(true)
    setExtractedText('')

    try {
      const buffer = await selectedFile.arrayBuffer()
      const loadingTask = window.pdfjsLib.getDocument({ data: buffer })
      const doc = await loadingTask.promise
      setPageCount(doc.numPages)

      const textChunks = []

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item) => item.str).join(' ')
        textChunks.push(`--- [ PAGE ${i} ] ---\n${pageText.trim()}\n`)
      }

      setExtractedText(textChunks.join('\n'))
    } catch (err) {
      console.error('Failed to extract text:', err)
      setError('Failed to extract text from PDF: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!extractedText) return
    navigator.clipboard.writeText(extractedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadTxt = () => {
    if (!extractedText || !file) return
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' })
    if (window.download) {
      window.download(blob, `${file.name.replace(/\.pdf$/i, '')}_extracted.txt`, 'text/plain')
    }
  }

  const reset = () => {
    setFile(null)
    setExtractedText('')
    setPageCount(0)
    setError(null)
    setSearchQuery('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Calculate statistics
  const wordCount = extractedText.trim() ? extractedText.trim().split(/\s+/).length : 0
  const charCount = extractedText.length
  const readingTime = Math.ceil(wordCount / 200)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-blue-500" />
            Extract Text from PDF
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Extract pure text layers from your PDF documents with page demarcations, word statistics, and .txt export.
          </p>
        </div>

        {file && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors w-fit"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Extract Another
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
            Extract all paragraphs, characters, and text layers to search, copy, or export.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stats & Actions Bar */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-xs text-zinc-400">
              <div>
                <span className="text-zinc-500">Pages: </span>
                <span className="text-zinc-200 font-semibold">{pageCount}</span>
              </div>
              <div>
                <span className="text-zinc-500">Words: </span>
                <span className="text-zinc-200 font-semibold">{wordCount}</span>
              </div>
              <div>
                <span className="text-zinc-500">Characters: </span>
                <span className="text-zinc-200 font-semibold">{charCount}</span>
              </div>
              <div>
                <span className="text-zinc-500">Read Time: </span>
                <span className="text-zinc-200 font-semibold">~{readingTime} min</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                disabled={loading || !extractedText}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs text-zinc-200 font-medium rounded-lg transition-colors border border-zinc-700/80"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>

              <button
                onClick={handleDownloadTxt}
                disabled={loading || !extractedText}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-xs text-white font-medium rounded-lg transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .txt</span>
              </button>
            </div>
          </div>

          {/* Text Area View */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm text-zinc-400">Extracting text layers from PDF...</p>
              </div>
            ) : (
              <textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                rows={18}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-200 focus:outline-none focus:border-blue-500 resize-y leading-relaxed"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
