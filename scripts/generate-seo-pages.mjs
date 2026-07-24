import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const siteUrl = 'https://beyondthevisa.org';
const root = process.cwd();
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Beyond The Visa',
  alternateName: 'Beyond The Visa for Nurses',
  url: siteUrl,
  logo: `${siteUrl}/site-logo.png`,
  description: 'Relocation, exam preparation, and career planning support for internationally educated nurses and midwives.',
  email: 'support@beyondthevisa.org',
  founder: {
    '@type': 'Person',
    name: 'Beyond The Visa Team',
  },
  contactPoint: [{
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'support@beyondthevisa.org',
    areaServed: 'Worldwide',
    availableLanguage: ['English'],
  }],
  sameAs: [
    'https://www.linkedin.com/company/beyond-the-visa',
    'https://x.com/beyondthevisa',
    'https://www.instagram.com/beyondthevisa',
  ],
};

const globalLinks = [
  ['Home', '/'],
  ['Learn', '/learn.html'],
  ['Journey', '/journey.html'],
  ['Jobs', '/jobs.html'],
  ['Visa Hub', '/visa-hub.html'],
  ['Calculators', '/calculators.html'],
  ['Ask Zibur', '/ask-zibur.html'],
  ['Blog', '/blog/'],
  ['Search', '/search.html'],
  ['Contact', '/contact.html'],
];

