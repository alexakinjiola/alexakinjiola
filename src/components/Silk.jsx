import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

/*
  Flowing silk ribbon, drawn as many fine sine lines on a canvas.
  Echoes the liquid blue ribbons in the reference design. Reacts gently to the
  pointer, pauses when off-screen, and renders a single still frame for
  reduced-motion visitors.
*/
export default function Silk({ className = '', lines = 46, intensity = 1, hue = 'blue' }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, raf = 0, visible = true, t = Math.random() * 10;
    const pointer = { x: 0.6, y: 0.5, tx: 0.6, ty: 0.5, cx: null, cy: null };
    const palette = hue === 'blue' ? [[106, 166, 255], [59, 130, 246], [147, 197, 253]] : [[255, 255, 255]];

    const size = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      const amp = h * (0.12 + pointer.y * 0.06) * intensity;
      for (let i = 0; i < lines; i++) {
        const k = i / lines;
        const [r, g, b] = palette[i % palette.length];
        const alpha = (0.05 + Math.sin(k * Math.PI) * 0.22) * intensity;
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = -20; x <= w + 20; x += 14) {
          const u = x / w;
          const base = h * (0.78 - u * 0.5) + Math.sin(u * Math.PI * 1.3 + t * 0.35) * amp;
          const twist = Math.sin(u * 5 + t * 0.6 + k * 2.4) * (18 + k * 26) * (0.6 + pointer.x * 0.6);
          const y = base + (k - 0.5) * h * 0.22 * Math.cos(u * 3 + t * 0.25) + twist;
          x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    // Pointer events only record coordinates; the layout read happens once per frame,
    // at the start of the frame, so moving the mouse never forces an extra layout.
    const aim = () => {
      if (pointer.cx === null) return;
      const r = canvas.getBoundingClientRect();
      pointer.tx = Math.min(1, Math.max(0, (pointer.cx - r.left) / r.width));
      pointer.ty = Math.min(1, Math.max(0, (pointer.cy - r.top) / r.height));
      pointer.cx = null;
    };
    const loop = () => { aim(); t += 0.012; draw(); if (visible) raf = requestAnimationFrame(loop); };
    const onMove = (e) => { pointer.cx = e.clientX; pointer.cy = e.clientY; };

    size();
    const ro = new ResizeObserver(() => { size(); if (reduce) draw(); });
    ro.observe(canvas);
    if (reduce) { draw(); return () => ro.disconnect(); }

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); window.removeEventListener('pointermove', onMove); };
  }, [reduce, lines, intensity, hue]);

  return <canvas ref={ref} className={`silk ${className}`} aria-hidden="true" />;
}
