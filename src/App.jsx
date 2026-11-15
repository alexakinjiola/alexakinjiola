import { lazy, Suspense, useCallback, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { AnimatePresence, MotionConfig } from 'motion/react';
import Nav from './components/Nav';
import Footer from './components/Footer';
import Cursor from './components/Cursor';
import ScrollProgress from './components/ScrollProgress';
import Intro from './components/Intro';
import Home from './pages/Home';

const Work = lazy(() => import('./pages/Work'));
const About = lazy(() => import('./pages/About'));
const Capabilities = lazy(() => import('./pages/Capabilities'));
const Experience = lazy(() => import('./pages/Experience'));
const Contact = lazy(() => import('./pages/Contact'));
const NotFound = lazy(() => import('./pages/NotFound'));

const seen = () => { try { return sessionStorage.getItem('aa-intro') === '1'; } catch { return true; } };

export default function App() {
  const location = useLocation();
  const [intro, setIntro] = useState(() => location.pathname === '/' && !seen());
  const endIntro = useCallback(() => {
    try { sessionStorage.setItem('aa-intro', '1'); } catch { /* private mode */ }
    setIntro(false);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <a href="#main" className="skip-link">Skip to content</a>
      {intro && <Intro onDone={endIntro} />}
      <ScrollProgress />
      <Cursor />
      <div className="grain" aria-hidden="true" />
      <Nav />
      <Suspense fallback={<div className="route-fallback" />}>
        <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo(0, 0)}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home introDone={!intro} />} />
            <Route path="/work" element={<Work />} />
            <Route path="/about" element={<About />} />
            <Route path="/capabilities" element={<Capabilities />} />
            <Route path="/experience" element={<Experience />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
      <Footer />
    </MotionConfig>
  );
}