const pages = [
  {
    path: 'learn.html',
    title: 'Learn for International Nurses | Beyond The Visa',
    description: 'Structured learning pathways for CBT, NCLEX, OSCE, IELTS, interview preparation, and drug calculations.',
    h1: 'Learning Pathways for Nurses Moving Abroad',
    intro: 'Use focused learning tracks with clear milestones for registration exams, interview readiness, and safe practice refreshers.',
    schema: ['WebPage', 'EducationalOrganization'],
    links: [['CBT', '/cbt.html'], ['NCLEX', '/nclex.html'], ['OSCE', '/osce.html'], ['IELTS', '/ielts.html'], ['Interview Preparation', '/interview-preparation.html']],
    faq: [
      ['Which exam should I prepare for first?', 'Start with the exam required by your destination regulator and registration stage.'],
      ['Does Beyond The Visa replace official guidance?', 'No. It supports preparation and planning; always verify with official authorities.'],
    ],
  },
  {
    path: 'journey.html',
    title: 'Nursing Relocation Journey Planner | Beyond The Visa',
    description: 'Plan every relocation stage: registration, tests, visa, travel, and settlement with a structured nursing journey checklist.',
    h1: 'Your Relocation Journey, Step by Step',
    intro: 'Track registration, immigration, and settlement tasks in an order that matches how internationally educated nurses move safely and efficiently.',
    schema: ['WebPage', 'HowTo'],
    links: [['Visa Hub', '/visa-hub.html'], ['Jobs', '/jobs.html'], ['Calculators', '/calculators.html'], ['Learn', '/learn.html']],
  },
  {
    path: 'jobs.html',
    title: 'Nursing Jobs Abroad Hub | Beyond The Visa',
    description: 'Find trusted pathways for UK, USA, and Canada nursing jobs abroad with practical screening and interview preparation guidance.',
    h1: 'Nursing Jobs Abroad',
    intro: 'Understand sponsorship expectations, role matching, and safe application workflows before accepting an offer.',
    schema: ['CollectionPage'],
    links: [['Interview Preparation', '/interview-preparation.html'], ['UK Nursing', '/knowledge/uk-nursing.html'], ['USA Nursing', '/knowledge/usa-nursing.html'], ['Canada Nursing', '/knowledge/canada-nursing.html']],
    faq: [
      ['How do I avoid recruitment scams?', 'Verify employers on official registries and never pay for guaranteed job offers.'],
      ['Do all countries use the same nursing registration process?', 'No. Each country and often each region has distinct registration and immigration requirements.'],
    ],
  },
  {
    path: 'visa-hub.html',
    title: 'Visa Hub for Nurses | Beyond The Visa',
    description: 'Visa and sponsorship guidance for international nurses, including route checks, evidence planning, and official source links.',
    h1: 'Visa Hub for International Nurses',
    intro: 'Prepare visa evidence confidently with a source-first workflow and country-specific checkpoints.',
    schema: ['WebPage'],
    links: [['Visa Guides', '/knowledge/visa-guides.html'], ['Journey', '/journey.html'], ['Ask Zibur', '/ask-zibur.html']],
  },
  {
    path: 'interview-preparation.html',
    title: 'Nursing Interview Preparation | Beyond The Visa',
    description: 'Prepare for nursing interviews abroad with structured STAR practice, scenario coaching, and role-specific preparation plans.',
    h1: 'Interview Preparation for International Nurses',
    intro: 'Strengthen communication, safety reasoning, and values-based examples with practical interview preparation workflows.',
    schema: ['WebPage', 'Product', 'Offer', 'HowTo'],
    links: [['Jobs', '/jobs.html'], ['Learn', '/learn.html'], ['Drug Calculations', '/knowledge/drug-calculations.html']],
    faq: [
      ['What interview format should I expect?', 'Most healthcare interviews combine values, scenario judgement, and role-fit questions.'],
      ['How should I structure examples?', 'Use STAR: situation, task, action, result, then add reflection for safer practice.'],
    ],
  },
  {
    path: 'calculators.html',
    title: 'Nursing Calculators and Planning Tools | Beyond The Visa',
    description: 'Drug calculation and relocation planning calculators for internationally educated nurses preparing for overseas practice.',
    h1: 'Calculators for Safe Practice and Relocation Planning',
    intro: 'Use calculation tools to improve dosing confidence and cost planners to budget migration stages responsibly.',
    schema: ['WebPage', 'WebApplication', 'SoftwareApplication'],
    links: [['Drug Calculations', '/knowledge/drug-calculations.html'], ['Journey', '/journey.html'], ['Visa Hub', '/visa-hub.html']],
  },
  {
    path: 'ask-zibur.html',
    title: 'Ask Zibur AI Nursing Relocation Assistant | Beyond The Visa',
    description: 'Ask Zibur for plain-language explanations of registration, exams, jobs, and visa steps for international nursing journeys.',
    h1: 'Ask Zibur',
    intro: 'Get answer-first guidance tailored to your nursing relocation context, then verify key decisions with official sources.',
    schema: ['WebPage', 'Person'],
    links: [['Journey', '/journey.html'], ['Learn', '/learn.html'], ['Visa Hub', '/visa-hub.html']],
  },
  {
    path: 'about.html',
    title: 'About Beyond The Visa | Nursing Relocation Platform',
    description: 'Beyond The Visa helps internationally educated nurses plan registration, exam preparation, relocation, and career transitions abroad.',
    h1: 'About Beyond The Visa',
    intro: 'Beyond The Visa is built to help nurses and midwives move from uncertainty to structured action across registration, exams, and relocation planning.',
    schema: ['AboutPage', 'Organization'],
    links: [['Contact', '/contact.html'], ['Privacy', '/privacy-policy.html'], ['Terms', '/terms-and-conditions.html']],
  },
  {
    path: 'contact.html',
    title: 'Contact Beyond The Visa | Support and Enquiries',
    description: 'Contact Beyond The Visa for support, partnerships, privacy requests, and nursing relocation enquiries.',
    h1: 'Contact Beyond The Visa',
    intro: 'Use this page for support, privacy requests, product feedback, and partnership discussions.',
    schema: ['ContactPage', 'Organization'],
    links: [['Privacy Policy', '/privacy-policy.html'], ['Terms and Conditions', '/terms-and-conditions.html']],
  },
  {
    path: 'osce.html',
    title: 'OSCE Preparation for Nurses | Beyond The Visa',
    description: 'OSCE preparation workflows for internationally educated nurses including station strategy, communication, and safety framing.',
    h1: 'OSCE Preparation',
    intro: 'Prepare for OSCE stations with a repeatable approach to assessment, communication, documentation, and escalation.',
    schema: ['WebPage', 'Course', 'CourseInstance'],
    links: [['OSCE Guide', '/knowledge/osce-preparation.html'], ['Learn', '/learn.html']],
  },
  {
    path: 'ielts.html',
    title: 'IELTS for Nurses Abroad | Beyond The Visa',
    description: 'IELTS Academic preparation guidance for nurses moving abroad, including score goals, planning, and practice structure.',
    h1: 'IELTS Preparation for Nurses',
    intro: 'Build an IELTS strategy aligned to regulator score requirements, test validity windows, and application timelines.',
    schema: ['WebPage', 'Course', 'CourseInstance'],
    links: [['IELTS Blog Category', '/blog/ielts.html'], ['Learn', '/learn.html']],
  },
  {
    path: 'search.html',
    title: 'Search Beyond The Visa Content',
    description: 'Search nursing relocation guides, exam preparation pages, visa resources, and blog content from Beyond The Visa.',
    h1: 'Search Site Content',
    intro: 'Use quick search to find guidance by exam, country, visa stage, or interview topic.',
    schema: ['SearchResultsPage', 'WebSite', 'SearchAction'],
    links: [['Blog', '/blog/'], ['Knowledge Hub', '/knowledge/visa-guides.html']],
    searchPage: true,
  },
  {
    path: 'privacy-policy.html',
    title: 'Privacy Policy | Beyond The Visa',
    description: 'Privacy policy for Beyond The Visa covering account data, platform usage, storage, and user rights.',
    h1: 'Privacy Policy',
    intro: 'This policy explains what information is processed, why it is used, and how users can request support for privacy rights.',
    schema: ['WebPage'],
    links: [['Terms and Conditions', '/terms-and-conditions.html'], ['Contact', '/contact.html']],
  },
  {
    path: 'terms-and-conditions.html',
    title: 'Terms and Conditions | Beyond The Visa',
    description: 'Terms and conditions for using Beyond The Visa learning, planning, and nursing relocation support services.',
    h1: 'Terms and Conditions',
    intro: 'These terms describe permitted use, limitations, and responsibilities for users of Beyond The Visa.',
    schema: ['WebPage'],
    links: [['Privacy Policy', '/privacy-policy.html'], ['Contact', '/contact.html']],
  },
  {
    path: 'cookie-policy.html',
    title: 'Cookie and Local Storage Policy | Beyond The Visa',
    description: 'Cookie and local storage policy for Beyond The Visa, including essential storage usage and user controls.',
    h1: 'Cookie and Local Storage Policy',
    intro: 'Beyond The Visa uses essential browser storage for secure sessions, preferences, and continuity of user progress.',
    schema: ['WebPage'],
    links: [['Privacy Policy', '/privacy-policy.html'], ['Terms and Conditions', '/terms-and-conditions.html']],
  },
];

