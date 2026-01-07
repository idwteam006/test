import { chromium } from '@playwright/test';

async function testLoginAndSuperAdmin() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('=== Login and Super Admin Test ===\n');

  try {
    // Step 1: Go to login page
    console.log('1. Going to login page...');
    await page.goto('http://localhost:3008/auth/login', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Step 2: Enter email
    console.log('2. Entering email: nbhupathi@gmail.com');
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill('nbhupathi@gmail.com');

    // Click Sign In button
    const signInBtn = page.locator('button:has-text("Sign In")');
    await signInBtn.click();
    console.log('   Clicked Sign In');

    // Wait for navigation to verify page
    await page.waitForURL('**/auth/verify**', { timeout: 15000 });
    console.log('   Redirected to verify page:', page.url());

    // Step 3: Wait for OTP inputs to load
    console.log('3. Waiting for OTP inputs...');

    // Wait for the OTP input container to be visible
    await page.waitForSelector('input[inputmode="numeric"]', { timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/login-step3-otp.png', fullPage: true });

    // Check for 6 individual OTP inputs (they use inputMode="numeric" and maxLength={1})
    const otpInputs = await page.locator('input[inputmode="numeric"][maxlength="1"]').all();
    console.log('   Found', otpInputs.length, 'OTP input fields');

    if (otpInputs.length === 6) {
      console.log('   Entering OTP: 123456');
      const otp = '123456';
      for (let i = 0; i < 6; i++) {
        await otpInputs[i].focus();
        await otpInputs[i].fill(otp[i]);
        await page.waitForTimeout(150);
      }
      console.log('   OTP entered successfully');
    } else {
      console.log('   Could not find 6 OTP inputs, trying alternative...');
      // Try text inputs
      const textInputs = await page.locator('input[type="text"]').all();
      console.log('   Found', textInputs.length, 'text inputs');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/login-step4-after-otp.png', fullPage: true });
    console.log('4. Current URL after OTP:', page.url());

    // Step 5: Wait for auto-submit or click Verify button
    console.log('5. Waiting for login completion...');

    // The form auto-submits when all 6 digits are entered
    // Wait for redirect or click verify button as backup
    await page.waitForTimeout(3000);

    const verifyBtn = page.locator('button:has-text("Verify")');
    if (await verifyBtn.count() > 0 && await verifyBtn.isVisible()) {
      console.log('   Clicking Verify button...');
      await verifyBtn.click();
    }

    // Wait for redirect after successful login
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/login-step5-after.png', fullPage: true });
    console.log('   Current URL:', page.url());

    // Step 6: Navigate to super-admin (or check if already there)
    if (!page.url().includes('super-admin')) {
      console.log('6. Navigating to /super-admin...');
      await page.goto('http://localhost:3008/super-admin', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
    } else {
      console.log('6. Already on super-admin page');
    }

    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/super-admin-final.png', fullPage: true });
    console.log('   Current URL:', page.url());

    // Check for layout elements
    const hasSidebar = await page.locator('aside').count();
    const hasNav = await page.locator('nav').count();
    const hasHeader = await page.locator('header').count();

    console.log('\n=== Layout Check ===');
    console.log('   Sidebar (aside):', hasSidebar);
    console.log('   Navigation (nav):', hasNav);
    console.log('   Header:', hasHeader);

    // Check for specific text
    const superAdminText = await page.locator('text=Super Admin').count();
    const dashboardText = await page.locator('text=Dashboard').count();
    const tenantsText = await page.locator('text=Tenants').count();
    console.log('   "Super Admin" text:', superAdminText);
    console.log('   "Dashboard" text:', dashboardText);
    console.log('   "Tenants" text:', tenantsText);

    // Check for navigation buttons
    const navButtons = await page.locator('aside button').count();
    console.log('   Navigation buttons in sidebar:', navButtons);

    console.log('\n=== Screenshots saved ===');
    console.log('   /tmp/login-step3-otp.png');
    console.log('   /tmp/login-step4-after-otp.png');
    console.log('   /tmp/login-step5-after.png');
    console.log('   /tmp/super-admin-final.png');

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: '/tmp/error.png', fullPage: true });
  }

  console.log('\nBrowser will stay open for 60 seconds...');
  await page.waitForTimeout(60000);
  await browser.close();
}

testLoginAndSuperAdmin();
