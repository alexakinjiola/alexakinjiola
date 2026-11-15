import { motion } from 'motion/react';

const ease = [0.76, 0, 0.24, 1];

/*
  Route wrapper. A lime panel sweeps up to cover the outgoing page, then the new
  page is revealed underneath — gives every navigation a deliberate "cut".
*/
export default function Page({ title, description, children }) {
  return (
    <>
      <title>{title ? `${title} — Alex Akinjiola` : 'Alex Akinjiola — Product Designer'}</title>
      {description && <meta name="description" content={description} />}
      <motion.main
        id="main"
        tabIndex={-1}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] } }}
        exit={{ opacity: 0, y: -20, transition: { duration: 0.35, ease } }}
      >
        {children}
      </motion.main>
      <motion.div
        className="curtain"
        aria-hidden="true"
        initial={{ scaleY: 1, transformOrigin: '50% 0%' }}
        animate={{ scaleY: 0, transition: { duration: 0.7, ease } }}
        exit={{ scaleY: 1, transformOrigin: '50% 100%', transition: { duration: 0.55, ease } }}
      />
    </>
  );
}
