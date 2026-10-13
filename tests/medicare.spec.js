const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
});

test('renders Michael Dovsky branding and all main page sections', async ({ page }) => {
  await expect(page).toHaveTitle(/Michael Dovsky \| Independent Medicare Broker/);
  await expect(page.getByTestId('hero-section')).toBeVisible();
  await expect(page.getByTestId('hero-kicker')).toHaveText('Independent Medicare Broker');
  await expect(page.getByRole('heading', { name: /Medicare, explained in plain English/i, level: 1 })).toBeVisible();
  for (const id of ['carrier-marquee', 'broker-section', 'parts-section', 'advantage-section', 'medigap-section', 'compare-section', 'contact-section', 'site-footer']) {
    await expect(page.getByTestId(id)).toBeAttached();
  }
  for (const part of ['a', 'b', 'c', 'd']) {
    await expect(page.getByTestId(`part-card-${part}`)).toBeVisible();
  }
});

test('hero actions navigate to the expected sections', async ({ page }) => {
  await page.getByTestId('hero-cta-button').click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.getByTestId('lead-form')).toBeVisible();

  await page.getByTestId('hero-explore-button').click();
  await expect(page).toHaveURL(/#parts$/);
  await expect(page.getByTestId('parts-section')).toBeVisible();
});

test('desktop navigation scrolls to each named section', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The desktop navigation is replaced by the mobile menu at this viewport.');
  await page.getByTestId('nav-link-advantage').click();
  await expect(page.getByTestId('advantage-section')).toBeVisible();
  await expect.poll(async () => (await page.getByTestId('advantage-section').boundingBox()).y).toBeLessThan(250);

  await page.getByTestId('nav-link-medigap').click();
  await expect(page.getByTestId('medigap-section')).toBeVisible();
  await expect.poll(async () => (await page.getByTestId('medigap-section').boundingBox()).y).toBeLessThan(250);
});

test('desktop page-load entrance and page-wide scroll reveals are active', async ({ page, isMobile }) => {
  test.skip(isMobile, 'This motion audit targets the desktop choreography.');
  const motion = await page.evaluate(() => ({
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    headerAnimation: getComputedStyle(document.querySelector('.site-header')).animationName,
    revealCount: document.querySelectorAll('.cp-reveal').length,
    revealedAtLoad: document.querySelectorAll('.cp-reveal.cp-visible').length,
    hiddenRevealTargets: [...document.querySelectorAll('.cp-reveal')].filter(el => getComputedStyle(el).opacity === '0').length
  }));
  if (!motion.reducedMotion) {
    expect(motion.headerAnimation).toContain('cp-soft-enter');
    expect(motion.revealCount).toBeGreaterThan(15);
    expect(motion.revealedAtLoad).toBeGreaterThan(0);
    expect(motion.hiddenRevealTargets).toBeGreaterThan(0);
    const lowerSection = page.locator('#medigap .feature-copy > .section-title').first();
    await lowerSection.scrollIntoViewIfNeeded();
    await expect.poll(() => lowerSection.evaluate(el => el.classList.contains('cp-visible'))).toBe(true);
  } else {
    expect(motion.headerAnimation).toBe('none');
  }
});

test('mobile motion stays subtle, lightweight, and respects reduced motion', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This motion audit targets the mobile art direction.');
  const motion = await page.evaluate(() => {
    const reveals = [...document.querySelectorAll('.cp-reveal')];
    return {
      revealCount: reveals.length,
      nestedTextTargets: reveals.filter(el => /^(P|A|LI|SPAN|SMALL|STRONG)$/.test(el.tagName)).length,
      alwaysPromotedLayers: reveals.filter(el => getComputedStyle(el).willChange !== 'auto').length,
      menuClosed: getComputedStyle(document.querySelector('#mobile-menu')).visibility === 'hidden',
      menuTransition: getComputedStyle(document.querySelector('#mobile-menu')).transitionDuration
    };
  });
  expect(motion.revealCount).toBeGreaterThan(0);
  expect(motion.revealCount).toBeLessThan(45);
  expect(motion.nestedTextTargets).toBe(0);
  expect(motion.alwaysPromotedLayers).toBe(0);
  expect(motion.menuClosed).toBe(true);
  expect(motion.menuTransition).toContain('0.28s');

  const toggle = page.getByTestId('mobile-menu-toggle');
  const menu = page.locator('#mobile-menu');
  await toggle.click();
  await expect(menu).toBeVisible();
  await expect.poll(() => menu.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  await toggle.click();
  await expect(menu).toBeHidden();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await page.evaluate(() => ({
    cardTransition: getComputedStyle(document.querySelector('.part-card')).transitionDuration,
    revealOpacity: getComputedStyle(document.querySelector('.cp-reveal')).opacity,
    revealTransition: getComputedStyle(document.querySelector('.cp-reveal')).transitionDuration
  }));
  expect(reduced.cardTransition).toBe('0s');
  expect(reduced.revealOpacity).toBe('1');
  expect(reduced.revealTransition).toBe('0s');
});

