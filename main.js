import * as THREE from 'three';

/* ---------- GSAP + Lenis (globals from <script>) ---------- */
gsap.registerPlugin(ScrollTrigger);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
window.lenis = lenis;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

/* ---------- Neural network background ---------- */
(function neural() {
  const canvas = document.querySelector('#bg');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  const scene = new THREE.Scene();
  let aspect = innerWidth / innerHeight;
  const cam = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0, 10);
  cam.position.z = 2;

  const N = innerWidth < 700 ? 46 : 90;
  const R = 0.42;                       // link distance
  const cA = new THREE.Color(0x5ef6c6); // rhizome
  const cB = new THREE.Color(0xa45bff); // axerrio
  const nodes = [];
  for (let i = 0; i < N; i++) {
    nodes.push({
      x: (Math.random() * 2 - 1) * aspect, y: Math.random() * 2 - 1,
      vx: (Math.random() - 0.5) * 0.02, vy: (Math.random() - 0.5) * 0.02,
      c: cA.clone().lerp(cB, Math.random()),
    });
  }

  // points
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(N * 3);
  const pCol = new Float32Array(N * 3);
  nodes.forEach((n, i) => { pCol[i * 3] = n.c.r; pCol[i * 3 + 1] = n.c.g; pCol[i * 3 + 2] = n.c.b; });
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 3.6, sizeAttenuation: false, color: 0x9ff8dd, transparent: true, opacity: 0.92 }));
  scene.add(points);

  // lines
  const MAX = (N * (N - 1)) / 2;
  const lGeo = new THREE.BufferGeometry();
  const lPos = new Float32Array(MAX * 2 * 3);
  const lCol = new Float32Array(MAX * 2 * 3);
  lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3));
  lGeo.setAttribute('color', new THREE.BufferAttribute(lCol, 3));
  const lines = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({ color: 0x4fd8b6, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending }));
  scene.add(lines);

  const mouse = { x: 0, y: 0, on: false };
  addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / innerWidth * 2 - 1) * aspect;
    mouse.y = -(e.clientY / innerHeight * 2 - 1);
    mouse.on = true;
  });
  addEventListener('resize', () => {
    aspect = innerWidth / innerHeight;
    cam.left = -aspect; cam.right = aspect; cam.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  renderer.setAnimationLoop(() => {
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x > aspect || n.x < -aspect) n.vx *= -1;
      if (n.y > 1 || n.y < -1) n.vy *= -1;
      if (mouse.on) {
        const dx = mouse.x - n.x, dy = mouse.y - n.y, d = Math.hypot(dx, dy);
        if (d < 0.55) { n.x += dx * 0.004; n.y += dy * 0.004; }
      }
    }
    nodes.forEach((n, i) => { pPos[i * 3] = n.x; pPos[i * 3 + 1] = n.y; pPos[i * 3 + 2] = 0; });
    pGeo.attributes.position.needsUpdate = true;

    let s = 0;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const a = nodes[i], b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < R) {
          const al = 1 - d / R;
          const o = s * 6;
          lPos[o] = a.x; lPos[o + 1] = a.y; lPos[o + 2] = 0;
          lPos[o + 3] = b.x; lPos[o + 4] = b.y; lPos[o + 5] = 0;
          lCol[o] = a.c.r * al; lCol[o + 1] = a.c.g * al; lCol[o + 2] = a.c.b * al;
          lCol[o + 3] = b.c.r * al; lCol[o + 4] = b.c.g * al; lCol[o + 5] = b.c.b * al;
          s++;
        }
      }
    }
    lGeo.setDrawRange(0, s * 2);
    lGeo.attributes.position.needsUpdate = true;
    lGeo.attributes.color.needsUpdate = true;
    renderer.render(scene, cam);
  });
})();

