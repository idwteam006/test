#!/usr/bin/env python3
"""
Performance testing script for Next.js applications.
Measures Core Web Vitals and other performance metrics.

Usage:
    python scripts/performance_check.py --url https://your-app.com
    python scripts/performance_check.py --url http://localhost:3000 --pages /,/dashboard
    python scripts/performance_check.py --help
"""

import argparse
import json
import sys
import time
from typing import List, Dict, Any, Optional

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Error: Playwright is required. Install with: pip install playwright")
    print("Then run: playwright install chromium")
    sys.exit(1)


# Performance thresholds (based on Google's recommendations)
THRESHOLDS = {
    'lcp': {'good': 2500, 'needs_improvement': 4000},  # Largest Contentful Paint
    'fid': {'good': 100, 'needs_improvement': 300},     # First Input Delay
    'cls': {'good': 0.1, 'needs_improvement': 0.25},    # Cumulative Layout Shift
    'fcp': {'good': 1800, 'needs_improvement': 3000},   # First Contentful Paint
    'ttfb': {'good': 800, 'needs_improvement': 1800},   # Time to First Byte
    'tti': {'good': 3800, 'needs_improvement': 7300},   # Time to Interactive
}


def get_rating(metric: str, value: float) -> str:
    """Get rating for a metric value."""
    if metric not in THRESHOLDS:
        return 'unknown'

    thresholds = THRESHOLDS[metric]
    if value <= thresholds['good']:
        return 'good'
    elif value <= thresholds['needs_improvement']:
        return 'needs_improvement'
    else:
        return 'poor'


def format_metric(name: str, value: Optional[float], unit: str = 'ms') -> str:
    """Format a metric for display."""
    if value is None:
        return f"  {name}: N/A"

    rating = get_rating(name.lower(), value)
    icons = {'good': '🟢', 'needs_improvement': '🟡', 'poor': '🔴', 'unknown': '⚪'}
    icon = icons.get(rating, '⚪')

    if unit == 'ms':
        formatted_value = f"{value:.0f}ms"
    elif unit == 's':
        formatted_value = f"{value:.2f}s"
    else:
        formatted_value = f"{value:.3f}"

    return f"  {icon} {name}: {formatted_value}"


def measure_page_performance(page, url: str) -> Dict[str, Any]:
    """Measure performance metrics for a single page."""
    print(f"\nMeasuring: {url}")

    metrics = {
        'url': url,
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'lcp': None,
        'fcp': None,
        'cls': None,
        'ttfb': None,
        'tti': None,
        'dom_content_loaded': None,
        'load_complete': None,
        'resource_count': 0,
        'total_transfer_size': 0,
        'error': None
    }

    try:
        # Enable CDP for performance metrics
        client = page.context.new_cdp_session(page)
        client.send('Performance.enable')

        # Navigate and time
        start = time.time()
        response = page.goto(url, wait_until='load', timeout=60000)
        load_time = (time.time() - start) * 1000

        if response:
            metrics['status_code'] = response.status
            metrics['ttfb'] = response.request.timing.get('responseStart', 0)

        # Wait for network idle
        page.wait_for_load_state('networkidle', timeout=30000)

        # Get navigation timing
        nav_timing = page.evaluate('''() => {
            const nav = performance.getEntriesByType('navigation')[0];
            if (!nav) return null;
            return {
                domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
                loadComplete: nav.loadEventEnd - nav.startTime,
                ttfb: nav.responseStart - nav.requestStart,
                domInteractive: nav.domInteractive - nav.startTime
            };
        }''')

        if nav_timing:
            metrics['dom_content_loaded'] = nav_timing.get('domContentLoaded')
            metrics['load_complete'] = nav_timing.get('loadComplete')
            if not metrics['ttfb']:
                metrics['ttfb'] = nav_timing.get('ttfb')
            metrics['tti'] = nav_timing.get('domInteractive')

        # Get paint timing
        paint_timing = page.evaluate('''() => {
            const entries = performance.getEntriesByType('paint');
            const result = {};
            entries.forEach(entry => {
                if (entry.name === 'first-contentful-paint') {
                    result.fcp = entry.startTime;
                }
            });
            return result;
        }''')

        if paint_timing:
            metrics['fcp'] = paint_timing.get('fcp')

        # Get LCP (requires PerformanceObserver, may not be available immediately)
        lcp = page.evaluate('''() => {
            return new Promise(resolve => {
                const entries = performance.getEntriesByType('largest-contentful-paint');
                if (entries.length > 0) {
                    resolve(entries[entries.length - 1].startTime);
                } else {
                    // Wait a bit for LCP
                    setTimeout(() => {
                        const entries = performance.getEntriesByType('largest-contentful-paint');
                        resolve(entries.length > 0 ? entries[entries.length - 1].startTime : null);
                    }, 1000);
                }
            });
        }''')
        metrics['lcp'] = lcp

        # Get CLS
        cls = page.evaluate('''() => {
            let clsValue = 0;
            const entries = performance.getEntriesByType('layout-shift');
            entries.forEach(entry => {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            });
            return clsValue;
        }''')
        metrics['cls'] = cls

        # Get resource metrics
        resources = page.evaluate('''() => {
            const entries = performance.getEntriesByType('resource');
            return {
                count: entries.length,
                totalSize: entries.reduce((sum, e) => sum + (e.transferSize || 0), 0)
            };
        }''')
        metrics['resource_count'] = resources.get('count', 0)
        metrics['total_transfer_size'] = resources.get('totalSize', 0)

        # Calculate overall score
        metrics['score'] = calculate_score(metrics)

    except Exception as e:
        metrics['error'] = str(e)
        print(f"  ❌ Error: {e}")

    return metrics


