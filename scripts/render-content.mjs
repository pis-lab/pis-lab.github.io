import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function responsiveImage(source, alt, className, widths, sizes) {
  const key = source.replace(/^img\//, '').replace(/\.[^./]+$/, '')
    .replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  const candidates = widths.map(width => `img/optimized/${key}-${width}.webp ${width}w`).join(', ');
  // Native lazy loading and srcset work even if the page script never arrives.
  return `<img class="${escapeHTML(className)}" src="img/optimized/${key}-${widths[0]}.webp" srcset="${candidates}" sizes="${sizes}" alt="${escapeHTML(alt)}" loading="lazy" decoding="async" draggable="false">`;
}

const profileIcons = {
  github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.22c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.97.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18A11.1 11.1 0 0 1 12 6c.98 0 1.95.13 2.87.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.82 1.19 3.08 0 4.42-2.7 5.39-5.27 5.68.42.36.78 1.06.78 2.14v3.2c0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>',
  ecnu: '<span class="profile-icon-ecnu" aria-hidden="true"><img src="img/logo/ecnu-logo.svg" alt="" draggable="false"></span>'
};

function profileLinksMarkup(person) {
  if (!Array.isArray(person.links)) return '';
  const links = person.links
    .filter(link => profileIcons[link.kind] && typeof link.href === 'string' && link.href.startsWith('https://'))
    .map(link => `<a class="person-profile-link person-profile-link-${escapeHTML(link.kind)}" href="${escapeHTML(link.href)}" target="_blank" rel="noreferrer" aria-label="${escapeHTML(link.label)}" title="${escapeHTML(link.label)}">${profileIcons[link.kind]}</a>`).join('');
  return links ? `<span class="person-profile-links">${links}</span>` : '';
}

export function personMarkup(person) {
  const email = person.email ? `<a class="person-email" href="mailto:${escapeHTML(person.email)}">Email ↗</a>` : '';
  const position = person.position === 'top' ? ' person-photo-top' : person.position === 'center 35%' ? ' person-photo-high' : '';
  const sizes = '(max-width: 480px) calc(100vw - 40px), (max-width: 760px) 47vw, (max-width: 1050px) 32vw, 24vw';
  return `<article class="person${person.lead ? ' person-lead' : ''}">
    ${responsiveImage(person.image, person.alt, `person-photo${position}`, [320, 640, 960], sizes)}
    <div class="person-info"><p>${escapeHTML(person.role)}</p><div class="person-name-row"><h3>${escapeHTML(person.name)}</h3>${profileLinksMarkup(person)}</div><span class="person-focus">${escapeHTML(person.focus)}</span>${email}</div>
  </article>`;
}

export function projectMarkup(project, index) {
  const tags = project.tags.map(tag => `<li>${escapeHTML(tag)}</li>`).join('');
  return `<article class="project-feature">
    <div class="project-image">${responsiveImage(project.image, project.alt, '', [640, 960, 1440], '(max-width: 760px) 100vw, 50vw')}</div>
    <div class="project-copy">
      <div class="project-top"><span>${String(index + 1).padStart(2, '0')}</span><b>${escapeHTML(project.stage)}</b></div>
      <p class="project-category">${escapeHTML(project.category)}</p>
      <h3>${escapeHTML(project.headline)}</h3>
      <p>${escapeHTML(project.description)}</p>
      <ul>${tags}</ul>
      <strong>${escapeHTML(project.name)}</strong>
    </div>
  </article>`;
}

export function renderPage(html, people, projects) {
  const blocks = {
    projects: `<div class="projects-list" data-projects>\n${projects.map(projectMarkup).join('\n')}\n      </div>`,
    people: `<div class="people-grid" data-people-grid data-columns="4" data-remainder="${people.length % 4}">\n${people.map(personMarkup).join('\n')}\n      </div>`
  };
  for (const [name, markup] of Object.entries(blocks)) {
    const pattern = new RegExp(`(<!-- generated:${name}:start -->)[\\s\\S]*?(<!-- generated:${name}:end -->)`);
    if (!pattern.test(html)) throw new Error(`Missing generated ${name} markers in index.html`);
    html = html.replace(pattern, (_, start, end) => `${start}\n      ${markup}\n      ${end}`);
  }
  return html;
}

export async function renderContent({ check = false } = {}) {
  const target = path.join(root, 'index.html');
  const [html, people, projects] = await Promise.all([
    readFile(target, 'utf8'),
    readFile(path.join(root, 'content/people.json'), 'utf8').then(JSON.parse),
    readFile(path.join(root, 'content/projects.json'), 'utf8').then(JSON.parse)
  ]);
  const rendered = renderPage(html, people, projects);
  if (check) {
    if (html.replaceAll('\r\n', '\n') !== rendered.replaceAll('\r\n', '\n')) {
      throw new Error('Static content is out of date. Run npm run render:content and commit index.html.');
    }
  } else if (rendered !== html) {
    await writeFile(target, rendered);
  }
  return { people: people.length, projects: projects.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const counts = await renderContent({ check: process.argv.includes('--check') });
  console.log(`Static content ready: ${counts.people} people and ${counts.projects} projects.`);
}
