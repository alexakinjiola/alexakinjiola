import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import Page from '../components/Page';
import SplitText from '../components/SplitText';
import SectionHead, { Eyebrow } from '../components/SectionHead';
import Reveal, { Stagger, RevealItem } from '../components/Reveal';
import Button from '../components/Button';
import Counter from '../components/Counter';
import TiltCard from '../components/TiltCard';
import CtaBand from '../components/CtaBand';
import Icon from '../components/Icon';
import Silk from '../components/Silk';
import WavePanel from '../components/WavePanel';
import Journey from '../components/Journey';
import Testimonials from '../components/Testimonials';
import { cases } from '../data/cases';

const carouselCases = cases.filter((c) => c.group !== 'web');

const ease = [0.22, 1, 0.36, 1];

/* Shared pointer position (-0.5…0.5) for layered parallax inside a section. */
function usePointerParallax(ref) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 60, damping: 18 });
  const sy = useSpring(y, { stiffness: 60, damping: 18 });
  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    const move = (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      x.set((e.clientX - r.left) / r.width - 0.5);
      y.set((e.clientY - r.top) / r.height - 0.5);
    };
    el.addEventListener('pointermove', move);
    return () => el.removeEventListener('pointermove', move);
  }, [ref, reduce, x, y]);
  return [sx, sy];
}

