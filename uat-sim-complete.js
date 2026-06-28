const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('═══════════════════════════════════════');
  console.log('UAT COMPLETA — TODAS LAS SIMULACIONES');
  console.log('═══════════════════════════════════════');

  // ===================================================================
  // FASE 1: Completar Onboarding
  // ===================================================================
  console.log('\n📌 FASE 1: COMPLETAR ONBOARDING');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Login
  const loginInputs = await page.$$('input');
  for (const inp of loginInputs) {
    const type = await inp.getAttribute('type') || '';
    const placeholder = (await inp.getAttribute('placeholder') || '').toLowerCase();
    if (type === 'tel' || placeholder.includes('whatsapp') || placeholder.includes('809')) await inp.fill('8095559999');
    else if (type === 'password') await inp.fill('Test123456!');
  }
  const loginBtn = await page.$('button[type="submit"]');
  await loginBtn.click();
  await page.waitForTimeout(2000);
  console.log(`   URL after login: ${page.url()}`);
  
  // Onboarding: select country and business type
  console.log(`\n📌 FASE 1b: SELECCIONAR PAÍS Y TIPO`);
  // Find radio buttons or selects
  const radioGroups = await page.$$('[type="radio"]');
  console.log(`   Radio buttons found: ${radioGroups.length}`);
  if (radioGroups.length > 0) {
    // First radio (República Dominicana) is likely first
    // Second radio type (Ropa y Accesorios)
    if (radioGroups.length >= 2) {
      await radioGroups[0].click();
      await page.waitForTimeout(500);
      let label = '';
      const labels = await page.$$('label');
      for (const l of labels) {
        const forAttr = await l.getAttribute('for');
        const text = (await l.textContent()).trim();
        if (forAttr && text) label += `${forAttr}=${text.substring(0,30)} `;
      }
      console.log(`   Clicked first radio`);
      await radioGroups[1].click();
      console.log(`   Clicked second radio`);
    } else {
      await radioGroups[0].click();
      console.log(`   Clicked first radio (only one)`);
    }
    await page.waitForTimeout(500);
  }

  // Submit onboarding
  const onboardBtns = await page.$$('button');
  for (const b of onboardBtns) {
    const t = await b.textContent();
    if (t.includes('Guardar') || t.includes('Dashboard') || t.includes('Entrar')) {
      console.log(`   Clicking button: "${t.trim()}"`);
      await b.click();
      await page.waitForTimeout(3000);
      break;
    }
  }
  console.log(`   URL after onboarding: ${page.url()}`);

  // ===================================================================
  // FASE 2: Dashboard del comerciante
  // ===================================================================
  console.log(`\n📌 FASE 2: DASHBOARD`);
  const dashText = await page.evaluate(() => document.body.innerText);
  console.log(`   Dashboard content:\n${dashText.substring(0, 1000)}`);

  // Check sidebar navigation
  const sidebarLinks = await page.$$eval('aside a, nav a, [class*="sidebar"] a', els => 
    els.map(e => ({ href: e.href, text: e.textContent.trim().substring(0,40) }))
  );
  console.log(`   Sidebar links: ${JSON.stringify(sidebarLinks)}`);

  // Check main action buttons
  const mainBtns = await page.$$eval('button', els =>
    els.filter(e => e.textContent.trim().length > 0)
       .map(e => e.textContent.trim().substring(0,50))
  );
  console.log(`   Buttons: ${JSON.stringify(mainBtns)}`);

  // ===================================================================
  // FASE 3: Navegación por secciones
  // ===================================================================
  console.log(`\n📌 FASE 3: NAVEGACIÓN POR SECCIONES`);
  const sections = [
    { name: 'Productos', url: '/dashboard/productos' },
    { name: 'Inventario', url: '/dashboard/inventario' },
    { name: 'Pedidos', url: '/dashboard/pedidos' },
    { name: 'Regalos', url: '/dashboard/regalos' },
    { name: 'Clientes', url: '/dashboard/clientes' },
    { name: 'Analíticas', url: '/dashboard/analiticas' },
    { name: 'Configurar', url: '/dashboard/configurar' },
  ];

  for (const sec of sections) {
    await page.goto(`http://localhost:3000${sec.url}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const t = await page.evaluate(() => document.body.innerText);
    // Check if the page loaded correctly (not a 404 or error)
    const clean = t.replace('self.__next_f=...', '').trim().substring(0, 300);
    if (t.includes('404') || t.includes('No encontrada') || t.includes('Página no')) {
      console.log(`   ❌ ${sec.name} (${sec.url}): 404`);
    } else if (t.length < 50) {
      console.log(`   ⚠️ ${sec.name} (${sec.url}): empty`);
    } else {
      console.log(`   ✅ ${sec.name}: loaded (${t.length} chars)`);
      // Show key info
      const lines = t.split('\n').filter(l => l.trim() && l.length > 3 && !l.startsWith('self.__next_') && !l.includes('next_f')).slice(0, 5);
      lines.forEach(l => console.log(`     ${l.trim().substring(0, 80)}`));
    }
  }

  // ===================================================================
  // FASE 4: PCC
  // ===================================================================
  console.log(`\n📌 FASE 4: PCC - ACCESO`);
  await page.goto('http://localhost:3000/pcc', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  
  const pccInputs = await page.$$('input');
  if (pccInputs.length > 0) {
    console.log(`   PCC login page detected, trying access...`);
    for (const inp of pccInputs) {
      const type = await inp.getAttribute('type') || '';
      if (type === 'password') await inp.fill('admin123');
    }
    const pccBtn = await page.$('button[type="submit"], button:has-text("Ingresar")');
    if (pccBtn) {
      await pccBtn.click();
      await page.waitForTimeout(3000);
      const pccText = await page.evaluate(() => document.body.innerText);
      console.log(`   URL after PCC login: ${page.url()}`);
      console.log(`   PCC content:\n${pccText.substring(0, 1000)}`);
    }
  } else {
    console.log(`   No inputs on PCC page`);
    const pccText = await page.evaluate(() => document.body.innerText);
    console.log(`   PCC content:\n${pccText.substring(0, 500)}`);
  }

  // ===================================================================
  // FASE 5: Gift purchase flow
  // ===================================================================
  console.log(`\n📌 FASE 5: GIFT PURCHASE`);
  await page.goto('http://localhost:3000/dashboard/regalos', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const giftText = await page.evaluate(() => document.body.innerText);
  console.log(`   Gift section:\n${giftText.substring(0, 600)}`);

  // ===================================================================
  // FASE 6: Gift canje
  // ===================================================================
  console.log(`\n📌 FASE 6: CANJE DE REGALO`);
  await page.goto('http://localhost:3000/canje?debug=true', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const canjeText = await page.evaluate(() => document.body.innerText);
  console.log(`   Canje page:\n${canjeText.substring(0, 500)}`);

  // Check for a code input
  const canjeInputs = await page.$$('input');
  console.log(`   Canje inputs: ${canjeInputs.length}`);
  for (const inp of canjeInputs) {
    const ph = await inp.getAttribute('placeholder') || '';
    const type = await inp.getAttribute('type') || '';
    console.log(`     placeholder="${ph}" type=${type}`);
  }

  console.log('\n═══════════════════════════════════════');
  console.log('UAT COMPLETA');
  console.log('═══════════════════════════════════════');
  await browser.close();
})();
