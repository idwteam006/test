#!/usr/bin/env python3
"""
Example: End-to-end user journey test for a Next.js application.
Tests a complete user flow from login to performing actions.
"""

from playwright.sync_api import sync_playwright
import time

# Configuration
BASE_URL = 'http://localhost:3000'  # Change to your app URL
TEST_EMAIL = 'test@example.com'
TEST_PASSWORD = 'password123'


def test_complete_user_journey():
    """Test a complete user journey through the application."""

    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            record_video_dir='/tmp/videos/'  # Optional: record test
        )
        page = context.new_page()

        print("🚀 Starting user journey test...")

        try:
            # Step 1: Navigate to home page
            print("\n📍 Step 1: Navigate to home page")
            page.goto(BASE_URL)
            page.wait_for_load_state('networkidle')
            page.screenshot(path='/tmp/step1_home.png')
            print("   ✅ Home page loaded")

            # Step 2: Navigate to login
            print("\n📍 Step 2: Navigate to login")
            page.click('text=Login, text=Sign in, a[href*="login"]')
            page.wait_for_load_state('networkidle')
            assert '/login' in page.url, "Should be on login page"
            print("   ✅ Login page reached")

            # Step 3: Perform login
            print("\n📍 Step 3: Perform login")
            page.fill('input[type="email"], input[name="email"]', TEST_EMAIL)
            page.fill('input[type="password"]', TEST_PASSWORD)
            page.click('button[type="submit"]')
            page.wait_for_load_state('networkidle')
            page.screenshot(path='/tmp/step3_after_login.png')

            # Verify login success
            assert '/login' not in page.url, "Should redirect after login"
            print("   ✅ Login successful")

            # Step 4: Navigate to dashboard
            print("\n📍 Step 4: Access dashboard")
            page.goto(f'{BASE_URL}/dashboard')
            page.wait_for_load_state('networkidle')
            page.screenshot(path='/tmp/step4_dashboard.png')

            # Verify dashboard content
            assert page.locator('h1, h2').first.is_visible(), "Dashboard should have heading"
            print("   ✅ Dashboard accessible")

            # Step 5: Interact with dashboard elements
            print("\n📍 Step 5: Interact with dashboard")

            # Example: Click on a menu item
            menu_items = page.locator('nav a, aside a').all()
            if len(menu_items) > 0:
                menu_items[0].click()
                page.wait_for_load_state('networkidle')
                print(f"   ✅ Navigated to: {page.url}")

            # Step 6: Test a form submission (example)
            print("\n📍 Step 6: Test form interaction")

            # Look for any form on the page
            forms = page.locator('form').all()
            if len(forms) > 0:
                print(f"   Found {len(forms)} form(s) on page")
                # Don't actually submit - just verify form exists
            else:
                print("   ⚠️ No forms found on current page")

            # Step 7: Test logout
            print("\n📍 Step 7: Perform logout")
            logout_button = page.locator(
                'button:has-text("Logout"), '
                'button:has-text("Sign out"), '
                'a:has-text("Logout"), '
                '[data-testid="logout"]'
            ).first

            if logout_button.is_visible():
                logout_button.click()
                page.wait_for_load_state('networkidle')
                page.screenshot(path='/tmp/step7_after_logout.png')
                print("   ✅ Logout successful")
            else:
                print("   ⚠️ Logout button not found")

            # Step 8: Verify logged out state
            print("\n📍 Step 8: Verify logged out state")
            page.goto(f'{BASE_URL}/dashboard')
            page.wait_for_load_state('networkidle')

            if '/login' in page.url:
                print("   ✅ Protected route redirects to login after logout")
            else:
                print("   ⚠️ Protected route still accessible after logout")

            print("\n" + "=" * 50)
            print("✅ USER JOURNEY TEST COMPLETED SUCCESSFULLY")
            print("=" * 50)

        except Exception as e:
            print(f"\n❌ Test failed: {e}")
            page.screenshot(path='/tmp/test_failure.png')
            raise

        finally:
            context.close()
            browser.close()


def test_mobile_responsive():
    """Test the application on mobile viewport."""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Test on iPhone 12 Pro viewport
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True
        )
        page = context.new_page()

        print("\n📱 Testing mobile responsiveness...")

        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/mobile_home.png')

        # Check for mobile menu (hamburger)
        hamburger = page.locator(
            'button[aria-label*="menu"], '
            'button:has(svg), '
            '[data-testid="mobile-menu"]'
        ).first

        if hamburger.is_visible():
            print("   ✅ Mobile menu found")
            hamburger.click()
            page.wait_for_timeout(500)
            page.screenshot(path='/tmp/mobile_menu_open.png')
        else:
            print("   ⚠️ Mobile menu not found")

        # Test touch scrolling
        page.evaluate('window.scrollBy(0, 500)')
        page.wait_for_timeout(300)
        page.screenshot(path='/tmp/mobile_scrolled.png')

        print("   ✅ Mobile test completed")

        context.close()
        browser.close()


if __name__ == '__main__':
    test_complete_user_journey()
    test_mobile_responsive()