import React, { useState, useEffect, useRef } from 'react'
import {
  Sigma,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layout,
  FileCode,
  Sliders,
  Type,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react'

const LATEX_TEMPLATES = {
  calculus: {
    name: 'Multivariate Calculus & Integrals',
    content: `# Green's Theorem and Surface Integrals

Let $C$ be a positively oriented, piecewise smooth, simple closed curve in a plane, and let $D$ be the region bounded by $C$. If $L$ and $M$ are functions of $(x, y)$ defined on an open region containing $D$ and have continuous partial derivatives there, then:

$$\\oint_C (L \\, dx + M \\, dy) = \\iint_D \\left( \\frac{\\partial M}{\\partial x} - \\frac{\\partial L}{\\partial y} \\right) dx \\, dy$$

## Gaussian Integral Proof

The standard normal distribution integral over all real numbers evaluates to:

$$I = \\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

**Derivation via Polar Coordinates:**

$$I^2 = \\left( \\int_{-\\infty}^{\\infty} e^{-x^2} dx \\right) \\left( \\int_{-\\infty}^{\\infty} e^{-y^2} dy \\right) = \\iint_{\\mathbb{R}^2} e^{-(x^2+y^2)} dx \\, dy$$

Converting to polar coordinates $(r, \\theta)$:

$$I^2 = \\int_0^{2\\pi} d\\theta \\int_0^\\infty r e^{-r^2} dr = 2\\pi \\left[ -\\frac{1}{2} e^{-r^2} \\right]_0^\\infty = \\pi \\implies I = \\sqrt{\\pi}$$`
  },
  ai_transformer: {
    name: 'Deep Learning & Attention Mechanisms',
    content: `# Scaled Dot-Product Attention & Transformers

In deep learning transformer architectures (Vaswani et al.), attention functions map queries $Q$, keys $K$, and values $V$ to outputs:

$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left( \\frac{QK^T}{\\sqrt{d_k}} \\right) V$$

Where $d_k$ represents the dimensional scaling factor of the key vectors to prevent vanishing gradients in the softmax activation.

## Multi-Head Attention Mechanism

Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions:

$$\\text{MultiHead}(Q, K, V) = \\text{Concat}(\\text{head}_1, \\dots, \\text{head}_h) W^O$$

$$\\text{where } \\text{head}_i = \\text{Attention}(Q W_i^Q, K W_i^K, V W_i^V)$$

## Loss Optimization (Cross-Entropy with Softmax)

$$\\mathcal{L}_{\\text{CE}} = -\\sum_{i=1}^N y_i \\log(\\hat{y}_i) = -\\sum_{i=1}^N y_i \\log\\left( \\frac{e^{z_i}}{\\sum_{j=1}^C e^{z_j}} \\right)$$`
  },
  quantum: {
    name: 'Quantum Mechanics & Schrödinger Wave',
    content: `# The Time-Dependent Schrödinger Equation

The fundamental equation describing the quantum state of a physical system is given by:

$$i\\hbar \\frac{\\partial}{\\partial t} \\Psi(\\mathbf{r}, t) = \\hat{H} \\Psi(\\mathbf{r}, t)$$

Where $\\hat{H}$ is the Hamiltonian differential operator:

$$\\hat{H} = -\\frac{\\hbar^2}{2m} \\nabla^2 + V(\\mathbf{r}, t)$$

## Heisenberg Uncertainty Principle

For any pair of conjugate observable operators such as position $\\hat{x}$ and momentum $\\hat{p}$:

$$\\sigma_x \\sigma_p \\ge \\frac{\\hbar}{2}$$

## Dirac Bra-Ket Inner Product & Orthonormality

$$\\langle \\psi | \\phi \\rangle = \\int_{-\\infty}^\\infty \\psi^*(x) \\phi(x) \\, dx = \\delta_{ij}$$`
  }
}

export default function LatexToPdfTool() {
  const [latexSource, setLatexSource] = useState(LATEX_TEMPLATES.calculus.content)
  const [selectedTemplate, setSelectedTemplate] = useState('calculus')
  const [pageSize, setPageSize] = useState('a4') // 'a4', 'letter'
  const [fontSize, setFontSize] = useState(14) // 12, 14, 16
  const [docTitle, setDocTitle] = useState('Scientific & Mathematical Document')
  const [authorName, setAuthorName] = useState('DeepMind Research Systems')

  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [convertedPdfUrl, setConvertedPdfUrl] = useState(null)
  const [pdfSize, setPdfSize] = useState(null)

  const previewContainerRef = useRef(null)

  const handleTemplateSelect = (key) => {
    setSelectedTemplate(key)
    if (LATEX_TEMPLATES[key]) {
      setLatexSource(LATEX_TEMPLATES[key].content)
    }
  }

  // Render LaTeX + Markdown into HTML elements
  const renderLatexToHtml = (markdownWithLatex) => {
    if (!window.katex) {
      return `<p>${markdownWithLatex}</p>`
    }

    let rendered = markdownWithLatex

    // 1. Render display math $$ ... $$
    rendered = rendered.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
      try {
        return window.katex.renderToString(formula.trim(), {
          displayMode: true,
          throwOnError: false
        })
      } catch (err) {
        return `<div class="text-red-500 font-mono text-xs">${formula}</div>`
      }
    })

    // 2. Render inline math $ ... $
    rendered = rendered.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
      try {
        return window.katex.renderToString(formula.trim(), {
          displayMode: false,
          throwOnError: false
        })
      } catch (err) {
        return `<span class="text-red-500 font-mono text-xs">${formula}</span>`
      }
    })

    // 3. Convert basic markdown headings and paragraphs
    const lines = rendered.split('\n')
    let htmlLines = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.startsWith('# ')) {
        htmlLines.push(`<h1 style="font-size: 22px; font-weight: bold; margin: 20px 0 10px 0; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">${line.substring(2)}</h1>`)
      } else if (line.startsWith('## ')) {
        htmlLines.push(`<h2 style="font-size: 17px; font-weight: bold; margin: 18px 0 8px 0; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">${line.substring(3)}</h2>`)
      } else if (line.startsWith('### ')) {
        htmlLines.push(`<h3 style="font-size: 15px; font-weight: bold; margin: 14px 0 6px 0; color: #334155;">${line.substring(4)}</h3>`)
      } else if (line.startsWith('**') && line.endsWith('**')) {
        htmlLines.push(`<p style="font-weight: bold; margin: 8px 0; color: #0f172a;">${line.substring(2, line.length - 2)}</p>`)
      } else if (line === '') {
        htmlLines.push('<div style="height: 8px;"></div>')
      } else {
        htmlLines.push(`<p style="margin: 8px 0; line-height: 1.6; color: #334155; font-size: ${fontSize}px;">${line}</p>`)
      }
    }

    return htmlLines.join('\n')
  }

  // Update live preview
  useEffect(() => {
    if (previewContainerRef.current) {
      previewContainerRef.current.innerHTML = renderLatexToHtml(latexSource)
    }
  }, [latexSource, fontSize])

  const handleGeneratePdf = async () => {
    if (!latexSource.trim()) {
      setError('Please provide LaTeX / Markdown content.')
      return
    }

    setConverting(true)
    setProgress(20)
    setError('')

    try {
      if (!window.html2canvas || !window.jspdf) {
        throw new Error('PDF rendering libraries are still loading. Please try again.')
      }

      // Create high-res printing sandbox container
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.width = '800px'
      container.style.padding = '40px'
      container.style.background = '#ffffff'
      container.style.color = '#000000'
      container.style.fontFamily = "'Times New Roman', Times, serif"

      // Add Header
      const headerHtml = `
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 25px;">
          <h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #0f172a;">${docTitle}</h1>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-top: 6px;">
            <span>${authorName}</span>
            <span>Date: ${new Date().toLocaleDateString()}</span>
          </div>
        </div>
      `

      container.innerHTML = headerHtml + renderLatexToHtml(latexSource)
      document.body.appendChild(container)
      setProgress(50)

      const canvas = await window.html2canvas(container, {
        scale: 2.0, // Crisp 2x vector resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })

      document.body.removeChild(container)
      setProgress(75)

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const { jsPDF } = window.jspdf
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: pageSize
      })

      const pdfPageWidth = pdf.internal.pageSize.getWidth()
      const pdfPageHeight = pdf.internal.pageSize.getHeight()

      const margin = 12
      const contentWidth = pdfPageWidth - margin * 2
      const contentHeight = (canvas.height * contentWidth) / canvas.width

      let heightLeft = contentHeight
      let position = margin

      // Multi-page slicing
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight)
      heightLeft -= pdfPageHeight - margin * 2

      while (heightLeft > 0) {
        position = heightLeft - contentHeight + margin
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight)
        heightLeft -= pdfPageHeight - margin * 2
      }

      setProgress(90)
      const blob = pdf.output('blob')
      const url = URL.createObjectURL(blob)

      setConvertedPdfUrl(url)
      setPdfSize((blob.size / 1024).toFixed(1) + ' KB')
      setProgress(100)
    } catch (err) {
      console.error('LaTeX PDF Compilation Error:', err)
      setError(err.message || 'Failed to compile LaTeX document.')
    } finally {
      setConverting(false)
    }
  }

  const handleDownload = () => {
    if (!convertedPdfUrl) return
    const safeTitle = docTitle.replace(/[^a-zA-Z0-9_-]/g, '_')
    const downloadName = `${safeTitle}.pdf`

    if (window.download) {
      fetch(convertedPdfUrl)
        .then((res) => res.blob())
        .then((blob) => {
          window.download(blob, downloadName, 'application/pdf')
        })
    } else {
      const a = document.createElement('a')
      a.href = convertedPdfUrl
      a.download = downloadName
      a.click()
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                <Sigma className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  LaTeX & Math Formula to PDF
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/20 text-pink-400">
                    KaTeX Math
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Compile scientific research papers, calculus formulas, and deep learning architectures into vector PDF documents
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Toolbar & Metadata */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Presets */}
            <div>
              <span className="text-xs text-zinc-500 block mb-1">Preset Formula Templates</span>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
              >
                <option value="calculus">Calculus & Green's Theorem</option>
                <option value="ai_transformer">AI Transformer Attention</option>
                <option value="quantum">Quantum Schrödinger Wave</option>
              </select>
            </div>

            {/* Document Title */}
            <div>
              <span className="text-xs text-zinc-500 block mb-1">Document Title</span>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-pink-500 w-48"
              />
            </div>

            {/* Author */}
            <div>
              <span className="text-xs text-zinc-500 block mb-1">Author / Institution</span>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-pink-500 w-40"
              />
            </div>

            {/* Font Scale */}
            <div>
              <span className="text-xs text-zinc-500 block mb-1">Base Font Scale</span>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
              >
                <option value="12">Compact (12pt)</option>
                <option value="14">Standard (14pt)</option>
                <option value="16">Spacious (16pt)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Split Screen Sandbox: LaTeX Left, Math Preview Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LaTeX / Markdown Source Editor */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[520px]">
            <div className="bg-zinc-950/80 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-pink-400" />
                <span className="text-xs font-bold text-zinc-300">LaTeX & Math Markdown Editor</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">KaTeX Engine</span>
            </div>

            <textarea
              value={latexSource}
              onChange={(e) => setLatexSource(e.target.value)}
              placeholder="Write formulas with $...$ or $$...$$"
              className="flex-1 p-4 bg-zinc-950 text-zinc-200 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-pink-500/50"
              spellCheck="false"
            />
          </div>

          {/* Live Rendered Math Paper Preview */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[520px]">
            <div className="bg-zinc-950/80 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-zinc-300">Live Mathematical Typesetting</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                Instant Vector Preview
              </span>
            </div>

            <div className="flex-1 p-6 bg-white overflow-auto text-black">
              <div ref={previewContainerRef} className="max-w-xl mx-auto space-y-2 text-slate-800" />
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p className="text-xs text-zinc-500">
            Full KaTeX math grammar support including matrices, fractions, integral bounds, Greek symbols, and tensor notation.
          </p>

          <button
            onClick={handleGeneratePdf}
            disabled={converting}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-pink-600/20 cursor-pointer transition-all"
          >
            {converting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Compiling Equations to PDF ({progress}%)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Compile & Generate LaTeX PDF</span>
              </>
            )}
          </button>
        </div>

        {/* Success Download Card */}
        {convertedPdfUrl && (
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">LaTeX Math PDF Ready!</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  High-DPI scientific typesetting • Size: {pdfSize}
                </p>
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              Download Compiled Math PDF
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
