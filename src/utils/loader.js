// Dynamic script loading manager for client-side libraries.

export const Y = {
  pdflib: "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js",
  downloadjs: "https://cdn.jsdelivr.net/npm/downloadjs@1.4.7/download.min.js",
  pdfjs: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  marked: "https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js",
  jspdf: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  html2canvas: "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  jszip: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
  mammoth: "https://cdn.jsdelivr.net/npm/mammoth@1.7.2/mammoth.browser.min.js",
  pdfmake: "https://cdn.jsdelivr.net/npm/pdfmake@0.2.9/build/pdfmake.min.js",
  pdfmakefonts: "https://cdn.jsdelivr.net/npm/pdfmake@0.2.9/build/vfs_fonts.js",
  docxpreview: "https://cdn.jsdelivr.net/npm/docx-preview@0.3.5/dist/docx-preview.min.js",
  html2pdf: "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js",
  xlsx: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
  docx: "https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js",
  dompurify: "https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js",
  tesseract: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
  qrcode: "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js",
  jsbarcode: "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js",
  katex: "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"
};

export const mo = {
  // Page Management Suite
  merge: ["pdflib", "downloadjs", "pdfjs"],
  split: ["pdflib", "downloadjs", "jszip"],
  rotatepdf: ["pdflib", "pdfjs", "downloadjs"],
  organize: ["pdflib", "pdfjs", "downloadjs"],
  compress: ["pdflib", "pdfjs", "downloadjs", "jspdf"],
  cropresize: ["pdflib", "pdfjs", "downloadjs"],
  pdftozip: ["pdfjs", "downloadjs", "jszip"],

  // Document Conversion Suite
  pdftojpg: ["pdfjs", "downloadjs", "jszip"],
  imagestopdf: ["pdflib", "downloadjs"],
  wordtopdf: ["mammoth", "docxpreview", "jspdf", "html2canvas", "downloadjs"],
  pdftoword: ["pdfjs", "docx", "downloadjs"],
  exceltopdf: ["xlsx", "jspdf", "downloadjs"],
  markdowntopdf: ["marked", "jspdf", "html2canvas", "dompurify", "downloadjs"],
  extracttext: ["pdfjs", "downloadjs"],

  // Security, Privacy & Compliance Suite
  encryptpdf: ["pdflib", "downloadjs"],
  unlockpdf: ["pdfjs", "pdflib", "downloadjs"],
  redact: ["pdfjs", "pdflib", "downloadjs"],
  flatten: ["pdflib", "downloadjs"],
  privacyscanner: ["pdfjs", "pdflib", "downloadjs"],
  metadata: ["pdflib", "downloadjs"],
  fingerprint: ["pdfjs", "pdflib", "downloadjs"],

  // Editing, Signing & Annotations Suite
  signpdf: ["pdflib", "pdfjs", "downloadjs"],
  watermark: ["pdflib", "pdfjs", "downloadjs"],
  pagenumbers: ["pdflib", "pdfjs", "downloadjs"],
  fillform: ["pdflib", "pdfjs", "downloadjs"],
  annotatepdf: ["pdflib", "pdfjs", "downloadjs"],
  comparepdf: ["pdfjs", "downloadjs"],
  invertcolors: ["pdfjs", "pdflib", "downloadjs"],

  // Advanced & Smart Utilities Suite
  ocrpdf: ["pdfjs", "pdflib", "tesseract", "downloadjs"],
  repairpdf: ["pdflib", "pdfjs", "downloadjs"],
  nup: ["pdflib", "pdfjs", "downloadjs"],
  pdftoaudio: ["pdfjs", "downloadjs"],
  audiotopdf: ["pdflib", "downloadjs"],
  extractimages: ["pdfjs", "jszip", "downloadjs"],
  p2pshare: ["downloadjs"],

  // Specialized Formats, Archival & Publishing Suite
  pptxtopdf: ["jszip", "pdflib", "downloadjs"],
  epubtopdf: ["jszip", "jspdf", "dompurify", "downloadjs"],
  htmltopdf: ["html2canvas", "jspdf", "dompurify", "downloadjs"],
  grayscale: ["pdfjs", "pdflib", "downloadjs"],
  booklet: ["pdflib", "pdfjs", "downloadjs"],
  margins: ["pdflib", "pdfjs", "downloadjs"],
  pdfavalidator: ["pdflib", "pdfjs", "downloadjs"],

  // Developer, Data & Automation Suite (Category 8)
  tableextractor: ["pdfjs", "xlsx", "downloadjs"],
  barcodegenerator: ["pdflib", "qrcode", "jsbarcode", "downloadjs"],
  objectinspector: ["pdfjs", "pdflib", "downloadjs"],
  latextopdf: ["katex", "jspdf", "html2canvas", "dompurify", "downloadjs"],
  watermarkcleaner: ["pdfjs", "pdflib", "downloadjs"],
  batchrenamer: ["pdfjs", "jszip", "downloadjs"],
  vectoroptimizer: ["pdflib", "downloadjs"]
};

// Promise-based script loading helper
export const K = (src) => {
  return new Promise((resolve, reject) => {
    // If the script is already present in document, resolve immediately
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// Batch script loader for specific tools
export const J = async (toolId) => {
  const deps = mo[toolId] || [];
  if (deps.length === 0) return;

  // Filter dependencies that haven't been loaded yet
  const unloaded = deps.filter(
    (dep) => !document.querySelector(`script[src="${Y[dep]}"]`)
  );

  if (unloaded.length === 0) {
    setupPdfjsWorker();
    return;
  }

  // Load all pending scripts in parallel
  await Promise.all(unloaded.map((dep) => K(Y[dep])));
  setupPdfjsWorker();
  setupExternalStyles(toolId);
};

// Helper to configure pdfjs worker if loaded
function setupPdfjsWorker() {
  if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
}

// Helper to load external CSS stylesheets
function setupExternalStyles(toolId) {
  if (toolId === 'latextopdf') {
    const cssHref = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
    if (!document.querySelector(`link[href="${cssHref}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = cssHref;
      document.head.appendChild(link);
    }
  }
}
