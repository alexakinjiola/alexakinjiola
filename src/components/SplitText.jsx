import { motion } from 'motion/react';

/*
  Headline that rises word-by-word out of a mask.
  `text` is the bright part, `dim` the muted second half.
  Screen readers get the full sentence once; the animated words are hidden from them.
*/
export default function SplitText({ as = 'h2', text, dim, breakBefore = false, className = '', delay = 0, onMount = false, play = true, id }) {
  const Tag = motion[as];
  const words = [
    ...text.split(' ').map((w) => ({ w, dim: false })),
    ...(dim ? dim.split(' ').map((w, i) => ({ w, dim: true, br: breakBefore && i === 0 })) : []),
  ];
  const trigger = onMount
    ? { initial: 'hidden', animate: play ? 'show' : 'hidden' }
    : { initial: 'hidden', whileInView: 'show', viewport: { once: true, margin: '0px 0px -12% 0px' } };

  return (
    <Tag
      id={id}
      className={`split ${className}`}
      variants={{ show: { transition: { staggerChildren: 0.045, delayChildren: delay } } }}
      {...trigger}
    >
      <span className="sr-only">{dim ? `${text} ${dim}` : text}</span>
      {words.map(({ w, dim: isDim, br }, i) => (
        <span key={i} aria-hidden="true" style={{ display: 'contents' }}>
          {br && <br />}
          <span className="split-mask">
            <motion.span
              className={`split-word${isDim ? ' dim' : ''}`}
              variants={{
                hidden: { y: '110%', rotate: 4 },
                show: { y: '0%', rotate: 0, transition: { duration: 1, ease: [0.22, 1, 0.36, 1] } },
              }}
            >
              {w}
            </motion.span>
          </span>{' '}
        </span>
      ))}
    </Tag>
  );
}
