---
name: testing-expert
description: Comprehensive toolkit for testing Next.js web applications in production. Use this skill when the user asks to test, verify, debug, or validate any aspect of a Next.js application including API routes, authentication flows, UI components, database operations, performance, accessibility, and end-to-end user journeys. Supports Playwright for browser automation, API testing, and production health checks.
license: Apache-2.0
---

# Next.js Testing Expert

This skill provides comprehensive guidance for testing Next.js web applications in production environments. It covers end-to-end testing, API validation, authentication flows, performance checks, and accessibility audits.

## Quick Reference

| Test Type | Tool | When to Use |
|-----------|------|-------------|
| E2E Browser Tests | Playwright | User flows, UI interactions, visual verification |
| API Tests | curl/fetch/Playwright | Endpoint validation, auth tokens, data integrity |
| Performance | Lighthouse/WebVitals | Load times, Core Web Vitals, optimization |
| Accessibility | axe-core/Playwright | WCAG compliance, screen reader support |
| Database | Direct queries | Data integrity, migration verification |
| Auth Flows | Playwright + cookies | Login, logout, session management, permissions |

## Decision Tree: Choosing Your Approach

```
Test Request → What type of testing?
    │
    ├─ UI/User Flow → Use Playwright E2E
    │   ├─ Static content → Direct DOM inspection
    │   └─ Dynamic/SPA → Wait for networkidle, then interact
    │
    ├─ API Endpoint → Choose method:
    │   ├─ Simple GET → curl with headers
    │   ├─ Auth required → Get token first, then test
    │   └─ Complex flow → Playwright with API interception
    │
    ├─ Performance → Lighthouse CLI or WebVitals
    │   ├─ Full audit → lighthouse --output=json
    │   └─ Specific metrics → Custom performance marks
    │
    ├─ Accessibility → axe-core via Playwright
    │   └─ Run @axe-core/playwright on key pages
    │
    └─ Database → Direct SQL queries
        ├─ Data integrity → SELECT queries
        └─ Migration check → Schema validation
```

## Environment Setup

### Prerequisites
```bash
# Install Playwright (Python)
pip install playwright
playwright install chromium

# OR Install Playwright (Node.js)
npm install -D playwright @playwright/test

# For accessibility testing
npm install -D @axe-core/playwright

# For performance testing
npm install -g lighthouse
```

### Helper Scripts Available
- `scripts/with_server.py` - Manages Next.js server lifecycle
- `scripts/api_tester.py` - API endpoint validation
- `scripts/auth_flow.py` - Authentication flow testing
- `scripts/accessibility_audit.py` - WCAG compliance checking
- `scripts/performance_check.py` - Core Web Vitals measurement

**Always run scripts with `--help` first** to see usage options.

## Testing Patterns

### 1. End-to-End Browser Testing

For testing complete user journeys through the application:

```python
from playwright.sync_api import sync_playwright

def test_user_journey():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Testing Agent)'
        )
        page = context.new_page()

        # Navigate and wait for hydration
        page.goto('https://your-app.com')
        page.wait_for_load_state('networkidle')

        # Test interactions
        page.click('[data-testid="login-button"]')
        page.fill('[name="email"]', 'test@example.com')
        page.fill('[name="password"]', 'password123')
        page.click('[type="submit"]')

        # Verify success
        page.wait_for_url('**/dashboard**')
        assert page.locator('text=Welcome').is_visible()

        # Screenshot for verification
        page.screenshot(path='/tmp/test_result.png', full_page=True)

        browser.close()
```

### 2. API Endpoint Testing

For validating Next.js API routes:

```python
import requests
import json

BASE_URL = 'https://your-app.com/api'

def test_api_endpoints():
    # Test public endpoint
    response = requests.get(f'{BASE_URL}/health')
    assert response.status_code == 200

    # Test authenticated endpoint
    headers = {'Authorization': f'Bearer {get_auth_token()}'}
    response = requests.get(f'{BASE_URL}/user/profile', headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert 'email' in data

    # Test POST endpoint
    payload = {'name': 'Test Item', 'value': 123}
    response = requests.post(
        f'{BASE_URL}/items',
        json=payload,
        headers=headers
    )
    assert response.status_code == 201

def get_auth_token():
    # Implement based on your auth system
    response = requests.post(f'{BASE_URL}/auth/login', json={
        'email': 'test@example.com',
        'password': 'password123'
    })
    return response.json()['token']
```

### 3. Authentication Flow Testing

Complete auth cycle verification:

```python
from playwright.sync_api import sync_playwright

def test_auth_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Test login
        page.goto('https://your-app.com/login')
        page.wait_for_load_state('networkidle')

        page.fill('[name="email"]', 'test@example.com')
        page.fill('[name="password"]', 'password123')
        page.click('button[type="submit"]')

        # Wait for redirect and verify session
        page.wait_for_url('**/dashboard**')

        # Check cookies/session
        cookies = context.cookies()
        session_cookie = next(
            (c for c in cookies if 'session' in c['name'].lower()),
            None
        )
        assert session_cookie is not None, "Session cookie not set"

        # Test protected route access
        page.goto('https://your-app.com/settings')
        assert page.url.endswith('/settings'), "Should access protected route"

        # Test logout
        page.click('[data-testid="logout-button"]')
        page.wait_for_url('**/login**')

        # Verify session cleared
        cookies = context.cookies()
        session_cookie = next(
            (c for c in cookies if 'session' in c['name'].lower()),
            None
        )
        assert session_cookie is None or session_cookie['value'] == ''

        browser.close()
```

