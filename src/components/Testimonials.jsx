import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import SectionHead from './SectionHead';
import Icon from './Icon';
import { testimonials } from '../data/testimonials';

const ease = [0.22, 1, 0.36, 1];
const initials = (n) => n.split(' ').map((p) => p[0]).slice(0, 2).join('');

/* Wraps the highlighted phrase in the quote with an accent <mark>. */
export function Quote({ text, highlight }) {
  if (!highlight || !text.includes(highlight)) return text;
  const [a, b] = text.split(highlight);
  return <>{a}<mark>{highlight}</mark>{b}</>;
}

export function Person({ name, role }) {
  return (
    <figcaption className="person">
      <span className="person-avatar" aria-hidden="true">{initials(name)}</span>
      <span>
        <cite className="person-name">{name}</cite>
        <span className="person-role">{role}</span>
      </span>
    </figcaption>
  );
}

/*
  "People love working with me" — focus carousel from the reference design.
  The active quote sits forward in a glowing glass card; neighbours recede,
  blurred, either side. Auto-advances every 7s, pauses on hover/focus, and has
  arrows, dots, a pause control and swipe on touch.
*/
export default function Testimonials() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const n = testimonials.length;
  const touch = useRef(null);
  const go = (d) => setActive((a) => (a + d + n) % n);

  useEffect(() => {
    if (paused || reduce) return;
    const id = setInterval(() => setActive((a) => (a + 1) % n), 7000);
    return () => clearInterval(id);
  }, [paused, reduce, n]);

  return (
    <section
      id="testimonials"
      className="section principles-section testimonials-section"
      aria-roledescription="carousel"
      aria-label="Testimonials"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setPaused(false)}
    >
      <div className="ripples" aria-hidden="true"><span /><span /><span /><span /></div>
      <div className="container principles-grid">
        <div>
          <SectionHead eyebrow="What clients & colleagues say" title="People" dim="love working with me." breakBefore={false} />
          <div className="principle-controls">
            <button type="button" className="pause-btn" onClick={() => go(-1)} aria-label="Previous testimonial"><Icon name="arrow_back" size={18} /></button>
            <div className="dots" role="tablist" aria-label="Choose a testimonial">
              {testimonials.map((t, i) => (
                <button key={t.name} type="button" role="tab" aria-selected={active === i} aria-label={`Testimonial from ${t.name}`} className="dot" onClick={() => setActive(i)} />
              ))}
            </div>
            <button type="button" className="pause-btn" onClick={() => go(1)} aria-label="Next testimonial"><Icon name="arrow_forward" size={18} /></button>
            <button type="button" className="pause-btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Resume auto-play' : 'Pause auto-play'}>
              <Icon name={paused ? 'play_arrow' : 'pause'} size={18} />
            </button>
          </div>
        </div>

        <div
          className="focus-stage"
          aria-live={paused ? 'polite' : 'off'}
          onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touch.current == null) return;
            const dx = e.changedTouches[0].clientX - touch.current;
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
            touch.current = null;
          }}
        >
          {testimonials.map((t, i) => {
            let off = i - active;
            if (off > n / 2) off -= n;
            if (off < -n / 2) off += n;
            const isActive = off === 0;
            return (
              <motion.figure
                key={t.name}
                className={`focus-card quote-card${isActive ? ' is-active' : ''}`}
                aria-hidden={!isActive}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${n}`}
                animate={{ x: `${off * 64}%`, scale: isActive ? 1 : 0.82, opacity: Math.abs(off) <= 1 ? (isActive ? 1 : 0.32) : 0, filter: isActive ? 'blur(0px)' : 'blur(3px)', zIndex: isActive ? 2 : 1 }}
                transition={{ duration: 0.9, ease }}
                onClick={() => !isActive && setActive(i)}
              >
                <Icon name="format_quote" size={40} fill className="quote-icon" />
                <blockquote><p><Quote text={t.quote} highlight={t.highlight} /></p></blockquote>
                <Person name={t.name} role={t.role} />
              </motion.figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
