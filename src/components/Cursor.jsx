import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

/*
  Custom cursor for mouse users: a small dot plus a trailing ring.
  Elements with data-cursor="View" (etc.) expand the ring into a labelled pill.
  Touch devices and reduced-motion users keep the native cursor only.

  Performance: pointer moves never touch React. The dot is moved inside the
  event itself, so it stays glued to the pointer; the ring eases toward it in
  one requestAnimationFrame loop that sleeps once it has caught up. React only
  re-renders when the label actually changes.
*/
const HOVER = '[data-cursor], a, button, [role="tab"], label, select, summary';

export default function Cursor() {
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState('');
  const dot = useRef(null);
  const ring = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine) and (hover: hover)');
    const update = () => setEnabled(mq.matches && !reduce);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [reduce]);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add('has-cursor');
    const d = dot.current, r = ring.current;
    const p = { x: -100, y: -100 }, q = { x: -100, y: -100 };
    d.style.top = r.style.top = '0'; d.style.left = r.style.left = '0';
    let raf = 0, lastTarget = null, lastLabel = '';

    // centring lives in the same transform so a CSS minifier can never merge it away
    const place = (el, x, y) => { el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`; };
    const step = () => {
      q.x += (p.x - q.x) * 0.5;
      q.y += (p.y - q.y) * 0.5;
      if (Math.abs(p.x - q.x) < 0.1 && Math.abs(p.y - q.y) < 0.1) { q.x = p.x; q.y = p.y; raf = 0; }
      else raf = requestAnimationFrame(step);
      place(r, q.x, q.y);
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(step); };

    const move = (e) => {
      p.x = e.clientX; p.y = e.clientY;
      place(d, p.x, p.y);
      wake();
      // hover state only changes when the element under the pointer changes
      if (e.target === lastTarget) return;
      lastTarget = e.target;
      const t = e.target.closest?.(HOVER);
      r.classList.toggle('is-hover', !!t);
      d.classList.toggle('is-hover', !!t);
      const l = t?.closest('[data-cursor]')?.getAttribute('data-cursor') ?? '';
      if (l !== lastLabel) { lastLabel = l; r.classList.toggle('has-label', !!l); setLabel(l); }
    };
    const down = () => { r.classList.add('is-down'); d.classList.add('is-down'); };
    const up = () => { r.classList.remove('is-down'); d.classList.remove('is-down'); };
    const leave = () => { p.x = p.y = -100; place(d, -100, -100); wake(); };

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    document.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove('has-cursor');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      document.removeEventListener('pointerleave', leave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="cursor" aria-hidden="true">
      <div ref={dot} className="cursor-dot" />
      {/* className stays constant: every state class is toggled directly, so React re-renders can't wipe them */}
      <div ref={ring} className="cursor-ring">
        <AnimatePresence>
          {label && (
            <motion.span key={label} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}>
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
