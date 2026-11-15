import Scramble from './Scramble';
import SplitText from './SplitText';
import Reveal from './Reveal';

export function Eyebrow({ children, className = '' }) {
  return (
    <p className={`eyebrow ${className}`}>
      <span className="eyebrow-dot" aria-hidden="true" />
      <Scramble text={children} />
    </p>
  );
}

export default function SectionHead({ eyebrow, title, dim, lead, as = 'h2', breakBefore = true, className = "" }) {
  return (
    <header className={`section-head ${className}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <SplitText as={as} text={title} dim={dim} breakBefore={breakBefore} className="display" />
      {lead && <Reveal as="p" className="lead" delay={0.15}>{lead}</Reveal>}
    </header>
  );
}
