import { motion } from 'motion/react';
import Page from '../components/Page';
import Button from '../components/Button';

export default function NotFound() {
  return (
    <Page title="Page not found">
      <section className="not-found">
        <div className="page-hero-glow" aria-hidden="true" />
        <div className="container">
          <motion.p className="nf-code mono" aria-hidden="true" animate={{ opacity: [0.35, 1, 0.6, 1] }} transition={{ duration: 1.6, times: [0, 0.2, 0.4, 1] }}>404</motion.p>
          <h1 className="display">This page took a <span className="dim">wrong turn.</span></h1>
          <p className="lead">The page you're looking for doesn't exist or has moved. Let's get you back to something useful.</p>
          <div className="btn-row">
            <Button to="/" icon="arrow_forward">Back home</Button>
            <Button to="/work" variant="secondary">See my work</Button>
          </div>
        </div>
      </section>
    </Page>
  );
}
