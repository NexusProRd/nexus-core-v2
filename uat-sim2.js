const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('═══════════════════════════════════════');
  console.log('SIMULACIÓN 2 — CLIENTE');
  console.log('═══════════════════════════════════════');

  // Navigate to a catalog
  console.log('\n📌 1. ENTRAR AL CATÁLOGO');
  await page.goto('http://localhost:3000/catalogo/test-id', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  let text = await page.textContent('body');
  console.log(`   Page (first 500): ${text.substring(0, 500).replace(/\s+/g, ' ').trim()}`);

  // Check navigation
  const navLinks = await page.$$('nav a, nav button, [role="tab"]');
  console.log(`\n   Navigation elements: ${navLinks.length}`);
  for (const l of navLinks) {
    const t = await l.textContent();
    console.log(`     - ${t.trim().substring(0, 40)}`);
  }

  // Look for products
  const products = await page.$$('[class*="product"], [class*="card"], article, [class*="item"]');
  console.log(`\n   Product cards found: ${products.length}`);

  // Look for search
  const searchInput = await page.$('input[type="search"], input[placeholder*="buscar"], input[placeholder*="Buscar"]');
  console.log(`   Search input: ${searchInput ? 'YES' : 'NO'}`);

  // Look for category filter
  const categories = await page.$$('[class*="categoria"], [class*="category"], [class*="filter"]');
  console.log(`   Category filters: ${categories.length}`);

  // Cart
  const cartButtons = await page.$$('button:has-text("Carrito"), button[aria-label*="carrito"], button[aria-label*="Cart"]');
  console.log(`   Cart buttons: ${cartButtons.length}`);

  // 2. Try a product detail
  console.log('\n📌 2. VER PRODUCTO');
  const firstProduct = await page.$('a[href*="/producto/"], button:has-text("+"), button:has-text("Agregar")');
  if (firstProduct) {
    const t = await firstProduct.textContent();
    console.log(`   First interactive element: "${t.trim()}"`);
  } else {
    console.log('   No interactive product elements found');
    const allLinks = await page.$$('a');
    console.log(`   All links on page: ${allLinks.length}`);
    for (const l of allLinks) {
      const href = await l.getAttribute('href');
      const t = await l.textContent();
      if (href && href.length > 1 && t.trim().length > 0) {
        console.log(`     ${href} -> "${t.trim().substring(0, 50)}"`);
      }
    }
  }

  // 3. Cart page
  console.log('\n📌 3. CARRITO');
  await page.goto('http://localhost:3000/catalogo/test-id/cart', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  text = await page.textContent('body');
  console.log(`   Cart page: ${text.substring(0, 400).replace(/\s+/g, ' ').trim()}`);

  await browser.close();
  console.log('\n═══════════════════════════════════════');
})();
