import Icon from './Icon';

/* Infinite horizontal ticker. Content is duplicated once for a seamless loop. */
export default function Marquee({ items, reverse = false, label = 'Disciplines' }) {
  const row = (hidden) => (
    <ul className="marquee-row" aria-hidden={hidden || undefined}>
      {items.map((t) => (
        <li key={t}><Icon name="asterisk" size={18} />{t}</li>
      ))}
    </ul>
  );
  return (
    <section className={`marquee${reverse ? ' reverse' : ''}`} aria-label={label}>
      <div className="marquee-track">{row(false)}{row(true)}</div>
    </section>
  );
}
