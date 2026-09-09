import React, { useState, useRef } from 'react'
import { FileUp, Download, RefreshCw, Trash2, ArrowLeft, ArrowRight, Layers, FileImage, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ImagesToPdfTool() {
  const [images, setImages] = useState([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Layout Configuration
  const [pageSize, setPageSize] = useState('a4') // 'a4' | 'letter' | 'fit'
  const [orientation, setOrientation] = useState('portrait') // 'portrait' | 'landscape' | 'auto'
  const [margin, setMargin] = useState(15) // 0, 15, 30

  const fileInputRef = useRef(null)

  // Handle uploading image files
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const validImages = files.filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(f.name))
    if (!validImages.length) {
      setError('Please select valid image files (JPG, PNG, WebP).')
      return
    }

    const newImageObjs = validImages.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      previewUrl: URL.createObjectURL(file)
    }))

    setImages((prev) => [...prev, ...newImageObjs])
    setError(null)
    setSuccess(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Reorder helpers
  const moveImage = (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= images.length) return

    const updated = [...images]
    const [moved] = updated.splice(index, 1)
    updated.splice(targetIndex, 0, moved)
    setImages(updated)
  }

  const removeImage = (id) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  // Convert array buffer to standard PNG/JPEG image for pdf-lib
  const embedImageInDoc = async (pdfDoc, imageFile) => {
    const buffer = await imageFile.arrayBuffer()
    const type = imageFile.type

    if (type === 'image/png') {
      return await pdfDoc.embedPng(buffer)
    } else if (type === 'image/jpeg' || type === 'image/jpg') {
      return await pdfDoc.embedJpg(buffer)
    } else {
      // For WebP or GIF, draw on an offscreen canvas and convert to PNG
      return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(imageFile)
        img.onload = async () => {
          URL.revokeObjectURL(url)
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          canvas.toBlob(async (blob) => {
            if (!blob) return reject(new Error('Canvas conversion failed'))
            const pngBuf = await blob.arrayBuffer()
            const embedded = await pdfDoc.embedPng(pngBuf)
            resolve(embedded)
          }, 'image/png')
        }
        img.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error('Failed to load image format'))
        }
        img.src = url
      })
    }
  }

  // Generate PDF from images
  const handleGeneratePdf = async () => {
    if (!images.length) return
    setProcessing(true)
    setProgress(0)
    setError(null)

    try {
      const { PDFDocument, PageSizes } = window.PDFLib
      const pdfDoc = await PDFDocument.create()

      const total = images.length

      for (let i = 0; i < total; i++) {
        const item = images[i]
        const embeddedImage = await embedImageInDoc(pdfDoc, item.file)
        const imgWidth = embeddedImage.width
        const imgHeight = embeddedImage.height

        let pageWidth, pageHeight

        if (pageSize === 'fit') {
          // Fit directly to image dimensions
          pageWidth = imgWidth + margin * 2
          pageHeight = imgHeight + margin * 2
        } else {
          // Standard A4 or Letter
          const baseDims = pageSize === 'letter' ? PageSizes.Letter : PageSizes.A4
          let isLandscape = orientation === 'landscape'
          if (orientation === 'auto') {
            isLandscape = imgWidth > imgHeight
          }

          pageWidth = isLandscape ? baseDims[1] : baseDims[0]
          pageHeight = isLandscape ? baseDims[0] : baseDims[1]
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight])

        // Calculate scaled fit dimensions
        const maxDrawWidth = pageWidth - margin * 2
        const maxDrawHeight = pageHeight - margin * 2

        const scaleRatio = Math.min(maxDrawWidth / imgWidth, maxDrawHeight / imgHeight)
        const drawWidth = imgWidth * scaleRatio
        const drawHeight = imgHeight * scaleRatio

        // Center on page
        const x = (pageWidth - drawWidth) / 2
        const y = (pageHeight - drawHeight) / 2

        page.drawImage(embeddedImage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight
        })

        setProgress(Math.round(((i + 1) / total) * 100))
      }

      const pdfBytes = await pdfDoc.save()
      if (window.download) {
        window.download(pdfBytes, 'converted_images.pdf', 'application/pdf')
      }
      setSuccess(true)
    } catch (err) {
      console.error('Failed to generate PDF from images:', err)
      setError('PDF generation failed: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const reset = () => {
    setImages([])
    setError(null)
    setSuccess(false)
    setProgress(0)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileImage className="w-6 h-6 text-blue-500" />
            Images to PDF Converter
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Convert JPG, PNG, and WebP images into a beautifully styled multi-page PDF document.
          </p>
        </div>

        {images.length > 0 && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors w-fit"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Clear All
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-zinc-800 hover:border-blue-500/50 bg-zinc-900/40 hover:bg-zinc-900/80 rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 group"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.png,.jpg,.jpeg,.webp,.gif"
          onChange={handleImageUpload}
          className="hidden"
        />
        <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform border border-blue-500/20">
          <FileUp className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-white mb-1">Add Images (JPG, PNG, WebP)</h3>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          Click or drop multiple images to compile into a single PDF document.
        </p>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Sidebar */}
          <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5 h-fit">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider text-zinc-400">
              Page Layout Settings
            </h3>

            {/* Page Size */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300">Page Size</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'a4', label: 'A4' },
                  { id: 'letter', label: 'Letter' },
                  { id: 'fit', label: 'Fit Image' }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setPageSize(s.id)}
                    className={`py-2 px-2 text-xs font-medium text-center rounded-lg border transition-all ${
                      pageSize === s.id
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                        : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            {pageSize !== 'fit' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">Orientation</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'portrait', label: 'Portrait' },
                    { id: 'landscape', label: 'Landscape' },
                    { id: 'auto', label: 'Auto' }
                  ].map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setOrientation(o.id)}
                      className={`py-2 px-2 text-xs font-medium text-center rounded-lg border transition-all ${
                        orientation === o.id
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                          : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:text-white'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Margins */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300">Page Margins</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: 0, label: 'No Margin' },
                  { val: 15, label: 'Small' },
                  { val: 30, label: 'Large' }
                ].map((m) => (
                  <button
                    key={m.val}
                    onClick={() => setMargin(m.val)}
                    className={`py-2 px-2 text-xs font-medium text-center rounded-lg border transition-all ${
                      margin === m.val
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                        : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-xs flex justify-between text-zinc-400">
              <span>Total Images:</span>
              <span className="text-zinc-200 font-semibold">{images.length} pages</span>
            </div>

            {/* Action */}
            <button
              onClick={handleGeneratePdf}
              disabled={processing || !images.length}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Creating PDF ({progress}%)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Convert & Download PDF</span>
                </>
              )}
            </button>
          </div>

          {/* Reorderable Image Grid */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Images Sequence ({images.length})
              </h3>
              <span className="text-xs text-zinc-500">Reorder with arrows before compiling</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-[550px] overflow-y-auto pr-1">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl p-2.5 flex flex-col gap-2 relative group shadow-sm"
                >
                  <div className="w-full aspect-[4/3] bg-zinc-900 rounded-lg overflow-hidden flex items-center justify-center border border-zinc-800/60">
                    <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-400 px-0.5">
                    <span className="font-semibold text-zinc-300 truncate max-w-[90px]">{idx + 1}. {img.name}</span>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="text-zinc-500 hover:text-red-400 p-1 transition-colors"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Reorder Buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                    <button
                      onClick={() => moveImage(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                      title="Move backward"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] text-zinc-600 font-mono">Page {idx + 1}</span>
                    <button
                      onClick={() => moveImage(idx, 1)}
                      disabled={idx === images.length - 1}
                      className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                      title="Move forward"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
