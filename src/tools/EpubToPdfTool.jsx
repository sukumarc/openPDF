import React, { useState } from 'react'
import {
  FileUp,
  Download,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  BookMarked,
  Sparkles,
  Sliders,
  Type,
  AlignLeft,
  Settings2
} from 'lucide-react'

export default function EpubToPdfTool() {
  const [file, setFile] = useState(null)
  const [bookMeta, setBookMeta] = useState({ title: '', author: '', chapters: [] })
  const [selectedChapters, setSelectedChapters] = useState({})
  const [loading, setLoading] = useState(false)
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [convertedPdfUrl, setConvertedPdfUrl] = useState(null)
  const [pdfSize, setPdfSize] = useState(null)

  // Book Options
  const [pageSize, setPageSize] = useState('a5') // 'a4', 'a5', 'letter'
  const [fontSize, setFontSize] = useState(11) // 10, 11, 12, 14
  const [lineHeight, setLineHeight] = useState(1.4) // 1.2, 1.4, 1.6
  const [marginSize, setMarginSize] = useState(40) // 30, 40, 50 pt
  const [includeCover, setIncludeCover] = useState(true)
  const [includeToc, setIncludeToc] = useState(true)
  const [chapterNewPage, setChapterNewPage] = useState(true)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.epub')) {
      setError('Please select a valid eBook (.epub) file.')
      return
    }

    setFile(selectedFile)
    setError('')
    setConvertedPdfUrl(null)
    setBookMeta({ title: '', author: '', chapters: [] })
    setLoading(true)

    try {
      if (!window.JSZip) {
        throw new Error('JSZip library is still loading. Please try again.')
      }

      const zip = new window.JSZip()
      const zipContent = await zip.loadAsync(selectedFile)

      // 1. Read META-INF/container.xml to find the root OPF file
      let opfPath = 'OEBPS/content.opf'
      const containerFile = zipContent.file('META-INF/container.xml')

      if (containerFile) {
        const containerXml = await containerFile.async('text')
        const parser = new DOMParser()
        const cDoc = parser.parseFromString(containerXml, 'application/xml')
        const rootfile = cDoc.getElementsByTagName('rootfile')[0]
        if (rootfile && rootfile.getAttribute('full-path')) {
          opfPath = rootfile.getAttribute('full-path')
        }
      }

      // Try finding any .opf file if default wasn't found
      let opfFile = zipContent.file(opfPath)
      if (!opfFile) {
        const foundOpf = Object.keys(zipContent.files).find((name) => name.toLowerCase().endsWith('.opf'))
        if (foundOpf) {
          opfPath = foundOpf
          opfFile = zipContent.file(opfPath)
        }
      }

      if (!opfFile) {
        throw new Error('Invalid EPUB package: Could not locate package OPF descriptor.')
      }

      const opfXml = await opfFile.async('text')
      const parser = new DOMParser()
      const opfDoc = parser.parseFromString(opfXml, 'application/xml')

      // Extract metadata
      const titleElem = opfDoc.getElementsByTagName('dc:title')[0]
      const authorElem = opfDoc.getElementsByTagName('dc:creator')[0]
      const bookTitle = titleElem ? titleElem.textContent.trim() : selectedFile.name.replace(/\.epub$/i, '')
      const bookAuthor = authorElem ? authorElem.textContent.trim() : 'Unknown Author'

      // Extract manifest items
      const manifestItems = {}
      const itemElements = opfDoc.getElementsByTagName('item')
      for (let i = 0; i < itemElements.length; i++) {
        const item = itemElements[i]
        const id = item.getAttribute('id')
        const href = item.getAttribute('href')
        const mediaType = item.getAttribute('media-type')
        if (id && href) {
          manifestItems[id] = { href, mediaType }
        }
      }

      // Extract spine order
      const spineItems = []
      const itemrefElements = opfDoc.getElementsByTagName('itemref')
      const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : ''

      for (let i = 0; i < itemrefElements.length; i++) {
        const idref = itemrefElements[i].getAttribute('idref')
        if (manifestItems[idref]) {
          const relativeHref = manifestItems[idref].href
          const fullHref = opfDir + relativeHref
          spineItems.push(fullHref)
        }
      }

      // If no spine items found, grab all xhtml/html files in zip
      const chapterFiles = spineItems.length > 0
        ? spineItems
        : Object.keys(zipContent.files).filter((name) => /\.(xhtml|html|htm)$/i.test(name))

      const parsedChapters = []
      const selectedMap = {}

      for (let i = 0; i < chapterFiles.length; i++) {
        const chPath = chapterFiles[i]
        // Handle URL encoding in path
        const decodedPath = decodeURIComponent(chPath)
        const chFile = zipContent.file(chPath) || zipContent.file(decodedPath)

        if (!chFile) continue

        const chContent = await chFile.async('text')
        const chDoc = parser.parseFromString(chContent, 'text/html')

        // Extract title or heading
        let chTitle = ''
        const h1 = chDoc.querySelector('h1, h2, h3, title')
        if (h1 && h1.textContent.trim()) {
          chTitle = h1.textContent.trim()
        } else {
          chTitle = `Chapter ${parsedChapters.length + 1}`
        }

        // Clean paragraphs
        const paragraphs = []
        const elements = chDoc.querySelectorAll('p, blockquote, li, h1, h2, h3, h4')
        elements.forEach((el) => {
          const text = el.textContent.trim()
          if (text) {
            const isHeading = /^h[1-4]$/i.test(el.tagName)
            paragraphs.push({
              text,
              isHeading,
              tag: el.tagName.toLowerCase()
            })
          }
        })

        if (paragraphs.length > 0) {
          const chapterObj = {
            id: `ch_${parsedChapters.length}`,
            path: chPath,
            title: chTitle,
            paragraphs
          }
          parsedChapters.push(chapterObj)
          selectedMap[chapterObj.id] = true
        }
      }

      if (parsedChapters.length === 0) {
        throw new Error('No readable text chapters found in this EPUB.')
      }

      setBookMeta({
        title: bookTitle,
        author: bookAuthor,
        chapters: parsedChapters
      })
      setSelectedChapters(selectedMap)
    } catch (err) {
      console.error('EPUB Parsing Error:', err)
      setError(err.message || 'Failed to parse EPUB eBook.')
    } finally {
      setLoading(false)
    }
  }

  const toggleChapter = (id) => {
    setSelectedChapters((prev) => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const toggleAllChapters = (select) => {
    const next = {}
    bookMeta.chapters.forEach((c) => {
      next[c.id] = select
    })
    setSelectedChapters(next)
  }

  const handleConvertToPdf = async () => {
    const activeChapters = bookMeta.chapters.filter((c) => selectedChapters[c.id])
    if (activeChapters.length === 0) {
      setError('Please select at least one chapter to convert.')
      return
    }

    setConverting(true)
    setProgress(5)
    setError('')

    try {
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib
      const pdfDoc = await PDFDocument.create()

      // Set page dimensions (points)
      // A5: 419.53 x 595.28 pt (5.83 x 8.27 in) - classic book size
      // A4: 595.28 x 841.89 pt
      // Letter: 612 x 792 pt
      let pageWidth = 419.53
      let pageHeight = 595.28

      if (pageSize === 'a4') {
        pageWidth = 595.28
        pageHeight = 841.89
      } else if (pageSize === 'letter') {
        pageWidth = 612
        pageHeight = 792
      }

      const fontSerifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
      const fontSerif = await pdfDoc.embedFont(StandardFonts.TimesRoman)
      const fontSerifItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)

      const margin = marginSize
      const printableWidth = pageWidth - margin * 2

      // Color Palette (Classic Book style)
      const textColor = rgb(0.12, 0.12, 0.14)
      const headingColor = rgb(0.08, 0.08, 0.1)
      const subtleColor = rgb(0.45, 0.45, 0.5)
      const accentColor = rgb(0.49, 0.27, 0.96)

      let totalPagesCreated = 0

      // Helper to add new book page
      const addNewBookPage = (runningTitle = '') => {
        const page = pdfDoc.addPage([pageWidth, pageHeight])
        totalPagesCreated++

        // Running Header on subsequent pages
        if (totalPagesCreated > 1 && runningTitle) {
          const safeHeader = runningTitle.length > 40 ? runningTitle.substring(0, 37) + '...' : runningTitle
          page.drawText(safeHeader, {
            x: margin,
            y: pageHeight - margin + 15,
            size: 8,
            font: fontSerifItalic,
            color: subtleColor
          })

          page.drawLine({
            start: { x: margin, y: pageHeight - margin + 8 },
            end: { x: pageWidth - margin, y: pageHeight - margin + 8 },
            thickness: 0.5,
            color: rgb(0.85, 0.85, 0.88)
          })
        }

        // Running Footer (Page Number)
        const pageNumStr = `${totalPagesCreated}`
        const numWidth = fontSerif.widthOfTextAtSize(pageNumStr, 9)
        page.drawText(pageNumStr, {
          x: pageWidth / 2 - numWidth / 2,
          y: margin - 20,
          size: 9,
          font: fontSerif,
          color: subtleColor
        })

        return { page, startY: pageHeight - margin - 10 }
      }

      // 1. Cover Page
      if (includeCover) {
        const coverPage = pdfDoc.addPage([pageWidth, pageHeight])
        totalPagesCreated++

        // Decorative Outer Border
        coverPage.drawRectangle({
          x: 25,
          y: 25,
          width: pageWidth - 50,
          height: pageHeight - 50,
          borderColor: rgb(0.8, 0.8, 0.85),
          borderWidth: 1.5,
          color: rgb(0.99, 0.99, 1.0)
        })

        coverPage.drawRectangle({
          x: 30,
          y: 30,
          width: pageWidth - 60,
          height: pageHeight - 60,
          borderColor: accentColor,
          borderWidth: 0.5
        })

        // Title
        const titleSize = pageSize === 'a5' ? 22 : 28
        const titleWords = bookMeta.title.split(' ')
        let currentTitleLine = ''
        let titleY = pageHeight * 0.65

        for (let w = 0; w < titleWords.length; w++) {
          const test = currentTitleLine ? `${currentTitleLine} ${titleWords[w]}` : titleWords[w]
          const testWidth = fontSerifBold.widthOfTextAtSize(test, titleSize)

          if (testWidth > printableWidth - 40 && currentTitleLine) {
            const lineWidth = fontSerifBold.widthOfTextAtSize(currentTitleLine, titleSize)
            coverPage.drawText(currentTitleLine, {
              x: pageWidth / 2 - lineWidth / 2,
              y: titleY,
              size: titleSize,
              font: fontSerifBold,
              color: headingColor
            })
            titleY -= titleSize + 8
            currentTitleLine = titleWords[w]
          } else {
            currentTitleLine = test
          }
        }

        if (currentTitleLine) {
          const lineWidth = fontSerifBold.widthOfTextAtSize(currentTitleLine, titleSize)
          coverPage.drawText(currentTitleLine, {
            x: pageWidth / 2 - lineWidth / 2,
            y: titleY,
            size: titleSize,
            font: fontSerifBold,
            color: headingColor
          })
          titleY -= titleSize + 15
        }

        // Decorative Divider
        coverPage.drawLine({
          start: { x: pageWidth / 2 - 40, y: titleY },
          end: { x: pageWidth / 2 + 40, y: titleY },
          thickness: 1.5,
          color: accentColor
        })

        // Author
        const authorSize = pageSize === 'a5' ? 13 : 16
        const authorStr = `By ${bookMeta.author}`
        const authorWidth = fontSerifItalic.widthOfTextAtSize(authorStr, authorSize)

        coverPage.drawText(authorStr, {
          x: pageWidth / 2 - authorWidth / 2,
          y: titleY - 30,
          size: authorSize,
          font: fontSerifItalic,
          color: subtleColor
        })

        // Publisher / Archival Tag at Bottom
        const imprintStr = 'Digital Archival Edition • Generated via OpenPDF'
        const imprintWidth = fontSerif.widthOfTextAtSize(imprintStr, 8)
        coverPage.drawText(imprintStr, {
          x: pageWidth / 2 - imprintWidth / 2,
          y: 45,
          size: 8,
          font: fontSerif,
          color: rgb(0.6, 0.6, 0.65)
        })
      }

      // 2. Table of Contents Page
      if (includeToc && activeChapters.length > 1) {
        let { page: tocPage, startY: tocY } = addNewBookPage(bookMeta.title)

        // TOC Header
        tocPage.drawText('Table of Contents', {
          x: margin,
          y: tocY,
          size: 16,
          font: fontSerifBold,
          color: headingColor
        })

        tocY -= 28

        for (let i = 0; i < activeChapters.length; i++) {
          if (tocY < margin + 30) {
            const nextToc = addNewBookPage(bookMeta.title)
            tocPage = nextToc.page
            tocY = nextToc.startY
          }

          const ch = activeChapters[i]
          const numPrefix = `${i + 1}. `
          const fullTocLine = `${numPrefix}${ch.title}`
          const cleanLine = fullTocLine.length > 55 ? fullTocLine.substring(0, 52) + '...' : fullTocLine

          tocPage.drawText(cleanLine, {
            x: margin + 5,
            y: tocY,
            size: 10,
            font: fontSerif,
            color: textColor
          })

          tocY -= 18
        }
      }

      // 3. Chapters Content Pages
      const stepProgress = 80 / activeChapters.length

      for (let c = 0; c < activeChapters.length; c++) {
        const chapter = activeChapters[c]
        let { page: currentPage, startY: currentY } = addNewBookPage(bookMeta.title)

        // Draw Chapter Title Header
        const chHeadingSize = fontSize + 5
        currentPage.drawText(chapter.title, {
          x: margin,
          y: currentY,
          size: chHeadingSize,
          font: fontSerifBold,
          color: headingColor
        })

        currentY -= chHeadingSize + 12

        // Chapter decorative separator
        currentPage.drawLine({
          start: { x: margin, y: currentY + 4 },
          end: { x: margin + 60, y: currentY + 4 },
          thickness: 1,
          color: accentColor
        })

        currentY -= 15

        // Process chapter paragraphs
        for (let p = 0; p < chapter.paragraphs.length; p++) {
          const para = chapter.paragraphs[p]
          const isHeading = para.isHeading
          const pFontSize = isHeading ? fontSize + 2 : fontSize
          const pFont = isHeading ? fontSerifBold : fontSerif
          const pColor = isHeading ? headingColor : textColor

          const words = para.text.split(' ')
          let lineBuffer = ''

          for (let w = 0; w < words.length; w++) {
            const testLine = lineBuffer ? `${lineBuffer} ${words[w]}` : words[w]
            const testWidth = pFont.widthOfTextAtSize(testLine, pFontSize)

            if (testWidth > printableWidth && lineBuffer) {
              // Check if we need a new page
              if (currentY < margin + 25) {
                const nextPage = addNewBookPage(chapter.title)
                currentPage = nextPage.page
                currentY = nextPage.startY
              }

              currentPage.drawText(lineBuffer, {
                x: margin,
                y: currentY,
                size: pFontSize,
                font: pFont,
                color: pColor
              })

              currentY -= pFontSize * lineHeight
              lineBuffer = words[w]
            } else {
              lineBuffer = testLine
            }
          }

          if (lineBuffer) {
            if (currentY < margin + 25) {
              const nextPage = addNewBookPage(chapter.title)
              currentPage = nextPage.page
              currentY = nextPage.startY
            }

            currentPage.drawText(lineBuffer, {
              x: margin,
              y: currentY,
              size: pFontSize,
              font: pFont,
              color: pColor
            })

            currentY -= pFontSize * lineHeight + (isHeading ? 8 : 6)
          }
        }

        setProgress(Math.round(15 + (c + 1) * stepProgress))
      }

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      setConvertedPdfUrl(url)
      setPdfSize((blob.size / 1024).toFixed(1) + ' KB')
      setProgress(100)
    } catch (err) {
      console.error('EPUB to PDF Conversion Error:', err)
      setError(err.message || 'Failed to convert EPUB to PDF.')
    } finally {
      setConverting(false)
    }
  }

  const handleDownload = () => {
    if (!convertedPdfUrl || !file) return
    const cleanTitle = (bookMeta.title || file.name.replace(/\.epub$/i, ''))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
    const downloadName = `${cleanTitle}-Book.pdf`

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
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  eBook (.epub) to PDF
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    Book Typesetting
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Convert EPUB digital books into paginated, print-ready PDF volumes with cover and chapter formatting
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

        {/* Step 1: Upload Dropzone */}
        {!file && (
          <div className="border-2 border-dashed border-zinc-800 hover:border-amber-500/50 rounded-2xl p-8 md:p-12 text-center transition-colors bg-zinc-900/30 group">
            <input
              type="file"
              id="epub-input"
              accept=".epub"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="epub-input"
              className="flex flex-col items-center justify-center cursor-pointer space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center group-hover:scale-105 group-hover:border-amber-500/50 transition-all">
                <BookMarked className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-200">Click to select EPUB eBook file</p>
                <p className="text-xs text-zinc-500 mt-1">Supports standard EPUB 2.0 & 3.0 digital book archives</p>
              </div>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                Select .EPUB Book
              </span>
            </label>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-amber-500 rounded-full animate-spin"></div>
            <p className="text-sm text-zinc-400 font-medium">Extracting chapters, typography, and book spine...</p>
          </div>
        )}

        {/* Step 2: Book Details & Settings */}
        {file && !loading && bookMeta.chapters.length > 0 && (
          <div className="space-y-6">
            {/* Book Overview Card */}
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-18 bg-amber-500/10 border border-amber-500/30 rounded-lg flex flex-col items-center justify-center p-2 text-amber-400 shrink-0">
                  <BookOpen className="w-6 h-6 mb-1" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">EPUB</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-snug">{bookMeta.title}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Author: {bookMeta.author}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {bookMeta.chapters.length} Total Chapters Extracted • File: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setFile(null)
                  setBookMeta({ title: '', author: '', chapters: [] })
                  setConvertedPdfUrl(null)
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline shrink-0 cursor-pointer"
              >
                Change Book
              </button>
            </div>

            {/* Typesetting & Book Layout Controls */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-amber-400" />
                Book Formatting & Page Layout
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Page Format */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Page Dimensions</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="a5">A5 Pocket Book (5.8 × 8.3 in)</option>
                    <option value="a4">A4 Standard (8.3 × 11.7 in)</option>
                    <option value="letter">US Letter (8.5 × 11.0 in)</option>
                  </select>
                </div>

                {/* Font Size */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Book Font Size</label>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="10">10 pt (Compact)</option>
                    <option value="11">11 pt (Standard Novel)</option>
                    <option value="12">12 pt (Large Print)</option>
                    <option value="14">14 pt (Extra Large)</option>
                  </select>
                </div>

                {/* Line Spacing */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Line Spacing</label>
                  <select
                    value={lineHeight}
                    onChange={(e) => setLineHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="1.3">1.3 (Tight)</option>
                    <option value="1.5">1.5 (Standard Book)</option>
                    <option value="1.8">1.8 (Spacious)</option>
                  </select>
                </div>

                {/* Margins */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Page Margins</label>
                  <select
                    value={marginSize}
                    onChange={(e) => setMarginSize(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="30">Compact Margins</option>
                    <option value="40">Classic Book Margins</option>
                    <option value="55">Wide Binder Margins</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800/80">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={includeCover}
                    onChange={(e) => setIncludeCover(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  Generate Decorative Cover Page
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={includeToc}
                    onChange={(e) => setIncludeToc(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  Include Table of Contents
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={chapterNewPage}
                    onChange={(e) => setChapterNewPage(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  Start Chapters on New Page
                </label>
              </div>
            </div>

            {/* Chapter Selection Explorer */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-amber-400" />
                  Select Chapters to Include (
                  {bookMeta.chapters.filter((c) => selectedChapters[c.id]).length} of {bookMeta.chapters.length})
                </h3>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => toggleAllChapters(true)}
                    className="text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-zinc-600">•</span>
                  <button
                    onClick={() => toggleAllChapters(false)}
                    className="text-zinc-400 hover:text-zinc-300 underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-2 border border-zinc-800/60 rounded-lg p-2 bg-zinc-950/40">
                {bookMeta.chapters.map((ch, idx) => (
                  <div
                    key={ch.id}
                    onClick={() => toggleChapter(ch.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      selectedChapters[ch.id]
                        ? 'bg-amber-500/10 border-amber-500/30 text-zinc-100'
                        : 'bg-zinc-900/50 border-zinc-800/60 text-zinc-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!!selectedChapters[ch.id]}
                        onChange={() => {}}
                        className="rounded bg-zinc-950 border-zinc-700 text-amber-500 focus:ring-0 w-4 h-4"
                      />
                      <span className="font-semibold text-zinc-200">
                        {idx + 1}. {ch.title}
                      </span>
                    </div>

                    <span className="text-[10px] text-zinc-500 font-mono">
                      {ch.paragraphs.length} paragraphs
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-2">
              <button
                onClick={handleConvertToPdf}
                disabled={converting}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 cursor-pointer transition-all"
              >
                {converting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Typesetting & Compiling Book ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Typeset & Export Book to PDF</span>
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
                    <h4 className="text-sm font-bold text-white">eBook PDF Generated!</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Completed book volume • Size: {pdfSize} • Format: {pageSize.toUpperCase()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download Book PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
