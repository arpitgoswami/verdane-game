// Portfolio Interactivity — Awwwards Quality

// ===== LENIS SMOOTH SCROLL =====
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smooth: true,
  smoothTouch: false,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

// ===== GSAP REGISTRATION =====
gsap.registerPlugin(ScrollTrigger);

// ===== HERO INTRO ANIMATION =====
const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

heroTl
  .from('.hero h1', { y: 80, opacity: 0, duration: 1 })
  .from('.hero p', { y: 40, opacity: 0, duration: 0.8 }, '-=0.6')
  .from('.hero .btn', { y: 40, opacity: 0, duration: 0.8 }, '-=0.4')
  .from('.header', { y: -100, opacity: 0, duration: 0.8 }, '-=1');

// ===== SCROLL-TRIGGERED SECTION REVEALS =====
const revealSections = gsap.utils.toArray('section:not(#hero)');

revealSections.forEach((section) => {
  const heading = section.querySelector('h2');
  const paragraphs = section.querySelectorAll('p:not(.project-card p)');
  const cards = section.querySelectorAll('.project-card');
  const form = section.querySelector('.contact-form');

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top 80%',
      toggleActions: 'play none none reverse',
    },
  });

  if (heading) {
    tl.from(heading, { y: 60, opacity: 0, duration: 0.8 });
  }

  if (paragraphs.length) {
    tl.from(paragraphs, { y: 40, opacity: 0, duration: 0.6, stagger: 0.1 }, '-=0.4');
  }

  if (cards.length) {
    tl.from(cards, { y: 60, opacity: 0, duration: 0.8, stagger: 0.15 }, '-=0.3');
  }

  if (form) {
    tl.from(form, { y: 40, opacity: 0, duration: 0.8 }, '-=0.3');
  }
});

// ===== NAV ACTIVE STATE (IntersectionObserver) =====
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section[id]');

const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach((link) => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  },
  { rootMargin: '-50% 0px -50% 0px', threshold: 0.1 }
);

sections.forEach((section) => navObserver.observe(section));

// ===== SMOOTH SCROLL FOR NAV LINKS =====
navLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        lenis.scrollTo(target, { offset: -80 });
      }
    }
  });
});

// ===== PROJECT CARD ENHANCEMENT =====
const projectCards = document.querySelectorAll('.project-card');

projectCards.forEach((card) => {
  card.addEventListener('mouseenter', () => {
    gsap.to(card, { scale: 1.02, duration: 0.3, ease: 'power2.out' });
  });

  card.addEventListener('mouseleave', () => {
    gsap.to(card, { scale: 1, duration: 0.3, ease: 'power2.out' });
  });
});

// ===== CONTACT FORM WITH VALIDATION & STATES =====
const contactForm = document.querySelector('.contact-form');
const submitBtn = contactForm.querySelector('.btn');
const formGroups = contactForm.querySelectorAll('.form-group');

function showError(input, message) {
  const group = input.closest('.form-group');
  let error = group.querySelector('.form-error');
  if (!error) {
    error = document.createElement('span');
    error.className = 'form-error';
    error.setAttribute('role', 'alert');
    group.appendChild(error);
  }
  error.textContent = message;
  input.setAttribute('aria-invalid', 'true');
  group.classList.add('has-error');
}

function clearError(input) {
  const group = input.closest('.form-group');
  const error = group.querySelector('.form-error');
  if (error) error.remove();
  input.removeAttribute('aria-invalid');
  group.classList.remove('has-error');
}

function validateField(input) {
  const value = input.value.trim();
  if (input.hasAttribute('required') && !value) {
    showError(input, `${input.name.charAt(0).toUpperCase() + input.name.slice(1)} is required`);
    return false;
  }
  if (input.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    showError(input, 'Please enter a valid email address');
    return false;
  }
  clearError(input);
  return true;
}

// Real-time validation
formGroups.forEach((group) => {
  const input = group.querySelector('input, textarea');
  if (input) {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (group.classList.contains('has-error')) validateField(input);
    });
  }
});

// Form submission
contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Validate all fields
  let isValid = true;
  formGroups.forEach((group) => {
    const input = group.querySelector('input, textarea');
    if (input && !validateField(input)) isValid = false;
  });

  if (!isValid) return;

  // Loading state
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Sending...';

  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Success state
  submitBtn.classList.remove('loading');
  submitBtn.classList.add('success');
  submitBtn.textContent = 'Sent!';

  // Show toast notification
  showToast('Message sent successfully!', 'success');

  // Reset form
  contactForm.reset();

  // Reset button after delay
  setTimeout(() => {
    submitBtn.disabled = false;
    submitBtn.classList.remove('success');
    submitBtn.textContent = originalText;
  }, 3000);
});

// ===== TOAST NOTIFICATION SYSTEM =====
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;

  document.body.appendChild(toast);

  // Animate in
  gsap.from(toast, { x: 100, opacity: 0, duration: 0.4, ease: 'power3.out' });

  // Remove after delay
  setTimeout(() => {
    gsap.to(toast, {
      x: 100,
      opacity: 0,
      duration: 0.3,
      ease: 'power3.in',
      onComplete: () => toast.remove(),
    });
  }, 4000);
}

// ===== REDUCED MOTION RESPECT =====
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function handleReducedMotion() {
  if (prefersReducedMotion.matches) {
    gsap.globalTimeline.timeScale(0);
    ScrollTrigger.getAll().forEach((st) => st.disable());
    lenis.destroy();
  }
}

handleReducedMotion();
prefersReducedMotion.addEventListener('change', handleReducedMotion);

// ===== HEADER SCROLL EFFECT =====
let lastScrollY = 0;
const header = document.querySelector('.header');

lenis.on('scroll', ({ scroll }) => {
  if (scroll > lastScrollY && scroll > 100) {
    header.classList.add('header-hidden');
  } else {
    header.classList.remove('header-hidden');
  }
  lastScrollY = scroll;
});

// ===== CURSOR TRAIL (Optional - Subtle) =====
if (!prefersReducedMotion.matches) {
  const cursor = document.createElement('div');
  cursor.className = 'cursor-trail';
  cursor.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cursor);

  let mouseX = 0;
  let mouseY = 0;
  let cursorX = 0;
  let cursorY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function animateCursor() {
    cursorX += (mouseX - cursorX) * 0.1;
    cursorY += (mouseY - cursorY) * 0.1;
    cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
    requestAnimationFrame(animateCursor);
  }
  animateCursor();
}

// ===== PERFORMANCE: PAUSE ANIMATIONS OFFSCREEN =====
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    gsap.globalTimeline.pause();
  } else {
    gsap.globalTimeline.resume();
  }
});