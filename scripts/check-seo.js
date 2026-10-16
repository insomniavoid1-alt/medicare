const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const encinitasHtml = fs.readFileSync(path.join(root, 'medicare-broker-encinitas.html'), 'utf8');
const carlsbadHtml = fs.readFileSync(path.join(root, 'medicare-broker-carlsbad.html'), 'utf8');
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const canonical = 'https://findtherightplan.com/';

function check(condition, message) {
  assert.ok(condition, message);
  console.log('PASS ' + message);
}

const canonicalTags = [...html.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi)];
check(canonicalTags.length === 1, 'homepage has exactly one canonical link');
check(canonicalTags[0][0].includes('href="' + canonical + '"'), 'canonical points to the production domain');

const descriptions = [...html.matchAll(/<meta\b[^>]*name=["']description["'][^>]*>/gi)];
check(descriptions.length === 1, 'homepage has exactly one meta description');
check(/<title>\s*[^<]+\s*<\/title>/i.test(html), 'homepage has a non-empty title');
check(html.includes('property="og:url" content="' + canonical + '"'), 'Open Graph URL matches canonical');

const jsonLdBlocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
check(jsonLdBlocks.length === 1, 'homepage has exactly one JSON-LD block');
const jsonLd = JSON.parse(jsonLdBlocks[0][1]);
check(jsonLd['@context'] === 'https://schema.org', 'JSON-LD uses Schema.org context');
check(Array.isArray(jsonLd['@graph']), 'JSON-LD graph is an array');
const website = jsonLd['@graph'].find(item => item['@type'] === 'WebSite');
const person = jsonLd['@graph'].find(item => item['@type'] === 'Person');
check(Boolean(website), 'JSON-LD includes a WebSite entity');
check(Boolean(person), 'JSON-LD includes a Person entity');
check(website.url === canonical && website.name === 'Find the Right Plan', 'WebSite entity matches the canonical site identity');
check(website.publisher && website.publisher['@id'] === person['@id'], 'WebSite publisher references the declared Person entity');
check(person.name === 'Michael Dovsky' && person.jobTitle === 'Independent Medicare Broker', 'Person entity identifies the stated broker role');
check(person.areaServed && person.areaServed.name === 'California', 'Person entity states California service area');
check(Array.isArray(person.knowsAbout) && person.knowsAbout.includes('Medicare'), 'Person entity includes relevant Medicare expertise');

check(/User-agent:\s*\*/i.test(robots), 'robots.txt includes a rule for all crawlers');
check(/User-agent:\s*\*[\s\S]*?Allow:\s*\//i.test(robots), 'robots.txt permits crawling of public paths');
check(robots.includes('Sitemap: ' + canonical + 'sitemap.xml'), 'robots.txt declares the production sitemap');

check(/<\?xml[^>]+version=["']1\.0["']/i.test(sitemap), 'sitemap has an XML declaration');
check(/<urlset\b[^>]*xmlns=["']http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["'][^>]*>/i.test(sitemap), 'sitemap uses the standard sitemap namespace');
const sitemapUrls = [...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(match => match[1].trim());
check(sitemapUrls.length > 0, 'sitemap contains at least one URL');
check(sitemapUrls.includes(canonical), 'sitemap includes the canonical homepage URL');
const encinitasUrl = canonical + 'medicare-broker-encinitas.html';
check(encinitasHtml.includes('<link rel="canonical" href="' + encinitasUrl + '">'), 'Encinitas page has its own canonical URL');
check(/<title>\s*Medicare Broker in Encinitas, CA\s*\|\s*Find the Right Plan\s*<\/title>/i.test(encinitasHtml), 'Encinitas page has a local search title');
check(/<meta name="description" content="[^"]+">/i.test(encinitasHtml), 'Encinitas page has a meta description');
const encinitasJsonMatch = encinitasHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
check(Boolean(encinitasJsonMatch), 'Encinitas page includes structured data');
const encinitasJson = JSON.parse(encinitasJsonMatch[1]);
check(encinitasJson['@context'] === 'https://schema.org' && Array.isArray(encinitasJson['@graph']), 'Encinitas structured data uses a Schema.org graph');
check(encinitasJson['@graph'].some(item => item['@type'] === 'Service' && item.areaServed && item.areaServed.name === 'Encinitas'), 'Encinitas structured data identifies the local service area');
check(sitemapUrls.includes(encinitasUrl), 'sitemap includes the Encinitas landing page');

const carlsbadUrl = canonical + 'medicare-broker-carlsbad.html';
check(carlsbadHtml.includes('<link rel="canonical" href="' + carlsbadUrl + '">'), 'Carlsbad page has its own canonical URL');
check(/<title>\s*Medicare Broker in Carlsbad, CA\s*\|\s*Find the Right Plan\s*<\/title>/i.test(carlsbadHtml), 'Carlsbad page has a local search title');
check(/<meta name="description" content="[^"]+">/i.test(carlsbadHtml), 'Carlsbad page has a meta description');
const carlsbadJsonMatch = carlsbadHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
check(Boolean(carlsbadJsonMatch), 'Carlsbad page includes structured data');
const carlsbadJson = JSON.parse(carlsbadJsonMatch[1]);
check(carlsbadJson['@context'] === 'https://schema.org' && Array.isArray(carlsbadJson['@graph']), 'Carlsbad structured data uses a Schema.org graph');
check(carlsbadJson['@graph'].some(item => item['@type'] === 'Service' && item.areaServed && item.areaServed.name === 'Carlsbad'), 'Carlsbad structured data identifies the local service area');
check(sitemapUrls.includes(carlsbadUrl), 'sitemap includes the Carlsbad landing page');
check(/href=["']\/medicare-broker-carlsbad\.html["']/.test(encinitasHtml), 'Encinitas page links to Carlsbad');
check(/href=["']\/medicare-broker-encinitas\.html["']/.test(carlsbadHtml), 'Carlsbad page links to Encinitas');
check(encinitasHtml.includes('How should I check a plan if I use Scripps providers in Encinitas?'), 'Encinitas page includes locally relevant provider-verification guidance');
check(encinitasHtml.includes('Does my Encinitas neighborhood determine which Medicare plans I can choose?'), 'Encinitas page explains service-area and ZIP-code relevance');
check(carlsbadHtml.includes('What should Carlsbad residents verify about local doctors and facilities?'), 'Carlsbad page includes locally relevant provider-verification guidance');
check(carlsbadHtml.includes('What if my doctors are spread across Carlsbad and nearby cities?'), 'Carlsbad page explains cross-city provider verification');
check(encinitasHtml.includes('Birthday Rule?'), 'Encinitas page includes California-specific Medigap timing guidance');
check(carlsbadHtml.includes('before leaving employer coverage?'), 'Carlsbad page includes employer coverage transition guidance');

console.log('SEO crawler checks passed.');
