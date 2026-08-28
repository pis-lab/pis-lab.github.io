import { createServer } from 'node:http';
import { access, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const studioPage = path.join(root, 'tools', 'content-studio.html');
const host = '127.0.0.1';
const port = Number.parseInt(process.env.PIS_CONTENT_PORT || '4174', 10);
const maxRequestBytes = 12 * 1024 * 1024;
const allowedOrigins = new Set([`http://${host}:${port}`, `http://localhost:${port}`]);

const presets = {
  projectStages: ['Research program', 'Design methodology', 'Prototype', 'In development', 'System', 'Method'],
  projectCategories: ['Human–AI co-creation', 'Interaction methodology', 'Embodied AI', 'Tangible Informatics', 'Human factors', 'Adaptive XR', 'Personal Informatics'],
  peopleRoles: ['Faculty', 'Collaborator', 'Postdoctoral researcher', 'PhD student', "Master's student", 'Research assistant', 'Visiting researcher'],
  photoPositions: ['center', 'top', 'center 35%']
};

function sendJSON(response, status, data) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(data));
}

function cleanText(value, label, maxLength = 500, required = true) {
  const text = String(value ?? '').trim();
  if (required && !text) throw new Error(`${label} is required.`);
  if (text.length > maxLength) throw new Error(`${label} is too long.`);
  return text;
}

function slugify(value, fallback) {
  const slug = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || fallback;
}

async function readArray(relativePath) {
  const data = JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
  if (!Array.isArray(data)) throw new Error(`${relativePath} is not a JSON array.`);
  return data;
}

async function uniqueImagePath(directory, requestedSlug) {
  const safeDirectory = path.join(root, directory);
  await mkdir(safeDirectory, { recursive: true });
  for (let suffix = 1; suffix < 100; suffix += 1) {
    const filename = `${requestedSlug}${suffix === 1 ? '' : `-${suffix}`}.webp`;
    const absolutePath = path.join(safeDirectory, filename);
    try {
      await access(absolutePath);
    } catch {
      return { filename, absolutePath, relativePath: `${directory}/${filename}`.replaceAll('\\', '/') };
    }
  }
  throw new Error('Could not create a unique image filename.');
}

function decodeWebP(dataUrl) {
  const match = /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl ?? ''));
  if (!match) throw new Error('The image was not converted to WebP correctly.');
  const image = Buffer.from(match[1], 'base64');
  if (image.length < 16 || image.length > 5 * 1024 * 1024) throw new Error('The processed image must be smaller than 5 MB.');
  if (image.subarray(0, 4).toString('ascii') !== 'RIFF' || image.subarray(8, 12).toString('ascii') !== 'WEBP') {
    throw new Error('The uploaded file is not a valid WebP image.');
  }
  return image;
}

async function atomicWriteJSON(relativePath, data) {
  const target = path.join(root, relativePath);
  const temporary = `${target}.content-studio.tmp`;
  await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(temporary, target);
}

async function addProject(payload) {
  const fields = payload.fields ?? {};
  const projects = await readArray('content/projects.json');
  const name = cleanText(fields.name, 'Project name', 120);
  if (projects.some((project) => project.name.toLowerCase() === name.toLowerCase())) throw new Error('A project with this name already exists.');

  const tags = Array.isArray(fields.tags)
    ? [...new Set(fields.tags.map((tag) => cleanText(tag, 'Keyword', 50)).filter(Boolean))].slice(0, 8)
    : [];
  if (!tags.length) throw new Error('Add at least one keyword.');

  const slug = slugify(fields.slug || name, `project-${projects.length + 1}`);
  const imageTarget = await uniqueImagePath('img/projects', slug);
  const image = decodeWebP(payload.image?.dataUrl);
  const entry = {
    name,
    category: cleanText(fields.category, 'Red category title', 80),
    headline: cleanText(fields.headline, 'Large headline', 180),
    description: cleanText(fields.description, 'Description', 800),
    image: imageTarget.relativePath,
    alt: cleanText(fields.alt, 'Image description', 180),
    stage: cleanText(fields.stage, 'Type / stage', 80),
    tags
  };

  await writeFile(imageTarget.absolutePath, image);
  try {
    await atomicWriteJSON('content/projects.json', [...projects, entry]);
  } catch (error) {
    await unlink(imageTarget.absolutePath).catch(() => {});
    throw error;
  }
  return { count: projects.length + 1, number: String(projects.length + 1).padStart(2, '0'), image: entry.image };
}

async function addPerson(payload) {
  const fields = payload.fields ?? {};
  const people = await readArray('content/people.json');
  const name = cleanText(fields.name, 'Name', 100);
  if (people.some((person) => person.name.toLowerCase() === name.toLowerCase())) throw new Error('A member with this name already exists.');

  const email = cleanText(fields.email, 'Email', 160, false);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Email address is invalid.');
  const position = presets.photoPositions.includes(fields.position) ? fields.position : 'center';
  const slug = slugify(fields.slug || name, `member-${people.length + 1}`);
  const imageTarget = await uniqueImagePath('img/member', slug);
  const image = decodeWebP(payload.image?.dataUrl);
  const entry = {
    role: cleanText(fields.role, 'Role', 80),
    name,
    focus: cleanText(fields.focus, 'Research focus', 180),
    image: imageTarget.relativePath,
    alt: cleanText(fields.alt || name, 'Photo description', 180),
    ...(email ? { email } : {}),
    ...(position !== 'center' ? { position } : {})
  };

  await writeFile(imageTarget.absolutePath, image);
  try {
    await atomicWriteJSON('content/people.json', [...people, entry]);
  } catch (error) {
    await unlink(imageTarget.absolutePath).catch(() => {});
    throw error;
  }
  return { count: people.length + 1, image: entry.image };
}

async function readBody(request) {
  const declaredLength = Number(request.headers['content-length'] || 0);
  if (declaredLength > maxRequestBytes) throw new Error('Submission is too large.');
  const chunks = [];
  let received = 0;
  for await (const chunk of request) {
    received += chunk.length;
    if (received > maxRequestBytes) throw new Error('Submission is too large.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${host}:${port}`);
  try {
    if (request.method === 'GET' && url.pathname === '/') {
      const html = await readFile(studioPage);
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      response.end(html);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/state') {
      const [projects, people] = await Promise.all([readArray('content/projects.json'), readArray('content/people.json')]);
      sendJSON(response, 200, { projects: projects.length, nextProject: projects.length + 1, people: people.length, presets });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/submit') {
      if (!allowedOrigins.has(request.headers.origin)) {
        sendJSON(response, 403, { ok: false, error: 'This tool only accepts submissions from its local page.' });
        return;
      }
      if (!String(request.headers['content-type'] || '').startsWith('application/json')) {
        sendJSON(response, 415, { ok: false, error: 'Content type must be application/json.' });
        return;
      }
      const payload = await readBody(request);
      const result = payload.kind === 'project'
        ? await addProject(payload)
        : payload.kind === 'person' ? await addPerson(payload) : null;
      if (!result) throw new Error('Choose Working System or People.');
      sendJSON(response, 200, { ok: true, kind: payload.kind, ...result });
      return;
    }

    sendJSON(response, 404, { ok: false, error: 'Not found.' });
  } catch (error) {
    console.error(error);
    sendJSON(response, 400, { ok: false, error: error.message || 'Submission failed.' });
  }
});

server.listen(port, host, () => {
  console.log(`PIS Content Studio: http://${host}:${port}`);
  console.log('Keep this terminal open while editing. Press Ctrl+C when finished.');
});
