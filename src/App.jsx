import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard,
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
  Menu,
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
  RefreshCw,
  Presentation,
  BookOpen,
  Palette,
  BookCopy,
  BoxSelect,
  FileCheck,
  Table,
  QrCode,
  Code2,
  Sigma,
  Eraser,
  Tag,
  Zap
} from 'lucide-react'

// Tools
import Dashboard from './tools/Dashboard.jsx'

// Developer, Data & Automation Tools (Category 8)
import PdfTableExtractorTool from './tools/PdfTableExtractorTool.jsx'
import BarcodeQrGeneratorTool from './tools/BarcodeQrGeneratorTool.jsx'
import PdfObjectInspectorTool from './tools/PdfObjectInspectorTool.jsx'
import LatexToPdfTool from './tools/LatexToPdfTool.jsx'
import WatermarkCleanerTool from './tools/WatermarkCleanerTool.jsx'
import BatchPdfRenamerTool from './tools/BatchPdfRenamerTool.jsx'
import PdfVectorOptimizerTool from './tools/PdfVectorOptimizerTool.jsx'

// Specialized Formats, Archival & Publishing Tools (Category 6)
import PptxToPdfTool from './tools/PptxToPdfTool.jsx'
import EpubToPdfTool from './tools/EpubToPdfTool.jsx'
import HtmlToPdfTool from './tools/HtmlToPdfTool.jsx'
import GrayscaleTool from './tools/GrayscaleTool.jsx'
import BookletTool from './tools/BookletTool.jsx'
import MarginAdjusterTool from './tools/MarginAdjusterTool.jsx'
import PdfAValidatorTool from './tools/PdfAValidatorTool.jsx'

// Advanced & Smart Utilities Tools (Category 5)
import OcrPdfTool from './tools/OcrPdfTool.jsx'
import RepairPdfTool from './tools/RepairPdfTool.jsx'
import NUpTool from './tools/NUpTool.jsx'
import PdfToAudioTool from './tools/PdfToAudioTool.jsx'
import AudioToPdfTool from './tools/AudioToPdfTool.jsx'
import ExtractImagesTool from './tools/ExtractImagesTool.jsx'
import P2PShareTool from './tools/P2PShareTool.jsx'

// Editing, Signing & Annotations Tools (Category 2)
import SignPdfTool from './tools/SignPdfTool.jsx'
import WatermarkTool from './tools/WatermarkTool.jsx'
import PageNumbersTool from './tools/PageNumbersTool.jsx'
import FillFormTool from './tools/FillFormTool.jsx'
import AnnotatePdfTool from './tools/AnnotatePdfTool.jsx'
import ComparePdfTool from './tools/ComparePdfTool.jsx'
import InvertColorsTool from './tools/InvertColorsTool.jsx'

// Security, Privacy & Compliance Tools (Category 3)
import PrivacyScannerTool from './tools/PrivacyScannerTool.jsx'
import RedactTool from './tools/RedactTool.jsx'
import EncryptPdfTool from './tools/EncryptPdfTool.jsx'
import UnlockPdfTool from './tools/UnlockPdfTool.jsx'
import MetadataEditorTool from './tools/MetadataEditorTool.jsx'
import FlattenPdfTool from './tools/FlattenPdfTool.jsx'
import FingerprintTool from './tools/FingerprintTool.jsx'

// Document Conversion Tools (Category 1)
import PdfToJpgTool from './tools/PdfToJpgTool.jsx'
import ImagesToPdfTool from './tools/ImagesToPdfTool.jsx'
import WordToPdfTool from './tools/WordToPdfTool.jsx'
import PdfToWordTool from './tools/PdfToWordTool.jsx'
import ExcelToPdfTool from './tools/ExcelToPdfTool.jsx'
import MarkdownToPdfTool from './tools/MarkdownToPdfTool.jsx'
import ExtractTextTool from './tools/ExtractTextTool.jsx'

