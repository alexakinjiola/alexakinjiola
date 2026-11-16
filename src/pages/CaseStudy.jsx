import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react';
import Page from '../components/Page';
import Silk from '../components/Silk';
import SplitText from '../components/SplitText';
import { Eyebrow } from '../components/SectionHead';
import Reveal, { Stagger, RevealItem } from '../components/Reveal';
import Button from '../components/Button';
import Icon from '../components/Icon';
import WavePanel from '../components/WavePanel';
import { Quote, Person } from '../components/Testimonials';
import { cases, caseBySlug } from '../data/cases';
import { testimonials } from '../data/testimonials';
import NotFound from './NotFound';

const ease = [0.22, 1, 0.36, 1];

/* Full-screen image viewer. Esc or click outside closes; focus returns to the trigger. */
function Lightbox({ item, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    if (!item) return;
    const prev = document.activeElement;
    closeRef.current?.focus();
    window.__lenis?.stop();
    const key = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); window.__lenis?.start(); prev?.focus?.(); };
  }, [item, onClose]);
  return (
    <AnimatePresence>
      {item && (
        <motion.div className="lightbox" role="dialog" aria-modal="true" aria-label={item.caption || 'Image preview'}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} data-lenis-prevent>
          <button ref={closeRef} type="button" className="lightbox-close" onClick={onClose} aria-label="Close preview"><Icon name="close" /></button>
          <motion.figure initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }} transition={{ duration: 0.45, ease }} onClick={(e) => e.stopPropagation()}>
            <img src={item.src} alt={item.caption || ''} />
            {item.caption && <figcaption>{item.caption}</figcaption>}
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Shot({ src, caption, mobile, onOpen, priority }) {
  return (
    <figure className={`shot${mobile ? ' shot-mobile' : ''}`}>
      <button type="button" className="shot-frame" onClick={() => onOpen({ src, caption })} data-cursor="Expand" aria-label={`Expand image: ${caption}`}>
        {!mobile && <span className="shot-bar" aria-hidden="true"><i /><i /><i /></span>}
        <img src={src} alt={caption} loading={priority ? 'eager' : 'lazy'} decoding="async" />
      </button>
      {caption && <figcaption className="mono">{caption}</figcaption>}
    </figure>
  );
}

const sections = [
  ['overview', 'Overview'], ['challenge', 'Challenge'], ['approach', 'Approach'],
  ['decisions', 'Key decisions'], ['outcome', 'Outcome'], ['reflection', 'Reflection'],
];

