import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(root, 'img', 'logo');

const palette = {
  paper: '#f3f2ee',
  ink: '#11110f',
  red: '#f2442e',
};

function rectangle(width, height, color, left, top) {
  return {
    input: {
      create: {
        width,
        height,
        channels: 4,
        background: color,
      },
    },
    left,
    top,
  };
}

async function generate(size, filename) {
  const gap = Math.max(1, Math.round(size * 0.0625));
  const cell = Math.max(3, Math.floor(size * 0.2));
  const markSize = (cell * 3) + (gap * 2);
  const offset = Math.floor((size - markSize) / 2);
  const x = [offset, offset + cell + gap, offset + (cell + gap) * 2];
  const y = x;

  const blocks = [
    rectangle(cell, cell, palette.ink, x[0], y[0]),
    rectangle(cell, cell, palette.red, x[1], y[0]),
    rectangle(cell, (cell * 2) + gap, palette.ink, x[2], y[0]),
    rectangle(cell, cell, palette.ink, x[0], y[1]),
    rectangle(cell, cell, palette.red, x[1], y[1]),
    rectangle(cell, cell, palette.ink, x[0], y[2]),
  ];

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: palette.paper,
    },
  })
    .composite(blocks)
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(outputDirectory, filename));
}

await Promise.all([
  generate(16, 'favicon-16x16.png'),
  generate(32, 'favicon-32x32.png'),
  generate(180, 'apple-touch-icon.png'),
]);

console.log('Generated PIS Lab favicons in 16px, 32px, and 180px sizes.');
