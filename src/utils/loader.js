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
  html2pdf: "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
};

export const mo = {
  merge: ["pdflib", "downloadjs", "pdfjs"],
  split: ["pdflib", "downloadjs", "jszip"],
  rotatepdf: ["pdflib", "pdfjs", "downloadjs"],
  organize: ["pdflib", "pdfjs", "downloadjs"],
  compress: ["pdflib", "pdfjs", "downloadjs", "jspdf"],
  cropresize: ["pdflib", "pdfjs", "downloadjs"],
  pdftozip: ["pdfjs", "downloadjs", "jszip"]
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
};

// Helper to configure pdfjs worker if loaded
function setupPdfjsWorker() {
  if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
}
