/* Shown on the homepage bento grid. */
export const selectedWork = [
  {
    id: 'krent', title: 'Krent', category: 'SaaS · PropTech', image: '/images/krent.webp',
    headline: 'Making complex property management easier to navigate.',
    summary: 'Turned interconnected workflows, multiple user types, and large amounts of information into a structured experience that felt clear rather than overwhelming.',
    links: [{ label: 'Live Project', href: 'https://krent.space/', icon: 'open_in_new' }],
  },
  {
    id: 'ajiroba', title: 'Ajiroba', category: 'E-commerce', image: '/images/ajiroba.webp',
    headline: 'Removing friction from a growing e-commerce experience.',
    summary: 'UX audit, simplified workflows, improved navigation clarity, and a scalable design system. 70% improvement in usability and perceived performance.',
    links: [{ label: 'Live Project', href: 'https://ajiroba.com', icon: 'open_in_new' }],
  },
  {
    id: 'mealflex', title: 'Mealflex', category: 'FoodTech', image: '/images/mealflex.webp',
    headline: 'Food ordering app.',
    summary: 'A mobile-first food ordering app for young Africans. Features restaurant discovery, real-time order tracking, and a seamless checkout experience.',
    links: [{ label: 'Case Study', href: 'https://www.behance.net/gallery/231847479/Meal-Flex', icon: 'article' }],
  },
  {
    id: 'paytrackr', title: 'Paytrackr', category: 'Fintech', image: '/images/paytrackr.webp',
    headline: 'Designing financial experiences around clarity.',
    summary: 'Focused on information hierarchy, user flows, and interaction design to create a financial product that makes decisions easier to navigate.',
    links: [{ label: 'Case Study', href: 'https://bit.ly/Paytrackr', icon: 'article' }, { label: 'Live Project', href: 'https://paytrackr-invoice.vercel.app', icon: 'open_in_new' }],
  },
  {
    id: 'annyshub', title: 'Annyshub', category: 'E-commerce', image: '/images/annyshub.webp',
    headline: 'Business website showroom.',
    summary: 'A retail showroom website with two interfaces — a customer-facing storefront and an admin console for the owner to manage the catalogue.',
    links: [{ label: 'Live Project', href: 'https://www.annyshub.store', icon: 'open_in_new' }],
  },
  {
    id: 'portfolio', title: 'Portfolio Website', category: 'Web Design · Development', image: '/images/alex-portfolio.webp',
    headline: 'A clearer way to present product thinking.',
    summary: 'A responsive portfolio that brings selected case studies, experience, capabilities and measurable outcomes into one cohesive experience — editorial hierarchy, accessible navigation and a consistent design system.',
    links: [{ label: 'View Portfolio', href: 'https://alexakinjiola.vercel.app', icon: 'open_in_new' }],
  },
  {
    id: 'oluwakemi', title: 'Oluwakemi Portfolio', category: 'Web Design · Development', image: '/images/oluwakemi.webp',
    headline: 'A clear portfolio for a Virtual Assistant.',
    summary: 'A quiet-luxury editorial portfolio site for a virtual assistant, built front-to-back with a full animation layer.',
    links: [{ label: 'View Portfolio', href: 'https://oluwakemi-alex-portfolio.vercel.app', icon: 'open_in_new' }],
  },
];

