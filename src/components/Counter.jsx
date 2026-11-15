import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';

/* Counts from 0 to `value` when scrolled into view. */
export default function Counter({ value, suffix = '', prefix = '', duration = 1.8, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!inView || reduce) return;
    const c = animate(0, value, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [inView, value, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">{prefix}{n}{suffix}</span>
      <span className="sr-only">{prefix}{value}{suffix}</span>
    </span>
  );
}
