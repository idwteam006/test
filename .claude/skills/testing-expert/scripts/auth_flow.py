#!/usr/bin/env python3
"""
Authentication flow testing script for Next.js applications.
Tests login, logout, session management, and protected routes.

Usage:
    python scripts/auth_flow.py --url https://your-app.com --email test@test.com --password pass123
    python scripts/auth_flow.py --url http://localhost:3000 --config auth_config.json
    python scripts/auth_flow.py --help
"""

import argparse
import json
import sys
import time
from typing import Dict, Any, Optional, List

try:
    from playwright.sync_api import sync_playwright, Page, BrowserContext
except ImportError:
    print("Error: Playwright is required. Install with: pip install playwright")
    print("Then run: playwright install chromium")
    sys.exit(1)


class AuthFlowTester:
    def __init__(
        self,
        base_url: str,
        login_url: str = '/login',
        logout_selector: str = '[data-testid="logout"], button:has-text("Logout"), button:has-text("Sign out")',
        dashboard_url: str = '/dashboard',
        session_cookie_name: str = 'session'
    ):
        self.base_url = base_url.rstrip('/')
        self.login_url = login_url
        self.logout_selector = logout_selector
        self.dashboard_url = dashboard_url
        self.session_cookie_name = session_cookie_name
        self.results = []

    def _log(self, message: str, status: str = 'info'):
        icons = {'pass': '✅', 'fail': '❌', 'info': 'ℹ️', 'warn': '⚠️'}
        icon = icons.get(status, '')
        print(f"  {icon} {message}")

    def _add_result(self, test_name: str, passed: bool, details: str = ''):
        self.results.append({
            'test': test_name,
            'passed': passed,
            'details': details,
            'timestamp': time.strftime('%H:%M:%S')
        })

    def test_login_page_loads(self, page: Page) -> bool:
        """Test that login page loads correctly."""
        test_name = "Login Page Loads"
        try:
            page.goto(f"{self.base_url}{self.login_url}", wait_until='networkidle')

            # Check for common login form elements
            has_email = page.locator('input[type="email"], input[name="email"], input[id="email"]').count() > 0
            has_password = page.locator('input[type="password"]').count() > 0
            has_submit = page.locator('button[type="submit"], input[type="submit"]').count() > 0

            if has_email and has_password and has_submit:
                self._log("Login form elements found", 'pass')
                self._add_result(test_name, True, "Form elements present")
                return True
            else:
                missing = []
                if not has_email:
                    missing.append('email field')
                if not has_password:
                    missing.append('password field')
                if not has_submit:
                    missing.append('submit button')
                self._log(f"Missing: {', '.join(missing)}", 'fail')
                self._add_result(test_name, False, f"Missing: {', '.join(missing)}")
                return False
        except Exception as e:
            self._log(f"Error: {e}", 'fail')
            self._add_result(test_name, False, str(e))
            return False

    def test_login_with_credentials(
        self,
        page: Page,
        context: BrowserContext,
        email: str,
        password: str,
        expected_redirect: Optional[str] = None
    ) -> bool:
        """Test login with provided credentials."""
        test_name = "Login with Credentials"
        try:
            page.goto(f"{self.base_url}{self.login_url}", wait_until='networkidle')

            # Fill login form
            email_field = page.locator('input[type="email"], input[name="email"], input[id="email"]').first
            password_field = page.locator('input[type="password"]').first

            email_field.fill(email)
            password_field.fill(password)

            # Submit
            page.locator('button[type="submit"], input[type="submit"]').first.click()

            # Wait for navigation
            page.wait_for_load_state('networkidle', timeout=10000)

            # Check if redirected away from login
            current_url = page.url
            if self.login_url not in current_url:
                self._log(f"Redirected to: {current_url}", 'pass')

                # Check for session cookie
                cookies = context.cookies()
                session_cookie = next(
                    (c for c in cookies if self.session_cookie_name in c['name'].lower() or 'token' in c['name'].lower()),
                    None
                )

                if session_cookie:
                    self._log("Session cookie set", 'pass')
                    self._add_result(test_name, True, f"Logged in, redirected to {current_url}")
                    return True
                else:
                    self._log("Session cookie not found (may use different auth method)", 'warn')
                    self._add_result(test_name, True, "Logged in, no session cookie (check auth method)")
                    return True
            else:
                # Still on login page - check for error message
                error_elem = page.locator('[role="alert"], .error, .error-message, [data-testid="error"]').first
                if error_elem.is_visible():
                    error_text = error_elem.inner_text()
                    self._log(f"Login failed: {error_text}", 'fail')
                    self._add_result(test_name, False, f"Error: {error_text}")
                else:
                    self._log("Login failed - still on login page", 'fail')
                    self._add_result(test_name, False, "No redirect occurred")
                return False

        except Exception as e:
            self._log(f"Error: {e}", 'fail')
            self._add_result(test_name, False, str(e))
            return False

    def test_protected_route_access(
        self,
        page: Page,
        protected_routes: List[str]
    ) -> bool:
        """Test that protected routes are accessible after login."""
        test_name = "Protected Route Access"
        all_passed = True

        for route in protected_routes:
            try:
                page.goto(f"{self.base_url}{route}", wait_until='networkidle')
                current_url = page.url

                if self.login_url in current_url:
                    self._log(f"{route}: Redirected to login (not authorized)", 'fail')
                    all_passed = False
                else:
                    self._log(f"{route}: Accessible", 'pass')

            except Exception as e:
                self._log(f"{route}: Error - {e}", 'fail')
                all_passed = False

        self._add_result(test_name, all_passed, f"Tested {len(protected_routes)} routes")
        return all_passed

    def test_logout(self, page: Page, context: BrowserContext) -> bool:
        """Test logout functionality."""
        test_name = "Logout"
        try:
            # Try to find and click logout
            logout_elem = page.locator(self.logout_selector).first

            if logout_elem.is_visible():
                logout_elem.click()
                page.wait_for_load_state('networkidle', timeout=10000)

                # Check if redirected to login or home
                current_url = page.url
                cookies = context.cookies()
                session_cookie = next(
                    (c for c in cookies if self.session_cookie_name in c['name'].lower()),
                    None
                )

                if session_cookie is None or not session_cookie.get('value'):
                    self._log("Session cleared", 'pass')

                if self.login_url in current_url or current_url == f"{self.base_url}/":
                    self._log(f"Redirected to: {current_url}", 'pass')
                    self._add_result(test_name, True, "Logged out successfully")
                    return True
                else:
                    self._log(f"Unexpected redirect: {current_url}", 'warn')
                    self._add_result(test_name, True, f"Logged out, redirected to {current_url}")
                    return True
            else:
                self._log("Logout button not found", 'fail')
                self._add_result(test_name, False, "Logout button not visible")
                return False

        except Exception as e:
            self._log(f"Error: {e}", 'fail')
            self._add_result(test_name, False, str(e))
            return False

    def test_unauthenticated_redirect(self, page: Page) -> bool:
        """Test that protected routes redirect unauthenticated users."""
        test_name = "Unauthenticated Redirect"
        try:
            page.goto(f"{self.base_url}{self.dashboard_url}", wait_until='networkidle')
            current_url = page.url

            if self.login_url in current_url:
                self._log("Correctly redirected to login", 'pass')
                self._add_result(test_name, True, "Protected route redirects to login")
                return True
            else:
                self._log(f"Not redirected (at {current_url})", 'fail')
                self._add_result(test_name, False, "Protected route accessible without auth")
                return False

        except Exception as e:
            self._log(f"Error: {e}", 'fail')
            self._add_result(test_name, False, str(e))
            return False

    def test_invalid_credentials(self, page: Page, email: str = 'invalid@test.com', password: str = 'wrongpass') -> bool:
        """Test login with invalid credentials shows error."""
        test_name = "Invalid Credentials Handling"
        try:
            page.goto(f"{self.base_url}{self.login_url}", wait_until='networkidle')

            email_field = page.locator('input[type="email"], input[name="email"], input[id="email"]').first
            password_field = page.locator('input[type="password"]').first

            email_field.fill(email)
            password_field.fill(password)
            page.locator('button[type="submit"], input[type="submit"]').first.click()

            page.wait_for_timeout(2000)

            # Should still be on login page
            if self.login_url in page.url:
                # Check for error message
                error_visible = page.locator('[role="alert"], .error, .error-message, [data-testid="error"]').is_visible()
                if error_visible:
                    self._log("Error message displayed for invalid credentials", 'pass')
                    self._add_result(test_name, True, "Error shown for invalid login")
                    return True
                else:
                    self._log("Stayed on login page but no error shown", 'warn')
                    self._add_result(test_name, True, "Login rejected, no error message visible")
                    return True
            else:
                self._log("Invalid credentials allowed login!", 'fail')
                self._add_result(test_name, False, "Security issue: invalid credentials accepted")
                return False

        except Exception as e:
            self._log(f"Error: {e}", 'fail')
            self._add_result(test_name, False, str(e))
            return False

    def run_full_test(
        self,
        email: str,
        password: str,
        protected_routes: List[str] = None
    ) -> Dict[str, Any]:
        """Run complete authentication flow test."""
        if protected_routes is None:
            protected_routes = [self.dashboard_url]

        print(f"\n{'='*60}")
        print("AUTHENTICATION FLOW TEST")
        print(f"{'='*60}")
        print(f"Base URL: {self.base_url}")
        print(f"Login URL: {self.login_url}")

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={'width': 1920, 'height': 1080})
            page = context.new_page()

            print(f"\n[Test 1] Login Page")
            self.test_login_page_loads(page)

            print(f"\n[Test 2] Unauthenticated Redirect")
            self.test_unauthenticated_redirect(page)

            print(f"\n[Test 3] Invalid Credentials")
            self.test_invalid_credentials(page)

            print(f"\n[Test 4] Valid Login")
            login_success = self.test_login_with_credentials(page, context, email, password)

            if login_success:
                print(f"\n[Test 5] Protected Routes Access")
                self.test_protected_route_access(page, protected_routes)

                print(f"\n[Test 6] Logout")
                self.test_logout(page, context)

            browser.close()

        # Summary
        passed = sum(1 for r in self.results if r['passed'])
        failed = len(self.results) - passed

        print(f"\n{'='*60}")
        print("SUMMARY")
        print(f"{'='*60}")
        print(f"Total tests: {len(self.results)}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")

        for r in self.results:
            icon = '✅' if r['passed'] else '❌'
            print(f"  {icon} {r['test']}: {r['details']}")

        return {
            'total': len(self.results),
            'passed': passed,
            'failed': failed,
            'results': self.results
        }


