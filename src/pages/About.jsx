import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import Page from '../components/Page';
import Silk from '../components/Silk';
import SectionHead, { Eyebrow } from '../components/SectionHead';
import SplitText from '../components/SplitText';
import Reveal, { Stagger, RevealItem } from '../components/Reveal';
import Counter from '../components/Counter';
import TiltCard from '../components/TiltCard';
import CtaBand from '../components/CtaBand';
import Icon from '../components/Icon';
import { chapters, aboutStats, perspectives, beyond } from '../data/about';
import { process, principles } from '../data/home';
import WavePanel from '../components/WavePanel';

/* Turns **bold** markers in copy into <strong>. */
function Rich({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  );
}

function Portrait() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);
  return (
    <div ref={ref} className="about-portrait">
      <TiltCard as="div" className="portrait-frame" max={4}>
        <motion.img src="/images/alex-portrait.webp" alt="Alex Akinjiola, Senior Product Designer based in Lagos" loading="lazy" style={{ y, scale: 1.12 }} />
      </TiltCard>
      <ul className="meta-list">
        <li><Icon name="location_on" size={18} />Lagos, Nigeria</li>
        <li><Icon name="work" size={18} />Senior Product Designer · 5+ years</li>
        <li><Icon name="language" size={18} />Full-time remote &amp; hybrid roles</li>
      </ul>
    </div>
  );
}

export default function About() {
  return (
    <Page title="About" description="The story behind Alex Akinjiola — from civil engineering to product design, frontend and data analytics.">
      <header className="page-hero">
        <Silk lines={30} intensity={0.65} />
        <div className="page-hero-glow" aria-hidden="true" />
        <div className="container">
          <Eyebrow>About</Eyebrow>
          <SplitText as="h1" className="page-title" text="I'm a Senior Product Designer who likes solving" dim="complicated problems." breakBefore onMount delay={0.35} />
          <Reveal as="p" className="lead" delay={0.5}>I'm Alex Akinjiola. A Senior Product Designer with 5+ years of experience working across digital products including SaaS, EdTech, e-commerce, and fintech. But design wasn't where my professional journey started.</Reveal>
        </div>
      </header>

      <section className="section">
        <div className="container story">
          <div className="sticky-col"><Portrait /></div>
          <div>
            <Eyebrow>My story</Eyebrow>
            <ol className="chapters">
              {chapters.map((c) => (
                <li key={c.period} className="chapter">
                  <Reveal as="p" className="mono chapter-period">{c.period}</Reveal>
                  <SplitText as="h2" className="chapter-title" text={c.title[0]} dim={c.title[1]} />
                  {c.body.map((p, i) => <Reveal as="p" key={i} delay={0.05 * i}><Rich text={p} /></Reveal>)}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="stats-band" aria-label="At a glance">
        <Stagger as="dl" className="container stat-strip stat-strip-lg">
          {aboutStats.map((s) => (
            <RevealItem key={s.label} className="stat">
              <dt className="stat-label">{s.label}</dt>
              <dd className="stat-value"><Counter value={s.value} suffix={s.suffix} /></dd>
            </RevealItem>
          ))}
        </Stagger>
      </section>


      <WavePanel className="process-wave">
        <div className="container split-2">
          <div className="sticky-col">
            <SectionHead eyebrow="How I work" title="I don't start with pixels." dim="I start with the problem." breakBefore lead="Before I design a screen, I want to understand what that screen is supposed to accomplish. The answers determine the design." />
          </div>
          <ol className="process">
            {process.map(([title, text], i) => (
              <Reveal as="li" key={title} className="process-step" delay={i * 0.04}>
                <span className="process-num mono">0{i + 1}</span>
                <div><h3>{title}</h3><p>{text}</p></div>
              </Reveal>
            ))}
          </ol>
        </div>
      </WavePanel>
      <section className="section">
        <div className="container">
          <SectionHead eyebrow="Design principles" title="What guides" dim="every decision." breakBefore />
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

      <section className="section section-surface">
        <div className="container">
          <SectionHead eyebrow="What I bring" title="Four perspectives." dim="One practice." breakBefore={false} />
          <Stagger className="bento bento-4">
            {perspectives.map((p) => (
              <RevealItem key={p.title}>
                <TiltCard className="cap-card" max={4}>
                  <span className={`chip${p.label === 'Primary' ? ' chip-accent' : ''}`}>{p.label}</span>
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </TiltCard>
              </RevealItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead eyebrow="Beyond the work" title="I like understanding" dim="how things work." />
          <Stagger className="bento bento-3">
            {beyond.map((b) => (
              <RevealItem key={b.title}>
                <TiltCard className="cap-card" max={4}>
                  <span className="icon-tile"><Icon name={b.icon} size={22} /></span>
                  <h3>{b.title}</h3>
                  <p>{b.text}</p>
                </TiltCard>
              </RevealItem>
            ))}
          </Stagger>
        </div>
      </section>

      <CtaBand
        title="If you're looking for someone who thinks"
        dim="beyond the interface, let's talk."
        lead="I'm open to full-time product design roles, remote opportunities, hybrid roles, contracts, and relocation."
        secondary={{ to: '/work', label: 'See my work' }}
      />
    </Page>
  );
}
