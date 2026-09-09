import React, { useState } from 'react'
import {
  FileUp,
  Download,
  Presentation,
  CheckCircle2,
  AlertCircle,
  Layers,
  FileText,
  Image as ImageIcon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Palette
} from 'lucide-react'

export default function PptxToPdfTool() {
  const [file, setFile] = useState(null)
  const [slides, setSlides] = useState([])
  const [loading, setLoading] = useState(false)
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0)
  const [convertedPdfUrl, setConvertedPdfUrl] = useState(null)
  const [pdfSize, setPdfSize] = useState(null)

  // Options
  const [aspectRatio, setAspectRatio] = useState('16:9') // '16:9', '4:3', 'A4'
  const [theme, setTheme] = useState('white') // 'white', 'dark', 'navy', 'slate'
  const [fontSize, setFontSize] = useState('medium') // 'small', 'medium', 'large'
  const [includeSlideNumbers, setIncludeSlideNumbers] = useState(true)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.pptx')) {
      setError('Please select a valid PowerPoint (.pptx) file.')
      return
    }

    setFile(selectedFile)
    setError('')
    setConvertedPdfUrl(null)
    setSlides([])
    setLoading(true)

    try {
      if (!window.JSZip) {
        throw new Error('JSZip library is still loading. Please try again.')
      }

      const zip = new window.JSZip()
      const zipContent = await zip.loadAsync(selectedFile)

      // Find all slide XML files
      const slideFiles = Object.keys(zipContent.files).filter((fileName) =>
        /^ppt\/slides\/slide[0-9]+\.xml$/i.test(fileName)
      )

      if (slideFiles.length === 0) {
        throw new Error('No slides found in this presentation.')
      }

      // Sort slides naturally by slide number: slide1.xml, slide2.xml, ...
      slideFiles.sort((a, b) => {
        const numA = parseInt(a.match(/slide([0-9]+)\.xml/i)?.[1] || '0', 10)
        const numB = parseInt(b.match(/slide([0-9]+)\.xml/i)?.[1] || '0', 10)
        return numA - numB
      })

      const parsedSlides = []

      for (let i = 0; i < slideFiles.length; i++) {
        const slidePath = slideFiles[i]
        const slideXmlStr = await zipContent.file(slidePath).async('text')
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(slideXmlStr, 'application/xml')

        // Extract text runs and paragraphs
        const paragraphs = xmlDoc.getElementsByTagName('a:p')

        const slideTexts = []
        let title = ''

        // First non-empty paragraph or header can be title
        for (let p = 0; p < paragraphs.length; p++) {
          const pNode = paragraphs[p]
          const tNodes = pNode.getElementsByTagName('a:t')
          let pText = ''
          for (let t = 0; t < tNodes.length; t++) {
            pText += tNodes[t].textContent + ' '
          }
          pText = pText.trim()
          if (pText) {
            slideTexts.push(pText)
            if (!title) {
              title = pText
            }
          }
        }

        // Check for images in this slide
        const slideNum = slidePath.match(/slide([0-9]+)\.xml/i)?.[1]
        const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`
        const imageRels = []

        if (zipContent.file(relsPath)) {
          const relsXmlStr = await zipContent.file(relsPath).async('text')
          const relsDoc = parser.parseFromString(relsXmlStr, 'application/xml')
          const relationships = relsDoc.getElementsByTagName('Relationship')

          for (let r = 0; r < relationships.length; r++) {
            const rel = relationships[r]
            const type = rel.getAttribute('Type') || ''
            const target = rel.getAttribute('Target') || ''
            if (type.includes('image') || target.includes('media/')) {
              // Normalize path
              const cleanTarget = target.startsWith('../')
                ? target.replace('../', 'ppt/')
                : `ppt/slides/${target}`
              const normalizedPath = cleanTarget.replace('ppt/slides/media/', 'ppt/media/')

              const imgFile = zipContent.file(normalizedPath)
              if (imgFile) {
                const imgBase64 = await imgFile.async('base64')
                const ext = normalizedPath.split('.').pop()?.toLowerCase() || 'png'
                const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
                imageRels.push({
                  path: normalizedPath,
                  url: `data:${mime};base64,${imgBase64}`,
                  format: ext
                })
              }
            }
          }
        }

        parsedSlides.push({
          slideNumber: i + 1,
          title: title || `Slide ${i + 1}`,
          content: slideTexts,
          images: imageRels
        })
      }

      setSlides(parsedSlides)
      setCurrentSlideIdx(0)
    } catch (err) {
      console.error('PPTX Parse Error:', err)
      setError(err.message || 'Failed to parse PowerPoint presentation.')
    } finally {
      setLoading(false)
    }
  }

  const handleConvertToPdf = async () => {
    if (slides.length === 0) return
    setConverting(true)
    setProgress(10)
    setError('')

    try {
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib
      const pdfDoc = await PDFDocument.create()

      // Define page dimensions (in points: 72 points = 1 inch)
      let width = 960
      let height = 540 // 16:9 default (13.33 x 7.5 in)

      if (aspectRatio === '4:3') {
        width = 720
        height = 540 // 4:3 (10 x 7.5 in)
      } else if (aspectRatio === 'A4') {
        width = 841.89 // A4 Landscape
        height = 595.28
      }

      // Themes
      const themes = {
        white: {
          bg: rgb(0.98, 0.98, 1.0),
          titleColor: rgb(0.08, 0.1, 0.15),
          textColor: rgb(0.2, 0.23, 0.28),
          accentColor: rgb(0.49, 0.27, 0.96),
          cardBg: rgb(0.93, 0.94, 0.96)
        },
        dark: {
          bg: rgb(0.06, 0.07, 0.09),
          titleColor: rgb(0.95, 0.95, 0.98),
          textColor: rgb(0.75, 0.78, 0.82),
          accentColor: rgb(0.63, 0.45, 1.0),
          cardBg: rgb(0.12, 0.14, 0.18)
        },
        navy: {
          bg: rgb(0.04, 0.08, 0.16),
          titleColor: rgb(0.9, 0.95, 1.0),
          textColor: rgb(0.7, 0.8, 0.9),
          accentColor: rgb(0.25, 0.65, 1.0),
          cardBg: rgb(0.08, 0.14, 0.24)
        },
        slate: {
          bg: rgb(0.12, 0.15, 0.18),
          titleColor: rgb(0.95, 0.97, 0.98),
          textColor: rgb(0.78, 0.82, 0.86),
          accentColor: rgb(0.2, 0.78, 0.6),
          cardBg: rgb(0.18, 0.22, 0.26)
        }
      }

      const activeTheme = themes[theme] || themes.white

      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

      const titleSize = fontSize === 'large' ? 26 : fontSize === 'small' ? 18 : 22
      const bodySize = fontSize === 'large' ? 14 : fontSize === 'small' ? 10 : 12

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i]
        const page = pdfDoc.addPage([width, height])

        // 1. Draw Background
        page.drawRectangle({
          x: 0,
          y: 0,
          width,
          height,
          color: activeTheme.bg
        })

        // 2. Draw Top Accent Bar
        page.drawRectangle({
          x: 0,
          y: height - 6,
          width,
          height: 6,
          color: activeTheme.accentColor
        })

        const margin = 50
        let currentY = height - margin - 20

        // 3. Draw Slide Title
        if (slide.title) {
          const safeTitle = slide.title.length > 80 ? slide.title.substring(0, 77) + '...' : slide.title
          page.drawText(safeTitle, {
            x: margin,
            y: currentY,
            size: titleSize,
            font: fontBold,
            color: activeTheme.titleColor
          })

          currentY -= titleSize + 16

          // Decorative thin line under title
          page.drawLine({
            start: { x: margin, y: currentY + 8 },
            end: { x: width - margin, y: currentY + 8 },
            thickness: 1,
            color: activeTheme.cardBg
          })

          currentY -= 15
        }

        // 4. Draw Slide Content & Paragraphs
        const contentLines = slide.content.filter((c) => c !== slide.title)

        // If there are images, reserve right column for image
        const hasImages = slide.images && slide.images.length > 0
        const contentWidth = hasImages ? (width - margin * 2) * 0.55 : width - margin * 2

        if (contentLines.length > 0) {
          for (let p = 0; p < contentLines.length; p++) {
            if (currentY < margin + 40) break // avoid bottom overflow

            const line = contentLines[p]

            // Wrap text to fit contentWidth
            const words = line.split(' ')
            let currentLine = ''

            for (let w = 0; w < words.length; w++) {
              const testLine = currentLine ? `${currentLine} ${words[w]}` : words[w]
              const testWidth = fontRegular.widthOfTextAtSize(testLine, bodySize)

              if (testWidth > contentWidth && currentLine) {
                page.drawText(currentLine, {
                  x: margin + 15,
                  y: currentY,
                  size: bodySize,
                  font: fontRegular,
                  color: activeTheme.textColor
                })
                currentY -= bodySize + 6
                currentLine = words[w]
              } else {
                currentLine = testLine
              }
            }

            if (currentLine && currentY >= margin + 40) {
              // Draw subtle bullet point
              page.drawCircle({
                x: margin + 5,
                y: currentY + bodySize / 2.5,
                size: 2.5,
                color: activeTheme.accentColor
              })

              page.drawText(currentLine, {
                x: margin + 15,
                y: currentY,
                size: bodySize,
                font: fontRegular,
                color: activeTheme.textColor
              })
              currentY -= bodySize + 12
            }
          }
        } else if (!hasImages) {
          page.drawText('(No text content on this slide)', {
            x: margin,
            y: currentY,
            size: bodySize,
            font: fontRegular,
            color: activeTheme.textColor
          })
        }

        // 5. Embed Image on the right if available
        if (hasImages) {
          try {
            const firstImg = slide.images[0]
            const imgData = firstImg.url.split(',')[1]
            const imgBytes = Uint8Array.from(atob(imgData), (c) => c.charCodeAt(0))

            let embeddedImg
            if (firstImg.format === 'jpg' || firstImg.format === 'jpeg') {
              embeddedImg = await pdfDoc.embedJpg(imgBytes)
            } else {
              embeddedImg = await pdfDoc.embedPng(imgBytes)
            }

            const imgMaxWidth = (width - margin * 2) * 0.38
            const imgMaxHeight = height - margin * 2 - 60
            const scale = Math.min(imgMaxWidth / embeddedImg.width, imgMaxHeight / embeddedImg.height, 1)

            const imgDrawWidth = embeddedImg.width * scale
            const imgDrawHeight = embeddedImg.height * scale
            const imgX = width - margin - imgDrawWidth
            const imgY = height / 2 - imgDrawHeight / 2 - 10

            // Draw image frame
            page.drawRectangle({
              x: imgX - 4,
              y: imgY - 4,
              width: imgDrawWidth + 8,
              height: imgDrawHeight + 8,
              color: activeTheme.cardBg
            })

            page.drawImage(embeddedImg, {
              x: imgX,
              y: imgY,
              width: imgDrawWidth,
              height: imgDrawHeight
            })
          } catch (imgErr) {
            console.warn('Could not embed slide image in PDF:', imgErr)
          }
        }

        // 6. Draw Slide Footer & Page Number
        if (includeSlideNumbers) {
          const footerText = `${i + 1} / ${slides.length}`
          page.drawText(footerText, {
            x: width - margin - 30,
            y: margin - 25,
            size: 10,
            font: fontRegular,
            color: activeTheme.textColor
          })
        }

        // Presentation Title watermark at bottom-left
        if (file?.name) {
          const cleanDocName = file.name.replace(/\.pptx$/i, '')
          page.drawText(cleanDocName.substring(0, 40), {
            x: margin,
            y: margin - 25,
            size: 9,
            font: fontRegular,
            color: activeTheme.textColor
          })
        }

        setProgress(Math.round(10 + ((i + 1) / slides.length) * 85))
      }

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      setConvertedPdfUrl(url)
      setPdfSize((blob.size / 1024).toFixed(1) + ' KB')
      setProgress(100)
    } catch (err) {
      console.error('PDF Conversion Error:', err)
      setError(err.message || 'Failed to generate PDF from presentation.')
    } finally {
      setConverting(false)
    }
  }

  const handleDownload = () => {
    if (!convertedPdfUrl || !file) return
    const originalName = file.name.replace(/\.pptx$/i, '')
    const downloadName = `${originalName}-converted.pdf`

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

  const currentSlide = slides[currentSlideIdx]

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-4 md:p-8">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <Presentation className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  PowerPoint (.pptx) to PDF
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400">
                    Client-Side
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Convert PowerPoint presentations into high-resolution formatted vector PDF slides in browser memory
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
          <div className="border-2 border-dashed border-zinc-800 hover:border-orange-500/50 rounded-2xl p-8 md:p-12 text-center transition-colors bg-zinc-900/30 group">
            <input
              type="file"
              id="pptx-input"
              accept=".pptx"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="pptx-input"
              className="flex flex-col items-center justify-center cursor-pointer space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center group-hover:scale-105 group-hover:border-orange-500/50 transition-all">
                <FileUp className="w-8 h-8 text-orange-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-200">
                  Click to select PowerPoint presentation
                </p>
                <p className="text-xs text-zinc-500 mt-1">Supports Microsoft PowerPoint .pptx files</p>
              </div>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-semibold">
                Select .PPTX File
              </span>
            </label>
          </div>
        )}

        {/* Loading Parse */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-orange-500 rounded-full animate-spin"></div>
            <p className="text-sm text-zinc-400 font-medium">Unzipping presentation and parsing slide XML...</p>
          </div>
        )}

        {/* Step 2: Slide Inspector & Conversion Options */}
        {slides.length > 0 && !loading && (
          <div className="space-y-6">
            {/* Top Presentation Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div>
                <span className="text-xs text-zinc-500">File Name</span>
                <p className="text-sm font-semibold text-zinc-200 truncate mt-0.5">{file?.name}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Total Slides</span>
                <p className="text-sm font-semibold text-orange-400 mt-0.5">{slides.length} Slides</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Embedded Images</span>
                <p className="text-sm font-semibold text-zinc-200 mt-0.5">
                  {slides.reduce((acc, s) => acc + (s.images?.length || 0), 0)} Images
                </p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Source Size</span>
                <p className="text-sm font-semibold text-zinc-200 mt-0.5">
                  {(file?.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>

            {/* Layout & Style Configuration */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-orange-400" />
                Slide PDF Styling & Layout Options
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                {/* Aspect Ratio */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Slide Aspect Ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-orange-500"
                  >
                    <option value="16:9">16:9 Widescreen (Default)</option>
                    <option value="4:3">4:3 Standard</option>
                    <option value="A4">A4 Landscape</option>
                  </select>
                </div>

                {/* Color Theme */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Color Palette Theme</label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-orange-500"
                  >
                    <option value="white">Clean White (Print Ready)</option>
                    <option value="dark">Charcoal Dark Mode</option>
                    <option value="navy">Executive Deep Navy</option>
                    <option value="slate">Modern Slate Gray</option>
                  </select>
                </div>

                {/* Typography Size */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Typography Scale</label>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-orange-500"
                  >
                    <option value="small">Compact (10pt)</option>
                    <option value="medium">Standard (12pt)</option>
                    <option value="large">Spacious (14pt)</option>
                  </select>
                </div>

                {/* Slide Numbers */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Slide Numbering</label>
                  <div className="flex items-center h-[38px]">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                      <input
                        type="checkbox"
                        checked={includeSlideNumbers}
                        onChange={(e) => setIncludeSlideNumbers(e.target.checked)}
                        className="rounded bg-zinc-950 border-zinc-700 text-orange-500 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      Include Page X/Y
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Slide Preview Carousel */}
            {currentSlide && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Presentation className="w-4 h-4 text-orange-400" />
                    <h3 className="text-sm font-bold text-white">
                      Slide Preview ({currentSlideIdx + 1} of {slides.length})
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentSlideIdx((prev) => Math.max(0, prev - 1))}
                      disabled={currentSlideIdx === 0}
                      className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded-lg text-zinc-200 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-zinc-400 font-mono">
                      {currentSlideIdx + 1} / {slides.length}
                    </span>
                    <button
                      onClick={() => setCurrentSlideIdx((prev) => Math.min(slides.length - 1, prev + 1))}
                      disabled={currentSlideIdx === slides.length - 1}
                      className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded-lg text-zinc-200 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Simulated Slide Canvas */}
                <div className="aspect-[16/9] w-full max-w-2xl mx-auto bg-zinc-950 border border-zinc-800 rounded-xl p-6 md:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                  <div className="space-y-3">
                    <h4 className="text-base md:text-lg font-bold text-orange-400 border-b border-zinc-800 pb-2 truncate">
                      {currentSlide.title}
                    </h4>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-2">
                      {currentSlide.content
                        .filter((c) => c !== currentSlide.title)
                        .map((line, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs md:text-sm text-zinc-300">
                            <span className="text-orange-400 shrink-0">•</span>
                            <p className="line-clamp-2">{line}</p>
                          </div>
                        ))}
                    </div>
                  </div>

                  {currentSlide.images && currentSlide.images.length > 0 && (
                    <div className="absolute right-6 bottom-6 w-28 h-20 md:w-36 md:h-24 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex items-center justify-center p-1">
                      <img
                        src={currentSlide.images[0].url}
                        alt="Embedded slide graphic"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-3 border-t border-zinc-900">
                    <span>{file?.name}</span>
                    <span>
                      Slide {currentSlideIdx + 1} of {slides.length}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Convert & Export Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                onClick={() => {
                  setFile(null)
                  setSlides([])
                  setConvertedPdfUrl(null)
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
              >
                Upload different presentation
              </button>

              <button
                onClick={handleConvertToPdf}
                disabled={converting}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 cursor-pointer transition-all"
              >
                {converting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Rendering Slides to PDF ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Compile & Convert to PDF</span>
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
                    <h4 className="text-sm font-bold text-white">PowerPoint PDF Ready!</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Compiled {slides.length} vector presentation slides • Size: {pdfSize}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download PDF Presentation
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
