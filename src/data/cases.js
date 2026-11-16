/*
  Case studies — senior product design depth.

  Sources: Alex's Krent/Ajiroba brief, the TrustBridge design files and
  prototype, and a review of every live product (captured November 2026).
  Rule: describe the work the screens evidence and the reasoning behind it.
  No invented research sessions, interview quotes or analytics.

  Schema (all optional except slug/title/tagline/cover):
    accent      brand colour that tints the case study page
    facts       [label, value] pairs for the hero
    glance      [value, label] verifiable facts (counts from the product itself)
    tldr        { problem, approach, outcome }
    overview    paragraphs · role · constraints[]
    users       [{ name, icon, goal, pain }]
    process     [{ phase, title, summary, activities[], output }]
    principles  [title, text]
    journey     { title, intro, steps: [{ label, text, image, mobile? }] }
    decisions   [{ title, text, tradeoff, image, caption, mobile? }]
    gallery     [{ src, caption, mobile? }]
    outcome[] · quoteFrom · reflection[] · next[] · tools[]
*/
const C = '/images/cases';
const V = '/images/covers';

export const cases = [
  /* ═══════════════════════════════ TRUSTBRIDGE ═══════════════════════════════ */
  {
    slug: 'trustbridge',
    group: 'featured',
    title: 'TrustBridge',
    tagline: 'A three-sided hiring platform that helps international students and migrants in the UK gain real work experience — with every role kept inside their visa’s working-hour limits.',
    category: 'HR tech · Marketplace · SaaS',
    accent: '#3B82F6',
    cover: `${V}/trustbridge.webp`,
    researchLed: true,
    facts: [
      ['Role', 'Lead Product Designer'],
      ['Type', 'New product · 0 → 1'],
      ['Platform', 'Responsive web · 3 portals'],
      ['Market', 'United Kingdom'],
    ],
    glance: [['3', 'Portals: job seeker, employer, admin'], ['90+', 'Screens and states designed'], ['5', 'Weighted match factors, each explained'], ['1', 'Rule engine for permitted hours']],
    tldr: {
      problem: 'International students and migrants in the UK have the right to work, but adverts ask for UK experience first — and small businesses avoid hiring them because visa conditions, like a student’s 20-hour term-time limit, feel risky and confusing.',
      approach: 'I designed one platform for both sides of the hire plus an internal operations console: verified employers, eligibility captured once and summarised safely, hours calculated against the rules, and matches that always explain themselves.',
      outcome: 'A complete, clickable product covering the public site, seeker and employer portals and an admin console — more than 90 screens and states, backed by a shared design system, ready for build.',
    },
    overview: [
      'TrustBridge connects international students and skilled migrants in the UK with small and medium-sized businesses offering real roles. Seekers build the UK experience employers keep asking for; employers get capable people without having to become immigration experts.',
      'The hard part is not listing jobs. It is trust in both directions: seekers need to know an employer is genuine, and employers need confidence that a role fits the person’s permission to work. Every design decision flows from making that trust visible without exposing anyone’s private documents.',
    ],
    role: 'As lead designer, I owned the product design end to end — framing the problem, mapping the three-sided system, defining information architecture and flows, building the design system and designing every screen and state across the public site, both user portals and the admin console.',
    constraints: [
      'Eligibility rules differ by permission type and change between term time and vacations.',
      'Employers must see whether someone can do the hours — never their immigration documents.',
      'Recommendations had to be explainable and must never discriminate on eligibility.',
      'An internal team needs to verify employers, review eligibility and audit every sensitive action.',
    ],
    users: [
      { name: 'International student', icon: 'school', goal: 'Find part-time work that builds UK experience around study.', pain: 'Unsure which employers will consider them, and afraid of breaking the 20-hour limit.' },
      { name: 'Skilled migrant', icon: 'travel_explore', goal: 'Get a first UK role that recognises experience gained abroad.', pain: '“UK experience required” blocks applications before skills are seen.' },
      { name: 'SME employer', icon: 'storefront', goal: 'Hire reliable people quickly for real roles.', pain: 'No time or expertise to interpret visa conditions; fear of getting it wrong.' },
      { name: 'Operations admin', icon: 'admin_panel_settings', goal: 'Keep the marketplace safe and compliant.', pain: 'Needs to verify businesses, review eligibility and evidence every decision.' },
    ],
    process: [
      { phase: 'R', title: 'Research', summary: 'Ran user research with international students, skilled migrants and SME employers to understand where trust broke down on each side of the hire.', activities: ['User research with job seekers', 'User research with SME employers', 'Synthesis into trust and eligibility needs'], output: 'Research insights and priorities', research: true },
      { phase: '01', title: 'Frame', summary: 'Defined the core tension: both sides want to say yes, but neither can see enough to trust the other.', activities: ['Problem framing for three user groups', 'Mapped what each side needs to know vs. what must stay private', 'Defined success as safe, explainable matches'], output: 'Problem statement and trust model' },
      { phase: '02', title: 'Map the system', summary: 'Laid out the marketplace as one system: public site, seeker portal, employer portal and an internal admin console.', activities: ['Service blueprint across three portals', 'Information architecture and navigation per role', 'End-to-end flows from sign-up to offer and reference'], output: 'Sitemap and core user flows' },
      { phase: '03', title: 'Model the rules', summary: 'Turned visa working-hour conditions into a model the interface could explain: limits, academic calendars and existing commitments.', activities: ['Term-time and vacation limits from university dates', 'Committed hours subtracted from the weekly limit', 'Admin-managed, versioned rule sets'], output: 'Eligibility and hours model' },
      { phase: '04', title: 'Design the experience', summary: 'Designed every screen for seekers, employers and admins, including onboarding, matching, applications, interviews, offers and references.', activities: ['Guided multi-step onboarding for each role', 'Explainable match cards with weighted factors', 'Kanban and table views for applicant review'], output: '90+ screens across five areas' },
      { phase: '05', title: 'Systemise', summary: 'Built shared foundations so three portals feel like one product, and designed for the moments that usually get forgotten.', activities: ['Colour, type, spacing and component tokens', 'Empty, loading, error and restricted states', 'Dialogs, confirmations and subscription states'], output: 'Design system and state library' },
      { phase: '06', title: 'Prototype & hand off', summary: 'Assembled a clickable prototype with demo accounts for each role so stakeholders and engineers can walk real journeys.', activities: ['Demo seeker, employer and admin journeys', 'Annotated rules and edge cases', 'Build-ready component inventory'], output: 'Interactive prototype' },
    ],
    principles: [
      ['Show the summary, protect the source', 'Employers see “permission verified · 12 h left”, never a passport or share code.'],
      ['Every match explains itself', 'Scores break down into skills, experience, location, hours and pay — with a “why” in plain English.'],
      ['Eligibility is a gate, not a score', 'Permission to work is checked separately and never lowers anyone’s ranking.'],
      ['People decide, not algorithms', 'Recommendations support decisions; humans make the hire.'],
    ],
    journey: {
      title: 'From sign-up to first shift',
      intro: 'The seeker journey, as designed — tap a step to see the screen.',
      steps: [
        { label: 'Arrive', text: 'The homepage speaks to both sides at once, with an illustrative match that shows how the product thinks.', image: `${C}/trustbridge-home.webp` },
        { label: 'Sign up', text: 'Seekers and employers choose their path up front, with a preview of the hours calculation they will get.', image: `${C}/trustbridge-register.webp` },
        { label: 'Set eligibility', text: 'Permission is verified once; academic dates and existing jobs produce a live “hours left” figure.', image: `${C}/trustbridge-eligibility.webp` },
        { label: 'Get matched', text: 'Recommended roles are ranked and explained factor by factor, with the hours fit called out.', image: `${C}/trustbridge-recommended.webp` },
        { label: 'Stay on track', text: 'The dashboard brings interviews, applications and remaining hours into one calm overview.', image: `${C}/trustbridge-seeker-dashboard.webp` },
      ],
    },
    decisions: [
      {
        title: 'Turn visa rules into one number people can trust',
        text: 'Instead of asking students to interpret immigration rules, the eligibility screen calculates remaining weekly hours from their permission type, their university’s term dates and the hours they already work — and shows exactly how it got there.',
        tradeoff: 'More inputs to collect at onboarding, offset by asking once and re-using everywhere.',
        image: `${C}/trustbridge-eligibility.webp`,
        caption: 'Work eligibility: 12 of 20 hours left, with the calculation expandable.',
      },
      {
        title: 'Make recommendations explainable by default',
        text: 'Every match shows its score, a one-line reason and an expandable breakdown — skills 40%, hours 20%, experience 15%, location 15%, pay 10% — plus what is missing. Seekers can say whether a match was relevant.',
        tradeoff: 'Denser cards; solved with progressive disclosure so details appear only on request.',
        image: `${C}/trustbridge-recommended.webp`,
        caption: 'Recommended jobs with a factor-by-factor breakdown.',
      },
      {
        title: 'Give employers confidence without exposing documents',
        text: 'Applicant cards carry a verified badge and “hours left” rather than any document. Employers move people through a familiar board — new, reviewing, interview, offer — without becoming immigration experts.',
        tradeoff: 'Employers get less raw information, deliberately, to protect seekers.',
        image: `${C}/trustbridge-applicants.webp`,
        caption: 'Employer applicant board with verification and hours at a glance.',
      },
      {
        title: 'Design the operations console as a first-class product',
        text: 'Trust is manufactured behind the scenes, so the admin portal got the same care: a verification queue for businesses, eligibility review, matching oversight, analytics, reports and a full audit log.',
        tradeoff: 'A third portal adds scope, but without it the trust promises on the front end are empty.',
        image: `${C}/trustbridge-admin-verification.webp`,
        caption: 'Admin verification queue for SMEs.',
      },
      {
        title: 'Keep the rules editable, versioned and auditable',
        text: 'Working-hour limits live in admin-managed rule sets rather than hard-coded logic, so policy changes don’t need a redesign — and every change is recorded.',
        tradeoff: 'More admin complexity in exchange for a product that survives policy change.',
        image: `${C}/trustbridge-admin-rules.webp`,
        caption: 'Platform settings: moderation and eligibility rules.',
      },
    ],
    gallery: [
      { src: `${C}/trustbridge-howitworks.webp`, caption: 'How it works — from profile to first shift.' },
      { src: `${C}/trustbridge-forseekers.webp`, caption: 'For job seekers — hours shown before you apply.' },
      { src: `${C}/trustbridge-emp-dashboard.webp`, caption: 'Employer dashboard.' },
      { src: `${C}/trustbridge-candidates.webp`, caption: 'Recommended candidates for a vacancy.' },
      { src: `${C}/trustbridge-emp-verification.webp`, caption: 'Business verification centre.' },
      { src: `${C}/trustbridge-admin-overview.webp`, caption: 'Admin platform overview.' },
      { src: `${C}/trustbridge-admin-matching.webp`, caption: 'AI matching oversight.' },
      { src: `${C}/trustbridge-profile.webp`, caption: 'Seeker professional profile.' },
    ],
    outcome: [
      'TrustBridge exists as a complete, clickable product: a public site, a job-seeker portal, an employer portal and an internal admin console, designed as one system with shared foundations and a full library of empty, loading, error and restricted states.',
      'It gives engineering an unambiguous picture of every journey — from sign-up and eligibility through matching, interviews, offers and confirmed UK-experience references — and gives stakeholders a prototype they can walk as any of the three roles.',
    ],
    reflection: [
      'TrustBridge was a lesson in designing for trust as a material. The interface had to make two cautious groups comfortable saying yes — and the most important design work was deciding what each side should see, and what it never should.',
      'Treating eligibility as a gate rather than a score was the decision I’m proudest of: it keeps the product fair by design, not by policy.',
    ],
    next: ['Test the eligibility explanation with students on different permission types.', 'Pilot with a small cohort of SMEs to tune match weights against real hiring outcomes.', 'Add accessibility audits of the three portals before build.'],
    tools: ['Figma', 'Design system', 'Prototyping', 'Service design', 'IA'],
  },

  /* ═══════════════════════════════ CONTINUUM ═══════════════════════════════ */
  {
    slug: 'continuum',
    group: 'featured',
    title: 'Continuum',
    tagline: 'Personal health records for Nigeria — one place for every diagnosis, result and prescription, shared only with the people a patient chooses.',
    category: 'HealthTech · Platform',
    accent: '#22C55E',
    cover: `${V}/continuum.webp`,
    live: 'https://continuumng.vercel.app/',
    researchLed: true,
    facts: [
      ['Role', 'Lead Product Designer'],
      ['Type', 'New product · 0 → 1'],
      ['Platform', 'Responsive web · works on any phone'],
      ['Market', 'Nigeria · pilot'],
    ],
    glance: [['5', 'Languages, incl. Hausa, Yorùbá, Igbo & Naijá'], ['4', 'User groups in one record'], ['3', 'Consent durations: 7, 30, 90 days'], ['1 tap', 'To revoke a hospital’s access, instantly']],
    tldr: {
      problem: 'Patients in Nigeria move between hospitals, labs and clinics, and their history doesn’t follow them. Every new visit starts from paperwork and memory, and patients have no visibility of who has seen their data.',
      approach: 'I designed a patient-owned record built around consent: verified institutions request access, patients choose what and for how long, every view is logged, and emergencies have a reviewed break-glass path — all usable on a basic phone browser in five languages.',
      outcome: 'A live pilot covering patient sign-up, consent-based sharing, a verified facility directory, institution onboarding and Nigeria-specific features like an offline emergency card and genotype on record.',
    },
    overview: [
      'Continuum keeps a person’s diagnoses, lab results, prescriptions and vaccinations from every facility in one secure record — and nobody sees it unless the patient says so.',
      'Health data is the most sensitive data people have, and trust in digital systems is fragile. The product had to feel safe enough for a first-time smartphone user, while giving hospitals and labs a workflow that fits real clinical days.',
    ],
    role: 'As lead designer, I led the product end to end: positioning, the consent model, information architecture for patients and institutions, onboarding flows, the facility directory and the interface across every screen size.',
    constraints: [
      'Must work in a mobile browser on slow connections — no app install.',
      'Consent has to be specific, time-limited and revocable instantly.',
      'Institutions must be verified before they can request anything.',
      'Emergency access can’t wait for consent, but must be accountable afterwards.',
    ],
    users: [
      { name: 'Patients', icon: 'person', goal: 'Have their whole history with them at every appointment.', pain: 'Records scattered across facilities; no idea who has seen what.' },
      { name: 'Hospitals & clinics', icon: 'local_hospital', goal: 'See the right history quickly to treat well.', pain: 'Starting from zero at each visit; repeating tests.' },
      { name: 'Laboratories', icon: 'biotech', goal: 'Get results to patients and doctors reliably.', pain: 'Results printed, lost or never reaching the next clinician.' },
      { name: 'Parents & carers', icon: 'family_restroom', goal: 'Manage a child’s or relative’s records and immunisations.', pain: 'Tracking schedules and history on paper.' },
    ],
    process: [
      { phase: 'R', title: 'Research', summary: 'Ran user research with patients, carers and healthcare providers to understand how records are kept, lost and shared today.', activities: ['User research with patients and carers', 'User research with hospitals and labs', 'Synthesis into consent and access needs'], output: 'Research insights and priorities', research: true },
      { phase: '01', title: 'Frame', summary: 'Positioned the product around ownership: “Your records, your say.”', activities: ['Defined the patient as the owner of the record', 'Listed what each institution type needs to do', 'Set trust promises the UI must keep'], output: 'Product positioning and trust promises' },
      { phase: '02', title: 'Design the consent model', summary: 'Made consent concrete: which record types, for what purpose, for how long — and revocable in one tap.', activities: ['Granular record types (labs, prescriptions, diagnoses…)', '7 / 30 / 90-day durations', 'Named, time-stamped access log'], output: 'Consent and access model' },
      { phase: '03', title: 'Localise for Nigeria', summary: 'Shaped features around the health problems people actually face.', activities: ['Genotype and sickle-cell status first', 'Immunisation tracker on the national schedule', 'NHIA and HMO numbers on the record'], output: 'Nigeria-specific feature set' },
      { phase: '04', title: 'Design for access', summary: 'Designed for basic phones, low bandwidth and five languages.', activities: ['Browser-first, no app install', 'Language switcher: English, Hausa, Yorùbá, Igbo, Naijá', 'Offline QR emergency card'], output: 'Inclusive, mobile-first interface' },
      { phase: '05', title: 'Onboard institutions', summary: 'Built a verified path for hospitals and labs, with licence checks before any access.', activities: ['Authorised-representative registration', 'Licence and document verification', 'Staff invitations'], output: 'Institution onboarding flow' },
      { phase: '06', title: 'Pilot', summary: 'Launched the experience as a live pilot with transparent figures.', activities: ['Public facility directory by state', 'Live pilot counters', 'Synthetic demo data for safety'], output: 'Live pilot product' },
    ],
    principles: [
      ['Nothing leaves without a yes', 'Every request names the institution, the doctor and the purpose before a patient decides.'],
      ['Show exactly what will be shared', 'A live preview shows what the hospital would see — and what stays hidden.'],
      ['Every view is accountable', 'Access is logged with a name and a reason, and emergency access is reviewed by a person.'],
      ['Works on the phone people have', 'No app, light pages, five languages.'],
    ],
    journey: {
      title: 'Sharing a record, step by step',
      intro: 'How a patient goes from sign-up to sharing with a doctor.',
      steps: [
        { label: 'Arrive', text: 'The promise is explicit from the first screen: your records, wherever life takes you — and nobody sees them unless you say so.', image: `${C}/continuum-home.webp` },
        { label: 'Check the facility', text: 'Before sharing, patients can confirm a hospital or lab is licensed and verified using its Institution ID.', image: `${C}/continuum-facilities.webp` },
        { label: 'Decide what to share', text: 'A request shows who is asking and why. Patients toggle record types and a time limit, and see a live preview of what will be visible.', image: `${C}/continuum-consent.webp` },
        { label: 'Stay in control', text: 'Access ends automatically, can be revoked in one tap, and every view is named and time-stamped.', image: `${C}/continuum-care.webp` },
      ],
    },
    decisions: [
      {
        title: 'Let patients try consent before signing up',
        text: 'An interactive demo on the homepage puts visitors in the patient’s seat: choose record types and a duration, and watch the hospital’s view update. Consent stops being a policy promise and becomes something people have felt.',
        tradeoff: 'A heavier homepage section, justified because it explains the core idea faster than any copy.',
        image: `${C}/continuum-consent.webp`,
        caption: '“You’re the patient. What will you share?” — live consent preview.',
      },
      {
        title: 'Design for Nigerian healthcare, not generic healthcare',
        text: 'Genotype on record, an immunisation tracker on the national schedule, NHIA numbers and an emergency card with a QR code that works offline — features chosen because they change real outcomes here.',
        tradeoff: 'A narrower market focus, in exchange for a product that is obviously useful on day one.',
        image: `${C}/continuum-nigeria.webp`,
        caption: '“Made for the health problems we actually face.”',
      },
      {
        title: 'Verified institutions, discoverable by anyone',
        text: 'A public directory lets patients search licensed facilities by state and confirm an Institution ID before sharing — protecting them from impersonation.',
        tradeoff: 'Slower institution onboarding because of licence checks — accepted as the cost of trust.',
        image: `${C}/continuum-facilities.webp`,
        caption: 'Find a facility — verified care, near you.',
      },
      {
        title: 'One record, many hands',
        text: 'Patients, hospitals, laboratories and carers each get their own entry point, so the product speaks to every role without one confusing sign-up.',
        tradeoff: 'More entry points to maintain, but each audience lands on a path written for them.',
        image: `${C}/continuum-roles.webp`,
        caption: 'Role-based entry points.',
      },
    ],
    gallery: [
      { src: `${C}/continuum-trust.webp`, caption: 'Trust pillars beneath the hero.' },
      { src: `${C}/continuum-steps.webp`, caption: 'Three steps to a record that is yours.' },
      { src: `${C}/continuum-clinical.webp`, caption: 'Workflows for clinical teams.' },
      { src: `${C}/continuum-provider.webp`, caption: 'Institution registration.' },
      { src: `${C}/continuum-mobile.webp`, caption: 'Mobile home.', mobile: true },
    ],
    outcome: [
      'Continuum is live as a pilot: patients can create a free record, verified institutions can register, and the consent, facility directory and emergency features are all part of the experience.',
      'The pilot publishes its own live figures openly and uses synthetic data in demos — a small detail that reflects the product’s whole stance on trust.',
    ],
    reflection: [
      'In health, the interface is the consent. If people can’t see exactly what they are agreeing to, the agreement isn’t real — so the most important work was making sharing visible, specific and reversible.',
    ],
    next: ['Usability sessions with first-time smartphone users in at least two languages.', 'Clinical workflow testing with a partner hospital and lab.', 'Measure time-to-history at the start of appointments as the north-star metric.'],
    tools: ['Figma', 'Design system', 'Prototyping', 'Localisation', 'Accessibility'],
  },

  /* ═══════════════════════════════ KRENT ═══════════════════════════════ */
  {
    slug: 'krent',
    group: 'featured',
    title: 'Krent',
    tagline: 'Redesigning a Nigerian property platform around clarity — for renters, buyers, shortlet guests, hosts and agents.',
    category: 'PropTech · Marketplace',
    accent: '#2DD4BF',
    cover: `${V}/krent.webp`,
    live: 'https://krent.space/',
    researchLed: true,
    facts: [
      ['Role', 'Lead Product Designer'],
      ['Type', 'Product redesign'],
      ['Platform', 'Responsive web + mobile app'],
      ['Market', 'Nigeria · Lagos & Abuja'],
    ],
    glance: [['5', 'User groups in one platform'], ['3', 'Core intents: rent, shortlet, buy'], ['2', 'Platforms: web and mobile app'], ['1', 'Listing card pattern for everything']],
    tldr: {
      problem: 'Five very different user groups shared one property experience, and the structure made it hard for anyone to find their path, compare listings or trust what they were seeing.',
      approach: 'I separated the experience by intent, rebuilt the information hierarchy, designed a single comparable listing card with visible trust signals and carried one component language across web and app.',
      outcome: 'A clearer, more consistent platform — now live at krent.space — with distinct paths for renting, shortlets and buying, curated entry points by area and budget, and a dedicated route for owners.',
    },
    overview: [
      'Krent is a Nigerian real-estate marketplace: one platform where people rent, buy or book a shortlet, and where owners and agents list and manage properties. Listings carry verification, 3D tours and instant booking.',
      'A redesign starts with something that already works for someone. My task was to understand what the existing experience was trying to do, find where its structure got in the way and rebuild it — without losing what people relied on.',
    ],
    role: 'As lead designer, I owned the redesign end to end: auditing the existing experience, re-organising information and journeys, and translating the result into a consistent set of screens across web and mobile.',
    constraints: [
      'Five user groups with different goals in one product.',
      'Existing functionality had to be preserved through the redesign.',
      'A market wary of fake listings — trust had to be visible.',
      'Web and mobile app needed to share one design language.',
    ],
    users: [
      { name: 'Renters', icon: 'key', goal: 'Find a verified home in the right area and budget.', pain: 'Too many listings, too little to compare them by.' },
      { name: 'Shortlet guests', icon: 'luggage', goal: 'Book a short stay quickly and safely.', pain: 'Uncertainty about whether a listing is real.' },
      { name: 'Buyers', icon: 'real_estate_agent', goal: 'Evaluate property for sale with confidence.', pain: 'Purchase paths mixed in with rentals.' },
      { name: 'Hosts & agents', icon: 'badge', goal: 'List and manage properties easily.', pain: 'Supply-side tasks buried inside a renter experience.' },
    ],
    process: [
      { phase: 'R', title: 'Research', summary: 'Ran user research with renters, shortlet guests, buyers, hosts and agents to understand where the existing experience let each of them down.', activities: ['User research across all five user groups', 'Mapped findings against the existing journeys', 'Prioritised friction to fix first'], output: 'Research insights and priorities', research: true },
      { phase: '01', title: 'Audit', summary: 'Walked the existing product as each user type and documented where content, navigation and actions competed.', activities: ['Heuristic review per user group', 'Inventory of pages and components', 'Mapped existing journeys'], output: 'Audit of friction points' },
      { phase: '02', title: 'Prioritise', summary: 'Separated three core intents — rent, shortlet, buy — and decided what each page is for.', activities: ['Intent-based navigation', 'Page purpose definitions', 'Supply vs. demand paths'], output: 'Restructured IA' },
      { phase: '03', title: 'Restructure', summary: 'Grouped property information into scannable blocks with one obvious next action.', activities: ['Listing card anatomy', 'Area and budget entry points', 'Search placement'], output: 'Wireframes and flows' },
      { phase: '04', title: 'Design', summary: 'Rebuilt hierarchy, spacing, typography and action visibility across web and app.', activities: ['Visual system and components', 'Trust badges and states', 'Responsive layouts'], output: 'High-fidelity screens' },
      { phase: '05', title: 'Review as a journey', summary: 'Checked the redesign as connected flows — search to listing to booking — rather than isolated pages.', activities: ['Flow walkthroughs', 'Consistency pass', 'Handoff preparation'], output: 'Build-ready design' },
    ],
    principles: [
      ['One job per page', 'Every page earns its place by serving one intent first.'],
      ['Compare like with like', 'The same card anatomy everywhere makes options comparable at a glance.'],
      ['Trust up front', 'Verification, references and booking status sit on the card, not behind it.'],
    ],
    journey: {
      title: 'Finding a shortlet',
      intro: 'The redesigned path from first visit to listing.',
      steps: [
        { label: 'Land', text: 'The promise — verified homes, real agents, 3D tours — sits above a two-field search.', image: `${C}/krent-mobile.webp`, mobile: true },
        { label: 'Choose an area', text: 'Curated neighbourhood and budget tiles turn a search problem into a recognition one.', image: `${C}/krent-areas.webp` },
        { label: 'Compare listings', text: 'Consistent cards with Top Listing, Instant Booking and 3D Tour badges make comparison effortless.', image: `${C}/krent-listings.webp` },
        { label: 'Trust the platform', text: 'The story behind Krent is told plainly, reinforcing safety before booking.', image: `${C}/krent-about.webp` },
      ],
    },
    decisions: [
      { title: 'Lead with the promise, then the search', text: 'The first screen states what makes Krent different and puts location and date search directly beneath it, so people understand the offer and can act in the same glance.', tradeoff: 'Less room for promotional content on the first screen.', image: `${C}/krent-mobile.webp`, mobile: true, caption: 'Mobile home: “Verified Homes Only” above search.' },
      { title: 'Browse by place and budget', text: 'Curated tiles for Lekki, Victoria Island, Surulere and Yaba — plus a simple budget split — let people start from what they already know instead of a long filter form.', tradeoff: 'Curated tiles need editorial upkeep as the catalogue grows.', image: `${C}/krent-areas.webp`, caption: 'Area and budget entry points.' },
      { title: 'One listing card, built for comparison', text: 'Photo with status badges, price per day, title, location, reference, then bedrooms and bathrooms — always in the same order, with 3D Tour and Quick View one tap away.', tradeoff: 'A fixed template limits per-listing flair, deliberately.', image: `${C}/krent-listings.webp`, caption: 'Consistent listing cards with trust badges.' },
      { title: 'Give owners their own door', text: 'A dedicated “Become a host” path keeps supply-side journeys out of the renter’s way.', tradeoff: 'Another entry point in the navigation.', image: `${C}/krent-home.webp`, caption: 'Desktop home with app download and owner entry point.' },
    ],
    gallery: [],
    outcome: ['The redesign produced a clearer structure for the parts of Krent in scope: separate paths for renting, shortlets and buying; curated entry points; a consistent listing card; and visible trust signals throughout. The platform is live at krent.space.'],
    reflection: ['A redesign is not a visual refresh. The biggest improvements came from deciding what each page is for and who it serves first — the polish only works once that structure is right.'],
    next: ['Task-based testing for each user group.', 'Instrument search-to-booking to measure the impact of the new entry points.'],
    tools: ['Figma', 'Design system', 'Responsive web', 'Mobile app'],
  },

  /* ═══════════════════════════════ AJIROBA ═══════════════════════════════ */
  {
    slug: 'ajiroba',
    group: 'featured',
    title: 'Ajiroba',
    tagline: 'Designing a consumer raffle platform from the ground up — making an unfamiliar way to shop easy to understand and safe to try.',
    category: 'Consumer · E-commerce',
    accent: '#F97316',
    cover: `${V}/ajiroba.webp`,
    live: 'https://www.ajiroba.com/',
    researchLed: true,
    facts: [
      ['Role', 'Lead Product Designer'],
      ['Type', 'New product · 0 → 1'],
      ['Timeline', 'Nov 2023 — Sep 2025'],
      ['Platform', 'Web + iOS & Android'],
    ],
    glance: [['3', 'Step model: ticket, draw, win'], ['3', 'Platforms: web, iOS, Android'], ['2', 'Years embedded with the team'], ['5', 'Core nav items, same on every device']],
    tldr: {
      problem: 'A raffle-based way to get products is unfamiliar — and in a market wary of online schemes, people won’t fund a wallet until they understand how it works and trust it.',
      approach: 'I structured the experience around the questions first-time visitors actually have, led with value before mechanics, explained the model in three steps and built one design system across web and apps.',
      outcome: 'A live product on web, iOS and Android where people fund a wallet, buy tickets, follow live draws and receive delivered prizes — and a system that also powered Ajiroba’s campaigns.',
    },
    overview: [
      'Ajiroba is a consumer platform built around raffle draws: people fund a wallet, buy low-cost tickets for products they want, and a live draw picks a winner whose item is delivered. Every draw is guaranteed a winner, and more tickets mean a better chance.',
      'Because the model is less familiar than a normal store, the experience had to introduce the concept, explain how it works and earn trust before asking anyone for money.',
    ],
    role: 'As lead designer, I owned the end-to-end design — translating the proposition into a structured experience and a consistent interface across website and apps — and worked alongside engineering through delivery, embedded with the team for two years.',
    constraints: ['An unfamiliar purchase model.', 'A trust-sensitive audience.', 'Wallet, tickets, draws and delivery all in one product.', 'Web and native apps sharing one language.'],
    users: [
      { name: 'First-time visitor', icon: 'person_search', goal: 'Understand what Ajiroba is and whether it’s legitimate.', pain: 'Unfamiliar model; fear of scams.' },
      { name: 'Participant', icon: 'confirmation_number', goal: 'Buy tickets for products they want and follow the draw.', pain: 'Unclear rules and progress after paying.' },
      { name: 'Repeat player', icon: 'smartphone', goal: 'Join new draws quickly from their phone.', pain: 'Friction topping up and finding new draws.' },
    ],
    process: [
      { phase: 'R', title: 'Research', summary: 'Ran user research with first-time visitors and participants to understand what they needed to know — and to trust — before taking part.', activities: ['User research with prospective participants', 'User research with active participants', 'Synthesis into comprehension and trust needs'], output: 'Research insights and priorities', research: true },
      { phase: '01', title: 'Frame the product', summary: 'Worked out what a first-time visitor must know and what helps them judge a product.', activities: ['Proposition and value framing', 'Key questions inventory', 'Trust requirements'], output: 'Experience brief' },
      { phase: '02', title: 'Structure', summary: 'Ordered the experience around: What is this? What can I win? How does it work? What next?', activities: ['Information hierarchy', 'Navigation model', 'Content priorities'], output: 'IA and page structure' },
      { phase: '03', title: 'Design the journey', summary: 'Mapped wallet top-up → ticket → draw → win, with the feedback each step needs.', activities: ['Flows and states', 'Wallet and ticket interactions', 'Draw status feedback'], output: 'End-to-end flows' },
      { phase: '04', title: 'Visual system', summary: 'Bold product imagery, a warm orange palette and clear emphasis on price and the primary action.', activities: ['Brand-led UI', 'Component library', 'Responsive layouts'], output: 'Design system' },
      { phase: '05', title: 'Deliver & extend', summary: 'Supported build across web and apps, and reused the system for campaigns.', activities: ['Engineering collaboration', 'QA and refinements', 'Campaign microsites'], output: 'Live product' },
    ],
    principles: [['Value before mechanics', 'Show what you can win, then explain how.'], ['Explain in three steps', 'Ticket, draw, win — nothing more to learn.'], ['Same model everywhere', 'Identical structure on web, iOS and Android.']],
    journey: {
      title: 'From curiosity to a ticket',
      intro: 'How a first-time visitor is guided to participate.',
      steps: [
        { label: 'See the value', text: 'Real products and a ticket price from ₦200 lead the page.', image: `${C}/ajiroba-home.webp` },
        { label: 'Understand it', text: '“Why Ajiroba?” tells the story beside the app.', image: `${C}/ajiroba-why.webp` },
        { label: 'Learn the rules', text: 'Ticket, Raffle Draw, Win — three steps in plain language.', image: `${C}/ajiroba-how.webp` },
        { label: 'Take part on mobile', text: 'The same hierarchy and actions on a phone.', image: `${C}/ajiroba-mobile.webp`, mobile: true },
      ],
    },
    decisions: [
      { title: 'Sell the value, not the mechanic', text: 'The hero leads with the most compelling fact — enter for as little as ₦200 — paired with real products. The raffle concept comes after the value is clear.', tradeoff: 'Delays the explanation by one scroll, deliberately.', image: `${C}/ajiroba-home.webp`, caption: 'Value-first hero.' },
      { title: 'Explain the model in three steps', text: 'A short numbered sequence answers “how does this work?” before it becomes a reason to leave.', tradeoff: 'Simplifies nuance (multiple tickets, draw timing) into later pages.', image: `${C}/ajiroba-how.webp`, caption: 'Key attributes and “How it works”.' },
      { title: 'Make the app a first-class path', text: 'Repeat participation happens on mobile, so the brand story sits beside the app with store links where intent is highest.', tradeoff: 'Pushes some users away from the web experience.', image: `${C}/ajiroba-why.webp`, caption: 'Brand story beside the app.' },
    ],
    gallery: [],
    outcome: ['Ajiroba went from proposition to a live product on web, iOS and Android. The interface patterns established here also carried into Ajiroba’s campaigns, including the Spin & Win giveaway.'],
    quoteFrom: 'Oloruntoba Ayodele',
    reflection: ['When the model is unfamiliar, the interface has to explain the value and the mechanics at the same time — and earn trust before asking for money.'],
    next: ['Design a better post-draw experience for people who didn’t win this time.', 'Simplify wallet top-up on mobile.'],
    tools: ['Figma', 'Design system', 'Web', 'iOS & Android'],
  },

  /* ═══════════════════════════════ PAYTRACKR ═══════════════════════════════ */
  {
    slug: 'paytrackr',
    group: 'product',
    title: 'Paytrackr',
    tagline: 'A finance dashboard for freelancers and small businesses — designed so money questions have instant answers.',
    category: 'Fintech · Dashboard',
    accent: '#84CC16',
    cover: '/images/paytrackr.webp',
    live: 'https://paytrackr-invoice.vercel.app/',
    researchLed: true,
    facts: [['Role', 'Lead Product Designer'], ['Type', 'Invoicing & payments'], ['Platform', 'Responsive web app'], ['Focus', 'Hierarchy · flows']],
    tldr: {
      problem: 'People who bill clients struggle to see, at a glance, what has been paid, what is pending and what is overdue.',
      approach: 'I designed the dashboard around three questions — what am I owed, what came in, what needs chasing — and reduced invoice tasks to short, linear flows.',
      outcome: 'A responsive product with a calm, status-first dashboard, live behind sign-in.',
    },
    overview: ['Paytrackr tracks invoices, payments and earnings by category, with a balance summary and colour-coded statuses.'],
    role: 'As lead designer, I ran the user research and designed the information architecture, dashboard hierarchy, invoicing flows and responsive interface, and prepared the handoff for build.',
    process: [
      { phase: 'R', title: 'Research', summary: 'Ran user research with freelancers and small-business owners to understand how they track invoices and payments today.', activities: ['User research with people who bill clients', 'Mapped current tracking habits', 'Defined the questions the dashboard must answer'], output: 'Research insights and priorities', research: true },
      { phase: '01', title: 'Define', summary: 'Turned money anxiety into three questions the dashboard must answer.', activities: ['Core questions', 'Module priorities'], output: 'Dashboard brief' },
      { phase: '02', title: 'Structure', summary: 'Status totals first, then summaries, then breakdowns.', activities: ['Hierarchy', 'Navigation'], output: 'IA' },
      { phase: '03', title: 'Design', summary: 'Short, linear invoice flows with calm visuals.', activities: ['Flows', 'Responsive UI'], output: 'Screens & handoff' },
    ],
    decisions: [
      { title: 'Status totals lead the dashboard', text: 'Paid, pending and overdue sit in one row with colour-coded tags, so the most important answer needs no clicks.', tradeoff: 'Less room for charts above the fold.', image: '/images/paytrackr.webp', caption: 'Dashboard overview.' },
      { title: 'A quiet, focused entry', text: 'A single uncluttered sign-in card sets the calm tone the rest of the product keeps.', image: `${C}/paytrackr-signin.webp`, caption: 'Sign-in.' },
    ],
    gallery: [{ src: `${C}/paytrackr-mobile.webp`, mobile: true, caption: 'Mobile sign-in.' }],
    outcome: ['A complete responsive product with a handoff package; live behind sign-in.'],
    reflection: ['In finance, hierarchy is the feature.'],
    tools: ['Figma', 'Prototyping', 'Responsive web'],
  },

  /* ═══════════════════════════════ LEDGER STUDIO ═══════════════════════════════ */
  {
    slug: 'ledger-studio',
    group: 'product',
    title: 'Ledger Studio',
    tagline: 'An invoicing product that turns client billing into a two-minute ritual — designed and built by me.',
    category: 'SaaS · Design + build',
    accent: '#8B5CF6',
    cover: `${V}/ledger.webp`,
    live: 'https://ledger-studio-pi.vercel.app/',
    researchLed: true,
    facts: [['Role', 'Lead Designer & front-end developer'], ['Type', 'Product, 0 → 1'], ['Platform', 'Responsive web app'], ['Stack', 'Client-side · no backend']],
    glance: [['4', 'Steps from blank page to sent'], ['6', 'Currencies'], ['2', 'Themes: light and dark'], ['1', 'Click to PDF']],
    tldr: {
      problem: 'Freelancers and studios lose time rebuilding invoices in spreadsheets, and the results rarely look professional.',
      approach: 'I designed a set-up-once model — brand, details and bank info remembered — with a four-step flow, then built it myself.',
      outcome: 'A live, free product with branded invoices, PDF export, shareable links, six currencies and light and dark modes.',
    },
    overview: ['Ledger Studio is an invoice generator for designers, developers, studios and small businesses. Set up your studio once; every invoice after that is pre-filled and ready to send.'],
    role: 'As lead designer and developer, I researched, designed and built the whole product: positioning, IA, the invoice editor, the dashboard and the marketing site.',
    process: [
      { phase: 'R', title: 'Research', summary: 'Ran user research with designers, developers and small studios to understand how they create and send invoices today.', activities: ['User research with freelancers and studios', 'Mapped the current invoicing workflow', 'Cut scope to what gets people paid sooner'], output: 'Research insights and priorities', research: true },
      { phase: '01', title: 'Define the job', summary: 'Strip invoicing down to what gets you paid sooner.', activities: ['Jobs to be done', 'Feature cut'], output: 'Scope' },
      { phase: '02', title: 'Design the flow', summary: 'Set up studio → add client → list the work → send or print.', activities: ['Flow', 'Editor UI', 'Dashboard'], output: 'Screens' },
      { phase: '03', title: 'Build', summary: 'A client-side app with PDF export and shareable read-only links.', activities: ['Front-end build', 'Responsive QA'], output: 'Live product' },
    ],
    journey: {
      title: 'From blank page to sent invoice',
      steps: [
        { label: 'Promise', text: 'The hero shows a real invoice and a “Payment received” confirmation.', image: `${C}/ledger-home.webp` },
        { label: 'Benefits', text: 'Features framed as outcomes: brand remembered, bank details built in.', image: `${C}/ledger-features.webp` },
        { label: 'Four steps', text: 'The app mirrors the four steps explained on the landing page.', image: `${C}/ledger-steps.webp` },
        { label: 'Dashboard', text: 'One calm screen for revenue, outstanding and paid.', image: `${C}/ledger-dashboard.webp` },
      ],
    },
    decisions: [
      { title: 'Show the product in the first screen', text: 'The hero pairs the promise with a real invoice preview, so visitors see the result before reading a feature list.', image: `${C}/ledger-home.webp`, caption: '“Invoices worthy of the work you do.”' },
      { title: 'A four-step mental model', text: 'The whole product is explained as four steps, and the app follows that order — nothing new to learn after the landing page.', tradeoff: 'Advanced options are hidden until needed.', image: `${C}/ledger-steps.webp`, caption: 'Four steps.' },
    ],
    gallery: [{ src: `${C}/ledger-mobile.webp`, mobile: true, caption: 'Mobile landing.' }],
    outcome: ['A live, free product used to send branded invoices in minutes.'],
    reflection: ['Building my own design showed me where designs hide ambiguity — every unanswered edge case becomes a decision in code.'],
    tools: ['Figma', 'HTML', 'CSS', 'JavaScript'],
  },

  /* ═══════════════════════════════ TRENSLEEK ═══════════════════════════════ */
  {
    slug: 'trensleek',
    group: 'product',
    title: 'Trensleek Travels',
    tagline: 'A travel concierge website for a Nigerian-owned agency — flights, private jets, hotels and advice, arranged by a real person rather than a booking engine.',
    category: 'Travel · Web',
    accent: '#38BDF8',
    cover: `${V}/trensleek.webp`,
    live: 'https://trensleek.vercel.app/',
    facts: [['Role', 'Lead Product Designer'], ['Type', 'Brand & service website'], ['Platform', 'Responsive web'], ['Market', 'Nigeria · Ogun & Abuja']],
    glance: [['6', 'Services, one team'], ['3', 'Steps from enquiry to travel'], ['4', 'Trip types in the planner'], ['1', 'Tap to a pre-filled WhatsApp chat']],
    tldr: {
      problem: 'A personal travel agency competes with big booking sites. Its strength is a human who looks after you — but most travel websites hide that behind forms.',
      approach: 'I designed the site around conversation: a trip planner and destination tiles that open pre-filled WhatsApp chats, clear service pages and values that sell care, speed and discretion.',
      outcome: 'A live, responsive site with six service pages, an enquiry flow that routes straight to the team and an accessible motion layer with a pause control.',
    },
    overview: [
      'Trensleek arranges local and international flights, private jet hire, VIP escorts, hotel reservations and travel consultancy — personally, from first enquiry to safe arrival.',
      'The site needed to feel premium and trustworthy, while making it effortless to start a conversation with a real person.',
    ],
    role: 'As lead designer, I designed the experience end to end: positioning, IA, the trip planner and enquiry flows, service pages and the visual system.',
    constraints: ['Not a booking engine — fares and availability are confirmed personally.', 'WhatsApp is where customers already talk to the team.', 'Must feel premium enough for private-jet clients.'],
    users: [
      { name: 'Leisure traveller', icon: 'beach_access', goal: 'Plan a trip with someone who handles the details.', pain: 'Booking sites are impersonal and confusing.' },
      { name: 'Business traveller', icon: 'business_center', goal: 'Fast, reliable arrangements.', pain: 'No time for forms or back-and-forth.' },
      { name: 'VIP & organisations', icon: 'flight_takeoff', goal: 'Private jets, escorts and discretion.', pain: 'Needs confidentiality and a single point of contact.' },
    ],
    process: [
      { phase: '01', title: 'Position', summary: '“Travel, beautifully arranged” — selling care, not inventory.', activities: ['Value proposition', 'Brand tone'], output: 'Positioning' },
      { phase: '02', title: 'Design the enquiry', summary: 'Every path ends in a conversation with the team.', activities: ['Trip planner', 'Pre-filled WhatsApp messages', 'Fallback enquiry form'], output: 'Enquiry model' },
      { phase: '03', title: 'Structure services', summary: 'Six services, each with its own detail page.', activities: ['Services IA', 'Detail templates'], output: 'Sitemap' },
      { phase: '04', title: 'Design & motion', summary: 'Cinematic imagery and editorial type, with motion users can pause.', activities: ['Visual system', 'Accessible motion'], output: 'Live site' },
    ],
    principles: [['A real person replies', 'Say it plainly: this is not a booking engine.'], ['Start the conversation for them', 'Pre-fill the message so one tap is enough.'], ['Premium, not complicated', 'Rich imagery with simple paths.']],
    journey: {
      title: 'From inspiration to a conversation',
      steps: [
        { label: 'Arrive', text: 'A cinematic hero and a trip planner with Flights, Private Jet, Hotels and Travel Advice tabs.', image: `${C}/trensleek-home.webp` },
        { label: 'Get inspired', text: 'Destination tiles each open a WhatsApp chat already about that place.', image: `${C}/trensleek-destinations.webp` },
        { label: 'Understand the process', text: 'Three steps: choose a service, make an enquiry, travel with assurance.', image: `${C}/trensleek-journey.webp` },
        { label: 'Talk to the team', text: 'WhatsApp, phone, email or the full enquiry form — whichever suits.', image: `${C}/trensleek-contact.webp` },
      ],
    },
    decisions: [
      { title: 'Make WhatsApp the booking engine', text: 'Destination tiles and the trip planner open WhatsApp with a pre-written message, so starting a conversation takes one tap and arrives with context.', tradeoff: 'No instant prices online — honest, because fares are confirmed personally.', image: `${C}/trensleek-destinations.webp`, caption: '“Tap a place to start a WhatsApp conversation about it.”' },
      { title: 'Be explicit about the model', text: '“Not a booking engine. A real person replies with options.” sits right under the planner, setting expectations before anyone types.', image: `${C}/trensleek-home.webp`, caption: 'Hero and trip planner.' },
      { title: 'Sell the values behind the service', text: 'Integrity, confidentiality, customer centricity and speed — with client safety as a thread through everything — address what premium travellers worry about.', tradeoff: 'Testimonials are marked “coming soon” rather than invented.', image: `${C}/trensleek-values.webp`, caption: 'What you can expect from us.' },
    ],
    gallery: [
      { src: `${C}/trensleek-flights.webp`, caption: 'Flights and stays.' },
      { src: `${C}/trensleek-services.webp`, caption: 'Services overview.' },
      { src: `${C}/trensleek-cta.webp`, caption: 'Closing call to action.' },
      { src: `${C}/trensleek-mobile.webp`, mobile: true, caption: 'Mobile home.' },
    ],
    outcome: ['A live website with six service pages, a trip planner and an enquiry model that routes every visitor to a real person with context — plus a motion layer that can be paused for accessibility.'],
    reflection: ['The best conversion design for a personal service is to start the conversation for people.'],
    next: ['Add real client testimonials when supplied.', 'Track which destinations and services start the most conversations.'],
    tools: ['Figma', 'Web', 'Motion'],
  },

  /* ═══════════════════════════════ SPIN & WIN ═══════════════════════════════ */
  {
    slug: 'spin-and-win',
    group: 'product',
    title: 'Ajiroba Spin & Win',
    tagline: 'A campaign microsite designed to feel official and safe in a market wary of online giveaways.',
    category: 'Campaign · Web',
    accent: '#FB923C',
    cover: `${V}/spin.webp`,
    live: 'https://campaign.ajiroba.com/',
    facts: [['Role', 'Lead Product Designer'], ['Type', 'Campaign microsite'], ['Platform', 'Responsive web'], ['Status', 'Live campaign']],
    tldr: {
      problem: 'Online giveaways are met with suspicion; a fun mechanic is worthless if people don’t trust it.',
      approach: 'I designed the page around trust: one action, an official-campaign notice, a message from the CEO and four trust pillars.',
      outcome: 'A live campaign consistent with the Ajiroba product, built around a single action and visible trust signals.',
    },
    overview: ['Spin & Win rewards Ajiroba’s community: spin a wheel for a chance to win, with prizes redeemed through a verified support channel.'],
    role: 'As lead designer, I designed the campaign experience within the Ajiroba design system.',
    decisions: [
      { title: 'Put a real person behind the campaign', text: 'A message from Ajiroba’s CEO turns an anonymous promotion into a company speaking to its community.', image: `${C}/spin-trust.webp`, caption: 'Trust pillars.' },
    ],
    gallery: [{ src: `${C}/spin-mobile.webp`, mobile: true, caption: 'Mobile campaign page.' }],
    outcome: ['A live campaign site with one primary action and visible trust signals.'],
    reflection: ['For promotions, trust is the conversion design.'],
    tools: ['Figma', 'Web'],
  },

  /* ═══════════════════════════════ MEALFLEX ═══════════════════════════════ */
  {
    slug: 'mealflex',
    group: 'product',
    title: 'Mealflex',
    tagline: 'A mobile-first food ordering app for young Africans — from discovery to doorstep.',
    category: 'FoodTech · Mobile app',
    accent: '#F97316',
    cover: '/images/mealflex.webp',
    live: 'https://www.behance.net/gallery/231847479/Meal-Flex',
    liveLabel: 'View on Behance',
    facts: [['Role', 'Lead Product Designer'], ['Type', 'Mobile app design'], ['Platform', 'iOS & Android'], ['Scope', 'Discovery · ordering · tracking']],
    tldr: { problem: 'Too many decisions stand between “I’m hungry” and “order placed”.', approach: 'I mapped the journey and removed every step that didn’t help the decision.', outcome: 'A complete app design covering discovery, checkout and real-time tracking.' },
    overview: ['Mealflex helps people find restaurants, choose meals, check out and follow their order in real time.'],
    role: 'As lead designer, I designed the app end to end: IA, browse-to-checkout flow, tracking and the visual interface.',
    decisions: [{ title: 'Image-led catalogue', text: 'Food is chosen with the eyes, so dishes lead with photography and the add action is always in the same place.', image: '/images/mealflex.webp', caption: 'Catalogue and ordering screens.' }],
    gallery: [],
    outcome: ['A complete mobile app design, presented in full on Behance.'],
    reflection: ['Designing for appetite means designing for speed.'],
    tools: ['Figma', 'Prototyping', 'Mobile'],
  },

  /* ═══════════════════════════════ CREATIFFF ═══════════════════════════════ */
  {
    slug: 'creatifff',
    group: 'product',
    title: 'Creatifff',
    tagline: 'Mobile-first fashion e-commerce — onboarding and checkout redesigned around clarity.',
    category: 'Fashion · E-commerce',
    accent: '#60A5FA',
    cover: '/images/creatifff.webp',
    live: 'https://www.behance.net/gallery/236775971/Creatifff-Ecommerce',
    liveLabel: 'View on Behance',
    facts: [['Role', 'Lead Product Designer'], ['Timeline', 'Mar 2022 — Oct 2023'], ['Platform', 'Mobile app'], ['Status', 'Private product']],
    tldr: { problem: 'Onboarding and checkout — the two highest-stakes moments — needed to be clear and easy to finish.', approach: 'I mapped journeys, rebuilt both flows around fewer steps and created a design system for every screen and state.', outcome: 'Redesigned flows and a design system used across the app.' },
    overview: ['I worked across the full lifecycle of a mobile-first fashion app — journey mapping, high-fidelity UI, the design system and implementation support.'],
    role: 'Lead designer across the full lifecycle: journey mapping, high-fidelity UI, the design system and implementation support.',
    decisions: [{ title: 'Let product imagery carry the brand', text: 'In fashion the product is the interface, so layouts give imagery room and keep controls consistent.', image: '/images/creatifff.webp', caption: 'Creatifff app screens.' }],
    gallery: [],
    outcome: ['Redesigned onboarding and checkout, and a design system used across the app.'],
    reflection: ['Fashion e-commerce has to inspire, then get out of the way at checkout.'],
    tools: ['Figma', 'Design system', 'Mobile'],
  },

  /* ═══════════════════════════════ ANNYSHUB ═══════════════════════════════ */
  {
    slug: 'annyshub',
    group: 'web',
    title: 'AnnySHub',
    tagline: 'A jewellery storefront and owner console for a Lagos business that sells through WhatsApp.',
    category: 'Retail · Dual interface',
    accent: '#DB2777',
    cover: `${V}/annyshub.webp`,
    live: 'https://www.annyshub.store/',
    facts: [['Role', 'Lead Designer & developer'], ['Type', 'Storefront + admin'], ['Platform', 'Responsive web'], ['Market', 'Nigeria · nationwide']],
    tldr: { problem: 'A WhatsApp-first business needed a storefront that builds trust without forcing an unfamiliar checkout.', approach: 'I designed the site around the existing habit — browse beautifully, then order via a personal chat — plus an owner console.', outcome: 'A live storefront and catalogue console turning browsing into WhatsApp orders.' },
    overview: ['AnnySHub sells curated jewellery to Nigerian women. The site fits how customers already buy — through a conversation.'],
    role: 'I designed and built the storefront and the owner’s console.',
    decisions: [
      { title: 'Answer the three worries', text: 'Real photos, personal WhatsApp ordering and delivery costs shown upfront.', image: `${C}/annyshub-confidence.webp`, caption: 'Shop with confidence.' },
      { title: 'Browse by category', text: 'Necklaces, watches, bracelets and sets as visual entry points.', image: `${C}/annyshub-categories.webp`, caption: 'Find your perfect piece.' },
    ],
    gallery: [{ src: `${C}/annyshub-order.webp`, caption: 'Order directly — no stress, no surprises.' }],
    outcome: ['A live storefront and owner console with nationwide delivery.'],
    reflection: ['The best flow is sometimes the one customers already use.'],
    tools: ['Figma', 'HTML', 'CSS', 'JavaScript'],
  },

  /* ═══════════════════════════════ FOLU ATELIER ═══════════════════════════════ */
  {
    slug: 'folu-atelier',
    group: 'web',
    title: 'Folu Atelier',
    tagline: 'A luxury Lagos fashion house online — a customer-facing House and an owner-facing Studio.',
    category: 'Luxury fashion · Brand',
    accent: '#EAB308',
    cover: `${V}/folu.webp`,
    live: 'https://folu-atelier.vercel.app/',
    facts: [['Role', 'Lead Designer & developer'], ['Type', 'Brand site + owner studio'], ['Platform', 'Responsive web'], ['Market', 'Lagos · bespoke']],
    tldr: { problem: 'Made-to-measure fashion can’t be sold through a cart — it needs presence and a conversation.', approach: 'I designed a house, not a shop: collections by occasion, pricing on request and fittings as the primary action.', outcome: 'A live brand site and owner studio routing interest to fittings.' },
    overview: ['Folu Atelier dresses Lagos women for bespoke, native, bridal and owambe moments.'],
    role: 'I designed and built the House and the Studio.',
    decisions: [
      { title: 'Browse by moment', text: 'Collections grouped by occasion — the way clients actually think.', image: `${C}/folu-collection.webp`, caption: 'Latest from the house.' },
      { title: 'A house, not a shop', text: 'Two actions — view the collection or book a fitting — the way a client is welcomed in person.', image: `${C}/folu-home.webp`, caption: 'Home.' },
    ],
    gallery: [{ src: `${C}/folu-occasions.webp`, caption: 'Dressed for every moment.' }, { src: `${C}/folu-atelier.webp`, caption: 'The atelier story.' }],
    outcome: ['A live brand site and owner studio.'],
    reflection: ['Luxury is mostly restraint.'],
    tools: ['Figma', 'HTML', 'CSS', 'JavaScript'],
  },

  /* ═══════════════════════════════ OLUWAKEMI ═══════════════════════════════ */
  {
    slug: 'oluwakemi',
    group: 'web',
    title: 'Oluwakemi Alex',
    tagline: 'A quiet-luxury editorial portfolio for a virtual assistant — calm, credible and built to win remote roles.',
    category: 'Portfolio · Web',
    accent: '#EF4444',
    cover: `${V}/oluwakemi.webp`,
    live: 'https://oluwakemi-alex-portfolio.vercel.app/',
    facts: [['Role', 'Lead Designer & developer'], ['Type', 'Personal brand site'], ['Platform', 'Responsive web'], ['Pages', '5']],
    tldr: { problem: 'A support professional’s value is hard to make tangible to remote hiring managers.', approach: 'A one-line promise, four owned services and proof from past roles.', outcome: 'A live five-page site with an animation layer.' },
    overview: ['Oluwakemi supports founders and remote teams with inboxes, calendars, recruitment, content and admin.'],
    role: 'I designed and built the full site, including its animation layer.',
    decisions: [
      { title: 'Services as ownership', text: '“What I take off your plate” frames each service as responsibility transferred.', image: `${C}/oluwakemi-services.webp`, caption: 'Services.' },
      { title: 'Proof, not promises', text: 'Results from previous roles as large, scannable numbers.', image: `${C}/oluwakemi-proof.webp`, caption: 'Results.' },
    ],
    gallery: [{ src: `${C}/oluwakemi-mobile.webp`, mobile: true, caption: 'Mobile home.' }],
    outcome: ['A live, five-page portfolio site.'],
    reflection: ['Positioning first; every section followed from the promise.'],
    tools: ['Figma', 'HTML', 'CSS', 'JavaScript'],
  },

  /* ═══════════════════════════════ THIS PORTFOLIO ═══════════════════════════════ */
  {
    slug: 'portfolio',
    group: 'web',
    title: 'This portfolio',
    tagline: 'Designed and built in React — a portfolio that behaves like a product.',
    category: 'Web · Design + build',
    accent: '#6AA6FF',
    cover: '/images/alex-portfolio.webp',
    live: '/',
    liveLabel: 'You are here',
    facts: [['Role', 'Lead Designer & developer'], ['Stack', 'React · Motion · Vite'], ['Platform', 'Responsive web'], ['Accessibility', 'Keyboard · reduced motion']],
    tldr: { problem: 'A portfolio has to be memorable without slowing a recruiter down.', approach: 'A design system, real case studies and motion that always respects reduced-motion settings.', outcome: 'The site you are reading.' },
    overview: ['A React application with a deliberate system: deep navy, electric blue, serif-italic emphasis and light paper panels.'],
    role: 'I designed, wrote and built the site.',
    gallery: [],
    outcome: ['The site you are reading.'],
    reflection: ['Designing for myself forced me to make the same cuts I ask clients to make.'],
    tools: ['React', 'Motion', 'Vite', 'Figma'],
  },
];

export const caseBySlug = Object.fromEntries(cases.map((c) => [c.slug, c]));
export const caseGroups = {
  featured: cases.filter((c) => c.group === 'featured'),
  product: cases.filter((c) => c.group === 'product'),
  web: cases.filter((c) => c.group === 'web'),
};
