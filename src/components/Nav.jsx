import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { nav, site } from '../data/site';
import Icon from './Icon';

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label={`${site.name} — home`}>
      <span className="logo-mark" aria-hidden="true">AA</span>
      <span className="logo-word">{site.name}</span>
    </Link>
  );
}

export default function Nav() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const toggleRef = useRef(null);
  const menuRef = useRef(null);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 24);
    setHidden(!open && y > 320 && y > prev);
  });

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    window.__lenis?.stop();
    const first = menuRef.current?.querySelector('a');
    first?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); }
      if (e.key === 'Tab' && menuRef.current) {
        const f = [toggleRef.current, ...menuRef.current.querySelectorAll('a')];
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.__lenis?.start(); window.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <>
      <motion.header
        className={`nav${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`}
        animate={{ y: hidden ? '-110%' : '0%' }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="nav-inner">
          <Logo />
          <nav aria-label="Primary" className="nav-links">
            {nav.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'} className="nav-link">
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                    <span className="nav-link-text">{l.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="nav-end">
            <span className="nav-status"><span className="pulse-dot" aria-hidden="true" />Available</span>
            <Link to="/contact" className="btn btn-light btn-sm nav-cta">Let's talk</Link>
            <button
              ref={toggleRef}
              className={`menu-toggle${open ? ' is-open' : ''}`}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((o) => !o)}
            >
              <span /><span />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            ref={menuRef}
            className="mobile-menu"
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            initial={{ clipPath: 'circle(0% at calc(100% - 44px) 34px)' }}
            animate={{ clipPath: 'circle(150% at calc(100% - 44px) 34px)' }}
            exit={{ clipPath: 'circle(0% at calc(100% - 44px) 34px)' }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
          >
            <nav aria-label="Mobile" className="mobile-links">
              {[...nav, { to: '/contact', label: 'Contact' }].map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ delay: 0.18 + i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <NavLink to={l.to} end={l.to === '/'} className="mobile-link">
                    <span className="mobile-link-num">0{i + 1}</span>
                    {l.label}
                  </NavLink>
                </motion.div>
              ))}
            </nav>
            <motion.div className="mobile-foot" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.5 } }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
              <a href={`mailto:${site.email}`} className="mobile-mail"><Icon name="mail" />{site.email}</a>
              <span className="nav-status"><span className="pulse-dot" aria-hidden="true" />Open to remote, hybrid &amp; relocation</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
