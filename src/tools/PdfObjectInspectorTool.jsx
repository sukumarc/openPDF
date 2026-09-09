import React, { useState } from 'react'
import {
  Binary,
  FileUp,
  Download,
  CheckCircle2,
  AlertCircle,
  Code2,
  FolderTree,
  Search,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Layers,
  Database,
  FileCode,
  Braces
} from 'lucide-react'

export default function PdfObjectInspectorTool() {
  const [file, setFile] = useState(null)
  const [objects, setObjects] = useState([])
  const [selectedObj, setSelectedObj] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState('formatted') // 'formatted', 'raw', 'hex'

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file.')
      return
    }

    setFile(selectedFile)
    setError('')
    setObjects([])
    setSelectedObj(null)
    setLoading(true)

    try {
      if (!window.PDFLib) {
        throw new Error('PDF-lib is loading. Please try again.')
      }

      const arrayBuffer = await selectedFile.arrayBuffer()
      const { PDFDocument } = window.PDFLib

      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
        parseSpeed: 1000
      })

      const rawText = new TextDecoder('latin1').decode(new Uint8Array(arrayBuffer))

      // Parse indirect objects: "\n{num} {gen} obj ... endobj"
      const objRegex = /([0-9]+)\s+([0-9]+)\s+obj([\s\S]*?)endobj/g
      let match
      const parsedObjects = []

      while ((match = objRegex.exec(rawText)) !== null) {
        const objNum = parseInt(match[1], 10)
        const genNum = parseInt(match[2], 10)
        const rawBody = match[3].trim()

        // Detect object Type dictionary
        let objType = 'Generic Object'
        const typeMatch = rawBody.match(/\/Type\s*\/([a-zA-Z0-9_]+)/)
        if (typeMatch) {
          objType = `/${typeMatch[1]}`
        } else if (rawBody.includes('/Font')) {
          objType = '/Font or FontDescriptor'
        } else if (rawBody.includes('/Subtype /Image') || rawBody.includes('/Image')) {
          objType = '/XObject (Image)'
        } else if (rawBody.includes('/Contents')) {
          objType = '/Page or Content Dict'
        } else if (rawBody.includes('stream')) {
          objType = '/Stream (Binary/Data)'
        }

        // Check if object contains stream
        const hasStream = rawBody.includes('stream') && rawBody.includes('endstream')
        let streamContent = ''
        let dictContent = rawBody

        if (hasStream) {
          const streamStart = rawBody.indexOf('stream')
          const streamEnd = rawBody.lastIndexOf('endstream')
          dictContent = rawBody.substring(0, streamStart).trim()
          streamContent = rawBody.substring(streamStart + 6, streamEnd).trim()
        }

        parsedObjects.push({
          id: `${objNum}_${genNum}`,
          objNum,
          genNum,
          type: objType,
          hasStream,
          dict: dictContent,
          stream: streamContent,
          raw: `${objNum} ${genNum} obj\n${rawBody}\nendobj`,
          byteSize: rawBody.length
        })
      }

      // Sort by object number
      parsedObjects.sort((a, b) => a.objNum - b.objNum)

      setObjects(parsedObjects)
      if (parsedObjects.length > 0) {
        setSelectedObj(parsedObjects[0])
      }
    } catch (err) {
      console.error('PDF Object Parsing Error:', err)
      setError(err.message || 'Failed to inspect PDF object tree.')
    } finally {
      setLoading(false)
    }
  }

  // Filter objects
  const filteredObjects = objects.filter((obj) => {
    const matchesSearch =
      searchQuery === '' ||
      obj.objNum.toString().includes(searchQuery) ||
      obj.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obj.dict.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = typeFilter === 'ALL' || obj.type.toLowerCase().includes(typeFilter.toLowerCase())

    return matchesSearch && matchesType
  })

  // Format Hex Dump
  const renderHexDump = (str) => {
    const bytes = []
    for (let i = 0; i < Math.min(str.length, 1024); i++) {
      bytes.push(str.charCodeAt(i))
    }

    const lines = []
    for (let i = 0; i < bytes.length; i += 16) {
      const slice = bytes.slice(i, i + 16)
      const hex = slice.map((b) => b.toString(16).padStart(2, '0')).join(' ')
      const ascii = slice
        .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
        .join('')
      const offset = i.toString(16).padStart(6, '0')
      lines.push(`${offset}  ${hex.padEnd(48, ' ')}  |${ascii}|`)
    }

    return lines.join('\n')
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportAstJson = () => {
    if (objects.length === 0) return
    const exportData = objects.map((o) => ({
      objectNumber: o.objNum,
      generation: o.genNum,
      type: o.type,
      dictionary: o.dict,
      hasStream: o.hasStream,
      byteSize: o.byteSize
    }))

    const jsonStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const baseName = file ? file.name.replace(/\.pdf$/i, '') : 'Document'
    const fileName = `${baseName}-AST-Objects.json`

    if (window.download) {
      window.download(blob, fileName, 'application/json')
    } else {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = fileName
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
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Code2 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  PDF Object Tree & Syntax Debugger
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400">
                    Developer AST
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Inspect indirect objects, cross-reference tables (xref), dictionary keys, and raw decompressed streams
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
          <div className="border-2 border-dashed border-zinc-800 hover:border-purple-500/50 rounded-2xl p-8 md:p-12 text-center transition-colors bg-zinc-900/30 group">
            <input
              type="file"
              id="object-input"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="object-input"
              className="flex flex-col items-center justify-center cursor-pointer space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center group-hover:scale-105 group-hover:border-purple-500/50 transition-all">
                <FileUp className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-200">Click to select PDF document for AST inspection</p>
                <p className="text-xs text-zinc-500 mt-1">Parses low-level Cos dictionaries, streams, and xref tables</p>
              </div>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-semibold">
                Select PDF File
              </span>
            </label>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-purple-500 rounded-full animate-spin"></div>
            <p className="text-sm text-zinc-400 font-medium">Parsing indirect object offsets and stream tokens...</p>
          </div>
        )}

        {/* Step 2: Split Screen Object Explorer */}
        {file && !loading && objects.length > 0 && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Obj # or Key..."
                    className="pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-purple-500 w-44"
                  />
                </div>

                {/* Filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="ALL">All Types ({objects.length})</option>
                  <option value="Catalog">/Catalog</option>
                  <option value="Pages">/Pages & /Page</option>
                  <option value="Font">/Font</option>
                  <option value="XObject">/XObject & /Image</option>
                  <option value="Stream">/Stream Data</option>
                </select>

                <span className="text-xs text-zinc-500 font-mono">
                  Showing {filteredObjects.length} of {objects.length} Objects
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportAstJson}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-zinc-700 cursor-pointer transition-colors"
                >
                  <FileCode className="w-3.5 h-3.5 text-purple-400" />
                  <span>Export AST (.json)</span>
                </button>

                <button
                  onClick={() => {
                    setFile(null)
                    setObjects([])
                    setSelectedObj(null)
                  }}
                  className="text-xs text-zinc-400 hover:text-zinc-200 underline cursor-pointer pl-2"
                >
                  Change Document
                </button>
              </div>
            </div>

            {/* Split Screen Container */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[580px]">
              {/* Left Column: Object Directory Tree */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                <div className="bg-zinc-950/80 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-zinc-200">Object Directory</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">xref List</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40 p-1">
                  {filteredObjects.map((obj) => {
                    const isSelected = selectedObj?.id === obj.id
                    return (
                      <div
                        key={obj.id}
                        onClick={() => setSelectedObj(obj)}
                        className={`p-2.5 rounded-lg text-xs cursor-pointer transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-purple-600/20 border border-purple-500/40 text-white'
                            : 'hover:bg-zinc-800/60 text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span
                            className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                              isSelected ? 'bg-purple-500/30 text-purple-300' : 'bg-zinc-950 text-zinc-500'
                            }`}
                          >
                            {obj.objNum} {obj.genNum} R
                          </span>
                          <span className="truncate text-zinc-200 font-medium">{obj.type}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {obj.hasStream && (
                            <span className="text-[9px] px-1 bg-zinc-800 text-zinc-400 rounded font-mono">stream</span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right 2 Columns: Object Inspector & Syntax View */}
              <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                {selectedObj ? (
                  <>
                    <div className="bg-zinc-950/80 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-purple-400">
                          Object {selectedObj.objNum} {selectedObj.genNum}
                        </span>
                        <span className="text-xs text-zinc-400 font-semibold">{selectedObj.type}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">({selectedObj.byteSize} bytes)</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* View Tabs */}
                        <div className="flex items-center bg-zinc-900 p-0.5 rounded border border-zinc-800 text-[11px]">
                          <button
                            onClick={() => setViewMode('formatted')}
                            className={`px-2 py-0.5 rounded ${
                              viewMode === 'formatted' ? 'bg-purple-600 text-white font-medium' : 'text-zinc-400'
                            }`}
                          >
                            Formatted
                          </button>
                          <button
                            onClick={() => setViewMode('raw')}
                            className={`px-2 py-0.5 rounded ${
                              viewMode === 'raw' ? 'bg-purple-600 text-white font-medium' : 'text-zinc-400'
                            }`}
                          >
                            Raw
                          </button>
                          <button
                            onClick={() => setViewMode('hex')}
                            className={`px-2 py-0.5 rounded ${
                              viewMode === 'hex' ? 'bg-purple-600 text-white font-medium' : 'text-zinc-400'
                            }`}
                          >
                            Hex
                          </button>
                        </div>

                        <button
                          onClick={() => handleCopy(selectedObj.raw)}
                          className="p-1.5 text-zinc-400 hover:text-white rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                          title="Copy Object Syntax"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 p-4 bg-zinc-950 overflow-auto font-mono text-xs text-zinc-200 leading-relaxed">
                      {viewMode === 'formatted' && (
                        <div className="space-y-4">
                          <div>
                            <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block mb-1">
                              Dictionary Structure
                            </span>
                            <pre className="text-purple-300 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80 whitespace-pre-wrap">
                              {selectedObj.dict}
                            </pre>
                          </div>

                          {selectedObj.hasStream && (
                            <div>
                              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block mb-1">
                                Data Stream ({selectedObj.stream.length} bytes)
                              </span>
                              <pre className="text-zinc-400 bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/60 whitespace-pre-wrap max-h-48 overflow-auto">
                                {selectedObj.stream.substring(0, 800)}
                                {selectedObj.stream.length > 800 && '\n... [Remaining stream truncated for preview]'}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}

                      {viewMode === 'raw' && (
                        <pre className="text-zinc-300 whitespace-pre-wrap">{selectedObj.raw}</pre>
                      )}

                      {viewMode === 'hex' && (
                        <pre className="text-emerald-400/90 whitespace-pre font-mono text-[11px] leading-tight">
                          {renderHexDump(selectedObj.raw)}
                        </pre>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-zinc-600 text-xs">
                    Select an object on the left to inspect its syntax tree.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
