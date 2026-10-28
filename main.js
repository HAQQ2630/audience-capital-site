// ─── Config ────────────────────────────────────────────────────────────
// WhatsApp number that receives audit requests: international format,
// digits only, no "+" or spaces. Example for a UAE number: '971501234567'.
const WHATSAPP_NUMBER = '';
// ───────────────────────────────────────────────────────────────────────

(() => {
  const root = document.documentElement;
  const dict = window.AC_I18N || { ar: {}, en: {} };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lang = 'en';

  /* ── Language ── */
  const nodes = [...document.querySelectorAll('[data-i18n]')];
  const english = new Map(nodes.map((el) => [el, el.innerHTML]));
  const metaDesc = document.querySelector('meta[name="description"]');
  const enMeta = { title: document.title, description: metaDesc.content };
  const toggle = document.querySelector('[data-lang-toggle]');
  const chatCap = document.querySelector('.chat__cap');

  const form = document.getElementById('audit-form');
  const status = document.getElementById('form-status');
  const required = ['name', 'handle', 'size', 'niche'];

  const t = (key) => (dict[lang] && dict[lang][key]) || (dict.en && dict.en[key]) || '';

  function store(value) {
    try { localStorage.setItem('ac-lang', value); } catch (e) { /* storage unavailable */ }
  }
  function stored() {
    try { return localStorage.getItem('ac-lang'); } catch (e) { return null; }
  }

  function applyLang(next) {
    lang = next === 'ar' ? 'ar' : 'en';
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';

    nodes.forEach((el) => {
      const key = el.dataset.i18n;
      el.innerHTML = lang === 'ar' && dict.ar[key] ? dict.ar[key] : english.get(el);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });

    document.title = lang === 'ar' ? dict.ar['meta.title'] : enMeta.title;
    metaDesc.content = lang === 'ar' ? dict.ar['meta.description'] : enMeta.description;

    toggle.innerHTML = lang === 'ar'
      ? '<span class="lang__full">English</span><span class="lang__short">EN</span>'
      : '<span class="lang__full">العربية</span><span class="lang__short">عربي</span>';
    toggle.lang = lang === 'ar' ? 'en' : 'ar';
    if (chatCap) { chatCap.lang = lang; chatCap.dir = root.dir; }

    try {
      const url = new URL(window.location.href);
      if (lang === 'ar') url.searchParams.set('lang', 'ar'); else url.searchParams.delete('lang');
      history.replaceState(null, '', url);
    } catch (e) { /* sandboxed frames can refuse URL changes */ }

    clearErrors();
    document.dispatchEvent(new Event('ac:lang'));
  }

  const param = new URLSearchParams(window.location.search).get('lang');
  const initial = param || stored() || ((navigator.language || '').toLowerCase().startsWith('ar') ? 'ar' : 'en');
  if (initial === 'ar') applyLang('ar');

  toggle.addEventListener('click', () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    if (document.startViewTransition && !reduceMotion) document.startViewTransition(() => applyLang(next));
    else applyLang(next);
    store(next);
  });

  /* ── Nav border on scroll ── */
  const nav = document.querySelector('.nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── Reveal on scroll (siblings stagger in) ── */
  document.querySelectorAll('.reveal').forEach((el) => {
    const group = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    el.style.setProperty('--stagger', Math.min(group.indexOf(el), 5));
  });
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealIO.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  document.querySelectorAll('.reveal, .chat').forEach((el) => revealIO.observe(el));

  /* ── Hero flow: steps light up in sequence, then loop ── */
  const heroSteps = [...document.querySelectorAll('.flow--hero li')];
  if (reduceMotion) {
    heroSteps.forEach((li) => li.classList.add('is-on'));
  } else {
    let i = 0;
    const tick = () => {
      if (i < heroSteps.length) {
        heroSteps[i].classList.add('is-on');
        i += 1;
        setTimeout(tick, i === heroSteps.length ? 3200 : 850);
      } else {
        heroSteps.forEach((li) => li.classList.remove('is-on'));
        i = 0;
        setTimeout(tick, 600);
      }
    };
    setTimeout(tick, 500);
  }

  /* ── Hero rotating word ── */
  function rotate() {
    const rot = document.querySelector('[data-rotator]');
    if (!rot) return;
    const words = [...rot.children];
    let i = words.findIndex((w) => w.classList.contains('on'));
    if (i < 0) {
      words.forEach((w, n) => {
        w.classList.toggle('on', n === 0);
        w.setAttribute('aria-hidden', String(n !== 0));
      });
      return;
    }
    if (reduceMotion) return;
    const next = (i + 1) % words.length;
    words.forEach((w) => w.classList.remove('out'));
    words[i].classList.replace('on', 'out');
    words[i].setAttribute('aria-hidden', 'true');
    words[next].classList.add('on');
    words[next].setAttribute('aria-hidden', 'false');
  }
  rotate();
  setInterval(() => { if (!document.hidden) rotate(); }, 2800);
  document.addEventListener('ac:lang', rotate);

  /* ── Closing panel: opens once in view, then the headline rises word by word ── */
  const closer = document.querySelector('[data-closer]');
  const closerBtn = closer.querySelector('.closer__btn');

  function splitWords() {
    const title = closer.querySelector('[data-words]');
    const text = title.textContent.trim();
    title.setAttribute('aria-label', text);
    title.innerHTML = text.split(/\s+/)
      .map((w, n) => `<span class="cw" aria-hidden="true" style="--i:${n}">${w}</span>`)
      .join(' ');
    const count = title.querySelectorAll('.cw').length;
    closerBtn.style.setProperty('--btn-delay', `${0.7 + count * 0.07}s`);
  }

  const closerIO = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    closer.classList.add('is-open');
    closerIO.disconnect();
  }, { threshold: 0.25 });
  closerIO.observe(closer);
  document.addEventListener('ac:lang', splitWords);
  splitWords();

  /* ── Accordion + stage ── */
  const items = [...document.querySelectorAll('.acc__item')];
  const stages = [...document.querySelectorAll('.flow--stage')];

  function play(index) {
    stages.forEach((s, n) => {
      s.hidden = n !== index;
      s.classList.remove('is-playing');
    });
    const active = stages[index];
    if (!active) return;
    void active.offsetWidth; // restart the animation
    active.classList.add('is-playing');
  }

  items.forEach((item, index) => {
    const btn = item.querySelector('.acc__btn');
    btn.addEventListener('click', () => {
      const opening = !item.classList.contains('is-open');
      items.forEach((other) => {
        other.classList.remove('is-open');
        other.querySelector('.acc__btn').setAttribute('aria-expanded', 'false');
      });
      if (opening) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        play(index);
      }
    });
  });

  const stage = document.querySelector('.stage');
  if (stage) {
    const stageIO = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      const open = items.findIndex((it) => it.classList.contains('is-open'));
      play(open < 0 ? 0 : open);
      stageIO.disconnect();
    }, { threshold: 0.3 });
    stageIO.observe(stage);
  }

  /* ── Mobile CTA dock ── */
  const dock = document.querySelector('[data-dock]');
  const dockLink = dock.querySelector('a');
  const hero = document.querySelector('.hero');
  const finalCta = document.querySelector('#audit');
  const seen = { hero: true, cta: false, closer: false };
  const setDock = () => {
    const show = !seen.hero && !seen.cta && !seen.closer;
    dock.classList.toggle('is-visible', show);
    dock.setAttribute('aria-hidden', String(!show));
    dockLink.tabIndex = show ? 0 : -1;
  };
  const dockIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target === hero) seen.hero = entry.isIntersecting;
      if (entry.target === finalCta) seen.cta = entry.isIntersecting;
      if (entry.target === closer) seen.closer = entry.isIntersecting;
    });
    setDock();
  });
  dockIO.observe(hero);
  dockIO.observe(finalCta);
  dockIO.observe(closer);

  /* ── Audit form → WhatsApp ── */
  function clearErrors() {
    required.forEach((name) => {
      form.elements[name].removeAttribute('aria-invalid');
      form.elements[name].removeAttribute('aria-describedby');
      document.getElementById(`e-${name}`).hidden = true;
    });
    status.textContent = '';
    status.classList.remove('is-error');
  }

  required.forEach((name) => {
    const field = form.elements[name];
    const evt = field.tagName === 'SELECT' ? 'change' : 'input';
    field.addEventListener(evt, () => {
      if (field.value.trim()) {
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
        document.getElementById(`e-${name}`).hidden = true;
      }
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearErrors();

    const invalid = required.filter((name) => !form.elements[name].value.trim());
    invalid.forEach((name) => {
      const field = form.elements[name];
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', `e-${name}`);
      document.getElementById(`e-${name}`).hidden = false;
    });
    if (invalid.length) {
      status.textContent = t('form.fixErrors');
      status.classList.add('is-error');
      form.elements[invalid[0]].focus();
      return;
    }

    const number = WHATSAPP_NUMBER.replace(/\D/g, '');
    if (!number) {
      status.textContent = t('form.noNumber');
      status.classList.add('is-error');
      console.warn('Audience Capital: set WHATSAPP_NUMBER at the top of main.js');
      return;
    }

    const label = (name) => {
      const el = form.elements[name];
      return el.tagName === 'SELECT' ? el.options[el.selectedIndex].text : el.value.trim();
    };
    let handle = label('handle');
    if (!handle.startsWith('@') && !handle.includes('/')) handle = `@${handle}`;

    const lines = [
      t('wa.intro'),
      '',
      `${t('wa.name')}: ${label('name')}`,
      `${t('wa.handle')}: ${handle}`,
      `${t('wa.size')}: ${label('size')}`,
      `${t('wa.niche')}: ${label('niche')}`
    ];
    const note = label('note');
    if (note) lines.push(`${t('wa.note')}: ${note}`);

    const url = `https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`;
    status.textContent = t('form.opening');
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.click();
  });

  /* ── Revenue estimator ── */
  const calc = document.querySelector('[data-calc]');
  if (calc) {
    const range = calc.querySelector('#calc-followers');
    const out = calc.querySelector('#calc-followers-out');
    const totalEl = calc.querySelector('[data-calc-total]');
    const labelEl = calc.querySelector('[data-calc-label]');
    const mathEl = calc.querySelector('[data-calc-math]');
    // Benchmark rates: share of followers who buy, and price in USD.
    const offers = {
      coaching: { rate: 0.0005, price: 300 },
      community: { rate: 0.005, price: 39 },
      product: { rate: 0.01, price: 49 }
    };
    const rates = { USD: 1, AED: 3.6725, SAR: 3.75 };
    let shown = 0;
    let anim = 0;
    let curTouched = false;

    const picked = (name) => calc.querySelector(`input[name="${name}"]:checked`).value;
    const num = (n) => Math.round(n).toLocaleString('en-US');
    const money = (n, cur) => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(Math.round(n));
    const pct = (r) => `${+(r * 100).toFixed(2)}%`;

    function countTo(target, cur) {
      cancelAnimationFrame(anim);
      if (reduceMotion) { shown = target; totalEl.textContent = money(target, cur); return; }
      const from = shown;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / 450, 1);
        shown = from + (target - from) * (1 - Math.pow(1 - p, 3));
        totalEl.textContent = money(shown, cur);
        if (p < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    }

    function update() {
      const followers = +range.value;
      const key = picked('calc-offer');
      const cur = picked('calc-cur');
      const offer = offers[key];
      const buyers = Math.round(followers * offer.rate);
      // Local prices are rounded to a clean figure so buyers × price adds up on screen.
      const price = cur === 'USD' ? offer.price : Math.round((offer.price * rates[cur]) / 5) * 5;
      const fill = ((followers - range.min) / (range.max - range.min)) * 100;
      range.style.setProperty('--p', `${fill}%`);
      out.textContent = num(followers);
      range.setAttribute('aria-valuetext', `${num(followers)} ${t('calc.followersUnit')}`);
      labelEl.textContent = t(`calc.label.${key}`);
      mathEl.innerHTML = '';
      [
        [t('calc.m.followers'), num(followers)],
        [`${t(`calc.m.buyers.${key}`)} (${pct(offer.rate)})`, num(buyers)],
        [t(`calc.m.price.${key}`), money(price, cur)]
      ].forEach(([k, v]) => {
        const li = document.createElement('li');
        const a = document.createElement('span');
        const b = document.createElement('span');
        a.textContent = k;
        b.textContent = v;
        b.dir = 'ltr';
        li.append(a, b);
        mathEl.append(li);
      });
      countTo(buyers * price, cur);
    }

    range.addEventListener('input', update);
    calc.querySelectorAll('input[type="radio"]').forEach((input) => input.addEventListener('change', () => {
      if (input.name === 'calc-cur') curTouched = true;
      update();
    }));
    const syncLang = () => {
      // Arabic visitors see dirhams by default until they choose a currency.
      if (!curTouched) calc.querySelector(`input[name="calc-cur"][value="${lang === 'ar' ? 'AED' : 'USD'}"]`).checked = true;
      update();
    };
    document.addEventListener('ac:lang', syncLang);
    syncLang();
  }

  /* ── Footer year ── */
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
  window.AC_READY = true;
})();
