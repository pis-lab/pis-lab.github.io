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

function personMarkup(person) {
  const email = person.email
    ? `<a href="mailto:${escapeHTML(person.email)}">Email ↗</a>`
    : '';
  return `<article class="person${person.lead ? ' person-lead' : ''} reveal">
    <img src="${escapeHTML(person.image)}" alt="${escapeHTML(person.alt)}" loading="lazy">
    <div class="person-info"><p>${escapeHTML(person.role)}</p><h3>${escapeHTML(person.name)}</h3><span>${escapeHTML(person.focus)}</span>${email}</div>
  </article>`;
}

function projectMarkup(project, index) {
  const tags = project.tags.map((tag) => `<li>${escapeHTML(tag)}</li>`).join('');
  return `<article class="project-feature reveal">
    <div class="project-image"><img src="${escapeHTML(project.image)}" alt="${escapeHTML(project.alt)}" loading="lazy"></div>
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

function setMotionState(control, playing) {
  const image = control.querySelector('img');
  if (!image) return;

  image.src = playing ? control.dataset.animated : control.dataset.static;
  control.classList.toggle('is-playing', playing);
  control.setAttribute('aria-pressed', String(playing));
}

document.querySelectorAll('[data-motion-image]').forEach((control) => {
  control.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') setMotionState(control, true);
  });

  control.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') setMotionState(control, false);
  });

  control.addEventListener('click', (event) => {
    const keyboardActivation = event.detail === 0;
    const touchFirst = !window.matchMedia('(hover: hover)').matches;
    if (keyboardActivation || touchFirst) {
      setMotionState(control, control.getAttribute('aria-pressed') !== 'true');
      return;
    }
    setMotionState(control, true);
  });

  control.addEventListener('blur', () => {
    if (window.matchMedia('(hover: hover)').matches) setMotionState(control, false);
  });
});

observeReveals();
hydrateContent('content/projects.json', '[data-projects]', projectMarkup);
hydrateContent('content/people.json', '[data-people-grid]', personMarkup);
document.querySelector('[data-year]').textContent = new Date().getFullYear();