/* Work page — long-form featured case studies. */
export const caseStudies = [
  {
    id: 'krent', badge: 'Krent · SaaS · PropTech', image: '/images/krent.webp', readTime: '4 min read',
    eyebrow: '70% measurable user satisfaction & customer retention',
    title: "When property management gets complicated, the product shouldn't.",
    results: [
      { value: '5', label: 'User types served in one system' },
      { value: '76%', label: 'Reduction in support queries post-launch' },
      { value: '70+', label: 'Core workflows redesigned' },
    ],
    story: [
      ['The Problem', 'Multiple user types — landlords, tenants, and agents — sharing one product, each with different workflows, information needs, and mental models. The interface tried to serve everyone at once and ended up serving no one well.'],
      ['What I Did', "Restructured the information architecture around user roles. Rebuilt navigation and dashboard logic so each user type sees only what's relevant to them. Built a scalable Figma design system to keep consistency as the product grows. Also redesigned the entire customer interface flow for both web and mobile app."],
      ['Outcome', 'Clearer workflows, significantly reduced support volume, and a design system that the engineering team actively uses to ship faster.'],
    ],
    tags: 'UX Strategy · IA · User Flows · UI Design · Design Systems · Figma',
    links: [{ label: 'Live Product', href: 'https://krent.space/', icon: 'open_in_new' }],
  },
  {
    id: 'ajiroba', badge: 'Ajiroba · E-commerce · Web + Mobile', image: '/images/ajiroba.webp', readTime: '3 min read',
    eyebrow: '67% measurable improvement',
    title: 'Removing friction from a growing e-commerce platform.',
    results: [
      { value: '67%', label: 'Improvement in platform usability' },
      { value: '100+', label: 'Core user flows simplified' },
      { value: '2yr', label: 'Embedded as product designer & product manager' },
    ],
    story: [
      ['The Problem', 'The product had all the right features. But the experience accumulated friction — users were dropping off, and the team was spending too much time explaining how things worked.'],
      ['What I Did', 'Conducted a structured UX audit. Identified the highest-friction workflows. Redesigned navigation, simplified checkout and product flows, introduced design tokens and a component library to keep the experience consistent at scale.'],
      ['Outcome', '67% improvement in platform usability and perceived performance. Engineering handoff time reduced significantly through better documentation and a shared design system.'],
    ],
    tags: 'UX Audit · Navigation · Design Systems · Mobile · Nov 2023 – Sep 2025',
    links: [{ label: 'Live Product', href: 'https://ajiroba.org/', icon: 'open_in_new' }],
  },
  {
    id: 'paytrackr', badge: 'Paytrackr · Fintech · Dashboard', image: '/images/paytrackr.webp', readTime: '4 min read',
    eyebrow: 'Fintech product design',
    title: 'Financial products need clarity before complexity.',
    results: [
      { value: '15+', label: 'Complex flows simplified to 2 steps' },
      { value: '100%', label: 'Web & mobile responsive' },
      { value: '0', label: 'Handoff reworks needed' },
    ],
    story: [
      ['The Problem', 'Financial products ask users to process information and make decisions under pressure. When the interface adds confusion on top of that, users lose confidence and abandon flows.'],
      ['What I Did', 'Rebuilt the information hierarchy. Designed flows that surface only what users need at each decision point. Focused interaction design on reducing the number of decisions required per step.'],
      ['Outcome', 'Cleaner dashboard experience, multi-step flows reduced to 2 actions, and a complete handoff package that went to engineering without a single rework request.'],
    ],
    tags: 'Information Architecture · Interaction Design · Responsive UI · Prototyping',
    links: [{ label: 'Case Study', href: 'https://bit.ly/Paytrackr', icon: 'article' }, { label: 'Live Product', href: 'https://paytrackr-invoice.vercel.app', icon: 'open_in_new' }],
  },
];

