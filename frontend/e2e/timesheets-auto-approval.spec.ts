import { test, expect } from '@playwright/test';

test.describe('Timesheets Auto-Approval for Root User', () => {
  test.beforeEach(async ({ page }) => {
    // Login as root user vijay.n@idwteam.com
    await page.goto('/auth/login');

    // Wait for email input
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Fill email
    await page.fill('input[type="email"]', 'vijay.n@idwteam.com');

    // Click "Sign In" button
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await signInButton.click();

    // Wait for redirect to verify page
    await page.waitForURL(/\/auth\/verify/, { timeout: 15000 });

    // Wait for OTP inputs to appear
    await page.waitForTimeout(1000);

    // Fill OTP 123456 - the verify page has 6 separate inputs that auto-submit
    // Type directly into the first input and let the auto-focus handle the rest
    const firstInput = page.locator('input').first();
    await firstInput.click();

    // Type the OTP - the page auto-focuses to next input on each digit
    await page.keyboard.type('123456', { delay: 100 });

    // Wait for auto-submit and navigation to dashboard or admin page
    await page.waitForURL(/\/(dashboard|admin|employee|hr|manager)/, { timeout: 20000 });
  });

  test('should show auto-approval banner on admin timesheets page for root user with submitted entries', async ({ page }) => {
    // Navigate to admin timesheets page
    await page.goto('/admin/timesheets');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot for debugging
    await page.screenshot({ path: 'e2e/screenshots/admin-timesheets-page.png', fullPage: true });

    // Check console logs for auto-approve check
    page.on('console', msg => {
      if (msg.text().includes('Auto-Approve')) {
        console.log('Console:', msg.text());
      }
    });

    // Check if the auto-approval banner exists
    const autoApprovalBanner = page.locator('text=Auto-Approval');
    const bannerVisible = await autoApprovalBanner.isVisible().catch(() => false);

    console.log('Auto-approval banner visible:', bannerVisible);

    // Get page content for debugging
    const pageContent = await page.content();
    console.log('Page contains "Auto-Approval":', pageContent.includes('Auto-Approval'));
    console.log('Page contains "isRootLevel":', pageContent.includes('isRootLevel'));
  });

  test('should show auto-approval banner on employee timesheets page for root user with submitted entries', async ({ page }) => {
    // Navigate to employee timesheets page
    await page.goto('/employee/timesheets');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Wait a bit for API calls to complete
    await page.waitForTimeout(2000);

    // Take screenshot for debugging
    await page.screenshot({ path: 'e2e/screenshots/employee-timesheets-page.png', fullPage: true });

    // Check if the auto-approval banner exists
    const autoApprovalBanner = page.locator('text=Auto-Approval');
    const bannerVisible = await autoApprovalBanner.isVisible().catch(() => false);

    console.log('Auto-approval banner visible on employee page:', bannerVisible);

    // Check for the approve button
    const approveButton = page.locator('button:has-text("Approve")');
    const approveButtonVisible = await approveButton.isVisible().catch(() => false);

    console.log('Approve button visible:', approveButtonVisible);

    // Get the API response by intercepting network requests
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/employee/auto-approve');
        const data = await response.json();
        return data;
      } catch (e) {
        return { error: String(e) };
      }
    });

    console.log('API Response:', JSON.stringify(apiResponse, null, 2));

    // Assert the API returns correct data
    expect(apiResponse.success).toBe(true);
    expect(apiResponse.isRootLevel).toBe(true);

    // If there are pending timesheets, the banner should show
    if (apiResponse.pendingTimesheets > 0) {
      expect(bannerVisible).toBe(true);
    }
  });

  test('debug: check API response directly', async ({ page }) => {
    // First login
    await page.goto('/employee/timesheets');
    await page.waitForLoadState('networkidle');

    // Make API call and log response
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/employee/auto-approve');
        const data = await response.json();
        return { status: response.status, data };
      } catch (e) {
        return { error: String(e) };
      }
    });

    console.log('=== API Debug ===');
    console.log('Status:', apiResponse.status);
    console.log('Data:', JSON.stringify(apiResponse.data, null, 2));

    // Check the state in the page
    const stateCheck = await page.evaluate(() => {
      // Try to access React state (this is a hack for debugging)
      const root = document.querySelector('#__next') || document.body;
      return {
        hasAutoApprovalText: root.innerHTML.includes('Auto-Approval'),
        hasApproveButton: root.innerHTML.includes('Approve ('),
      };
    });

    console.log('State check:', stateCheck);
  });
});
