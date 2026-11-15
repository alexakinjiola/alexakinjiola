import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { nav, site, socials } from '../data/site';
import { Logo } from './Nav';
import Icon from './Icon';

function LagosTime() {
  const fmt = () => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(new Date());
  const [t, setT] = useState(fmt);
  useEffect(() => { const id = setInterval(() => setT(fmt()), 15000); return () => clearInterval(id); }, []);
  return <time>{t}</time>;
}

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <Link to="/contact" className="footer-cta" data-cursor="Say hi">
          <span className="footer-cta-kicker">Have a product problem worth solving?</span>
          <span className="footer-cta-text" aria-hidden="true">
            <span className="footer-cta-line">Let's talk</span>
            <motion.span className="footer-cta-arrow" whileHover={{ rotate: -45 }}>
              <Icon name="arrow_forward" size="1em" />
            </motion.span>
          </span>
          <span className="sr-only">Let's talk — go to the contact page</span>
        </Link>

        <div className="footer-grid">
          <div className="footer-brand">
            <Logo />
            <p>Product Designer · UX/UI · Design Systems. I turn complex product problems into simple, scalable experiences.</p>
          </div>
          <div>
            <h2 className="footer-label">Navigate</h2>
            <ul className="footer-list">
              {nav.slice(1).map((l) => <li key={l.to}><Link to={l.to}>{l.label}</Link></li>)}
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="footer-label">Connect</h2>
            <ul className="footer-list">
              <li><a href={`mailto:${site.email}`}>Email</a></li>
              {socials.map((s) => (
                <li key={s.label}><a href={s.href} target="_blank" rel="noopener noreferrer">{s.label}<Icon name="north_east" size={14} /></a></li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="footer-label">Based in</h2>
            <p className="footer-meta">{site.location}<br /><span className="mono">Local time <LagosTime /> · {site.timezone}</span></p>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="mono">© {new Date().getFullYear()} {site.name}</span>
          <span className="mono">Designed &amp; built by Alex — React, Motion, Geist</span>
          <button className="to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Back to top <Icon name="north" size={16} />
          </button>
        </div>
      </div>
    </footer>
  );
}
