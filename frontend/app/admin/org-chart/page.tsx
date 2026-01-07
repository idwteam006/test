'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Building2,
  Search,
  Download,
  Loader2,
  Network,
  UserCheck,
  UserPlus,
  Mail,
  Shield,
  Briefcase,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import OrganizationTreeChart from '@/components/admin/OrganizationTreeChart';
import RoleAssignmentDialog from '@/components/admin/RoleAssignmentDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Department {
  id: string;
  name: string;
}

interface EmployeeNode {
  id: string;
  userId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string;
  avatarUrl: string | null;
  departmentId: string;
  departmentName: string;
  managerId: string | null;
  employmentType: string;
  status: string;
  startDate: string;
  subordinatesCount: number;
  subordinates: EmployeeNode[];
}

type AddPosition = 'above' | 'below' | 'left' | 'right';

interface OrganizationData {
  tree: EmployeeNode[];
  flatList: EmployeeNode[];
  stats: {
    totalEmployees: number;
    byDepartment: Record<string, number>;
    byRole: Record<string, number>;
    managersCount: number;
    rootLevelCount: number;
  };
}

export default function OrganizationChartPage() {
  const [loading, setLoading] = useState(true);
  const [orgData, setOrgData] = useState<OrganizationData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeNode | null>(null);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [roleDialogEmployee, setRoleDialogEmployee] = useState<EmployeeNode | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');

  // Add User Dialog state
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [addUserDepartments, setAddUserDepartments] = useState<Department[]>([]);
  const [addUserForm, setAddUserForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'EMPLOYEE',
    jobTitle: '',
    departmentId: '',
    managerId: '',
  });
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addPosition, setAddPosition] = useState<AddPosition | null>(null);
  const [referenceEmployee, setReferenceEmployee] = useState<EmployeeNode | null>(null);

  useEffect(() => {
    fetchOrganizationData();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/admin/departments');
      const data = await response.json();
      if (data.success) {
        setAddUserDepartments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchOrganizationData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/organization-tree');
      const data = await response.json();

      if (data.success) {
        setOrgData(data.data);
      } else {
        toast.error(data.error || 'Failed to load organization data');
      }
    } catch (error) {
      console.error('Error fetching organization data:', error);
      toast.error('Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeClick = (employee: EmployeeNode) => {
    setSelectedEmployee(employee);
    setIsEmployeeDialogOpen(true);
  };

  const handleAssignRole = (employeeId: string) => {
    // Find the employee in the flat list and open the role assignment dialog
    const employee = orgData?.flatList.find((e) => e.id === employeeId);
    if (employee) {
      setRoleDialogEmployee(employee);
      setIsRoleDialogOpen(true);
    }
  };

  const handleRoleDialogSuccess = () => {
    // Refresh the organization data after role assignment
    fetchOrganizationData();
  };

  // Handle opening add user dialog with position context
  const handleOpenAddUserDialog = (position?: AddPosition, employee?: EmployeeNode) => {
    setAddPosition(position || null);
    setReferenceEmployee(employee || null);

    // Pre-populate form based on position and reference employee
    if (employee) {
      let managerId = '';
      let departmentId = employee.departmentId || '';

      if (position === 'below') {
        // Adding subordinate: reference employee becomes the manager
        managerId = employee.userId;
      } else if (position === 'above' || position === 'left' || position === 'right') {
        // Adding peer: use the same manager as reference employee
        managerId = employee.managerId || '';
      }

      setAddUserForm({
        email: '',
        firstName: '',
        lastName: '',
        role: 'EMPLOYEE',
        jobTitle: '',
        departmentId,
        managerId,
      });
    } else {
      // No reference employee, reset form
      setAddUserForm({
        email: '',
        firstName: '',
        lastName: '',
        role: 'EMPLOYEE',
        jobTitle: '',
        departmentId: '',
        managerId: '',
      });
    }

    setIsAddUserDialogOpen(true);
  };

  const handleExportOrgChart = () => {
    if (!orgData) return;

    const dataStr = JSON.stringify(orgData.flatList, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `organization-chart-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Organization chart exported successfully');
  };

  // Handle add user
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!addUserForm.email || !addUserForm.firstName || !addUserForm.lastName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setAddUserLoading(true);
    try {
      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addUserForm.email,
          firstName: addUserForm.firstName,
          lastName: addUserForm.lastName,
          role: addUserForm.role,
          jobTitle: addUserForm.jobTitle || undefined,
          departmentId: addUserForm.departmentId || undefined,
          managerId: addUserForm.managerId || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const positionDesc = addPosition
          ? addPosition === 'below'
            ? ` as a direct report to ${referenceEmployee?.firstName} ${referenceEmployee?.lastName}`
            : ` alongside ${referenceEmployee?.firstName} ${referenceEmployee?.lastName}`
          : '';
        toast.success(data.message || 'User created successfully', {
          description: `${addUserForm.firstName} ${addUserForm.lastName} has been added${positionDesc}. A welcome email has been sent.`,
        });

        setIsAddUserDialogOpen(false);
        setAddUserForm({
          email: '',
          firstName: '',
          lastName: '',
          role: 'EMPLOYEE',
          jobTitle: '',
          departmentId: '',
          managerId: '',
        });
        setAddPosition(null);
        setReferenceEmployee(null);

        // Refresh the organization data
        fetchOrganizationData();
      } else {
        toast.error(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    } finally {
      setAddUserLoading(false);
    }
  };

  // Filter organization tree
  const getFilteredTree = (): EmployeeNode[] => {
    if (!orgData) return [];

    let filtered = orgData.tree;

    // Apply filters recursively
    const filterNode = (node: EmployeeNode): EmployeeNode | null => {
      const matchesSearch =
        !searchQuery ||
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDepartment =
        departmentFilter === 'all' || node.departmentId === departmentFilter;

      const matchesRole = roleFilter === 'all' || node.role === roleFilter;

      const filteredSubordinates = node.subordinates
        .map(filterNode)
        .filter((n): n is EmployeeNode => n !== null);

      const includeNode = matchesSearch && matchesDepartment && matchesRole;

      if (includeNode || filteredSubordinates.length > 0) {
        return {
          ...node,
          subordinates: filteredSubordinates,
        };
      }

      return null;
    };

    return filtered.map(filterNode).filter((n): n is EmployeeNode => n !== null);
  };

  const filteredTree = getFilteredTree();

  const departments = orgData
    ? Array.from(new Set(orgData.flatList.map((e) => ({ id: e.departmentId, name: e.departmentName }))))
        .reduce((acc, dept) => {
          if (!acc.find((d) => d.id === dept.id)) {
            acc.push(dept);
          }
          return acc;
        }, [] as { id: string; name: string }[])
    : [];

  const roles = orgData
    ? Array.from(new Set(orgData.flatList.map((e) => e.role)))
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Organization Chart
              </h1>
              <p className="text-gray-600 mt-2">
                View and manage your organization's hierarchical structure
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleExportOrgChart}
                variant="outline"
                className="border-purple-200 text-purple-600 hover:bg-purple-50"
                disabled={!orgData}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        {orgData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Employees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {orgData.stats.totalEmployees}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Managers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {orgData.stats.managersCount}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Departments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {Object.keys(orgData.stats.byDepartment).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Network className="w-4 h-4" />
                  Root Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {orgData.stats.rootLevelCount}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Department Filter */}
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Role Filter */}
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(searchQuery || departmentFilter !== 'all' || roleFilter !== 'all') && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-gray-600">Active filters:</span>
                  {searchQuery && (
                    <Badge variant="secondary">Search: {searchQuery}</Badge>
                  )}
                  {departmentFilter !== 'all' && (
                    <Badge variant="secondary">
                      Department: {departments.find((d) => d.id === departmentFilter)?.name}
                    </Badge>
                  )}
                  {roleFilter !== 'all' && (
                    <Badge variant="secondary">Role: {roleFilter}</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setDepartmentFilter('all');
                      setRoleFilter('all');
                    }}
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Organization Tree */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Organizational Hierarchy
              </CardTitle>
              <CardDescription>
                Click on any employee to view details. Expand/collapse branches to navigate the
                organization structure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : (
                <OrganizationTreeChart
                  data={filteredTree}
                  onEmployeeClick={handleEmployeeClick}
                  onAssignRole={handleAssignRole}
                  onAddUser={handleOpenAddUserDialog}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Employee Details Dialog */}
      <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>Complete information about this employee</DialogDescription>
          </DialogHeader>

          {selectedEmployee && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {selectedEmployee.avatarUrl ? (
                  <img
                    src={selectedEmployee.avatarUrl}
                    alt={selectedEmployee.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-xl">
                    {selectedEmployee.firstName[0]}
                    {selectedEmployee.lastName[0]}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h3>
                  <p className="text-sm text-gray-600">{selectedEmployee.jobTitle}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Employee Number</label>
                  <p className="text-sm">{selectedEmployee.employeeNumber}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Email</label>
                  <p className="text-sm">{selectedEmployee.email}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Role</label>
                  <p className="text-sm">
                    <Badge className="mt-1">{selectedEmployee.role}</Badge>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Department</label>
                  <p className="text-sm">{selectedEmployee.departmentName}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Employment Type</label>
                  <p className="text-sm">{selectedEmployee.employmentType}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Start Date</label>
                  <p className="text-sm">
                    {new Date(selectedEmployee.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Direct Reports</label>
                  <p className="text-sm">{selectedEmployee.subordinatesCount}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Status</label>
                  <p className="text-sm">
                    <Badge
                      variant={selectedEmployee.status === 'ACTIVE' ? 'default' : 'secondary'}
                      className="mt-1"
                    >
                      {selectedEmployee.status}
                    </Badge>
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Role Assignment Dialog */}
      {roleDialogEmployee && (
        <RoleAssignmentDialog
          user={{
            id: roleDialogEmployee.userId,
            email: roleDialogEmployee.email,
            firstName: roleDialogEmployee.firstName,
            lastName: roleDialogEmployee.lastName,
            role: roleDialogEmployee.role,
            jobTitle: roleDialogEmployee.jobTitle,
            departmentId: roleDialogEmployee.departmentId,
            managerId: roleDialogEmployee.managerId || undefined,
          }}
          isOpen={isRoleDialogOpen}
          onClose={() => {
            setIsRoleDialogOpen(false);
            setRoleDialogEmployee(null);
          }}
          onSuccess={handleRoleDialogSuccess}
        />
      )}

      {/* Add User Dialog */}
      <AnimatePresence>
        {isAddUserDialogOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddUserDialogOpen(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              onClick={() => setIsAddUserDialogOpen(false)}
            >
              <div
                className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Add New User</h2>
                      <p className="text-sm text-gray-600">
                        {addPosition && referenceEmployee ? (
                          addPosition === 'below' ? (
                            <>Add subordinate to <span className="font-medium">{referenceEmployee.firstName} {referenceEmployee.lastName}</span></>
                          ) : (
                            <>Add peer of <span className="font-medium">{referenceEmployee.firstName} {referenceEmployee.lastName}</span></>
                          )
                        ) : (
                          'Create a new user account'
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAddUserDialogOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleAddUser} className="p-6 space-y-4">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@company.com"
                      value={addUserForm.email}
                      onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                      required
                    />
                  </div>

                  {/* Name row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                        First Name *
                      </Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={addUserForm.firstName}
                        onChange={(e) => setAddUserForm({ ...addUserForm, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                        Last Name *
                      </Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Doe"
                        value={addUserForm.lastName}
                        onChange={(e) => setAddUserForm({ ...addUserForm, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Role */}
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      User Role
                    </Label>
                    <Select value={addUserForm.role} onValueChange={(val) => setAddUserForm({ ...addUserForm, role: val })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Job Title */}
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Job Title
                    </Label>
                    <Input
                      id="jobTitle"
                      type="text"
                      placeholder="e.g., Senior Developer"
                      value={addUserForm.jobTitle}
                      onChange={(e) => setAddUserForm({ ...addUserForm, jobTitle: e.target.value })}
                    />
                  </div>

                  {/* Department */}
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Department
                    </Label>
                    <Select
                      value={addUserForm.departmentId || 'none'}
                      onValueChange={(val) => setAddUserForm({ ...addUserForm, departmentId: val === 'none' ? '' : val })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {addUserDepartments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddUserDialogOpen(false)}
                      disabled={addUserLoading}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addUserLoading}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      {addUserLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create User'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