### 4. Performance Testing

Measure Core Web Vitals and page performance:

```python
from playwright.sync_api import sync_playwright
import json

def measure_performance():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Enable performance metrics
        client = page.context.new_cdp_session(page)
        client.send('Performance.enable')

        # Navigate and measure
        page.goto('https://your-app.com')
        page.wait_for_load_state('networkidle')

        # Get performance metrics
        metrics = client.send('Performance.getMetrics')

        # Get Web Vitals via JavaScript
        vitals = page.evaluate('''() => {
            return new Promise(resolve => {
                const data = {
                    lcp: null,
                    fid: null,
                    cls: null,
                    fcp: null,
                    ttfb: null
                };

                // Get navigation timing
                const nav = performance.getEntriesByType('navigation')[0];
                if (nav) {
                    data.ttfb = nav.responseStart - nav.requestStart;
                }

                // Get paint timing
                const paint = performance.getEntriesByType('paint');
                const fcp = paint.find(p => p.name === 'first-contentful-paint');
                if (fcp) data.fcp = fcp.startTime;

                resolve(data);
            });
        }''')

        print("Performance Metrics:")
        print(json.dumps(vitals, indent=2))

        # Lighthouse audit (run separately)
        # lighthouse https://your-app.com --output=json --output-path=./report.json

        browser.close()
        return vitals
```

### 5. Accessibility Testing

WCAG compliance verification:

```python
from playwright.sync_api import sync_playwright

def test_accessibility():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto('https://your-app.com')
        page.wait_for_load_state('networkidle')

        # Inject and run axe-core
        page.add_script_tag(url='https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.2/axe.min.js')

        results = page.evaluate('''async () => {
            return await axe.run();
        }''')

        violations = results['violations']

        if violations:
            print(f"Found {len(violations)} accessibility violations:")
            for v in violations:
                print(f"\n- {v['id']}: {v['description']}")
                print(f"  Impact: {v['impact']}")
                print(f"  Elements: {len(v['nodes'])} affected")
        else:
            print("No accessibility violations found!")

        browser.close()
        return violations
```

### 6. Database Verification

Test data integrity after operations:

```python
import subprocess

def verify_database():
    # Using Supabase CLI or direct connection
    queries = [
        "SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '1 hour'",
        "SELECT * FROM migrations ORDER BY applied_at DESC LIMIT 5",
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    ]

    for query in queries:
        result = execute_sql(query)
        print(f"Query: {query}")
        print(f"Result: {result}\n")

def execute_sql(query):
    # Implement based on your database setup
    # Could use psycopg2, Supabase client, or Prisma
    pass
```

## Production Testing Checklist

### Pre-Deployment
- [ ] All E2E tests pass
- [ ] API endpoints return expected responses
- [ ] Authentication flows work correctly
- [ ] Database migrations applied successfully
- [ ] Environment variables configured

### Post-Deployment
- [ ] Health check endpoint responds
- [ ] Login/logout works
- [ ] Critical user journeys complete
- [ ] No console errors in browser
- [ ] Performance metrics within thresholds
- [ ] No accessibility regressions

### Smoke Test Script
```python
def production_smoke_test(base_url):
    """Quick validation that production is healthy"""
    tests = [
        ('Health Check', f'{base_url}/api/health', 200),
        ('Home Page', base_url, 200),
        ('Login Page', f'{base_url}/login', 200),
    ]

    results = []
    for name, url, expected_status in tests:
        try:
            response = requests.get(url, timeout=10)
            passed = response.status_code == expected_status
            results.append((name, passed, response.status_code))
        except Exception as e:
            results.append((name, False, str(e)))

    return results
```

## Common Pitfalls

❌ **Don't** test immediately after page.goto() on Next.js apps
✅ **Do** wait for `page.wait_for_load_state('networkidle')` for client-side hydration

❌ **Don't** hardcode credentials in test files
✅ **Do** use environment variables or secure vaults

❌ **Don't** skip cleanup after tests
✅ **Do** clean up test data and close browsers properly

❌ **Don't** test only happy paths
✅ **Do** include error cases, edge cases, and permission checks

❌ **Don't** ignore flaky tests
✅ **Do** add proper waits and retry logic for dynamic content

## Best Practices

1. **Use data-testid attributes** - Add `data-testid` to interactive elements for stable selectors
2. **Isolate test data** - Use dedicated test accounts and cleanup after tests
3. **Run tests in CI/CD** - Automate testing in your deployment pipeline
4. **Monitor test performance** - Track test duration and flakiness
5. **Screenshot on failure** - Capture visual state when tests fail
6. **Test across viewports** - Verify mobile, tablet, and desktop layouts
7. **Use realistic data** - Test with production-like data volumes
8. **Version your tests** - Keep tests in sync with application changes

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Production Tests
on:
  deployment_status:

jobs:
  test:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install playwright requests
      - run: playwright install chromium
      - run: python tests/production_smoke.py
        env:
          PROD_URL: ${{ github.event.deployment_status.target_url }}
```

Remember: Testing in production is about confidence, not coverage. Focus on critical paths that matter most to your users.