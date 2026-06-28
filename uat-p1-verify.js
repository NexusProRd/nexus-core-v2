const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('═══════════════════════════════════════');
  console.log('P1-01: REGISTER REDIRECT VERIFICATION');
  console.log('═══════════════════════════════════════');

  const uid = Date.now().toString().slice(-4);
  
  // Navigate to register
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  // Intercept API response to confirm redirectTo is present
  const apiPromise = new Promise((resolve) => {
    page.on('response', resp => {
      if (resp.url().includes('/api/auth/register')) {
        resp.text().then(t => {
          try {
            const data = JSON.parse(t);
            console.log(`   API response: redirectTo="${data.redirectTo}"`);
            resolve(data.redirectTo === '/onboarding');
          } catch { resolve(false); }
        });
      }
    });
  });

  // Fill form
  const inputs = await page.$$('input');
  let idx = 0;
  for (const inp of inputs) {
    const type = await inp.getAttribute('type') || '';
    const placeholder = (await inp.getAttribute('placeholder') || '').toLowerCase();
    if (idx === 0) await inp.fill(`Maria QA ${uid}`);
    else if (idx === 1) await inp.fill(`Tienda QA ${uid}`);
    else if (type === 'tel') await inp.fill(`809555${uid}`);
    else if (type === 'password' && idx === 2) await inp.fill('Test123456!');
    else if (type === 'password' && idx === 3) await inp.fill('Test123456!');
    idx++;
  }

  // Check terms
  const checkbox = await page.$('input[type="checkbox"]');
  if (checkbox) await checkbox.check();

  // Submit
  const btn = await page.$('button[type="submit"]');
  await btn.click();

  // Wait for navigation
  await page.waitForTimeout(4000);
  
  const finalUrl = page.url();
  const apiOk = await apiPromise;
  const navigated = finalUrl.includes('/onboarding');
  
  console.log(`   API returned redirectTo: ${apiOk ? '✅' : '❌'}`);
  console.log(`   URL after submit: ${finalUrl}`);
  console.log(`   Auto-redirected to onboarding: ${navigated ? '✅' : '❌'}`);
  console.log(`\n   RESULT: ${apiOk && navigated ? '✅ P1-01 RESUELTO' : '❌ P1-01 FALLÓ'}`);

  await browser.close();
})();
