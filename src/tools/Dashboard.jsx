import React from 'react'
import { FileUp, Scissors, RotateCw, Trash2, FileDown, Maximize2, FolderArchive, ShieldAlert, Cpu } from 'lucide-react'

export default function Dashboard({ onSelectTool }) {
  const primaryTools = [
    {
      id: 'merge',
      name: 'Merge PDFs',
      desc: 'Combine multiple PDF documents into a single consolidated file in your preferred order.',
      icon: FileUp,
      badge: 'Core'
    },
    {
      id: 'split',
      name: 'Split PDF',
      desc: 'Extract specific page ranges or split every page into separate individual PDF files.',
      icon: Scissors,
      badge: 'Core'
    },
    {
      id: 'rotatepdf',
      name: 'Rotate PDF',
      desc: 'Turn sideways pages clockwise or counter-clockwise and save the modified document.',
      icon: RotateCw,
      badge: 'Core'
    },
    {
      id: 'organize',
      name: 'Organize Pages',
      desc: 'Reorder, duplicate, or delete document pages with real-time thumbnail layouts.',
      icon: Trash2,
      badge: 'Core'
    },
    {
      id: 'compress',
      name: 'Compress PDF',
      desc: 'Reduce file storage size via light structural cleanup or resource downscaling.',
      icon: FileDown,
      badge: 'Core'
    },
    {
      id: 'cropresize',
      name: 'Crop & Resize',
      desc: 'Crop margins or resize page boundaries to standard formats (A4, Letter, A3).',
      icon: Maximize2,
      badge: 'Core'
    },
    {
      id: 'pdftozip',
      name: 'PDF to ZIP',
      desc: 'Convert pages into individual images (JPEG/PNG) and pack them into a ZIP archive.',
      icon: FolderArchive,
      badge: 'Core'
    }
  ]

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Privacy-First PDF Utility Sandbox 🔐
          </h2>
          <p className="text-zinc-400 text-sm max-w-xl">
            All conversions, edits, and merges are computed locally inside your browser cache. Files never touch external servers or upload targets.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full select-none">
            <Cpu className="w-3.5 h-3.5" /> Client-Side GPU/CPU
          </div>
        </div>
      </section>

      {/* Primary tools grid */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Available Core Modules</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {primaryTools.map((tool) => {
            const Icon = tool.icon
            return (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                className="group relative flex flex-col items-start p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:bg-zinc-800/40 text-left transition-all duration-200 shadow-md shadow-black/10 select-none cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-4 group-hover:border-zinc-700">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <div className="absolute top-6 right-6 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
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

      {/* Security Info Card */}
      <section className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-6 flex gap-4 items-start max-w-3xl">
        <ShieldAlert className="w-6 h-6 text-zinc-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-zinc-300">How Offline Execution Works</h4>
          <p className="text-zinc-500 text-xs leading-relaxed">
            Upon your first visit, a local Service Worker downloads standard libraries (such as <code>pdf-lib</code> and <code>pdf.js</code>). Subsequently, those scripts are intercepted and run entirely inside your browser's sandboxed client thread, meaning you can shut off your Wi-Fi entirely and continue processing files.
          </p>
        </div>
      </section>
    </div>
  )
}
