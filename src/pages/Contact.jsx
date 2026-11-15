import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Page from '../components/Page';
import { Eyebrow } from '../components/SectionHead';
import SplitText from '../components/SplitText';
import Reveal, { Stagger, RevealItem } from '../components/Reveal';
import Icon from '../components/Icon';
import Magnetic from '../components/Magnetic';
import { site, socials } from '../data/site';

const openTo = ['Full-time product design roles', 'Remote opportunities', 'Hybrid opportunities', 'Contract opportunities', 'Relocation opportunities'];
const topics = ['Full-time role opportunity', 'Freelance / Contract project', 'Product design collaboration', 'Just saying hello', 'Other'];

function CopyEmail() {
  const [copied, setCopied] = useState(false);
  const copy = async (e) => {
        try { await navigator.clipboard.writeText(site.email); } catch { return; }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button type="button" className="copy" onClick={copy} aria-label={copied ? 'Email copied' : 'Copy email address'}>
      <Icon name={copied ? 'check' : 'content_copy'} size={16} />
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

function ContactForm() {
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const next = {};
    if (!String(data.get('firstName') || '').trim()) next.firstName = 'Please enter your name.';
    const email = String(data.get('email') || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Please enter a valid email address.';
    if (String(data.get('message') || '').trim().length < 10) next.message = 'Please write a short message (at least 10 characters).';
    setErrors(next);
    if (Object.keys(next).length) { form.querySelector(`[name="${Object.keys(next)[0]}"]`)?.focus(); return; }

    setStatus('sending');
    try {
      const res = await fetch(site.formspree, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      if (res.ok) { form.reset(); setStatus('sent'); return; }
      const body = await res.json().catch(() => ({}));
      setMessage(body.errors?.map((x) => x.message).join(', ') || `Something went wrong. Please email me directly: ${site.email}`);
      setStatus('error');
    } catch {
      setMessage(`Network error. Please email me directly at ${site.email}`);
      setStatus('error');
    }
  };

  const field = (name, label, props = {}, Tag = 'input') => (
    <div className={`field${errors[name] ? ' has-error' : ''}`}>
      <label htmlFor={name}>{label}{props.required && <span aria-hidden="true"> *</span>}</label>
      <Tag id={name} name={name} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-err` : undefined} {...props} />
      {errors[name] && <p id={`${name}-err`} className="field-error"><Icon name="error" size={16} />{errors[name]}</p>}
    </div>
  );

  return (
    <AnimatePresence mode="wait">
      {status === 'sent' ? (
        <motion.div key="ok" className="form-success" role="status" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
          <motion.span className="success-icon" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}>
            <Icon name="check" size={32} />
          </motion.span>
          <h2>Message sent.</h2>
          <p>Thanks for reaching out — I'll get back to you within 24 hours.</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setStatus('idle')}>Send another</button>
        </motion.div>
      ) : (
        <motion.form key="form" onSubmit={submit} noValidate className="form" exit={{ opacity: 0, y: -10 }}>
          <div className="hp" aria-hidden="true"><input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" /></div>
          <input type="hidden" name="_subject" value="New enquiry from portfolio — Alex Akinjiola" />
          <div className="field-row">
            {field('firstName', 'First name', { required: true, autoComplete: 'given-name', placeholder: 'Ada' })}
            {field('lastName', 'Last name', { autoComplete: 'family-name', placeholder: 'Lovelace' })}
          </div>
          {field('email', 'Email address', { type: 'email', required: true, autoComplete: 'email', placeholder: 'you@company.com' })}
          {field('company', 'Company / organisation', { autoComplete: 'organization', placeholder: 'Your company' })}
          <div className="field">
            <label htmlFor="subject">Subject</label>
            <div className="select">
              <select id="subject" name="subject" defaultValue="">
                <option value="">Select a topic</option>
                {topics.map((t) => <option key={t}>{t}</option>)}
              </select>
              <Icon name="expand_more" />
            </div>
          </div>
          {field('message', 'Message', { required: true, rows: 6, placeholder: "Tell me what you're working on or what you're looking for…" }, 'textarea')}
          {status === 'error' && <p className="form-error" role="alert"><Icon name="error" size={18} />{message}</p>}
          <Magnetic className="full">
            <button type="submit" className="btn btn-primary btn-md btn-block" disabled={status === 'sending'}>
              {status === 'sending' ? <><span className="spinner" aria-hidden="true" />Sending…</> : <>Send message <Icon name="send" size={18} /></>}
            </button>
          </Magnetic>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

export default function Contact() {
  return (
    <Page title="Contact" description="Get in touch with Alex Akinjiola — available for full-time, remote, hybrid, contract and relocation product design roles.">
      <header className="page-hero">
        <div className="page-hero-glow" aria-hidden="true" />
        <div className="container">
          <Eyebrow>Contact</Eyebrow>
          <SplitText as="h1" className="page-title" text="Have a product problem" dim="worth solving?" breakBefore onMount delay={0.35} />
          <Reveal as="p" className="lead" delay={0.5}>Let's talk. Whether you're building something new, improving an existing product, or looking for a designer who works comfortably with product managers, engineers, and stakeholders.</Reveal>
          <Reveal className="avail" delay={0.6}>
            <span className="pulse-dot" aria-hidden="true" />
            <strong>Available for new opportunities</strong>
            <span className="muted">Full-time · Remote · Hybrid · Contract · Relocation</span>
            <span className="avail-loc mono"><Icon name="location_on" size={16} />{site.location} ({site.timezone})</span>
          </Reveal>
        </div>
      </header>

      <section className="section section-tight">
        <div className="container contact">
          <div className="contact-info">
            <Reveal>
              <h2 className="display">Let's build something <span className="dim">useful.</span></h2>
              <p className="lead">Maybe you're building something new. Maybe an existing product has become difficult to use. Maybe your team needs someone who can turn complicated requirements into a clear product experience. That's the kind of work I'm interested in.</p>
            </Reveal>
            <Reveal className="open-to">
              <h3 className="footer-label">What I'm open to</h3>
              <ul>{openTo.map((o) => <li key={o}><Icon name="check" size={18} />{o}</li>)}</ul>
            </Reveal>
            <Stagger as="ul" className="links-list" gap={0.05}>
              <RevealItem as="li">
                <div className="link-row">
                  <a className="link-main" href={`mailto:${site.email}`}>
                    <span className="icon-tile"><Icon name="mail" /></span>
                    <span className="link-body"><span className="link-label">Email</span><span className="link-value">{site.email}</span></span>
                  </a>
                  <CopyEmail />
                </div>
              </RevealItem>
              <RevealItem as="li">
                <a className="link-row" href={site.phoneHref}>
                  <span className="icon-tile"><Icon name="call" /></span>
                  <span className="link-body"><span className="link-label">Phone</span><span className="link-value">{site.phone}</span></span>
                  <Icon name="arrow_forward" className="link-arrow" />
                </a>
              </RevealItem>
              {socials.map((s) => (
                <RevealItem as="li" key={s.label}>
                  <a className="link-row" href={s.href} target="_blank" rel="noopener noreferrer">
                    <span className="icon-tile"><Icon name={s.icon} /></span>
                    <span className="link-body"><span className="link-label">{s.label}</span><span className="link-value">{s.value}</span></span>
                    <Icon name="north_east" className="link-arrow" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </RevealItem>
              ))}
            </Stagger>
          </div>

          <Reveal className="contact-card" delay={0.1}>
            <h2 className="contact-card-title">Send a message</h2>
            <p className="muted">I respond to every message, usually within 24 hours.</p>
            <ContactForm />
          </Reveal>
        </div>
      </section>
    </Page>
  );
}
