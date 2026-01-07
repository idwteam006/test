#!/usr/bin/env python3
"""
Accessibility audit script using Playwright and axe-core.

Usage:
    python scripts/accessibility_audit.py --url https://your-app.com
    python scripts/accessibility_audit.py --url http://localhost:3000 --pages /,/login,/dashboard
    python scripts/accessibility_audit.py --help
"""

import argparse
import json
import sys
from typing import List, Dict, Any

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Error: Playwright is required. Install with: pip install playwright")
    print("Then run: playwright install chromium")
    sys.exit(1)


AXE_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.2/axe.min.js'


def audit_page(page, url: str) -> Dict[str, Any]:
    """Run accessibility audit on a single page."""
    print(f"\nAuditing: {url}")

    try:
        page.goto(url, wait_until='networkidle', timeout=30000)
    except Exception as e:
        return {
            'url': url,
            'error': f'Failed to load page: {str(e)}',
            'violations': [],
            'passes': 0
        }

    # Inject axe-core
    try:
        page.add_script_tag(url=AXE_CDN_URL)
        page.wait_for_function('typeof axe !== "undefined"', timeout=10000)
    except Exception as e:
        return {
            'url': url,
            'error': f'Failed to load axe-core: {str(e)}',
            'violations': [],
            'passes': 0
        }

    # Run axe audit
    results = page.evaluate('''async () => {
        try {
            return await axe.run(document, {
                runOnly: {
                    type: 'tag',
                    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
                }
            });
        } catch (e) {
            return { error: e.message };
        }
    }''')

    if 'error' in results:
        return {
            'url': url,
            'error': results['error'],
            'violations': [],
            'passes': 0
        }

    return {
        'url': url,
        'violations': results.get('violations', []),
        'passes': len(results.get('passes', [])),
        'incomplete': len(results.get('incomplete', [])),
        'inapplicable': len(results.get('inapplicable', []))
    }


def format_violation(violation: Dict) -> str:
    """Format a violation for display."""
    impact_colors = {
        'critical': '🔴',
        'serious': '🟠',
        'moderate': '🟡',
        'minor': '🟢'
    }

    impact = violation.get('impact', 'unknown')
    icon = impact_colors.get(impact, '⚪')

    output = [
        f"\n{icon} {violation['id']} ({impact})",
        f"   {violation['description']}",
        f"   Help: {violation.get('helpUrl', 'N/A')}",
        f"   Affected elements: {len(violation.get('nodes', []))}"
    ]

    # Show first few affected elements
    for i, node in enumerate(violation.get('nodes', [])[:3]):
        selector = node.get('target', ['unknown'])[0]
        output.append(f"     - {selector}")

    if len(violation.get('nodes', [])) > 3:
        output.append(f"     ... and {len(violation['nodes']) - 3} more")

    return '\n'.join(output)


def run_audit(base_url: str, pages: List[str], output_path: str = None) -> Dict[str, Any]:
    """Run accessibility audit on multiple pages."""
    all_results = []
    total_violations = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080}
        )
        page = context.new_page()

        for path in pages:
            url = f"{base_url.rstrip('/')}{path}"
            result = audit_page(page, url)
            all_results.append(result)

            if result.get('error'):
                print(f"  ❌ Error: {result['error']}")
            else:
                violations = result['violations']
                total_violations += len(violations)

                if violations:
                    print(f"  Found {len(violations)} violations:")
                    for v in violations:
                        print(format_violation(v))
                else:
                    print(f"  ✅ No violations found ({result['passes']} rules passed)")

        browser.close()

    # Summary
    summary = {
        'total_pages': len(pages),
        'total_violations': total_violations,
        'pages': all_results,
        'violation_summary': {}
    }

    # Aggregate violations by type
    for result in all_results:
        for v in result.get('violations', []):
            vid = v['id']
            if vid not in summary['violation_summary']:
                summary['violation_summary'][vid] = {
                    'id': vid,
                    'description': v['description'],
                    'impact': v['impact'],
                    'count': 0,
                    'pages': []
                }
            summary['violation_summary'][vid]['count'] += len(v.get('nodes', []))
            summary['violation_summary'][vid]['pages'].append(result['url'])

    # Print summary
    print("\n" + "=" * 60)
    print("ACCESSIBILITY AUDIT SUMMARY")
    print("=" * 60)
    print(f"Pages audited: {len(pages)}")
    print(f"Total violations: {total_violations}")

    if summary['violation_summary']:
        print("\nViolations by type:")
        sorted_violations = sorted(
            summary['violation_summary'].values(),
            key=lambda x: {'critical': 0, 'serious': 1, 'moderate': 2, 'minor': 3}.get(x['impact'], 4)
        )
        for v in sorted_violations:
            print(f"  - {v['id']} ({v['impact']}): {v['count']} instances across {len(v['pages'])} pages")

    # Save results if requested
    if output_path:
        with open(output_path, 'w') as f:
            json.dump(summary, f, indent=2)
        print(f"\nDetailed results saved to: {output_path}")

    return summary


def main():
    parser = argparse.ArgumentParser(
        description='Run accessibility audit on web pages',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        '--url', required=True,
        help='Base URL to audit (e.g., https://your-app.com)'
    )
    parser.add_argument(
        '--pages', default='/',
        help='Comma-separated list of pages to audit (default: /)'
    )
    parser.add_argument(
        '--output',
        help='Path to save JSON results'
    )
    parser.add_argument(
        '--wcag-level', choices=['A', 'AA', 'AAA'], default='AA',
        help='WCAG conformance level (default: AA)'
    )

    args = parser.parse_args()

    pages = [p.strip() for p in args.pages.split(',')]

    print(f"Accessibility Audit")
    print(f"Base URL: {args.url}")
    print(f"Pages: {', '.join(pages)}")
    print(f"WCAG Level: {args.wcag_level}")

    summary = run_audit(args.url, pages, args.output)

    # Exit with error if critical/serious violations found
    critical_count = sum(
        v['count'] for v in summary['violation_summary'].values()
        if v['impact'] in ['critical', 'serious']
    )

    if critical_count > 0:
        print(f"\n⚠️  Found {critical_count} critical/serious accessibility issues")
        sys.exit(1)
    else:
        print("\n✅ No critical accessibility issues found")
        sys.exit(0)


if __name__ == '__main__':
    main()