import { chromium } from '@playwright/test';

async function testSuperAdminComplete() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('=== Super Admin Complete Test ===\n');

  try {
    // Step 1: Go to login page
    console.log('1. Going to login page...');
    await page.goto('http://localhost:3008/auth/login', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Step 2: Click on admin@demo.com demo account
    console.log('2. Clicking on admin@demo.com demo account...');
    await page.click('text=admin@demo.com');
    await page.waitForTimeout(2000);

    // Step 3: Check if OTP input appears or auto-fills
    console.log('3. Looking for OTP input...');
    await page.screenshot({ path: '/tmp/step3-otp.png', fullPage: true });

    // The OTP in dev mode is 123456, try to enter it
    const otpInputs = await page.locator('input').all();
    console.log('   Found', otpInputs.length, 'input fields');

    // Wait for any OTP field to appear
    await page.waitForTimeout(3000);

    // Check current URL
    console.log('   Current URL:', page.url());
    await page.screenshot({ path: '/tmp/step4-after-demo-click.png', fullPage: true });

    // If we're on verify page, enter the OTP
    if (page.url().includes('verify') || await page.locator('input[maxlength="1"]').count() > 0) {
      console.log('4. Entering OTP code 123456...');
      // Try to enter OTP - could be 6 separate inputs or one field
      const singleInputs = await page.locator('input[maxlength="1"]').all();
      if (singleInputs.length === 6) {
        for (let i = 0; i < 6; i++) {
          await singleInputs[i].fill(String(i + 1));
        }
      } else {
        // Try a single OTP input
        const otpField = page.locator('input[type="text"]').first();
        if (await otpField.count() > 0) {
          await otpField.fill('123456');
        }
      }
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: '/tmp/step5-after-otp.png', fullPage: true });
    console.log('5. Current URL after OTP:', page.url());

    // Step 6: Navigate to super-admin
    console.log('6. Navigating to super-admin...');
    await page.goto('http://localhost:3008/super-admin', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(3000);
    console.log('   Current URL:', page.url());
    await page.screenshot({ path: '/tmp/step6-super-admin.png', fullPage: true });

    // Check for sidebar
    const hasSidebar = await page.locator('aside').count();
    console.log('   Sidebar count:', hasSidebar);

    const hasNav = await page.locator('nav').count();
    console.log('   Nav count:', hasNav);

    const hasHeader = await page.locator('header').count();
    console.log('   Header count:', hasHeader);

    // Check for navigation items
    const navButtons = await page.locator('aside button').count();
    console.log('   Navigation buttons in sidebar:', navButtons);

    // Check for "Super Admin" text
    const hasSuperAdminText = await page.locator('text=Super Admin').count();
    console.log('   "Super Admin" text occurrences:', hasSuperAdminText);

    // Final screenshot
    await page.screenshot({ path: '/tmp/final-super-admin.png', fullPage: true });
    console.log('\n=== Screenshots saved to /tmp/ ===');

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: '/tmp/error-state.png', fullPage: true });
  }

  console.log('\nBrowser will close in 60 seconds for inspection...');
  await page.waitForTimeout(60000);
  await browser.close();
}

testSuperAdminComplete();
