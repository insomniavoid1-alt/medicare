const assert = require('node:assert/strict');

const baseUrl = (process.env.SEO_PREVIEW_URL || 'https://seo-encinitas-local-landing.medicare-6pj.pages.dev').replace(/\/$/, '');
const canonical = 'https://findtherightplan.com/';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function get(path) {
  const response = await fetch(baseUrl + path, {
    headers: { 'user-agent': 'MedicareCrawlerValidation/1.0' },
    signal: AbortSignal.timeout(10000)
  });
  assert.equal(response.status, 200, baseUrl + path + ' returns HTTP 200 (got ' + response.status + ')');
  return response.text();
}

async function verify() {
  const html = await get('/');
  const encinitasHtml = await get('/medicare-broker-encinitas.html');
  const carlsbadHtml = await get('/medicare-broker-carlsbad.html');
  const robots = await get('/robots.txt');
  const sitemap = await get('/sitemap.xml');

  assert.match(html, /<link\b[^>]*rel=["']canonical["'][^>]*href=["']https:\/\/findtherightplan\.com\/["'][^>]*>/i,
    'preview HTML exposes the production canonical URL');
  assert.match(html, /<title>\s*[^<]+\s*<\/title>/i, 'preview HTML has a non-empty title');
  assert.match(html, /<meta\b[^>]*name=["']description["'][^>]*content=["'][^"']+["'][^>]*>/i,
    'preview HTML has a non-empty meta description');

  const blocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  assert.equal(blocks.length, 1, 'preview HTML exposes exactly one JSON-LD block');
  const data = JSON.parse(blocks[0][1]);
  assert.equal(data['@context'], 'https://schema.org', 'live JSON-LD uses Schema.org');
  assert.ok(Array.isArray(data['@graph']), 'live JSON-LD graph is present');
  const website = data['@graph'].find(item => item['@type'] === 'WebSite');
  const person = data['@graph'].find(item => item['@type'] === 'Person');
  assert.ok(website && person, 'live JSON-LD contains WebSite and Person entities');
  assert.equal(website.url, canonical, 'live WebSite entity uses the production canonical');
  assert.equal(website.publisher?.['@id'], person['@id'], 'live publisher points to the declared Person entity');
  assert.equal(person.name, 'Michael Dovsky', 'live Person entity identifies Michael Dovsky');
  assert.equal(person.jobTitle, 'Independent Medicare Broker', 'live Person entity identifies the broker role');
  assert.equal(person.areaServed?.name, 'California', 'live Person entity identifies California service area');

  assert.match(robots, /User-agent:\s*\*/i, 'live robots.txt includes a wildcard crawler rule');
  assert.match(robots, /User-agent:\s*\*[\s\S]*?Allow:\s*\//i, 'live robots.txt permits public paths');
  assert.ok(robots.includes('Sitemap: ' + canonical + 'sitemap.xml'), 'live robots.txt declares the production sitemap');

  assert.match(sitemap, /<urlset\b[^>]*xmlns=["']http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["'][^>]*>/i,
    'live sitemap uses the standard sitemap namespace');
  const urls = [...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(match => match[1].trim());
  assert.ok(urls.includes(canonical), 'live sitemap contains the canonical homepage');
  const encinitasUrl = canonical + 'medicare-broker-encinitas.html';
  assert.ok(urls.includes(encinitasUrl), 'live sitemap contains the Encinitas landing page');
  assert.match(encinitasHtml, /<link rel=["']canonical["'] href=["']https:\/\/findtherightplan\.com\/medicare-broker-encinitas\.html["']/i, 'live Encinitas page has its own canonical URL');
  assert.match(encinitasHtml, /<title>\s*Medicare Broker in Encinitas, CA\s*\|\s*Find the Right Plan\s*<\/title>/i, 'live Encinitas page has a local title');
  const localBlocks = [...encinitasHtml.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  assert.equal(localBlocks.length, 1, 'live Encinitas page exposes one JSON-LD block');
  const localData = JSON.parse(localBlocks[0][1]);
  assert.ok(localData['@graph']?.some(item => item['@type'] === 'Service' && item.areaServed?.name === 'Encinitas'), 'live Encinitas structured data identifies its service area');

  const carlsbadUrl = canonical + 'medicare-broker-carlsbad.html';
  assert.ok(urls.includes(carlsbadUrl), 'live sitemap contains the Carlsbad landing page');
  assert.match(carlsbadHtml, /<link rel=["']canonical["'] href=["']https:\/\/findtherightplan\.com\/medicare-broker-carlsbad\.html["']/i, 'live Carlsbad page has its own canonical URL');
  assert.match(carlsbadHtml, /<title>\s*Medicare Broker in Carlsbad, CA\s*\|\s*Find the Right Plan\s*<\/title>/i, 'live Carlsbad page has a local title');
  const carlsbadBlocks = [...carlsbadHtml.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  assert.equal(carlsbadBlocks.length, 1, 'live Carlsbad page exposes one JSON-LD block');
  const carlsbadData = JSON.parse(carlsbadBlocks[0][1]);
  assert.ok(carlsbadData['@graph']?.some(item => item['@type'] === 'Service' && item.areaServed?.name === 'Carlsbad'), 'live Carlsbad structured data identifies its service area');
  assert.match(encinitasHtml, /href=["']\/medicare-broker-carlsbad\.html["']/, 'live Encinitas page links to Carlsbad');
  assert.match(carlsbadHtml, /href=["']\/medicare-broker-encinitas\.html["']/, 'live Carlsbad page links to Encinitas');
  assert.ok(encinitasHtml.includes('How should I check a plan if I use Scripps providers in Encinitas?'), 'live Encinitas page includes locally relevant provider-verification guidance');
  assert.ok(encinitasHtml.includes('Does my Encinitas neighborhood determine which Medicare plans I can choose?'), 'live Encinitas page explains service-area and ZIP-code relevance');
  assert.ok(carlsbadHtml.includes('What should Carlsbad residents verify about local doctors and facilities?'), 'live Carlsbad page includes locally relevant provider-verification guidance');
  assert.ok(carlsbadHtml.includes('What if my doctors are spread across Carlsbad and nearby cities?'), 'live Carlsbad page explains cross-city provider verification');
  assert.ok(encinitasHtml.includes('Birthday Rule?') && carlsbadHtml.includes('Birthday Rule?'), 'live city pages include California-specific Medigap timing guidance');
  assert.ok(encinitasHtml.includes('before leaving employer coverage?') && carlsbadHtml.includes('before leaving employer coverage?'), 'live city pages include employer coverage transition guidance');
  assert.ok((encinitasHtml.match(/href=["']\/#contact["']/g) || []).length >= 3, 'live Encinitas consultation links route to the homepage contact form');
  assert.ok((carlsbadHtml.match(/href=["']\/#contact["']/g) || []).length >= 3, 'live Carlsbad consultation links route to the homepage contact form');
  assert.ok(encinitasHtml.includes('href="tel:+17604216826"') && carlsbadHtml.includes('href="tel:+17604216826"'), 'live local pages have the broker click-to-call number');
  assert.ok(html.includes('id="lead-form"') && html.includes('id="lead-name"') && html.includes('id="lead-phone"') && html.includes('id="lead-email"'), 'live homepage has the consultation lead form and core contact fields');

  console.log('PASS live preview returns HTTP 200 for homepage, robots.txt, and sitemap.xml');
  console.log('PASS live HTML metadata and JSON-LD identify the canonical site and Michael Dovsky');
  console.log('PASS live robots.txt and sitemap.xml are consistent with the production domain');
}

(async () => {
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      await verify();
      return;
    } catch (error) {
      lastError = error;
      console.error('Live SEO verification attempt ' + attempt + '/6 failed: ' + error.message);
      if (attempt < 6) await wait(10000);
    }
  }
  console.error('Live SEO verification failed after 6 attempts.');
  console.error(lastError);
  process.exitCode = 1;
})();