/* ---------- custom cursor + magnetic ---------- */
(function cursor() {
  if (matchMedia('(hover:none)').matches) return;
  const cur = document.querySelector('.cursor');
  const dot = document.querySelector('.cursor-dot');
  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
  addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; gsap.set(dot, { x: mx, y: my }); });
  gsap.ticker.add(() => { cx += (mx - cx) * 0.15; cy += (my - cy) * 0.15; gsap.set(cur, { x: cx, y: cy }); });
  document.querySelectorAll('a,button,.magnetic').forEach((el) => {
    el.addEventListener('pointerenter', () => gsap.to(cur, { scale: 2.2, duration: .3 }));
    el.addEventListener('pointerleave', () => gsap.to(cur, { scale: 1, duration: .3 }));
  });
  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.4, y: (e.clientY - r.top - r.height / 2) * 0.4, duration: .4 }); });
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1,0.3)' }));
  });
})();

/* ---------- film: play with sound + loop, as early as the browser allows ----------
   Browsers block audio before the first user gesture. So: try to play with sound
   immediately; if blocked, fall back to muted playback and unmute on the very first
   interaction (click / scroll / key / touch). It loops from then on. */
(function filmSound() {
  const v = document.querySelector('.film-video');
  if (!v) return;
  v.loop = true;

  const withSound = () => { v.muted = false; v.volume = 1; return v.play(); };

  // 1) try immediately (works only if this page already had a gesture)
  withSound().catch(() => {
    // 2) blocked: play muted so it is already running, then unmute on first gesture
    v.muted = true;
    v.play().catch(() => {});
  });

  let unlocked = false;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    v.muted = false;
    v.volume = 1;
    v.play().catch(() => {});
  };
  ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'].forEach((ev) =>
    addEventListener(ev, unlock, { once: true, passive: true }));
})();

/* ---------- preloader ---------- */
function boot() {
  const pre = document.querySelector('#preloader');
  const count = pre.querySelector('.count');
  const n = { v: 0 };
  gsap.to(n, { v: 100, duration: 1.5, ease: 'power2.inOut',
    onUpdate: () => (count.textContent = Math.round(n.v)),
    onComplete: () => gsap.to(pre, { yPercent: -100, duration: 0.9, ease: 'expo.inOut',
      onComplete: () => { pre.style.display = 'none'; revealHero(); ScrollTrigger.refresh(); } }),
  });
}

function revealHero() {
  const tl = gsap.timeline();
  document.querySelectorAll('.hero-title .reveal').forEach((el) => {
    const sp = new SplitType(el, { types: 'chars' });
    tl.from(sp.chars, { yPercent: 120, opacity: 0, rotateX: -40, stagger: 0.03, duration: 1, ease: 'expo.out' }, 0);
  });
  tl.from('.hero .reveal-line', { y: 30, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out' }, 0.35);
  gsap.to('.scroll-cue', { y: 10, opacity: 0.4, repeat: -1, yoyo: true, duration: 1, ease: 'sine.inOut' });
}

/* ---------- scroll reveals ---------- */
function scrollFx() {
  gsap.utils.toArray('.panel').forEach((panel) => {
    const items = panel.querySelectorAll('.reveal');
    if (!items.length) return;
    gsap.from(items, {
      y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: panel, start: 'top 72%' },
    });
  });

  // pinned "after" — scrub the heading + stagger cards
  const after = document.querySelector('#after');
  if (after && innerWidth > 760) {
    gsap.timeline({ scrollTrigger: { trigger: after, start: 'top top', end: '+=90%', pin: true, scrub: 1 } })
      .from('.after-h', { scale: 0.82, opacity: 0.2, ease: 'none' })
      .from('.after .card', { yPercent: 30, opacity: 0, stagger: 0.15, ease: 'none' }, 0.2);
  }

  // animated stat counters
  document.querySelectorAll('.stat .num').forEach((el) => {
    const to = +el.dataset.to;
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => { const o = { v: 0 }; gsap.to(o, { v: to, duration: 1.4, ease: 'power2.out',
        onUpdate: () => (el.textContent = Math.round(o.v)) }); },
    });
  });

  // topbar parallax fade on hero
  gsap.to('.hero-video', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
}

if (reduce) {
  document.querySelector('#preloader').style.display = 'none';
  gsap.set('.reveal,.reveal-line', { clearProps: 'all' });
} else {
  addEventListener('load', () => { boot(); scrollFx(); });
  // fallback if load already fired
  if (document.readyState === 'complete') { boot(); scrollFx(); }
}