// Page Management Tools (Category 4)
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

  const developerMenuItems = [
    { id: 'tableextractor', name: 'PDF Tables to Excel', icon: Table },
    { id: 'barcodegenerator', name: 'Batch QR & Barcodes', icon: QrCode },
    { id: 'objectinspector', name: 'PDF Object AST', icon: Code2 },
    { id: 'latextopdf', name: 'LaTeX & Math to PDF', icon: Sigma },
    { id: 'watermarkcleaner', name: 'Watermark Cleaner', icon: Eraser },
    { id: 'batchrenamer', name: 'Smart Batch Renamer', icon: Tag },
    { id: 'vectoroptimizer', name: 'Vector Optimizer', icon: Zap }
  ]

  const specializedMenuItems = [
    { id: 'pptxtopdf', name: 'PowerPoint to PDF', icon: Presentation },
    { id: 'epubtopdf', name: 'eBook to PDF', icon: BookOpen },
    { id: 'htmltopdf', name: 'HTML & Code to PDF', icon: FileCode },
    { id: 'grayscale', name: 'PDF to Grayscale', icon: Palette },
    { id: 'booklet', name: 'Booklet Imposition', icon: BookCopy },
    { id: 'margins', name: 'Margin & Binder', icon: BoxSelect },
    { id: 'pdfavalidator', name: 'PDF/A Validator', icon: FileCheck }
  ]

  const smartMenuItems = [
    { id: 'ocrpdf', name: 'OCR PDF', icon: ScanText },
    { id: 'repairpdf', name: 'Repair & Recover', icon: Wrench },
    { id: 'nup', name: 'N-up Handouts', icon: LayoutGrid },
    { id: 'pdftoaudio', name: 'PDF to Audio', icon: Headphones },
    { id: 'audiotopdf', name: 'Speech to PDF', icon: Mic },
    { id: 'extractimages', name: 'Extract Images', icon: ImageDown },
    { id: 'p2pshare', name: 'P2P Direct Share', icon: Radio }
  ]

  const editingMenuItems = [
    { id: 'signpdf', name: 'Sign PDF', icon: PenTool },
    { id: 'watermark', name: 'Add Watermark', icon: Stamp },
    { id: 'pagenumbers', name: 'Page Numbers & Bates', icon: Binary },
    { id: 'fillform', name: 'Fill PDF Forms', icon: FormInput },
    { id: 'annotatepdf', name: 'Annotate & Markup', icon: Highlighter },
    { id: 'comparepdf', name: 'Compare PDFs', icon: GitCompare },
    { id: 'invertcolors', name: 'Invert & Dark Mode', icon: Moon }
  ]

  const securityMenuItems = [
    { id: 'privacyscanner', name: 'Privacy & PII Scanner', icon: ShieldAlert },
    { id: 'redact', name: 'Redact & Blackout', icon: EyeOff },
    { id: 'encryptpdf', name: 'Protect & Encrypt', icon: Lock },
    { id: 'unlockpdf', name: 'Unlock & Decrypt', icon: Unlock },
    { id: 'metadata', name: 'Metadata Sanitizer', icon: FileSearch },
    { id: 'flatten', name: 'Flatten Document', icon: Layers },
    { id: 'fingerprint', name: 'Watermark & Fingerprint', icon: Fingerprint }
  ]

  const conversionMenuItems = [
    { id: 'pdftojpg', name: 'PDF to JPG / PNG', icon: Image },
    { id: 'imagestopdf', name: 'Images to PDF', icon: FileImage },
    { id: 'wordtopdf', name: 'Word to PDF', icon: FileText },
    { id: 'pdftoword', name: 'PDF to Word', icon: FileText },
    { id: 'exceltopdf', name: 'Excel to PDF', icon: FileSpreadsheet },
    { id: 'markdowntopdf', name: 'Markdown to PDF', icon: FileCode },
    { id: 'extracttext', name: 'Extract Text', icon: Layers }
  ]

  const pageManagementMenuItems = [
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
          <div className="w-12 h-12 border-4 border-zinc-700 border-t-violet-500 rounded-full animate-spin"></div>
          <p className="text-zinc-400 text-sm animate-pulse font-medium">Securing local client libraries...</p>
        </div>
      )
    }

    switch (activeTool) {
      case 'dashboard':
        return <Dashboard onSelectTool={handleToolSelect} />

      // Developer, Data & Automation Suite (Category 8)
      case 'tableextractor':
        return <PdfTableExtractorTool />
      case 'barcodegenerator':
        return <BarcodeQrGeneratorTool />
      case 'objectinspector':
        return <PdfObjectInspectorTool />
      case 'latextopdf':
        return <LatexToPdfTool />
      case 'watermarkcleaner':
        return <WatermarkCleanerTool />
      case 'batchrenamer':
        return <BatchPdfRenamerTool />
      case 'vectoroptimizer':
        return <PdfVectorOptimizerTool />

      // Specialized Formats, Archival & Publishing Suite
      case 'pptxtopdf':
        return <PptxToPdfTool />
      case 'epubtopdf':
        return <EpubToPdfTool />
      case 'htmltopdf':
        return <HtmlToPdfTool />
      case 'grayscale':
        return <GrayscaleTool />
      case 'booklet':
        return <BookletTool />
      case 'margins':
        return <MarginAdjusterTool />
      case 'pdfavalidator':
        return <PdfAValidatorTool />

      // Advanced & Smart Utilities Suite
      case 'ocrpdf':
        return <OcrPdfTool />
      case 'repairpdf':
        return <RepairPdfTool />
      case 'nup':
        return <NUpTool />
      case 'pdftoaudio':
        return <PdfToAudioTool />
      case 'audiotopdf':
        return <AudioToPdfTool />
      case 'extractimages':
        return <ExtractImagesTool />
      case 'p2pshare':
        return <P2PShareTool />

      // Editing, Signing & Annotations Suite
      case 'signpdf':
        return <SignPdfTool />
      case 'watermark':
        return <WatermarkTool />
      case 'pagenumbers':
        return <PageNumbersTool />
      case 'fillform':
        return <FillFormTool />
      case 'annotatepdf':
        return <AnnotatePdfTool />
      case 'comparepdf':
        return <ComparePdfTool />
      case 'invertcolors':
        return <InvertColorsTool />

      // Security, Privacy & Compliance Suite
      case 'privacyscanner':
        return <PrivacyScannerTool />
      case 'redact':
        return <RedactTool />
      case 'encryptpdf':
        return <EncryptPdfTool />
      case 'unlockpdf':
        return <UnlockPdfTool />
      case 'metadata':
        return <MetadataEditorTool />
      case 'flatten':
        return <FlattenPdfTool />
      case 'fingerprint':
        return <FingerprintTool />

      // Document Conversion Suite
      case 'pdftojpg':
        return <PdfToJpgTool />
      case 'imagestopdf':
        return <ImagesToPdfTool />
      case 'wordtopdf':
        return <WordToPdfTool />
      case 'pdftoword':
        return <PdfToWordTool />
      case 'exceltopdf':
        return <ExcelToPdfTool />
      case 'markdowntopdf':
        return <MarkdownToPdfTool />
      case 'extracttext':
        return <ExtractTextTool />

      // Page Management Suite
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

  const allItems = [
    { id: 'dashboard', name: 'Dashboard' },
    ...developerMenuItems,
    ...specializedMenuItems,
    ...smartMenuItems,
    ...editingMenuItems,
    ...securityMenuItems,
    ...conversionMenuItems,
    ...pageManagementMenuItems
  ]

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-zinc-900 border-r border-zinc-800 shrink-0">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-zinc-800 select-none">
          <div className="w-8 h-8 bg-violet-500/10 rounded-lg flex items-center justify-center border border-violet-500/20">
            <ShieldCheck className="w-5 h-5 text-violet-400" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">OpenPDF</span>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
          {/* Main */}
          <button
            onClick={() => handleToolSelect('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg transition-colors select-none text-left ${
              activeTool === 'dashboard'
                ? 'bg-violet-600 text-white font-bold shadow-md shadow-violet-600/10'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold">Dashboard</span>
          </button>

          {/* Smart & Advanced Suite Group */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-violet-400/80 mb-1.5 flex items-center justify-between">
              <span>Smart & Utilities</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-violet-500/10 rounded text-violet-400">7</span>
            </div>
            {smartMenuItems.map((item) => {
              const Icon = item.icon
              const active = activeTool === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleToolSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg transition-colors select-none text-left ${
                    active
                      ? 'bg-violet-600 text-white font-bold shadow-md shadow-violet-600/10'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              )
            })}
          </div>

          {/* Editing & Annotations Group */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-amber-400/80 mb-1.5 flex items-center justify-between">
              <span>Editing & Signing</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/10 rounded text-amber-400">7</span>
            </div>
            {editingMenuItems.map((item) => {
              const Icon = item.icon
              const active = activeTool === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleToolSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg transition-colors select-none text-left ${
                    active
                      ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/10'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              )
            })}
          </div>

          {/* Security Suite Group */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 mb-1.5 flex items-center justify-between">
              <span>Security & Privacy</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/10 rounded text-emerald-400">7</span>
            </div>
            {securityMenuItems.map((item) => {
              const Icon = item.icon
              const active = activeTool === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleToolSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg transition-colors select-none text-left ${
                    active
                      ? 'bg-emerald-600 text-white font-medium shadow-md shadow-emerald-600/10'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              )
            })}
          </div>

          {/* Conversion Suite Group */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-blue-400/80 mb-1.5 flex items-center justify-between">
              <span>Conversion Suite</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-blue-500/10 rounded text-blue-400">7</span>
            </div>
            {conversionMenuItems.map((item) => {
              const Icon = item.icon
              const active = activeTool === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleToolSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg transition-colors select-none text-left ${
                    active
                      ? 'bg-blue-600 text-white font-medium shadow-md shadow-blue-600/10'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              )
            })}
          </div>

          {/* Developer & Automation Group */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-pink-400/80 mb-1.5 flex items-center justify-between">
              <span>Developer & Data</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-pink-500/10 rounded text-pink-400">7</span>
            </div>
            {developerMenuItems.map((item) => {
              const Icon = item.icon
              const active = activeTool === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleToolSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg transition-colors select-none text-left ${
                    active
                      ? 'bg-pink-600 text-white font-bold shadow-md shadow-pink-600/10'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              )
            })}
          </div>

          {/* Specialized Formats, Archival & Publishing Suite Group */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-teal-400/80 mb-1.5 flex items-center justify-between">
              <span>Archival & Publishing</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-teal-500/10 rounded text-teal-400">7</span>
            </div>
            {specializedMenuItems.map((item) => {
              const Icon = item.icon
              const active = activeTool === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleToolSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg transition-colors select-none text-left ${
                    active
                      ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-600/10'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              )
            })}
          </div>

          {/* Page Management Group */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-purple-400/80 mb-1.5 flex items-center justify-between">
              <span>Page Management</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-purple-500/10 rounded text-purple-400">7</span>
            </div>
            {pageManagementMenuItems.map((item) => {
              const Icon = item.icon
              const active = activeTool === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleToolSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg transition-colors select-none text-left ${
                    active
                      ? 'bg-purple-600 text-white font-medium shadow-md shadow-purple-600/10'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              )
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            100% Client-Side
          </span>
          <span className="font-mono text-[11px] text-pink-400">49 Tools Active</span>
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
          <ShieldCheck className="w-5 h-5 text-violet-400" />
          <span className="text-lg font-bold tracking-tight text-white">OpenPDF</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
          <button
            onClick={() => handleToolSelect('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg transition-colors text-left ${
              activeTool === 'dashboard' ? 'bg-violet-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold">Dashboard</span>
          </button>

          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-pink-400/80 mb-1">
              Developer & Data (7)
            </div>
            {developerMenuItems.map((item) => {
              const Icon = item.icon
              const active = activeTool === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleToolSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg transition-colors text-left ${
                    active ? 'bg-pink-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              )
            })}
          </div>

          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-teal-400/80 mb-1">
              Archival & Publishing (7)
            </div>
            {specializedMenuItems.map((item) => {
              const Icon = item.icon
              const active = activeTool === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleToolSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg transition-colors text-left ${
                    active ? 'bg-teal-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              )
            })}
          </div>

          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-violet-400/80 mb-1">
              Smart & Utilities (7)
            </div>
            {smartMenuItems.map((item) => {
              const Icon = item.icon
              const active = activeTool === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleToolSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg transition-colors text-left ${
                    active ? 'bg-violet-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              )
            })}
          </div>

          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-amber-400/80 mb-1">
              Editing & Signing (7)
            </div>
            {editingMenuItems.map((item) => {
              const Icon = item.icon
              const active = activeTool === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleToolSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg transition-colors text-left ${
                    active ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              )
            })}
          </div>

          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 mb-1">
              Security & Privacy (7)
            </div>
            {securityMenuItems.map((item) => {
              const Icon = item.icon
              const active = activeTool === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleToolSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg transition-colors text-left ${
                    active ? 'bg-emerald-600 text-white font-medium' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              )
            })}
          </div>

          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-blue-400/80 mb-1">
              Conversion Suite (7)
            </div>
            {conversionMenuItems.map((item) => {
              const Icon = item.icon
              const active = activeTool === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleToolSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg transition-colors text-left ${
                    active ? 'bg-blue-600 text-white font-medium' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              )
            })}
          </div>

          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-purple-400/80 mb-1">
              Page Management (7)
            </div>
            {pageManagementMenuItems.map((item) => {
              const Icon = item.icon
              const active = activeTool === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleToolSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg transition-colors text-left ${
                    active ? 'bg-purple-600 text-white font-medium' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              )
            })}
          </div>
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
              {allItems.find((m) => m.id === activeTool)?.name || 'Dashboard'}
            </h1>
            <span className="text-zinc-400 text-xs px-2 py-1 rounded bg-zinc-800 border border-zinc-700 font-medium md:hidden">
              {allItems.find((m) => m.id === activeTool)?.name || 'Dashboard'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[11px] text-zinc-400 font-medium hidden sm:flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Secure local runtime (Zero server uploads)
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