const knowledgePages = [
  ['cbt-for-nurses', 'CBT for Nurses', 'CBT preparation strategies for nurses and midwives taking professional competence exams.'],
  ['nclex-preparation', 'NCLEX Preparation', 'NCLEX preparation roadmap for internationally educated nurses pursuing safe, exam-ready clinical reasoning.'],
  ['osce-preparation', 'OSCE Preparation', 'OSCE station preparation methods covering communication, prioritisation, escalation, and documentation.'],
  ['nursing-jobs-abroad', 'Nursing Jobs Abroad', 'Practical guide to screening nursing jobs abroad and matching opportunities to registration pathways.'],
  ['uk-nursing', 'UK Nursing', 'UK nursing pathway guide for registration, Test of Competence, sponsorship, and settlement planning.'],
  ['usa-nursing', 'USA Nursing', 'USA nursing route guide covering licensure, NCLEX, employer pathways, and immigration dependencies.'],
  ['canada-nursing', 'Canada Nursing', 'Canada nursing planning guide covering provincial licensing and immigration route alignment.'],
  ['visa-guides', 'Visa Guides for Nurses', 'Visa evidence planning and route verification guidance for internationally educated nurses.'],
  ['drug-calculations', 'Drug Calculations for Nurses', 'Drug calculation revision support for dosage, infusion rates, and safe numeracy practice.'],
  ['interview-preparation-guide', 'Interview Preparation Guide', 'Nursing interview preparation guide with STAR structure and scenario framing.'],
];

