import { useRef } from 'react';
import { Link } from 'react-router';
import { motion, useScroll, useTransform, useMotionValue, useMotionTemplate, useReducedMotion } from 'motion/react';
import Page from '../components/Page';
import SplitText from '../components/SplitText';
import SectionHead, { Eyebrow } from '../components/SectionHead';
import Reveal, { Stagger, RevealItem } from '../components/Reveal';
import Button from '../components/Button';
import Counter from '../components/Counter';
import Marquee from '../components/Marquee';
import TiltCard from '../components/TiltCard';
import CtaBand from '../components/CtaBand';
import Icon from '../components/Icon';
import { marquee } from '../data/site';
import { selectedWork } from '../data/projects';
import { problems, impact, process, principles, capabilities } from '../data/home';
import { roles } from '../data/experience';

const ease = [0.22, 1, 0.36, 1];

function Hero({ play }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const photoY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const copyY = useTransform(scrollYProgress, [0, 1], ['0%', '-10%']);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const mx = useMotionValue(70);
  const my = useMotionValue(30);
  const spotlight = useMotionTemplate`radial-gradient(520px circle at ${mx}% ${my}%, rgb(184 243 90 / .10), transparent 65%)`;

  const onMove = (e) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const r = ref.current.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 100);
    my.set(((e.clientY - r.top) / r.height) * 100);
  };
  const enter = (d) => ({ initial: { opacity: 0, y: 20 }, animate: play ? { opacity: 1, y: 0 } : {}, transition: { delay: d, duration: 0.9, ease } });

  return (
    <section ref={ref} className="hero" onPointerMove={onMove} aria-labelledby="hero-title">
      <div className="hero-aurora" aria-hidden="true"><span /><span /><span /></div>
      <motion.div className="hero-spotlight" style={{ background: spotlight }} aria-hidden="true" />
      <div className="hero-dots" aria-hidden="true" />

      <div className="container hero-grid">
        <motion.div className="hero-copy" style={{ y: copyY, opacity: fade }}>
          <motion.p className="hero-chip" {...enter(0.05)}>
            <span className="pulse-dot" aria-hidden="true" />
            Product Designer · UX/UI<span className="hide-xs"> · Digital Products</span>
          </motion.p>
          <SplitText as="h1" id="hero-title" className="hero-title" text="I turn complex product problems into" dim="simple, scalable experiences." breakBefore onMount play={play} delay={0.15} />
          <motion.p className="hero-sub" {...enter(0.55)}>
            I'm Alex — a Product Designer with 5+ years across SaaS, EdTech, fintech, PropTech and e-commerce, delivering measurable improvements in usability, user satisfaction and product clarity.
          </motion.p>
          <motion.div className="btn-row" {...enter(0.7)}>
            <Button to="/work" icon="arrow_forward">View my work</Button>
            <Button to="/contact" variant="secondary">Let's talk</Button>
          </motion.div>
          <motion.ul className="hero-meta" {...enter(0.85)}>
            <li><Icon name="location_on" size={18} />Lagos, Nigeria</li>
            <li><Icon name="public" size={18} />Remote · Hybrid · Relocation</li>
          </motion.ul>
        </motion.div>

        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, scale: 0.94, rotate: -2 }}
          animate={play ? { opacity: 1, scale: 1, rotate: 0 } : {}}
          transition={{ delay: 0.3, duration: 1.2, ease }}
        >
          <TiltCard as="div" className="hero-portrait" max={5}>
            <motion.img
              src="/images/alex-portrait.webp"
              alt="Portrait of Alex Akinjiola in a navy suit"
              width="1200" height="1500"
              fetchPriority="high"
              style={{ y: photoY, scale: 1.12 }}
            />
            <div className="hero-badge">
              <span className="pulse-dot" aria-hidden="true" />
              <span><strong>Open to work</strong><small>Available immediately</small></span>
            </div>
          </TiltCard>
          <svg className="hero-ring" viewBox="0 0 200 200" aria-hidden="true">
            <defs><path id="ring-path" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" /></defs>
            <text><textPath href="#ring-path">PRODUCT DESIGN · DESIGN SYSTEMS · UX STRATEGY · </textPath></text>
          </svg>
        </motion.div>
      </div>

      <motion.a href="#problem" className="scroll-cue" {...enter(1.1)} aria-label="Scroll to content">
        <span className="scroll-cue-line" aria-hidden="true" />
        <span className="mono">Scroll</span>
      </motion.a>
    </section>
  );
}

function ProcessTimeline() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 60%'] });
  const height = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  return (
    <ol ref={ref} className="process">
      <motion.span className="process-fill" style={{ height }} aria-hidden="true" />
      {process.map(([title, text], i) => (
        <Reveal as="li" key={title} className="process-step" delay={i * 0.04}>
          <span className="process-num mono">0{i + 1}</span>
          <div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        </Reveal>
      ))}
    </ol>
  );
}

