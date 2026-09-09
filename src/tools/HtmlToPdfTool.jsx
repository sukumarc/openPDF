import React, { useState, useRef } from 'react'
import {
  FileCode,
  Download,
  CheckCircle2,
  AlertCircle,
  Play,
  Upload,
  Sparkles,
  Layout,
  Layers,
  FileText,
  Palette,
  Maximize2
} from 'lucide-react'

const TEMPLATES = {
  invoice: {
    name: 'Professional Invoice',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; padding: 30px; margin: 0; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
  .logo-title { font-size: 24px; font-weight: 800; color: #4f46e5; margin: 0; }
  .invoice-tag { font-size: 14px; color: #64748b; margin-top: 4px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 25px 0; font-size: 13px; }
  .info-box h4 { margin: 0 0 6px 0; color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-box p { margin: 2px 0; color: #475569; }
  table { width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 13px; }
  th { background: #f8fafc; color: #334155; font-weight: 600; text-align: left; padding: 10px 12px; border-bottom: 2px solid #cbd5e1; }
  td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; }
  .text-right { text-align: right; }
  .total-card { margin-left: auto; width: 240px; background: #f8fafc; border-radius: 8px; padding: 15px; border: 1px solid #e2e8f0; font-size: 13px; }
  .total-row { display: flex; justify-content: space-between; margin: 4px 0; color: #64748b; }
  .total-row.grand { font-size: 16px; font-weight: 700; color: #0f172a; border-top: 2px solid #cbd5e1; padding-top: 8px; margin-top: 8px; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 15px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="logo-title">Acme Corporation</h1>
      <div class="invoice-tag">Enterprise Software Solutions</div>
    </div>
    <div style="text-align: right;">
      <h2 style="margin: 0; color: #0f172a;">INVOICE</h2>
      <div style="color: #64748b; font-size: 12px;">#INV-2026-0891</div>
      <div style="color: #64748b; font-size: 12px;">Date: September 09, 2026</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h4>Billed To</h4>
      <p><strong>Global Tech Holdings</strong></p>
      <p>100 Innovation Parkway, Suite 400</p>
      <p>San Francisco, CA 94105</p>
      <p>contact@globaltech.io</p>
    </div>
    <div class="info-box" style="text-align: right;">
      <h4>Payment Terms</h4>
      <p>Due Date: Net 30 (October 09, 2026)</p>
      <p>Payment Method: Wire Transfer / ACH</p>
      <p>Status: <span style="color: #16a34a; font-weight: 600;">PAID IN FULL</span></p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="text-right">Hours / Qty</th>
        <th class="text-right">Rate</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Cloud Infrastructure Security Audit</strong><br><span style="font-size: 11px; color: #64748b;">Comprehensive zero-trust architecture penetration testing</span></td>
        <td class="text-right">40</td>
        <td class="text-right">$150.00</td>
        <td class="text-right">$6,000.00</td>
      </tr>
      <tr>
        <td><strong>WebAssembly Engine Integration</strong><br><span style="font-size: 11px; color: #64748b;">Client-side document parsing and cryptographic pipeline</span></td>
        <td class="text-right">25</td>
        <td class="text-right">$175.00</td>
        <td class="text-right">$4,375.00</td>
      </tr>
      <tr>
        <td><strong>Dedicated SLA Support (Q3 2026)</strong><br><span style="font-size: 11px; color: #64748b;">24/7 Priority escalation coverage</span></td>
        <td class="text-right">1</td>
        <td class="text-right">$1,200.00</td>
        <td class="text-right">$1,200.00</td>
      </tr>
    </tbody>
  </table>

  <div class="total-card">
    <div class="total-row"><span>Subtotal</span><span>$11,575.00</span></div>
    <div class="total-row"><span>Tax (0%)</span><span>$0.00</span></div>
    <div class="total-row grand"><span>Total</span><span>$11,575.00</span></div>
  </div>

  <div class="footer">
    Thank you for your business! Please direct questions regarding this invoice to billing@acme.corp.
  </div>
</body>
</html>`
  },
  resume: {
    name: 'Executive Resume',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 35px; margin: 0; background: #fff; line-height: 1.5; font-size: 13px; }
  .name { font-size: 26px; font-weight: bold; color: #0f172a; margin: 0; }
  .title { font-size: 14px; font-weight: 600; color: #4f46e5; margin-top: 3px; }
  .contact { font-size: 12px; color: #64748b; margin-top: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
  .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 3px; margin: 18px 0 10px 0; }
  .job-header { display: flex; justify-content: space-between; font-weight: bold; color: #1e293b; }
  .job-sub { display: flex; justify-content: space-between; color: #64748b; font-size: 12px; margin-bottom: 6px; }
  ul { margin: 4px 0 12px 18px; padding: 0; }
  li { margin-bottom: 3px; color: #334155; }
  .skills-badge { display: inline-block; background: #f1f5f9; color: #334155; padding: 3px 8px; border-radius: 4px; font-size: 11px; margin: 2px 4px 2px 0; font-weight: 500; }
</style>
</head>
<body>
  <div class="name">Sarah Jenkins</div>
  <div class="title">Principal Systems Architect & Lead Software Engineer</div>
  <div class="contact">
    San Francisco, CA • (555) 342-9102 • sarah.jenkins@engineer.dev • linkedin.com/in/sarahjenkins
  </div>

  <div class="section-title">Professional Summary</div>
  <p style="margin: 4px 0; color: #334155;">
    Accomplished Systems Architect with 10+ years designing high-throughput distributed platforms and client-side WebAssembly rendering engines. Proven track record reducing infrastructure cost by 45% while maintaining 99.999% system availability.
  </p>

  <div class="section-title">Core Experience</div>

  <div>
    <div class="job-header"><span>Principal Architect</span><span>2022 – Present</span></div>
    <div class="job-sub"><span>Apex Cloud Technologies</span><span>San Francisco, CA</span></div>
    <ul>
      <li>Architected client-side zero-knowledge document processing engine serving over 4.2M daily active users.</li>
      <li>Spearheaded transition to WebAssembly pipelines, reducing server computing overhead by $820,000 annually.</li>
      <li>Led a cross-functional engineering team of 14 senior engineers across distributed systems and web frontend.</li>
    </ul>
  </div>

  <div style="margin-top: 10px;">
    <div class="job-header"><span>Senior Software Engineer</span><span>2018 – 2022</span></div>
    <div class="job-sub"><span>NextGen Data Labs</span><span>Seattle, WA</span></div>
    <ul>
      <li>Designed real-time indexing pipeline in Rust and TypeScript processing 45,000 events/sec with sub-50ms latency.</li>
      <li>Authored 18 automated integration test suites increasing codebase test coverage from 68% to 96%.</li>
    </ul>
  </div>

  <div class="section-title">Technical Expertise</div>
  <div>
    <span class="skills-badge">JavaScript / TypeScript</span>
    <span class="skills-badge">WebAssembly (WASM)</span>
    <span class="skills-badge">Rust</span>
    <span class="skills-badge">React & Next.js</span>
    <span class="skills-badge">PDF Rendering Engines</span>
    <span class="skills-badge">Distributed Architecture</span>
    <span class="skills-badge">Zero-Knowledge Security</span>
    <span class="skills-badge">Docker & Kubernetes</span>
  </div>
</body>
</html>`
  },
  report: {
    name: 'Research & Business Report',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #222; padding: 40px; margin: 0; background: #fff; line-height: 1.6; }
  h1 { font-size: 24px; color: #111; margin-bottom: 5px; font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 700; }
  .subtitle { font-size: 13px; color: #666; margin-bottom: 20px; font-style: italic; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
  h2 { font-size: 16px; color: #333; margin-top: 25px; border-bottom: 1px solid #eee; padding-bottom: 4px; font-family: 'Helvetica Neue', Arial, sans-serif; }
  p { margin: 10px 0; text-align: justify; font-size: 13px; }
  blockquote { margin: 15px 0; padding: 10px 20px; background: #f9f9fb; border-left: 4px solid #4f46e5; font-style: italic; color: #444; }
  .chart-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #64748b; }
</style>
</head>
<body>
  <h1>Client-Side Privacy Architecture in Modern Web Applications</h1>
  <div class="subtitle">Prepared by DeepMind Agentic Systems Research • Published September 2026</div>

  <h2>1. Executive Summary</h2>
  <p>
    The paradigm of enterprise document manipulation is experiencing a monumental shift from server-bound processing to sandboxed, browser-local execution. Through the advancements of WebAssembly (WASM) compilers, high-performance cryptographic primitives, and DOM virtualization, modern web applications can perform resource-intensive tasks directly in client RAM.
  </p>

  <blockquote>
    "Eliminating server-side document uploads achieves 100% compliance with GDPR, HIPAA, and CCPA data privacy frameworks by design."
  </blockquote>

  <h2>2. Performance & Latency Benchmarks</h2>
  <p>
    In extensive testing across 10,000 multi-page documents, WebAssembly-driven engines demonstrated a 94% reduction in end-to-end turnaround latency compared to traditional cloud REST API upload cycles, effectively removing network transit bottlenecks.
  </p>

  <div class="chart-box">
    <strong>Fig 1.0: End-to-End Processing Latency Comparison (ms)</strong><br>
    Cloud API Round-Trip: 2,450ms | Local WASM Sandbox: 140ms (17.5x Faster)
  </div>

  <h2>3. Key Recommendations</h2>
  <p>
    Organizations managing sensitive financial records, legal contracts, and healthcare records should standardize on offline client architectures to guarantee zero external data leakage.
  </p>
</body>
</html>`
  }
}

export default function HtmlToPdfTool() {
  const [htmlCode, setHtmlCode] = useState(TEMPLATES.invoice.html)
  const [selectedTemplate, setSelectedTemplate] = useState('invoice')
  const [pageSize, setPageSize] = useState('a4') // 'a4', 'letter', 'legal'
  const [orientation, setOrientation] = useState('portrait') // 'portrait', 'landscape'
  const [marginPreset, setMarginPreset] = useState('10') // '0', '10', '20'
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [convertedPdfUrl, setConvertedPdfUrl] = useState(null)
  const [pdfSize, setPdfSize] = useState(null)
  const previewRef = useRef(null)

  const handleTemplateChange = (key) => {
    setSelectedTemplate(key)
    if (TEMPLATES[key]) {
      setHtmlCode(TEMPLATES[key].html)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result
      if (typeof content === 'string') {
        setHtmlCode(content)
        setSelectedTemplate('custom')
      }
    }
    reader.readAsText(file)
  }

  const handleGeneratePdf = async () => {
    if (!htmlCode.trim()) {
      setError('Please provide HTML content to convert.')
      return
    }

    setConverting(true)
    setProgress(20)
    setError('')

    try {
      if (!window.html2canvas || !window.jspdf) {
        throw new Error('Required PDF rendering libraries are still loading. Please try again.')
      }

      // Create an offscreen container to render pristine HTML
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.width = orientation === 'landscape' ? '1120px' : '794px' // A4 width at 96 DPI
      container.style.background = '#ffffff'
      container.style.color = '#000000'
      container.innerHTML = htmlCode

      document.body.appendChild(container)
      setProgress(40)

      // Render container to high-res canvas
      const canvas = await window.html2canvas(container, {
        scale: 2, // 2x high resolution DPI
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })

      document.body.removeChild(container)
      setProgress(70)

      const imgData = canvas.toDataURL('image/jpeg', 0.95)

      // Initialize jsPDF
      const { jsPDF } = window.jspdf
      const pdf = new jsPDF({
        orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
        unit: 'mm',
        format: pageSize
      })

      const pdfPageWidth = pdf.internal.pageSize.getWidth()
      const pdfPageHeight = pdf.internal.pageSize.getHeight()

      const margin = parseInt(marginPreset, 10)
      const contentWidth = pdfPageWidth - margin * 2
      const contentHeight = (canvas.height * contentWidth) / canvas.width

      let heightLeft = contentHeight
      let position = margin

      // Multi-page canvas slicing
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
      console.error('HTML to PDF Error:', err)
      setError(err.message || 'Failed to render HTML into PDF.')
    } finally {
      setConverting(false)
    }
  }

  const handleDownload = () => {
    if (!convertedPdfUrl) return
    const downloadName = `HTML-Document-${Date.now()}.pdf`

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
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <FileCode className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  HTML & Code to PDF
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    Live Sandbox
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Live HTML/CSS sandbox and document converter rendering pixel-perfect styled PDFs in browser memory
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

        {/* Configuration Bar */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Template Selector */}
            <div>
              <span className="text-xs text-zinc-500 block mb-1">Preset Templates</span>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="invoice">Invoice / Receipt</option>
                <option value="resume">Executive Resume</option>
                <option value="report">Business & Research Report</option>
                {selectedTemplate === 'custom' && <option value="custom">Custom Upload / Code</option>}
              </select>
            </div>

            {/* Page Size */}
            <div>
              <span className="text-xs text-zinc-500 block mb-1">Page Format</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value)}
                className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="a4">A4 (Standard)</option>
                <option value="letter">US Letter</option>
                <option value="legal">US Legal</option>
              </select>
            </div>

            {/* Orientation */}
            <div>
              <span className="text-xs text-zinc-500 block mb-1">Orientation</span>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value)}
                className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            {/* Margins */}
            <div>
              <span className="text-xs text-zinc-500 block mb-1">Margins</span>
              <select
                value={marginPreset}
                onChange={(e) => setMarginPreset(e.target.value)}
                className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="0">Zero Margin (0mm)</option>
                <option value="10">Standard (10mm)</option>
                <option value="20">Spacious (20mm)</option>
              </select>
            </div>
          </div>

          {/* Upload HTML File Button */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              id="html-file-input"
              accept=".html,.htm,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="html-file-input"
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              Upload .HTML File
            </label>
          </div>
        </div>

        {/* Split Screen Sandbox: Editor Left, Live Preview Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* HTML / CSS Editor */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[520px]">
            <div className="bg-zinc-950/80 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-zinc-300">HTML & CSS Code Editor</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">Real-time Sandbox</span>
            </div>

            <textarea
              value={htmlCode}
              onChange={(e) => setHtmlCode(e.target.value)}
              placeholder="Paste or write HTML/CSS code here..."
              className="flex-1 p-4 bg-zinc-950 text-zinc-200 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              spellCheck="false"
            />
          </div>

          {/* Live Document Preview */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[520px]">
            <div className="bg-zinc-950/80 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-zinc-300">Live Rendered Preview</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                Print Simulation
              </span>
            </div>

            <div className="flex-1 p-3 bg-zinc-950/60 overflow-auto flex items-start justify-center">
              <div className="w-full bg-white text-black shadow-2xl rounded p-4 min-h-full">
                <iframe
                  title="Rendered Document Sandbox"
                  srcDoc={htmlCode}
                  className="w-full h-[440px] border-none"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p className="text-xs text-zinc-500">
            High-DPI 2.0x vector canvas rasterization preserves all fonts, styles, inline CSS, and layout formatting.
          </p>

          <button
            onClick={handleGeneratePdf}
            disabled={converting}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 cursor-pointer transition-all"
          >
            {converting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Rendering HTML to PDF ({progress}%)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Render & Generate PDF</span>
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
                <h4 className="text-sm font-bold text-white">PDF Document Generated!</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  High-resolution rendered document • Size: {pdfSize} • Format: {pageSize.toUpperCase()} ({orientation})
                </p>
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              Download Generated PDF
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
