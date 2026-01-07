'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserPlus,
  Upload,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Shield,
  Ban,
  CheckCircle,
  Loader2,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Link from 'next/link';
import RoleAssignmentDialog from '@/components/admin/RoleAssignmentDialog';
import EmployeeDetailsModal from '@/components/admin/EmployeeDetailsModal';

interface Employee {
  id: string;
  userId: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  employeeNumber: string;
  employeeId: string;
  jobTitle?: string;
  departmentId?: string;
  managerId?: string;
  manager?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export default function HREmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      // Fetch all employees (all roles in the organization)
      const response = await fetch('/api/hr/employees');
      const data = await response.json();

      if (response.ok && data.success) {
        setEmployees(data.data || []);
      } else {
        toast.error(data.error || 'Failed to load employees');
      }
    } catch (error) {
      console.error('Fetch employees error:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (employeeId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/hr/employees/${employeeId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Employee status updated to ${newStatus}`);
        fetchEmployees();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Update status error:', error);
      toast.error('Network error');
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'HR':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'ACCOUNTANT':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'EMPLOYEE':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'INACTIVE':
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-200">
            <Ban className="w-3 h-3 mr-1" />
            Inactive
          </Badge>
        );
      case 'SUSPENDED':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <Ban className="w-3 h-3 mr-1" />
            Suspended
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleAssignRole = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsRoleDialogOpen(true);
  };

  const handleRoleDialogClose = () => {
    setIsRoleDialogOpen(false);
    setSelectedEmployee(null);
  };

  const handleRoleAssignmentSuccess = () => {
    fetchEmployees(); // Refresh the list
  };

  const handleViewEmployee = async (employeeId: string) => {
    setLoadingDetailsId(employeeId);
    try {
      const response = await fetch(`/api/hr/employees/${employeeId}/details`);
      const data = await response.json();

      if (response.ok && data.success) {
        setEmployeeDetails(data.data);
        setIsDetailsModalOpen(true);
      } else {
        toast.error(data.error || 'Failed to load employee details');
      }
    } catch (error) {
      console.error('Fetch employee details error:', error);
      toast.error('Failed to load employee details');
    } finally {
      setLoadingDetailsId(null);
    }
  };

  const handleDetailsModalClose = () => {
    setIsDetailsModalOpen(false);
    setEmployeeDetails(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Employee Directory
              </h1>
              <p className="text-gray-600 mt-2">Manage and view employee information</p>
            </div>
            <div className="flex gap-3">
              <Link href="/hr/employees/import">
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Import
                </Button>
              </Link>
              <Link href="/hr/invite-employee">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search by name, email, or employee ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="w-full md:w-48">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full mt-1 h-10 px-3 rounded-md border border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="all">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Employee List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredEmployees.map((employee, index) => (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                          {employee.firstName[0]}
                          {employee.lastName[0]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-lg">{employee.name}</h3>
                            <Badge className={getRoleBadgeColor(employee.role)}>
                              {employee.role}
                            </Badge>
                            {getStatusBadge(employee.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {employee.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Shield className="w-4 h-4" />
                              {employee.employeeNumber}
                            </span>
                            {employee.manager && (
                              <span className="flex items-center gap-1 text-purple-600">
                                <Users className="w-4 h-4" />
                                Assigned to: {employee.manager.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewEmployee(employee.id)}
                          disabled={loadingDetailsId === employee.id}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {loadingDetailsId === employee.id ? 'Loading...' : 'View'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssignRole(employee)}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Assign Role
                        </Button>
                        {employee.status === 'ACTIVE' ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(employee.id, 'INACTIVE')}
                            >
                              Deactivate
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(employee.id, 'SUSPENDED')}
                              className="text-red-600 hover:text-red-700"
                            >
                              Suspend
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(employee.id, 'ACTIVE')}
                            className="text-green-600 hover:text-green-700"
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {filteredEmployees.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
                <p className="text-gray-600">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Get started by adding your first employee'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Role Assignment Dialog */}
      {selectedEmployee && (
        <RoleAssignmentDialog
          user={{
            id: selectedEmployee.id,
            email: selectedEmployee.email,
            firstName: selectedEmployee.firstName,
            lastName: selectedEmployee.lastName,
            role: selectedEmployee.role,
            jobTitle: selectedEmployee.jobTitle,
            departmentId: selectedEmployee.departmentId,
            managerId: selectedEmployee.managerId,
          }}
          isOpen={isRoleDialogOpen}
          onClose={handleRoleDialogClose}
          onSuccess={handleRoleAssignmentSuccess}
        />
      )}

      {/* Employee Details Modal */}
      <EmployeeDetailsModal
        employee={employeeDetails}
        isOpen={isDetailsModalOpen}
        onClose={handleDetailsModalClose}
      />
    </div>
  );
}
