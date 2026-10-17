/* Tanvir.Studio | Interactions and animation engine (no dependencies) */
(function () {
  'use strict';
  function run() {

  var doc = document;
  var root = doc.documentElement;
  var body = doc.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }

  /* ---------- Split headline into animated words ---------- */
  $$('[data-split]').forEach(function (el) {
    el.classList.add('split-words');
    var idx = 0;
    var frag = doc.createDocumentFragment();
    el.childNodes.forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(' ')); return; }
          var w = doc.createElement('span'); w.className = 'w';
          var s = doc.createElement('span'); s.textContent = part; s.style.setProperty('--i', idx++);
          w.appendChild(s); frag.appendChild(w);
        });
      } else {
        frag.appendChild(node.cloneNode(true));
      }
    });
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    el.innerHTML = '';
    el.appendChild(frag);
    $$('.w', el).forEach(function (w) { w.setAttribute('aria-hidden', 'true'); });
  });

  /* ---------- Preloader (first visit per session only) ---------- */
  var pre = $('.preloader');
  var started = false;
  function start() {
    if (started) return;
    started = true;
    body.classList.add('ready');
    initReveals();
    initCounters();
  }
  function hidePreloader() {
    if (!pre) return start();
    pre.classList.add('done');
    setTimeout(start, 350);
    setTimeout(function () { if (pre && pre.parentNode) pre.parentNode.removeChild(pre); }, 1400);
  }
  var skipPre = root.classList.contains('skip-pre') || reduce;
  if (pre && skipPre) { pre.parentNode.removeChild(pre); pre = null; }
  try { sessionStorage.setItem('ts-pre', '1'); } catch (e) {}
  if (pre) {
    var minWait = new Promise(function (r) { setTimeout(r, 1400); });
    var loaded = new Promise(function (r) {
      if (doc.readyState === 'complete') r(); else window.addEventListener('load', r);
    });
    Promise.all([minWait, loaded]).then(hidePreloader);
    setTimeout(hidePreloader, 3500);
  } else {
    start();
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveals() {
    var targets = $$('[data-reveal], .split-words, .process, .skills');
    if (!('IntersectionObserver' in window) || reduce) {
      targets.forEach(function (t) { t.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (t) {
      var d = t.getAttribute('data-delay');
      if (d) t.style.setProperty('--d', d + 'ms');
      io.observe(t);
    });
  }

  /* ---------- Counters ---------- */
  function initCounters() {
    var nums = $$('[data-count]');
    if (!nums.length) return;
    function run(el) {
      var end = parseFloat(el.getAttribute('data-count'));
      var suffix = el.getAttribute('data-suffix') || '';
      if (reduce) { el.textContent = end + suffix; return; }
      var dur = 1800, t0 = null;
      function tick(t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        var e = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(end * e) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
    if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---------- Header, progress, to-top ---------- */
  var header = $('.site-header');
  var progress = $('.progress');
  var toTop = $('.to-top');
  var lastY = 0, ticking = false;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var h = doc.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    if (header) {
      header.classList.toggle('scrolled', y > 24);
      var open = body.classList.contains('menu-open');
      header.classList.toggle('hide', !open && window.innerWidth > 900 && y > 500 && y > lastY + 6);
      if (y < lastY - 6) header.classList.remove('hide');
    }
    if (toTop) toTop.classList.toggle('show', y > 700);
    $$('[data-parallax]').forEach(function (el) {
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0.1;
      var r = el.getBoundingClientRect();
      var offset = (r.top + r.height / 2 - window.innerHeight / 2) * speed;
      el.style.transform = 'translate3d(0,' + (-offset).toFixed(1) + 'px,0)';
    });
    lastY = y; ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  /* ---------- Mobile menu ---------- */
  var menuBtn = $('.menu-btn');
  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      var open = body.classList.toggle('menu-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      body.style.overflow = open ? 'hidden' : '';
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && body.classList.contains('menu-open')) menuBtn.click();
    });
  }

  /* ---------- Opening the files straight from a folder: use .html links ---------- */
  if (location.protocol === 'file:') {
    var LOCAL = { '/': 'index.html', '/about': 'about.html', '/services': 'services.html', '/portfolio': 'portfolio.html', '/pricing': 'pricing.html', '/blog': 'blog.html', '/contact': 'contact.html' };
    $$('a[href^="/"]').forEach(function (a) {
      var h = a.getAttribute('href'), hash = '', i = h.indexOf('#');
      if (i > -1) { hash = h.slice(i); h = h.slice(0, i); }
      if (LOCAL[h]) a.setAttribute('href', LOCAL[h] + hash);
    });
  }

  /* ---------- Page transitions ---------- */
  var wipe = $('.page-wipe');
  $$('a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|https?:|\/\/)/i.test(href) || a.target === '_blank') return;
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reduce || !wipe) return;
      e.preventDefault();
      wipe.classList.add('leaving');
      setTimeout(function () { window.location.href = href; }, 520);
    });
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && wipe) wipe.classList.remove('leaving');
  });

  /* ---------- Custom cursor ---------- */
  if (finePointer && !reduce) {
    var dot = doc.createElement('div'); dot.className = 'cursor-dot';
    var ring = doc.createElement('div'); ring.className = 'cursor-ring';
    body.appendChild(dot); body.appendChild(ring);
    body.classList.add('has-cursor');
    var mx = 0, my = 0, rx = 0, ry = 0;
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!body.classList.contains('moved')) { rx = mx; ry = my; body.classList.add('moved'); }
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    });
    (function loop() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px)';
      requestAnimationFrame(loop);
    })();
    doc.addEventListener('mouseover', function (e) {
      ring.classList.toggle('hover', !!e.target.closest('a, button, .tile, .bento-card, input, select, textarea, label'));
    });
  }

  /* ---------- Tilt and magnetic effects ---------- */
  if (finePointer && !reduce) {
    $$('[data-tilt]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(1100px) rotateY(' + (x * 9).toFixed(2) + 'deg) rotateX(' + (-y * 9).toFixed(2) + 'deg)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2);
        var y = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (x * 0.28).toFixed(1) + 'px,' + (y * 0.4).toFixed(1) + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- Portfolio filters ---------- */
  var fbar = $('[data-filters]');
  if (fbar) {
    var tiles = $$('.tile[data-cat]');
    $$('.filter', fbar).forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('.filter', fbar).forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
        var cat = btn.getAttribute('data-filter');
        tiles.forEach(function (t, i) {
          var show = cat === 'all' || t.getAttribute('data-cat') === cat;
          t.classList.toggle('hide', !show);
          t.classList.remove('pop');
          if (show) { void t.offsetWidth; t.style.animationDelay = (i * 40) + 'ms'; t.classList.add('pop'); }
        });
      });
    });
  }

  /* ---------- Pricing tabs ---------- */
  var seg = $('.seg');
  if (seg) {
    var pill = $('.slider', seg);
    var btns = $$('button', seg);
    function place(btn) {
      pill.style.width = btn.offsetWidth + 'px';
      pill.style.transform = 'translateX(' + (btn.offsetLeft - 6) + 'px)';
    }
    function select(btn) {
      btns.forEach(function (b) { b.classList.remove('on'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('on'); btn.setAttribute('aria-selected', 'true');
      $$('.price-panel').forEach(function (p) { p.classList.toggle('on', p.id === btn.getAttribute('data-tab')); });
      place(btn);
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { select(b); }); });
    var hash = (location.hash || '').replace('#', '');
    var first = btns.filter(function (b) { return b.getAttribute('data-tab') === 'panel-' + hash; })[0] || btns[0];
    select(first);
    window.addEventListener('resize', function () { place($('button.on', seg)); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { place($('button.on', seg)); });
  }

  /* ---------- FAQ accordion ---------- */
  $$('.faq-q').forEach(function (q) {
    q.addEventListener('click', function () {
      var item = q.parentNode;
      var open = !item.classList.contains('open');
      $$('.faq-item.open', item.parentNode).forEach(function (o) {
        o.classList.remove('open'); $('.faq-q', o).setAttribute('aria-expanded', 'false');
      });
      if (open) { item.classList.add('open'); q.setAttribute('aria-expanded', 'true'); }
    });
  });

  /* ---------- Contact form: sends the message to the studio inbox ---------- */
  var form = $('#contact-form');
  if (form) {
    var CONTACT_EMAIL = form.getAttribute('data-email');
    var okText = $('.form-ok .ok-text', form);
    var submitBtn = $('button[type=submit]', form);
    function done(msg) {
      if (okText && msg) okText.innerHTML = msg;
      form.classList.add('sent');
      form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      $$('.field[data-required]', form).forEach(function (f) {
        var input = $('input, select, textarea', f);
        var v = (input.value || '').trim();
        var bad = !v || (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
        f.classList.toggle('err', bad);
        if (bad) ok = false;
      });
      if (!ok) { var firstErr = $('.field.err input, .field.err select, .field.err textarea', form); if (firstErr) firstErr.focus(); return; }

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      if (data._honey) return; /* spam trap */

      var subject = 'New website inquiry: ' + (data.service || 'General') + ' | ' + data.name;
      var text = 'Name: ' + data.name + '\nEmail: ' + data.email + '\nCompany: ' + (data.company || '-') +
        '\nService: ' + (data.service || '-') + '\nBudget: ' + (data.budget || '-') + '\nTimeline: ' + (data.timeline || '-') +
        '\n\nProject details:\n' + data.message;
      function fallback() {
        window.location.href = 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text);
        done('We could not send your message automatically, so your email app has been opened with the details filled in. You can also write to <a href="mailto:' + CONTACT_EMAIL + '" style="color:var(--blue);font-weight:700">' + CONTACT_EMAIL + '</a> or message us on WhatsApp.');
      }

      var endpoint = form.getAttribute('data-endpoint');
      var tasks = [];
      if (window.TSApi && window.TSApi.configured) {
        tasks.push(window.TSApi.insert('messages', {
          name: data.name, email: data.email, company: data.company || '', service: data.service || '',
          budget: data.budget || '', timeline: data.timeline || '', message: data.message
        }));
      }
      if (endpoint) {
        tasks.push(fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ name: data.name, email: data.email, company: data.company || '-', service: data.service || '-', budget: data.budget || '-',
            timeline: data.timeline || '-', message: data.message, _subject: subject, _replyto: data.email, _template: 'table', _captcha: 'false' }) })
          .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) {
            if (!(r.ok && (j.success === true || j.success === 'true'))) throw new Error('mail failed');
            return true; }); }));
      }
      if (!tasks.length) return fallback();
      if (submitBtn) submitBtn.setAttribute('disabled', 'disabled');
      Promise.allSettled(tasks).then(function (results) {
        var ok = results.some(function (r) { return r.status === 'fulfilled'; });
        if (ok) done('Your message has been sent. We will reply within one business day.');
        else { if (submitBtn) submitBtn.removeAttribute('disabled'); fallback(); }
      });
    });
    $$('.field input, .field select, .field textarea', form).forEach(function (i) {
      i.addEventListener('input', function () { i.closest('.field').classList.remove('err'); });
    });
  }

  /* ---------- Newsletter (demo handler) ---------- */
  $$('[data-newsletter]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('button', f);
      if (btn) btn.innerHTML = 'Subscribed';
      var i = $('input', f); if (i) i.value = '';
    });
  });

  /* ---------- Typing headline ---------- */
  $$('[data-typed]').forEach(function (el) {
    var words = (el.getAttribute('data-words') || '').split('|').map(function (w) { return w.trim(); }).filter(Boolean);
    if (words.length < 2 || reduce) { if (words[0]) el.textContent = words[0]; return; }
    var i = 0, j = words[0].length, erasing = true;
    el.textContent = words[0];
    function tick() {
      var w = words[i];
      if (erasing) {
        j--; el.textContent = w.slice(0, j);
        if (j <= 0) { erasing = false; i = (i + 1) % words.length; return setTimeout(tick, 380); }
        return setTimeout(tick, 34);
      }
      var next = words[i];
      j++; el.textContent = next.slice(0, j);
      if (j >= next.length) { erasing = true; return setTimeout(tick, 2100); }
      setTimeout(tick, 70);
    }
    setTimeout(tick, 2400);
  });

  /* ---------- Footer year ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }
  (window.TSReady || Promise.resolve()).then(run);
})();