const blogCategories = [
  ['nclex', 'NCLEX'],
  ['cbt', 'CBT'],
  ['osce', 'OSCE'],
  ['nursing-careers', 'Nursing Careers'],
  ['visa', 'Visa'],
  ['ielts', 'IELTS'],
  ['study-tips', 'Study Tips'],
  ['jobs', 'Jobs'],
];

const blogPosts = [
  {
    path: 'blog/nclex-study-plan-for-international-nurses.html',
    title: 'NCLEX Study Plan for International Nurses',
    description: 'A practical NCLEX study plan framework for international nurses balancing registration timelines and safe exam preparation.',
    category: 'nclex',
    published: '2026-07-24',
  },
  {
    path: 'blog/osce-station-strategy-for-nurses.html',
    title: 'OSCE Station Strategy for Nurses',
    description: 'How to structure OSCE station responses with assessment order, communication priorities, and escalation signals.',
    category: 'osce',
    published: '2026-07-24',
  },
];

function absolute(pathname) {
  return pathname === '/' ? siteUrl : `${siteUrl}${pathname}`;
}

function breadcrumb(pathname, title) {
  const parts = pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  const trail = [{ name: 'Home', item: siteUrl }];
  if (parts.length) {
    let running = '';
    for (let i = 0; i < parts.length; i += 1) {
      running += `/${parts[i]}`;
      trail.push({
        name: i === parts.length - 1 ? title : parts[i].replace(/[-.]/g, ' '),
        item: absolute(running.endsWith('.html') || running.endsWith('/') ? running : `${running}/`),
      });
    }
  }
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: entry.item,
    })),
  };
}

function pageSchema(pathname, page) {
  const url = absolute(pathname);
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.h1,
      description: page.description,
      url,
      inLanguage: 'en-GB',
      isPartOf: absolute('/'),
      about: ['International nursing relocation', 'CBT', 'NCLEX', 'OSCE', 'IELTS'],
    },
    {
      '@context': 'https://schema.org',
      ...breadcrumb(pathname, page.h1),
    },
    organizationSchema,
  ];
  if (page.schema?.includes('WebSite') || page.schema?.includes('SearchAction')) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Beyond The Visa',
      url: siteUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/search.html?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    });
  }
  if (page.schema?.includes('EducationalOrganization')) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'EducationalOrganization',
      name: 'Beyond The Visa',
      url: siteUrl,
      logo: `${siteUrl}/site-logo.png`,
      description: 'Educational support platform for international nurses and midwives preparing for relocation and licensure exams.',
    });
  }
  if (page.faq?.length) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    });
  }
  if (page.schema?.includes('Course')) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: page.h1,
      description: page.description,
      provider: {
        '@type': 'EducationalOrganization',
        name: 'Beyond The Visa',
        url: absolute('/'),
      },
      hasCourseInstance: {
        '@type': 'CourseInstance',
        courseMode: 'online',
        instructor: { '@type': 'Organization', name: 'Beyond The Visa' },
      },
    });
  }
  if (page.schema?.includes('HowTo')) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: `${page.h1} workflow`,
      description: page.description,
      step: (page.links || []).map(([name, href], index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name,
        url: absolute(href),
      })),
    });
  }
  if (page.schema?.includes('SoftwareApplication')) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Beyond The Visa',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' },
    });
  }
  if (page.schema?.includes('WebApplication')) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: page.h1,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      browserRequirements: 'Requires JavaScript',
    });
  }
  if (page.schema?.includes('Article')) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: page.h1,
      description: page.description,
      author: { '@type': 'Organization', name: 'Beyond The Visa' },
      publisher: { '@type': 'Organization', name: 'Beyond The Visa' },
      mainEntityOfPage: url,
      inLanguage: 'en-GB',
    });
  }
  if (page.schema?.includes('Person')) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Zibur',
      jobTitle: 'AI Relocation Assistant',
      worksFor: { '@type': 'Organization', name: 'Beyond The Visa' },
      description: 'AI guide for nursing relocation and exam preparation context.',
    });
  }
  if (page.schema?.includes('Product')) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Nursing Interview Coaching',
      description: 'Structured interview preparation for internationally educated nurses.',
      brand: { '@type': 'Brand', name: 'Beyond The Visa' },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'GBP',
        price: '35',
        availability: 'https://schema.org/InStock',
        url,
      },
    });
  }
  return schema;
}

