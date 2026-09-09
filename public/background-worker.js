// WebWorker to orchestrate Ghostscript WASM execution

importScripts("./gs-worker.js");
const initGhostscript = Module;

// Clean up global Module to prevent conflict with Emscripten internals
try {
  delete globalThis.Module;
} catch (e) {}

function buildGhostscriptArgs(config) {
  const {
    quality = '/ebook',
    contentType = 'auto',
    colorImageResolution = 150,
    grayImageResolution = 150,
    monoImageResolution = 300,
    imageCompression = 'JPEG',
    downsampling = 'Bicubic',
    embedFonts = true,
    jpegQuality = 60,
    optimizeFonts = true
  } = config;

  console.log("📋 Ghostscript Config Received:", {
    quality,
    contentType,
    colorImageResolution,
    grayImageResolution,
    monoImageResolution,
    jpegQuality,
    downsampling
  });

  if (contentType === 'images') {
    const effectiveColorRes = Math.min(colorImageResolution, 120);
    const effectiveGrayRes = Math.min(grayImageResolution, 120);
    const effectiveJpegQuality = Math.max(30, Math.min(jpegQuality, 95));

    console.log("🎨 Using IMAGE-HEAVY compression mode");

    return [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.5",
      "-dSAFER",
      `-dPDFSETTINGS=${quality}`,
      "-dNOPAUSE",
      "-dBATCH",
      `-dColorImageResolution=${effectiveColorRes}`,
      `-dGrayImageResolution=${effectiveGrayRes}`,
      `-dMonoImageResolution=${monoImageResolution}`,
      "-dDownsampleColorImages=true",
      "-dDownsampleGrayImages=true",
      "-dDownsampleMonoImages=true",
      "-dColorImageDownsampleType=/Bicubic",
      "-dGrayImageDownsampleType=/Bicubic",
      "-dMonoImageDownsampleType=/Bicubic",
      "-dColorImageDownsampleThreshold=1.0",
      "-dGrayImageDownsampleThreshold=1.0",
      "-dMonoImageDownsampleThreshold=1.0",
      "-dColorImageFilter=/DCTEncode",
      "-dGrayImageFilter=/DCTEncode",
      "-dMonoImageFilter=/CCITTFaxEncode",
      "-dAutoFilterColorImages=false",
      "-dAutoFilterGrayImages=false",
      "-dEncodeColorImages=true",
      "-dEncodeGrayImages=true",
      "-dEncodeMonoImages=true",
      `-dJPEGQ=${effectiveJpegQuality}`,
      "-dPreserveHalftoneInfo=false",
      "-dPreserveOPIComments=false",
      "-dPreserveOverprintSettings=false",
      "-dPreserveCopyPage=false",
      "-dPreserveSeparation=false",
      "-dPreserveDeviceN=false",
      "-dEmbedAllFonts=false",
      "-dSubsetFonts=false",
      "-dCompressFonts=false",
      "-dCompressPages=true",
      "-dUseFlateCompression=true",
      "-dASCIIHexEncodePages=false",
      "-dDetectDuplicateImages=true",
      "-dDoThumbnails=false",
      "-dOptimize=true",
      "-dFastWebView=false",
      "-dPrinted=false",
      "-sOutputFile=output.pdf",
      "input.pdf"
    ];
  }

  const args = [
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.5",
    "-dSAFER",
    `-dPDFSETTINGS=${quality}`,
    "-dNOPAUSE",
    "-dBATCH",
    "-dFastWebView=true",
    "-dPrinted=false",
    "-dUseFlateCompression=true",
    `-dColorImageResolution=${colorImageResolution}`,
    `-dGrayImageResolution=${grayImageResolution}`,
    `-dMonoImageResolution=${monoImageResolution}`,
    "-dDownsampleColorImages=true",
    "-dDownsampleGrayImages=true",
    "-dDownsampleMonoImages=true",
    `-dColorImageDownsampleType=/${downsampling}`,
    `-dGrayImageDownsampleType=/${downsampling}`,
    `-dMonoImageDownsampleType=/${downsampling}`,
    "-dColorImageDownsampleThreshold=1.0",
    "-dGrayImageDownsampleThreshold=1.0",
    "-dMonoImageDownsampleThreshold=1.0",
    "-dAutoFilterColorImages=false",
    "-dAutoFilterGrayImages=false",
    "-dEncodeColorImages=true",
    "-dEncodeGrayImages=true",
    "-dEncodeMonoImages=true",
    "-dDetectDuplicateImages=true",
    "-dCompressFonts=true",
    "-dOptimize=true",
    "-dDoThumbnails=false"
  ];

  switch(contentType) {
    case 'text':
      args.push(
        "-dSubsetFonts=true",
        "-dEmbedAllFonts=true",
        "-dCompressPages=true",
        "-dASCIIHexEncodePages=false",
        "-dPreserveHalftoneInfo=false",
        `-dMonoImageResolution=${Math.max(monoImageResolution, 600)}`,
        "-dColorImageFilter=/DCTEncode",
        "-dGrayImageFilter=/DCTEncode",
        "-dMonoImageFilter=/CCITTFaxEncode"
      );
      break;
      
    case 'scanned':
      args.push(
        "-dColorImageFilter=/FlateEncode",
        "-dGrayImageFilter=/FlateEncode",
        "-dMonoImageFilter=/CCITTFaxEncode",
        "-dEncodeColorImages=true",
        "-dEncodeGrayImages=true",
        "-dEncodeMonoImages=true",
        "-dCompressPages=true",
        "-dASCIIHexEncodePages=false"
      );
      break;
      
    case 'mixed':
      args.push(
        "-dColorImageFilter=/DCTEncode",
        "-dGrayImageFilter=/DCTEncode",
        "-dMonoImageFilter=/CCITTFaxEncode",
        "-dEncodeColorImages=true",
        "-dEncodeGrayImages=true",
        `-dJPEGQ=${jpegQuality}`,
        "-dSubsetFonts=true",
        "-dEmbedAllFonts=true"
      );
      break;
      
    default:
      args.push(
        "-dColorImageFilter=/DCTEncode",
        "-dGrayImageFilter=/DCTEncode",
        "-dMonoImageFilter=/CCITTFaxEncode",
        "-dAutoFilterColorImages=false",
        "-dAutoFilterGrayImages=false",
        "-dEncodeColorImages=true",
        "-dEncodeGrayImages=true",
        "-dEncodeMonoImages=true",
        `-dJPEGQ=${jpegQuality}`,
        "-dSubsetFonts=true",
        "-dCompressPages=true"
      );
  }

  if (optimizeFonts && contentType !== 'images') {
    args.push(
      "-dSubsetFonts=true",
      "-dCompressFonts=true"
    );
  }

  if (embedFonts && contentType !== 'images') {
    args.push("-dEmbedAllFonts=true");
  } else if (contentType !== 'images') {
    args.push("-dEmbedAllFonts=false");
  }

  args.push(
    "-sOutputFile=output.pdf",
    "input.pdf"
  );

  return args;
}

