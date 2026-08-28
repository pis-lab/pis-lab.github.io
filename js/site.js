const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');
const progress = document.querySelector('.scroll-progress');
const navLinks = [...document.querySelectorAll('.site-nav a')];
const sections = navLinks.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);

function closeMenu() {
  menuButton?.setAttribute('aria-expanded', 'false');
  navigation?.classList.remove('is-open');
  document.body.classList.remove('nav-open');
}

menuButton?.addEventListener('click', () => {
  const nextState = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(nextState));
  navigation.classList.toggle('is-open', nextState);
  document.body.classList.toggle('nav-open', nextState);
});

navLinks.forEach((link) => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });

function updateScrollUI() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
  progress.style.transform = `scaleX(${ratio})`;
  let current = '';
  for (const section of sections) {
    if (window.scrollY >= section.offsetTop - 160) current = `#${section.id}`;
  }
  navLinks.forEach((link) => {
    const active = link.getAttribute('href') === current;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

window.addEventListener('scroll', updateScrollUI, { passive: true });
window.addEventListener('resize', () => { if (window.innerWidth > 1050) closeMenu(); updateScrollUI(); });
updateScrollUI();

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  });
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

function observeReveals(root = document) {
  root.querySelectorAll('.reveal').forEach((item) => revealObserver.observe(item));
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);
}

function storyMarkup(story) {
  const layoutClass = story.layout === 'featured'
    ? ' story-featured'
    : story.layout === 'wide' ? ' story-wide' : '';
  const imageClass = story.imageFit === 'contain' ? ' light-image' : '';
  const meta = `<div class="story-meta"><span>${escapeHTML(story.category)}</span><time datetime="${escapeHTML(story.datetime)}">${escapeHTML(story.date)}</time></div>`;
  const description = story.description ? `<p>${escapeHTML(story.description)}</p>` : '';
  const words = `${meta}<h3>${escapeHTML(story.title)}</h3>${description}`;

  return `<a class="story${layoutClass} reveal" href="${escapeHTML(story.href)}" target="_blank" rel="noreferrer">
    <div class="story-image${imageClass}"><img src="${escapeHTML(story.image)}" alt="${escapeHTML(story.alt)}" loading="lazy"></div>
    ${story.layout === 'wide' ? `<div class="story-body">${words}</div>` : words}
    <b class="story-arrow" aria-hidden="true">↗</b>
  </a>`;
}

function personMarkup(person) {
  const email = person.email
    ? `<a href="mailto:${escapeHTML(person.email)}">Email ↗</a>`
    : '';
  return `<article class="person${person.lead ? ' person-lead' : ''} reveal">
    <img src="${escapeHTML(person.image)}" alt="${escapeHTML(person.alt)}" loading="lazy">
    <div class="person-info"><p>${escapeHTML(person.role)}</p><h3>${escapeHTML(person.name)}</h3><span>${escapeHTML(person.focus)}</span>${email}</div>
  </article>`;
}

async function hydrateContent(url, selector, renderer) {
  const container = document.querySelector(selector);
  if (!container) return;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Content request failed: ${response.status}`);
    const items = await response.json();
    container.innerHTML = items.map(renderer).join('');
    observeReveals(container);
  } catch (error) {
    console.error(error);
    container.innerHTML = '<p class="content-loading content-error">Content is temporarily unavailable. Please refresh the page.</p>';
  }
}

observeReveals();
hydrateContent('content/news.json', '[data-news-grid]', storyMarkup);
hydrateContent('content/people.json', '[data-people-grid]', personMarkup);
document.querySelector('[data-year]').textContent = new Date().getFullYear();
