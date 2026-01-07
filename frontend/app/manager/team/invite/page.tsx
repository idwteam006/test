'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface Employee {
  id: string;
  userId: string;
  employeeId: string;
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  avatarUrl: string | null;
  hasManager: boolean;
}

interface JoinRequest {
  id: string;
  status: string;
  createdAt: string;
  respondedAt: string | null;
  employee: {
    id: string;
    name: string;
    email: string;
  };
}

export default function InviteToTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch available employees (without managers)
      const empRes = await fetch('/api/manager/team/available-employees');
      const empData = await empRes.json();

      if (empData.success) {
        setEmployees(empData.employees || []);
      }

      // Fetch existing join requests
      const reqRes = await fetch('/api/manager/team/join-request');
      const reqData = await reqRes.json();

      if (reqData.success) {
        setRequests(reqData.requests || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendJoinRequest = async (employeeId: string) => {
    setSendingInvite(employeeId);
    try {
      const response = await fetch('/api/manager/team/join-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          message: message || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Team join request sent successfully!');
        setMessage('');
        fetchData(); // Refresh data
      } else {
        alert(data.error || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error sending request:', error);
      alert('Failed to send request');
    } finally {
      setSendingInvite(null);
    }
  };

  const cancelRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this request?')) return;

    try {
      const response = await fetch(`/api/employee/team-requests/${requestId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('Request cancelled successfully');
        fetchData();
      } else {
        alert(data.error || 'Failed to cancel request');
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      alert('Failed to cancel request');
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRequestForEmployee = (employeeId: string) => {
    return requests.find(req => req.employee.id === employeeId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Accepted
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link
                href="/manager/team"
                className="mr-4 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Invite Employees to Team
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Send join requests to employees without a manager
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How it works:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Browse employees who don't have a manager assigned yet</li>
                <li>Send a team join request to the employee you want to add</li>
                <li>Employee will receive a notification and can accept or reject</li>
                <li>Once accepted, the employee will appear in your "My Team" page</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Employees */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Available Employees ({filteredEmployees.length})
                </h2>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or employee ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="divide-y">
                {filteredEmployees.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No employees available to invite</p>
                    <p className="text-sm mt-1">
                      All active employees already have managers assigned
                    </p>
                  </div>
                ) : (
                  filteredEmployees.map((employee) => {
                    const existingRequest = getRequestForEmployee(employee.userId);

                    return (
                      <div key={employee.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {employee.avatarUrl ? (
                                <img
                                  src={employee.avatarUrl}
                                  alt={employee.name}
                                  className="w-10 h-10 rounded-full"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-blue-600 font-medium text-sm">
                                    {employee.name.split(' ').map(n => n[0]).join('')}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{employee.name}</p>
                              <p className="text-sm text-gray-500">{employee.email}</p>
                              <p className="text-xs text-gray-400">
                                {employee.jobTitle} • {employee.department} • {employee.employeeId}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {existingRequest ? (
                              <div className="flex items-center space-x-2">
                                {getStatusBadge(existingRequest.status)}
                                {existingRequest.status === 'PENDING' && (
                                  <button
                                    onClick={() => cancelRequest(existingRequest.id)}
                                    className="text-sm text-red-600 hover:text-red-700"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => sendJoinRequest(employee.id)}
                                disabled={sendingInvite === employee.id}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                              >
                                {sendingInvite === employee.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Sending...</span>
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="w-4 h-4" />
                                    <span>Send Request</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Pending Requests Sidebar */}
          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Your Requests
              </h3>

              <div className="space-y-3">
                {requests.filter(req => req.status === 'PENDING').length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No pending requests
                  </p>
                ) : (
                  requests
                    .filter(req => req.status === 'PENDING')
                    .map((req) => (
                      <div
                        key={req.id}
                        className="p-3 border border-gray-200 rounded-lg"
                      >
                        <p className="font-medium text-sm text-gray-900">
                          {req.employee.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {req.employee.email}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          {getStatusBadge(req.status)}
                          <button
                            onClick={() => cancelRequest(req.id)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Cancel
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Sent {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                )}
              </div>

              {/* Recent Responses */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Recent Responses
                </h4>
                <div className="space-y-2">
                  {requests
                    .filter(req => req.status !== 'PENDING')
                    .slice(0, 5)
                    .map((req) => (
                      <div
                        key={req.id}
                        className="p-2 bg-gray-50 rounded text-xs"
                      >
                        <p className="font-medium text-gray-900">
                          {req.employee.name}
                        </p>
                        <div className="mt-1">{getStatusBadge(req.status)}</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
