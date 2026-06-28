const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const uid = Date.now().toString().slice(-4);
  
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  
  // Fill form sequentially
  await page.fill('input[placeholder="Ej: Juan Pérez"]', `Maria QA ${uid}`);
  await page.fill('input[placeholder="Ej: Mi Farmacia"]', `Tienda QA ${uid}`);
  await page.fill('input[type="tel"]', `809555${uid}`);
  const pwds = await page.$$('input[type="password"]');
  await pwds[0].fill('Test123456!');
  await pwds[1].fill('Test123456!');
  await page.check('input[type="checkbox"]');

  // Submit and wait for navigation
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);

  const url = page.url();
  console.log(`URL after submit: ${url}`);
  console.log(`Auto-redirected: ${url.includes('/onboarding') ? '✅ YES' : '❌ NO'}`);

  if (url !== 'http://localhost:3000/register') {
    console.log('✅ P1-01: Register now redirects automatically');
  } else {
    console.log('❌ P1-01: Still stuck on register page');
  }

  await browser.close();
})();
