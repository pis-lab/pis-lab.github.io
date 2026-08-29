import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(root, 'img', 'optimized');

const projects = JSON.parse(await readFile(path.join(root, 'content', 'projects.json'), 'utf8'));
const people = JSON.parse(await readFile(path.join(root, 'content', 'people.json'), 'utf8'));

const groups = [
  {
    sources: ['img/hero/header.jpg'],
    widths: [48, 640, 960, 1600],
  },
  {
    sources: ['img/idea/cognitive-collaboration.webp', ...projects.map((project) => project.image)],
    widths: [48, 640, 960, 1440],
  },
  {
    sources: people.map((person) => person.image),
    widths: [48, 320, 640, 960],
  },
  {
    sources: [
      'img/platforms/human-robot-handshake-poster.webp',
      'img/platforms/immersive-gallery-poster.webp',
      'img/platforms/eye-tracking-poster.webp',
      'img/platforms/height-exposure.webp',
    ],
    widths: [48, 480, 960],
  },
];

function variantKey(source) {
  return source
    .replace(/^img[\\/]/, '')
    .replace(/\.[^.\\/]+$/, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

await mkdir(outputDirectory, { recursive: true });

const jobs = new Map();
for (const group of groups) {
  for (const source of group.sources) {
    const widths = jobs.get(source) ?? new Set();
    group.widths.forEach((width) => widths.add(width));
    jobs.set(source, widths);
  }
}

let generated = 0;
for (const [source, widths] of jobs) {
  const sourcePath = path.join(root, source);
  const key = variantKey(source);
  for (const width of [...widths].sort((a, b) => a - b)) {
    const preview = width === 48;
    await sharp(sourcePath)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: preview ? 30 : 76, effort: 4 })
      .toFile(path.join(outputDirectory, `${key}-${width}.webp`));
    generated += 1;
  }
}

console.log(`Generated ${generated} responsive image variants for ${jobs.size} source images.`);
