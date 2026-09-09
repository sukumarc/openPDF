import React, { useState, useRef, useEffect } from 'react'
import {
  Stamp,
  Type,
  Image as ImageIcon,
  Download,
  FileUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sliders,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

export default function WatermarkTool() {
  const [file, setFile] = useState(null)
  const [fileBuffer, setFileBuffer] = useState(null)
  const [pdfDocProxy, setPdfDocProxy] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  // Mode: 'text' | 'image'
  const [mode, setMode] = useState('text')

  // Text Watermark Options
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL')
  const [textColor, setTextColor] = useState('#ff0000')
  const [fontSize, setFontSize] = useState(48)
  const [opacity, setOpacity] = useState(0.25)
  const [rotation, setRotation] = useState(45)
  const [isTiled, setIsTiled] = useState(false)

  // Image Watermark Options
  const [imageFile, setImageFile] = useState(null)
  const [imageDataUrl, setImageDataUrl] = useState(null)
  const [imageScale, setImageScale] = useState(0.5)
  const imageInputRef = useRef(null)

  // Target Pages
  const [pageSelection, setPageSelection] = useState('all') // 'all' | 'first' | 'odd' | 'even'

  // Processing state
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const pdfCanvasRef = useRef(null)
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF file.')
      return
    }

    setFile(selectedFile)
    setError(null)
    setSuccess(false)

    try {
      const buffer = await selectedFile.arrayBuffer()
      setFileBuffer(buffer)

      if (!window.pdfjsLib) {
        throw new Error('PDF library not loaded. Please refresh.')
      }

      const loadingTask = window.pdfjsLib.getDocument({ data: buffer.slice(0) })
      const doc = await loadingTask.promise
      setPdfDocProxy(doc)
      setPageCount(doc.numPages)
      setCurrentPage(1)
    } catch (err) {
      console.error('Failed to parse PDF:', err)
      setError('Failed to inspect PDF: ' + err.message)
    }
  }

  // Render PDF page with simulated live watermark
  useEffect(() => {
    if (!pdfDocProxy || !pdfCanvasRef.current) return

    let isCancelled = false
    const renderPreview = async () => {
      try {
        const page = await pdfDocProxy.getPage(currentPage)
        const viewport = page.getViewport({ scale: 1.2 })

        const canvas = pdfCanvasRef.current
        if (!canvas) return
        canvas.width = viewport.width
        canvas.height = viewport.height

        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Render base PDF page
        await page.render({ canvasContext: ctx, viewport }).promise

        // Render Live Watermark Overlay
        ctx.save()
        ctx.globalAlpha = opacity

        if (mode === 'text' && watermarkText) {
          ctx.fillStyle = textColor
          ctx.font = `bold ${fontSize}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'

          if (isTiled) {
            const stepX = 220
            const stepY = 180
            for (let x = 50; x < canvas.width; x += stepX) {
              for (let y = 50; y < canvas.height; y += stepY) {
                ctx.save()
                ctx.translate(x, y)
                ctx.rotate((rotation * Math.PI) / 180)
                ctx.fillText(watermarkText, 0, 0)
                ctx.restore()
              }
            }
          } else {
            ctx.translate(canvas.width / 2, canvas.height / 2)
            ctx.rotate((rotation * Math.PI) / 180)
            ctx.fillText(watermarkText, 0, 0)
          }
        } else if (mode === 'image' && imageDataUrl) {
          const img = new Image()
          img.onload = () => {
            const w = img.width * imageScale
            const h = img.height * imageScale
            ctx.translate(canvas.width / 2, canvas.height / 2)
            ctx.rotate((rotation * Math.PI) / 180)
            ctx.drawImage(img, -w / 2, -h / 2, w, h)
          }
          img.src = imageDataUrl
        }

        ctx.restore()
      } catch (err) {
        if (!isCancelled) console.error('Preview error:', err)
      }
    }

    renderPreview()
    return () => {
      isCancelled = true
    }
  }, [
    pdfDocProxy,
    currentPage,
    mode,
    watermarkText,
    textColor,
    fontSize,
    opacity,
    rotation,
    isTiled,
    imageDataUrl,
    imageScale
  ])

  // Handle Logo / Image upload
  const handleImageUpload = (e) => {
    const img = e.target.files?.[0]
    if (!img) return
    setImageFile(img)
    const reader = new FileReader()
    reader.onload = (ev) => setImageDataUrl(ev.target.result)
    reader.readAsDataURL(img)
  }

  // Apply Watermark and Export
  const handleApplyWatermark = async () => {
    if (!file || !fileBuffer) return

    setProcessing(true)
    setError(null)

    try {
      const { PDFDocument, rgb, degrees, StandardFonts } = window.PDFLib || (await import('pdf-lib'))
      const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true })
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      // Parse color hex
      const r = parseInt(textColor.slice(1, 3), 16) / 255
      const g = parseInt(textColor.slice(3, 5), 16) / 255
      const b = parseInt(textColor.slice(5, 7), 16) / 255

      let embeddedImage = null
      if (mode === 'image' && imageDataUrl) {
        const imgBytes = await fetch(imageDataUrl).then((res) => res.arrayBuffer())
        if (imageFile?.type?.includes('png') || imageDataUrl.startsWith('data:image/png')) {
          embeddedImage = await pdfDoc.embedPng(imgBytes)
        } else {
          embeddedImage = await pdfDoc.embedJpg(imgBytes)
        }
      }

      const pages = pdfDoc.getPages()
      pages.forEach((p, idx) => {
        const pageNum = idx + 1
        let shouldWatermark = false

        if (pageSelection === 'all') shouldWatermark = true
        else if (pageSelection === 'first' && pageNum === 1) shouldWatermark = true
        else if (pageSelection === 'odd' && pageNum % 2 !== 0) shouldWatermark = true
        else if (pageSelection === 'even' && pageNum % 2 === 0) shouldWatermark = true

        if (!shouldWatermark) return

        const { width: pWidth, height: pHeight } = p.getSize()

        if (mode === 'text' && watermarkText) {
          if (isTiled) {
            const stepX = 220
            const stepY = 180
            for (let x = 60; x < pWidth; x += stepX) {
              for (let y = 60; y < pHeight; y += stepY) {
                p.drawText(watermarkText, {
                  x,
                  y,
                  size: fontSize * 0.75,
                  font,
                  color: rgb(r, g, b),
                  opacity,
                  rotate: degrees(rotation)
                })
              }
            }
          } else {
            const textWidth = font.widthOfTextAtSize(watermarkText, fontSize)
            const textHeight = font.heightAtSize(fontSize)
            p.drawText(watermarkText, {
              x: (pWidth - textWidth) / 2,
              y: (pHeight - textHeight) / 2,
              size: fontSize,
              font,
              color: rgb(r, g, b),
              opacity,
              rotate: degrees(rotation)
            })
          }
        } else if (mode === 'image' && embeddedImage) {
          const imgDims = embeddedImage.scale(imageScale * 0.5)
          p.drawImage(embeddedImage, {
            x: (pWidth - imgDims.width) / 2,
            y: (pHeight - imgDims.height) / 2,
            width: imgDims.width,
            height: imgDims.height,
            opacity,
            rotate: degrees(rotation)
          })
        }
      })

      const outputBytes = await pdfDoc.save()
      const outputFilename = `${file.name.replace(/\.pdf$/i, '')}_watermarked.pdf`

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
      console.error('Watermarking failed:', err)
      setError('Failed to watermark PDF: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const reset = () => {
    setFile(null)
    setFileBuffer(null)
    setPdfDocProxy(null)
    setPageCount(0)
    setCurrentPage(1)
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
            <Stamp className="w-6 h-6 text-amber-500" />
            Add Watermark to PDF
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Apply custom text or logo watermarks with transparency, rotation, and tiled repeating grids.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% Client-Side
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Action Failed</p>
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
              <p className="font-semibold text-white">Watermark Applied Successfully</p>
              <p className="text-xs text-emerald-300 mt-0.5">
                The watermarked document has been saved and downloaded.
              </p>
            </div>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Watermark Another
          </button>
        </div>
      )}

      {/* Upload Zone */}
      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-800 hover:border-amber-500/50 bg-zinc-900/30 hover:bg-zinc-900/60 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group text-center"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 group-hover:bg-amber-500/10 flex items-center justify-center mb-4 transition-colors">
            <FileUp className="w-8 h-8 text-zinc-400 group-hover:text-amber-400 transition-colors" />
          </div>
          <h3 className="text-base font-semibold text-zinc-200 group-hover:text-white">
            Select a PDF to watermark
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Drag and drop or browse from your computer (never uploaded)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Watermark Controls */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
              {/* Type Switcher */}
              <div className="flex p-1 bg-zinc-950 rounded-xl border border-zinc-800">
                <button
                  onClick={() => setMode('text')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                    mode === 'text'
                      ? 'bg-amber-500 text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" /> Text Watermark
                </button>
                <button
                  onClick={() => setMode('image')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                    mode === 'image'
                      ? 'bg-amber-500 text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Image / Logo
                </button>
              </div>

              {/* Mode: Text Options */}
              {mode === 'text' ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Watermark Text</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      placeholder="e.g. CONFIDENTIAL"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Preset Quick Words */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['CONFIDENTIAL', 'DRAFT', 'DO NOT COPY', 'SAMPLE', 'APPROVED'].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setWatermarkText(preset)}
                        className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 font-medium"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  {/* Text Color & Size */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Font Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                        />
                        <span className="text-xs text-zinc-300 font-mono">{textColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Font Size: {fontSize}px</label>
                      <input
                        type="range"
                        min="20"
                        max="90"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </div>

                  {/* Tiled Grid checkbox */}
                  <label className="flex items-center gap-2 pt-1 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTiled}
                      onChange={(e) => setIsTiled(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500/20"
                    />
                    Tile across the entire page (Repeated Grid)
                  </label>
                </div>
              ) : (
                /* Mode: Image Options */
                <div className="space-y-3">
                  <div
                    onClick={() => imageInputRef.current?.click()}
                    className="border border-dashed border-zinc-700 bg-zinc-950 rounded-xl p-5 text-center cursor-pointer hover:border-amber-500"
                  >
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <ImageIcon className="w-6 h-6 text-zinc-500 mx-auto mb-1.5" />
                    <p className="text-xs text-zinc-200 font-medium">
                      {imageFile ? imageFile.name : 'Upload Logo / Seal Image'}
                    </p>
                    <p className="text-[10px] text-zinc-500">PNG with transparency recommended</p>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">
                      Image Scale: {Math.round(imageScale * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.5"
                      step="0.05"
                      value={imageScale}
                      onChange={(e) => setImageScale(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Shared Options: Opacity & Angle */}
              <div className="space-y-3 pt-3 border-t border-zinc-800">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">
                      Opacity: {Math.round(opacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.05"
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">
                      Rotation: {rotation}°
                    </label>
                    <input
                      type="range"
                      min="-90"
                      max="90"
                      step="5"
                      value={rotation}
                      onChange={(e) => setRotation(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>

                {/* Page Selection */}
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Apply to Pages</label>
                  <select
                    value={pageSelection}
                    onChange={(e) => setPageSelection(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">All Pages ({pageCount} pages)</option>
                    <option value="first">First Page Only</option>
                    <option value="odd">Odd Pages Only (1, 3, 5...)</option>
                    <option value="even">Even Pages Only (2, 4, 6...)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="px-4 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyWatermark}
                disabled={processing || (mode === 'text' && !watermarkText) || (mode === 'image' && !imageDataUrl)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Watermarking...
                  </>
                ) : (
                  <>
                    <Stamp className="w-4 h-4" /> Apply & Download PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Live PDF Preview */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 px-4 py-2.5 rounded-xl text-xs">
              <span className="text-zinc-400">
                Live Preview: Page <span className="text-white font-semibold">{currentPage}</span> of {pageCount}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage >= pageCount}
                  onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 overflow-hidden flex justify-center items-center shadow-inner min-h-[500px]">
              <canvas ref={pdfCanvasRef} className="max-w-full max-h-[600px] object-contain shadow-2xl rounded" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
