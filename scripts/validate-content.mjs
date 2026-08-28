import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readJSON(relativePath) {
  const source = await readFile(path.join(root, relativePath), 'utf8');
  const data = JSON.parse(source);
  if (!Array.isArray(data)) throw new Error(`${relativePath} must contain a JSON array.`);
  return data;
}

function requireFields(item, fields, label) {
  for (const field of fields) {
    if (typeof item[field] !== 'string' || !item[field].trim()) {
      throw new Error(`${label}: missing required field “${field}”.`);
    }
  }
}

async function requireLocalImage(image, label) {
  if (image.includes('..') || path.isAbsolute(image)) {
    throw new Error(`${label}: image must be a repository-relative path.`);
  }
  const resolved = path.resolve(root, image);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error(`${label}: invalid image path.`);
  await access(resolved);
}

const news = await readJSON('content/news.json');
const people = await readJSON('content/people.json');

const newsTitles = new Set();
for (const [index, story] of news.entries()) {
  const label = `news.json item ${index + 1}`;
  requireFields(story, ['category', 'date', 'datetime', 'title', 'image', 'alt', 'href'], label);
  if (newsTitles.has(story.title)) throw new Error(`${label}: duplicate title “${story.title}”.`);
  newsTitles.add(story.title);
  if (!story.href.startsWith('https://')) throw new Error(`${label}: href must start with https://.`);
  if (story.layout && !['featured', 'wide'].includes(story.layout)) throw new Error(`${label}: unsupported layout.`);
  if (story.imageFit && story.imageFit !== 'contain') throw new Error(`${label}: unsupported imageFit.`);
  await requireLocalImage(story.image, label);
}

const peopleNames = new Set();
for (const [index, person] of people.entries()) {
  const label = `people.json item ${index + 1}`;
  requireFields(person, ['role', 'name', 'focus', 'image', 'alt'], label);
  if (peopleNames.has(person.name)) throw new Error(`${label}: duplicate name “${person.name}”.`);
  peopleNames.add(person.name);
  if (person.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(person.email)) throw new Error(`${label}: invalid email.`);
  await requireLocalImage(person.image, label);
}

console.log(`Content validated: ${news.length} news items and ${people.length} people.`);
