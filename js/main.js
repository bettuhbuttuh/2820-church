/* ============================================================
   2820 CHURCH — main.js
   - Sticky nav scroll shrink
   - Hamburger toggle (mobile)
   - IntersectionObserver scroll reveals
   - Active nav-link tracking
   - prefers-reduced-motion guard
============================================================ */

(function () {
  'use strict';

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------------------------------------
     Sticky nav: toggle .is-scrolled after a small offset
  -------------------------------------------------------- */
  const header = document.getElementById('site-header');
  const SCROLL_THRESHOLD = 32;

  function updateHeader() {
    if (!header) return;
    if (window.scrollY > SCROLL_THRESHOLD) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  }

  let scrollTicking = false;
  function onScroll() {
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        updateHeader();
        updateActiveNav();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  updateHeader();

  /* --------------------------------------------------------
     Hamburger / mobile nav
  -------------------------------------------------------- */
  const burger = document.getElementById('burger');
  const mobileNav = document.getElementById('mobile-nav');

  function closeMobileNav() {
    if (!burger || !mobileNav) return;
    burger.classList.remove('is-open');
    mobileNav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    mobileNav.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-open');
  }

  function toggleMobileNav() {
    if (!burger || !mobileNav) return;
    const isOpen = burger.classList.toggle('is-open');
    mobileNav.classList.toggle('is-open', isOpen);
    burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    mobileNav.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    document.body.classList.toggle('menu-open', isOpen);
  }

  if (burger) {
    burger.addEventListener('click', toggleMobileNav);
  }

  if (mobileNav) {
    mobileNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        // small delay so the navigation feels intentional
        setTimeout(closeMobileNav, 80);
      });
    });
  }

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileNav();
  });

  // Close if window resized to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeMobileNav();
  });

  /* --------------------------------------------------------
     Reveal animations (IntersectionObserver)
  -------------------------------------------------------- */
  const revealEls = document.querySelectorAll('.reveal');

  if (prefersReducedMotion) {
    revealEls.forEach((el) => el.classList.add('in-view'));
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -8% 0px',
      }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    // Fallback: just show everything
    revealEls.forEach((el) => el.classList.add('in-view'));
  }

  /* --------------------------------------------------------
     Active nav-link based on scroll position
  -------------------------------------------------------- */
  const navLinks = document.querySelectorAll('.site-header__nav .nav-link');
  const sectionIds = ['top', 'about', 'mission', 'sermons', 'events', 'give', 'visit'];
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  function updateActiveNav() {
    if (!navLinks.length || !sections.length) return;
    const scrollPos = window.scrollY + window.innerHeight * 0.35;
    let currentId = sectionIds[0];

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      if (sec.offsetTop <= scrollPos) currentId = sec.id;
    }

    navLinks.forEach((link) => {
      const target = link.getAttribute('href');
      if (target === '#' + currentId) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });
  }
  updateActiveNav();

  /* --------------------------------------------------------
     Footer "Stay Connected" newsletter — Netlify form.
     Submit via AJAX so the inline "subscribed" message shows.
  -------------------------------------------------------- */
  const newsletter = document.querySelector('form.site-footer__form[name="newsletter"]');
  if (newsletter) {
    newsletter.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = newsletter.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(newsletter)).toString(),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Bad response ' + res.status);
          const email = newsletter.querySelector('input[type="email"]');
          if (email) email.value = '';
          const msg = newsletter.querySelector('.subscribed');
          if (msg) msg.style.display = 'block';
        })
        .catch(() => {
          window.alert('Sorry — that didn\'t go through. Please email us at info@2820church.org.');
        })
        .then(() => {
          if (btn) btn.disabled = false;
        });
    });
  }

})();
