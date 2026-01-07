#!/usr/bin/env python3
"""
API endpoint testing utility for Next.js applications.

Usage:
    python scripts/api_tester.py --base-url https://your-app.com/api --endpoints endpoints.json
    python scripts/api_tester.py --base-url http://localhost:3000/api --auth-token TOKEN
    python scripts/api_tester.py --help

Endpoints JSON format:
{
    "endpoints": [
        {"method": "GET", "path": "/health", "expected_status": 200},
        {"method": "POST", "path": "/auth/login", "body": {"email": "test@test.com"}, "expected_status": 200}
    ]
}
"""

import argparse
import json
import sys
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from typing import Dict, List, Optional, Any


class APITester:
    def __init__(self, base_url: str, auth_token: Optional[str] = None, timeout: int = 30):
        self.base_url = base_url.rstrip('/')
        self.auth_token = auth_token
        self.timeout = timeout
        self.results = []

    def _make_request(
        self,
        method: str,
        path: str,
        body: Optional[Dict] = None,
        headers: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make HTTP request and return response data."""
        url = f"{self.base_url}{path}"
        req_headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }

        if self.auth_token:
            req_headers['Authorization'] = f'Bearer {self.auth_token}'

        if headers:
            req_headers.update(headers)

        data = json.dumps(body).encode() if body else None

        request = Request(url, data=data, headers=req_headers, method=method)

        start_time = time.time()
        try:
            with urlopen(request, timeout=self.timeout) as response:
                response_time = time.time() - start_time
                response_body = response.read().decode()
                try:
                    response_json = json.loads(response_body)
                except json.JSONDecodeError:
                    response_json = None

                return {
                    'success': True,
                    'status': response.status,
                    'headers': dict(response.headers),
                    'body': response_json or response_body,
                    'response_time': response_time
                }
        except HTTPError as e:
            response_time = time.time() - start_time
            try:
                error_body = e.read().decode()
                error_json = json.loads(error_body)
            except:
                error_json = None

            return {
                'success': False,
                'status': e.code,
                'headers': dict(e.headers) if e.headers else {},
                'body': error_json or str(e),
                'response_time': response_time,
                'error': str(e)
            }
        except URLError as e:
            return {
                'success': False,
                'status': None,
                'error': f'Connection failed: {e.reason}',
                'response_time': time.time() - start_time
            }
        except Exception as e:
            return {
                'success': False,
                'status': None,
                'error': str(e),
                'response_time': time.time() - start_time
            }

    def test_endpoint(
        self,
        method: str,
        path: str,
        expected_status: int = 200,
        body: Optional[Dict] = None,
        headers: Optional[Dict] = None,
        expected_body: Optional[Dict] = None,
        name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Test a single endpoint and return results."""
        test_name = name or f"{method} {path}"
        print(f"Testing: {test_name}...", end=" ")

        result = self._make_request(method, path, body, headers)

        # Check status code
        status_match = result.get('status') == expected_status
        body_match = True

        if expected_body and result.get('body'):
            if isinstance(result['body'], dict):
                for key, value in expected_body.items():
                    if result['body'].get(key) != value:
                        body_match = False
                        break

        passed = status_match and body_match

        test_result = {
            'name': test_name,
            'passed': passed,
            'expected_status': expected_status,
            'actual_status': result.get('status'),
            'response_time': result.get('response_time', 0),
            'error': result.get('error')
        }

        self.results.append(test_result)

        if passed:
            print(f"✓ PASSED ({result.get('response_time', 0):.2f}s)")
        else:
            print(f"✗ FAILED")
            if not status_match:
                print(f"  Expected status: {expected_status}, Got: {result.get('status')}")
            if not body_match:
                print(f"  Body mismatch")
            if result.get('error'):
                print(f"  Error: {result.get('error')}")

        return test_result

    def run_endpoint_suite(self, endpoints: List[Dict]) -> Dict[str, Any]:
        """Run a suite of endpoint tests."""
        print(f"\nRunning {len(endpoints)} endpoint tests against {self.base_url}\n")
        print("-" * 60)

        for endpoint in endpoints:
            self.test_endpoint(
                method=endpoint.get('method', 'GET'),
                path=endpoint.get('path'),
                expected_status=endpoint.get('expected_status', 200),
                body=endpoint.get('body'),
                headers=endpoint.get('headers'),
                expected_body=endpoint.get('expected_body'),
                name=endpoint.get('name')
            )

        print("-" * 60)
        return self.get_summary()

    def get_summary(self) -> Dict[str, Any]:
        """Get test results summary."""
        passed = sum(1 for r in self.results if r['passed'])
        failed = len(self.results) - passed
        avg_response_time = (
            sum(r['response_time'] for r in self.results) / len(self.results)
            if self.results else 0
        )

        summary = {
            'total': len(self.results),
            'passed': passed,
            'failed': failed,
            'pass_rate': f"{(passed / len(self.results) * 100):.1f}%" if self.results else "N/A",
            'avg_response_time': f"{avg_response_time:.2f}s",
            'results': self.results
        }

        print(f"\nSummary: {passed}/{len(self.results)} passed ({summary['pass_rate']})")
        print(f"Average response time: {summary['avg_response_time']}")

        return summary


def main():
    parser = argparse.ArgumentParser(
        description='Test API endpoints for Next.js applications',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        '--base-url', required=True,
        help='Base URL for API (e.g., https://your-app.com/api)'
    )
    parser.add_argument(
        '--auth-token',
        help='Bearer token for authenticated requests'
    )
    parser.add_argument(
        '--endpoints',
        help='Path to JSON file containing endpoint definitions'
    )
    parser.add_argument(
        '--timeout', type=int, default=30,
        help='Request timeout in seconds (default: 30)'
    )
    parser.add_argument(
        '--quick', action='store_true',
        help='Run quick health check only'
    )
    parser.add_argument(
        '--output',
        help='Path to save JSON results'
    )

    args = parser.parse_args()

    tester = APITester(
        base_url=args.base_url,
        auth_token=args.auth_token,
        timeout=args.timeout
    )

    if args.quick:
        # Quick health check
        tester.test_endpoint('GET', '/health', expected_status=200, name='Health Check')
        summary = tester.get_summary()
    elif args.endpoints:
        # Load endpoints from file
        with open(args.endpoints, 'r') as f:
            data = json.load(f)
        summary = tester.run_endpoint_suite(data.get('endpoints', []))
    else:
        # Default endpoints
        default_endpoints = [
            {'method': 'GET', 'path': '/health', 'expected_status': 200, 'name': 'Health Check'},
        ]
        summary = tester.run_endpoint_suite(default_endpoints)

    # Save results if requested
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(summary, f, indent=2)
        print(f"\nResults saved to: {args.output}")

    # Exit with error if any tests failed
    sys.exit(0 if summary['failed'] == 0 else 1)


if __name__ == '__main__':
    main()