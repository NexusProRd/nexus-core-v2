const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('═══════════════════════════════════════');
  console.log('SIMULACIÓN 3 — DESTINATARIO REGALO');
  console.log('SIMULACIÓN 5 — PCC');
  console.log('═══════════════════════════════════════');

  // Sim 3: Gift redemption page
  console.log('\n📌 SIM 3: CANJE DE REGALO');
  await page.goto('http://localhost:3000/canje', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const text = await page.evaluate(() => document.body.innerText);
  console.log(`   Canje page:\n${text.substring(0, 800)}`);

  // Check gift card page
  console.log('\n📌 GIFT CARD PAGE');
  await page.goto('http://localhost:3000/canje?gift=TEST123', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const text2 = await page.evaluate(() => document.body.innerText);
  console.log(`   Gift canje with code:\n${text2.substring(0, 600)}`);

  // Sim 5: PCC Login
  console.log('\n📌 SIM 5: PCC');
  await page.goto('http://localhost:3000/pcc', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const text3 = await page.evaluate(() => document.body.innerText);
  console.log(`   PCC home:\n${text3.substring(0, 800)}`);

  // PCC Login page
  await page.goto('http://localhost:3000/pcc-login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const text4 = await page.evaluate(() => document.body.innerText);
  console.log(`\n📌 PCC LOGIN:\n${text4.substring(0, 500)}`);

  // Check PCC mantenimiento page
  await page.goto('http://localhost:3000/pcc/mantenimiento', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const text5 = await page.evaluate(() => document.body.innerText);
  console.log(`\n📌 PCC MANTENIMIENTO:\n${text5.substring(0, 600)}`);

  // PCC configuracion
  await page.goto('http://localhost:3000/pcc/configuracion', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const text6 = await page.evaluate(() => document.body.innerText);
  console.log(`\n📌 PCC CONFIGURACIÓN:\n${text6.substring(0, 600)}`);

  await browser.close();
  console.log('\n═══════════════════════════════════════');
})();
