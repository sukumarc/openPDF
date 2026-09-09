import React, { useState, useRef, useEffect } from 'react'
import {
  FormInput,
  Download,
  FileUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CheckSquare,
  List,
  CircleDot,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Layers
} from 'lucide-react'

export default function FillFormTool() {
  const [file, setFile] = useState(null)
  const [fileBuffer, setFileBuffer] = useState(null)
  const [pdfDocProxy, setPdfDocProxy] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  // Discovered Form Fields
  const [fields, setFields] = useState([])
  const [formData, setFormData] = useState({})
  const [flattenOutput, setFlattenOutput] = useState(false)

  // Status
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
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
    setLoading(true)

    try {
      const buffer = await selectedFile.arrayBuffer()
      setFileBuffer(buffer)

      const { PDFDocument } = window.PDFLib || (await import('pdf-lib'))
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })

      // Extract form fields
      const extractedFields = []
      const initialData = {}

      try {
        const form = pdfDoc.getForm()
        const rawFields = form.getFields()

        rawFields.forEach((field, idx) => {
          const name = field.getName()
          const constructorName = field.constructor.name

          let type = 'text'
          let value = ''
          let options = []

          if (constructorName.includes('CheckBox')) {
            type = 'checkbox'
            value = field.isChecked()
          } else if (constructorName.includes('Dropdown')) {
            type = 'dropdown'
            options = field.getOptions() || []
            value = field.getSelected()?.[0] || options[0] || ''
          } else if (constructorName.includes('RadioGroup')) {
            type = 'radio'
            options = field.getOptions() || []
            value = field.getSelected() || ''
          } else {
            // Text field or other
            type = 'text'
            try {
              value = field.getText() || ''
            } catch {
              value = ''
            }
          }

          extractedFields.push({ id: `field_${idx}`, name, type, options, defaultValue: value })
          initialData[name] = value
        })
      } catch (formErr) {
        console.log('No AcroForms detected or error reading fields:', formErr)
      }

      setFields(extractedFields)
      setFormData(initialData)

      // Setup PDF.js for preview
      if (window.pdfjsLib) {
        const loadingTask = window.pdfjsLib.getDocument({ data: buffer.slice(0) })
        const doc = await loadingTask.promise
        setPdfDocProxy(doc)
        setPageCount(doc.numPages)
        setCurrentPage(1)
      }
    } catch (err) {
      console.error('Failed to read PDF:', err)
      setError('Failed to inspect form fields: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Render current preview page
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
        await page.render({ canvasContext: ctx, viewport }).promise
      } catch (err) {
        if (!isCancelled) console.error('Preview error:', err)
      }
    }

    renderPreview()
    return () => {
      isCancelled = true
    }
  }, [pdfDocProxy, currentPage])

  // Field change handlers
  const handleFieldChange = (fieldName, val) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: val
    }))
  }

  // Save Filled Form
  const handleSaveForm = async () => {
    if (!file || !fileBuffer) return

    setSaving(true)
    setError(null)

    try {
      const { PDFDocument } = window.PDFLib || (await import('pdf-lib'))
      const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true })
      const form = pdfDoc.getForm()

      // Fill values
      fields.forEach((f) => {
        const val = formData[f.name]
        try {
          if (f.type === 'text') {
            const tf = form.getTextField(f.name)
            tf.setText(String(val || ''))
          } else if (f.type === 'checkbox') {
            const cb = form.getCheckBox(f.name)
            if (val) cb.check()
            else cb.uncheck()
          } else if (f.type === 'dropdown') {
            const dd = form.getDropdown(f.name)
            if (val) dd.select(val)
          } else if (f.type === 'radio') {
            const rg = form.getRadioGroup(f.name)
            if (val) rg.select(val)
          }
        } catch (fieldErr) {
          console.warn(`Could not set field ${f.name}:`, fieldErr)
        }
      })

      // Optional Flatten
      if (flattenOutput) {
        try {
          form.flatten()
        } catch (e) {
          console.warn('Form flatten warning:', e)
        }
      }

      const outputBytes = await pdfDoc.save()
      const outputFilename = `${file.name.replace(/\.pdf$/i, '')}_filled.pdf`

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
      console.error('Save failed:', err)
      setError('Failed to save filled PDF: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setFile(null)
    setFileBuffer(null)
    setPdfDocProxy(null)
    setFields([])
    setFormData({})
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
            <FormInput className="w-6 h-6 text-amber-500" />
            Fill PDF Forms (AcroForms)
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Fill out interactive PDF text fields, checkboxes, dropdowns, and radio buttons in your browser.
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
              <p className="font-semibold text-white">Form Saved & Exported Successfully</p>
              <p className="text-xs text-emerald-300 mt-0.5">
                The filled PDF has been downloaded with your input values preserved.
              </p>
            </div>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Fill Another Form
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
            Select a PDF form to fill
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Drag and drop or browse from your computer (never uploaded)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Discovered Form Fields Editor */}
          <div className="lg:col-span-6 space-y-5">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <FormInput className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-zinc-200">Interactive Form Fields</h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  {fields.length} Fields Detected
                </span>
              </div>

              {fields.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-950/60 rounded-xl border border-zinc-800">
                  <p>No interactive AcroForm fields were detected in this PDF.</p>
                  <p className="text-zinc-500 mt-1">
                    If this is a scanned form, use the <strong>Sign PDF</strong> or <strong>Annotate PDF</strong> tool to add text and marks.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[450px] overflow-y-auto pr-1">
                  {fields.map((f) => (
                    <div key={f.id} className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-semibold text-zinc-300 truncate max-w-[260px]">{f.name}</label>
                        <span className="text-[10px] text-zinc-500 uppercase">{f.type}</span>
                      </div>

                      {/* Render control based on type */}
                      {f.type === 'text' && (
                        <input
                          type="text"
                          value={formData[f.name] || ''}
                          onChange={(e) => handleFieldChange(f.name, e.target.value)}
                          placeholder="Enter value..."
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                        />
                      )}

                      {f.type === 'checkbox' && (
                        <label className="flex items-center gap-2 pt-1 text-xs text-zinc-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(formData[f.name])}
                            onChange={(e) => handleFieldChange(f.name, e.target.checked)}
                            className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500/20"
                          />
                          <span>Checked / Active</span>
                        </label>
                      )}

                      {f.type === 'dropdown' && (
                        <select
                          value={formData[f.name] || ''}
                          onChange={(e) => handleFieldChange(f.name, e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                        >
                          {f.options.map((opt, i) => (
                            <option key={i} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {f.type === 'radio' && (
                        <div className="space-y-1 pt-1">
                          {f.options.map((opt, i) => (
                            <label key={i} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                              <input
                                type="radio"
                                name={f.name}
                                value={opt}
                                checked={formData[f.name] === opt}
                                onChange={(e) => handleFieldChange(f.name, e.target.value)}
                                className="border-zinc-700 bg-zinc-900 text-amber-500"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Options: Flatten form */}
              <div className="pt-2 border-t border-zinc-800">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={flattenOutput}
                    onChange={(e) => setFlattenOutput(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500/20"
                  />
                  Flatten form after saving (Lock fields into static vectors)
                </label>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="px-4 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveForm}
                disabled={saving || fields.length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving Form...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" /> Save & Export Filled PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: PDF Preview */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 px-4 py-2.5 rounded-xl text-xs">
              <span className="text-zinc-400">
                Document Preview: Page <span className="text-white font-semibold">{currentPage}</span> of {pageCount}
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
