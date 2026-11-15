import SectionHead from './SectionHead';
import Button from './Button';
import Reveal from './Reveal';

export default function CtaBand({ eyebrow = "Let's work together", title, dim, lead, primary = { to: '/contact', label: "Let's talk" }, secondary }) {
  return (
    <section className="cta-band">
      <div className="cta-glow" aria-hidden="true" />
      <div className="container">
        <SectionHead eyebrow={eyebrow} title={title} dim={dim} lead={lead} />
        <Reveal className="btn-row" delay={0.2}>
          <Button {...primary} icon="arrow_forward">{primary.label}</Button>
          {secondary && <Button {...secondary} variant="secondary">{secondary.label}</Button>}
        </Reveal>
      </div>
    </section>
  );
}
