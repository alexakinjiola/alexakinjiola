import { motion } from 'motion/react';

const ease = [0.76, 0, 0.24, 1];

/*
  Route wrapper. A blue panel sweeps up to cover the outgoing page, then the new
  page is revealed underneath — gives every navigation a deliberate "cut".
*/
export default function Page({ title, description, children }) {
  return (
    <>
      <title>{title ? `${title} — Alex Akinjiola` : 'Alex Akinjiola — Senior Product Designer'}</title>
      {description && <meta name="description" content={description} />}
      <motion.main
        id="main"
        tabIndex={-1}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] } }}
        exit={{ opacity: 0, y: -20, transition: { duration: 0.22, ease } }}
      >
        {children}
      </motion.main>
      <motion.div
        className="curtain"
        aria-hidden="true"
        initial={{ scaleY: 1, transformOrigin: '50% 0%' }}
        animate={{ scaleY: 0, transition: { duration: 0.4, ease } }}
        exit={{ scaleY: 1, transformOrigin: '50% 100%', transition: { duration: 0.3, ease } }}
      />
    </>
  );
}
