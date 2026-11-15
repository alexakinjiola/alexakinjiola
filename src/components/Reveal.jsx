import { motion } from 'motion/react';

/* Fades + lifts content in once it scrolls into view. */
export default function Reveal({ as = 'div', delay = 0, y = 24, className, children, ...rest }) {
  const Tag = motion[as] ?? motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* Staggers direct children. Pair with <RevealItem>. */
export function Stagger({ as = 'div', className, children, gap = 0.08, ...rest }) {
  const Tag = motion[as] ?? motion.div;
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      variants={{ show: { transition: { staggerChildren: gap } } }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } },
};

export function RevealItem({ as = 'div', className, children, ...rest }) {
  const Tag = motion[as] ?? motion.div;
  return <Tag className={className} variants={itemVariants} {...rest}>{children}</Tag>;
}
