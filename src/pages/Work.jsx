import { Link } from 'react-router';
import Page from '../components/Page';
import Silk from '../components/Silk';
import SectionHead, { Eyebrow } from '../components/SectionHead';
import SplitText from '../components/SplitText';
import Reveal, { Stagger, RevealItem } from '../components/Reveal';
import Counter from '../components/Counter';
import TiltCard from '../components/TiltCard';
import CtaBand from '../components/CtaBand';
import Icon from '../components/Icon';
import { caseGroups } from '../data/cases';
import { workStats } from '../data/projects';

/* Where the work stands today: shipped and in use, or a design that hasn't shipped. */
export function StatusTag({ status, className = '' }) {
  if (!status) return null;
  const tone = status === 'Live' ? 'live' : 'concept';
  return <span className={`status-tag status-${tone} ${className}`}><i aria-hidden="true" />{status}</span>;
}

/* A whole-card link into a case study. */
export function CaseCard({ c, size = 'md', index }) {
  return (
    <div className="case-card-wrap" style={{ '--case': c.accent }}>
    <TiltCard as="article" className={`case-card case-card-${size}`} max={size === 'lg' ? 3 : 5} data-cursor="Read">
      <Link to={`/work/${c.slug}`} className="case-card-link" aria-label={`${c.title} case study — ${c.tagline}`} />
      <div className="case-card-media">
        <img src={c.cover} alt="" loading="lazy" decoding="async" />
        <span className="chip chip-glass">{c.category}</span>
        {index != null && <span className="case-card-num mono" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>}
      </div>
      <div className="case-card-body">
        <StatusTag status={c.status} />
        <h3>{c.title}</h3>
        <p>{c.tagline}</p>
        <span className="case-card-cta">Read case study <Icon name="arrow_forward" size={18} /></span>
      </div>
    </TiltCard>
    </div>
  );
}

export default function Work() {
  return (
    <Page title="Work" description="Product design case studies by Alex Akinjiola — Tabbas, Krent, Continuum, Bimetal and TrustBridge — across fintech, property, health and hiring.">
      <header className="page-hero">
        <Silk lines={30} intensity={0.65} />
        <div className="page-hero-glow" aria-hidden="true" />
        <div className="container">
          <Eyebrow>Work</Eyebrow>
          <SplitText as="h1" className="page-title" text="The work that tells" dim="the clearest story." breakBefore onMount delay={0.35} />
          <Reveal as="p" className="lead" delay={0.5}>Real products, real constraints. Each project below opens into a full case study — the problem, the decisions behind the screens, and what shipped.</Reveal>
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

      <section className="section" aria-labelledby="featured-title">
        <div className="container">
          <SectionHead eyebrow="Featured case studies" title="Complex products," dim="made clearer." breakBefore={false} />
          <span id="featured-title" className="sr-only">Featured case studies</span>
          <Stagger className="case-grid case-grid-featured" gap={0.08}>
            {caseGroups.featured.map((c, i) => (
              <RevealItem key={c.slug} className={i === 0 ? 'case-cell-wide' : ''}><CaseCard c={c} size={i === 0 ? 'lg' : 'md'} index={i} /></RevealItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="section section-surface">
        <div className="container">
          <SectionHead eyebrow="More product work" title="Different users," dim="different constraints." breakBefore={false} />
          <Stagger className="bento bento-2 case-grid" gap={0.06}>
            {caseGroups.product.map((c) => <RevealItem key={c.slug}><CaseCard c={c} /></RevealItem>)}
          </Stagger>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead eyebrow="Web builds" title="Designed and" dim="built end to end." breakBefore={false} lead="Brand sites and storefronts I designed and coded for clients — evidence that my designs survive implementation." />
          <Stagger className="bento bento-4 case-grid" gap={0.06}>
            {caseGroups.web.map((c) => <RevealItem key={c.slug}><CaseCard c={c} size="sm" /></RevealItem>)}
          </Stagger>
        </div>
      </section>

      <section className="section section-surface" aria-labelledby="archive-title">
        <div className="container">
          <SectionHead eyebrow="Archive" title="Earlier and" dim="smaller projects." breakBefore={false} lead="Shorter write-ups of earlier work. Fewer screens and less process, kept for completeness." />
          <span id="archive-title" className="sr-only">Archive</span>
          <Stagger as="ul" className="archive-list" gap={0.05}>
            {caseGroups.archive.map((c) => (
              <RevealItem as="li" key={c.slug} style={{ '--case': c.accent }}>
                <Link to={`/work/${c.slug}`} className="archive-row">
                  <img src={c.cover} alt="" loading="lazy" decoding="async" />
                  <span className="archive-main">
                    <span className="archive-title">{c.title}</span>
                    <span className="archive-tagline">{c.tagline}</span>
                  </span>
                  <span className="archive-meta mono">{c.category}</span>
                  <StatusTag status={c.status} />
                  <Icon name="arrow_forward" size={20} className="archive-arrow" />
                </Link>
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
