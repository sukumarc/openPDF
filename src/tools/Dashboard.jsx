import React from 'react'
import {
  FileUp,
  Scissors,
  RotateCw,
  Trash2,
  FileDown,
  Maximize2,
  FolderArchive,
  Image,
  FileImage,
  FileText,
  FileSpreadsheet,
  FileCode,
  Layers,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  EyeOff,
  Fingerprint,
  FileSearch,
  PenTool,
  Stamp,
  Binary,
  FormInput,
  Highlighter,
  GitCompare,
  Moon,
  ScanText,
  Wrench,
  LayoutGrid,
  Headphones,
  Mic,
  ImageDown,
  Radio,
  ArrowRight
} from 'lucide-react'

export default function Dashboard({ onSelectTool }) {
  const smartTools = [
    {
      id: 'ocrpdf',
      name: 'OCR PDF',
      desc: 'On-device WebAssembly OCR to convert scanned PDFs into searchable, selectable text documents.',
      icon: ScanText,
      badge: 'AI / WASM'
    },
    {
      id: 'repairpdf',
      name: 'Repair & Recover',
      desc: 'Fix corrupted PDF streams, damaged cross-reference (xref) tables, and unclosed trailers.',
      icon: Wrench,
      badge: 'Smart'
    },
    {
      id: 'nup',
      name: 'N-up Handouts',
      desc: 'Combine 2, 4, 6, 8, 9, or 16 pages onto a single printed sheet with custom margins & borders.',
      icon: LayoutGrid,
      badge: 'Smart'
    },
    {
      id: 'pdftoaudio',
      name: 'PDF to Audio',
      desc: 'Listen to PDF documents aloud with natural on-device speech synthesis and speed control.',
      icon: Headphones,
      badge: 'Voice'
    },
    {
      id: 'audiotopdf',
      name: 'Speech to PDF',
      desc: 'Transcribe live microphone speech and meetings into formatted, timestamped PDF reports.',
      icon: Mic,
      badge: 'Voice'
    },
    {
      id: 'extractimages',
      name: 'Extract Images',
      desc: 'Extract raw embedded raster images (JPEG, PNG, WebP) directly from internal PDF streams into a ZIP.',
      icon: ImageDown,
      badge: 'Smart'
    },
    {
      id: 'p2pshare',
      name: 'P2P Direct Share',
      desc: 'End-to-end encrypted direct browser-to-browser PDF transfer via WebRTC with zero servers.',
      icon: Radio,
      badge: 'P2P'
    }
  ]

  const editingTools = [
    {
      id: 'signpdf',
      name: 'Sign PDF',
      desc: 'Draw, type cursive, or upload transparent digital signatures with visual drag-and-drop placement.',
      icon: PenTool,
      badge: 'Editing'
    },
    {
      id: 'watermark',
      name: 'Add Watermark',
      desc: 'Apply custom text or logo watermarks with transparency, rotation (-90° to 90°), and tiled grids.',
      icon: Stamp,
      badge: 'Editing'
    },
    {
      id: 'pagenumbers',
      name: 'Page Numbers & Bates',
      desc: 'Add headers, footers, customizable pagination ("Page X of Y"), and legal Bates numbering.',
      icon: Binary,
      badge: 'Editing'
    },
    {
      id: 'fillform',
      name: 'Fill PDF Forms',
      desc: 'Fill out interactive AcroForm text fields, checkboxes, dropdowns, and radio buttons client-side.',
      icon: FormInput,
      badge: 'Editing'
    },
    {
      id: 'annotatepdf',
      name: 'Annotate & Markup',
      desc: 'Draw freehand markings, highlight text, add callout notes, rectangles, and arrows directly on pages.',
      icon: Highlighter,
      badge: 'Editing'
    },
    {
      id: 'comparepdf',
      name: 'Compare PDFs',
      desc: 'Synchronized side-by-side comparison and pixel-level visual difference highlighting between documents.',
      icon: GitCompare,
      badge: 'Editing'
    },
    {
      id: 'invertcolors',
      name: 'Invert & Dark Mode',
      desc: 'Convert PDFs to high-contrast Dark Mode (White-on-Black), Slate, or Warm Sepia for easy reading.',
      icon: Moon,
      badge: 'Editing'
    }
  ]

  const securityTools = [
    {
      id: 'privacyscanner',
      name: 'Privacy & PII Scanner',
      desc: 'Audit document for sensitive PII (Aadhaar, PAN, SSN, Credit Cards, Emails) before sharing.',
      icon: ShieldAlert,
      badge: 'Security'
    },
    {
      id: 'redact',
      name: 'Redact & Blackout',
      desc: 'Permanently scrub and redact sensitive text, account numbers, and visual areas on canvas.',
      icon: EyeOff,
      badge: 'Security'
    },
    {
      id: 'encryptpdf',
      name: 'Protect & Encrypt',
      desc: 'Password-protect PDF files with 128-bit encryption and restrict printing or copying.',
      icon: Lock,
      badge: 'Security'
    },
    {
      id: 'unlockpdf',
      name: 'Unlock & Decrypt',
      desc: 'Remove password restrictions and strip permission limits completely in browser memory.',
      icon: Unlock,
      badge: 'Security'
    },
    {
      id: 'metadata',
      name: 'Metadata Sanitizer',
      desc: 'Inspect and wipe hidden author, software, and creation metadata fingerprints.',
      icon: FileSearch,
      badge: 'Security'
    },
    {
      id: 'flatten',
      name: 'Flatten Document',
      desc: 'Bake interactive AcroForms, annotations, and form widgets into static, non-fillable vector pages.',
      icon: Layers,
      badge: 'Security'
    },
    {
      id: 'fingerprint',
      name: 'Watermark & Fingerprint',
      desc: 'Apply visible audit stamps, custom watermarks, and trace IDs to prevent unauthorized leaks.',
      icon: Fingerprint,
      badge: 'Security'
    }
  ]

  const conversionTools = [
    {
      id: 'pdftojpg',
      name: 'PDF to JPG / PNG',
      desc: 'Export high-resolution images up to 600 DPI (Web, Print, Archival) per page or as ZIP.',
      icon: Image,
      badge: 'Conversion'
    },
    {
      id: 'imagestopdf',
      name: 'Images to PDF',
      desc: 'Convert multiple JPG, PNG, and WebP images into a formatted, custom-margin PDF.',
      icon: FileImage,
      badge: 'Conversion'
    },
    {
      id: 'wordtopdf',
      name: 'Word (.docx) to PDF',
      desc: 'Convert Word documents (.docx) into standard PDF documents entirely in your browser.',
      icon: FileText,
      badge: 'Conversion'
    },
    {
      id: 'pdftoword',
      name: 'PDF to Word (.docx)',
      desc: 'Extract paragraphs, text layers, and headings from PDF into an editable Word document.',
      icon: FileText,
      badge: 'Conversion'
    },
    {
      id: 'exceltopdf',
      name: 'Excel & CSV to PDF',
      desc: 'Parse Excel sheets (.xlsx, .xls) and CSV spreadsheets into clean PDF table reports.',
      icon: FileSpreadsheet,
      badge: 'Conversion'
    },
    {
      id: 'markdowntopdf',
      name: 'Markdown (.md) to PDF',
      desc: 'Live split-pane markdown editor with instant preview and styled PDF document export.',
      icon: FileCode,
      badge: 'Conversion'
    },
    {
      id: 'extracttext',
      name: 'Extract Text',
      desc: 'Extract pure text content across all pages with word stats, search, and .txt export.',
      icon: Layers,
      badge: 'Conversion'
    }
  ]

  const pageManagementTools = [
    {
      id: 'merge',
      name: 'Merge PDFs',
      desc: 'Combine multiple PDF documents into a single consolidated file in your preferred order.',
      icon: FileUp,
      badge: 'Page'
    },
    {
      id: 'split',
      name: 'Split PDF',
      desc: 'Extract specific page ranges or split every page into separate individual PDF files.',
      icon: Scissors,
      badge: 'Page'
    },
    {
      id: 'rotatepdf',
      name: 'Rotate PDF',
      desc: 'Turn sideways pages clockwise or counter-clockwise and save the modified document.',
      icon: RotateCw,
      badge: 'Page'
    },
    {
      id: 'organize',
      name: 'Organize Pages',
      desc: 'Reorder, duplicate, or delete document pages with real-time thumbnail layouts.',
      icon: Trash2,
      badge: 'Page'
    },
    {
      id: 'compress',
      name: 'Compress PDF',
      desc: 'Ghostscript WebAssembly local compression with multi-level DPI downsampling.',
      icon: FileDown,
      badge: 'WASM'
    },
    {
      id: 'cropresize',
      name: 'Crop & Resize',
      desc: 'Crop margins or resize page boundaries to standard formats (A4, Letter, A3).',
      icon: Maximize2,
      badge: 'Page'
    },
    {
      id: 'pdftozip',
      name: 'PDF to ZIP',
      desc: 'Convert pages into individual images (JPEG/PNG) and pack them into a ZIP archive.',
      icon: FolderArchive,
      badge: 'Page'
    }
  ]

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Privacy-First PDF Utility Sandbox 🔐
          </h2>
          <p className="text-zinc-400 text-sm max-w-xl">
            All conversions, OCR, speech synthesis, signatures, encryption, and merges are computed locally inside your browser cache. Files never touch external servers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full select-none">
            <ShieldCheck className="w-3.5 h-3.5" /> 100% Client-Side Private
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-full select-none">
            <Cpu className="w-3.5 h-3.5" /> 35 In-Browser Tools
          </div>
        </div>
      </section>

      {/* Advanced & Smart Utilities Suite Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-500"></span>
              Advanced & Smart Utilities Suite
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">On-device WebAssembly OCR, PDF repair, N-up handouts, audio speech reader, and P2P sharing</p>
          </div>
          <span className="text-xs text-zinc-500 font-mono">7 Tools</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {smartTools.map((tool) => {
            const Icon = tool.icon
            return (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                className="group relative flex flex-col items-start p-5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-violet-500/40 hover:bg-zinc-850 text-left transition-all duration-200 shadow-md shadow-black/10 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-3.5 group-hover:border-violet-500/40 transition-colors">
                  <Icon className="w-5 h-5 text-violet-400" />
                </div>
                <div className="absolute top-5 right-5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  {tool.badge}
                </div>
                <h4 className="text-sm font-bold text-zinc-100 mb-1 group-hover:text-violet-400 transition-colors">
                  {tool.name}
                </h4>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  {tool.desc}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Editing, Signing & Annotations Suite Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Editing, Signing & Annotations Suite
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Sign, watermark, number, fill forms, markup, compare, and invert PDFs</p>
          </div>
          <span className="text-xs text-zinc-500 font-mono">7 Tools</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {editingTools.map((tool) => {
            const Icon = tool.icon
            return (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                className="group relative flex flex-col items-start p-5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-amber-500/40 hover:bg-zinc-850 text-left transition-all duration-200 shadow-md shadow-black/10 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-3.5 group-hover:border-amber-500/40 transition-colors">
                  <Icon className="w-5 h-5 text-amber-400" />
                </div>
                <div className="absolute top-5 right-5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  {tool.badge}
                </div>
                <h4 className="text-sm font-bold text-zinc-100 mb-1 group-hover:text-amber-400 transition-colors">
                  {tool.name}
                </h4>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  {tool.desc}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Security & Privacy Suite Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Security, Privacy & Compliance Suite
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Protect, redact, sanitize, encrypt, and audit sensitive PDF documents</p>
          </div>
          <span className="text-xs text-zinc-500 font-mono">7 Tools</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {securityTools.map((tool) => {
            const Icon = tool.icon
            return (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                className="group relative flex flex-col items-start p-5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-emerald-500/40 hover:bg-zinc-850 text-left transition-all duration-200 shadow-md shadow-black/10 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-3.5 group-hover:border-emerald-500/40 transition-colors">
                  <Icon className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="absolute top-5 right-5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  {tool.badge}
                </div>
                <h4 className="text-sm font-bold text-zinc-100 mb-1 group-hover:text-emerald-400 transition-colors">
                  {tool.name}
                </h4>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  {tool.desc}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Conversion Suite Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Document Conversion Suite
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Convert between PDF, Images, Word, Excel, and Markdown</p>
          </div>
          <span className="text-xs text-zinc-500 font-mono">7 Tools</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {conversionTools.map((tool) => {
            const Icon = tool.icon
            return (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                className="group relative flex flex-col items-start p-5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-blue-500/40 hover:bg-zinc-850 text-left transition-all duration-200 shadow-md shadow-black/10 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-3.5 group-hover:border-blue-500/40 transition-colors">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <div className="absolute top-5 right-5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  {tool.badge}
                </div>
                <h4 className="text-sm font-bold text-zinc-100 mb-1 group-hover:text-blue-400 transition-colors">
                  {tool.name}
                </h4>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  {tool.desc}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Page Management Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              Page Management Suite
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Organize, merge, rotate, compress, and split PDF documents</p>
          </div>
          <span className="text-xs text-zinc-500 font-mono">7 Tools</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pageManagementTools.map((tool) => {
            const Icon = tool.icon
            return (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                className="group relative flex flex-col items-start p-5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-purple-500/40 hover:bg-zinc-850 text-left transition-all duration-200 shadow-md shadow-black/10 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-3.5 group-hover:border-purple-500/40 transition-colors">
                  <Icon className="w-5 h-5 text-purple-400" />
                </div>
                <div className="absolute top-5 right-5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  {tool.badge}
                </div>
                <h4 className="text-sm font-bold text-zinc-100 mb-1 group-hover:text-purple-400 transition-colors">
                  {tool.name}
                </h4>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  {tool.desc}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Security Info Card */}
      <section className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-6 flex gap-4 items-start max-w-3xl">
        <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-zinc-300">How Offline Execution Works</h4>
          <p className="text-zinc-500 text-xs leading-relaxed">
            All document conversions, OCR recognition, audio synthesis, signatures, watermarks, cryptographic encryption, and compression run strictly inside your client's web browser sandboxed environment using JavaScript and WebAssembly. No files or metadata ever leave your computer.
          </p>
        </div>
      </section>
    </div>
  )
}
