import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Page from '../components/Page';
import SectionHead, { Eyebrow } from '../components/SectionHead';
import SplitText from '../components/SplitText';
import Reveal, { Stagger, RevealItem } from '../components/Reveal';
import TiltCard from '../components/TiltCard';
import CtaBand from '../components/CtaBand';
import Icon from '../components/Icon';
import { tabs, learning } from '../data/capabilities';

const ease = [0.22, 1, 0.36, 1];

function Bar({ name, value, i }) {
  return (
    <li className="bar">
      <div className="bar-head"><span>{name}</span><span className="mono">{value}%</span></div>
      <div className="bar-track" role="progressbar" aria-label={name} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        <motion.div className="bar-fill" initial={{ scaleX: 0 }} animate={{ scaleX: value / 100 }} transition={{ delay: 0.25 + i * 0.08, duration: 1.2, ease }} />
      </div>
    </li>
  );
}

function Ring({ value }) {
  const c = 2 * Math.PI * 26;
  return (
    <svg className="ring" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="26" className="ring-bg" />
      <motion.circle
        cx="32" cy="32" r="26" className="ring-fg"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        whileInView={{ strokeDashoffset: c - (c * value) / 100 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, ease }}
      />
    </svg>
  );
}

export default function Capabilities() {
  const [active, setActive] = useState(tabs[0].id);
  const tabRefs = useRef({});
  const tab = tabs.find((t) => t.id === active);

  const onKey = (e) => {
    const i = tabs.findIndex((t) => t.id === active);
    let n = null;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
    if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') n = 0;
    if (e.key === 'End') n = tabs.length - 1;
    if (n !== null) { e.preventDefault(); setActive(tabs[n].id); tabRefs.current[tabs[n].id]?.focus(); }
  };

  return (
    <Page title="Capabilities" description="Product design, frontend development, data analysis and product strategy — the capabilities Alex Akinjiola brings to a product team.">
      <header className="page-hero">
        <div className="page-hero-glow" aria-hidden="true" />
        <div className="container">
          <Eyebrow>Capabilities</Eyebrow>
          <SplitText as="h1" className="page-title" text="What I bring to" dim="a product team." breakBefore onMount delay={0.35} />
          <Reveal as="p" className="lead" delay={0.5}>Product Design is the centre. Frontend awareness and data literacy are the edges that make it sharper — letting me design with implementation in mind and validate decisions with real evidence.</Reveal>
        </div>
      </header>

      <section className="section section-tight">
        <div className="container">
          <div className="tabs" role="tablist" aria-label="Capability areas" onKeyDown={onKey}>
            {tabs.map((t) => (
              <button
                key={t.id}
                ref={(el) => (tabRefs.current[t.id] = el)}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={active === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={active === t.id ? 0 : -1}
                className="tab"
                onClick={() => setActive(t.id)}
              >
                {active === t.id && <motion.span layoutId="tab-pill" className="tab-pill" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                <span className="tab-text">{t.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab.id}
              role="tabpanel"
              id={`panel-${tab.id}`}
              aria-labelledby={`tab-${tab.id}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5, ease }}
            >
              <div className="feature-panel">
                <div className="feature-copy">
                  <p className="eyebrow"><span className="eyebrow-dot" aria-hidden="true" />{tab.kicker}</p>
                  <h2 className="display">{tab.title[0]} <span className="dim">{tab.title[1]}</span></h2>
                  {tab.intro.map((p) => <p key={p} className="feature-text">{p}</p>)}
                  {tab.proficiency && (
                    <ul className="bars">{tab.proficiency.map(([n, v], i) => <Bar key={n} name={n} value={v} i={i} />)}</ul>
                  )}
                </div>
                <motion.div className="feature-media" initial={{ clipPath: 'inset(0 0 100% 0)' }} animate={{ clipPath: 'inset(0 0 0% 0)' }} transition={{ duration: 1, ease, delay: 0.1 }}>
                  <img src={tab.image} alt="" loading="lazy" />
                </motion.div>
              </div>

              {tab.cards && (
                <Stagger className="bento bento-3" gap={0.05}>
                  {tab.cards.map(([icon, title, text, tags]) => (
                    <RevealItem key={title}>
                      <TiltCard className="cap-card" max={3}>
                        <span className="icon-tile"><Icon name={icon} size={22} /></span>
                        <h3>{title}</h3>
                        <p>{text}</p>
                        <ul className="chips">{tags.map((t) => <li key={t} className="chip">{t}</li>)}</ul>
                      </TiltCard>
                    </RevealItem>
                  ))}
                </Stagger>
              )}

              {tab.toolGroups && (
                <div className="tool-groups">
                  {tab.toolGroups.map(([group, icon, tools]) => (
                    <div key={group} className="tool-group">
                      <h3 className="mono"><Icon name={icon} size={18} />{group}</h3>
                      <Stagger as="ul" className="tool-grid" gap={0.04}>
                        {tools.map((t) => <RevealItem as="li" key={t} className="tool">{t}</RevealItem>)}
                      </Stagger>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <section className="section section-surface">
        <div className="container">
          <SectionHead eyebrow="Always growing" title="Currently" dim="learning." breakBefore={false} />
          <Stagger className="bento bento-3">
            {learning.map((l) => (
              <RevealItem key={l.title}>
                <TiltCard className="cap-card learn-card" max={4}>
                  <div className="learn-ring"><Ring value={l.progress} /><span className="mono">{l.progress}%</span></div>
                  <h3>{l.title}</h3>
                  <p>{l.text}</p>
                </TiltCard>
              </RevealItem>
            ))}
          </Stagger>
        </div>
      </section>

      <CtaBand
        title="Looking for a product designer who can do"
        dim="more than design?"
        lead="Product thinking, design craft, technical awareness, and data literacy — all in one person."
        secondary={{ to: '/work', label: 'See my work' }}
      />
    </Page>
  );
}
