import React, { useState, useRef } from 'react'
import {
  ImageDown,
  Download,
  FileUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FolderArchive,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react'

export default function ExtractImagesTool() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [extractedImages, setExtractedImages] = useState([]) // Array of { id, pageNum, width, height, dataUrl, name }
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF document.')
      return
    }

    setFile(selectedFile)
    setError(null)
    setSuccess(false)
    setExtractedImages([])
    setLoading(true)
    setProgress(0)

    try {
      const buffer = await selectedFile.arrayBuffer()
      if (!window.pdfjsLib) throw new Error('PDF library not ready.')

      const doc = await window.pdfjsLib.getDocument({ data: buffer.slice(0) }).promise
      const totalPages = doc.numPages
      const imagesList = []

      for (let pNum = 1; pNum <= totalPages; pNum++) {
        setProgress(Math.round((pNum / totalPages) * 100))
        const page = await doc.getPage(pNum)
        const operatorList = await page.getOperatorList()

        const validImageOps = [
          window.pdfjsLib.OPS.paintImageXObject,
          window.pdfjsLib.OPS.paintImageMaskXObject,
          window.pdfjsLib.OPS.paintJpegXObject
        ]

        for (let i = 0; i < operatorList.fnArray.length; i++) {
          const fn = operatorList.fnArray[i]
          if (validImageOps.includes(fn)) {
            const imgName = operatorList.argsArray[i][0]

            try {
              const imgObj = await new Promise((res) => {
                page.objs.get(imgName, (img) => res(img))
              })

              if (imgObj && (imgObj.data || imgObj.src)) {
                let dataUrl = ''

                if (imgObj.src) {
                  dataUrl = imgObj.src
                } else if (imgObj.data) {
                  const canvas = document.createElement('canvas')
                  canvas.width = imgObj.width
                  canvas.height = imgObj.height
                  const ctx = canvas.getContext('2d')
                  const imgData = ctx.createImageData(imgObj.width, imgObj.height)

                  if (imgObj.data.length === imgObj.width * imgObj.height * 4) {
                    imgData.data.set(imgObj.data)
                  } else if (imgObj.data.length === imgObj.width * imgObj.height * 3) {
                    let srcIdx = 0
                    for (let d = 0; d < imgData.data.length; d += 4) {
                      imgData.data[d] = imgObj.data[srcIdx]
                      imgData.data[d + 1] = imgObj.data[srcIdx + 1]
                      imgData.data[d + 2] = imgObj.data[srcIdx + 2]
                      imgData.data[d + 3] = 255
                      srcIdx += 3
                    }
                  } else if (imgObj.data.length === imgObj.width * imgObj.height) {
                    let srcIdx = 0
                    for (let d = 0; d < imgData.data.length; d += 4) {
                      const val = imgObj.data[srcIdx]
                      imgData.data[d] = val
                      imgData.data[d + 1] = val
                      imgData.data[d + 2] = val
                      imgData.data[d + 3] = 255
                      srcIdx++
                    }
                  }

                  ctx.putImageData(imgData, 0, 0)
                  dataUrl = canvas.toDataURL('image/png')
                }

                if (dataUrl) {
                  imagesList.push({
                    id: `${pNum}_${imgName}_${imagesList.length}`,
                    pageNum: pNum,
                    name: `img_page${pNum}_${imagesList.length + 1}.png`,
                    width: imgObj.width || 400,
                    height: imgObj.height || 300,
                    dataUrl
                  })
                }
              }
            } catch (imgErr) {
              console.warn('Could not extract image object:', imgErr)
            }
          }
        }
      }

      setExtractedImages(imagesList)
      if (imagesList.length === 0) {
        setError('No embedded raster images were found in this PDF.')
      }
    } catch (err) {
      console.error('Extraction failed:', err)
      setError('Failed to extract images: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Download single image
  const handleDownloadSingle = (img) => {
    if (window.download) {
      window.download(img.dataUrl, img.name, 'image/png')
    } else {
      const a = document.createElement('a')
      a.href = img.dataUrl
      a.download = img.name
      a.click()
    }
  }

  // Download all as ZIP
  const handleDownloadAllZip = async () => {
    if (extractedImages.length === 0) return
    setExtracting(true)

    try {
      if (!window.JSZip) throw new Error('ZIP library not ready.')
      const zip = new window.JSZip()

      for (let i = 0; i < extractedImages.length; i++) {
        const item = extractedImages[i]
        const base64Data = item.dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/, '')
        zip.file(item.name, base64Data, { base64: true })
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const outputName = `${file.name.replace(/\.pdf$/i, '')}_images.zip`

      if (window.download) {
        window.download(zipBlob, outputName, 'application/zip')
      } else {
        const url = URL.createObjectURL(zipBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = outputName
        a.click()
        URL.revokeObjectURL(url)
      }

      setSuccess(true)
    } catch (err) {
      setError('Failed to build ZIP archive: ' + err.message)
    } finally {
      setExtracting(false)
    }
  }

  const reset = () => {
    setFile(null)
    setExtractedImages([])
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
            <ImageDown className="w-6 h-6 text-violet-500" />
            Extract Embedded Images & Assets
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Extract raw embedded raster images (JPEG, PNG, WebP) directly from PDF internal object streams into a ZIP.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
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
            <p className="font-semibold">Notice</p>
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
            Select a PDF to extract embedded images
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Drag and drop or browse from your computer (never uploaded)
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* File summary & Action Bar */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 text-violet-400">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-zinc-100 text-sm">{file.name}</h4>
                <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                  <span>Found {extractedImages.length} embedded images</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={reset}
                className="px-3.5 py-2 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-750 rounded-xl transition-colors"
              >
                Change File
              </button>
              <button
                onClick={handleDownloadAllZip}
                disabled={extracting || extractedImages.length === 0}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-violet-600/20"
              >
                {extracting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Packaging ZIP...
                  </>
                ) : (
                  <>
                    <FolderArchive className="w-4 h-4" /> Download All as ZIP ({extractedImages.length})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Extracted Images Gallery Grid */}
          {extractedImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {extractedImages.map((img) => (
                <div
                  key={img.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col group hover:border-violet-500/40 transition-colors"
                >
                  <div className="aspect-square bg-zinc-950 p-2 flex items-center justify-center relative overflow-hidden">
                    <img src={img.dataUrl} alt={img.name} className="max-w-full max-h-full object-contain rounded" />
                    <span className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/80 rounded text-[10px] text-zinc-300 font-mono">
                      Page {img.pageNum}
                    </span>
                  </div>

                  <div className="p-3 bg-zinc-900/90 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-zinc-200 text-[11px] truncate max-w-[110px]">{img.name}</p>
                      <p className="text-[10px] text-zinc-500">
                        {img.width} × {img.height} px
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadSingle(img)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-violet-600 text-zinc-300 hover:text-white transition-colors"
                      title="Download image"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
