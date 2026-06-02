/* ============================================================
   2820 CHURCH — cart.js
   Client-side cart + checkout flow (no payment backend yet).
   - localStorage-backed cart (persists across pages & reloads)
   - Injects a cart icon into the header + a slide-in drawer
   - Wires "Add to Cart" on the store
   - Renders the checkout order summary + shipping math
   - Graceful fallback for product photos not yet uploaded
============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = '2820_cart';
  var SHIP_STANDARD = 6;
  var SHIP_EXPRESS = 18;
  var FREE_SHIP_AT = 75;

  /* --------------------------------------------------------
     Product catalog (shared by store listing + product page)
     Colorways are grouped by `group`; the product page builds
     its color selector from the other members of the group.
  -------------------------------------------------------- */
  var SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

  var HOODIE_DESC = 'Heavyweight fleece hoodie carrying the 2820 flag mark. Built for cold mornings, long altar calls, and everywhere the mission takes you.';
  var CLASSIC_HOODIE_DESC = 'Heavyweight fleece hoodie carrying the 28:20 wordmark — a daily reminder that He is with us always, to the very end of the age.';
  var TEE_DESC = 'Soft, premium cotton tee inspired by Matthew 28:20 — a daily reminder that He is with us always, to the very end of the age.';

  var PRODUCTS = {
    'hoodie-navy': {
      id: 'hoodie-navy', name: '2820 Flag Hoodie', category: 'Hoodie', group: 'hoodie',
      color: 'Navy', swatch: '#061E37', price: 65, badge: 'New',
      image: 'assets/merch-2820-hoodie-navy.jpg', description: HOODIE_DESC
    },
    'hoodie-white': {
      id: 'hoodie-white', name: '2820 Flag Hoodie', category: 'Hoodie', group: 'hoodie',
      color: 'White', swatch: '#E7E1D6', price: 65, badge: 'New',
      image: 'assets/merch-2820-hoodie-white.jpg', description: HOODIE_DESC
    },
    'classic-hoodie-black': {
      id: 'classic-hoodie-black', name: '28:20 Hoodie', category: 'Hoodie', group: 'classic-hoodie',
      color: 'Black', swatch: '#14181F', price: 65, badge: 'New',
      image: 'assets/merch-2820-classic-hoodie-black.jpg', description: CLASSIC_HOODIE_DESC
    },
    'classic-hoodie-white': {
      id: 'classic-hoodie-white', name: '28:20 Hoodie', category: 'Hoodie', group: 'classic-hoodie',
      color: 'White', swatch: '#EEE5D2', price: 65, badge: 'New',
      image: 'assets/merch-2820-classic-hoodie-white.jpg', description: CLASSIC_HOODIE_DESC
    },
    'tee-black': {
      id: 'tee-black', name: '28:20 Tee', category: 'Tee', group: 'tee',
      color: 'Black', swatch: '#14181F', price: 40, badge: '',
      image: 'assets/merch-2820-tee-black.jpg', description: TEE_DESC
    },
    'tee-white': {
      id: 'tee-white', name: '28:20 Tee', category: 'Tee', group: 'tee',
      color: 'White', swatch: '#EEE5D2', price: 40, badge: '',
      image: 'assets/merch-2820-tee-white.jpg', description: TEE_DESC
    }
  };

  /* --------------------------------------------------------
     Storage + model
  -------------------------------------------------------- */
  function read() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function write(items) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('cart:change'));
  }
  function keyOf(i) { return i.id + '::' + i.size; }
  function count() { return read().reduce(function (n, i) { return n + i.qty; }, 0); }
  function subtotal() { return read().reduce(function (s, i) { return s + i.price * i.qty; }, 0); }
  function money(n) { return '$' + Number(n).toFixed(2); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function addItem(prod) {
    var items = read();
    var match = null;
    for (var i = 0; i < items.length; i++) {
      if (keyOf(items[i]) === keyOf(prod)) { match = items[i]; break; }
    }
    if (match) { match.qty += prod.qty; } else { items.push(prod); }
    write(items);
  }
  function setQty(key, qty) {
    var items = read();
    for (var i = 0; i < items.length; i++) {
      if (keyOf(items[i]) === key) { items[i].qty = qty; }
    }
    items = items.filter(function (i) { return i.qty > 0; });
    write(items);
  }
  function bumpQty(key, delta) {
    var items = read();
    for (var i = 0; i < items.length; i++) {
      if (keyOf(items[i]) === key) { setQty(key, items[i].qty + delta); return; }
    }
  }
  function removeItem(key) {
    write(read().filter(function (i) { return keyOf(i) !== key; }));
  }

  /* --------------------------------------------------------
     Header cart icon (injected on every page)
  -------------------------------------------------------- */
  var BAG_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';

  function injectHeaderIcon() {
    var inner = document.querySelector('.site-header__inner');
    if (!inner || inner.querySelector('.site-header__cart')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'site-header__cart';
    btn.id = 'cart-toggle';
    btn.setAttribute('aria-label', 'Open cart');
    btn.innerHTML = BAG_SVG +
      '<span class="site-header__cart-badge" data-cart-count hidden>0</span>';
    // Sits at the far right of the header, just before the mobile menu button.
    var burger = inner.querySelector('#burger');
    if (burger) { inner.insertBefore(btn, burger); } else { inner.appendChild(btn); }
    btn.addEventListener('click', openDrawer);
  }

  /* --------------------------------------------------------
     Slide-in drawer (injected on every page)
  -------------------------------------------------------- */
  function injectDrawer() {
    if (document.getElementById('cart-drawer')) return;
    var overlay = document.createElement('div');
    overlay.className = 'cart-overlay';
    overlay.id = 'cart-overlay';
    overlay.hidden = true;

    var drawer = document.createElement('aside');
    drawer.className = 'cart-drawer';
    drawer.id = 'cart-drawer';
    drawer.setAttribute('aria-label', 'Shopping cart');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = ''
      + '<div class="cart-drawer__head">'
      +   '<h2 class="cart-drawer__title">Your Cart</h2>'
      +   '<button type="button" class="cart-drawer__close" aria-label="Close cart">&times;</button>'
      + '</div>'
      + '<div class="cart-drawer__body" data-cart-body></div>'
      + '<div class="cart-drawer__foot" data-cart-foot hidden>'
      +   '<div class="cart-drawer__row"><span>Subtotal</span><span data-cart-subtotal>$0.00</span></div>'
      +   '<p class="cart-drawer__note" data-ship-note></p>'
      +   '<a href="checkout.html" class="btn btn--primary cart-drawer__checkout">Checkout &rarr;</a>'
      +   '<button type="button" class="cart-drawer__continue">Continue shopping</button>'
      + '</div>';

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    overlay.addEventListener('click', closeDrawer);
    drawer.querySelector('.cart-drawer__close').addEventListener('click', closeDrawer);
    drawer.querySelector('.cart-drawer__continue').addEventListener('click', closeDrawer);

    // Delegated qty / remove controls
    drawer.querySelector('[data-cart-body]').addEventListener('click', function (e) {
      var line = e.target.closest('[data-line]');
      if (!line) return;
      var key = line.getAttribute('data-line');
      var act = e.target.getAttribute('data-act');
      if (act === 'inc') bumpQty(key, 1);
      else if (act === 'dec') bumpQty(key, -1);
      else if (act === 'remove') removeItem(key);
    });
  }

  function openDrawer() {
    var d = document.getElementById('cart-drawer');
    var o = document.getElementById('cart-overlay');
    if (!d || !o) return;
    o.hidden = false;
    // force reflow so the transition runs
    void d.offsetWidth;
    d.classList.add('is-open');
    o.classList.add('is-open');
    d.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-open');
  }
  function closeDrawer() {
    var d = document.getElementById('cart-drawer');
    var o = document.getElementById('cart-overlay');
    if (!d || !o) return;
    d.classList.remove('is-open');
    o.classList.remove('is-open');
    d.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-open');
    setTimeout(function () { if (!d.classList.contains('is-open')) o.hidden = true; }, 320);
  }

  function lineHTML(item) {
    var key = keyOf(item);
    var swatch = item.swatch || 'var(--cream-warm)';
    var img = item.image ? "url('" + esc(item.image) + "')" : 'none';
    return ''
      + '<div class="cart-line" data-line="' + esc(key) + '">'
      +   '<div class="cart-line__img" style="background-color:' + esc(swatch) + ';background-image:' + img + '"></div>'
      +   '<div class="cart-line__info">'
      +     '<p class="cart-line__name">' + esc(item.name) + '</p>'
      +     '<p class="cart-line__meta">' + (item.color ? esc(item.color) + ' &middot; ' : '') + 'Size ' + esc(item.size) + '</p>'
      +     '<div class="cart-line__qty">'
      +       '<button type="button" class="qty-btn" data-act="dec" aria-label="Decrease quantity">&minus;</button>'
      +       '<span class="qty-num">' + item.qty + '</span>'
      +       '<button type="button" class="qty-btn" data-act="inc" aria-label="Increase quantity">+</button>'
      +     '</div>'
      +   '</div>'
      +   '<div class="cart-line__right">'
      +     '<p class="cart-line__price">' + money(item.price * item.qty) + '</p>'
      +     '<button type="button" class="cart-line__remove" data-act="remove">Remove</button>'
      +   '</div>'
      + '</div>';
  }

  function renderDrawer() {
    var body = document.querySelector('[data-cart-body]');
    var foot = document.querySelector('[data-cart-foot]');
    if (!body || !foot) return;
    var items = read();
    if (!items.length) {
      body.innerHTML = '<div class="cart-empty">'
        + '<p class="cart-empty__title">Your cart is empty</p>'
        + '<p class="cart-empty__sub">Add a piece from the collection to get started.</p>'
        + '<a href="store.html" class="btn btn--secondary btn--sm">Browse the store</a>'
        + '</div>';
      foot.hidden = true;
      return;
    }
    body.innerHTML = items.map(lineHTML).join('');
    foot.hidden = false;
    var sub = subtotal();
    foot.querySelector('[data-cart-subtotal]').textContent = money(sub);
    var note = foot.querySelector('[data-ship-note]');
    if (sub >= FREE_SHIP_AT) {
      note.textContent = "You've unlocked free standard shipping.";
    } else {
      note.textContent = 'Add ' + money(FREE_SHIP_AT - sub) + ' more for free shipping. Taxes & shipping calculated at checkout.';
    }
  }

  /* --------------------------------------------------------
     Badge
  -------------------------------------------------------- */
  function renderBadge() {
    var badges = document.querySelectorAll('[data-cart-count]');
    var c = count();
    badges.forEach(function (b) {
      b.textContent = c;
      if (c > 0) { b.hidden = false; } else { b.hidden = true; }
    });
  }

  /* --------------------------------------------------------
     Product detail page (product.html#<id>)
     Renders one product, a color selector built from its
     group, a size selector, quantity + Add to Cart.
  -------------------------------------------------------- */
  function membersOf(group) {
    return Object.keys(PRODUCTS)
      .map(function (k) { return PRODUCTS[k]; })
      .filter(function (p) { return p.group === group; });
  }

  function wireProductPage() {
    var page = document.getElementById('product-page');
    if (!page) return;
    var q = function (sel) { return page.querySelector(sel); };

    function pickId() {
      var h = (location.hash || '').replace(/^#/, '');
      if (PRODUCTS[h]) return h;
      var qp = new URLSearchParams(location.search).get('id');
      if (qp && PRODUCTS[qp]) return qp;
      return Object.keys(PRODUCTS)[0];
    }

    var st = { id: pickId(), size: null, qty: 1 };

    var gallery = q('[data-gallery]'), badge = q('[data-badge]'), ph = q('[data-ph]');
    var nameEl = q('[data-name]'), priceEl = q('[data-price]'), descEl = q('[data-desc]'), collEl = q('[data-collection]');
    var crumb = document.querySelector('[data-crumb]'), colorLabel = q('[data-color-label]');
    var colorsWrap = q('[data-colors-wrap]'), colorsRow = q('[data-colors]');
    var sizesRow = q('[data-sizes]'), qtyNum = q('[data-qty-num]'), msg = q('[data-msg]');
    var relatedWrap = q('[data-related-wrap]'), relatedGrid = q('[data-related]');

    function setImage(p) {
      if (!gallery) return;
      gallery.style.backgroundColor = p.swatch || 'var(--cream-warm)';
      gallery.style.backgroundImage = "url('" + p.image + "')";
      if (ph) {
        if (/white|cream/i.test(p.color)) ph.classList.add('product-card__ph--ink');
        else ph.classList.remove('product-card__ph--ink');
      }
      var probe = new Image();
      probe.onload = function () { gallery.classList.remove('is-missing'); if (ph) ph.hidden = true; };
      probe.onerror = function () { gallery.classList.add('is-missing'); if (ph) ph.hidden = false; };
      probe.src = p.image;
    }

    function buildSwatches(p) {
      if (!colorsRow || !colorsWrap) return;
      var members = membersOf(p.group);
      if (members.length <= 1) { colorsWrap.style.display = 'none'; return; }
      colorsWrap.style.display = '';
      colorsRow.innerHTML = '';
      members.forEach(function (m) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'product-swatch' + (m.id === st.id ? ' is-active' : '');
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', m.id === st.id ? 'true' : 'false');
        b.setAttribute('aria-label', m.color);
        b.title = m.color;
        b.style.background = m.swatch;
        b.addEventListener('click', function () {
          if (m.id === st.id) return;
          st.id = m.id;
          if (msg) { msg.textContent = ''; msg.className = 'product-actions__msg'; }
          if (history.replaceState) history.replaceState(null, '', 'product.html#' + m.id);
          render();
        });
        colorsRow.appendChild(b);
      });
    }

    function buildSizes() {
      if (!sizesRow) return;
      sizesRow.innerHTML = '';
      SIZES.forEach(function (sz) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'product-size' + (st.size === sz ? ' is-active' : '');
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', st.size === sz ? 'true' : 'false');
        b.textContent = sz;
        b.addEventListener('click', function () {
          st.size = sz;
          buildSizes();
          if (msg && msg.textContent) { msg.textContent = ''; msg.className = 'product-actions__msg'; }
        });
        sizesRow.appendChild(b);
      });
    }

    function buildRelated(p) {
      if (!relatedGrid || !relatedWrap) return;
      var seen = {}, items = [];
      Object.keys(PRODUCTS).forEach(function (k) {
        var r = PRODUCTS[k];
        if (r.group !== p.group && !seen[r.group]) { seen[r.group] = 1; items.push(r); }
      });
      if (!items.length) { relatedWrap.style.display = 'none'; return; }
      relatedWrap.style.display = '';
      relatedGrid.innerHTML = items.map(function (r) {
        return '<a class="product-related-card" href="product.html#' + esc(r.id) + '">'
          + '<span class="product-related-card__img" style="background-color:' + esc(r.swatch || 'var(--cream-warm)') + ";background-image:url('" + esc(r.image) + "')\"></span>"
          + '<span class="product-related-card__body">'
          + '<span class="product-related-card__name">' + esc(r.name) + '</span>'
          + '<span class="product-related-card__price">' + money(r.price) + '</span>'
          + '</span>'
          + '</a>';
      }).join('');
    }

    function render() {
      var p = PRODUCTS[st.id];
      if (!p) return;
      document.title = p.name + ' — ' + p.color + ' · 2820 Church';
      if (collEl) collEl.textContent = (p.category || '2820') + ' Collection';
      if (nameEl) nameEl.textContent = p.name;
      if (priceEl) priceEl.textContent = money(p.price);
      if (descEl) descEl.textContent = p.description || '';
      if (crumb) crumb.textContent = p.name + ' — ' + p.color;
      if (colorLabel) colorLabel.textContent = p.color;
      if (badge) { badge.hidden = !p.badge; badge.textContent = p.badge || ''; }
      if (qtyNum) qtyNum.textContent = String(st.qty);
      setImage(p);
      buildSwatches(p);
      buildSizes();
      buildRelated(p);
    }

    var dec = q('[data-qty-dec]'), inc = q('[data-qty-inc]'), addBtn = q('[data-add]');
    if (dec) dec.addEventListener('click', function () { if (st.qty > 1) { st.qty--; if (qtyNum) qtyNum.textContent = String(st.qty); } });
    if (inc) inc.addEventListener('click', function () { if (st.qty < 20) { st.qty++; if (qtyNum) qtyNum.textContent = String(st.qty); } });
    if (addBtn) addBtn.addEventListener('click', function () {
      if (!st.size) {
        if (msg) { msg.textContent = 'Please select a size first.'; msg.className = 'product-actions__msg is-error'; }
        return;
      }
      var p = PRODUCTS[st.id];
      addItem({
        id: p.id, name: p.name, color: p.color, price: p.price,
        image: p.image, swatch: p.swatch, size: st.size, qty: st.qty
      });
      if (msg) {
        msg.textContent = 'Added to cart — ' + st.qty + ' × ' + p.color + ' / ' + st.size;
        msg.className = 'product-actions__msg is-success';
      }
      openDrawer();
    });

    window.addEventListener('hashchange', function () {
      var id = pickId();
      if (id !== st.id) { st.id = id; render(); }
    });

    render();
  }

  /* --------------------------------------------------------
     Product photo fallback (file not uploaded yet)
  -------------------------------------------------------- */
  function wireImageFallback() {
    document.querySelectorAll('.product-card__img[data-img]').forEach(function (el) {
      var url = el.getAttribute('data-img');
      if (!url) return;
      var probe = new Image();
      probe.onload = function () { el.classList.remove('is-missing'); };
      probe.onerror = function () { el.classList.add('is-missing'); };
      probe.src = url;
    });
  }

  /* --------------------------------------------------------
     Checkout page
  -------------------------------------------------------- */
  function shipping(sub, method) {
    if (method === 'express') return SHIP_EXPRESS;
    return sub >= FREE_SHIP_AT ? 0 : SHIP_STANDARD;
  }

  function renderCheckout() {
    var wrap = document.querySelector('[data-checkout]');
    if (!wrap) return;
    var grid = wrap.querySelector('.checkout__grid');
    var empty = wrap.querySelector('[data-checkout-empty]');
    var items = read();

    if (!items.length) {
      if (grid) grid.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }
    if (grid) grid.hidden = false;
    if (empty) empty.hidden = true;

    var linesEl = wrap.querySelector('[data-checkout-lines]');
    if (linesEl) {
      linesEl.innerHTML = items.map(function (item) {
        var swatch = item.swatch || 'var(--cream-warm)';
        var img = item.image ? "url('" + esc(item.image) + "')" : 'none';
        return ''
          + '<div class="sum-line">'
          +   '<div class="sum-line__img" style="background-color:' + esc(swatch) + ';background-image:' + img + '">'
          +     '<span class="sum-line__qty">' + item.qty + '</span>'
          +   '</div>'
          +   '<div class="sum-line__info">'
          +     '<p class="sum-line__name">' + esc(item.name) + '</p>'
          +     '<p class="sum-line__meta">' + (item.color ? esc(item.color) + ' &middot; ' : '') + 'Size ' + esc(item.size) + '</p>'
          +   '</div>'
          +   '<p class="sum-line__price">' + money(item.price * item.qty) + '</p>'
          + '</div>';
      }).join('');
    }

    var methodInput = wrap.querySelector('input[name="ship-method"]:checked');
    var method = methodInput ? methodInput.value : 'standard';
    var sub = subtotal();
    var ship = shipping(sub, method);
    var total = sub + ship;

    var subEl = wrap.querySelector('[data-checkout-subtotal]');
    var shipEl = wrap.querySelector('[data-checkout-shipping]');
    var totEl = wrap.querySelector('[data-checkout-total]');
    if (subEl) subEl.textContent = money(sub);
    if (shipEl) shipEl.textContent = ship === 0 ? 'FREE' : money(ship);
    if (totEl) totEl.textContent = money(total);

    // reflect free-shipping availability on the standard option label
    var freeTag = wrap.querySelector('[data-free-ship-tag]');
    if (freeTag) freeTag.hidden = sub < FREE_SHIP_AT;
  }

  function wireCheckout() {
    var wrap = document.querySelector('[data-checkout]');
    if (!wrap) return;
    wrap.querySelectorAll('input[name="ship-method"]').forEach(function (r) {
      r.addEventListener('change', renderCheckout);
    });
    var form = wrap.querySelector('[data-checkout-form]');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var note = wrap.querySelector('[data-pay-msg]');
        if (note) {
          note.hidden = false;
          note.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }
  }

  /* --------------------------------------------------------
     Init
  -------------------------------------------------------- */
  function init() {
    injectHeaderIcon();
    injectDrawer();
    renderBadge();
    renderDrawer();
    wireProductPage();
    wireImageFallback();
    wireCheckout();
    renderCheckout();

    document.addEventListener('cart:change', function () {
      renderBadge();
      renderDrawer();
      renderCheckout();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