/* Work page — "More work" grid. */
export const moreWork = [
  { id: 'mealflex', title: 'Mealflex — Simplifying food discovery and ordering.', category: 'FoodTech · UX/UI', image: '/images/mealflex.webp',
    stats: [['60%', 'Fewer steps to order'], ['4.8★', 'Design prototype rating']],
    summary: 'Redesigned the end-to-end food ordering experience — from browse to checkout — reducing unnecessary decision points and improving order completion rates through clearer information hierarchy.',
    links: [{ label: 'View on Behance', href: 'https://www.behance.net/gallery/231847479/Meal-Flex', icon: 'open_in_new' }] },
  { id: 'creatifff', title: 'Creatifff — Fashion e-commerce with a 75% satisfaction lift.', category: 'Fashion · E-commerce', image: '/images/creatifff.webp',
    stats: [['75%', 'User satisfaction increase'], ['26', 'Critical flows rebuilt']],
    summary: 'Led end-to-end product design for a mobile-first fashion platform. Redesigned onboarding and checkout flows, built the full design system, and worked with engineering through implementation.',
    links: [{ label: 'Case Study', href: 'https://www.behance.net/gallery/236775971/Creatifff-Ecommerce', icon: 'article' }], note: 'Private product' },
  { id: 'ledger', title: 'Ledger Studio — Polished invoicing without complexity.', category: 'SaaS · Design + Dev', image: '/images/ledger-studio.webp',
    stats: [['0', 'Backend required'], ['100%', 'Designed & built by Alex']],
    summary: 'Designed and built a luxury invoice generator as a no-backend, client-side product. Demonstrates what happens when design thinking goes all the way through to working code — not just a Figma file.',
    links: [{ label: 'Live Project', href: 'https://ledger-studio-pi.vercel.app/', icon: 'open_in_new' }] },
  { id: 'annyshub', title: 'AnnySHub — Designing both sides of a retail experience.', category: 'Retail · Dual Interface', image: '/images/annyshub.webp',
    stats: [['20+', 'Interfaces designed'], ['1', 'Unified design system']],
    summary: 'Designed a retail showroom across both the customer-facing experience and the admin interface — two very different users, one product. Required careful role-based UX thinking and a design system that served both without contradiction.',
    links: [{ label: 'Live Project', href: 'https://annyshub.store', icon: 'open_in_new' }] },
  { id: 'kemi', title: 'Portfolio Website — Oluwakemi', category: 'Web Development · Animation', image: '/images/kemi-portfolio.webp',
    stats: [['7+', 'Pages built end-to-end'], ['100%', 'Client satisfaction']],
    summary: 'A quiet-luxury editorial portfolio site for a virtual assistant, built front-to-back with a full animation layer.',
    links: [{ label: 'View Work', href: 'https://oluwakemi-alex-portfolio.vercel.app', icon: 'open_in_new' }] },
  { id: 'folu', title: 'Folu Atelier — Luxury brand', category: 'Luxury Fashion · Brand', image: '/images/folu-atelier.webp',
    stats: [['17+', 'Pages built end-to-end'], ['100%', 'Client satisfaction']],
    summary: 'A comprehensive digital presence for a luxury fashion brand, with a two-part architecture — a customer-facing House and an owner-facing Studio.',
    links: [{ label: 'View Work', href: 'https://folu-atelier.vercel.app/', icon: 'open_in_new' }] },
  { id: 'spin', title: 'SPIN & WIN Giveaway', category: 'Campaign · E-commerce', image: '/images/spin-and-win.webp',
    stats: [['5+', 'Product surfaces designed'], ['Live', 'Campaign already conducted']],
    summary: 'A promotional campaign designed to reward community members through a fun, interactive experience. Winners redeem their prizes through a verified support channel.',
    links: [{ label: 'View Work', href: 'https://campaign.ajiroba.com', icon: 'open_in_new' }] },
];

export const workStats = [
  { value: 89, suffix: '%', label: 'Usability improvement — Ajiroba platform' },
  { value: 77, suffix: '%', label: 'User satisfaction increase — Creatifff' },
  { value: 37, suffix: '+', label: 'Products designed end-to-end' },
  { value: 4, suffix: '', label: 'Companies · 5+ years experience' },
];

export const demonstrates = [
  { value: 89, suffix: '%+', title: 'Measurable usability gains', text: "I don't just redesign screens. I identify where friction is costing the product and fix the right things — with evidence to show what changed." },
  { value: 25, suffix: '+', title: 'Products shipped end-to-end', text: 'From discovery and wireframes through to design systems, developer handoff, and implementation collaboration. I see the work through.' },
  { value: 3, suffix: '', title: 'Disciplines in one designer', text: 'Product design + frontend development + data analytics. I understand the full picture — design, code, and data — so I can collaborate across the entire product team.' },
];
