#!/usr/bin/env python3
"""
Example: API integration tests for Next.js API routes.
Tests CRUD operations, authentication, and error handling.
"""

import json
import time
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from typing import Dict, Any, Optional, List

# Configuration
BASE_URL = 'http://localhost:3000/api'  # Change to your API URL
AUTH_TOKEN = None  # Will be set after login


class APIClient:
    """Simple API client for testing."""

    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.token = None
        self.last_response = None

    def set_token(self, token: str):
        self.token = token

    def _request(
        self,
        method: str,
        path: str,
        data: Optional[Dict] = None,
        headers: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make HTTP request."""
        url = f"{self.base_url}{path}"

        req_headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }

        if self.token:
            req_headers['Authorization'] = f'Bearer {self.token}'

        if headers:
            req_headers.update(headers)

        body = json.dumps(data).encode() if data else None
        request = Request(url, data=body, headers=req_headers, method=method)

        start = time.time()
        try:
            with urlopen(request, timeout=30) as response:
                response_body = response.read().decode()
                self.last_response = {
                    'status': response.status,
                    'body': json.loads(response_body) if response_body else None,
                    'headers': dict(response.headers),
                    'time': time.time() - start
                }
        except HTTPError as e:
            response_body = e.read().decode() if e.fp else ''
            self.last_response = {
                'status': e.code,
                'body': json.loads(response_body) if response_body else None,
                'headers': dict(e.headers) if e.headers else {},
                'time': time.time() - start,
                'error': str(e)
            }

        return self.last_response

    def get(self, path: str, **kwargs) -> Dict[str, Any]:
        return self._request('GET', path, **kwargs)

    def post(self, path: str, data: Dict = None, **kwargs) -> Dict[str, Any]:
        return self._request('POST', path, data=data, **kwargs)

    def put(self, path: str, data: Dict = None, **kwargs) -> Dict[str, Any]:
        return self._request('PUT', path, data=data, **kwargs)

    def patch(self, path: str, data: Dict = None, **kwargs) -> Dict[str, Any]:
        return self._request('PATCH', path, data=data, **kwargs)

    def delete(self, path: str, **kwargs) -> Dict[str, Any]:
        return self._request('DELETE', path, **kwargs)


class TestRunner:
    """Test runner with assertions."""

    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failures: List[Dict] = []

    def assert_equal(self, actual: Any, expected: Any, message: str = ''):
        if actual != expected:
            raise AssertionError(f"{message}: Expected {expected}, got {actual}")

    def assert_true(self, value: bool, message: str = ''):
        if not value:
            raise AssertionError(f"{message}: Expected True, got {value}")

    def assert_in(self, item: Any, container: Any, message: str = ''):
        if item not in container:
            raise AssertionError(f"{message}: {item} not in {container}")

    def assert_status(self, response: Dict, expected: int, message: str = ''):
        actual = response.get('status')
        if actual != expected:
            raise AssertionError(
                f"{message}: Expected status {expected}, got {actual}. "
                f"Body: {response.get('body')}"
            )

    def run_test(self, test_name: str, test_func):
        """Run a single test and record results."""
        self.tests_run += 1
        print(f"\n[Test] {test_name}")

        try:
            test_func()
            self.tests_passed += 1
            print(f"   ✅ PASSED")
            return True
        except AssertionError as e:
            self.tests_failed += 1
            self.failures.append({'name': test_name, 'error': str(e)})
            print(f"   ❌ FAILED: {e}")
            return False
        except Exception as e:
            self.tests_failed += 1
            self.failures.append({'name': test_name, 'error': str(e)})
            print(f"   ❌ ERROR: {e}")
            return False

    def print_summary(self):
        """Print test summary."""
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Total: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_failed}")

        if self.failures:
            print("\nFailures:")
            for f in self.failures:
                print(f"  ❌ {f['name']}: {f['error']}")

        return self.tests_failed == 0


# Initialize test client and runner
client = APIClient(BASE_URL)
runner = TestRunner()


# =============================================================================
# TEST CASES
# =============================================================================

def test_health_endpoint():
    """Test that health endpoint returns 200."""
    response = client.get('/health')
    runner.assert_status(response, 200, "Health check")


def test_unauthenticated_access():
    """Test that protected endpoints require authentication."""
    client.token = None  # Clear token
    response = client.get('/user/profile')
    runner.assert_true(
        response['status'] in [401, 403],
        f"Protected endpoint should return 401/403, got {response['status']}"
    )


def test_login():
    """Test login and get auth token."""
    response = client.post('/auth/login', {
        'email': 'test@example.com',
        'password': 'password123'
    })

    runner.assert_status(response, 200, "Login request")
    runner.assert_in('token', response['body'], "Login response should contain token")

    # Store token for subsequent tests
    client.set_token(response['body']['token'])


def test_authenticated_access():
    """Test that authenticated requests work."""
    response = client.get('/user/profile')
    runner.assert_status(response, 200, "Profile access")
    runner.assert_in('email', response['body'], "Profile should contain email")


def test_create_resource():
    """Test creating a new resource."""
    response = client.post('/items', {
        'name': 'Test Item',
        'description': 'Created by API test'
    })

    runner.assert_status(response, 201, "Create resource")
    runner.assert_in('id', response['body'], "Created resource should have ID")

    # Store ID for later tests
    global created_item_id
    created_item_id = response['body']['id']


def test_read_resource():
    """Test reading a resource."""
    response = client.get(f'/items/{created_item_id}')
    runner.assert_status(response, 200, "Read resource")
    runner.assert_equal(response['body']['name'], 'Test Item', "Resource name")


def test_update_resource():
    """Test updating a resource."""
    response = client.put(f'/items/{created_item_id}', {
        'name': 'Updated Item',
        'description': 'Updated by API test'
    })

    runner.assert_status(response, 200, "Update resource")
    runner.assert_equal(response['body']['name'], 'Updated Item', "Updated name")


def test_partial_update():
    """Test partial update (PATCH)."""
    response = client.patch(f'/items/{created_item_id}', {
        'description': 'Patched description'
    })

    runner.assert_status(response, 200, "Patch resource")


def test_delete_resource():
    """Test deleting a resource."""
    response = client.delete(f'/items/{created_item_id}')
    runner.assert_status(response, 200, "Delete resource")

    # Verify deletion
    response = client.get(f'/items/{created_item_id}')
    runner.assert_status(response, 404, "Deleted resource should 404")


def test_invalid_input():
    """Test that invalid input returns appropriate error."""
    response = client.post('/items', {
        # Missing required fields
    })

    runner.assert_true(
        response['status'] in [400, 422],
        f"Invalid input should return 400/422, got {response['status']}"
    )


def test_not_found():
    """Test that missing resources return 404."""
    response = client.get('/items/nonexistent-id-12345')
    runner.assert_status(response, 404, "Missing resource")


def test_rate_limiting():
    """Test that rate limiting is in place (if applicable)."""
    # Make many rapid requests
    for i in range(100):
        response = client.get('/health')
        if response['status'] == 429:
            print(f"   Rate limited after {i+1} requests")
            return  # Test passed - rate limiting is working

    print("   ⚠️ No rate limiting detected after 100 requests")


def test_response_time():
    """Test that API response times are acceptable."""
    response = client.get('/health')
    response_time = response.get('time', 0)

    runner.assert_true(
        response_time < 2.0,
        f"Response time {response_time:.2f}s exceeds 2s threshold"
    )


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("=" * 60)
    print("API INTEGRATION TESTS")
    print("=" * 60)
    print(f"Base URL: {BASE_URL}")
    print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")

    # Run tests in order
    runner.run_test("Health Endpoint", test_health_endpoint)
    runner.run_test("Unauthenticated Access", test_unauthenticated_access)

    # Comment out auth tests if your API doesn't have authentication
    # runner.run_test("Login", test_login)
    # runner.run_test("Authenticated Access", test_authenticated_access)

    # CRUD tests - adjust paths for your API
    # runner.run_test("Create Resource", test_create_resource)
    # runner.run_test("Read Resource", test_read_resource)
    # runner.run_test("Update Resource", test_update_resource)
    # runner.run_test("Partial Update", test_partial_update)
    # runner.run_test("Delete Resource", test_delete_resource)

    runner.run_test("Invalid Input", test_invalid_input)
    runner.run_test("Not Found", test_not_found)
    runner.run_test("Response Time", test_response_time)

    # Optional tests
    # runner.run_test("Rate Limiting", test_rate_limiting)

    # Print summary
    passed = runner.print_summary()
    sys.exit(0 if passed else 1)


if __name__ == '__main__':
    main()