function _GSPS2PDF(dataStruct, responseCallback) {
  console.log('Starting PDF compression with config:', dataStruct);
  
  var xhr = new XMLHttpRequest();
  xhr.open("GET", dataStruct.psDataURL);
  xhr.responseType = "arraybuffer";
  
  xhr.onload = function () {
    console.log('PDF loaded, size:', xhr.response.byteLength);
    
    self.URL.revokeObjectURL(dataStruct.psDataURL);
    
    const gsArgs = buildGhostscriptArgs(dataStruct.config || {});
    console.log('Ghostscript arguments:', gsArgs);

    // Declare configuration object locally. Emscripten will mutate this
    // by attaching FS and other runtime functions before calling preRun.
    const myModule = {
      preRun: [
        function () {
          myModule.FS.writeFile("input.pdf", new Uint8Array(xhr.response));
          console.log('Input file written to virtual FS');
        },
      ],
      postRun: [], // Keep postRun empty to prevent early reads at initialization
      arguments: gsArgs,
      print: function (text) {
        try {
          var totalMatch = /Processing pages \d+ through (\d+)/.exec(text);
          if (totalMatch) self._gsTotalPages = parseInt(totalMatch[1], 10);
          var pageMatch = /^Page (\d+)/.exec(text);
          if (pageMatch) {
            self.postMessage({
              type: 'progress',
              page: parseInt(pageMatch[1], 10),
              total: self._gsTotalPages || 0,
            });
          }
        } catch (e) {}
        console.log('Ghostscript:', text);
      },
      printErr: function (text) {
        console.error('Ghostscript Error:', text);
      },
      totalDependencies: 0,
      noExitRuntime: 0
    };

    initGhostscript(myModule).then(() => {
      console.log('Ghostscript WASM loaded, executing callMain...');
      
      // Execute Ghostscript command synchronously
      myModule.callMain(gsArgs);
      
      console.log('Ghostscript execution completed, reading output...');
      
      try {
        var uarray = myModule.FS.readFile("output.pdf", { encoding: "binary" });
        const originalSize = xhr.response.byteLength;
        const compressedSize = uarray.length;

        console.log(`📊 Compression: ${(originalSize/1024/1024).toFixed(2)}MB → ${(compressedSize/1024/1024).toFixed(2)}MB`);

        let finalData;
        let wasFallback = false;

        if (compressedSize >= originalSize) {
          console.warn('⚠️ GS output is larger than input — returning original file');
          finalData = new Uint8Array(xhr.response);
          wasFallback = true;
        } else {
          finalData = uarray;
        }

        const finalSize = finalData.length;
        const compressionRatio = ((1 - finalSize / originalSize) * 100).toFixed(2);
        console.log(wasFallback ? `↩ Fallback to original` : `✓ ${compressionRatio}% reduction`);

        var blob = new Blob([finalData], { type: "application/pdf" });
        var pdfDataURL = self.URL.createObjectURL(blob);

        responseCallback({
          pdfDataURL,
          originalSize,
          compressedSize: finalSize,
          compressionRatio,
          wasFallback
        });
      } catch (error) {
        console.error('Error reading output file from Emscripten FS:', error);
        responseCallback({ error: 'Failed to read output file from virtual filesystem: ' + error.message });
      }
    }).catch((err) => {
      console.error('Failed to run Ghostscript module:', err);
      responseCallback({ error: err.message });
    });
  };
  
  xhr.onerror = function () {
    console.error('Failed to load PDF');
    responseCallback({ error: 'Failed to load PDF file' });
  };
  
  xhr.send();
}

self.addEventListener('message', function({data: e}) {
  console.log("Worker received message", e);
  
  if (e.target !== 'wasm') {
    return;
  }
  
  console.log('Processing with data:', e.data);
  
  _GSPS2PDF(e.data, (result) => {
    if (result.error) {
      self.postMessage({ error: result.error });
    } else {
      self.postMessage({
        pdfDataURL: result.pdfDataURL,
        wasFallback: result.wasFallback,
        compressionRatio: result.compressionRatio,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize
      });
    }
  });
});

console.log("Enhanced PDF Worker ready (Ghostscript WASM support)");