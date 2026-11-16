import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import Page from '../components/Page';
import Silk from '../components/Silk';
import SectionHead, { Eyebrow } from '../components/SectionHead';
import SplitText from '../components/SplitText';
import Reveal, { Stagger, RevealItem } from '../components/Reveal';
import Button from '../components/Button';
import Counter from '../components/Counter';
import CtaBand from '../components/CtaBand';
import Icon from '../components/Icon';
import { site } from '../data/site';
import { roles, education, certifications, skillGroups } from '../data/experience';

function Timeline() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 60%'] });
  const height = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  return (
    <ol ref={ref} className="timeline">
      <span className="timeline-rail" aria-hidden="true"><motion.span style={{ height }} /></span>
      {roles.map((r) => (
        <Reveal as="li" key={r.company} className="role">
          <span className={`role-dot${r.current ? ' is-current' : ''}`} aria-hidden="true" />
          <header className="role-head">
            <div>
              <h3>{r.company}</h3>
              <p className="role-title">{r.role}</p>
            </div>
            <div className="role-when">
              <span className="chip mono">{r.period}</span>
              <span className={`chip${r.current ? ' chip-accent' : ''}`}>{r.type}</span>
            </div>
          </header>
          <p className="role-desc">{r.desc}</p>
          <ul className="role-bullets">
            {r.bullets.map((b) => <li key={b}><Icon name="north_east" size={16} />{b}</li>)}
          </ul>
          {r.result && (
            <p className="role-result">
              <span className="role-result-value"><Counter value={r.result.value} suffix={r.result.suffix} /></span>
              <span>{r.result.label}</span>
            </p>
          )}
          <ul className="chips">{r.tags.map((t) => <li key={t} className="chip">{t}</li>)}</ul>
        </Reveal>
      ))}
    </ol>
  );
}

export default function Experience() {
  return (
    <Page title="Experience" description="Work history, education, certifications and skills of Alex Akinjiola, Senior Product Designer.">
      <header className="page-hero">
        <Silk lines={30} intensity={0.65} />
        <div className="page-hero-glow" aria-hidden="true" />
        <div className="container">
          <Eyebrow>Resume</Eyebrow>
          <SplitText as="h1" className="page-title" text="The complete" dim="picture." onMount delay={0.35} />
          <Reveal as="p" className="lead" delay={0.5}>My product design experience across SaaS, EdTech, e-commerce, and fintech — the teams, decisions, and outcomes behind the work.</Reveal>
          <Reveal className="btn-row" delay={0.6}>
            <Button href={site.cv} download iconStart="download">Download CV</Button>
            <Button href={site.coverLetter} download variant="secondary" iconStart="description" magnetic={false}>Cover letter</Button>
          </Reveal>
        </div>
      </header>

      <section className="section" aria-labelledby="career">
        <div className="container resume">
          <aside className="resume-aside sticky-col" aria-label="On this page">
            <p className="footer-label">On this page</p>
            <ul className="jump">
              {[['career', 'work', 'Experience'], ['education', 'school', 'Education'], ['certifications', 'verified', 'Certifications'], ['skills', 'category', 'Skills']].map(([id, icon, l]) => (
                <li key={id}><a href={`#${id}`}><Icon name={icon} size={18} />{l}</a></li>
              ))}
            </ul>
          </aside>

          <div className="resume-main">
            <SectionHead eyebrow="Career" title="Work" dim="experience." breakBefore={false} />
            <span id="career" className="anchor" />
            <Timeline />

            <div id="education" className="resume-block">
              <SectionHead eyebrow="Academic" title="Education" />
              <Stagger className="bento bento-2">
                {education.map((e) => (
                  <RevealItem key={e.degree} className="cap-card">
                    <span className="mono muted">{e.period}</span>
                    <h3>{e.degree}</h3>
                    <p className="role-title">{e.school}</p>
                    <p>{e.detail}</p>
                    <span className="chip chip-accent">{e.honour}</span>
                  </RevealItem>
                ))}
              </Stagger>
            </div>

            <div id="certifications" className="resume-block">
              <SectionHead eyebrow="Credentials" title="Certifications" />
              <Stagger as="ul" className="cert-list" gap={0.04}>
                {certifications.map(([y, n, i]) => (
                  <RevealItem as="li" key={n} className="cert">
                    <span className="mono muted">{y}</span>
                    <span className="cert-name">{n}</span>
                    <span className="cert-issuer">{i}</span>
                  </RevealItem>
                ))}
              </Stagger>
            </div>

            <div id="skills" className="resume-block">
              <SectionHead eyebrow="Capabilities" title="Skills" />
              <div className="skill-groups">
                {skillGroups.map(([g, items]) => (
                  <Reveal key={g} className="skill-group">
                    <h3 className="mono">{g}</h3>
                    <ul className="chips">{items.map((s) => <li key={s} className="chip">{s}</li>)}</ul>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <CtaBand
        title="Want to work"
        dim="together?"
        lead="I'm currently open to new product design roles — full-time, remote, hybrid, contract, and relocation opportunities."
        secondary={{ href: site.cv, label: 'Download CV', download: true }}
      />
    </Page>
  );
}