function renderPage(pathname, page) {
  const url = absolute(pathname);
  const title = page.title;
  const ldJson = JSON.stringify(pageSchema(pathname, page));
  const contentLinks = (page.links || [])
    .map(([name, href]) => `<li><a href="${href}">${name}</a></li>`)
    .join('');
  const faq = page.faq?.length
    ? `<section><h2>Frequently asked questions</h2>${page.faq.map(([q, a]) => `<article><h3>${q}</h3><p>${a}</p></article>`).join('')}</section>`
    : '';
  const searchSection = page.searchPage
    ? `<section><label for="q">Search term</label><input id="q" name="q" type="search" placeholder="e.g. NCLEX"><ul id="results"></ul></section>
<script>
const items=[
{name:'NCLEX Preparation',url:'/knowledge/nclex-preparation.html'},
{name:'CBT for Nurses',url:'/knowledge/cbt-for-nurses.html'},
{name:'Visa Guides',url:'/knowledge/visa-guides.html'},
{name:'Interview Preparation',url:'/interview-preparation.html'},
{name:'Jobs Abroad',url:'/jobs.html'},
{name:'Blog',url:'/blog/'}
];
const qInput=document.getElementById('q');
const results=document.getElementById('results');
const params=new URLSearchParams(location.search);
qInput.value=params.get('q')||'';
function render(){
  const q=qInput.value.trim().toLowerCase();
  const matches=items.filter(x=>x.name.toLowerCase().includes(q));
  results.innerHTML=matches.map(x=>'<li><a href="'+x.url+'">'+x.name+'</a></li>').join('')||'<li>No results yet. Try a broader keyword.</li>';
}
qInput.addEventListener('input',render);render();
</script>`
    : '';
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${page.description}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <meta name="google-site-verification" content="GOOGLE_SEARCH_CONSOLE_VERIFICATION_CODE">
  <meta name="msvalidate.01" content="BING_WEBMASTER_VERIFICATION_CODE">
  <link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="en-GB" href="${url}">
  <link rel="alternate" hreflang="x-default" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${page.description}">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="Beyond The Visa">
  <meta property="og:image" content="${absolute('/site-logo.png')}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${page.description}">
  <meta name="twitter:image" content="${absolute('/site-logo.png')}">
  <meta name="theme-color" content="#133e43">
  <meta name="msapplication-TileColor" content="#133e43">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" href="/site-logo.png" sizes="192x192">
  <link rel="apple-touch-icon" href="/site-logo.png">
  <link rel="preload" href="/seo-pages.css" as="style">
  <link rel="stylesheet" href="/seo-pages.css">
  <script type="application/ld+json">${ldJson}</script>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header>
    <div class="brand">
      <img src="/site-logo.png" alt="Beyond The Visa logo" width="72" height="72" loading="eager" decoding="async">
      <div><strong>Beyond The Visa</strong><span>Nurses and midwives moving abroad</span></div>
    </div>
    <nav aria-label="Primary navigation">
      ${globalLinks.map(([name, href]) => `<a href="${href}">${name}</a>`).join('')}
    </nav>
  </header>
  <main id="main">
    <h1>${page.h1}</h1>
    <p>${page.intro}</p>
    ${contentLinks ? `<section><h2>Explore related pages</h2><ul>${contentLinks}</ul></section>` : ''}
    ${faq}
    ${searchSection}
  </main>
  <footer>
    <nav aria-label="Footer navigation">
      <a href="/about.html">About</a>
      <a href="/contact.html">Contact</a>
      <a href="/privacy-policy.html">Privacy</a>
      <a href="/terms-and-conditions.html">Terms</a>
      <a href="/cookie-policy.html">Cookie</a>
      <a href="/blog/">Blog</a>
      <a href="/search.html">Search</a>
      <a href="/rss.xml">RSS</a>
      <a href="/sitemap.xml">Sitemap</a>
    </nav>
  </footer>
</body>
</html>`;
}

function renderBlogIndex() {
  return renderPage('/blog/', {
    title: 'Nursing Relocation Blog | Beyond The Visa',
    description: 'Articles on NCLEX, CBT, OSCE, visa planning, nursing careers, interview preparation, and study strategies.',
    h1: 'Beyond The Visa Blog',
    intro: 'Practical articles for internationally educated nurses navigating exams, relocation, and career progression.',
    links: [
      ...blogCategories.map(([slug, label]) => [label, `/blog/${slug}.html`]),
      ...blogPosts.map((post) => [post.title, `/${post.path}`]),
    ],
    schema: ['Blog'],
  });
}

function renderCategoryPage(slug, label) {
  const categoryPosts = blogPosts.filter((post) => post.category === slug);
  return renderPage(`/blog/${slug}.html`, {
    title: `${label} Articles | Beyond The Visa Blog`,
    description: `${label} resources for internationally educated nurses preparing for relocation and career progression.`,
    h1: `${label} Articles`,
    intro: `Explore ${label} articles focused on practical planning, safer preparation, and source-verified next steps.`,
    links: categoryPosts.map((post) => [post.title, `/${post.path}`]).concat([['Back to blog', '/blog/']]),
    schema: ['CollectionPage'],
  });
}

function renderPost(post) {
  const urlPath = `/${post.path}`;
  const canonical = absolute(urlPath);
  const ld = JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: post.published,
      dateModified: post.published,
      author: { '@type': 'Organization', name: 'Beyond The Visa' },
      publisher: { '@type': 'Organization', name: 'Beyond The Visa', logo: { '@type': 'ImageObject', url: absolute('/site-logo.png') } },
      mainEntityOfPage: canonical,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.description,
      inLanguage: 'en-GB',
      url: canonical,
    },
  ]);
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${post.title} | Beyond The Visa Blog</title>
  <meta name="description" content="${post.description}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <meta name="google-site-verification" content="GOOGLE_SEARCH_CONSOLE_VERIFICATION_CODE">
  <meta name="msvalidate.01" content="BING_WEBMASTER_VERIFICATION_CODE">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="en-GB" href="${canonical}">
  <link rel="alternate" hreflang="x-default" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${post.title} | Beyond The Visa Blog">
  <meta property="og:description" content="${post.description}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${absolute('/site-logo.png')}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${post.title} | Beyond The Visa Blog">
  <meta name="twitter:description" content="${post.description}">
  <meta name="twitter:image" content="${absolute('/site-logo.png')}">
  <link rel="manifest" href="/manifest.json">
  <link rel="preload" href="/seo-pages.css" as="style">
  <link rel="stylesheet" href="/seo-pages.css">
  <script type="application/ld+json">${ld}</script>
</head>
<body>
  <header><nav aria-label="Primary navigation"><a href="/">Home</a><a href="/learn.html">Learn</a><a href="/blog/">Blog</a></nav></header>
  <main>
    <article>
      <h1>${post.title}</h1>
      <p>${post.description}</p>
      <h2>Core strategy</h2>
      <p>Start with the official regulator blueprint, then map a weekly plan around weak domains, timed questions, and structured review.</p>
      <h2>Execution framework</h2>
      <p>Use active recall, spaced repetition, and reflective error logs. Revisit high-risk topics every week and check changes in official guidance.</p>
      <h2>Quality checks</h2>
      <p>Prioritise understanding over score-chasing: safe reasoning, escalation triggers, and documentation quality matter for real clinical practice.</p>
    </article>
    <p><a href="/blog/${post.category}.html">More ${post.category.toUpperCase()} articles</a></p>
  </main>
</body>
</html>`;
}

