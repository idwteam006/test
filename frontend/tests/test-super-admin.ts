import { chromium } from '@playwright/test';

async function testSuperAdmin() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('1. Navigating to super-admin page...');

  try {
    // First, go to super-admin directly to see what happens
    const response = await page.goto('http://localhost:3008/super-admin', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('2. Response status:', response?.status());
    console.log('3. Current URL:', page.url());

    // Take a screenshot
    await page.screenshot({ path: '/tmp/super-admin-test.png', fullPage: true });
    console.log('4. Screenshot saved to /tmp/super-admin-test.png');

    // Check page content
    const pageContent = await page.content();

    // Check for sidebar
    const hasSidebar = await page.locator('aside').count();
    console.log('5. Number of aside elements (sidebars):', hasSidebar);

    // Check for navigation items
    const hasNav = await page.locator('nav').count();
    console.log('6. Number of nav elements:', hasNav);

    // Check for specific layout elements
    const hasHeader = await page.locator('header').count();
    console.log('7. Number of header elements:', hasHeader);

    // Check if it redirected to login
    if (page.url().includes('/auth/login')) {
      console.log('8. Page redirected to login - need to authenticate first');
    }

    // Check for loading spinner
    const hasSpinner = await page.locator('.animate-spin').count();
    console.log('9. Loading spinners:', hasSpinner);

    // Check body classes
    const bodyClasses = await page.locator('body').getAttribute('class');
    console.log('10. Body classes:', bodyClasses);

    // Print first 500 chars of HTML
    console.log('11. Page HTML preview:', pageContent.substring(0, 1000));

  } catch (error) {
    console.error('Error:', error);
  }

  await browser.close();
}

testSuperAdmin();
