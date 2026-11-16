import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from 'motion/react';
import Page from '../components/Page';
import Silk from '../components/Silk';
import SplitText from '../components/SplitText';
import { Eyebrow } from '../components/SectionHead';
import Reveal, { Stagger, RevealItem } from '../components/Reveal';
import Button from '../components/Button';
import Icon from '../components/Icon';
import WavePanel from '../components/WavePanel';
import TiltCard from '../components/TiltCard';
import { Quote, Person } from '../components/Testimonials';
import { cases, caseBySlug } from '../data/cases';
import { testimonials } from '../data/testimonials';
import NotFound from './NotFound';

const ease = [0.22, 1, 0.36, 1];

/* ── Browser / phone frame that opens the viewer ─────────────────────── */
function Shot({ src, caption, mobile, onOpen, priority, className = '' }) {
  return (
    <figure className={`shot${mobile ? ' shot-mobile' : ''} ${className}`}>
      <button type="button" className="shot-frame" onClick={() => onOpen(src)} data-cursor="Expand" aria-label={`Expand image: ${caption || 'screen'}`}>
        {!mobile && <span className="shot-bar" aria-hidden="true"><i /><i /><i /></span>}
        <img src={src} alt={caption || ''} loading={priority ? 'eager' : 'lazy'} decoding="async" draggable="false" />
        <span className="shot-zoom" aria-hidden="true"><Icon name="open_in_full" size={18} /></span>
      </button>
      {caption && <figcaption className="mono">{caption}</figcaption>}
    </figure>
  );
}

