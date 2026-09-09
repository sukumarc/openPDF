# OpenPDF 🔐

OpenPDF is a comprehensive, privacy-first, 100% client-side PDF utility suite running entirely inside your web browser. Using WebAssembly (WASM), Web Workers, and modern browser cryptography, OpenPDF provides **28 essential tools** across Editing & Signing, Security & Privacy, Document Conversion, and Page Management—completely offline with zero server uploads.

---

## 🌟 The Core Philosophies
*   **100% Client-Side Privacy:** All PDF parsing, signing, markup, encryption, redaction, compression, conversion, and rendering execute locally in browser memory. Files never touch external servers.
*   **Zero Telemetry & Tracking:** No tracking scripts, no third-party cookies, no sign-ups, and no server logs.
*   **Zero Watermarks & Restrictions:** Clean documents without watermarks, artificial page limits, or paywalls.
*   **WebAssembly & Web Workers:** Hardware-accelerated processing with background worker threads for smooth UI performance.

---

## 🛠️ Complete Tool Suite (28 Tools)

### ✍️ Editing, Signing & Annotations Suite (7 Tools)
1.  **Sign PDF:** Draw, type cursive, or upload transparent digital signatures with visual drag-and-drop placement, scaling, and multi-page stamping.
2.  **Add Watermark:** Apply custom text or logo watermarks with transparency, rotation (-90° to 90°), and tiled repeating grids.
3.  **Page Numbers & Bates Stamping:** Add headers, footers, customizable pagination ("Page X of Y"), and legal Bates numbering (`DOC-000001`).
4.  **Fill PDF Forms (AcroForms):** Fill out interactive form text fields, checkboxes, dropdowns, and radio buttons client-side with optional flattening.
5.  **Annotate & Markup PDF:** Draw freehand markings, highlight text, add callout notes, rectangles, circles, lines, and arrows directly on pages.
6.  **Compare Two PDFs:** Side-by-side synchronized comparison and pixel-level visual difference highlighting between documents.
7.  **Invert Colors & Dark Mode:** Convert PDFs to high-contrast Dark Mode (White-on-Black), Slate, or Warm Sepia for easy reading.

### 🛡️ Security, Privacy & Compliance Suite (7 Tools)
1.  **Privacy & PII Scanner:** Client-side privacy audit tool detecting sensitive PII (Aadhaar, PAN, SSN, Credit Cards, Emails, Phone Numbers) with risk scoring and instant redaction recommendations.
2.  **Redact & Blackout PDF:** Interactive canvas-based visual redaction to permanently scrub and sanitize sensitive text, numbers, and graphic regions.
3.  **Protect & Encrypt PDF:** Standard 128-bit encryption with open password protection, strength meter, and granular permission controls (print, copy, modify, form fill).
4.  **Unlock & Decrypt PDF:** In-memory password verification and restriction stripper to produce clean, unrestricted PDF documents.
5.  **Metadata Editor & Sanitizer:** Inspect, edit, or wipe author, creator, producer, and application fingerprints from document headers.
6.  **Flatten PDF Document:** Bake interactive AcroForms, form widgets, and annotations into static, non-editable vector graphics.
7.  **Watermark & Fingerprint:** Apply visible audit stamps, custom angle watermarks, and unique document tracking IDs to prevent unauthorized leaks.

### 📁 Document Conversion Suite (7 Tools)
1.  **PDF to JPG / PNG:** Export crystal-clear images per page or as a ZIP archive at custom DPIs (150 Web, 300 Print, 600 Archival).
2.  **Images to PDF:** Convert multiple JPG, PNG, and WebP images into a customized PDF with page size, orientation, and margin controls.
3.  **Word (.docx) to PDF:** Render and convert Microsoft Word documents (.docx) directly into standard PDF documents in-browser.
4.  **PDF to Word (.docx):** Extract text hierarchies, lines, and paragraphs into editable Microsoft Word (.docx) documents.
5.  **Excel & CSV to PDF:** Parse spreadsheets (.xlsx, .xls, .csv) with multi-sheet support into styled PDF table reports.
6.  **Markdown (.md) to PDF:** Split-pane Markdown editor with live preview and instant PDF compilation.
7.  **Extract Text:** Extract pure text content across all document pages with word statistics, character counts, and `.txt` file export.

### 📄 Page Management Suite (7 Tools)
1.  **Merge PDFs:** Combine multiple PDF documents into a single consolidated file in your preferred order.
2.  **Split PDF:** Extract specific page ranges or split every page into separate individual PDF files in a ZIP.
3.  **Rotate PDF Pages:** Turn sideways pages clockwise or counter-clockwise visually with instant coordinate transformation.
4.  **Organize Pages:** Reorder, duplicate, move, or delete document pages with real-time thumbnail drag layouts.
5.  **Compress PDF:** Official Ghostscript WebAssembly multi-level downsampling (Light, Medium, Heavy) with live progress bar and automatic bloat-rollback guards.
6.  **Crop & Resize PDF:** Standard size formatting conversion (A4, Letter, Legal, A3) and margin trimming via page `CropBox`.
7.  **PDF to ZIP Images:** Render pages into individual images (JPEG/PNG) and pack them into a downloadable ZIP archive.

---

## 🏗️ Architecture & Data Flow

```
                  ┌──────────────────────┐
                  │   User Uploads File  │
                  └──────────┬───────────┘
                             ▼
                  ┌──────────────────────┐
                  │ Read as ArrayBuffer  │
                  └──────────┬───────────┘
                             ▼
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
 ┌─────────────────────┐ ┌────────────────┐ ┌─────────────────────┐
 │  pdf-lib / pdf.js   │ │ Web Crypto/RC4 │ │  Background Worker  │
 │  (Main UI Thread)   │ │  (Encryption)  │ │   (Multi-threaded)  │
 └──────────┬──────────┘ └───────┬────────┘ └──────────┬──────────┘
            │                    │                     │
            │ (Merge, Split,     │ (Password Protect,  │ (Ghostscript WASM
            │  Sign, Annotate,   │  Permissions, Hash) │  Compression)
            │  Convert, Redact)  │                     │
            ▼                    ▼                     ▼
 ┌───────────────────────────────────────────────────────────────┐
 │                  Trigger Local Blob Download                  │
 └───────────────────────────────────────────────────────────────┘
```

### Dynamic Script Loading
To keep the initial bundle lightweight, heavy dependencies (such as `pdf.js`, `xlsx`, `docx`, and `JSZip`) are loaded on-demand using a dynamic script injector loader script (`src/utils/loader.js`).

---

## 🚀 Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org/) (v16.0.0 or higher)
*   npm (v7.0.0 or higher)

### Setup & Run
1.  Clone the repository:
    ```bash
    git clone https://github.com/sukumarc/openPDF.git
    cd openPDF
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open your browser and navigate to `http://localhost:5173`.

---

## 📂 Directory Map
*   `/public`: Static assets, worker scripts, and WASM binaries:
    *   `background-worker.js`: Instantiates the WASM filesystem and intercepts logs.
    *   `gs-worker.js` / `gs.wasm`: Open-source Emscripten compiler ports of Ghostscript.
*   `/src/tools`: Individual utility components (e.g. `SignPdfTool.jsx`, `WatermarkTool.jsx`, `EncryptPdfTool.jsx`, `CompressTool.jsx`).
*   `/src/utils`: Dynamic script loaders and CDN injectors (`loader.js`).

---

## ⚖️ Licensing
This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. This is required due to the inclusion of Ghostscript WebAssembly binaries which are distributed under AGPLv3. Any derivative work or hosting of this software must also make its source code open and available.
