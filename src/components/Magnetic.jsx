import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';

/* Pulls its child gently toward the cursor (fine pointers only). */
export default function Magnetic({ children, strength = 0.35, className }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 });

  // Measured on enter; the element moves under the pointer, so re-measuring
  // on every event would chase its own transform and force a reflow each time.
  const rect = useRef(null);
  // any scroll (page or carousel) moves the element, so drop the cached rect
  useEffect(() => {
    const clear = () => { rect.current = null; };
    window.addEventListener('scroll', clear, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', clear, { capture: true });
  }, []);
  const onMove = (e) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const r = rect.current ?? (rect.current = ref.current.getBoundingClientRect());
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => { rect.current = null; x.set(0); y.set(0); };

  return (
    <motion.span ref={ref} className={`magnetic ${className ?? ''}`} style={{ x: sx, y: sy }} onPointerMove={onMove} onPointerLeave={reset}>
      {children}
    </motion.span>
  );
}