def main():
    parser = argparse.ArgumentParser(
        description='Test authentication flows for Next.js applications',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument('--url', required=True, help='Base URL')
    parser.add_argument('--email', help='Test user email')
    parser.add_argument('--password', help='Test user password')
    parser.add_argument('--login-url', default='/login', help='Login page path')
    parser.add_argument('--dashboard-url', default='/dashboard', help='Dashboard/protected page path')
    parser.add_argument('--protected-routes', help='Comma-separated list of protected routes to test')
    parser.add_argument('--config', help='Path to JSON config file')
    parser.add_argument('--output', help='Path to save JSON results')

    args = parser.parse_args()

    # Load config if provided
    if args.config:
        with open(args.config, 'r') as f:
            config = json.load(f)
        email = config.get('email', args.email)
        password = config.get('password', args.password)
        login_url = config.get('login_url', args.login_url)
        dashboard_url = config.get('dashboard_url', args.dashboard_url)
        protected_routes = config.get('protected_routes', [])
    else:
        email = args.email
        password = args.password
        login_url = args.login_url
        dashboard_url = args.dashboard_url
        protected_routes = args.protected_routes.split(',') if args.protected_routes else [dashboard_url]

    if not email or not password:
        print("Error: Email and password are required")
        print("Provide via --email/--password or --config file")
        sys.exit(1)

    tester = AuthFlowTester(
        base_url=args.url,
        login_url=login_url,
        dashboard_url=dashboard_url
    )

    results = tester.run_full_test(email, password, protected_routes)

    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to: {args.output}")

    sys.exit(0 if results['failed'] == 0 else 1)


if __name__ == '__main__':
    main()