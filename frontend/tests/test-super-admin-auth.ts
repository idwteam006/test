import { chromium } from '@playwright/test';

async function testSuperAdminWithAuth() {
  const browser = await chromium.launch({ headless: false }); // Set to false to see the browser
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('=== Super Admin Navigation Test ===\n');

  try {
    // Step 1: Go to login page
    console.log('1. Going to login page...');
    await page.goto('http://localhost:3008/auth/login', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log('   Current URL:', page.url());

    // Take screenshot of login page
    await page.screenshot({ path: '/tmp/step1-login.png', fullPage: true });
    console.log('   Screenshot: /tmp/step1-login.png');

    // Step 2: Enter email address (you'll need to use a valid admin email)
    console.log('\n2. Looking for email input...');
    const emailInput = page.locator('input[type="email"]');
    const emailInputCount = await emailInput.count();
    console.log('   Found email inputs:', emailInputCount);

    if (emailInputCount > 0) {
      // Use the admin email - you'll need to replace this with your actual admin email
      await emailInput.fill('admin@zenora.ai');
      console.log('   Filled email: admin@zenora.ai');

      // Look for submit button
      const submitBtn = page.locator('button[type="submit"]');
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
        console.log('   Clicked submit button');
        await page.waitForTimeout(3000);
      }
    }

    await page.screenshot({ path: '/tmp/step2-after-email.png', fullPage: true });
    console.log('   Screenshot: /tmp/step2-after-email.png');
    console.log('   Current URL:', page.url());

    // Check what's on the page now
    console.log('\n3. Current page state...');
    const pageContent = await page.content();

    // Check for code input (OTP)
    const codeInputs = await page.locator('input[type="text"], input[inputmode="numeric"]').count();
    console.log('   Code/OTP inputs found:', codeInputs);

    // Check for any error messages
    const hasError = pageContent.includes('error') || pageContent.includes('Error');
    console.log('   Has error content:', hasError);

    // Print page title and URL
    console.log('   Page title:', await page.title());

    // Wait a bit to let user see the state
    await page.waitForTimeout(5000);

    await page.screenshot({ path: '/tmp/step3-final.png', fullPage: true });
    console.log('   Screenshot: /tmp/step3-final.png');

    console.log('\n=== Test Complete ===');
    console.log('Note: To fully test super-admin, you need to:');
    console.log('1. Enter a valid admin email');
    console.log('2. Retrieve the OTP code from your email');
    console.log('3. Enter the OTP to complete login');
    console.log('4. Navigate to /super-admin');

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: '/tmp/error-state.png', fullPage: true });
  }

  // Keep browser open for manual inspection
  console.log('\nBrowser will close in 30 seconds...');
  await page.waitForTimeout(30000);

  await browser.close();
}

testSuperAdminWithAuth();