function Toc({ available }) {
  const [active, setActive] = useState('overview');
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-40% 0px -55% 0px' });
    available.forEach(([id]) => { const el = document.getElementById(id); el && io.observe(el); });
    return () => io.disconnect();
  }, [available]);
  return (
    <nav className="toc" aria-label="Case study sections">
      <p className="footer-label">On this page</p>
      <ol>
        {available.map(([id, label], i) => (
          <li key={id}>
            <a href={`#${id}`} className={active === id ? 'is-active' : ''} aria-current={active === id ? 'true' : undefined}>
              <span className="mono">0{i + 1}</span>{label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function CaseStudy() {
  const { slug } = useParams();
  const c = caseBySlug[slug];
  const [open, setOpen] = useState(null);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const coverY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);

  if (!c) return <NotFound />;

  const idx = cases.findIndex((x) => x.slug === slug);
  const next = cases[(idx + 1) % cases.length];
  const quote = c.quoteFrom ? testimonials.find((t) => t.name === c.quoteFrom) : null;
  const available = sections.filter(([id]) => id !== 'decisions' || c.decisions.length);
  const internal = c.live?.startsWith('/');

  return (
    <Page title={`${c.title} — Case study`} description={c.tagline}>
      <header ref={heroRef} className="case-hero">
        <Silk lines={30} intensity={0.6} />
        <div className="page-hero-glow" aria-hidden="true" />
        <div className="container">
          <Link to="/work" className="back-link"><Icon name="arrow_back" size={18} />All work</Link>
          <Eyebrow>{`Case study · ${c.category}`}</Eyebrow>
          <SplitText as="h1" className="page-title case-hero-title" text={c.title} onMount delay={0.3} />
          <Reveal as="p" className="lead case-tagline" delay={0.45}>{c.tagline}</Reveal>
          <Stagger as="dl" className="case-facts" gap={0.06}>
            {c.facts.map(([k, v]) => (
              <RevealItem key={k} className="case-fact"><dt className="mono">{k}</dt><dd>{v}</dd></RevealItem>
            ))}
          </Stagger>
          {c.live && (
            <Reveal className="btn-row" delay={0.5}>
              {internal
                ? <Button to={c.live} variant="secondary" iconStart="home" magnetic={false}>{c.liveLabel || 'Visit'}</Button>
                : <Button href={c.live} iconStart="open_in_new">{c.liveLabel || 'Visit live product'}</Button>}
            </Reveal>
          )}
        </div>
        <motion.div className="container case-cover" initial={{ opacity: 0, y: 60, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.5, duration: 1.2, ease }}>
          <motion.div className="case-cover-frame" style={{ y: coverY }}>
            <img src={c.cover} alt={`${c.title} — cover`} fetchPriority="high" />
          </motion.div>
        </motion.div>
      </header>

      <div className="container case-layout">
        <aside className="case-aside"><Toc available={available} /></aside>

        <article className="case-main">
          <section id="overview" className="case-section">
            <Eyebrow>01 · Overview</Eyebrow>
            {c.overview.map((p, i) => <Reveal as="p" key={i} className="case-lead" delay={i * 0.05}>{p}</Reveal>)}
            <Reveal className="role-callout">
              <span className="icon-tile"><Icon name="person" /></span>
              <div><h2 className="mono">My role</h2><p>{c.role}</p></div>
            </Reveal>
          </section>

          <section id="challenge" className="case-section">
            <Eyebrow>02 · The challenge</Eyebrow>
            <Reveal as="p" className="hmw">{c.challenge.question}</Reveal>
            <Stagger as="ul" className="needs" gap={0.06}>
              {c.challenge.needs.map(([k, v]) => (
                <RevealItem as="li" key={k} className="need"><h3>{k}</h3><p>{v}</p></RevealItem>
              ))}
            </Stagger>
          </section>

          <section id="approach" className="case-section">
            <Eyebrow>03 · Approach</Eyebrow>
            <ol className="steps">
              {c.approach.map(([t, d], i) => (
                <Reveal as="li" key={t} className="step" delay={i * 0.04}>
                  <span className="step-num mono">0{i + 1}</span>
                  <div><h3>{t}</h3><p>{d}</p></div>
                </Reveal>
              ))}
            </ol>
          </section>

          {c.decisions.length > 0 && (
            <section id="decisions" className="case-section">
              <Eyebrow>04 · Key decisions</Eyebrow>
              <div className="decisions">
                {c.decisions.map((d, i) => (
                  <div key={d.title} className={`decision${d.mobile ? ' is-mobile' : ''}`}>
                    <Reveal className="decision-copy">
                      <span className="mono decision-num">Decision {i + 1}</span>
                      <h3>{d.title}</h3>
                      <p>{d.text}</p>
                    </Reveal>
                    <Reveal delay={0.1}><Shot src={d.image} caption={d.caption} mobile={d.mobile} onOpen={setOpen} priority={i === 0} /></Reveal>
                  </div>
                ))}
              </div>
              {c.gallery.length > 0 && (
                <div className="gallery">
                  {c.gallery.map((g) => <Reveal key={g.src}><Shot {...g} onOpen={setOpen} /></Reveal>)}
                </div>
              )}
            </section>
          )}

          <section id="outcome" className="case-section">
            <Eyebrow>{`0${c.decisions.length ? 5 : 4} · Outcome`}</Eyebrow>
            {c.outcome.map((p, i) => <Reveal as="p" key={i} className="case-lead">{p}</Reveal>)}
            {quote && (
              <Reveal as="figure" className="mini-quote case-quote">
                <Icon name="format_quote" size={32} fill className="quote-icon" />
                <blockquote><p><Quote text={quote.quote} highlight={quote.highlight} /></p></blockquote>
                <Person name={quote.name} role={quote.role} linkedin={quote.linkedin} />
              </Reveal>
            )}
            <Reveal as="ul" className="chips case-tools">{c.tools.map((t) => <li key={t} className="chip">{t}</li>)}</Reveal>
          </section>
        </article>
      </div>

      <WavePanel id="reflection" className="reflection-wave" bottom={false}>
        <div className="container narrow">
          <Eyebrow>Reflection</Eyebrow>
          {c.reflection.map((p, i) => (
            <Reveal as="p" key={i} className={i === 0 ? 'reflection-lead' : 'lead'}>{p}</Reveal>
          ))}
          <Link to={`/work/${next.slug}`} className="next-case" data-cursor="Next">
            <span className="mono">Next case study</span>
            <span className="next-case-title">{next.title}<Icon name="arrow_forward" /></span>
            <span className="next-case-tagline">{next.tagline}</span>
          </Link>
        </div>
      </WavePanel>

      <Lightbox item={open} onClose={() => setOpen(null)} />
    </Page>
  );
}
