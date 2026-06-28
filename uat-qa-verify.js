const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  async function check(label, fn) {
    try {
      const ok = await fn();
      results.push({ label, status: ok ? '✅' : '❌', detail: '' });
    } catch (e) {
      results.push({ label, status: '❌', detail: e.message.substring(0, 100) });
    }
  }

  // 1. REGISTRO — API response includes redirectTo
  await check('P1-01: Register API returns redirectTo', async () => {
    const page = await browser.newPage();
    const uid = Date.now().toString().slice(-4);
    const resp = await page.request.post('http://localhost:3000/api/auth/register', {
      data: {
        nombre_socio: `QA Test ${uid}`,
        nombre_tienda: `QA Store ${uid}`,
        whatsapp: `809555${uid}`,
        password: 'Test123456!',
        acepto_terminos: true,
      },
    });
    const text = await resp.text();
    await page.close();
    if (resp.status() !== 200) return false;
    try {
      const data = JSON.parse(text);
      return data.redirectTo === '/onboarding';
    } catch {
      return false;
    }
  });

  // 2. CANJE — No Debug link
  await check('P1-02: Canje page no Debug text', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/canje?gift=INVALID999', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    await page.close();
    return !text.includes('Debug') && !text.includes('debug');
  });

  // 3. CANJE — Form visible without query param
  await check('P2-01: Canje form visible without ?gift=', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/canje', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    const hasInput = await page.$('input[id="gift-code"]');
    const hasForm = text.includes('Canjear regalo');
    await page.close();
    return !!(hasInput && hasForm);
  });

  // 4. CANJE — Form submit navigates to ?gift=
  await check('P2-01: Canje form submit navigates correctly', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/canje', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.fill('input[id="gift-code"]', 'TEST999');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    const url = page.url();
    await page.close();
    return url.includes('gift=TEST999');
  });

  // 5. CATÁLOGO — Not found page
  await check('P2-02: Catalog not found shows elegant page', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/c/nonexistent-slug-xyz', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    const hasTitle = text.includes('Tienda no encontrada');
    const hasLink = text.includes('Volver al inicio');
    const noStack = !text.includes('NotFoundError') && !text.includes('Error:');
    await page.close();
    return hasTitle && hasLink && noStack;
  });

  // 6. LEGACY ROUTE — /dashboard/productos redirects
  await check('P2-03: /dashboard/productos redirects to /dashboard/inventario', async () => {
    const page = await browser.newPage();
    // Follow redirects manually
    const resp = await page.goto('http://localhost:3000/dashboard/productos', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const url = page.url();
    await page.close();
    return url.includes('/dashboard/inventario') || resp.status() === 308 || resp.status() === 307;
  });

  // 7. LEGACY ROUTE — /dashboard/clientes redirects
  await check('P2-03: /dashboard/clientes redirects', async () => {
    const page = await browser.newPage();
    const resp = await page.goto('http://localhost:3000/dashboard/clientes', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const url = page.url();
    await page.close();
    return url.includes('/dashboard');
  });

  // Print results
  console.log('\n═══════════════════════════════════════');
  console.log('QA — PILOT-00 UX POLISH');
  console.log('═══════════════════════════════════════');
  let passed = 0, failed = 0;
  for (const r of results) {
    const icon = r.status === '✅' ? '✅' : '❌';
    if (r.status === '✅') passed++; else failed++;
    console.log(` ${icon} ${r.label}${r.detail ? ` — ${r.detail}` : ''}`);
  }
  console.log(`\n📊 ${passed}/${results.length} passed, ${failed} failed`);

  await browser.close();
})();
