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

const profileIcons = {
  github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.22c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.97.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18A11.1 11.1 0 0 1 12 6c.98 0 1.95.13 2.87.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.82 1.19 3.08 0 4.42-2.7 5.39-5.27 5.68.42.36.78 1.06.78 2.14v3.2c0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>',
  ecnu: '<span class="profile-icon-ecnu" aria-hidden="true"><img src="img/logo/ecnu-logo.svg" alt=""></span>'
};

function profileLinksMarkup(person) {
  if (!Array.isArray(person.links)) return '';
  const links = person.links
    .filter((link) => profileIcons[link.kind] && typeof link.href === 'string' && link.href.startsWith('https://'))
    .map((link) => `<a class="person-profile-link person-profile-link-${escapeHTML(link.kind)}" href="${escapeHTML(link.href)}" target="_blank" rel="noreferrer" aria-label="${escapeHTML(link.label)}" title="${escapeHTML(link.label)}">${profileIcons[link.kind]}</a>`)
    .join('');
  return links ? `<span class="person-profile-links">${links}</span>` : '';
}

function personMarkup(person) {
  const email = person.email
    ? `<a class="person-email" href="mailto:${escapeHTML(person.email)}">Email ↗</a>`
    : '';
  const profileLinks = profileLinksMarkup(person);
  const photoPositionClass = person.position === 'top'
    ? ' person-photo-top'
    : person.position === 'center 35%' ? ' person-photo-high' : '';
  return `<article class="person${person.lead ? ' person-lead' : ''} reveal">
    <img class="person-photo${photoPositionClass}" src="${escapeHTML(person.image)}" alt="${escapeHTML(person.alt)}" loading="lazy">
    <div class="person-info"><p>${escapeHTML(person.role)}</p><div class="person-name-row"><h3>${escapeHTML(person.name)}</h3>${profileLinks}</div><span class="person-focus">${escapeHTML(person.focus)}</span>${email}</div>
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

async function hydrateContent(url, selector, renderer, afterRender) {
  const container = document.querySelector(selector);
  if (!container) return;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Content request failed: ${response.status}`);
    const items = await response.json();
    container.innerHTML = items.map(renderer).join('');
    afterRender?.(container, items);
    observeReveals(container);
  } catch (error) {
    console.error(error);
    container.innerHTML = '<p class="content-loading content-error">Content is temporarily unavailable. Please refresh the page.</p>';
  }
}

function configurePeopleGrid(container, people) {
  const columns = 4;
  container.style.setProperty('--people-columns', columns);
  container.dataset.columns = String(columns);
  container.dataset.remainder = String(people.length % columns);
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
hydrateContent('content/people.json', '[data-people-grid]', personMarkup, configurePeopleGrid);
