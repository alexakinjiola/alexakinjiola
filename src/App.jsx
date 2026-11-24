import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { AnimatePresence, MotionConfig, useReducedMotion } from 'motion/react';
import Lenis from 'lenis';
import { Analytics } from '@vercel/analytics/react';
import 'lenis/dist/lenis.css';
import Nav from './components/Nav';
import Footer from './components/Footer';
import ScrollProgress from './components/ScrollProgress';
import ParticleIntro from './components/ParticleIntro';
import Home from './pages/Home';

const Work = lazy(() => import('./pages/Work'));
const CaseStudy = lazy(() => import('./pages/CaseStudy'));
const About = lazy(() => import('./pages/About'));
const Capabilities = lazy(() => import('./pages/Capabilities'));
const Experience = lazy(() => import('./pages/Experience'));
const Contact = lazy(() => import('./pages/Contact'));
const NotFound = lazy(() => import('./pages/NotFound'));

const seen = () => { try { return sessionStorage.getItem('aa-intro') === '1'; } catch { return true; } };

export default function App() {
  const location = useLocation();
  const reduce = useReducedMotion();
  const [intro, setIntro] = useState(() => !seen());

  /* Inertial smooth scrolling (off for reduced motion and while the intro runs). */
  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ autoRaf: true, anchors: { offset: -88 }, lerp: 0.1, wheelMultiplier: 1 });
    window.__lenis = lenis;
    return () => { lenis.destroy(); window.__lenis = undefined; };
  }, [reduce]);
  useEffect(() => { intro ? window.__lenis?.stop() : window.__lenis?.start(); }, [intro]);
  const toTop = () => (window.__lenis ? window.__lenis.scrollTo(0, { immediate: true }) : window.scrollTo(0, 0));
  const endIntro = useCallback(() => {
    try { sessionStorage.setItem('aa-intro', '1'); } catch { /* private mode */ }
    setIntro(false);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <a href="#main" className="skip-link">Skip to content</a>
      {intro && <ParticleIntro onDone={endIntro} />}
      <ScrollProgress />
      <div className="grain" aria-hidden="true" />
      <Nav />
      <Suspense fallback={<div className="route-fallback" />}>
        <AnimatePresence mode="wait" onExitComplete={toTop}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home introDone={!intro} />} />
            <Route path="/work" element={<Work />} />
            <Route path="/work/:slug" element={<CaseStudy />} />
            <Route path="/about" element={<About />} />
            <Route path="/capabilities" element={<Capabilities />} />
            <Route path="/experience" element={<Experience />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
      <Footer />
      <Analytics />
    </MotionConfig>
  );
}
