I have the following comments after thorough review of file. Implement the comments by following the instructions verbatim.

---
## Comment 1: page.render() uses wrong property name `canvas` — this is the crash root cause

In `pdfExtractor.ts`, in the `renderPageToImage` method (around line 176):
1. Replace `{ canvas: canvas as any, viewport: viewport as any }` with `{ canvasContext: canvas.getContext('2d')!, viewport }`.
2. Remove the `as any` casts — they are no longer needed once the correct property name is used.
3. Add a null check on `canvas.getContext('2d')` and throw a descriptive `AppError` if it returns null (edge case on unsupported environments).

### Relevant Files
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\services\pdfExtractor.ts
---
## Comment 2: PDF document is never destroyed after extraction, leaking memory on every upload

In `pdfExtractor.ts`, in the `extract` method:
1. Wrap the extraction logic (from the `pdf` variable usage through to the return) in a `try/finally` block.
2. In the `finally` clause, call `pdf.destroy()` to release all internal resources.
3. Ensure `pdf.destroy()` is called on both success and error paths (including when text extraction and OCR both return zero items).

### Relevant Files
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\services\pdfExtractor.ts
---
## Comment 3: Canvas elements created for OCR rendering are never cleaned up, causing DOM and memory bloat

In `pdfExtractor.ts`:
1. In `renderPageToImage`, add a `page.cleanup()` call in a `finally` block after `page.render()` completes.
2. In `performOCR`, after `worker.recognize(canvas)` returns, reset the canvas dimensions to zero (`canvas.width = 0; canvas.height = 0`) to free the pixel buffer immediately.

### Relevant Files
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\services\pdfExtractor.ts
---
## Comment 4: Cargo identifier from PDF is discarded — the mapping uses the internal parse ID instead

1. In `pdfExtractor.ts`, update the `CargoItem` interface to include a distinct `identifier` field for the actual cargo code extracted from the PDF.
2. Update the regex patterns in `parseManifesto` to capture the actual cargo code/number from the PDF text. This may require adding new patterns that match real cargo manifesto formats (e.g., container numbers, AWB codes).
3. In `PDFUploader.tsx`, update the mapping to use `identifier: item.identifier` (the real cargo code) instead of `identifier: item.id`.

### Relevant Files
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\components\PDFUploader.tsx
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\services\pdfExtractor.ts
---
## Comment 5: Parsing regexes do not extract cargo dimensions — only weight, volume, and bay are captured

1. In `pdfExtractor.ts`, update or add regex patterns in `parseManifesto` to capture cargo dimensions (length, width, height) from the PDF text. Common manifesto formats include `LxWxH` notation or separate columns.
2. Add `length`, `width`, and optionally `height` fields to the `CargoItem` interface.
3. In `PDFUploader.tsx`, update the mapping to use `widthMeters: item.width` and `lengthMeters: item.length` instead of deriving them from volume.
4. Keep the volume-based fallback only when dimensions are not available in the PDF, and log a warning when this fallback is used.

### Relevant Files
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\services\pdfExtractor.ts
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\components\PDFUploader.tsx
---
## Comment 6: AbortController signal is created but never passed to pdfjs-dist or Tesseract operations

1. In `usePDFUpload.ts`, pass the `signal` (from the `AbortController`) as an additional parameter to `PDFExtractor.extract()`.
2. In `pdfExtractor.ts`, accept an optional `AbortSignal` parameter in the `extract()` method.
3. Check `signal.aborted` between page iterations in both `extractTextFromPDF` and `performOCR` loops, and throw an abort error if true.
4. Optionally pass the signal to `pdfjsLib.getDocument({ data: arrayBuffer })` if the version supports it.

### Relevant Files
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\hooks\usePDFUpload.ts
---
## Comment 7: Multiple `as any` casts in pdfExtractor suppress TypeScript safety and hide API misuse

1. In `pdfExtractor.ts`, remove all `as any` type casts.
2. If type conflicts arise from the pdfjs-dist types, resolve them by using the correct API signatures rather than casting.
3. If the `pdfjs-dist` types are incomplete or mismatched, install `@types/pdfjs-dist` or use properly typed interfaces from the library's own exports.

### Relevant Files
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\services\pdfExtractor.ts
---
## Comment 8: Several logger.error calls pass non-Error values where an Error is expected

1. In files that call `logger.error()`, ensure the second argument is either an `Error` instance or `undefined`.
2. For caught exceptions of type `unknown`, wrap them: `logger.error('message', error instanceof Error ? error : undefined, { rawError: error })`.
3. Alternatively, update the `Logger.error()` signature to accept `unknown` and handle the type narrowing internally.

### Relevant Files
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\services\pdfExtractor.ts
- c:\Users\gguerra\Desktop\CargoDeck-PRO-master\src\utils\logger.ts
---