async function write(relativePath, content) {
  const fullPath = join(root, relativePath);
  const folder = fullPath.slice(0, fullPath.lastIndexOf('\\'));
  await mkdir(folder, { recursive: true });
  await writeFile(fullPath, content, 'utf8');
}

await write('seo-pages.css', `:root{--bg:#f5f3ed;--ink:#183034;--line:#d8dfdc;--brand:#133e43;--muted:#5d7073}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 Inter,system-ui,sans-serif}header,main,footer{max-width:980px;margin:0 auto;padding:16px}header{padding-top:22px}nav{display:flex;flex-wrap:wrap;gap:10px}nav a{color:var(--brand);font-weight:600;text-decoration:none}nav a:hover{text-decoration:underline}.brand{display:flex;align-items:center;gap:12px}.brand span{display:block;color:var(--muted)}main{background:#fff;border:1px solid var(--line);border-radius:18px;margin-bottom:20px}h1,h2,h3{font-family:Georgia,serif}ul{padding-left:18px}.skip{position:absolute;left:-9999px}.skip:focus{left:12px;top:10px;background:#fff;padding:8px}.notice{background:#f0f4f3;border-left:4px solid var(--brand);padding:10px}`);

for (const page of pages) {
  const pathname = `/${page.path}`;
  await write(page.path, renderPage(pathname, page));
}