test('Part A through D cost details expand and collapse accessibly', async ({ page }) => {
  for (const part of ['a', 'b', 'c', 'd']) {
    const button = page.getByTestId(`part-${part}-details-toggle`);
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(button.locator('xpath=following-sibling::div[1]')).toBeVisible();
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  }
});

test('contact form has labeled required fields and optional message', async ({ page }) => {
  const form = page.getByTestId('lead-form');
  await expect(form.getByLabel('Full name')).toHaveAttribute('required', '');
  await expect(form.getByLabel('Phone number')).toHaveAttribute('required', '');
  await expect(form.getByLabel('Email address')).toHaveAttribute('required', '');
  await expect(form.getByLabel(/Anything I should know/)).not.toHaveAttribute('required', '');
  await expect(page.getByTestId('lead-form-submit-button')).toBeVisible();
});

test('images have alternative text and mobile layout does not overflow horizontally', async ({ page, isMobile }) => {
  const images = page.locator('main img');
  expect(await images.count()).toBeGreaterThanOrEqual(3);
  for (let i = 0; i < await images.count(); i++) {
    await expect(images.nth(i)).toHaveAttribute('alt', /.+/);
  }
  if (isMobile) {
    const toggle = page.getByTestId('mobile-menu-toggle');
    const quickCta = page.getByTestId('mobile-header-cta');
    await expect(toggle).toBeVisible();
    await expect(quickCta).toBeVisible();
    await expect(quickCta).toHaveAttribute('href', '#contact');
    const touchTargets = await Promise.all([toggle, quickCta].map(async locator => {
      const box = await locator.boundingBox();
      return { width: box.width, height: box.height };
    }));
    for (const target of touchTargets) {
      expect(target.width).toBeGreaterThanOrEqual(40);
      expect(target.height).toBeGreaterThanOrEqual(42);
    }
    const responsiveLayout = await page.evaluate(() => ({
      partsColumns: getComputedStyle(document.querySelector('.parts-grid')).gridTemplateColumns.split(' ').length,
      compareDisplay: getComputedStyle(document.querySelector('.compare-table')).display,
      compareRowDisplay: getComputedStyle(document.querySelector('.compare-table tbody tr')).display
    }));
    expect(responsiveLayout.partsColumns).toBe(1);
    expect(responsiveLayout.compareDisplay).toBe('block');
    expect(responsiveLayout.compareRowDisplay).toBe('grid');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.locator('#mobile-menu').getByRole('button', { name: 'Medicare Parts' }).click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('parts-section')).toBeVisible();
  } else {
    await expect(page.getByTestId('mobile-header-cta')).toBeHidden();
    await expect.poll(async () => page.locator('.hero-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(2);
    await expect.poll(async () => page.locator('.compare-table').evaluate(el => getComputedStyle(el).display)).toBe('table');
  }
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  if (isMobile) {
    await page.setViewportSize({ width: 320, height: 800 });
    const narrow = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
      brand: document.querySelector('.brand').getBoundingClientRect().width,
      cta: document.querySelector('.mobile-header-cta').getBoundingClientRect().width,
      toggle: document.querySelector('.mobile-toggle').getBoundingClientRect().width
    }));
    expect(narrow.content).toBeLessThanOrEqual(narrow.viewport + 1);
    expect(narrow.brand + narrow.cta + narrow.toggle).toBeLessThanOrEqual(narrow.viewport);
  }
});