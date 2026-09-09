# OpenPDF 🔐

OpenPDF is a privacy-first, local-only Single Page Application (SPA) offering a comprehensive suite of PDF utilities directly inside the browser. By compiling robust processing engines like **Ghostscript to WebAssembly (WASM)**, OpenPDF operates 100% offline—ensuring your sensitive documents never upload to external servers or cloud targets.

---

## 🌟 The Core Philosophies
*   **Zero Servers / Zero Uploads:** All PDF parsing, compression, rendering, and stitching happen locally in browser RAM or WebWorker contexts.
*   **Zero Telemetry / Absolute Privacy:** No trackers, no cookies, no account setups, and no server logs.
*   **Zero Watermarks / Zero Fees:** Fully free open-source software, producing clean documents with zero branding restrictions.

---

## 🛠️ Features (Page Management Suite)

### 1. Merge PDFs
*   Combine multiple PDF files into a single document.
*   Drag-and-drop file reordering grid.
*   Runs locally using `pdf-lib`.

### 2. Split PDF
*   **Split All Pages:** Extracts every page as a standalone PDF and packs them into a single `.zip` file using `JSZip`.
*   **Custom Page Ranges:** Extracts custom ranges (e.g. `1-3, 5, 8-10`) and compiles them into a single merged PDF.

### 3. Rotate PDF Pages
*   Grid layout rendering page thumbnails using `pdf.js` canvas overlays.
*   Clockwise and counter-clockwise rotation (+90° / -90°) controls per page or globally.
*   Saves rotation metadata inside the document coordinates using `pdf-lib`.

### 4. Organize Pages
*   Interactive preview board to manipulate layouts.
*   Actions per page: Move Left, Move Right, Duplicate, and Delete.
*   Sequentially reconstructs and saves a new PDF with modified indices.

### 5. Compress PDF
*   **Ghostscript WebAssembly:** Runs the official Ghostscript C binary compiled to WASM in a background WebWorker thread.
*   **Presets:**
    *   *Light:* Stream cleanups and structural optimizations (vector safe, print quality).
    *   *Medium:* Downsamples images to 150 DPI with 60% JPEG quality.
    *   *Heavy:* Downsamples images to 72 DPI with 40% JPEG quality (smallest size).
*   **Size Safety Guard:** If compression results in a file larger than the original input (common for text-only vector PDFs), the tool automatically discards the bloated rasterized file and returns the optimized vector version.

### 6. Crop & Resize PDF
*   **Resize:** Standard size formatting conversion (A4, Letter, Legal, A3) using page bounding dimensions.
*   **Crop:** Modifies page `CropBox` coordinate bounds to trim margins.

### 7. PDF to ZIP Images
*   Renders each page of a PDF onto a canvas at customizable resolution scales (1.0x to 3.0x DPI).
*   Encodes pages as JPEG/PNG images, compiles them into a ZIP archive, and downloads the package.
*   Includes a progress indicator during rendering.

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
           ┌─────────────────┴─────────────────┐
           │                                   │
           ▼                                   ▼
┌─────────────────────┐             ┌─────────────────────┐
│  pdf-lib / pdf.js   │             │  Background Worker  │
│  (Main UI Thread)   │             │   (Multi-threaded)  │
└──────────┬──────────┘             └──────────┬──────────┘
           │                                   │
           │ (Merge, Split,                    │ (Ghostscript WASM
           │  Rotate, Crop)                    │  Compression)
           ▼                                   ▼
┌─────────────────────────────────────────────────────────┐
│              Trigger Local Blob Download                │
└─────────────────────────────────────────────────────────┘
```

### Dynamic Script Loading
To keep the initial bundle lightweight, dependencies like `pdf-lib`, `pdf.js`, and `JSZip` are loaded on-demand using a dynamic script injector loader script (`src/utils/loader.js`). These resources are cached locally by the Service Worker for offline use.

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
*   `/src/tools`: Individual utility components (e.g. `MergeTool.jsx`, `CompressTool.jsx`).
*   `/src/utils`: Loader helpers and dynamic script settings.
*   `/.gemini`: Dedicated workspace folder containing AI metadata, specifications, and project todo logs.

---

## ⚖️ Licensing
This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. This is required due to the inclusion of Ghostscript WebAssembly binaries which are distributed under AGPLv3. Any derivative work or hosting of this software must also make its source code open and available.
