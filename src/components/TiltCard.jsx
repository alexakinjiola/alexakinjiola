import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react';

/*
  3D tilt toward the cursor plus a soft spotlight that follows it.
  The spotlight position is written to CSS custom properties (--mx / --my).
*/
export default function TiltCard({ as = 'article', className = '', children, max = 6, ...rest }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 160, damping: 18 });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 160, damping: 18 });
  const Tag = motion[as];

  // Measure once on enter, not on every move: reading layout right after
  // writing --mx/--my would force a reflow per mouse event.
  const rect = useRef(null);
  // any scroll (page or carousel) moves the element, so drop the cached rect
  useEffect(() => {
    const clear = () => { rect.current = null; };
    window.addEventListener('scroll', clear, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', clear, { capture: true });
  }, []);
  const onEnter = () => { rect.current = ref.current.getBoundingClientRect(); };
  const onMove = (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = rect.current ?? (rect.current = ref.current.getBoundingClientRect());
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    ref.current.style.setProperty('--mx', `${x * 100}%`);
    ref.current.style.setProperty('--my', `${y * 100}%`);
    if (!reduce) { px.set(x); py.set(y); }
  };
  const onLeave = () => { rect.current = null; px.set(0.5); py.set(0.5); };

  return (
    <Tag
      ref={ref}
      className={`tilt ${className}`}
      style={reduce ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 1100 }}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      {...rest}
    >
      <span className="tilt-glow" aria-hidden="true" />
      {children}
    </Tag>
  );
}
