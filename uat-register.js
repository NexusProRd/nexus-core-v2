const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Intercept the register API call to see what data is sent
  page.on('request', req => {
    if (req.url().includes('/api/auth/register')) {
      console.log('\n📤 REGISTER API REQUEST:');
      console.log(`   URL: ${req.url()}`);
      console.log(`   Method: ${req.method()}`);
      console.log(`   Body: ${req.postData()}`);
    }
  });
  page.on('response', resp => {
    if (resp.url().includes('/api/auth/register')) {
      console.log(`\n📥 REGISTER API RESPONSE: ${resp.status()}`);
      resp.text().then(t => console.log(`   Body: ${t}`));
    }
  });
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`\n🚨 CONSOLE ERROR: ${msg.text()}`);
  });

  console.log('📌 REGISTER FLOW (real browser)');
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Check page title
  const title = await page.title();
  console.log(`   Page title: "${title}"`);

  // Log all visible text
  const body = await page.textContent('body');
  // Find the form heading
  const formHeading = body.match(/Crear tu Tienda|[A-Z][a-z]+ tu Tienda|Registro/);
  console.log(`   Form heading match: ${formHeading ? formHeading[0] : 'NOT FOUND'}`);

  // Fill each input by placeholder
  const inputs = await page.$$('input:not([type="checkbox"])');
  for (const inp of inputs) {
    const ph = await inp.getAttribute('placeholder') || '';
    const type = await inp.getAttribute('type') || '';
    const name = await inp.getAttribute('name') || '';
    console.log(`   Field: placeholder="${ph}" type=${type} name=${name}`);
    
    if (ph.includes('Juan') || ph.includes('Nombre') && !ph.includes('Tienda')) await inp.fill('Maria Garcia');
    else if (ph.includes('Farmacia') || ph.includes('tienda') || ph.includes('Tienda')) await inp.fill('Reposteria UAT');
    else if (type === 'tel' || ph.includes('809')) await inp.fill('8095559999');
    else if (type === 'password' && !name.includes('confirm') && !ph.includes('Repite')) await inp.fill('Test123456!');
    else if (type === 'password') await inp.fill('Test123456!');
  }
  
  // Check the checkbox
  const checkbox = await page.$('input[type="checkbox"]');
  if (checkbox) {
    await checkbox.check();
    console.log('   ✅ Terms checked');
  }

  // Submit
  const btn = await page.$('button[type="submit"]');
  if (btn) {
    const bt = await btn.textContent();
    console.log(`   Clicking "${bt.trim()}"`);
    await btn.click();
    await page.waitForTimeout(5000);
    
    const url = page.url();
    console.log(`   URL after submit: ${url}`);
    
    // Check for error toasts or messages
    const errorEl = await page.$('[class*="error"], [class*="toast"], [role="alert"], [class*="message"]');
    if (errorEl) {
      console.log(`   Error element: ${await errorEl.textContent()}`);
    }
    
    const body2 = await page.textContent('body');
    // Check if redirected to onboarding
    if (url.includes('/onboarding')) {
      console.log('   ✅ Redirected to onboarding!');
      console.log(`   Onboarding text: ${body2.substring(0, 500).replace(/\s+/g, ' ').trim()}`);
    } else if (url.includes('/dashboard')) {
      console.log('   ✅ Redirected to dashboard!');
    } else {
      console.log(`   ⚠️ Still on same page. Body contains error?`);
      if (body2.includes('error') || body2.includes('Error') || body2.includes('obligatorio')) {
        console.log(`   Error text found: ${body2.substring(0, 300).replace(/\s+/g, ' ').trim()}`);
      }
    }
  }

  await browser.close();
})();
