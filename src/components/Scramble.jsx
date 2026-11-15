import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'motion/react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#*+-_';

/* Monospaced label that decodes itself from random glyphs when it enters view. */
export default function Scramble({ text, className = '', as: Tag = 'span' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [out, setOut] = useState(text);

  useEffect(() => {
    if (!inView || reduce) return;
    let frame = 0;
    const total = Math.max(18, text.length * 1.6);
    let raf;
    const tick = () => {
      frame++;
      const done = Math.floor((frame / total) * text.length);
      setOut(
        text.split('').map((ch, i) => {
          if (i < done || ch === ' ') return ch;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }).join('')
      );
      if (frame < total) raf = requestAnimationFrame(tick);
      else setOut(text);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, text]);

  return (
    <Tag ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{out}</span>
    </Tag>
  );
}
