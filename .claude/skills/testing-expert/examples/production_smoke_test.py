#!/usr/bin/env python3
"""
Example: Production smoke test for Next.js application.
Quick validation that critical paths work after deployment.
"""

import sys
import time
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from typing import List, Tuple, Dict, Any

try:
    from playwright.sync_api import sync_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False
    print("⚠️ Playwright not installed - running API-only tests")


# Configuration - Update these for your application
BASE_URL = 'https://your-app.com'  # Change to your production URL

# Critical endpoints to check
HEALTH_ENDPOINTS = [
    ('Health Check', '/api/health', 200),
    ('Home Page', '/', 200),
    ('Login Page', '/login', 200),
]

# Critical user flows to test (requires Playwright)
CRITICAL_FLOWS = [
    'login_flow',
    'dashboard_access',
    'api_response',
]


def test_endpoint(url: str, expected_status: int = 200) -> Tuple[bool, int, float]:
    """Test a single endpoint and return (passed, status, response_time)."""
    start = time.time()
    try:
        request = Request(url, headers={'User-Agent': 'SmokeTest/1.0'})
        with urlopen(request, timeout=30) as response:
            elapsed = time.time() - start
            return (response.status == expected_status, response.status, elapsed)
    except HTTPError as e:
        elapsed = time.time() - start
        return (e.code == expected_status, e.code, elapsed)
    except URLError as e:
        elapsed = time.time() - start
        return (False, 0, elapsed)
    except Exception as e:
        return (False, 0, time.time() - start)


def run_health_checks(base_url: str) -> Dict[str, Any]:
    """Run health checks on critical endpoints."""
    print("\n" + "=" * 60)
    print("HEALTH CHECK TESTS")
    print("=" * 60)

    results = []
    all_passed = True

    for name, path, expected in HEALTH_ENDPOINTS:
        url = f"{base_url.rstrip('/')}{path}"
        passed, status, response_time = test_endpoint(url, expected)

        results.append({
            'name': name,
            'url': url,
            'passed': passed,
            'expected': expected,
            'actual': status,
            'response_time': response_time
        })

        icon = '✅' if passed else '❌'
        print(f"{icon} {name}: {status} ({response_time:.2f}s)")

        if not passed:
            all_passed = False

    return {
        'type': 'health_checks',
        'passed': all_passed,
        'results': results
    }