def calculate_score(metrics: Dict[str, Any]) -> int:
    """Calculate an overall performance score (0-100)."""
    scores = []

    metric_weights = {
        'lcp': 25,
        'fcp': 20,
        'cls': 15,
        'ttfb': 20,
        'tti': 20
    }

    for metric, weight in metric_weights.items():
        value = metrics.get(metric)
        if value is not None:
            rating = get_rating(metric, value)
            if rating == 'good':
                scores.append(weight)
            elif rating == 'needs_improvement':
                scores.append(weight * 0.5)
            # 'poor' gets 0

    return int(sum(scores)) if scores else 0


def print_metrics(metrics: Dict[str, Any]):
    """Print metrics in a formatted way."""
    if metrics.get('error'):
        print(f"  ❌ Error: {metrics['error']}")
        return

    print(f"  Status: {metrics.get('status_code', 'N/A')}")
    print("\n  Core Web Vitals:")
    print(format_metric('LCP', metrics.get('lcp')))
    print(format_metric('FCP', metrics.get('fcp')))
    print(format_metric('CLS', metrics.get('cls'), unit=''))
    print(format_metric('TTFB', metrics.get('ttfb')))
    print(format_metric('TTI', metrics.get('tti')))

    print("\n  Timing:")
    if metrics.get('dom_content_loaded'):
        print(f"  DOM Content Loaded: {metrics['dom_content_loaded']:.0f}ms")
    if metrics.get('load_complete'):
        print(f"  Load Complete: {metrics['load_complete']:.0f}ms")

    print("\n  Resources:")
    print(f"  Total requests: {metrics.get('resource_count', 0)}")
    size_kb = metrics.get('total_transfer_size', 0) / 1024
    print(f"  Total size: {size_kb:.1f} KB")

    score = metrics.get('score', 0)
    score_icon = '🟢' if score >= 80 else '🟡' if score >= 50 else '🔴'
    print(f"\n  {score_icon} Performance Score: {score}/100")


def run_performance_check(
    base_url: str,
    pages: List[str],
    runs: int = 1,
    output_path: str = None
) -> Dict[str, Any]:
    """Run performance checks on multiple pages."""
    all_results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for page_path in pages:
            url = f"{base_url.rstrip('/')}{page_path}"
            page_results = []

            for run in range(runs):
                if runs > 1:
                    print(f"\n  Run {run + 1}/{runs}")

                # Create fresh context for each run
                context = browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    # Simulate fast 3G for more realistic metrics
                    # Uncomment for throttled testing:
                    # extra_http_headers={'X-Performance-Test': 'true'}
                )
                page = context.new_page()

                metrics = measure_page_performance(page, url)
                page_results.append(metrics)
                print_metrics(metrics)

                context.close()

            # Average results if multiple runs
            if runs > 1:
                avg_metrics = average_metrics(page_results)
                all_results.append(avg_metrics)
            else:
                all_results.append(page_results[0])

        browser.close()

    # Summary
    summary = {
        'base_url': base_url,
        'pages': all_results,
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'runs': runs,
        'average_score': sum(r.get('score', 0) for r in all_results) // len(all_results)
    }

    print("\n" + "=" * 60)
    print("PERFORMANCE SUMMARY")
    print("=" * 60)

    for result in all_results:
        score = result.get('score', 0)
        score_icon = '🟢' if score >= 80 else '🟡' if score >= 50 else '🔴'
        print(f"{score_icon} {result['url']}: {score}/100")

    print(f"\nAverage Score: {summary['average_score']}/100")

    if output_path:
        with open(output_path, 'w') as f:
            json.dump(summary, f, indent=2)
        print(f"\nDetailed results saved to: {output_path}")

    return summary


def average_metrics(results: List[Dict]) -> Dict[str, Any]:
    """Average metrics across multiple runs."""
    if not results:
        return {}

    avg = {'url': results[0]['url'], 'runs': len(results)}
    numeric_keys = ['lcp', 'fcp', 'cls', 'ttfb', 'tti', 'dom_content_loaded',
                    'load_complete', 'resource_count', 'total_transfer_size', 'score']

    for key in numeric_keys:
        values = [r.get(key) for r in results if r.get(key) is not None]
        if values:
            avg[key] = sum(values) / len(values)

    return avg


def main():
    parser = argparse.ArgumentParser(
        description='Measure performance metrics for web pages',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        '--url', required=True,
        help='Base URL to test (e.g., https://your-app.com)'
    )
    parser.add_argument(
        '--pages', default='/',
        help='Comma-separated list of pages to test (default: /)'
    )
    parser.add_argument(
        '--runs', type=int, default=1,
        help='Number of runs per page for averaging (default: 1)'
    )
    parser.add_argument(
        '--output',
        help='Path to save JSON results'
    )
    parser.add_argument(
        '--threshold', type=int, default=50,
        help='Minimum score threshold to pass (default: 50)'
    )

    args = parser.parse_args()

    pages = [p.strip() for p in args.pages.split(',')]

    print("Performance Check")
    print(f"Base URL: {args.url}")
    print(f"Pages: {', '.join(pages)}")
    print(f"Runs per page: {args.runs}")

    summary = run_performance_check(args.url, pages, args.runs, args.output)

    if summary['average_score'] < args.threshold:
        print(f"\n⚠️  Performance score ({summary['average_score']}) below threshold ({args.threshold})")
        sys.exit(1)
    else:
        print(f"\n✅ Performance check passed")
        sys.exit(0)


if __name__ == '__main__':
    main()