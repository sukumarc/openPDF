import React, { useState, useRef, useEffect } from 'react'
import { FileCode, Download, FileUp, RefreshCw, Eye, CheckCircle2, AlertCircle, Copy, Sparkles } from 'lucide-react'

const DEFAULT_MARKDOWN = `# OpenPDF - Markdown Document

Welcome to **OpenPDF Markdown to PDF converter**! You can write markdown directly or upload any \`.md\` file.

## Features
- **Client-Side Rendering**: 100% private, never touches a server.
- **Rich Formatting**:
  - Headings, lists, blockquotes, and tables
  - Code blocks with clean monospace formatting
  - Mathematical symbols and styled quotes

### Sample Table
| Feature | Supported | Privacy |
| :--- | :--- | :--- |
| PDF Export | Yes | 100% Local |
| Instant Preview | Yes | Offline |

> *"Simplicity is prerequisite for reliability."* — Edsger W. Dijkstra

---
\`\`\`javascript
// Example Code Block
function greetUser(name) {
  return \`Welcome to OpenPDF, \${name}!\`;
}
console.log(greetUser("Developer"));
\`\`\`
`

export default function MarkdownToPdfTool() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN)
  const [htmlContent, setHtmlContent] = useState('')
  const [theme, setTheme] = useState('github') // 'github' | 'academic' | 'modern'
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const fileInputRef = useRef(null)
  const previewRef = useRef(null)

  // Parse markdown whenever input changes
  useEffect(() => {
    try {
      if (window.marked) {
        const rawHtml = window.marked.parse(markdown)
        const cleanHtml = window.DOMPurify ? window.DOMPurify.sanitize(rawHtml) : rawHtml
        setHtmlContent(cleanHtml)
      }
    } catch (err) {
      console.error('Markdown parse error:', err)
    }
  }, [markdown])

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setMarkdown(event.target?.result || '')
      setError(null)
      setSuccess(false)
    }
    reader.onerror = () => setError('Failed to read Markdown file.')
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleConvertToPdf = async () => {
    if (!previewRef.current) return
    setConverting(true)
    setError(null)

    try {
      if (window.html2pdf) {
        const opt = {
          margin: [15, 15, 15, 15],
          filename: 'document.pdf',
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        }

        await window.html2pdf().set(opt).from(previewRef.current).save()
        setSuccess(true)
      } else {
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

        pdf.save('markdown_document.pdf')
        setSuccess(true)
      }
    } catch (err) {
      console.error('Markdown PDF generation failed:', err)
      setError('PDF export failed: ' + err.message)
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileCode className="w-6 h-6 text-blue-500" />
            Markdown (.md) to PDF Converter
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Write or upload Markdown documents and compile them into typeset PDF documents locally.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <FileUp className="w-3.5 h-3.5" />
            Upload .md
          </button>

          <button
            onClick={handleConvertToPdf}
            disabled={converting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-all shadow-md shadow-blue-600/20"
          >
            {converting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </>
            )}
          </button>
        </div>
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
          <span>Markdown PDF document compiled and downloaded!</span>
        </div>
      )}

      {/* Editor & Live Preview Panes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Markdown Editor */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-800 pb-2 px-1">
            <span className="font-semibold text-zinc-300">Markdown Source</span>
            <span>{markdown.length} characters</span>
          </div>

          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="Type your markdown here..."
            rows={22}
            className="w-full flex-1 bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 font-mono text-xs text-zinc-200 focus:outline-none focus:border-blue-500 resize-y leading-relaxed"
          />
        </div>

        {/* Right: Rendered HTML Preview */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-800 pb-2 px-1">
            <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              PDF Document Preview
            </span>
            <span className="text-[10px] text-zinc-500">A4 Document Simulation</span>
          </div>

          <div className="w-full flex-1 bg-white text-zinc-900 rounded-xl p-8 max-h-[620px] overflow-y-auto shadow-inner border border-zinc-700 font-sans">
            <div
              ref={previewRef}
              className="prose prose-sm max-w-none text-zinc-900 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
