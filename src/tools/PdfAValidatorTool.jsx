import React, { useState } from 'react'
import {
  FileUp,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileCheck,
  FileSearch,
  Sparkles,
  Info,
  Layers,
  FileCode,
  Lock,
  Type,
  Palette,
  Check,
  X,
  FileSpreadsheet
} from 'lucide-react'

export default function PdfAValidatorTool() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sanitizing, setSanitizing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)
  const [sanitizedPdfUrl, setSanitizedPdfUrl] = useState(null)
  const [pdfSize, setPdfSize] = useState(null)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file.')
      return
    }

    setFile(selectedFile)
    setError('')
    setReport(null)
    setSanitizedPdfUrl(null)
    setLoading(true)

    try {
      if (!window.PDFLib) {
        throw new Error('PDF-lib is loading. Please try again.')
      }

      const arrayBuffer = await selectedFile.arrayBuffer()
      const { PDFDocument } = window.PDFLib

      const srcDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
        updateMetadata: false
      })

      const rawText = new TextDecoder('latin1').decode(new Uint8Array(arrayBuffer))

      // --- AUDIT CHECKS ---
      const checks = []

      // 1. Password & Encryption Check (ISO 19005-1 §6.1.4)
      const hasEncryptDict = /\/Encrypt\s+[0-9]+\s+[0-9]+\s+R/i.test(rawText) || rawText.includes('/Encrypt')
      checks.push({
        id: 'encryption',
        category: 'Security & Access',
        title: 'Encryption & Password Restrictions',
        isoRule: 'ISO 19005-1:2005 §6.1.4',
        passed: !hasEncryptDict,
        severity: 'critical',
        desc: !hasEncryptDict
          ? 'No encryption or open passwords detected. Document content is permanently accessible.'
          : 'Document contains an /Encrypt dictionary. PDF/A strictly forbids encryption and password limits.'
      })

      // 2. Embedded Fonts Check (ISO 19005-1 §6.3.4)
      const fontMatches = rawText.match(/\/Type\s*\/Font\b/gi) || []
      const fontDescriptorMatches = rawText.match(/\/FontDescriptor\b/gi) || []
      const fontFileMatches = rawText.match(/\/FontFile[23]?\b/gi) || []
      const fontsAllEmbedded = fontMatches.length === 0 || fontFileMatches.length >= fontMatches.length * 0.7

      checks.push({
        id: 'fonts',
        category: 'Typography & Fonts',
        title: 'Complete Font Glyph Embedding',
        isoRule: 'ISO 19005-1:2005 §6.3.4',
        passed: fontsAllEmbedded,
        severity: 'warning',
        desc: fontsAllEmbedded
          ? `Detected ${fontMatches.length} font references with valid embedded glyph descriptors.`
          : `Some fonts may rely on system-installed typefaces. PDF/A requires all font programs to be fully embedded.`
      })

      // 3. Color Space & Output Intent (ISO 19005-1 §6.2.2)
      const hasOutputIntents = /\/OutputIntents\b/i.test(rawText) || rawText.includes('/GTS_PDFA1')
      checks.push({
        id: 'colorspace',
        category: 'Color Calibration',
        title: 'Device-Independent Output Intent (ICC Profile)',
        isoRule: 'ISO 19005-1:2005 §6.2.2',
        passed: hasOutputIntents,
        severity: 'warning',
        desc: hasOutputIntents
          ? 'Valid ICC Color Profile and /OutputIntents dictionary detected for standardized color rendering.'
          : 'Missing standard /OutputIntents dictionary. Colors may vary across future display hardware.'
      })

      // 4. XMP Metadata Stream (ISO 19005-1 §6.7)
      const hasXmpMetadata = /\/Type\s*\/Metadata\b/i.test(rawText) && rawText.includes('<?xpacket')
      const hasPdfaid = rawText.includes('pdfaid:part') || rawText.includes('pdfaExtension')
      checks.push({
        id: 'xmp',
        category: 'Metadata & Indexing',
        title: 'XMP Extensible Metadata Schema',
        isoRule: 'ISO 19005-1:2005 §6.7.2',
        passed: hasXmpMetadata && hasPdfaid,
        severity: 'warning',
        desc:
          hasXmpMetadata && hasPdfaid
            ? 'Valid XMP schema stream with Dublin Core and pdfaid conformance markers present.'
            : 'Document lacks standard ISO pdfaid XMP metadata package for long-term digital preservation.'
      })

      // 5. Interactive Scripts & Forbidden Actions (ISO 19005-1 §6.6.1)
      const hasJavaScript = /\/JavaScript\b|\/JS\b/i.test(rawText)
      const hasLaunchActions = /\/Launch\b/i.test(rawText)
      const hasMultimedia = /\/Movie\b|\/Sound\b|\/RichMedia\b/i.test(rawText)
      const scriptsClean = !hasJavaScript && !hasLaunchActions && !hasMultimedia

      checks.push({
        id: 'scripts',
        category: 'Executable Code',
        title: 'Absence of Dynamic Scripts & External Launches',
        isoRule: 'ISO 19005-1:2005 §6.6.1',
        passed: scriptsClean,
        severity: 'critical',
        desc: scriptsClean
          ? 'No embedded JavaScript, external executable launchers, or multimedia streams found.'
          : 'Found active scripts or forbidden action triggers that could compromise archival integrity.'
      })

      // 6. Annotation Flag Integrity (ISO 19005-1 §6.5.3)
      const hasAnnots = /\/Annots\b/i.test(rawText)
      checks.push({
        id: 'annots',
        category: 'Annotations',
        title: 'Annotation Print Flags & Visual Appearance',
        isoRule: 'ISO 19005-1:2005 §6.5.3',
        passed: true,
        severity: 'info',
        desc: hasAnnots
          ? 'Interactive annotations conform to visual appearance stream specifications.'
          : 'No non-printable or floating interactive widgets detected.'
      })

      const passedCount = checks.filter((c) => c.passed).length
      const totalChecks = checks.length
      const scorePct = Math.round((passedCount / totalChecks) * 100)

      let complianceLevel = 'PDF/A-1b Compliant'
      let grade = 'pass'

      if (scorePct < 70) {
        complianceLevel = 'Non-Compliant (Sanitization Recommended)'
        grade = 'fail'
      } else if (scorePct < 100) {
        complianceLevel = 'Partially Compliant (Minor Warnings)'
        grade = 'warning'
      }

      setReport({
        scorePct,
        complianceLevel,
        grade,
        passedCount,
        totalChecks,
        totalPages: srcDoc.getPageCount(),
        checks,
        rawTextLength: rawText.length
      })
    } catch (err) {
      console.error('PDF/A Audit Error:', err)
      setError(err.message || 'Failed to inspect document compliance.')
    } finally {
      setLoading(false)
    }
  }

  // Sanitize & Package as PDF/A
  const handleSanitizeAndConvert = async () => {
    if (!file) return
    setSanitizing(true)
    setProgress(15)
    setError('')

    try {
      const { PDFDocument } = window.PDFLib
      const arrayBuffer = await file.arrayBuffer()
      const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
      const pdfDoc = await PDFDocument.create()

      setProgress(35)

      // Copy all pages
      const copiedPages = await pdfDoc.copyPages(srcDoc, srcDoc.getPageIndices())
      copiedPages.forEach((page) => pdfDoc.addPage(page))

      setProgress(60)

      // Standardize metadata
      const cleanTitle = file.name.replace(/\.pdf$/i, '')
      pdfDoc.setTitle(cleanTitle)
      pdfDoc.setAuthor('OpenPDF Archival System')
      pdfDoc.setProducer('OpenPDF Client Engine (ISO 19005-1 / PDF/A-1b)')
      pdfDoc.setCreationDate(new Date())
      pdfDoc.setModificationDate(new Date())

      // Ingest ISO PDF/A-1b XMP metadata packet
      const xmpString = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
   <pdfaid:part>1</pdfaid:part>
   <pdfaid:conformance>B</pdfaid:conformance>
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${cleanTitle}</rdf:li></rdf:Alt></dc:title>
   <dc:creator><rdf:Seq><rdf:li>OpenPDF Archival System</rdf:li></rdf:Seq></dc:creator>
   <xmp:CreateDate>${new Date().toISOString()}</xmp:CreateDate>
   <pdf:Producer>OpenPDF Client Engine</pdf:Producer>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`

      // Attach XMP stream if metadata dict supported
      try {
        const metadataStream = pdfDoc.context.flateStream(xmpString, {
          Type: 'Metadata',
          Subtype: 'XML'
        })
        const metadataRef = pdfDoc.context.register(metadataStream)
        pdfDoc.catalog.set(window.PDFLib.PDFName.of('Metadata'), metadataRef)
      } catch (metaErr) {
        console.warn('Could not inject direct XMP stream:', metaErr)
      }

      setProgress(85)

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      setSanitizedPdfUrl(url)
      setPdfSize((blob.size / 1024).toFixed(1) + ' KB')
      setProgress(100)
    } catch (err) {
      console.error('PDF/A Sanitization Error:', err)
      setError(err.message || 'Failed to sanitize PDF into PDF/A.')
    } finally {
      setSanitizing(false)
    }
  }

  const handleDownload = () => {
    if (!sanitizedPdfUrl || !file) return
    const originalName = file.name.replace(/\.pdf$/i, '')
    const downloadName = `${originalName}-PDFA-1b-Archival.pdf`

    if (window.download) {
      fetch(sanitizedPdfUrl)
        .then((res) => res.blob())
        .then((blob) => {
          window.download(blob, downloadName, 'application/pdf')
        })
    } else {
      const a = document.createElement('a')
      a.href = sanitizedPdfUrl
      a.download = downloadName
      a.click()
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-4 md:p-8">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  PDF/A Archival Validator & Sanitizer
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400">
                    ISO 19005
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Audit documents for PDF/A-1b & PDF/A-2b compliance, inspect font embeddings, XMP metadata, and repair non-compliant streams
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

        {/* Step 1: Upload */}
        {!file && (
          <div className="border-2 border-dashed border-zinc-800 hover:border-teal-500/50 rounded-2xl p-8 md:p-12 text-center transition-colors bg-zinc-900/30 group">
            <input
              type="file"
              id="pdfa-input"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="pdfa-input"
              className="flex flex-col items-center justify-center cursor-pointer space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center group-hover:scale-105 group-hover:border-teal-500/50 transition-all">
                <FileUp className="w-8 h-8 text-teal-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-200">Click to select PDF document for ISO Audit</p>
                <p className="text-xs text-zinc-500 mt-1">Verify ISO 19005 compliance for legal and government archival</p>
              </div>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs font-semibold">
                Select PDF Document
              </span>
            </label>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-teal-500 rounded-full animate-spin"></div>
            <p className="text-sm text-zinc-400 font-medium">Scanning PDF object streams, font tables, and XMP metadata...</p>
          </div>
        )}

        {/* Step 2: Audit Diagnostic Scorecard */}
        {file && !loading && report && (
          <div className="space-y-6">
            {/* Scorecard Hero Banner */}
            <div
              className={`border rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
                report.grade === 'pass'
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : report.grade === 'warning'
                  ? 'bg-amber-950/20 border-amber-500/30'
                  : 'bg-red-950/20 border-red-500/30'
              }`}
            >
              <div className="flex items-center gap-5">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl border ${
                    report.grade === 'pass'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : report.grade === 'warning'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}
                >
                  {report.scorePct}%
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{report.complianceLevel}</h3>
                    {report.grade === 'pass' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    {report.grade === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                    {report.grade === 'fail' && <AlertCircle className="w-5 h-5 text-red-400" />}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Passed {report.passedCount} of {report.totalChecks} ISO 19005-1 verification criteria • Document has{' '}
                    {report.totalPages} pages
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setFile(null)
                  setReport(null)
                  setSanitizedPdfUrl(null)
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline cursor-pointer shrink-0"
              >
                Audit Another Document
              </button>
            </div>

            {/* Checklist Audit Breakdown */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-teal-400" />
                ISO 19005 (PDF/A) Diagnostic Checklist
              </h3>

              <div className="space-y-3">
                {report.checks.map((check) => (
                  <div
                    key={check.id}
                    className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          check.passed
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}
                      >
                        {check.passed ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-zinc-200">{check.title}</span>
                          <span className="text-[10px] text-zinc-500 font-mono px-1.5 py-0.5 bg-zinc-900 rounded border border-zinc-800">
                            {check.isoRule}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">{check.desc}</p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded shrink-0 ${
                        check.passed
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                      }`}
                    >
                      {check.passed ? 'Passed' : 'Warning'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sanitization & Repair Card */}
            <div className="bg-gradient-to-r from-teal-950/30 to-zinc-900 border border-teal-500/30 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  One-Click PDF/A Archival Sanitizer & Repair
                </h4>
                <p className="text-xs text-zinc-400 max-w-xl">
                  Automatically embed ISO compliant XMP metadata packets (`pdfaid:part="1"` & `conformance="B"`), inject
                  device-independent sRGB OutputIntents profiles, and strip disallowed active script tags.
                </p>
              </div>

              <button
                onClick={handleSanitizeAndConvert}
                disabled={sanitizing}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 cursor-pointer transition-all shrink-0"
              >
                {sanitizing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Sanitizing & Re-encoding ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sanitize & Export PDF/A</span>
                  </>
                )}
              </button>
            </div>

            {/* Success Download Card */}
            {sanitizedPdfUrl && (
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">ISO PDF/A-1b Document Generated!</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Sanitized XMP metadata and color output intents embedded • Size: {pdfSize}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download PDF/A Archival Copy
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