export default function Home({ introDone = true }) {
  return (
    <Page description="Alex Akinjiola — Product Designer who turns complex product problems into simple, scalable experiences. Available for remote and hybrid roles.">
      <Hero play={introDone} />
      <Marquee items={marquee} />

      {/* PROBLEM */}
      <section id="problem" className="section section-surface">
        <div className="container narrow">
          <SectionHead eyebrow="The problem I solve" title="Some products don't have a feature problem." dim="They have a clarity problem." />
          <Reveal as="p" className="lead">A product can have all the right features and still feel difficult to use.</Reveal>
          <Stagger as="ul" className="problem-grid">
            {problems.map((p) => (
              <RevealItem as="li" key={p.text} className="problem-card">
                <Icon name={p.icon} size={22} />
                <span>{p.text}</span>
              </RevealItem>
            ))}
          </Stagger>
          <Reveal as="p" className="lead">Eventually, complexity becomes part of the user experience. <strong>That's where I come in.</strong></Reveal>
          <Reveal className="callout">
            <Icon name="emoji_objects" size={22} />
            <p>I work at the intersection of users, business requirements, technology, and product thinking — to find the friction, structure the problem, and turn complexity into something people can actually use.</p>
          </Reveal>
        </div>
      </section>

      {/* IMPACT */}
      <section className="section">
        <div className="container">
          <SectionHead eyebrow="Measured outcomes" title="I measure my work by" dim="what changes." lead="Beautiful interfaces are important. But the real question is: what became better because I designed it?" />
          <Stagger className="bento bento-3">
            {impact.map((m) => (
              <RevealItem key={m.label}>
                <TiltCard className="metric-card" max={4}>
                  <p className="metric-value">{m.word ?? <Counter value={m.value} suffix={m.suffix} />}</p>
                  <h3>{m.label}</h3>
                  <p>{m.text}</p>
                  <p className="mono metric-source">{m.source}</p>
                </TiltCard>
              </RevealItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* SELECTED WORK */}
      <section className="section section-surface">
        <div className="container">
          <div className="section-head-row">
            <SectionHead eyebrow="Selected work" title="Products I've helped" dim="make clearer." lead="Real products. Real constraints. Real design decisions." />
            <Reveal className="hide-sm"><Button to="/work" variant="secondary" icon="arrow_forward">All work</Button></Reveal>
          </div>
          <Stagger className="work-bento" gap={0.06}>
            {selectedWork.map((p, i) => (
              <RevealItem key={p.id} className={`work-cell work-cell-${i + 1}`}>
                <TiltCard className="work-card" max={3} data-cursor="View">
                  <div className="work-media">
                    <img src={p.image} alt={`${p.title} — ${p.headline}`} loading="lazy" decoding="async" />
                    <span className="chip chip-glass">{p.category}</span>
                  </div>
                  <div className="work-body">
                    <h3><span className="work-name">{p.title}</span> — {p.headline}</h3>
                    <p>{p.summary}</p>
                    <div className="work-links">
                      {p.links.map((l, j) => (
                        <Button key={l.label} href={l.href} size="sm" variant={j === 0 ? 'light' : 'secondary'} iconStart={l.icon} magnetic={false}>{l.label}</Button>
                      ))}
                    </div>
                  </div>
                </TiltCard>
              </RevealItem>
            ))}
          </Stagger>
          <Reveal className="more-strip">
            <p>More projects including Creatifff, Ledger Studio, Folu Atelier and a data analytics project.</p>
            <Button to="/work" variant="secondary" icon="arrow_forward">See all work</Button>
          </Reveal>
        </div>
      </section>

      {/* HOW I WORK */}
      <section className="section">
        <div className="container split-2">
          <div className="sticky-col">
            <SectionHead eyebrow="How I work" title="I don't start with pixels." dim="I start with the problem." lead="Before I design a screen, I want to understand what that screen is supposed to accomplish. The answers determine the design." />
          </div>
          <ProcessTimeline />
        </div>
      </section>

      {/* PRINCIPLES */}
      <section className="section section-surface">
        <div className="container">
          <SectionHead eyebrow="Design principles" title="What guides" dim="every decision." />
          <Stagger className="principles">
            {principles.map(([t, d], i) => (
              <RevealItem key={t} className="principle">
                <span className="mono principle-num">P/0{i + 1}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </RevealItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="section">
        <div className="container">
          <div className="section-head-row">
            <SectionHead eyebrow="Capabilities" title="What I bring to" dim="a product team." />
            <Reveal className="hide-sm"><Button to="/capabilities" variant="secondary" icon="arrow_forward">Capabilities</Button></Reveal>
          </div>
          <Stagger className="bento bento-3">
            {capabilities.map((c) => (
              <RevealItem key={c.title}>
                <TiltCard className="cap-card" max={3}>
                  <span className="icon-tile"><Icon name={c.icon} size={22} /></span>
                  <h3>{c.title}</h3>
                  <p>{c.text}</p>
                  <ul className="chips">{c.tags.map((t) => <li key={t} className="chip">{t}</li>)}</ul>
                </TiltCard>
              </RevealItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* EXPERIENCE */}
      <section className="section section-surface">
        <div className="container">
          <SectionHead eyebrow="Experience" title="Where I've" dim="worked." breakBefore={false} />
          <Stagger as="ol" className="exp-rows">
            {roles.map((r) => (
              <RevealItem as="li" key={r.company} className="exp-row">
                <span className="mono exp-row-period">{r.period}</span>
                <div>
                  <h3>{r.company}</h3>
                  <p className="exp-row-role">{r.role} · {r.type.replace('Current · ', '')}</p>
                  <p>{r.short}</p>
                </div>
                {r.current ? <span className="chip chip-accent">Current</span> : <span />}
              </RevealItem>
            ))}
          </Stagger>
          <Reveal className="btn-row" delay={0.1}>
            <Button to="/experience" variant="secondary" icon="arrow_forward">Full experience</Button>
          </Reveal>
        </div>
      </section>

      <CtaBand
        title="Building something complicated?"
        dim="Let's make it clearer."
        lead="Whether you're launching a new product, improving an existing experience, or trying to untangle a complex workflow — I'd like to hear about it."
        secondary={{ to: '/work', label: 'See my work' }}
      />
    </Page>
  );
}