/* ── Full-screen viewer with previous / next ─────────────────────────── */
function Lightbox({ items, index, onClose, onMove }) {
  const closeRef = useRef(null);
  const open = index != null;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    closeRef.current?.focus();
    window.__lenis?.stop();
    const key = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onMove(1);
      if (e.key === 'ArrowLeft') onMove(-1);
    };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); window.__lenis?.start(); prev?.focus?.(); };
  }, [open, onClose, onMove]);
  const item = open ? items[index] : null;
  return (
    <AnimatePresence>
      {item && (
        <motion.div className="lightbox" role="dialog" aria-modal="true" aria-label={item.caption || 'Screen preview'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} data-lenis-prevent>
          <button ref={closeRef} type="button" className="lightbox-close" onClick={onClose} aria-label="Close preview"><Icon name="close" /></button>
          {items.length > 1 && (
            <>
              <button type="button" className="lightbox-nav prev" onClick={(e) => { e.stopPropagation(); onMove(-1); }} aria-label="Previous screen"><Icon name="arrow_back" /></button>
              <button type="button" className="lightbox-nav next" onClick={(e) => { e.stopPropagation(); onMove(1); }} aria-label="Next screen"><Icon name="arrow_forward" /></button>
            </>
          )}
          <AnimatePresence mode="wait">
            <motion.figure key={item.src} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.35, ease }} onClick={(e) => e.stopPropagation()}>
              <img src={item.src} alt={item.caption || ''} />
              <figcaption><span className="mono">{index + 1} / {items.length}</span>{item.caption}</figcaption>
            </motion.figure>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Sticky contents with per-section progress ───────────────────────── */
function Toc({ available }) {
  const [active, setActive] = useState(available[0]?.[0]);
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-35% 0px -60% 0px' });
    available.forEach(([id]) => { const el = document.getElementById(id); el && io.observe(el); });
    return () => io.disconnect();
  }, [available]);
  const activeIndex = available.findIndex(([id]) => id === active);
  return (
    <nav className="toc" aria-label="Case study sections">
      <p className="footer-label">On this page</p>
      <div className="toc-track" aria-hidden="true"><motion.span animate={{ height: `${((activeIndex + 1) / available.length) * 100}%` }} transition={{ duration: 0.5, ease }} /></div>
      <ol>
        {available.map(([id, label], i) => (
          <li key={id}>
            <a href={`#${id}`} className={active === id ? 'is-active' : i < activeIndex ? 'is-done' : ''} aria-current={active === id ? 'true' : undefined}>
              <span className="mono">{String(i + 1).padStart(2, '0')}</span>{label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ── Process explorer: click a phase, see its detail ─────────────────── */
function ProcessExplorer({ process }) {
  const [i, setI] = useState(0);
  const refs = useRef([]);
  const p = process[i];
  const onKey = (e) => {
    let n = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % process.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + process.length) % process.length;
    if (n !== null) { e.preventDefault(); setI(n); refs.current[n]?.focus(); }
  };
  return (
    <div className="process-explorer">
      <div className="phase-rail" role="tablist" aria-label="Design process phases" onKeyDown={onKey}>
        <span className="phase-line" aria-hidden="true"><motion.span animate={{ width: `${(i / Math.max(process.length - 1, 1)) * 100}%` }} transition={{ duration: 0.6, ease }} /></span>
        {process.map((ph, k) => (
          <button
            key={ph.title}
            ref={(el) => (refs.current[k] = el)}
            role="tab"
            id={`phase-${k}`}
            aria-selected={i === k}
            aria-controls="phase-panel"
            tabIndex={i === k ? 0 : -1}
            className={`phase${i === k ? ' is-active' : ''}${k < i ? ' is-done' : ''}`}
            onClick={() => setI(k)}
          >
            <span className="phase-dot" aria-hidden="true">{k < i ? <Icon name="check" size={14} /> : ph.phase}</span>
            <span className="phase-name">{ph.title}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={i} id="phase-panel" role="tabpanel" aria-labelledby={`phase-${i}`} className="phase-panel" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease }}>
          <div>
            <p className="mono phase-count">Phase {p.phase} of {String(process.length).padStart(2, '0')}</p>
            <h3>{p.title}</h3>
            <p className="phase-summary">{p.summary}</p>
          </div>
          <div className="phase-detail">
            <p className="footer-label">What I did</p>
            <ul>{p.activities.map((a) => <li key={a}><Icon name="arrow_right_alt" size={18} />{a}</li>)}</ul>
            <p className="phase-output"><Icon name="inventory_2" size={18} /><span><span className="mono">Output</span>{p.output}</span></p>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="phase-controls">
        <button type="button" className="pause-btn" onClick={() => setI((i - 1 + process.length) % process.length)} aria-label="Previous phase"><Icon name="arrow_back" size={18} /></button>
        <button type="button" className="pause-btn" onClick={() => setI((i + 1) % process.length)} aria-label="Next phase"><Icon name="arrow_forward" size={18} /></button>
      </div>
    </div>
  );
}

/* ── Journey stepper: steps on one side, the screen on the other ──────── */
function Journey({ journey, onOpen }) {
  const [i, setI] = useState(0);
  const s = journey.steps[i];
  return (
    <div className="journey-stepper">
      <ol className="journey-steps">
        {journey.steps.map((st, k) => (
          <li key={st.label}>
            <button type="button" className={`jstep${i === k ? ' is-active' : ''}`} aria-pressed={i === k} onClick={() => setI(k)}>
              <span className="jstep-num mono">{String(k + 1).padStart(2, '0')}</span>
              <span className="jstep-body">
                <span className="jstep-label">{st.label}</span>
                <AnimatePresence initial={false}>
                  {i === k && (
                    <motion.span className="jstep-text" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }}>
                      {st.text}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="journey-screen" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div key={s.image} initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.5, ease }}>
            <Shot src={s.image} caption={`${String(i + 1).padStart(2, '0')} · ${s.label}`} mobile={s.mobile} onOpen={onOpen} />
          </motion.div>
        </AnimatePresence>
        <div className="journey-nav">
          <button type="button" className="pause-btn" onClick={() => setI((i - 1 + journey.steps.length) % journey.steps.length)} aria-label="Previous step"><Icon name="arrow_back" size={18} /></button>
          <span className="journey-progress" aria-hidden="true"><motion.span animate={{ width: `${((i + 1) / journey.steps.length) * 100}%` }} transition={{ duration: 0.5, ease }} /></span>
          <button type="button" className="pause-btn" onClick={() => setI((i + 1) % journey.steps.length)} aria-label="Next step"><Icon name="arrow_forward" size={18} /></button>
        </div>
      </div>
    </div>
  );
}

/* ── Draggable filmstrip of extra screens ────────────────────────────── */
function Filmstrip({ items, onOpen }) {
  const track = useRef(null);
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });
  const by = (d) => track.current?.scrollBy({ left: d * track.current.clientWidth * 0.7, behavior: 'smooth' });
  return (
    <div className="filmstrip-wrap">
      <div
        ref={track}
        className="filmstrip"
        data-lenis-prevent-wheel
        onPointerDown={(e) => { if (e.pointerType !== 'mouse') return; drag.current = { down: true, x: e.clientX, left: track.current.scrollLeft, moved: false }; }}
        onPointerMove={(e) => { const d = drag.current; if (!d.down) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 4) d.moved = true; track.current.scrollLeft = d.left - dx; }}
        onPointerUp={() => { drag.current.down = false; }}
        onPointerLeave={() => { drag.current.down = false; }}
        onClickCapture={(e) => { if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); } }}
      >
        {items.map((g) => (
          <div key={g.src} className={`film${g.mobile ? ' film-mobile' : ''}`}><Shot {...g} onOpen={onOpen} /></div>
        ))}
      </div>
      <div className="filmstrip-nav">
        <button type="button" className="pause-btn" onClick={() => by(-1)} aria-label="Scroll screens left"><Icon name="arrow_back" size={18} /></button>
        <button type="button" className="pause-btn" onClick={() => by(1)} aria-label="Scroll screens right"><Icon name="arrow_forward" size={18} /></button>
      </div>
    </div>
  );
}

export default function CaseStudy() {
  const { slug } = useParams();
  const c = caseBySlug[slug];
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const coverY = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);
  const coverScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const { scrollYProgress: pageProgress } = useScroll();
  const bar = useSpring(pageProgress, { stiffness: 140, damping: 30 });

  /* every image on the page, in reading order, for the viewer */
  const images = useMemo(() => {
    if (!c) return [];
    const list = [];
    const add = (src, caption) => { if (src && !list.find((x) => x.src === src)) list.push({ src, caption }); };
    c.journey?.steps.forEach((s) => add(s.image, s.label));
    c.decisions?.forEach((d) => add(d.image, d.caption));
    c.gallery?.forEach((g) => add(g.src, g.caption));
    return list;
  }, [c]);
  const [viewer, setViewer] = useState(null);
  const openSrc = useCallback((src) => setViewer(images.findIndex((x) => x.src === src)), [images]);
  const move = useCallback((d) => setViewer((v) => (v == null ? v : (v + d + images.length) % images.length)), [images.length]);
  const close = useCallback(() => setViewer(null), []);

  if (!c) return <NotFound />;

  const idx = cases.findIndex((x) => x.slug === slug);
  const next = cases[(idx + 1) % cases.length];
  const quote = c.quoteFrom ? testimonials.find((t) => t.name === c.quoteFrom) : null;
  const internal = c.live?.startsWith('/');

  const sections = [
    c.tldr && ['summary', 'Summary'],
    ['context', 'Context'],
    c.users?.length && ['users', 'Users'],
    c.process?.length && ['process', 'Process'],
    c.journey && ['journey', 'Journey'],
    c.decisions?.length && ['decisions', 'Key decisions'],
    ['outcome', 'Outcome'],
    ['reflection', 'Reflection'],
  ].filter(Boolean);
  const num = (id) => String(sections.findIndex(([s]) => s === id) + 1).padStart(2, '0');

  return (
    <Page title={`${c.title} — Case study`} description={c.tagline}>
      <div className="case-theme" style={{ '--case': c.accent || 'var(--accent)' }}>
        <motion.div className="case-progress" style={{ scaleX: bar }} aria-hidden="true" />

        {/* ── HERO ── */}
        <header ref={heroRef} className="case-hero">
          <Silk lines={30} intensity={0.6} />
          <div className="case-hero-glow" aria-hidden="true" />
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
                <Button href="#summary" variant="secondary" iconStart="south" magnetic={false}>Read the case study</Button>
              </Reveal>
            )}
          </div>
          <motion.div className="container case-cover" initial={{ opacity: 0, y: 70 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1.2, ease }}>
            <motion.div className="case-cover-frame" style={{ y: coverY, scale: coverScale }}>
              <span className="shot-bar" aria-hidden="true"><i /><i /><i /></span>
              <img src={c.cover} alt={`${c.title} — cover`} fetchPriority="high" />
            </motion.div>
            {c.glance && (
              <Stagger className="glance" gap={0.08}>
                {c.glance.map(([v, l]) => (
                  <RevealItem key={l} className="glance-item"><strong>{v}</strong><span>{l}</span></RevealItem>
                ))}
              </Stagger>
            )}
          </motion.div>
        </header>

        <div className="container case-layout">
          <aside className="case-aside"><Toc available={sections} /></aside>

          <article className="case-main">
            {/* ── SUMMARY ── */}
            {c.tldr && (
              <section id="summary" className="case-section">
                <Eyebrow>{`${num('summary')} · The short version`}</Eyebrow>
                <Stagger className="tldr" gap={0.1}>
                  {[['Problem', 'report', c.tldr.problem], ['Approach', 'route', c.tldr.approach], ['Outcome', 'flag', c.tldr.outcome]].map(([k, icon, v]) => (
                    <RevealItem key={k}>
                      <TiltCard className="tldr-card" max={3}>
                        <span className="tldr-icon"><Icon name={icon} size={22} /></span>
                        <h2 className="mono">{k}</h2>
                        <p>{v}</p>
                      </TiltCard>
                    </RevealItem>
                  ))}
                </Stagger>
              </section>
            )}

            {/* ── CONTEXT ── */}
            <section id="context" className="case-section">
              <Eyebrow>{`${num('context')} · Context`}</Eyebrow>
              {c.overview.map((p, i) => <Reveal as="p" key={i} className="case-lead" delay={i * 0.05}>{p}</Reveal>)}
              <div className="context-grid">
                <Reveal className="role-callout">
                  <span className="icon-tile"><Icon name="person" /></span>
                  <div><h3 className="mono">My role</h3><p>{c.role}</p></div>
                </Reveal>
                {c.constraints?.length > 0 && (
                  <Reveal className="constraints" delay={0.1}>
                    <h3 className="mono">Constraints</h3>
                    <ul>{c.constraints.map((k) => <li key={k}><Icon name="lock" size={16} />{k}</li>)}</ul>
                  </Reveal>
                )}
              </div>
            </section>

            {/* ── USERS ── */}
            {c.users?.length > 0 && (
              <section id="users" className="case-section">
                <Eyebrow>{`${num('users')} · Who it’s for`}</Eyebrow>
                <Reveal as="h2" className="case-h2">Designing for <span className="dim">{c.users.length} kinds of people.</span></Reveal>
                <Stagger className="users" gap={0.08}>
                  {c.users.map((u) => (
                    <RevealItem key={u.name}>
                      <TiltCard className="user-card" max={5}>
                        <span className="user-icon"><Icon name={u.icon} size={24} /></span>
                        <h3>{u.name}</h3>
                        <dl>
                          <div><dt className="mono"><Icon name="target" size={14} />Goal</dt><dd>{u.goal}</dd></div>
                          <div><dt className="mono"><Icon name="error" size={14} />Friction</dt><dd>{u.pain}</dd></div>
                        </dl>
                      </TiltCard>
                    </RevealItem>
                  ))}
                </Stagger>
              </section>
            )}

            {/* ── PROCESS ── */}
            {c.process?.length > 0 && (
              <section id="process" className="case-section">
                <Eyebrow>{`${num('process')} · My process`}</Eyebrow>
                <Reveal as="h2" className="case-h2">How the work <span className="dim">came together.</span></Reveal>
                <Reveal><ProcessExplorer process={c.process} /></Reveal>
                {c.principles?.length > 0 && (
                  <div className="principles-block">
                    <p className="footer-label">Design principles for this project</p>
                    <Stagger className="case-principles" gap={0.06}>
                      {c.principles.map(([t, d], i) => (
                        <RevealItem key={t} className="case-principle">
                          <span className="mono">P{i + 1}</span>
                          <h3>{t}</h3>
                          <p>{d}</p>
                        </RevealItem>
                      ))}
                    </Stagger>
                  </div>
                )}
              </section>
            )}

            {/* ── JOURNEY ── */}
            {c.journey && (
              <section id="journey" className="case-section">
                <Eyebrow>{`${num('journey')} · The journey`}</Eyebrow>
                <Reveal as="h2" className="case-h2">{c.journey.title}</Reveal>
                {c.journey.intro && <Reveal as="p" className="case-lead">{c.journey.intro}</Reveal>}
                <Reveal><Journey journey={c.journey} onOpen={openSrc} /></Reveal>
              </section>
            )}

            {/* ── DECISIONS ── */}
            {c.decisions?.length > 0 && (
              <section id="decisions" className="case-section">
                <Eyebrow>{`${num('decisions')} · Key decisions`}</Eyebrow>
                <Reveal as="h2" className="case-h2">The calls that <span className="dim">shaped the product.</span></Reveal>
                <div className="decisions">
                  {c.decisions.map((d, i) => (
                    <div key={d.title} className={`decision${d.mobile ? ' is-mobile' : ''}`}>
                      <Reveal className="decision-copy">
                        <span className="mono decision-num">Decision {String(i + 1).padStart(2, '0')}</span>
                        <h3>{d.title}</h3>
                        <p>{d.text}</p>
                        {d.tradeoff && (
                          <p className="tradeoff"><Icon name="balance" size={18} /><span><span className="mono">Trade-off</span>{d.tradeoff}</span></p>
                        )}
                      </Reveal>
                      <Reveal delay={0.1}><Shot src={d.image} caption={d.caption} mobile={d.mobile} onOpen={openSrc} priority={i === 0} /></Reveal>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {c.gallery?.length > 0 && (
              <section className="case-section" aria-label="More screens">
                <p className="footer-label">More screens · drag or use the arrows</p>
                <Reveal><Filmstrip items={c.gallery} onOpen={openSrc} /></Reveal>
              </section>
            )}

            {/* ── OUTCOME ── */}
            <section id="outcome" className="case-section">
              <Eyebrow>{`${num('outcome')} · Outcome`}</Eyebrow>
              {c.outcome.map((p, i) => <Reveal as="p" key={i} className="case-lead">{p}</Reveal>)}
              {quote && (
                <Reveal as="figure" className="mini-quote case-quote">
                  <Icon name="format_quote" size={32} fill className="quote-icon" />
                  <blockquote><p><Quote text={quote.quote} highlight={quote.highlight} /></p></blockquote>
                  <Person name={quote.name} role={quote.role} linkedin={quote.linkedin} />
                </Reveal>
              )}
              {c.next?.length > 0 && (
                <Reveal className="next-steps">
                  <h3 className="mono">What I’d do next</h3>
                  <ol>{c.next.map((n, i) => <li key={n}><span className="mono">{i + 1}</span>{n}</li>)}</ol>
                </Reveal>
              )}
              <Reveal as="ul" className="chips case-tools">{c.tools.map((t) => <li key={t} className="chip">{t}</li>)}</Reveal>
            </section>
          </article>
        </div>

        <WavePanel id="reflection" className="reflection-wave" bottom={false}>
          <div className="container narrow">
            <Eyebrow>{`${num('reflection')} · Reflection`}</Eyebrow>
            {c.reflection.map((p, i) => <Reveal as="p" key={i} className={i === 0 ? 'reflection-lead' : 'lead'}>{p}</Reveal>)}
            <Link to={`/work/${next.slug}`} className="next-case" data-cursor="Next">
              <span className="mono">Next case study</span>
              <span className="next-case-title">{next.title}<Icon name="arrow_forward" /></span>
              <span className="next-case-tagline">{next.tagline}</span>
              <span className="next-case-thumb" aria-hidden="true"><img src={next.cover} alt="" loading="lazy" /></span>
            </Link>
          </div>
        </WavePanel>

        <Lightbox items={images} index={viewer} onClose={close} onMove={move} />
      </div>
    </Page>
  );
}
