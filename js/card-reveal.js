/* Shared, progressive motion: waiting content remains readable and usable. */
(() => {
  'use strict';
  const main = document.querySelector('main');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!main || location.pathname.endsWith('/assistant-tools.html') || reduced.matches || !('IntersectionObserver' in window)) return;
  const selector = [
    'h1', 'h2', 'p', '.tag', 'article', 'figure', 'form', 'fieldset', 'details',
    '.test', '.step', '.cat', '.demo-card', '.stats', '.limits', '.creds',
    '.toc', '.cta', '.inv', '.study', '.quiz', '.tools-choices',
    '.task-nav > a', '.hub-card', '.hand', '.myth', '.tool', '.eat-teaser', '.portrait', '.row-btns',
    '.invite-copy > *', '[data-motion]'
  ].join(',');
  const excluded = '.hero,.invite-portrait,svg,canvas,table,[aria-hidden="true"],[data-motion="off"]';
  const registered = new WeakSet();
  const pending = new Set();
  const active = new Set();
  let stopped = false;
  const observer = new IntersectionObserver(entries => {
    // DOM order keeps heading, explanation and cards in a predictable sequence.
    const entering = entries.filter(e => e.isIntersecting)
      .sort((a,b) => a.target.compareDocumentPosition(b.target) & 2 ? 1 : -1);
    entering.forEach((entry, index) => {
      const el = entry.target;
      if (!pending.has(el)) return;
      observer.unobserve(el);
      pending.delete(el);
      el.dataset.revealPlayed = 'true';
      el.classList.remove('motion-pending');
      // Never interrupt a person typing or using a control inside a card.
      if (el.contains(document.activeElement)) return;
      el.style.setProperty('--motion-delay', `${Math.max(0, Math.min([...el.parentElement.children].filter(sibling => pending.has(sibling) || sibling.dataset.revealPlayed === 'true').indexOf(el), 3)) * 60}ms`);
      el.classList.add('motion-enter');
      active.add(el);
      const clean = () => {
        el.classList.remove('motion-enter');
        el.style.removeProperty('--motion-delay');
        active.delete(el);
      };
      el.addEventListener('animationend', e => { if(e.target === el) clean(); }, {once:true});
      // Also clean up if an existing component rule cancels the animation.
      setTimeout(clean, 1500);
    });
  }, {threshold: 0, rootMargin: '0px 0px 24px 0px'});
  function collect(root) {
    if (stopped) return;
    const candidates = [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)];
    candidates.forEach(el => {
      if (registered.has(el) || el.closest(excluded)) return;
      // One animation per meaningful group, never parent + children together.
      const parent = el.parentElement?.closest(selector);
      if (parent && main.contains(parent) && !parent.closest(excluded)) return;
      registered.add(el);
      // Visible content must never disappear to start its entry animation.
      if (el.getBoundingClientRect().top < (window.visualViewport?.height || innerHeight) + 24) {
        el.dataset.revealPlayed = 'true';
        return;
      }
      el.classList.add('motion-pending');
      pending.add(el);
      observer.observe(el);
    });
  }
  const mutations = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === 1) collect(node);
    }));
    pending.forEach(el => { if (!el.isConnected) { observer.unobserve(el); pending.delete(el); } });
  });
  function stop() {
    stopped = true;
    observer.disconnect();
    mutations.disconnect();
    active.forEach(el => { el.classList.remove('motion-enter'); el.style.removeProperty('--motion-delay'); });
    pending.forEach(el => el.classList.remove('motion-pending'));
    pending.clear(); active.clear();
  }
  document.documentElement.classList.add('unified-motion');
  collect(main);
  mutations.observe(main, {childList: true, subtree: true});
  document.addEventListener('focusin', event => {
    pending.forEach(el => { if (el.contains(event.target)) {
      el.classList.remove('motion-pending'); observer.unobserve(el); pending.delete(el);
    } });
    if (!event.target.matches(':focus-visible')) return;
    active.forEach(el => { if (el.contains(event.target)) { el.classList.remove('motion-enter'); active.delete(el); } });
  });
  addEventListener('beforeprint', stop);
  // Browser find, anchor jumps and page restore must never leave a target hidden.
  addEventListener('hashchange', () => {
    pending.forEach(el => { if (el.matches(':target') || el.querySelector(':target')) {
      el.classList.remove('motion-pending');
    } });
  });
  addEventListener('pageshow', e => { if (e.persisted) stop(); });
  reduced.addEventListener('change', () => { if (reduced.matches) stop(); });
})();
