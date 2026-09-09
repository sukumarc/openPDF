import React, { useState, useRef, useEffect } from 'react'
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Download,
  FileUp,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Sliders,
  FileText
} from 'lucide-react'

export default function PdfToAudioTool() {
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageTexts, setPageTexts] = useState({}) // { [pageNum]: text }
  const [loading, setLoading] = useState(false)

  // Speech Synthesis state
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [rate, setRate] = useState(1.0)
  const [pitch, setPitch] = useState(1.0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)

  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const utteranceRef = useRef(null)

  // Populate System Voices
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const available = window.speechSynthesis.getVoices()
        setVoices(available)
        if (available.length > 0 && !selectedVoice) {
          const defaultVoice = available.find((v) => v.lang.startsWith('en')) || available[0]
          setSelectedVoice(defaultVoice.name)
        }
      }
    }

    updateVoices()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF document.')
      return
    }

    setFile(selectedFile)
    setError(null)
    setLoading(true)
    stopAudio()

    try {
      const buffer = await selectedFile.arrayBuffer()
      if (!window.pdfjsLib) throw new Error('PDF library not ready.')

      const doc = await window.pdfjsLib.getDocument({ data: buffer.slice(0) }).promise
      setPageCount(doc.numPages)
      setCurrentPage(1)

      // Extract all page texts
      const extracted = {}
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const textContent = await page.getTextContent()
        const text = textContent.items.map((item) => item.str).join(' ')
        extracted[i] = text || 'No selectable text found on this page.'
      }
      setPageTexts(extracted)
    } catch (err) {
      console.error('Text extraction failed:', err)
      setError('Failed to extract text for audio reading: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const currentText = pageTexts[currentPage] || ''
  const sentences = currentText.split(/(?<=[.?!])\s+/).filter(Boolean)

  // Speech playback handlers
  const playAudio = () => {
    if (!('speechSynthesis' in window)) {
      setError('Speech Synthesis API is not supported in this browser.')
      return
    }

    if (isPaused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
      setIsPlaying(true)
      return
    }

    window.speechSynthesis.cancel()

    if (!currentText || currentText.trim().length === 0) {
      setError('No text found on this page to read.')
      return
    }

    const utterance = new SpeechSynthesisUtterance(currentText)
    const voiceObj = voices.find((v) => v.name === selectedVoice)
    if (voiceObj) utterance.voice = voiceObj

    utterance.rate = rate
    utterance.pitch = pitch

    utterance.onboundary = (e) => {
      // Track char index
    }

    utterance.onend = () => {
      setIsPlaying(false)
      setIsPaused(false)
      // Auto-advance to next page if available
      if (currentPage < pageCount) {
        setCurrentPage((p) => p + 1)
      }
    }

    utterance.onerror = (e) => {
      console.error('Speech error:', e)
      setIsPlaying(false)
      setIsPaused(false)
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
    setIsPlaying(true)
    setIsPaused(false)
  }

  const pauseAudio = () => {
    if ('speechSynthesis' in window && isPlaying) {
      window.speechSynthesis.pause()
      setIsPaused(true)
      setIsPlaying(false)
    }
  }

  const stopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsPlaying(false)
    setIsPaused(false)
  }

  const reset = () => {
    stopAudio()
    setFile(null)
    setPageCount(0)
    setCurrentPage(1)
    setPageTexts({})
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Headphones className="w-6 h-6 text-violet-500" />
            PDF to Audio (Audiobook Reader)
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Listen to PDF documents aloud with natural on-device speech synthesis, speed control, and sentence tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% In-Browser Speech
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Speech Alert</p>
            <p>{error}</p>
          </div>
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
            Select a PDF document to read aloud
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Drag and drop or browse from your computer (never uploaded)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Audio Controls */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
              {/* Playback Button Controls */}
              <div className="flex items-center justify-center gap-3 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                {!isPlaying ? (
                  <button
                    onClick={playAudio}
                    className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-violet-600/20"
                  >
                    <Play className="w-4 h-4 fill-white" /> Play Audio
                  </button>
                ) : (
                  <button
                    onClick={pauseAudio}
                    className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20"
                  >
                    <Pause className="w-4 h-4 fill-zinc-950" /> Pause
                  </button>
                )}

                <button
                  onClick={stopAudio}
                  disabled={!isPlaying && !isPaused}
                  className="p-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 rounded-xl transition-colors border border-zinc-800"
                >
                  <Square className="w-4 h-4 fill-zinc-300" />
                </button>
              </div>

              {/* Voice Selection */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-semibold">Narrator Voice</label>
                <select
                  value={selectedVoice || ''}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100"
                >
                  {voices.map((v, i) => (
                    <option key={i} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              {/* Speed & Pitch Controls */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-zinc-400">Reading Speed:</span>
                    <span className="text-zinc-200 font-semibold">{rate.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
                    <span>0.5x</span>
                    <span>1.0x (Normal)</span>
                    <span>2.0x</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-zinc-400">Voice Pitch:</span>
                    <span className="text-zinc-200 font-semibold">{pitch.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={pitch}
                    onChange={(e) => setPitch(Number(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="w-full py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold"
              >
                Choose Different PDF
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Audiobook Reader Pane */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 px-4 py-2.5 rounded-xl text-xs">
              <span className="text-zinc-400">
                Page <span className="text-white font-semibold">{currentPage}</span> of {pageCount}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => {
                    stopAudio()
                    setCurrentPage((p) => Math.max(1, p - 1))
                  }}
                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage >= pageCount}
                  onClick={() => {
                    stopAudio()
                    setCurrentPage((p) => Math.min(pageCount, p + 1))
                  }}
                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-inner min-h-[460px] max-h-[500px] overflow-y-auto space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800 text-xs text-zinc-400">
                <Volume2 className="w-4 h-4 text-violet-400" />
                <span>Transcript Stream</span>
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
                {currentText}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
