import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(root, 'img', 'logo');
// Keep future favicon regeneration aligned with the approved student-designed logo.
const source = path.join(outputDirectory, 'pis-mark-red.png');

await Promise.all([
  [16, 'favicon-16x16.png'],
  [32, 'favicon-32x32.png'],
  [180, 'apple-touch-icon.png'],
].map(([size, filename]) => sharp(source)
  .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(outputDirectory, filename))));

console.log('Generated PIS Lab favicons from the approved black/red logo.');
