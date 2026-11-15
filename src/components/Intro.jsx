import { useEffect, useState } from 'react';
import { animate, motion, useReducedMotion } from 'motion/react';

/* First visit per session: a quick 0→100 count, name reveal, then the panel lifts away. */
export default function Intro({ onDone }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (reduce) { onDone(); return; }
    const c = animate(0, 100, {
      duration: 1.3, ease: [0.65, 0, 0.35, 1],
      onUpdate: (v) => setN(Math.round(v)),
      onComplete: () => setLeaving(true),
    });
    return () => c.stop();
  }, [reduce, onDone]);

  if (reduce) return null;
  return (
    <motion.div
      className="intro"
      aria-hidden="true"
      initial={{ y: 0 }}
      animate={leaving ? { y: '-100%' } : { y: 0 }}
      transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
      onAnimationComplete={() => leaving && onDone()}
    >
      <div className="intro-name">
        {['Alex', 'Akinjiola'].map((w, i) => (
          <span className="split-mask" key={w}>
            <motion.span initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ delay: 0.15 + i * 0.1, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>{w}</motion.span>
          </span>
        ))}
      </div>
      <div className="intro-meta">
        <span>Product Designer</span>
        <span className="intro-count">{String(n).padStart(3, '0')}</span>
      </div>
      <motion.div className="intro-bar" style={{ scaleX: n / 100 }} />
    </motion.div>
  );
}
