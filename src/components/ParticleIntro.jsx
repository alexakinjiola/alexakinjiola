import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import Mark from './Mark';

/*
  Launch sequence — fully automatic, no interaction needed.
  0.0s  particles stream in from the dark; the name is legible by ~1.3s
  0.4s  the seal and role line and seal settle in; a progress hairline runs
  2.7s  the particles burst outward and the site is revealed
  Moving the cursor over the name still nudges the particles (a bonus for the
  curious, never required). Any click, tap or key skips straight to the site.
  Reduced-motion visitors skip it entirely.
*/
const HOLD = 2700;
const COLORS = ['#EEF2FA', '#B9D4FF', '#6AA6FF', '#3B82F6', '#93C5FD'];

export default function ParticleIntro({ onDone }) {
  const reduce = useReducedMotion();
  const canvasRef = useRef(null);
  const state = useRef({ particles: [], pointer: { x: -9999, y: -9999 }, burst: false, raf: 0 });
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    state.current.burst = true;
    setLeaving(true);
    setTimeout(onDone, 850);
  }, [onDone]);

  useEffect(() => {
    if (reduce) { onDone(); return; }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const s = state.current;
    let w = 0, h = 0, built = false;

    const build = async () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      try { await Promise.race([document.fonts.load('600 120px Geist'), new Promise((r) => setTimeout(r, 700))]); } catch { /* system font */ }

      const off = document.createElement('canvas');
      off.width = w; off.height = h;
      const o = off.getContext('2d', { willReadFrequently: true });
      const narrow = w < 720;
      const lines = narrow ? ['Alex', 'Akinjiola'] : ['Alex Akinjiola'];
      let size = narrow ? Math.min(w * 0.22, 130) : Math.min(w * 0.11, 180);
      const render = () => {
        o.clearRect(0, 0, w, h);
        o.font = `600 ${size}px Geist, system-ui, sans-serif`;
        o.fillStyle = '#fff'; o.textAlign = 'center'; o.textBaseline = 'middle';
        const lh = size * 0.98;
        const top = h * 0.46 - ((lines.length - 1) * lh) / 2;
        lines.forEach((l, i) => o.fillText(l, w / 2, top + i * lh));
        return o.getImageData(0, 0, w, h).data;
      };
      let data = render();
      for (let attempt = 0; attempt < 6; attempt++) {
        let minX = w, maxX = 0;
        for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) if (data[(y * w + x) * 4 + 3] > 140) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
        const allowed = w * (narrow ? 0.84 : 0.84);
        if (maxX - minX <= allowed && minX > w * 0.04 && maxX < w * 0.96) break;
        size *= Math.min(0.92, allowed / Math.max(maxX - minX, 1));
        data = render();
      }
      const gap = narrow ? 4 : Math.max(4, Math.round(size / 26));
      const pts = [];
      for (let y = 0; y < h; y += gap) for (let x = 0; x < w; x += gap) if (data[(y * w + x) * 4 + 3] > 140) pts.push([x, y]);
      const step = Math.max(1, pts.length / (narrow ? 2000 : 4200));

      // On a resize mid-intro, keep particles where they are and just retarget them.
      const prev = s.particles;
      s.particles = [];
      for (let i = 0, k = 0; i < pts.length; i += step, k++) {
        const [tx, ty] = pts[Math.floor(i)];
        const old = prev[k];
        const a = Math.random() * Math.PI * 2;
        const r = Math.max(w, h) * (0.35 + Math.random() * 0.35);
        s.particles.push({
          x: old ? old.x : w / 2 + Math.cos(a) * r, y: old ? old.y : h / 2 + Math.sin(a) * r,
          tx, ty, vx: 0, vy: 0,
          size: Math.random() * 1.2 + 1.1,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          ease: 0.07 + Math.random() * 0.05,
          phase: Math.random() * Math.PI * 2,
        });
      }
      built = true;
    };

    let t = 0;
    const tick = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const { x: px, y: py } = s.pointer;
      for (const p of s.particles) {
        if (s.burst) {
          if (p.bvx === undefined) { const a = Math.atan2(p.y - h / 2, p.x - w / 2) + (Math.random() - 0.5) * 0.4; const sp = 5 + Math.random() * 12; p.bvx = Math.cos(a) * sp; p.bvy = Math.sin(a) * sp; }
          p.x += p.bvx; p.y += p.bvy; p.bvx *= 1.045; p.bvy *= 1.045;
        } else {
          const dx = p.x - px, dy = p.y - py, d2 = dx * dx + dy * dy, R = 100;
          if (d2 < R * R) { const d = Math.sqrt(d2) || 1; const f = (R - d) / R; p.vx += (dx / d) * f * 5; p.vy += (dy / d) * f * 5; }
          p.vx += (p.tx + Math.sin(t * 1.6 + p.phase) * 0.7 - p.x) * p.ease;
          p.vy += (p.ty + Math.cos(t * 1.3 + p.phase) * 0.7 - p.y) * p.ease;
          p.vx *= 0.78; p.vy *= 0.78;
          p.x += p.vx; p.y += p.vy;
        }
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.92;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      s.raf = requestAnimationFrame(tick);
    };

    const move = (e) => { if (e.pointerType === 'mouse') { s.pointer.x = e.clientX; s.pointer.y = e.clientY; } };
    const skip = () => finish();
    const key = () => finish();
    let rt;
    const resize = () => { clearTimeout(rt); rt = setTimeout(build, 150); };

    let timer;
    build().then(() => { s.raf = requestAnimationFrame(tick); timer = setTimeout(finish, HOLD); });
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', key);
    window.addEventListener('resize', resize);
    document.documentElement.style.overflow = 'hidden';
    // Safety net: never hold the visitor longer than this, even if fonts stall.
    const failsafe = setTimeout(() => { if (!built) finish(); }, 2500);
    return () => {
      cancelAnimationFrame(s.raf); clearTimeout(timer); clearTimeout(failsafe); clearTimeout(rt);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', key);
      window.removeEventListener('resize', resize);
      document.documentElement.style.overflow = '';
    };
  }, [reduce, onDone, finish]);

  if (reduce) return null;
  return (
    <motion.div
      className="launch"
      aria-hidden="true"
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.75, delay: leaving ? 0.2 : 0, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="launch-glow" />
      <canvas ref={canvasRef} className="launch-canvas" />
      <motion.div
        className="launch-meta"
        initial={{ opacity: 0, y: 14 }}
        animate={leaving ? { opacity: 0, y: -8, transition: { duration: 0.3 } } : { opacity: 1, y: 0, transition: { delay: 0.4, duration: 0.9, ease: [0.22, 1, 0.36, 1] } }}
      >
        <Mark size={44} />
        <p className="launch-role mono">Product Designer · Portfolio 2026</p>
        <span className="launch-line"><motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.2, duration: HOLD / 1000 - 0.2, ease: 'linear' }} /></span>
      </motion.div>
    </motion.div>
  );
}
