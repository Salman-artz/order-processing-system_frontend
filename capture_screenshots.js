const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const DIRS = [
  path.resolve('D:/Project Porto/order-processing-system-frontend/public/screenshots'),
  path.resolve('D:/Project Porto/order-processing-system/screenshots'),
  path.resolve('D:/Project Porto/linkedin/screenshots/07_Order_Processing_Microservices'),
];

DIRS.forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function saveScreenshot(sourceBuffer, filename) {
  for (const dir of DIRS) {
    const dest = path.join(dir, filename);
    fs.writeFileSync(dest, sourceBuffer);
    console.log(`Saved: ${dest} (${sourceBuffer.length} bytes)`);
  }
}

async function run() {
  console.log('Launching browser for 1366x768 screenshots...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // 1. Login Light Mode
  console.log('1. Capturing Login Light Mode...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('ops_theme', 'light');
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  });
  await page.waitForTimeout(500);
  let buf = await page.screenshot();
  saveScreenshot(buf, 'foto1_login_light_mode.png');

  // 2. Login Dark Mode
  console.log('2. Capturing Login Dark Mode...');
  await page.evaluate(() => {
    localStorage.setItem('ops_theme', 'dark');
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(500);
  buf = await page.screenshot();
  saveScreenshot(buf, 'foto2_login_dark_mode.png');

  // 3. Authenticate via Quick Demo Button
  console.log('Authenticating as Admin Lead...');
  await page.click('button:has-text("Admin Lead")');
  await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // 3. Customer Storefront & Cockpit
  console.log('3. Capturing Customer Storefront & Live Cockpit...');
  await page.goto('http://localhost:3000/customer/products', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  buf = await page.screenshot();
  saveScreenshot(buf, 'foto3_customer_storefront_order.png');
  saveScreenshot(buf, 'foto1_customer_storefront_order.png'); // portfolio compatibility

  // 4. Saga Execution Timeline UI
  console.log('4. Capturing Saga Execution Timeline UI...');
  await page.goto('http://localhost:3000/customer/orders/ord-e41c7b89', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  buf = await page.screenshot();
  saveScreenshot(buf, 'foto4_saga_execution_timeline_ui.png');
  saveScreenshot(buf, 'foto2_saga_execution_timeline_ui.png'); // portfolio compatibility

  // 5. Real-time Monitoring Dashboard
  console.log('5. Capturing Real-time Monitoring Dashboard...');
  await page.goto('http://localhost:3000/admin/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  buf = await page.screenshot();
  saveScreenshot(buf, 'foto5_realtime_order_monitoring_dashboard.png');
  saveScreenshot(buf, 'foto3_realtime_order_monitoring_dashboard.png'); // portfolio compatibility

  // 6. Inventory Reservation & Rollback UI
  console.log('6. Capturing Inventory Reservation & Rollback UI...');
  await page.goto('http://localhost:3000/admin/inventory', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  buf = await page.screenshot();
  saveScreenshot(buf, 'foto6_inventory_reservation_rollback.png');
  saveScreenshot(buf, 'foto4_inventory_reservation_rollback.png'); // portfolio compatibility

  await browser.close();
  console.log('All screenshots captured successfully across all 3 directories!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
