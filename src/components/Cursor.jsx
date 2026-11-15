import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence, useReducedMotion } from 'motion/react';

/*
  Custom cursor for mouse users: a small dot plus a trailing ring.
  Elements with data-cursor="View" (etc.) expand the ring into a labelled pill.
  Touch devices and reduced-motion users keep the native cursor only.
*/
export default function Cursor() {
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState('');
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 380, damping: 32, mass: 0.6 });
  const ry = useSpring(y, { stiffness: 380, damping: 32, mass: 0.6 });

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine) and (hover: hover)');
    const update = () => setEnabled(mq.matches && !reduce);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [reduce]);

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add('has-cursor');
    const move = (e) => {
      x.set(e.clientX); y.set(e.clientY);
      const t = e.target.closest?.('[data-cursor], a, button, [role="tab"], label, select');
      setHover(!!t);
      setLabel(t?.closest('[data-cursor]')?.getAttribute('data-cursor') ?? '');
    };
    const d = () => setDown(true);
    const u = () => setDown(false);
    const leave = () => { x.set(-100); y.set(-100); };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', d);
    window.addEventListener('pointerup', u);
    document.addEventListener('pointerleave', leave);
    return () => {
      document.documentElement.classList.remove('has-cursor');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', d);
      window.removeEventListener('pointerup', u);
      document.removeEventListener('pointerleave', leave);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;
  const size = label ? 88 : hover ? 52 : 34;

  return (
    <div className="cursor" aria-hidden="true">
      <motion.div className="cursor-dot" style={{ x, y }} animate={{ scale: hover ? 0 : down ? 0.6 : 1 }} />
      <motion.div
        className={`cursor-ring${label ? ' has-label' : ''}`}
        style={{ x: rx, y: ry }}
        animate={{ width: size, height: size, scale: down ? 0.85 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        <AnimatePresence>
          {label && (
            <motion.span key={label} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}>
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
