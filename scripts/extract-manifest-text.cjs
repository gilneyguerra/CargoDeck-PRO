/**
 * Script temporário de extração de texto dos PDFs da pasta manifestos.
 * Execute: node scripts/extract-manifest-text.cjs
 */
const fs = require('fs');
const path = require('path');

async function extractText(filePath) {
  const pdfjsLib = await import('../node_modules/pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  
  let fullText = '';
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Arquivo: ${path.basename(filePath)}`);
  console.log(`Páginas: ${pdf.numPages}`);
  console.log('='.repeat(60));
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    console.log(`\n--- Página ${i} (${pageText.length} chars) ---`);
    console.log(pageText);
    fullText += pageText + '\n';
    page.cleanup();
  }
  
  pdf.destroy();
  return fullText;
}

async function main() {
  const manifestDir = path.join(__dirname, '..', 'manifestos');
  const files = fs.readdirSync(manifestDir).filter(f => f.endsWith('.pdf'));
  
  for (const file of files) {
    const filePath = path.join(manifestDir, file);
    try {
      await extractText(filePath);
    } catch (err) {
      console.log(`ERRO em ${file}: ${err.message}`);
    }
  }
}

main().catch(console.error);