const knowledgeLinks = knowledgePages.map(([itemSlug, itemLabel]) => [itemLabel, `/knowledge/${itemSlug}.html`]);
for (const [slug, label, description] of knowledgePages) {
  const path = `knowledge/${slug}.html`;
  await write(path, renderPage(`/${path}`, {
    title: `${label} | Beyond The Visa`,
    description,
    h1: label,
    intro: `${description} This landing page is designed for quick retrieval by search and AI assistants.`,
    schema: ['WebPage', 'Article'],
    links: [['Learn', '/learn.html'], ['Journey', '/journey.html'], ['Visa Hub', '/visa-hub.html'], ['Blog', '/blog/'], ...knowledgeLinks.filter(([_, href]) => href !== `/knowledge/${slug}.html`)],
    faq: [
      ['Who is this guide for?', 'Internationally educated nurses and midwives planning registration and relocation.'],
      ['How should this guide be used?', 'Use it as a planning framework, then verify every requirement with official sources.'],
    ],
  }));
}

await write('blog/index.html', renderBlogIndex());
for (const [slug, label] of blogCategories) {
  await write(`blog/${slug}.html`, renderCategoryPage(slug, label));
}
for (const post of blogPosts) {
  await write(post.path, renderPost(post));
}

console.log(`Generated ${pages.length + knowledgePages.length + blogCategories.length + blogPosts.length + 2} SEO pages and assets.`);