def run_browser_tests(base_url: str) -> Dict[str, Any]:
    """Run browser-based smoke tests."""
    if not HAS_PLAYWRIGHT:
        return {
            'type': 'browser_tests',
            'passed': None,
            'skipped': True,
            'reason': 'Playwright not installed'
        }

    print("\n" + "=" * 60)
    print("BROWSER SMOKE TESTS")
    print("=" * 60)

    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        # Test 1: Home page loads
        print("\n[Test] Home page loads and renders")
        try:
            page.goto(base_url, wait_until='networkidle', timeout=30000)
            page.screenshot(path='/tmp/smoke_home.png')

            # Check for critical elements
            has_content = page.locator('body').inner_text().strip() != ''
            has_no_error = 'error' not in page.title().lower()

            passed = has_content and has_no_error
            results.append({
                'name': 'Home Page Render',
                'passed': passed,
                'details': 'Page loaded and rendered correctly'
            })
            print(f"   {'✅' if passed else '❌'} Home page rendered")

        except Exception as e:
            results.append({
                'name': 'Home Page Render',
                'passed': False,
                'details': str(e)
            })
            print(f"   ❌ Error: {e}")

        # Test 2: JavaScript loads (no console errors)
        print("\n[Test] No critical JavaScript errors")
        console_errors = []

        def handle_console(msg):
            if msg.type == 'error':
                console_errors.append(msg.text)

        page.on('console', handle_console)
        page.goto(base_url, wait_until='networkidle')
        page.wait_for_timeout(2000)  # Wait for any async errors

        js_passed = len(console_errors) == 0
        results.append({
            'name': 'No JS Errors',
            'passed': js_passed,
            'details': f"{len(console_errors)} console errors" if console_errors else "No errors"
        })
        print(f"   {'✅' if js_passed else '❌'} Console errors: {len(console_errors)}")

        # Test 3: Login page accessible
        print("\n[Test] Login page accessible")
        try:
            page.goto(f"{base_url}/login", wait_until='networkidle')

            has_form = page.locator('form, input[type="email"], input[type="password"]').count() > 0
            results.append({
                'name': 'Login Page',
                'passed': has_form,
                'details': 'Login form found' if has_form else 'Login form not found'
            })
            print(f"   {'✅' if has_form else '❌'} Login form present")

        except Exception as e:
            results.append({
                'name': 'Login Page',
                'passed': False,
                'details': str(e)
            })
            print(f"   ❌ Error: {e}")

        # Test 4: API route responds
        print("\n[Test] API route responds")
        try:
            response = page.request.get(f"{base_url}/api/health")
            api_passed = response.status == 200
            results.append({
                'name': 'API Health',
                'passed': api_passed,
                'details': f"Status: {response.status}"
            })
            print(f"   {'✅' if api_passed else '❌'} API status: {response.status}")

        except Exception as e:
            results.append({
                'name': 'API Health',
                'passed': False,
                'details': str(e)
            })
            print(f"   ❌ Error: {e}")

        # Test 5: Page performance
        print("\n[Test] Page load performance")
        try:
            start = time.time()
            page.goto(base_url, wait_until='load')
            load_time = time.time() - start

            perf_passed = load_time < 5.0  # Should load in under 5 seconds
            results.append({
                'name': 'Page Performance',
                'passed': perf_passed,
                'details': f"Load time: {load_time:.2f}s"
            })
            print(f"   {'✅' if perf_passed else '❌'} Load time: {load_time:.2f}s")

        except Exception as e:
            results.append({
                'name': 'Page Performance',
                'passed': False,
                'details': str(e)
            })
            print(f"   ❌ Error: {e}")

        browser.close()

    all_passed = all(r['passed'] for r in results)
    return {
        'type': 'browser_tests',
        'passed': all_passed,
        'results': results
    }


def generate_report(health_results: Dict, browser_results: Dict) -> Dict[str, Any]:
    """Generate a combined report."""
    report = {
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'base_url': BASE_URL,
        'health_checks': health_results,
        'browser_tests': browser_results,
        'overall_passed': health_results['passed'] and (
            browser_results.get('passed') is not False
        )
    }

    return report


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Production smoke test')
    parser.add_argument('--url', default=BASE_URL, help='Base URL to test')
    parser.add_argument('--output', help='Path to save JSON report')
    parser.add_argument('--skip-browser', action='store_true', help='Skip browser tests')

    args = parser.parse_args()

    print("\n" + "=" * 60)
    print("PRODUCTION SMOKE TEST")
    print("=" * 60)
    print(f"URL: {args.url}")
    print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")

    # Run health checks
    health_results = run_health_checks(args.url)

    # Run browser tests
    if args.skip_browser:
        browser_results = {'type': 'browser_tests', 'passed': None, 'skipped': True}
    else:
        browser_results = run_browser_tests(args.url)

    # Generate report
    report = generate_report(health_results, browser_results)

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    health_pass = sum(1 for r in health_results['results'] if r['passed'])
    health_total = len(health_results['results'])
    print(f"Health Checks: {health_pass}/{health_total} passed")

    if not browser_results.get('skipped'):
        browser_pass = sum(1 for r in browser_results.get('results', []) if r['passed'])
        browser_total = len(browser_results.get('results', []))
        print(f"Browser Tests: {browser_pass}/{browser_total} passed")

    if report['overall_passed']:
        print("\n✅ SMOKE TEST PASSED")
    else:
        print("\n❌ SMOKE TEST FAILED")

    # Save report if requested
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\nReport saved to: {args.output}")

    sys.exit(0 if report['overall_passed'] else 1)


if __name__ == '__main__':
    main()