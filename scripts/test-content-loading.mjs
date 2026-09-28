import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { escapeHTML, personMarkup, projectMarkup, renderPage, renderContent } from './render-content.mjs';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const script = await readFile(new URL('js/site.js', root), 'utf8');
const people = JSON.parse(await readFile(new URL('content/people.json', root), 'utf8'));
const projects = JSON.parse(await readFile(new URL('content/projects.json', root), 'utf8'));

test('first HTML response includes every member and project without executing JavaScript', () => {
  assert.equal((html.match(/<article class="person(?: person-lead)?"/g) ?? []).length, people.length);
  assert.equal((html.match(/<article class="project-feature"/g) ?? []).length, projects.length);
  for (const person of people) {
    assert.ok(html.includes('<h3>' + escapeHTML(person.name) + '</h3>'));
    assert.ok(html.includes(escapeHTML(person.focus)));
  }
  assert.match(html, /Jerry Z\.L\. Cao/);
  assert.doesNotMatch(html, /Loading the lab roster|Loading current projects|aria-live="polite"/);
  assert.doesNotMatch(script, /fetch\s*\(|hydrateContent/);
});

test('generated content stays synchronized with the JSON source', async () => {
  await renderContent({ check: true });
  assert.equal(renderPage(html, people, projects), html);
});

test('a new member updates the static card and last-row layout together', () => {
  const newPerson = { ...people.at(-1), name: 'Test member <&>', focus: 'Robot & human' };
  const changed = renderPage(html, [...people, newPerson], projects);
  assert.ok(changed.includes('<h3>' + escapeHTML(newPerson.name) + '</h3>'));
  assert.ok(changed.includes('data-remainder="' + ((people.length + 1) % 4) + '"'));
  assert.equal((changed.match(/<article class="person(?: person-lead)?"/g) ?? []).length, people.length + 1);
});

test('all card photos use native responsive images without a script-dependent placeholder', async () => {
  const cards = [...people.map(personMarkup), ...projects.map(projectMarkup)].join('\n');
  assert.doesNotMatch(cards, /data-srcset|data-progressive-image|-48\.webp/);
  const images = [...cards.matchAll(/<img\b[^>]*srcset=[^>]+>/g)];
  assert.equal(images.length, people.length + projects.length);
  for (const [image] of images) {
    assert.match(image, /sizes="/);
    assert.match(image, /loading="lazy"/);
    assert.match(image, /draggable="false"/);
  }
  const assets = [...new Set([...cards.matchAll(/img\/optimized\/[^\s",]+\.webp/g)].map(match => match[0]))];
  await Promise.all(assets.map(asset => access(new URL(asset, root))));
});

test('profile links, focus crops and safe escaping are preserved', () => {
  const jerry = personMarkup(people.find(person => person.name === 'Jerry Z.L. Cao'));
  assert.match(jerry, /person-photo-top/);
  const director = personMarkup(people.find(person => person.lead));
  assert.match(director, /person-profile-link-github/);
  assert.match(director, /person-profile-link-ecnu/);
  assert.match(director, /mailto:/);
  const unsafe = personMarkup({ ...people[0], name: '<script>alert(1)</script>', links: [{kind:'github', href:'javascript:alert(1)'}] });
  assert.doesNotMatch(unsafe, /<script>|javascript:/);
  assert.match(unsafe, /&lt;script&gt;/);
});
