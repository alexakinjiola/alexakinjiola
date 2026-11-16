import Page from '../components/Page';
import Silk from '../components/Silk';
import SectionHead from '../components/SectionHead';
import SplitText from '../components/SplitText';
import Reveal, { Stagger, RevealItem } from '../components/Reveal';
import Button from '../components/Button';
import Counter from '../components/Counter';
import TiltCard from '../components/TiltCard';
import CtaBand from '../components/CtaBand';
import Icon from '../components/Icon';
import { Eyebrow } from '../components/SectionHead';
import { caseStudies, moreWork, workStats, demonstrates } from '../data/projects';
import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';

function CaseStudy({ c, index }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);
  return (
    <article ref={ref} id={c.id} className={`case${index % 2 ? ' case-reverse' : ''}`} aria-labelledby={`${c.id}-title`}>
      <Reveal className="case-media" data-cursor="View">
        <motion.img src={c.image} alt={c.badge} loading="lazy" decoding="async" style={{ y, scale: 1.18 }} />
        <span className="chip chip-glass">{c.badge}</span>
        <span className="case-index mono" aria-hidden="true">0{index + 1}</span>
      </Reveal>
      <div className="case-body">
        <Reveal as="p" className="mono case-meta"><span className="accent">{c.eyebrow}</span><span><Icon name="schedule" size={16} />{c.readTime}</span></Reveal>
        <SplitText as="h2" id={`${c.id}-title`} className="case-title" text={c.title} />
        <Stagger as="dl" className="case-results">
          {c.results.map((r) => (
            <RevealItem key={r.label} className="case-result">
              <dt className="sr-only">{r.label}</dt>
              <dd className="case-result-value">{r.value}</dd>
              <dd className="case-result-label" aria-hidden="true">{r.label}</dd>
            </RevealItem>
          ))}
        </Stagger>
        <Stagger className="case-story">
          {c.story.map(([label, text]) => (
            <RevealItem key={label} className="case-story-block">
              <h3 className="mono">{label}</h3>
              <p>{text}</p>
            </RevealItem>
          ))}
        </Stagger>
        <Reveal as="p" className="case-tags">{c.tags}</Reveal>
        <Reveal className="btn-row">
          {c.links.map((l, j) => (
            <Button key={l.label} href={l.href} variant={j === 0 ? 'primary' : 'secondary'} iconStart={l.icon} magnetic={j === 0}>{l.label}</Button>
          ))}
        </Reveal>
      </div>
    </article>
  );
}

export default function Work() {
  return (
    <Page title="Work" description="Selected product design case studies by Alex Akinjiola across SaaS, PropTech, fintech and e-commerce.">
      <header className="page-hero">
        <Silk lines={30} intensity={0.65} />
        <div className="page-hero-glow" aria-hidden="true" />
        <div className="container">
          <Eyebrow>Work</Eyebrow>
          <SplitText as="h1" className="page-title" text="The work that tells" dim="the clearest story." breakBefore onMount delay={0.35} />
          <Reveal as="p" className="lead" delay={0.5}>Real products. Real constraints. 5+ years of design decisions across SaaS, EdTech, e-commerce, and fintech — all aimed at making complex things easier to use.</Reveal>
          <Stagger as="dl" className="stat-strip">
            {workStats.map((s) => (
              <RevealItem key={s.label} className="stat">
                <dt className="stat-label">{s.label}</dt>
                <dd className="stat-value"><Counter value={s.value} suffix={s.suffix} /></dd>
              </RevealItem>
            ))}
          </Stagger>
        </div>
      </header>

      <section className="section" aria-label="Featured case studies">
        <div className="container cases">
          {caseStudies.map((c, i) => <CaseStudy key={c.id} c={c} index={i} />)}
        </div>
      </section>

      <section className="section section-surface">
        <div className="container">
          <SectionHead eyebrow="More work" title="More products." dim="More problems solved." lead="Every project here required a different approach. Different users, different constraints, different definitions of success." />
          <Stagger className="bento bento-3">
            {moreWork.map((p) => (
              <RevealItem key={p.id}>
                <TiltCard className="proj-card" max={3} data-cursor="View">
                  <div className="work-media">
                    <img src={p.image} alt={p.title} loading="lazy" decoding="async" />
                    <span className="chip chip-glass">{p.category}</span>
                  </div>
                  <div className="work-body">
                    <h3>{p.title}</h3>
                    <dl className="mini-stats">
                      {p.stats.map(([v, l]) => (
                        <div key={l}><dt className="sr-only">{l}</dt><dd className="mini-stat-value">{v}</dd><dd className="mini-stat-label" aria-hidden="true">{l}</dd></div>
                      ))}
                    </dl>
                    <p>{p.summary}</p>
                    <div className="work-links">
                      {p.links.map((l, j) => (
                        <Button key={l.label} href={l.href} size="sm" variant={j === 0 ? 'light' : 'secondary'} iconStart={l.icon} magnetic={false}>{l.label}</Button>
                      ))}
                      {p.note && <span className="chip"><Icon name="lock" size={14} />{p.note}</span>}
                    </div>
                  </div>
                </TiltCard>
              </RevealItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead eyebrow="What this work demonstrates" title="Skills made visible" dim="through real outcomes." />
          <Stagger className="bento bento-3">
            {demonstrates.map((d) => (
              <RevealItem key={d.title}>
                <TiltCard className="metric-card" max={4}>
                  <p className="metric-value"><Counter value={d.value} suffix={d.suffix} /></p>
                  <h3>{d.title}</h3>
                  <p>{d.text}</p>
                </TiltCard>
              </RevealItem>
            ))}
          </Stagger>
        </div>
      </section>

      <CtaBand
        title="Have a product problem"
        dim="worth solving?"
        lead="Whether you're building something new or improving something that's grown more complex than it should be — I'd like to hear about it."
        secondary={{ to: '/experience', label: 'View experience' }}
      />
    </Page>
  );
}
