import React, { useState, useRef, useEffect } from 'react'
import {
  Mic,
  MicOff,
  Download,
  FileUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileText,
  Clock,
  Sparkles,
  ListTodo
} from 'lucide-react'

export default function AudioToPdfTool() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcriptSegments, setTranscriptSegments] = useState([])
  const [currentInterim, setCurrentInterim] = useState('')

  // Document metadata
  const [docTitle, setDocTitle] = useState('Voice Meeting Minutes')
  const [docTemplate, setDocTemplate] = useState('meeting') // 'meeting' | 'lecture' | 'notes'
  const [authorName, setAuthorName] = useState('')

  // Status
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const recognitionRef = useRef(null)

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Speech Recognition is not supported natively in this browser. (Use Chrome or Edge).')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i]
        if (item.isFinal) {
          const finalStr = item[0].transcript.trim()
          if (finalStr) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            setTranscriptSegments((prev) => [...prev, { time: timeStr, text: finalStr }])
          }
        } else {
          interim += item[0].transcript
        }
      }
      setCurrentInterim(interim)
    }

    recognition.onerror = (e) => {
      console.error('Speech recognition error:', e)
      if (e.error !== 'no-speech') {
        setError('Microphone Error: ' + e.error)
      }
    }

    recognition.onend = () => {
      if (isRecording) {
        try {
          recognition.start()
        } catch {}
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [isRecording])

  const toggleRecording = () => {
    if (!recognitionRef.current) return
    setError(null)

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
      setCurrentInterim('')
    } else {
      try {
        recognitionRef.current.start()
        setIsRecording(true)
      } catch (err) {
        setError('Could not start microphone: ' + err.message)
      }
    }
  }

  // Generate Styled PDF Transcript
  const handleExportPdf = async () => {
    if (transcriptSegments.length === 0) {
      setError('No transcript segments recorded yet. Speak into your microphone first.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib || (await import('pdf-lib'))
      const pdfDoc = await PDFDocument.create()

      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

      let page = pdfDoc.addPage([595.28, 841.89]) // A4
      let y = 841.89 - 50

      const checkNewPage = (needed) => {
        if (y - needed < 50) {
          page = pdfDoc.addPage([595.28, 841.89])
          y = 841.89 - 50
        }
      }

      // Title Header
      page.drawText(docTitle || 'Audio Transcript Report', {
        x: 50,
        y,
        size: 20,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1)
      })
      y -= 25

      // Subtitle / Date
      const dateStr = `Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} ${
        authorName ? `• Speaker: ${authorName}` : ''
      }`
      page.drawText(dateStr, {
        x: 50,
        y,
        size: 10,
        font: fontOblique,
        color: rgb(0.4, 0.4, 0.4)
      })
      y -= 20

      // Decorative divider
      page.drawLine({
        start: { x: 50, y },
        end: { x: 545, y },
        thickness: 1,
        color: rgb(0.85, 0.85, 0.85)
      })
      y -= 25

      // Transcript Paragraphs
      transcriptSegments.forEach((seg, idx) => {
        checkNewPage(45)

        // Timestamp Badge
        page.drawText(`[${seg.time}]`, {
          x: 50,
          y,
          size: 9,
          font: fontBold,
          color: rgb(0.45, 0.25, 0.8)
        })

        // Wrap text
        const words = seg.text.split(' ')
        let currentLine = ''
        const lines = []

        words.forEach((w) => {
          const testLine = currentLine ? `${currentLine} ${w}` : w
          const width = fontRegular.widthOfTextAtSize(testLine, 10.5)
          if (width > 420) {
            lines.push(currentLine)
            currentLine = w
          } else {
            currentLine = testLine
          }
        })
        if (currentLine) lines.push(currentLine)

        lines.forEach((l, lineIdx) => {
          page.drawText(l, {
            x: 120,
            y: y - lineIdx * 14,
            size: 10.5,
            font: fontRegular,
            color: rgb(0.15, 0.15, 0.15)
          })
        })

        y -= Math.max(25, lines.length * 14 + 12)
      })

      const outputBytes = await pdfDoc.save()
      const outputFilename = `${(docTitle || 'Transcript').replace(/\s+/g, '_')}.pdf`

      if (window.download) {
        window.download(outputBytes, outputFilename, 'application/pdf')
      } else {
        const blob = new Blob([outputBytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = outputFilename
        a.click()
        URL.revokeObjectURL(url)
      }

      setSuccess(true)
    } catch (err) {
      console.error('PDF export failed:', err)
      setError('Failed to generate PDF: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
    setTranscriptSegments([])
    setCurrentInterim('')
    setError(null)
    setSuccess(false)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Mic className="w-6 h-6 text-violet-500" />
            Speech to PDF Transcriber
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Transcribe live microphone speech, interviews, and meetings into formatted, timestamped PDF reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% Client-Side Voice
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Action Alert</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {success && (
        <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-4 text-emerald-400">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-semibold text-white">Transcript PDF Exported Successfully</p>
              <p className="text-xs text-emerald-300 mt-0.5">
                Your timestamped voice notes have been downloaded as a styled PDF report.
              </p>
            </div>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> New Recording
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recording Controls & Metadata */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
            {/* Big Mic Toggle */}
            <div className="flex flex-col items-center justify-center p-6 bg-zinc-950 rounded-2xl border border-zinc-800 text-center space-y-3">
              <button
                onClick={toggleRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse shadow-red-500/30 scale-105'
                    : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/20'
                }`}
              >
                {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
              <div>
                <p className="text-sm font-bold text-white">
                  {isRecording ? 'Listening & Transcribing...' : 'Click to Start Dictation'}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {isRecording ? 'Speak clearly into your microphone' : 'On-device real-time speech engine'}
                </p>
              </div>
            </div>

            {/* Document Details */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Document Title</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Weekly Strategy Sync"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Speaker / Author (Optional)</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-400 space-y-1">
              <div className="flex justify-between">
                <span>Segments Recorded:</span>
                <span className="text-zinc-200 font-semibold">{transcriptSegments.length} entries</span>
              </div>
              <div className="flex justify-between">
                <span>Total Words:</span>
                <span className="text-violet-400 font-semibold">
                  {transcriptSegments.reduce((acc, s) => acc + s.text.split(' ').length, 0)} words
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="px-4 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold"
            >
              Clear
            </button>
            <button
              onClick={handleExportPdf}
              disabled={saving || transcriptSegments.length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-violet-600/20"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Export Styled Transcript PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Transcript Feed */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-zinc-900/60 border border-zinc-800 px-4 py-2.5 rounded-xl text-xs flex justify-between items-center">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-violet-400" />
              Live Transcript Feed
            </span>
            {isRecording && (
              <span className="flex items-center gap-1 text-[11px] text-red-400 font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Recording
              </span>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-inner min-h-[460px] max-h-[500px] overflow-y-auto space-y-3">
            {transcriptSegments.length === 0 && !currentInterim ? (
              <div className="h-[380px] flex flex-col items-center justify-center text-center text-zinc-500 text-xs space-y-2">
                <FileText className="w-10 h-10 text-zinc-700" />
                <p>No voice data recorded yet.</p>
                <p className="text-zinc-600 max-w-xs">
                  Press the microphone button and begin speaking to see real-time transcription here.
                </p>
              </div>
            ) : (
              <>
                {transcriptSegments.map((seg, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
                    <span className="text-[10px] font-mono text-violet-400 font-bold">[{seg.time}]</span>
                    <p className="text-xs text-zinc-200 leading-relaxed">{seg.text}</p>
                  </div>
                ))}
                {currentInterim && (
                  <div className="p-3 rounded-xl bg-zinc-950/60 border border-dashed border-violet-500/40 text-xs text-violet-300 italic">
                    {currentInterim}...
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
