import React, { useState, useRef, useEffect } from 'react'
import {
  Share2,
  Radio,
  Download,
  FileUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Copy,
  Check,
  ArrowRight,
  HardDrive,
  FileText
} from 'lucide-react'

export default function P2PShareTool() {
  const [role, setRole] = useState('sender') // 'sender' | 'receiver'

  // Sender state
  const [file, setFile] = useState(null)
  const [offerCode, setOfferCode] = useState('')
  const [receiverAnswerInput, setReceiverAnswerInput] = useState('')

  // Receiver state
  const [senderOfferInput, setSenderOfferInput] = useState('')
  const [answerCode, setAnswerCode] = useState('')
  const [receivedFile, setReceivedFile] = useState(null)

  // Connection & Transfer Status
  const [connectionStatus, setConnectionStatus] = useState('disconnected') // 'disconnected' | 'connecting' | 'connected' | 'transferring' | 'complete'
  const [progress, setProgress] = useState(0)
  const [transferSpeed, setTransferSpeed] = useState('')
  const [copiedOffer, setCopiedOffer] = useState(false)
  const [copiedAnswer, setCopiedAnswer] = useState(false)
  const [error, setError] = useState(null)

  const peerConnectionRef = useRef(null)
  const dataChannelRef = useRef(null)
  const fileInputRef = useRef(null)

  // ICE Servers (Public STUN)
  const rtcConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
  }

  // SENDER: Create WebRTC Offer
  const handleCreateOffer = async () => {
    if (!file) {
      setError('Please select a PDF file to share.')
      return
    }

    setError(null)
    setConnectionStatus('connecting')

    try {
      const pc = new RTCPeerConnection(rtcConfig)
      peerConnectionRef.current = pc

      const dc = pc.createDataChannel('fileTransfer', { ordered: true })
      dataChannelRef.current = dc

      setupDataChannel(dc)

      pc.onicecandidate = (e) => {
        if (!e.candidate) {
          // Gathering complete
          const offerStr = btoa(JSON.stringify(pc.localDescription))
          setOfferCode(offerStr)
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
    } catch (err) {
      console.error('Offer failed:', err)
      setError('Failed to initiate WebRTC offer: ' + err.message)
    }
  }

  // SENDER: Accept Receiver's Answer
  const handleAcceptAnswer = async () => {
    if (!receiverAnswerInput.trim()) return
    try {
      const answerObj = JSON.parse(atob(receiverAnswerInput.trim()))
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answerObj))
      setConnectionStatus('connected')
    } catch (err) {
      setError('Invalid Answer Code: ' + err.message)
    }
  }

  // RECEIVER: Accept Sender's Offer and generate Answer
  const handleProcessOffer = async () => {
    if (!senderOfferInput.trim()) return
    setError(null)
    setConnectionStatus('connecting')

    try {
      const pc = new RTCPeerConnection(rtcConfig)
      peerConnectionRef.current = pc

      pc.ondatachannel = (e) => {
        const dc = e.channel
        dataChannelRef.current = dc
        setupDataChannel(dc)
      }

      pc.onicecandidate = (e) => {
        if (!e.candidate) {
          const answerStr = btoa(JSON.stringify(pc.localDescription))
          setAnswerCode(answerStr)
        }
      }

      const offerObj = JSON.parse(atob(senderOfferInput.trim()))
      await pc.setRemoteDescription(new RTCSessionDescription(offerObj))

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
    } catch (err) {
      setError('Invalid Sender Offer Code: ' + err.message)
    }
  }

  // DataChannel Handler for Chunked Transfer
  const setupDataChannel = (dc) => {
    let receivedChunks = []
    let metadata = null

    dc.onopen = () => {
      setConnectionStatus('connected')
      if (role === 'sender' && file) {
        sendFileOverDataChannel(dc)
      }
    }

    dc.onmessage = (e) => {
      if (typeof e.data === 'string') {
        // Metadata message
        metadata = JSON.parse(e.data)
        receivedChunks = []
        setConnectionStatus('transferring')
      } else {
        // ArrayBuffer chunk
        receivedChunks.push(e.data)
        const totalReceived = receivedChunks.reduce((acc, c) => acc + c.byteLength, 0)
        const pct = Math.round((totalReceived / metadata.size) * 100)
        setProgress(pct)

        if (totalReceived >= metadata.size) {
          // Complete
          const blob = new Blob(receivedChunks, { type: metadata.type || 'application/pdf' })
          setReceivedFile({ name: metadata.name, size: metadata.size, blob })
          setConnectionStatus('complete')

          if (window.download) {
            window.download(blob, metadata.name, 'application/pdf')
          }
        }
      }
    }

    dc.onerror = (e) => {
      console.error('Data channel error:', e)
      setError('Data transfer interrupted.')
    }
  }

  // SENDER: Stream file in 16KB Chunks
  const sendFileOverDataChannel = async (dc) => {
    setConnectionStatus('transferring')
    setProgress(0)

    const CHUNK_SIZE = 16 * 1024
    const buffer = await file.arrayBuffer()

    // Send metadata header first
    dc.send(
      JSON.stringify({
        name: file.name,
        size: file.size,
        type: file.type
      })
    )

    let offset = 0
    const total = buffer.byteLength

    const sendNextChunk = () => {
      while (offset < total) {
        if (dc.bufferedAmount > 8 * 1024 * 1024) {
          // Throttle if buffer is full
          setTimeout(sendNextChunk, 50)
          return
        }

        const chunk = buffer.slice(offset, offset + CHUNK_SIZE)
        dc.send(chunk)
        offset += CHUNK_SIZE
        setProgress(Math.min(100, Math.round((offset / total) * 100)))
      }

      setConnectionStatus('complete')
    }

    sendNextChunk()
  }

  const reset = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }
    setFile(null)
    setOfferCode('')
    setReceiverAnswerInput('')
    setSenderOfferInput('')
    setAnswerCode('')
    setReceivedFile(null)
    setConnectionStatus('disconnected')
    setProgress(0)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-violet-500" />
            P2P Direct File Share (WebRTC)
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            End-to-end encrypted direct browser-to-browser PDF transfer (zero servers, zero cloud storage).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Zero-Server WebRTC
          </span>
        </div>
      </div>

      {/* Role Switcher */}
      <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800 max-w-sm mx-auto">
        <button
          onClick={() => {
            reset()
            setRole('sender')
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${
            role === 'sender' ? 'bg-violet-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <FileUp className="w-4 h-4" /> Send PDF
        </button>
        <button
          onClick={() => {
            reset()
            setRole('receiver')
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${
            role === 'receiver' ? 'bg-violet-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Download className="w-4 h-4" /> Receive PDF
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Transfer Alert</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Status Progress */}
      {connectionStatus === 'transferring' && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-2">
          <div className="flex justify-between text-xs text-zinc-300">
            <span>Streaming P2P Data Channels...</span>
            <span className="font-semibold text-violet-400">{progress}%</span>
          </div>
          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 transition-all duration-150" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Complete Notification */}
      {connectionStatus === 'complete' && (
        <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-4 text-emerald-400">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-semibold text-white">
                {role === 'sender' ? 'PDF Sent Directly to Peer!' : 'PDF Received & Downloaded Successfully!'}
              </p>
              <p className="text-xs text-emerald-300 mt-0.5">
                Direct device-to-device encrypted memory transfer finished.
              </p>
            </div>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Share Another
          </button>
        </div>
      )}

      {/* Role 1: Sender Flow */}
      {role === 'sender' && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-5">
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-800 hover:border-violet-500/50 bg-zinc-950/60 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer text-center"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0])}
                className="hidden"
              />
              <FileUp className="w-8 h-8 text-violet-400 mb-2" />
              <h4 className="text-sm font-semibold text-zinc-200">Select PDF to Share Directly</h4>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-violet-400" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-100">{file.name}</p>
                    <p className="text-[10px] text-zinc-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
                <button onClick={reset} className="text-xs text-zinc-400 hover:text-white">
                  Change
                </button>
              </div>

              {!offerCode ? (
                <button
                  onClick={handleCreateOffer}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-violet-600/20"
                >
                  Generate Peer Connection Code
                </button>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400 font-semibold block">
                      1. Copy this Connection Code & send to recipient:
                    </label>
                    <div className="relative">
                      <textarea
                        readOnly
                        value={offerCode}
                        rows={3}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 font-mono focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(offerCode)
                          setCopiedOffer(true)
                          setTimeout(() => setCopiedOffer(false), 2000)
                        }}
                        className="absolute top-3 right-3 px-2.5 py-1 bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 shadow"
                      >
                        {copiedOffer ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedOffer ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400 font-semibold block">
                      2. Paste Recipient's Answer Code here:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={receiverAnswerInput}
                        onChange={(e) => setReceiverAnswerInput(e.target.value)}
                        placeholder="Paste recipient answer code..."
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
                      />
                      <button
                        onClick={handleAcceptAnswer}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl"
                      >
                        Connect & Send
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Role 2: Receiver Flow */}
      {role === 'receiver' && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-semibold block">
              1. Paste Sender's Connection Code:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={senderOfferInput}
                onChange={(e) => setSenderOfferInput(e.target.value)}
                placeholder="Paste code from sender..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
              />
              <button
                onClick={handleProcessOffer}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl"
              >
                Accept Code
              </button>
            </div>
          </div>

          {answerCode && (
            <div className="space-y-1.5 pt-2">
              <label className="text-xs text-zinc-400 font-semibold block">
                2. Send this Answer Code back to Sender:
              </label>
              <div className="relative">
                <textarea
                  readOnly
                  value={answerCode}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 font-mono focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(answerCode)
                    setCopiedAnswer(true)
                    setTimeout(() => setCopiedAnswer(false), 2000)
                  }}
                  className="absolute top-3 right-3 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 shadow"
                >
                  {copiedAnswer ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedAnswer ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
