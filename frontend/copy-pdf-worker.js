// Script to copy PDF.js worker to public directory
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workerSource = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js');
const workerDest = path.join(__dirname, 'public', 'pdf.worker.min.js');

try {
  // Ensure public directory exists
  if (!fs.existsSync(path.join(__dirname, 'public'))) {
    fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
  }

  if (fs.existsSync(workerSource)) {
    fs.copyFileSync(workerSource, workerDest);
    console.log('✓ PDF.js worker copied to public directory');
  } else {
    console.warn('⚠ PDF.js worker source not found - skipping copy (will use CDN fallback)');
  }
} catch (error) {
  console.error('Error copying PDF.js worker:', error.message);
  process.exit(0); // Don't fail the build
}
