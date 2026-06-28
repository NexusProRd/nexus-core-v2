const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('═══════════════════════════════════════');
  console.log('SIMULACIÓN 1b — ONBOARDING + DASHBOARD');
  console.log('═══════════════════════════════════════');

  // First login with our test credentials
  console.log('\n📌 1. LOGIN');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  let text = await page.textContent('body');
  console.log(`   Login page: ${text.substring(0, 300).replace(/\s+/g, ' ').trim()}`);

  // Find login form fields
  const inputs = await page.$$('input');
  console.log(`   Found ${inputs.length} inputs`);
  for (const inp of inputs) {
    const ph = await inp.getAttribute('placeholder') || '';
    const type = await inp.getAttribute('type') || '';
    console.log(`     type=${type} placeholder="${ph}"`);
  }
  
  // Fill and submit login
  for (const inp of inputs) {
    const ph = (await inp.getAttribute('placeholder') || '').toLowerCase();
    const type = await inp.getAttribute('type') || '';
    if (type === 'tel' || ph.includes('whatsapp') || ph.includes('tel')) await inp.fill('8095559999');
    else if (type === 'password') await inp.fill('Test123456!');
  }
  
  const loginBtn = await page.$('button[type="submit"]');
  if (loginBtn) {
    console.log(`   Submitting login`);
    await loginBtn.click();
    await page.waitForTimeout(3000);
    const url = page.url();
    console.log(`   URL after login: ${url}`);
    
    text = await page.textContent('body');
    if (url.includes('/dashboard') || url.includes('/onboarding')) {
      console.log(`   ✅ Logged in! First 500 chars:`);
      console.log(`   ${text.substring(0, 500).replace(/\s+/g, ' ').trim()}`);
    } else {
      console.log(`   ⚠️ Not redirected. Body: ${text.substring(0, 300).replace(/\s+/g, ' ').trim()}`);
    }
  }

  // 2. Explore dashboard
  console.log('\n📌 2. DASHBOARD EXPLORATION');
  
  // Check for sidebar/nav items
  const navItems = await page.$$('nav a, [class*="sidebar"] a, [class*="nav"] a, aside a');
  console.log(`   Nav items: ${navItems.length}`);
  for (const item of navItems) {
    const href = await item.getAttribute('href') || '';
    const t = await item.textContent();
    if (t.trim()) console.log(`     ${href} -> "${t.trim().substring(0, 40)}"`);
  }

  // Find buttons/actions
  const buttons = await page.$$('button');
  console.log(`   Buttons: ${buttons.length}`);
  for (const b of buttons) {
    const t = await b.textContent();
    if (t.trim()) console.log(`     "${t.trim().substring(0, 50)}"`);
  }

  // 3. Visit onboarding
  console.log('\n📌 3. ONBOARDING');
  await page.goto('http://localhost:3000/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  text = await page.textContent('body');
  console.log(`   Onboarding page: ${text.substring(0, 600).replace(/\s+/g, ' ').trim()}`);

  // 4. Try configuración
  console.log('\n📌 4. CONFIGURACIÓN');
  await page.goto('http://localhost:3000/dashboard/configurar', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  text = await page.textContent('body');
  if (text.includes('Configurar') || text.includes('configura')) {
    console.log(`   Config page loaded`);
    console.log(`   ${text.substring(0, 500).replace(/\s+/g, ' ').trim()}`);
  } else {
    console.log(`   ${text.substring(0, 300).replace(/\s+/g, ' ').trim()}`);
  }

  // 5. Try inventario
  console.log('\n📌 5. INVENTARIO');
  await page.goto('http://localhost:3000/dashboard/inventario', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  text = await page.textContent('body');
  console.log(`   ${text.substring(0, 500).replace(/\s+/g, ' ').trim()}`);

  await browser.close();
  console.log('\n═══════════════════════════════════════');
})();