function Float({ children, className, depth = 20, px, py, delay = 0, duration = 6, ...rest }) {
  const reduce = useReducedMotion();
  const x = useTransform(px, (v) => v * depth);
  const y = useTransform(py, (v) => v * depth);
  return (
    <motion.div className={className} style={{ x, y }} {...rest}>
      <motion.div
        animate={reduce ? undefined : { y: [0, -12, 0] }}
        transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
        style={{ height: '100%' }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ── Hero ─────────────────────────────────────────────────────── */
function Hero({ play }) {
  const ref = useRef(null);
  const [px, py] = usePointerParallax(ref);
  const enter = (d) => ({ initial: { opacity: 0, y: 24 }, animate: play ? { opacity: 1, y: 0 } : {}, transition: { delay: d, duration: 1, ease } });

  return (
    <section ref={ref} id="top" className="hero" aria-labelledby="hero-title">
      <Silk className="hero-silk" />
      <div className="hero-vignette" aria-hidden="true" />
      <div className="container hero-grid">
        <div className="hero-copy">
          <motion.p className="kicker" {...enter(0.1)}>Senior Product Designer · Complex products, made clear</motion.p>
          <SplitText as="h1" id="hero-title" className="hero-title" text="I turn complex product problems into" dim="simple, scalable experiences." breakBefore onMount play={play} delay={0.2} />
          <motion.p className="hero-sub" {...enter(0.6)}>
            I'm Alex Akinjiola — a Senior Product Designer for complex, multi-role products: SaaS, EdTech, PropTech and fintech platforms where many kinds of users share one system. 5+ years turning tangled workflows into products people actually enjoy using.
          </motion.p>
          <motion.div className="btn-row" {...enter(0.75)}>
            <Button to="/work" icon="arrow_forward">View my work</Button>
            <Button to="/contact" variant="secondary">Let's talk</Button>
          </motion.div>
        </div>

        <motion.div className="hero-stage" initial={{ opacity: 0, scale: 0.92 }} animate={play ? { opacity: 1, scale: 1 } : {}} transition={{ delay: 0.35, duration: 1.4, ease }} aria-hidden="true">
          <Float className="device device-back" depth={-26} px={px} py={py} duration={7}>
            <div className="device-frame"><img src="/images/krent.webp" alt="" /></div>
          </Float>
          <Float className="device device-front" depth={34} px={px} py={py} delay={0.8} duration={6}>
            <div className="device-frame"><img src="/images/paytrackr.webp" alt="" /></div>
          </Float>
          <Float className="hero-widget hero-widget-metric" depth={52} px={px} py={py} delay={0.3} duration={5}>
            <span className="mono">Usability</span>
            <strong>+89%</strong>
            <svg viewBox="0 0 120 36"><path d="M0 30 C 20 28 30 24 45 22 S 70 12 85 14 S 110 4 120 2" /></svg>
          </Float>
          <Float className="hero-widget hero-widget-avail" depth={44} px={px} py={py} delay={1.2} duration={6.5}>
            <span className="avail-dot" />
            <span>Available for<br />new opportunities</span>
          </Float>
        </motion.div>
      </div>
      <motion.a href="#about" className="scroll-cue" {...enter(1.2)} aria-label="Scroll to the next section">
        <span className="scroll-mouse" aria-hidden="true"><span /></span>
        <span className="mono">Scroll down</span>
      </motion.a>
    </section>
  );
}

/* ── About (white wave panel) ─────────────────────────────────── */
function About() {
  return (
    <WavePanel id="about" className="about-wave">
      <div className="container about-grid">
        <Reveal className="ink-portrait">
          <span className="ink ink-1" aria-hidden="true" />
          <span className="ink ink-2" aria-hidden="true" />
          <span className="ink ink-3" aria-hidden="true" />
          <div className="ink-photo"><img src="/images/alex-portrait.webp" alt="Alex Akinjiola, Senior Product Designer" loading="lazy" /></div>
        </Reveal>
        <div>
          <SectionHead eyebrow="About me" title="Some products don't have a feature problem. They have a" dim="clarity problem." breakBefore={false} />
          <Reveal as="p" className="lead">I work at the intersection of users, business requirements, technology, and product thinking — to find the friction, structure the problem, and turn complexity into something people can actually use.</Reveal>
          <Stagger as="dl" className="about-stats">
            {[[5, '+', 'Years experience'], [37, '+', 'Products shipped'], [89, '%', 'Usability improvement']].map(([v, s, l]) => (
              <RevealItem key={l} className="about-stat">
                <dt>{l}</dt>
                <dd><Counter value={v} suffix={s} /></dd>
              </RevealItem>
            ))}
          </Stagger>
          <Reveal className="btn-row"><Button to="/about" variant="secondary" icon="arrow_forward" magnetic={false}>More about me</Button></Reveal>
        </div>
      </div>
    </WavePanel>
  );
}

/* ── Floating skill cards ─────────────────────────────────────── */
const skills = [
  { name: 'Product Design', note: 'Primary discipline', icon: 'deployed_code', proof: '0 → 1 at Ajiroba · redesign at Krent', pos: 'hub' },
  { name: 'Design Systems', icon: 'grid_view', proof: '60+ component library', pos: 'a' },
  { name: 'Figma & Prototyping', icon: 'design_services', proof: 'Interactive flows for handoff', pos: 'b' },
  { name: 'UX Strategy & IA', icon: 'account_tree', proof: 'Five user types, one platform', pos: 'c' },
  { name: 'Frontend', icon: 'code', proof: 'Ships what it designs — React', pos: 'd' },
  { name: 'Data & Analytics', icon: 'bar_chart', proof: 'SQL · Excel · Power BI', pos: 'e' },
];

function Skills() {
  const ref = useRef(null);
  const [px, py] = usePointerParallax(ref);
  return (
    <section ref={ref} id="skills" className="section skills-section">
      <Silk className="skills-silk" lines={30} intensity={0.7} />
      <div className="container skills-grid">
        <div>
          <SectionHead eyebrow="My skills" title="Expertise with" dim="intent." breakBefore lead="Product design at the centre. Frontend awareness and data literacy at the edges — so I design with implementation in mind and validate decisions with real evidence." />
          <Reveal className="btn-row"><Button to="/capabilities" variant="secondary" icon="arrow_forward" magnetic={false}>All capabilities</Button></Reveal>
        </div>
        <Stagger as="ul" className="skill-cloud" gap={0.08}>
          {skills.map((s, i) => (
            <RevealItem as="li" key={s.name} className={`skill-slot skill-${s.pos}`}>
              <Float depth={s.pos === 'hub' ? 14 : 24 + i * 6} px={px} py={py} delay={i * 0.4} duration={5 + (i % 3)}>
                <TiltCard as="div" className={`skill-card${s.pos === 'hub' ? ' is-hub' : ''}`} max={8}>
                  <span className="icon-tile"><Icon name={s.icon} size={s.pos === 'hub' ? 30 : 22} /></span>
                  <span className="skill-name">{s.name}</span>
                  {s.note && <span className="skill-note mono">{s.note}</span>}
                  <span className="skill-proof">{s.proof}</span>
                </TiltCard>
              </Float>
            </RevealItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ── Projects carousel ────────────────────────────────────────── */
function Projects() {
  const track = useRef(null);
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });
  const [edge, setEdge] = useState({ start: true, end: false });

  const update = () => {
    const el = track.current;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  };
  const by = (dir) => {
    const el = track.current;
    const card = el.querySelector('.carousel-card');
    el.scrollBy({ left: dir * (card.offsetWidth + 20), behavior: 'smooth' });
  };
  const down = (e) => { if (e.pointerType !== 'mouse') return; drag.current = { down: true, x: e.clientX, left: track.current.scrollLeft, moved: false }; };
  const move = (e) => {
    const d = drag.current; if (!d.down) return;
    const dx = e.clientX - d.x; if (Math.abs(dx) > 4) d.moved = true;
    track.current.scrollLeft = d.left - dx;
  };
  const up = () => { drag.current.down = false; };
  const click = (e) => { if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); } };

  return (
    <section id="work" className="section projects-section">
      <div className="container projects-grid">
        <div className="projects-intro">
          <SectionHead eyebrow="Featured projects" title="Digital products" dim="that make an impact." breakBefore lead="Each project is a story of real users, real constraints and design decisions that made complex things easier to use." />
          <Reveal className="btn-row">
            <Button to="/work" variant="secondary" icon="add" magnetic={false}>Explore all projects</Button>
          </Reveal>
          <div className="carousel-nav">
            <button type="button" onClick={() => by(-1)} disabled={edge.start} aria-label="Previous projects"><Icon name="arrow_back" /></button>
            <button type="button" onClick={() => by(1)} disabled={edge.end} aria-label="Next projects"><Icon name="arrow_forward" /></button>
          </div>
        </div>
        <Stagger
          as="ul"
          ref={track}
          className="carousel"
          gap={0.07}
          onScroll={update}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
          onClickCapture={click}
          aria-label="Selected projects"
        >
          {carouselCases.map((p, i) => (
            <RevealItem as="li" key={p.id} className="carousel-item">
              <TiltCard className="carousel-card" max={7} data-cursor="Read">
                <Link to={`/work/${p.slug}`} className="case-card-link" aria-label={`${p.title} case study`} draggable="false" />
                <div className="carousel-media">
                  <img src={p.cover} alt="" loading="lazy" draggable="false" />
                  <span className="carousel-num mono">0{i + 1}</span>
                </div>
                <div className="carousel-body">
                  <h3>{p.title}</h3>
                  <p>{p.tagline}</p>
                  <ul className="chips"><li className="chip">{p.category}</li></ul>
                  <span className="text-link">Read case study<Icon name="arrow_forward" size={16} /></span>
                </div>
              </TiltCard>
            </RevealItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ── Section rail (desktop) ───────────────────────────────────── */
const railItems = [['top', 'Intro'], ['about', 'About'], ['skills', 'Skills'], ['work', 'Work'], ['journey', 'Journey'], ['testimonials', 'Kind words']];
function SectionRail() {
  const [active, setActive] = useState('top');
  useEffect(() => {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-45% 0px -50% 0px' });
    railItems.forEach(([id]) => { const el = document.getElementById(id); el && io.observe(el); });
    return () => io.disconnect();
  }, []);
  return (
    <nav className="rail" aria-label="Sections on this page">
      {railItems.map(([id, label]) => (
        <a key={id} href={`#${id}`} className={active === id ? 'is-active' : ''} aria-current={active === id ? 'true' : undefined}>
          <span className="rail-label">{label}</span>
        </a>
      ))}
    </nav>
  );
}

export default function Home({ introDone = true }) {
  return (
    <Page description="Alex Akinjiola — Senior Product Designer who turns complex product problems into simple, scalable experiences. Available for remote and hybrid roles.">
      <SectionRail />
      <Hero play={introDone} />
      <About />
      <Skills />
      <Projects />
      <WavePanel id="journey" className="journey-wave">
        <div className="container">
          <SectionHead eyebrow="Experience" title="The journey" dim="that shaped me." breakBefore />
          <Journey />
          <Reveal className="btn-row"><Button to="/experience" variant="secondary" icon="arrow_forward" magnetic={false}>Full experience</Button></Reveal>
        </div>
      </WavePanel>
      <Testimonials />
      <CtaBand
        eyebrow="Let's work together"
        title="Have a"
        dim="project in mind?"
        breakBefore={false}
        lead="Whether you're launching a new product, improving an existing experience, or untangling a complex workflow — I'd like to hear about it."
        secondary={{ to: '/work', label: 'See my work' }}
      />
    </Page>
  );
}
