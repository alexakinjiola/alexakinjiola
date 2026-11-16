import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

/*
  Launch experience.
  Alex's name is drawn from a few thousand particles that fly in from the dark,
  flee from the cursor or finger, and drift back into place. Holding the
  "Hold to enter" control charges a ring; when it fills, the particles burst
  outward and the site is revealed. Skippable at any moment; reduced-motion
  visitors go straight to the site.
*/
const HOLD_MS = 1100;
const COLORS = ['#EEF2FA', '#B9D4FF', '#6AA6FF', '#3B82F6', '#93C5FD'];

export default function ParticleIntro({ onDone }) {
  const reduce = useReducedMotion();
  const canvasRef = useRef(null);
  const state = useRef({ particles: [], pointer: { x: -9999, y: -9999 }, burst: false, raf: 0 });
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [ready, setReady] = useState(false);
  const holdRef = useRef({ start: 0, raf: 0 });
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    state.current.burst = true;
    setLeaving(true);
    setTimeout(onDone, 900);
  }, [onDone]);

  /* Build and animate the particle field */
  useEffect(() => {
    if (reduce) { onDone(); return; }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const s = state.current;
    let w = 0, h = 0, dpr = 1;

    const build = async () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      try { await Promise.race([document.fonts.load('600 120px Geist'), new Promise((r) => setTimeout(r, 900))]); } catch { /* fall back to system font */ }

      // Draw the name on an offscreen canvas and sample its pixels.
      const off = document.createElement('canvas');
      off.width = w; off.height = h;
      const o = off.getContext('2d', { willReadFrequently: true });
      const narrow = w < 720;
      const lines = narrow ? ['Alex', 'Akinjiola'] : ['Alex Akinjiola'];
      let size = narrow ? Math.min(w * 0.22, 130) : Math.min(w * 0.12, 190);
      const render = () => {
        o.clearRect(0, 0, w, h);
        o.font = `600 ${size}px Geist, system-ui, sans-serif`;
        o.fillStyle = '#fff'; o.textAlign = 'center'; o.textBaseline = 'middle';
        const lh = size * 0.98;
        const top = h * 0.44 - ((lines.length - 1) * lh) / 2;
        lines.forEach((l, i) => o.fillText(l, w / 2, top + i * lh));
        return o.getImageData(0, 0, w, h).data;
      };
      // Fit by measuring the pixels actually drawn, so the name never touches the edges.
      let data = render();
      for (let attempt = 0; attempt < 6; attempt++) {
        let minX = w, maxX = 0;
        for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) {
          if (data[(y * w + x) * 4 + 3] > 140) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
        }
        const allowed = w * (narrow ? 0.84 : 0.86);
        const drawn = maxX - minX;
        if (drawn <= allowed && minX > w * 0.04 && maxX < w * 0.96) break;
        size *= Math.min(0.92, allowed / Math.max(drawn, 1));
        data = render();
      }
      const gap = narrow ? 4 : Math.max(4, Math.round(size / 26));
      const pts = [];
      for (let y = 0; y < h; y += gap) for (let x = 0; x < w; x += gap) if (data[(y * w + x) * 4 + 3] > 140) pts.push([x, y]);
      const max = narrow ? 1600 : 3200;
      const step = Math.max(1, pts.length / max);

      s.particles = [];
      for (let i = 0; i < pts.length; i += step) {
        const [tx, ty] = pts[Math.floor(i)];
        const a = Math.random() * Math.PI * 2;
        const r = Math.max(w, h) * (0.6 + Math.random() * 0.6);
        s.particles.push({
          x: w / 2 + Math.cos(a) * r, y: h / 2 + Math.sin(a) * r,
          tx, ty, vx: 0, vy: 0,
          size: Math.random() * 1.3 + 0.7,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          ease: 0.018 + Math.random() * 0.03,
          phase: Math.random() * Math.PI * 2,
        });
      }
      setReady(true);
    };

    let t = 0;
    const tick = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const { x: px, y: py } = s.pointer;
      for (const p of s.particles) {
        if (s.burst) {
          if (!p.bvx) { const a = Math.atan2(p.y - h / 2, p.x - w / 2); const sp = 6 + Math.random() * 14; p.bvx = Math.cos(a) * sp; p.bvy = Math.sin(a) * sp; }
          p.x += p.bvx; p.y += p.bvy; p.bvx *= 1.04; p.bvy *= 1.04;
        } else {
          const dx = p.x - px, dy = p.y - py;
          const d2 = dx * dx + dy * dy;
          const R = 110;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1;
            const f = (R - d) / R;
            p.vx += (dx / d) * f * 6; p.vy += (dy / d) * f * 6;
          }
          p.vx += (p.tx + Math.sin(t * 1.6 + p.phase) * 0.8 - p.x) * p.ease;
          p.vy += (p.ty + Math.cos(t * 1.3 + p.phase) * 0.8 - p.y) * p.ease;
          p.vx *= 0.86; p.vy *= 0.86;
          p.x += p.vx; p.y += p.vy;
        }
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      s.raf = requestAnimationFrame(tick);
    };

    const move = (e) => { s.pointer.x = e.clientX; s.pointer.y = e.clientY; };
    const leave = () => { s.pointer.x = -9999; s.pointer.y = -9999; };
    let resizeTimer;
    const resize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 200); };

    build().then(() => { s.raf = requestAnimationFrame(tick); });
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    window.addEventListener('resize', resize);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(s.raf);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', move);
      document.removeEventListener('pointerleave', leave);
      window.removeEventListener('resize', resize);
      document.documentElement.style.overflow = '';
    };
  }, [reduce, onDone]);

  /* Hold-to-enter: pointer, Space or Enter */
  const startHold = () => {
    if (doneRef.current || holdRef.current.raf) return;
    holdRef.current.start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - holdRef.current.start) / HOLD_MS);
      setProgress(p);
      if (p >= 1) { holdRef.current.raf = 0; finish(); return; }
      holdRef.current.raf = requestAnimationFrame(step);
    };
    holdRef.current.raf = requestAnimationFrame(step);
  };
  const endHold = () => {
    cancelAnimationFrame(holdRef.current.raf);
    holdRef.current.raf = 0;
    if (!doneRef.current) setProgress(0);
  };
  const onKeyDown = (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startHold(); } };
  const onKeyUp = (e) => { if (e.key === ' ' || e.key === 'Enter') endHold(); };

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [finish]);

  if (reduce) return null;
  const C = 2 * Math.PI * 34;

  return (
    <motion.div
      className="launch"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Alex Akinjiola's portfolio"
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.8, delay: leaving ? 0.25 : 0, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="launch-glow" aria-hidden="true" />
      <canvas ref={canvasRef} className="launch-canvas" aria-hidden="true" />

      <AnimatePresence>
        {ready && !leaving && (
          <motion.div className="launch-ui" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: 1.2, duration: 0.8 } }} exit={{ opacity: 0, y: 10, transition: { duration: 0.3 } }}>
            <p className="launch-role mono">Product Designer — Portfolio 2026</p>
            <button
              type="button"
              className="launch-hold"
              onPointerDown={startHold}
              onPointerUp={endHold}
              onPointerLeave={endHold}
              onPointerCancel={endHold}
              onKeyDown={onKeyDown}
              onKeyUp={onKeyUp}
              onContextMenu={(e) => e.preventDefault()}
              aria-label="Press and hold to enter the site"
              autoFocus
            >
              <svg viewBox="0 0 76 76" aria-hidden="true">
                <circle cx="38" cy="38" r="34" className="launch-ring-bg" />
                <circle cx="38" cy="38" r="34" className="launch-ring" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
              </svg>
              <span className="launch-hold-dot" style={{ transform: `scale(${1 + progress * 0.6})` }} aria-hidden="true" />
            </button>
            <p className="launch-hint">
              <span className="pointer-only">Play with the particles · </span>
              <strong>Hold to enter</strong>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {!leaving && (
        <button type="button" className="launch-skip mono" onClick={finish}>Skip intro <kbd>Esc</kbd></button>
      )}
    </motion.div>
  );
}
