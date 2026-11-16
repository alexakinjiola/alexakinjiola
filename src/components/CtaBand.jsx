import { motion, useReducedMotion } from 'motion/react';
import SectionHead from './SectionHead';
import Button from './Button';
import Reveal from './Reveal';
import WavePanel from './WavePanel';

/* Floating glass "AA" mark with orbit rings — the CTA's focal object. */
function GlassMark() {
  const reduce = useReducedMotion();
  return (
    <div className="glass-mark" aria-hidden="true">
      <span className="orbit orbit-1" />
      <span className="orbit orbit-2" />
      <span className="orbit orbit-3" />
      <motion.div
        className="glass-mark-core"
        animate={reduce ? undefined : { y: [0, -14, 0], rotateY: [-14, 14, -14], rotateX: [8, -4, 8] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span>AA</span>
      </motion.div>
      <span className="glass-mark-shadow" />
    </div>
  );
}

export default function CtaBand({ eyebrow = "Let's work together", title, dim, lead, primary = { to: '/contact', label: "Let's talk" }, secondary }) {
  return (
    <WavePanel className="cta-wave" bottom={false}>
      <div className="container cta-wave-grid">
        <div>
          <SectionHead eyebrow={eyebrow} title={title} dim={dim} lead={lead} />
          <Reveal className="btn-row" delay={0.2}>
            <Button {...primary} icon="arrow_forward">{primary.label}</Button>
            {secondary && <Button {...secondary} variant="secondary">{secondary.label}</Button>}
          </Reveal>
        </div>
        <GlassMark />
      </div>
    </WavePanel>
  );
}
