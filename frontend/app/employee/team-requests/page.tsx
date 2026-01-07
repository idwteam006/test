'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  AlertCircle,
  Mail
} from 'lucide-react';

interface TeamRequest {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  manager: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    jobTitle: string;
    department: string;
  };
}

export default function TeamRequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<TeamRequest[]>([]);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/employee/team-requests');
      const data = await response.json();

      if (data.success) {
        setRequests(data.requests || []);
      } else {
        console.error('Failed to fetch requests:', data.error);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const respondToRequest = async (requestId: string, action: 'accept' | 'reject') => {
    const confirmMessage = action === 'accept'
      ? 'Are you sure you want to accept this team join request? This manager will become your reporting manager.'
      : 'Are you sure you want to reject this team join request?';

    if (!confirm(confirmMessage)) return;

    setResponding(requestId);
    try {
      const response = await fetch(`/api/employee/team-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Request ${action}ed successfully!`);
        fetchRequests(); // Refresh data
      } else {
        alert(data.error || `Failed to ${action} request`);
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      alert(`Failed to ${action} request`);
    } finally {
      setResponding(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4 mr-1" />
            Pending
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            Accepted
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="w-4 h-4 mr-1" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const pendingRequests = requests.filter(req => req.status === 'PENDING');
  const respondedRequests = requests.filter(req => req.status !== 'PENDING');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading team requests...</p>
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
                href="/employee/dashboard"
                className="mr-4 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Team Join Requests
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Managers have invited you to join their team
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        {pendingRequests.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">You have {pendingRequests.length} pending request(s)</p>
                <p>
                  Review the manager's information and decide whether to accept or reject.
                  Once accepted, they will become your reporting manager.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Pending Requests ({pendingRequests.length})
            </h2>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      {/* Manager Avatar */}
                      <div className="flex-shrink-0">
                        {request.manager.avatarUrl ? (
                          <img
                            src={request.manager.avatarUrl}
                            alt={request.manager.name}
                            className="w-16 h-16 rounded-full"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-xl">
                              {request.manager.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Manager Info */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {request.manager.name}
                          </h3>
                          {getStatusBadge(request.status)}
                        </div>

                        <div className="space-y-1 text-sm text-gray-600 mb-3">
                          <div className="flex items-center">
                            <UserCheck className="w-4 h-4 mr-2" />
                            <span>{request.manager.jobTitle}</span>
                          </div>
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2" />
                            <span>{request.manager.email}</span>
                          </div>
                          <p className="text-gray-500">
                            Department: {request.manager.department}
                          </p>
                        </div>

                        {request.message && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <p className="text-sm text-gray-600 font-medium mb-1">Message:</p>
                            <p className="text-sm text-gray-700">{request.message}</p>
                          </div>
                        )}

                        <p className="text-xs text-gray-400">
                          Sent {new Date(request.createdAt).toLocaleDateString()} at{' '}
                          {new Date(request.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 flex items-center space-x-3">
                    <button
                      onClick={() => respondToRequest(request.id, 'accept')}
                      disabled={responding === request.id}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      {responding === request.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span>Accept Request</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => respondToRequest(request.id, 'reject')}
                      disabled={responding === request.id}
                      className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center space-x-2"
                    >
                      <XCircle className="w-5 h-5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Pending Requests */}
        {pendingRequests.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center mb-8">
            <Clock className="w-16 h-16 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Pending Requests
            </h3>
            <p className="text-gray-500">
              You don't have any pending team join requests at the moment.
            </p>
          </div>
        )}

        {/* Request History */}
        {respondedRequests.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Request History ({respondedRequests.length})
            </h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="divide-y">
                {respondedRequests.map((request) => (
                  <div key={request.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {request.manager.avatarUrl ? (
                          <img
                            src={request.manager.avatarUrl}
                            alt={request.manager.name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-600 font-medium text-sm">
                              {request.manager.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {request.manager.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {request.manager.jobTitle} • {request.manager.department}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Responded {new Date(request.respondedAt || request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
