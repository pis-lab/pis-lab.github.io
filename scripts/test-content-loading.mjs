import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../js/site.js', import.meta.url), 'utf8');
const start = source.indexOf('async function hydrateContent(');
const end = source.indexOf('\nfunction configurePeopleGrid(', start);
assert.ok(start >= 0 && end > start, 'Find the production content loader');
const loaderSource = source.slice(start, end);

function harness({ data = [], ok = true, timestamp = 1000, present = true } = {}) {
  const container = { innerHTML: '' };
  const requests = [];
  const initialized = [];
  const errors = [];
  const context = vm.createContext({
    URL,
    Date: { now: () => timestamp },
    document: {
      baseURI: 'https://pis-lab.github.io/',
      querySelector: () => present ? container : null,
    },
    fetch: async (url, options) => {
      requests.push({ url: String(url), cache: options.cache });
      return { ok, status: ok ? 200 : 503, json: async () => data };
    },
    console: { error: error => errors.push(error) },
    disableContentImageDragging: root => initialized.push(['drag', root]),
    initializeProgressiveImages: root => initialized.push(['images', root]),
    observeReveals: root => initialized.push(['reveal', root]),
  });
  vm.runInContext(loaderSource, context);
  return { load: context.hydrateContent, container, requests, initialized, errors };
}

test('each page load requests a fresh member manifest without HTTP caching', async () => {
  const first = harness({ timestamp: 1000 });
  const second = harness({ timestamp: 2000 });
  await first.load('content/people.json', '[data-people-grid]', () => '');
  await second.load('content/people.json', '[data-people-grid]', () => '');
  assert.equal(first.requests[0].url, 'https://pis-lab.github.io/content/people.json?v=1000');
  assert.equal(second.requests[0].url, 'https://pis-lab.github.io/content/people.json?v=2000');
  assert.equal(first.requests[0].cache, 'no-store');
  assert.equal(second.requests[0].cache, 'no-store');
});

test('all members render and existing image/grid initializers still run', async () => {
  const people = JSON.parse(await readFile(new URL('../content/people.json', import.meta.url), 'utf8'));
  const state = harness({ data: people });
  let callbackPeople;
  await state.load('content/people.json', '[data-people-grid]', person => `<h3>${person.name}</h3>`, (root, items) => {
    assert.equal(root, state.container);
    callbackPeople = items;
  });
  assert.equal(callbackPeople.length, people.length);
  assert.equal((state.container.innerHTML.match(/<h3>/g) ?? []).length, people.length);
  assert.match(state.container.innerHTML, /Jerry Z\.L\. Cao/);
  assert.deepEqual(state.initialized.map(([name]) => name), ['drag', 'images', 'reveal']);
  assert.ok(state.initialized.every(([, root]) => root === state.container));
  assert.equal(state.errors.length, 0);
});

test('project data uses the same freshness policy, preserving existing query parameters', async () => {
  const state = harness();
  await state.load('content/projects.json?lang=en', '[data-projects]', () => '');
  assert.equal(state.requests[0].url, 'https://pis-lab.github.io/content/projects.json?lang=en&v=1000');
  assert.equal(state.requests[0].cache, 'no-store');
});

test('a failed request shows the existing error state instead of stale content', async () => {
  const state = harness({ ok: false });
  await state.load('content/people.json', '[data-people-grid]', () => '');
  assert.match(state.container.innerHTML, /Content is temporarily unavailable/);
  assert.equal(state.errors.length, 1);
  assert.equal(state.initialized.length, 0);
});

test('pages without a content container make no request', async () => {
  const state = harness({ present: false });
  await state.load('content/people.json', '[data-people-grid]', () => '');
  assert.equal(state.requests.length, 0);
});
