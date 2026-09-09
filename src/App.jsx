import React, { useState, useEffect } from 'react'
import { LayoutDashboard, FileUp, Scissors, RotateCw, Trash2, FileDown, Maximize2, FolderArchive, RefreshCw, Menu, ShieldCheck } from 'lucide-react'
import Dashboard from './tools/Dashboard.jsx'
import MergeTool from './tools/MergeTool.jsx'
import SplitTool from './tools/SplitTool.jsx'
import RotateTool from './tools/RotateTool.jsx'
import OrganizeTool from './tools/OrganizeTool.jsx'
import CompressTool from './tools/CompressTool.jsx'
import CropResizeTool from './tools/CropResizeTool.jsx'
import PdfToZipTool from './tools/PdfToZipTool.jsx'
import { J } from './utils/loader.js'

export default function App() {
  const [activeTool, setActiveTool] = useState('dashboard')
  const [loadingDeps, setLoadingDeps] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Load dynamic scripts for active tools
  useEffect(() => {
    if (activeTool === 'dashboard') return

    setLoadingDeps(true)
    J(activeTool)
      .then(() => {
        setLoadingDeps(false)
      })
      .catch((err) => {
        console.error('Failed to load libraries', err)
        setLoadingDeps(false)
      })
  }, [activeTool])

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'merge', name: 'Merge PDFs', icon: FileUp },
    { id: 'split', name: 'Split PDF', icon: Scissors },
    { id: 'rotatepdf', name: 'Rotate PDF', icon: RotateCw },
    { id: 'organize', name: 'Organize Pages', icon: Trash2 },
    { id: 'compress', name: 'Compress PDF', icon: FileDown },
    { id: 'cropresize', name: 'Crop & Resize', icon: Maximize2 },
    { id: 'pdftozip', name: 'PDF to ZIP', icon: FolderArchive }
  ]

  const handleToolSelect = (id) => {
    setActiveTool(id)
    setSidebarOpen(false)
  }

  const renderActiveTool = () => {
    if (loadingDeps) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 h-[60vh] gap-4">
          <div className="w-12 h-12 border-4 border-zinc-700 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-zinc-400 text-sm animate-pulse font-medium">Securing local client libraries...</p>
        </div>
      )
    }

    switch (activeTool) {
      case 'dashboard':
        return <Dashboard onSelectTool={handleToolSelect} />
      case 'merge':
        return <MergeTool />
      case 'split':
        return <SplitTool />
      case 'rotatepdf':
        return <RotateTool />
      case 'organize':
        return <OrganizeTool />
      case 'compress':
        return <CompressTool />
      case 'cropresize':
        return <CropResizeTool />
      case 'pdftozip':
        return <PdfToZipTool />
      default:
        return <Dashboard onSelectTool={handleToolSelect} />
    }
  }

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-zinc-900 border-r border-zinc-800 shrink-0">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-zinc-800 select-none">
          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">OpenPDF</span>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = activeTool === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleToolSelect(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors select-none text-left ${
                  active
                    ? 'bg-blue-600 text-white font-medium shadow-md shadow-blue-600/10'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-sm">{item.name}</span>
              </button>
            )
          })}
        </nav>
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 x-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Offline Sandbox
          </span>
          <span>v0.1.0</span>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
        ></div>
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-zinc-900 border-r border-zinc-800 z-40 transform transition-transform duration-200 md:hidden flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center gap-3 px-6 border-b border-zinc-800">
          <ShieldCheck className="w-5 h-5 text-blue-400" />
          <span className="text-lg font-bold tracking-tight text-white">OpenPDF</span>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = activeTool === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleToolSelect(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-left ${
                  active ? 'bg-blue-600 text-white font-medium' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-sm">{item.name}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 z-20 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-100 active:bg-zinc-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold tracking-tight text-white hidden md:block">
              {menuItems.find((m) => m.id === activeTool)?.name || 'Dashboard'}
            </h1>
            <span className="text-zinc-400 text-xs px-2 py-1 rounded bg-zinc-800 border border-zinc-700 font-medium md:hidden">
              {menuItems.find((m) => m.id === activeTool)?.name || 'Dashboard'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[11px] text-zinc-500 font-medium hidden sm:flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Secure local runtime (Files never leave device)
            </div>
          </div>
        </header>

        {/* Viewport content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-zinc-950">
          {renderActiveTool()}
        </main>
      </div>
    </div>
  )
}
