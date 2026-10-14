// Motion changes presentation only; content stays visible without animation support.
const revealSelector = [
  '.home-copy > *', '.hero-banner > *', '.section-heading',
  '.workspace-content > h1', '.auth-content > *', '.register-main > *',
  '.card', '.floating-card', '.photo-card', '.project-card', '.media-item',
  '.news-feature', '.news-list > a', '.feature', '.metric', '.file-card',
  '.table-wrap', '.certificate-layout', '.contact-item', '.partner-options > div',
  '.history-stats > div', '.winners > a', '.profile-row', '.test-heading',
  '.question-layout', '.progress-steps', '.upload-zone', '.empty-state',
  '.route-strip > div', '.news-mini', '.partners-strip > div', '.result-grid > div',
  '.document-row', '.article-text > section', '.faq-layout > article', '.notice'
].join(',');
const sceneSelector = '.home-hero, .hero-banner.hero-scene, .auth-scene';
const easing = 'cubic-bezier(.2,.7,.2,1)';

export function initMotion(app, dialog) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const activeAnimations = new Set();
  const pending = new Set();
  const scenes = new Set();
  let seen = new WeakSet(), frame = 0, lastPointer = null;

  function track(animation, done) {
    activeAnimations.add(animation);
    animation.finished.then(() => {
      activeAnimations.delete(animation);
      done?.();
    }, () => {
      activeAnimations.delete(animation);
      done?.();
    });
    if (document.hidden) animation.pause();
  }

  function reveal(element, delay = 0) {
    if (preference.matches || !element.isConnected || element.hidden) return;
    element.dataset.motionSeen = 'true';
    if (!element.animate) return;
    track(element.animate([
      {opacity: 0, transform: 'translateY(14px)'},
      {opacity: 1, transform: 'translateY(0)'}
    ], {duration: 560, delay, easing}));
    const fill = element.matches('.progress-bar') ? element.firstElementChild : element.querySelector('.progress-bar > span');
    if (fill) track(fill.animate([{transform: 'scaleX(0)'}, {transform: 'scaleX(1)'}], {
      duration: 850, delay, easing
    }));
  }

  const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    let order = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting || entry.target.hidden || entry.target.closest('[hidden]')) continue;
      revealObserver.unobserve(entry.target);
      pending.delete(entry.target);
      reveal(entry.target, Math.min(order++ * 45, 180));
    }
  }, {threshold: 0, rootMargin: '0px 0px 40px 0px'}) : null;

  const sceneObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.dataset.motionActive = String(entry.isIntersecting);
  }, {threshold: 0}) : null;

  function collect(root, selector) {
    return [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)];
  }

  function scan(root) {
    if (!(root instanceof Element) || preference.matches) return;
    const isDialog = root === dialog || dialog.contains(root);
    if (!isDialog) {
      for (const element of collect(root, revealSelector)) {
        if (seen.has(element) || element.closest('#dialog')) continue;
        // Animate the outer block once instead of stacking transforms on its children.
        if (element.parentElement?.closest(revealSelector)) continue;
        seen.add(element);
        element.dataset.motion = 'reveal';
        if (revealObserver) {
          pending.add(element);
          revealObserver.observe(element);
        } else reveal(element);
      }
      for (const scene of collect(root, sceneSelector)) {
        if (scenes.has(scene)) continue;
        scenes.add(scene);
        if (!scene.querySelector(':scope > .motion-atmosphere')) {
          const atmosphere = document.createElement('div');
          atmosphere.className = 'motion-atmosphere';
          atmosphere.setAttribute('aria-hidden', 'true');
          for (const [i, [x, y]] of [[12, 20], [30, 62], [51, 16], [72, 51], [88, 23], [42, 78]].entries()) {
            const mote = document.createElement('i');
            mote.style.cssText = `--mote-x:${x}%;--mote-y:${y}%;--mote-delay:-${i * 1.7}s`;
            atmosphere.append(mote);
          }
          scene.append(atmosphere);
        }
        if (sceneObserver) sceneObserver.observe(scene);
        else scene.dataset.motionActive = 'true';
      }
    }
  }

  function prune() {
    for (const element of pending) if (!element.isConnected) {
      revealObserver?.unobserve(element);
      pending.delete(element);
    }
    for (const scene of scenes) if (!scene.isConnected) {
      sceneObserver?.unobserve(scene);
      scenes.delete(scene);
    }
  }

  const mutations = new MutationObserver(records => {
    prune();
    for (const record of records) {
      if (record.type === 'attributes') {
        const element = record.target;
        // A previously hidden tab/filter result gets its entrance when it is shown.
        if (!element.hidden && !element.closest('[hidden]') && element.dataset.motion && element.dataset.motionSeen !== 'true') {
          if (revealObserver) revealObserver.observe(element);
          else reveal(element);
        }
      } else for (const node of record.addedNodes) scan(node);
    }
  });
  mutations.observe(app, {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden']});

  document.addEventListener('pointerdown', event => {
    if (preference.matches || event.button !== 0) return;
    const button = event.target.closest?.('.btn, .tab, .table-pagination button');
    if (!button || button.matches(':disabled') || !button.animate || (!app.contains(button) && !dialog.contains(button))) return;
    const rect = button.getBoundingClientRect();
    const ink = document.createElement('span');
    ink.className = 'motion-ink';
    ink.setAttribute('aria-hidden', 'true');
    ink.style.left = `${event.clientX - rect.left}px`;
    ink.style.top = `${event.clientY - rect.top}px`;
    button.append(ink);
    track(ink.animate([
      {transform: 'translate(-50%,-50%) scale(0)', opacity: .26},
      {transform: `translate(-50%,-50%) scale(${Math.hypot(rect.width, rect.height) / 4})`, opacity: 0}
    ], {duration: 600, easing: 'cubic-bezier(.15,.6,.3,1)'}), () => ink.remove());
  }, {passive: true});

  document.addEventListener('pointermove', event => {
    if (preference.matches || !pointer.matches) return;
    const scene = event.target.closest?.(sceneSelector);
    if (!scene || scene.dataset.motionActive !== 'true') return;
    lastPointer = {scene, x: event.clientX, y: event.clientY};
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!lastPointer || preference.matches || !lastPointer.scene.isConnected) return;
      const {scene, x, y} = lastPointer, rect = scene.getBoundingClientRect();
      scene.style.setProperty('--scene-x', `${((x - rect.left) / rect.width - .5) * 14}px`);
      scene.style.setProperty('--scene-y', `${((y - rect.top) / rect.height - .5) * 10}px`);
    });
  }, {passive: true});

  document.addEventListener('pointerout', event => {
    const scene = event.target.closest?.(sceneSelector);
    if (!scene || (event.relatedTarget instanceof Node && scene.contains(event.relatedTarget))) return;
    scene.style.removeProperty('--scene-x');
    scene.style.removeProperty('--scene-y');
    lastPointer = null;
  }, {passive: true});

  function applyPreference() {
    document.body.dataset.motionMode = preference.matches ? 'reduced' : 'full';
    if (preference.matches) {
      for (const animation of activeAnimations) animation.cancel();
      revealObserver?.disconnect();
      sceneObserver?.disconnect();
      pending.clear();
      scenes.clear();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastPointer = null;
    } else {
      seen = new WeakSet();
      scan(app);
    }
  }
  preference.addEventListener('change', applyPreference);
  document.addEventListener('visibilitychange', () => {
    document.body.dataset.motionPaused = String(document.hidden);
    for (const animation of activeAnimations) document.hidden ? animation.pause() : animation.play();
  });
  document.body.dataset.motionPaused = String(document.hidden);
  applyPreference();
}
