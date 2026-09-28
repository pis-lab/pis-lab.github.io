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

function disableContentImageDragging(root = document) {
  const images = root === document
    ? document.querySelectorAll('main img')
    : root.closest('main') ? root.querySelectorAll('img') : [];
  images.forEach((image) => {
    image.draggable = false;
  });
}

function upgradeProgressiveImage(image) {
  if (!image || image.dataset.upgraded === 'true') return;
  const candidates = (image.dataset.srcset ?? '').split(',').map((candidate) => {
    const match = candidate.trim().match(/^(.*)\s+(\d+)w$/);
    return match ? { src: match[1], width: Number(match[2]) } : null;
  }).filter(Boolean).sort((a, b) => a.width - b.width);
  if (!candidates.length) return;

  const renderedWidth = image.getBoundingClientRect().width || window.innerWidth;
  const targetWidth = renderedWidth * Math.min(window.devicePixelRatio || 1, 2);
  const selected = candidates.find((candidate) => candidate.width >= targetWidth) ?? candidates.at(-1);
  if (!selected) return;

  image.dataset.upgraded = 'true';
  image.src = selected.src;
}

const progressiveImageObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        upgradeProgressiveImage(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '500px 0px' })
  : null;

function initializeProgressiveImages(root = document) {
  root.querySelectorAll('[data-progressive-image]').forEach((image) => {
    if (image.hasAttribute('data-progressive-eager') || !progressiveImageObserver) {
      upgradeProgressiveImage(image);
    } else {
      progressiveImageObserver.observe(image);
    }
  });
}

function setMotionState(control, playing) {
  const image = control.querySelector('img');
  if (!image) return;

  image.dataset.upgraded = 'true';
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
disableContentImageDragging();
initializeProgressiveImages();
