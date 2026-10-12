const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
});

test('renders the ClearPath brand and all main page sections', async ({ page }) => {
  await expect(page).toHaveTitle(/ClearPath Medicare/);
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
  await expect.poll(async () => (await page.getByTestId('advantage-section').boundingBox()).y).toBeLessThan(150);

  await page.getByTestId('nav-link-medigap').click();
  await expect(page.getByTestId('medigap-section')).toBeVisible();
  await expect.poll(async () => (await page.getByTestId('medigap-section').boundingBox()).y).toBeLessThan(150);
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
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.locator('#mobile-menu').getByRole('button', { name: 'Medicare Parts' }).click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('parts-section')).toBeVisible();
  }
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
});