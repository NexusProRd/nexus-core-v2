const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('═══════════════════════════════════════');
  console.log('SIMULACIÓN 1 — SOCIO / COMERCIANTE');
  console.log('═══════════════════════════════════════');

  // 1. Landing Page
  console.log('\n📌 1. LANDING PAGE');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  const title = await page.title();
  console.log(`   Title: ${title}`);
  const h1 = await page.textContent('h1').catch(() => '(no h1)');
  console.log(`   H1: ${h1.substring(0, 100)}`);

  // Find all visible text content on landing
  const bodyText = await page.textContent('body');
  console.log(`   Body (first 600): ${bodyText.substring(0, 600).replace(/\s+/g, ' ').trim()}`);

  // Find CTA / register link
  const registerLink = await page.$('a[href="/register"]');
  const loginLink = await page.$('a[href="/login"]');
  console.log(`   Register link: ${registerLink ? 'YES' : 'NO'}`);
  console.log(`   Login link: ${loginLink ? 'YES' : 'NO'}`);

  // 2. Register Page
  console.log('\n📌 2. REGISTRO');
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  
  const inputs = await page.$$('input, select, textarea');
  console.log(`   Form fields: ${inputs.length}`);
  for (const inp of inputs) {
    const name = await inp.getAttribute('name') || '';
    const placeholder = await inp.getAttribute('placeholder') || '';
    const type = await inp.getAttribute('type') || '';
    const id = await inp.getAttribute('id') || '';
    const label = await page.evaluate(el => { const l = el.closest('label'); return l ? l.textContent.trim() : ''; }, inp);
    console.log(`     [${name || id || '?'}] type=${type} placeholder="${placeholder}" label="${label}"`);
  }

  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    const btnText = await submitBtn.textContent();
    console.log(`   Submit: "${btnText.trim()}"`);
  }

  const registerText = await page.textContent('body');
  console.log(`   Page text: ${registerText.substring(0, 500).replace(/\s+/g, ' ').trim()}`);

  // 3. Actually register
  console.log('\n📌 3. REGISTRANDO...');
  
  const fields = await page.$$('input');
  for (const f of fields) {
    const placeholder = (await f.getAttribute('placeholder') || '').toLowerCase();
    const name = (await f.getAttribute('name') || '').toLowerCase();
    const type = (await f.getAttribute('type') || '').toLowerCase();
    
    if (placeholder.includes('nombre') && !placeholder.includes('tienda')) await f.fill('María García');
    else if (placeholder.includes('tienda') || name.includes('tienda')) await f.fill('Repostería Doña María');
    else if (type === 'tel' || placeholder.includes('whatsapp') || placeholder.includes('teléfono') || placeholder.includes('celular')) await f.fill('8095551234');
    else if (type === 'password') await f.fill('MiPassword123!');
    else if (type === 'email' || placeholder.includes('correo') || placeholder.includes('email')) await f.fill('maria@test.com');
  }
  console.log('   ✅ Form filled');

  if (submitBtn) {
    await submitBtn.click();
    await page.waitForTimeout(3000);
    const url = page.url();
    console.log(`   URL after submit: ${url}`);
    const body = await page.textContent('body');
    console.log(`   Response: ${body.substring(0, 400).replace(/\s+/g, ' ').trim()}`);
  }

  await browser.close();
  console.log('\n═══════════════════════════════════════');
})();
