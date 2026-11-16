/*
  Case studies.
  Written from (a) Alex's own case-study brief for Krent and Ajiroba and
  (b) a review of each live product, captured November 2026.
  Rule from the brief: describe what the screens show and the reasoning behind
  them; never invent research, interviews, usability findings or analytics.
  `quoteFrom` points at a testimonial in data/testimonials.js by name.
*/
const C = '/images/cases';

export const cases = [
  /* ─────────────────────────────── KRENT ─────────────────────────────── */
  {
    slug: 'krent',
    group: 'featured',
    title: 'Krent',
    tagline: 'Reworking a property platform around clarity — for renters, buyers, shortlet guests, hosts and agents.',
    category: 'PropTech · SaaS',
    cover: '/images/krent.webp',
    live: 'https://krent.space/',
    facts: [
      ['Role', 'End-to-end Product Designer'],
      ['Project', 'Product redesign'],
      ['Platform', 'Responsive web + mobile app'],
      ['Market', 'Nigeria · Lagos & Abuja'],
    ],
    overview: [
      'Krent is a Nigerian real-estate marketplace: one platform where people rent, buy or book a shortlet, and where property owners and agents list and manage what they offer. Listings carry verification, 3D tours and instant booking, and the platform also manages properties on behalf of owners.',
      'Unlike a new product, a redesign starts with something that already works for someone. My task was to understand what the existing experience was trying to do, find where its structure and presentation got in the way, and rebuild it into something more coherent — without losing the functionality people relied on.',
    ],
    role: 'I owned the redesign end to end: reviewing the existing experience, re-organising the key information and journeys, and translating the result into a consistent set of interface screens across web and mobile.',
    challenge: {
      question: 'How might we make Krent’s property experience clearer and easier to use, while keeping everything five very different user groups depend on?',
      needs: [
        ['Clarity', 'Make the purpose of each page — and the meaning of prices, terms and badges — obvious at a glance.'],
        ['Navigation', 'Let renters, buyers and shortlet guests reach their own path without guessing where things live.'],
        ['Decision support', 'Present property information so people can compare options and see the next action.'],
        ['Trust', 'In a market wary of fake listings, make verification visible rather than buried.'],
        ['Consistency', 'Replace one-off layouts with repeatable patterns that can scale with the catalogue.'],
      ],
    },
    approach: [
      ['Reviewed the existing experience', 'Walked the product as each user type, noting where content, navigation and key actions competed for attention.'],
      ['Prioritised by intent', 'Separated the three core intents — Rent, Shortlet and Buy — so each has its own entry point instead of one crowded catalogue.'],
      ['Restructured information', 'Gave every page one job, grouped property data into scannable blocks and made the primary action unmistakable.'],
      ['Designed the interface', 'Rebuilt hierarchy, spacing, typography and action visibility, carrying one component language across web and app.'],
      ['Reviewed as a journey', 'Checked screens as connected flows — search to listing to booking — rather than as isolated pages.'],
    ],
    decisions: [
      {
        title: 'Lead with the promise, then the search',
        text: 'The first screen states what makes Krent different — verified homes, real agents, 3D tours — and puts location and date search directly beneath it, so a visitor understands the offer and can act in the same glance.',
        image: `${C}/krent-mobile.webp`, mobile: true,
        caption: 'Mobile home: the “Verified Homes Only” promise sits above a two-field search.',
      },
      {
        title: 'Browse by place and budget, the way people actually search',
        text: 'Instead of a long filter form, curated tiles let people start from the neighbourhoods they know — Lekki, Victoria Island, Surulere, Yaba — or from a simple budget split. It turns a search problem into a recognition one.',
        image: `${C}/krent-areas.webp`,
        caption: 'Area and budget tiles as the first step into the catalogue.',
      },
      {
        title: 'Listing cards built for comparison',
        text: 'Every card follows the same order: photo with status badges (Top Listing, Instant Booking), price per day, title, location, reference, then bedrooms and bathrooms. A fixed rhythm means people compare like with like, and “3D Tour” and “Quick View” stay one tap away.',
        image: `${C}/krent-listings.webp`,
        caption: 'Shortlet listings: consistent card anatomy with trust badges up front.',
      },
      {
        title: 'Give owners a clear door in',
        text: 'Hosts and agents are users too. A dedicated “Turn your property into a money-making asset” path and a “Become a host” route keep supply-side journeys distinct from the renter’s experience.',
        image: `${C}/krent-home.webp`,
        caption: 'Desktop home with app download and owner entry point.',
      },
    ],
    gallery: [
      { src: `${C}/krent-about.webp`, caption: 'About section — the trust story told in plain language.' },
    ],
    outcome: [
      'The redesign produced a clearer structure for the parts of Krent in scope: separate paths for renting, shortlets and buying; curated entry points by area and budget; a consistent listing card; and visible trust signals throughout.',
      'The platform is live at krent.space, where the experience can be explored today.',
    ],
    reflection: [
      'Krent taught me that a redesign is not a visual refresh. The biggest improvements came from deciding what each page is for and who it serves first — the visual polish only works once that structure is right.',
      'If I revisited it, I would pair the redesign with task-based testing for each user group, so the next round of changes is guided by measured evidence rather than review alone.',
    ],
    tools: ['Figma', 'Design system', 'Responsive web', 'Mobile app'],
  },

  /* ────────────────────────────── AJIROBA ────────────────────────────── */
  {
    slug: 'ajiroba',
    group: 'featured',
    title: 'Ajiroba',
    tagline: 'Designing a consumer raffle platform from the ground up — making an unfamiliar way to shop easy to understand.',
    category: 'Consumer · E-commerce',
    cover: '/images/ajiroba.webp',
    live: 'https://www.ajiroba.com/',
    facts: [
      ['Role', 'End-to-end Product Designer'],
      ['Project', 'New product · 0 → 1'],
      ['Timeline', 'Nov 2023 — Sep 2025'],
      ['Platform', 'Web + iOS & Android apps'],
    ],
    overview: [
      'Ajiroba is a consumer platform built around a raffle-based way to get products. People fund a wallet, buy low-cost tickets for the items they want, and a live draw picks a winner whose item is delivered to their door. Every draw is guaranteed a winner, and more tickets mean a better chance.',
      'That model is less familiar than a normal online store. So the experience had to do more than look appealing: it had to introduce the concept, explain how participation works and carry people through each step without uncertainty.',
    ],
    role: 'I owned the end-to-end design process — translating the proposition into a structured experience and a consistent interface across the website and mobile apps, and working with engineering through delivery.',
    challenge: {
      question: 'How might we make a raffle-led shopping experience feel clear and trustworthy to someone meeting it for the first time?',
      needs: [
        ['Comprehension', 'Explain what the platform offers and exactly how participation works.'],
        ['Discoverability', 'Help people find products and understand the information about each one.'],
        ['Confidence', 'Make prices, rules and progress understandable before anyone commits money.'],
        ['Continuity', 'Make every screen point clearly to the next step.'],
        ['Consistency', 'Create one visual and interaction language that scales to new products and campaigns.'],
      ],
    },
    approach: [
      ['Framed the product', 'Worked out what a first-time visitor must know, what helps them judge a product and which actions the platform must make easy.'],
      ['Structured around questions', 'Ordered the experience around the questions people actually have: What is this? What can I win? How does it work? What do I do next?'],
      ['Designed the journey', 'Mapped wallet top-up → ticket → draw → win, with the feedback each step needs.'],
      ['Built the visual system', 'Bold, high-contrast product imagery and a warm orange palette, with clear emphasis on price and the primary action.'],
      ['Systemised for scale', 'Repeated patterns across web and app so new draws, products and campaigns slot in without new design work.'],
    ],
    decisions: [
      {
        title: 'Sell the price, not the mechanic',
        text: 'The hero leads with the most compelling fact — a ticket for as little as ₦200 — paired with real products people want. The raffle concept is introduced only after the value is clear.',
        image: `${C}/ajiroba-home.webp`,
        caption: '“Buy ticket & win for as low as ₦200” — value first.',
      },
      {
        title: 'Explain the model in three steps',
        text: 'Ticket, Raffle Draw, Win. A short numbered sequence with plain-language descriptions answers “how does this work?” before it becomes a reason to leave.',
        image: `${C}/ajiroba-how.webp`,
        caption: 'Key attributes and the three-step “How it works”.',
      },
      {
        title: 'Make the app a first-class path',
        text: 'Repeat participation happens on mobile, so the “Why Ajiroba?” story is told alongside the app itself, with store links placed where intent is highest.',
        image: `${C}/ajiroba-why.webp`,
        caption: 'Brand story beside the mobile app screens.',
      },
      {
        title: 'One system, every screen size',
        text: 'Navigation reduces to the essentials — Home, Raffle Draw, Recharge, Account, Help — so the same mental model works on a phone as on desktop.',
        image: `${C}/ajiroba-mobile.webp`, mobile: true,
        caption: 'Mobile web keeps the same hierarchy and actions.',
      },
    ],
    gallery: [],
    outcome: [
      'Ajiroba went from proposition to a live product: a website and mobile apps where people can explore draws, fund a wallet, buy tickets and follow live raffles through to delivery.',
      'The interface patterns established here also carried into Ajiroba’s marketing campaigns, including the Spin & Win giveaway.',
    ],
    quoteFrom: 'Oloruntoba Ayodele',
    reflection: [
      'Ajiroba showed me how much of product design is designing for understanding. When the model is unfamiliar, the interface has to explain the value and the mechanics at the same time — and earn trust before asking for money.',
      'Revisiting it, I would invest earlier in a clearer post-draw experience — what happens if you don’t win this time — because that moment decides whether people come back.',
    ],
    tools: ['Figma', 'Design system', 'Web', 'iOS & Android'],
  },

  /* ───────────────────────────── PAYTRACKR ───────────────────────────── */
  {
    slug: 'paytrackr',
    group: 'featured',
    title: 'Paytrackr',
    tagline: 'A finance dashboard for freelancers and small businesses — designed so money questions have instant answers.',
    category: 'Fintech · Dashboard',
    cover: '/images/paytrackr.webp',
    live: 'https://paytrackr-invoice.vercel.app/',
    facts: [
      ['Role', 'Product Designer'],
      ['Project', 'Invoicing & payments dashboard'],
      ['Platform', 'Responsive web app'],
      ['Focus', 'Information hierarchy · flows'],
    ],
    overview: [
      'Paytrackr helps people who bill clients keep track of money: invoices sent, what has been paid, what is pending and what is overdue, alongside a balance summary and earnings by category.',
      'Financial products ask people to make decisions under some pressure. When an interface adds confusion on top of that, confidence drops — so the work focused on hierarchy and on reducing the number of decisions per step.',
    ],
    role: 'I designed the product experience — information architecture, dashboard hierarchy, the invoicing flows and the responsive interface — and prepared the handoff for build.',
    challenge: {
      question: 'How might we make the state of someone’s money readable in seconds, and the next action obvious?',
      needs: [
        ['At-a-glance status', 'Show paid, pending and overdue as the first thing on the dashboard.'],
        ['Fewer decisions', 'Surface only what is needed at each step of creating or chasing an invoice.'],
        ['Trust', 'Use calm, consistent visuals so financial data never feels alarming or ambiguous.'],
      ],
    },
    approach: [
      ['Defined the core questions', 'What am I owed? What came in? What needs chasing? Each became a dashboard module.'],
      ['Built the hierarchy', 'Status totals first, then balance and invoice summaries, then category breakdowns.'],
      ['Simplified the flows', 'Reduced multi-step invoice tasks to a short, linear sequence.'],
      ['Designed responsively', 'Kept the same priorities on mobile, where people check payments most.'],
    ],
    decisions: [
      {
        title: 'Status totals lead the dashboard',
        text: 'Paid, pending and overdue sit in one row with colour-coded tags, so the most important answer — “what’s my position?” — needs no clicks.',
        image: '/images/paytrackr.webp',
        caption: 'Dashboard: status totals, balance summary, invoice summary and earning categories.',
      },
      {
        title: 'A quiet, focused entry',
        text: 'Sign-in is a single, uncluttered card with one green action, setting the calm tone the rest of the product keeps.',
        image: `${C}/paytrackr-signin.webp`,
        caption: 'Sign-in screen of the live app.',
      },
    ],
    gallery: [{ src: `${C}/paytrackr-mobile.webp`, mobile: true, caption: 'Mobile sign-in.' }],
    outcome: [
      'The design was delivered as a complete responsive product with a handoff package, and the app is live behind sign-in at the link below.',
    ],
    reflection: [
      'Paytrackr reinforced that in finance, hierarchy is the feature. Getting the order of information right did more for clarity than any visual flourish.',
    ],
    tools: ['Figma', 'Prototyping', 'Responsive web'],
  },

  /* ───────────────────────────── MEALFLEX ────────────────────────────── */
  {
    slug: 'mealflex',
    group: 'product',
    title: 'Mealflex',
    tagline: 'A mobile-first food ordering app for young Africans — from discovery to doorstep.',
    category: 'FoodTech · Mobile app',
    cover: '/images/mealflex.webp',
    live: 'https://www.behance.net/gallery/231847479/Meal-Flex',
    liveLabel: 'View on Behance',
    facts: [
      ['Role', 'Product Designer'],
      ['Project', 'Mobile app design'],
      ['Platform', 'iOS & Android'],
      ['Scope', 'Discovery · ordering · tracking'],
    ],
    overview: [
      'Mealflex is a food ordering app aimed at young Africans: find restaurants, choose meals, check out and follow the order in real time.',
      'The design goal was to remove unnecessary decision points between “I’m hungry” and “order placed”, while keeping the browsing experience enjoyable.',
    ],
    role: 'I designed the app experience end to end — information architecture, the browse-to-checkout flow, order tracking and the visual interface.',
    challenge: {
      question: 'How might we get someone from craving to confirmed order with as few decisions as possible?',
      needs: [
        ['Fast discovery', 'Help people find restaurants and dishes quickly.'],
        ['Short checkout', 'Remove steps that don’t help the decision.'],
        ['Reassurance', 'Make order status visible after paying.'],
      ],
    },
    approach: [
      ['Mapped the journey', 'Browse, choose, customise, pay, track — then removed what didn’t serve the decision.'],
      ['Designed the catalogue', 'Image-led menus with clear prices and add-to-cart actions.'],
      ['Designed tracking', 'Real-time status so people know what is happening after paying.'],
    ],
    decisions: [
      {
        title: 'Image-led catalogue',
        text: 'Food is chosen with the eyes, so dishes lead with photography, with price and the add action anchored in the same place on every card.',
        image: '/images/mealflex.webp',
        caption: 'Catalogue and ordering screens.',
      },
    ],
    gallery: [],
    outcome: ['A complete mobile app design covering discovery, checkout and real-time order tracking, presented in full on Behance.'],
    reflection: ['Designing for appetite means designing for speed — every extra tap is a reason to close the app.'],
    tools: ['Figma', 'Prototyping', 'Mobile'],
  },

  /* ───────────────────────────── CREATIFFF ───────────────────────────── */
  {
    slug: 'creatifff',
    group: 'product',
    title: 'Creatifff',
    tagline: 'Mobile-first fashion e-commerce — onboarding and checkout redesigned around clarity.',
    category: 'Fashion · E-commerce',
    cover: '/images/creatifff.webp',
    live: 'https://www.behance.net/gallery/236775971/Creatifff-Ecommerce',
    liveLabel: 'View on Behance',
    facts: [
      ['Role', 'Product Designer'],
      ['Timeline', 'Mar 2022 — Oct 2023'],
      ['Platform', 'Mobile app'],
      ['Status', 'Private product'],
    ],
    overview: [
      'Creatifff is a mobile-first fashion e-commerce app. I worked across the full design lifecycle — from journey mapping through high-fidelity UI, the design system and implementation support.',
      'The product itself is private, so this case study focuses on the design work shown on Behance.',
    ],
    role: 'Product Designer across the full lifecycle: journey mapping, onboarding and checkout flows, the design system and close collaboration with engineering.',
    challenge: {
      question: 'How might we make the two highest-stakes moments in fashion e-commerce — onboarding and checkout — clear and easy to complete?',
      needs: [
        ['Onboarding', 'Get new shoppers to value quickly.'],
        ['Checkout', 'Make the path to purchase short and predictable.'],
        ['Consistency', 'One design system across every screen and state.'],
      ],
    },
    approach: [
      ['Mapped journeys', 'Identified where the experience most needed to be clear.'],
      ['Redesigned key flows', 'Onboarding and checkout rebuilt around fewer, clearer steps.'],
      ['Built the system', 'A component library keeping every screen and state consistent.'],
      ['Supported the build', 'Worked with engineering through implementation.'],
    ],
    decisions: [
      {
        title: 'Product imagery carries the brand',
        text: 'In fashion the product is the interface, so layouts give imagery room and keep controls quiet and consistent.',
        image: '/images/creatifff.webp',
        caption: 'Creatifff app screens.',
      },
    ],
    gallery: [],
    outcome: ['Redesigned onboarding and checkout flows and a design system used across the mobile app.'],
    quoteFrom: null,
    reflection: ['Fashion e-commerce is emotional and practical at once — the design has to inspire and then get out of the way at checkout.'],
    tools: ['Figma', 'Design system', 'Mobile'],
  },

  /* ─────────────────────────── LEDGER STUDIO ─────────────────────────── */
  {
    slug: 'ledger-studio',
    group: 'product',
    title: 'Ledger Studio',
    tagline: 'An invoicing product that turns client billing into a two-minute ritual — designed and built by me.',
    category: 'SaaS · Design + build',
    cover: '/images/ledger-studio.webp',
    live: 'https://ledger-studio-pi.vercel.app/',
    facts: [
      ['Role', 'Designer & front-end developer'],
      ['Project', 'Product, 0 → 1'],
      ['Platform', 'Responsive web app'],
      ['Stack', 'Client-side · no backend'],
    ],
    overview: [
      'Ledger Studio is an invoice generator for designers, developers, studios and small businesses. You set up your studio once — logo, company details, bank details — and every invoice after that is pre-filled, branded and ready to send as a PDF or a shareable link.',
      'It is also a demonstration of what happens when design thinking goes all the way into working code, rather than stopping at a Figma file.',
    ],
    role: 'I designed and built the whole product: positioning, information architecture, the invoice editor, the dashboard and the marketing site.',
    challenge: {
      question: 'How might we make sending a professional invoice take minutes, not an afternoon in a spreadsheet?',
      needs: [
        ['Set up once', 'Remember brand and bank details so nothing is typed twice.'],
        ['Look professional', 'Every invoice should look like it came from a serious studio.'],
        ['Know where you stand', 'Show what is paid and what is outstanding at a glance.'],
      ],
    },
    approach: [
      ['Defined the job', 'Strip invoicing down to what is needed to get paid sooner.'],
      ['Designed a four-step flow', 'Set up studio → add client → list the work → send or print.'],
      ['Built it', 'A client-side app with PDF export, shareable read-only links, six currencies and light/dark modes.'],
    ],
    decisions: [
      {
        title: 'Show the product in the first screen',
        text: 'The hero pairs the promise with a real invoice preview and a “Payment received” confirmation, so visitors see the result before reading a feature list.',
        image: `${C}/ledger-home.webp`,
        caption: '“Invoices worthy of the work you do.”',
      },
      {
        title: 'Features framed as outcomes',
        text: '“Your brand, remembered”, “Bank details built in”, “Share with a link” — each feature is phrased as the benefit it delivers.',
        image: `${C}/ledger-features.webp`,
        caption: 'Feature list written as benefits.',
      },
      {
        title: 'A four-step mental model',
        text: 'The whole product is explained as four steps, and the app mirrors that order, so there is nothing new to learn after the landing page.',
        image: `${C}/ledger-steps.webp`,
        caption: 'From blank page to sent invoice, in four steps.',
      },
      {
        title: 'One calm screen for the whole picture',
        text: 'The dashboard groups revenue, outstanding and paid with a filterable invoice list, so the money question has one place to live.',
        image: `${C}/ledger-dashboard.webp`,
        caption: 'Dashboard overview.',
      },
    ],
    gallery: [{ src: `${C}/ledger-mobile.webp`, mobile: true, caption: 'Mobile landing page.' }],
    outcome: ['A live, free product with branded invoices, PDF export, shareable links, six currencies and light and dark modes.'],
    reflection: ['Building my own design taught me where designs hide ambiguity — every unanswered edge case becomes a decision in code.'],
    tools: ['Figma', 'HTML', 'CSS', 'JavaScript'],
  },

  /* ─────────────────────────── SPIN & WIN ────────────────────────────── */
  {
    slug: 'spin-and-win',
    group: 'product',
    title: 'Ajiroba Spin & Win',
    tagline: 'A campaign microsite designed to feel official and safe in a market wary of online giveaways.',
    category: 'Campaign · Web',
    cover: '/images/spin-and-win.webp',
    live: 'https://campaign.ajiroba.com/',
    facts: [
      ['Role', 'Product Designer'],
      ['Project', 'Campaign microsite'],
      ['Platform', 'Responsive web'],
      ['Status', 'Live campaign'],
    ],
    overview: [
      'Spin & Win is a promotional giveaway for Ajiroba’s community: spin a wheel for a chance to win rewards, redeemed through Ajiroba’s verified support channel.',
      'Online giveaways are often met with suspicion, so the design challenge was less about the wheel and more about trust.',
    ],
    role: 'I designed the campaign experience — page structure, trust content and the participation flow — within the Ajiroba design system.',
    challenge: {
      question: 'How might we make a giveaway feel legitimate enough that people are comfortable taking part?',
      needs: [
        ['Legitimacy', 'Show this is an official campaign from a real company.'],
        ['Simplicity', 'One clear action to participate.'],
        ['Reassurance', 'Explain how winners are verified and how data is used.'],
      ],
    },
    approach: [
      ['Led with one action', '“Start Now” is the only primary action on the page.'],
      ['Designed for trust', 'An official-campaign notice, a message from the CEO and four trust pillars.'],
      ['Closed the loop', '24/7 WhatsApp support and a plain privacy statement.'],
    ],
    decisions: [
      {
        title: 'Put a real person behind the campaign',
        text: 'A message from Ajiroba’s CEO, with photo and title, turns an anonymous promotion into a company speaking to its community.',
        image: `${C}/spin-home.webp`,
        caption: 'Official-campaign notice and CEO message.',
      },
      {
        title: 'Answer the doubts before they’re asked',
        text: 'Secure & Official, Verified Winners, Community First, Real Rewards — four short pillars address the reasons people hesitate.',
        image: `${C}/spin-trust.webp`,
        caption: 'Trust pillars.',
      },
    ],
    gallery: [{ src: `${C}/spin-mobile.webp`, mobile: true, caption: 'Mobile campaign page.' }],
    outcome: ['A live campaign site, consistent with the Ajiroba product, built around a single action and visible trust signals.'],
    reflection: ['For promotions, trust is the conversion design. The wheel is the fun part; the reassurance is what gets people to it.'],
    tools: ['Figma', 'Web'],
  },

  /* ──────────────────────────── ANNYSHUB ─────────────────────────────── */
  {
    slug: 'annyshub',
    group: 'web',
    title: 'AnnySHub',
    tagline: 'A jewellery storefront and owner console for a Lagos business that sells through WhatsApp.',
    category: 'Retail · Dual interface',
    cover: '/images/annyshub.webp',
    live: 'https://www.annyshub.store/',
    facts: [
      ['Role', 'Designer & developer'],
      ['Project', 'Storefront + admin console'],
      ['Platform', 'Responsive web'],
      ['Market', 'Nigeria · nationwide delivery'],
    ],
    overview: [
      'AnnySHub sells curated jewellery to Nigerian women. The business already sold through WhatsApp conversations, so instead of forcing a conventional checkout, the website was designed to fit that behaviour: browse beautifully, then order through a personal WhatsApp chat.',
      'Behind the storefront, an admin console lets the owner manage the catalogue — two very different users, one product.',
    ],
    role: 'I designed and built both interfaces: the customer storefront and the owner’s catalogue console.',
    challenge: {
      question: 'How might we give a WhatsApp-first business a storefront that builds trust and still ends in a personal conversation?',
      needs: [
        ['Trust', 'Real photos, clear delivery costs and real reviews.'],
        ['Fit the habit', 'Make “Order via WhatsApp” the primary action, everywhere.'],
        ['Owner control', 'Let the owner update products without a developer.'],
      ],
    },
    approach: [
      ['Designed around the existing habit', 'WhatsApp ordering is the main call to action, repeated in the header, hero and closing section.'],
      ['Built confidence', '“Shop with confidence” addresses photos, ordering and delivery directly.'],
      ['Separated roles', 'A simple console for the owner, kept apart from the shopper experience.'],
    ],
    decisions: [
      {
        title: 'Answer the three worries',
        text: 'Real product photos, personal WhatsApp ordering and nationwide delivery with costs shown upfront — the three reasons people hesitate to buy jewellery online.',
        image: `${C}/annyshub-confidence.webp`,
        caption: '“Shop with confidence”.',
      },
      {
        title: 'Keep the order personal',
        text: 'The closing section explains exactly what happens after you message: confirmation, full price including delivery, and updates along the way.',
        image: `${C}/annyshub-order.webp`,
        caption: '“Order directly. No stress. No surprises.”',
      },
    ],
    gallery: [],
    outcome: ['A live storefront and owner console that turn browsing into WhatsApp orders, with delivery across Nigeria.'],
    reflection: ['The best e-commerce flow is sometimes the one the customer already uses. Designing around WhatsApp beat designing against it.'],
    tools: ['Figma', 'HTML', 'CSS', 'JavaScript'],
  },

  /* ─────────────────────────── FOLU ATELIER ─────────────────────────── */
  {
    slug: 'folu-atelier',
    group: 'web',
    title: 'Folu Atelier',
    tagline: 'A luxury Lagos fashion house online — a customer-facing House and an owner-facing Studio.',
    category: 'Luxury fashion · Brand',
    cover: '/images/folu-atelier.webp',
    live: 'https://folu-atelier.vercel.app/',
    facts: [
      ['Role', 'Designer & developer'],
      ['Project', 'Brand site + owner studio'],
      ['Platform', 'Responsive web'],
      ['Market', 'Lagos · bespoke fashion'],
    ],
    overview: [
      'Folu Atelier is a Lagos fashion house for bespoke, native, bridal and owambe dressing. Pieces are made to measure and priced on request, so the site is not a shop — it is a place to be seen and to start a conversation.',
      'The product has two parts: the House, where clients browse collections and book fittings, and the Studio, where the owner manages pieces.',
    ],
    role: 'I designed and built both the House and the Studio.',
    challenge: {
      question: 'How might we present made-to-measure fashion online so it feels as considered as the clothes — and turns interest into fittings?',
      needs: [
        ['Luxury presence', 'Editorial type, dark palette and gold accents.'],
        ['Browse by occasion', 'Bespoke, Native, Bridal, Owambe — how clients actually think.'],
        ['Clear next step', '“Book a fitting” and “Enquire” instead of “Add to cart”.'],
      ],
    },
    approach: [
      ['Set the tone', 'A high-contrast serif and restrained gold on near-black.'],
      ['Organised by moment', 'Collections grouped by occasion, with pricing “on request” or “by appointment”.'],
      ['Built the Studio', 'An owner login to manage the collection.'],
    ],
    decisions: [
      {
        title: 'A house, not a shop',
        text: 'The hero introduces the atelier, its specialisms and two actions — view the collection or book a fitting — the way a client would be welcomed in person.',
        image: `${C}/folu-home.webp`,
        caption: 'House home page.',
      },
    ],
    gallery: [{ src: `${C}/folu-mobile.webp`, mobile: true, caption: 'Mobile home.' }],
    outcome: ['A live brand site and owner studio presenting collections by occasion and routing interest to fittings and enquiries.'],
    reflection: ['Luxury is mostly restraint — fewer elements, more space, and the confidence not to sell too hard.'],
    tools: ['Figma', 'HTML', 'CSS', 'JavaScript'],
  },

  /* ───────────────────────────── OLUWAKEMI ───────────────────────────── */
  {
    slug: 'oluwakemi',
    group: 'web',
    title: 'Oluwakemi Alex',
    tagline: 'A quiet-luxury editorial portfolio for a virtual assistant — calm, credible and built to win remote roles.',
    category: 'Portfolio · Web',
    cover: '/images/oluwakemi.webp',
    live: 'https://oluwakemi-alex-portfolio.vercel.app/',
    facts: [
      ['Role', 'Designer & developer'],
      ['Project', 'Personal brand site'],
      ['Platform', 'Responsive web'],
      ['Pages', 'Home · About · Services · Experience · Contact'],
    ],
    overview: [
      'Oluwakemi is a virtual assistant supporting founders and remote teams with inbox and calendar management, recruitment support, social content and admin.',
      'Her site needed to communicate calm competence — the feeling of handing work to someone reliable — and make it easy for a hiring manager to start a conversation.',
    ],
    role: 'I designed and built the full site, including its animation layer.',
    challenge: {
      question: 'How might we make a support professional’s value tangible to someone hiring remotely?',
      needs: [
        ['Positioning', 'A clear one-line promise.'],
        ['Specific services', 'Four things she owns end to end.'],
        ['Proof', 'Concrete results from past roles.'],
      ],
    },
    approach: [
      ['Wrote the promise', '“The calm behind a busy desk.”'],
      ['Structured the offer', 'Four service areas, each with the tools and outputs involved.'],
      ['Added proof', 'A results section with outcomes from previous roles.'],
    ],
    decisions: [
      {
        title: 'Lead with a feeling, back it with services',
        text: 'The headline sells the outcome — calm — and the services section makes it concrete with four clearly owned areas.',
        image: `${C}/oluwakemi-home.webp`,
        caption: 'Home hero.',
      },
      {
        title: 'Services as ownership',
        text: '“What I take off your plate” frames each service as responsibility transferred, not tasks performed.',
        image: `${C}/oluwakemi-services.webp`,
        caption: 'Services.',
      },
      {
        title: 'Proof, not promises',
        text: 'Results from previous roles appear as large, scannable numbers.',
        image: `${C}/oluwakemi-proof.webp`,
        caption: 'Results section.',
      },
    ],
    gallery: [{ src: `${C}/oluwakemi-mobile.webp`, mobile: true, caption: 'Mobile home.' }],
    outcome: ['A live, five-page portfolio site with an editorial visual language and a full animation layer.'],
    reflection: ['A personal brand site is positioning first. Once the one-line promise was right, every section followed from it.'],
    tools: ['Figma', 'HTML', 'CSS', 'JavaScript'],
  },

  /* ──────────────────────────── THIS PORTFOLIO ───────────────────────── */
  {
    slug: 'portfolio',
    group: 'web',
    title: 'This portfolio',
    tagline: 'Designed and built in React — a portfolio that behaves like a product.',
    category: 'Web · Design + build',
    cover: '/images/alex-portfolio.webp',
    live: '/',
    liveLabel: 'You are here',
    facts: [
      ['Role', 'Designer & developer'],
      ['Stack', 'React · Motion · Vite'],
      ['Platform', 'Responsive web'],
      ['Accessibility', 'Keyboard, screen reader, reduced motion'],
    ],
    overview: [
      'My portfolio was rebuilt as a React application with a deliberate design system: a deep navy palette, an electric-blue accent, serif-italic emphasis and light “paper” panels that break up the page.',
      'It is meant to show product thinking and craft together — every interaction is designed, and every motion respects people who prefer reduced motion.',
    ],
    role: 'I designed, wrote and built the site.',
    challenge: {
      question: 'How might a portfolio feel memorable without getting in the way of the recruiter’s real job: understanding the work quickly?',
      needs: [
        ['Fast to scan', 'Clear hierarchy and real case studies.'],
        ['Memorable', 'An automatic intro, a signature logo and considered motion.'],
        ['Inclusive', 'Accessible navigation and reduced-motion support.'],
      ],
    },
    approach: [
      ['Built a system', 'Tokens for colour, type and spacing; reusable components.'],
      ['Designed motion with restraint', 'An automatic three-second intro, split-word reveals, tilt cards and page transitions — all disabled for reduced motion.'],
      ['Tested it', 'Automated checks for navigation, keyboard use and mobile layouts.'],
    ],
    decisions: [],
    gallery: [],
    outcome: ['The site you are reading.'],
    reflection: ['Designing for myself was the hardest brief: it forced me to make the same cuts I ask clients to make.'],
    tools: ['React', 'Motion', 'Vite', 'Figma'],
  },
];

export const caseBySlug = Object.fromEntries(cases.map((c) => [c.slug, c]));
export const caseGroups = {
  featured: cases.filter((c) => c.group === 'featured'),
  product: cases.filter((c) => c.group === 'product'),
  web: cases.filter((c) => c.group === 'web'),
};
