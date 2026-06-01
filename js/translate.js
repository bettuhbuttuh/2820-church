/* ============================================================
   2820 CHURCH — translate.js
   Custom language picker wired to Google Translate Element
   Supports: English (en), Spanish (es), French (fr),
             Haitian Creole (ht)
============================================================ */

(function () {
  'use strict';

  var LANGS = {
    en: { label: 'EN', full: 'English',        flag: '🇺🇸' },
    es: { label: 'ES', full: 'Español',         flag: '🇪🇸' },
    fr: { label: 'FR', full: 'Français',        flag: '🇫🇷' },
    ht: { label: 'HT', full: 'Kreyòl Ayisyen', flag: '🇭🇹' }
  };

  /* -------------------------------------------------------
     Read active language from Google's cookie
  ------------------------------------------------------- */
  function getLangFromCookie() {
    var m = document.cookie.match(/googtrans=\/en\/([a-z]+)/);
    return (m && LANGS[m[1]]) ? m[1] : 'en';
  }

  /* -------------------------------------------------------
     Write Google's translation cookie
  ------------------------------------------------------- */
  function setGoogCookie(lang) {
    var val = (lang === 'en') ? '/en/en' : '/en/' + lang;
    document.cookie = 'googtrans=' + val + '; path=/';
    if (window.location.hostname) {
      document.cookie = 'googtrans=' + val + '; path=/; domain=' + window.location.hostname;
    }
  }

  /* -------------------------------------------------------
     Switch the page language
  ------------------------------------------------------- */
  function setLanguage(lang) {
    if (!LANGS[lang]) return;

    /* Update all picker labels */
    document.querySelectorAll('.lang-picker__current').forEach(function (el) {
      el.textContent = LANGS[lang].label;
    });

    /* Update active states across all [data-lang] elements */
    document.querySelectorAll('[data-lang]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.lang === lang);
    });

    if (lang === 'en') {
      setGoogCookie('en');
      location.reload();
      return;
    }

    setGoogCookie(lang);

    /* Trigger Google Translate via its hidden <select> */
    var combo = document.querySelector('.goog-te-combo');
    if (combo) {
      combo.value = lang;
      combo.dispatchEvent(new Event('change'));
    } else {
      /* GT element not ready yet — reload with cookie in place */
      location.reload();
    }
  }

  /* -------------------------------------------------------
     Initialise all pickers and mobile buttons on the page
  ------------------------------------------------------- */
  function initPickers() {
    var currentLang = getLangFromCookie();

    /* Sync all label spans to current language */
    document.querySelectorAll('.lang-picker__current').forEach(function (el) {
      el.textContent = LANGS[currentLang] ? LANGS[currentLang].label : 'EN';
    });

    /* Mark active state on all [data-lang] elements */
    document.querySelectorAll('[data-lang]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.lang === currentLang);
    });

    /* ---- Dropdown pickers ---- */
    document.querySelectorAll('.lang-picker').forEach(function (picker) {
      var toggleBtn = picker.querySelector('.lang-picker__btn');
      var menu = picker.querySelector('.lang-picker__menu');
      if (!toggleBtn || !menu) return;

      /* Toggle open/close */
      toggleBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var opening = !picker.classList.contains('is-open');

        /* Close all other open pickers */
        document.querySelectorAll('.lang-picker.is-open').forEach(function (p) {
          if (p !== picker) {
            p.classList.remove('is-open');
            var b = p.querySelector('.lang-picker__btn');
            if (b) b.setAttribute('aria-expanded', 'false');
          }
        });

        picker.classList.toggle('is-open', opening);
        toggleBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
      });

      /* Language buttons inside menu */
      menu.querySelectorAll('[data-lang]').forEach(function (langBtn) {
        langBtn.addEventListener('click', function () {
          setLanguage(langBtn.dataset.lang);
          picker.classList.remove('is-open');
          toggleBtn.setAttribute('aria-expanded', 'false');
        });
      });
    });

    /* ---- Mobile nav pill buttons (.m-lang-btn) ---- */
    document.querySelectorAll('.m-lang-btn[data-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setLanguage(btn.dataset.lang);
      });
    });

    /* Close dropdowns on outside click */
    document.addEventListener('click', function () {
      document.querySelectorAll('.lang-picker.is-open').forEach(function (p) {
        p.classList.remove('is-open');
        var b = p.querySelector('.lang-picker__btn');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    });

    /* Close dropdowns on Escape */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      document.querySelectorAll('.lang-picker.is-open').forEach(function (p) {
        p.classList.remove('is-open');
        var b = p.querySelector('.lang-picker__btn');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* -------------------------------------------------------
     Google Translate Element callback
  ------------------------------------------------------- */
  window.googleTranslateElementInit = function () {
    new google.translate.TranslateElement(
      {
        pageLanguage: 'en',
        includedLanguages: 'en,es,fr,ht',
        autoDisplay: false
      },
      'google_translate_element'
    );
  };

  /* -------------------------------------------------------
     Boot
  ------------------------------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPickers);
  } else {
    initPickers();
  }

})();
