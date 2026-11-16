import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import Icon from './Icon';
import Reveal from './Reveal';

/* Career milestones, oldest first. */
export const milestones = [
  { years: '2015 — 2019', title: 'B.Sc. Civil Engineering', org: 'Obafemi Awolowo University', text: 'Learned to think in systems, constraints and dependencies — Second Class Upper, 4.09/5.0.', icon: 'architecture' },
  { years: '2022 — 2023', title: 'Product Designer', org: 'Creatifff · Remote', text: 'Mobile-first fashion e-commerce, from research and journey maps to design system. 77% lift in satisfaction.', icon: 'checkroom' },
  { years: '2023 — 2025', title: 'Product Designer', org: 'Ajiroba Technologies · Remote', text: 'UX audits, simplified flows and a 60+ component design system. 89% usability improvement.', icon: 'storefront' },
  { years: '2025 — Present', title: 'Product Designer', org: 'Morgen Green · Hybrid', text: 'Leading design for SaaS and EdTech products with complex, multi-role workflows.', icon: 'rocket_launch', current: true },
];

/*
  Horizontal journey timeline. A curved dashed path draws itself as the
  section scrolls through view; milestones rise in along it. Stacks vertically
  on small screens.
*/
export default function Journey() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'center 45%'] });
  const draw = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={ref} className="journey">
      <svg className="journey-path" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 70 C 150 10 300 10 450 60 S 750 120 900 60 S 1100 10 1200 40" className="journey-path-bg" />
        <motion.path d="M0 70 C 150 10 300 10 450 60 S 750 120 900 60 S 1100 10 1200 40" className="journey-path-fg" style={{ pathLength: draw }} />
      </svg>
      <ol className="journey-list">
        {milestones.map((m, i) => (
          <Reveal as="li" key={m.years} className={`milestone${m.current ? ' is-current' : ''}`} delay={i * 0.12}>
            <span className="milestone-node"><Icon name={m.icon} size={20} fill={m.current} /></span>
            <p className="mono milestone-years">{m.years}</p>
            <h3>{m.title}</h3>
            <p className="milestone-org">{m.org}</p>
            <p className="milestone-text">{m.text}</p>
          </Reveal>
        ))}
      </ol>
    </div>
  );
}
