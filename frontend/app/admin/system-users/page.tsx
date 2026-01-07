'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Search,
  Filter,
  Shield,
  Mail,
  Calendar,
  Loader2,
  UserPlus,
  Edit,
  Ban,
  CheckCircle,
  X,
  Building2,
  Briefcase,
  Upload,
  Download,
  FileUp,
} from 'lucide-react';
import { toast } from 'sonner';
import UserRoleDialog from '@/components/admin/UserRoleDialog';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  employeeId: string | null;
  departmentId: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
  employee?: {
    id: string;
    employeeNumber: string;
    jobTitle: string | null;
  } | null;
  tenant: {
    id: string;
    name: string;
  };
}

interface Department {
  id: string;
  name: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);

  // Add user form state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [addUserForm, setAddUserForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'EMPLOYEE',
    jobTitle: '',
    departmentId: '',
  });
  const [addUserLoading, setAddUserLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/admin/departments');
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Fetch all users except EMPLOYEE role (show ADMIN, MANAGER, HR, ACCOUNTANT)
      const response = await fetch('/api/admin/employees?role=ADMIN,MANAGER,HR,ACCOUNTANT');
      const data = await response.json();

      if (data.success) {
        console.log('Users loaded:', data.data?.length || 0);
        setUsers(data.data || []);
      } else {
        console.error('Failed to fetch users:', data.error);
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchQuery === '' ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.employee?.employeeNumber && user.employee.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate stats
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'ACTIVE').length;
  const admins = users.filter((u) => u.role === 'ADMIN').length;
  const managers = users.filter((u) => u.role === 'MANAGER').length;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'ACCOUNTANT':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'HR':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'EMPLOYEE':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleAssignRole = (user: User) => {
    setSelectedUser(user);
    setIsRoleDialogOpen(true);
  };

  const handleRoleDialogClose = () => {
    setIsRoleDialogOpen(false);
    setSelectedUser(null);
  };

  const handleRoleAssignmentSuccess = () => {
    fetchUsers(); // Refresh the list
  };

  // Handle status toggle (Suspend/Activate)
  const handleStatusToggle = async (user: User) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const action = newStatus === 'SUSPENDED' ? 'suspend' : 'activate';

    setUpdatingStatus(user.id);
    try {
      const response = await fetch(`/api/admin/employees/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`User ${action}d successfully`, {
          description: `${user.firstName} ${user.lastName} has been ${action}d`,
        });
        fetchUsers(); // Refresh the list
      } else {
        toast.error(data.error || `Failed to ${action} user`);
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast.error(`Failed to ${action} user`);
    } finally {
      setUpdatingStatus(null);
    }
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
      const response = await fetch('/api/admin/system-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addUserForm.email,
          firstName: addUserForm.firstName,
          lastName: addUserForm.lastName,
          role: addUserForm.role,
          jobTitle: addUserForm.jobTitle || undefined,
          departmentId: addUserForm.departmentId || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || 'User created successfully', {
          description: `${addUserForm.firstName} ${addUserForm.lastName} has been added. A welcome email has been sent.`,
        });

        // Add the new user to the list immediately without refreshing
        const newUser: User = {
          id: data.data.id,
          email: data.data.email,
          firstName: data.data.firstName,
          lastName: data.data.lastName,
          role: data.data.role,
          status: data.data.status,
          employeeId: data.data.employeeId || null,
          departmentId: data.data.department?.id || null,
          createdAt: data.data.createdAt,
          lastLoginAt: null,
          department: data.data.department || null,
          employee: null,
          tenant: data.data.tenant,
        };

        // Add to the beginning of the users list
        setUsers([newUser, ...users]);

        setIsAddUserDialogOpen(false);
        setAddUserForm({
          email: '',
          firstName: '',
          lastName: '',
          role: 'EMPLOYEE',
          jobTitle: '',
          departmentId: '',
        });
      } else {
        toast.error(data.error || 'Failed to create user', {
          description: data.details || undefined,
        });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleCSVImport = async () => {
    if (!importFile) {
      toast.error('Please select a CSV file');
      return;
    }

    setImportLoading(true);
    setImportResults(null);

    try {
      // Parse CSV file
      const text = await importFile.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        toast.error('CSV file is empty');
        return;
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim());

      // Validate headers
      const requiredHeaders = ['email', 'firstName', 'lastName', 'role'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

      if (missingHeaders.length > 0) {
        toast.error(`Missing required headers: ${missingHeaders.join(', ')}`);
        return;
      }

      // Parse rows
      const users = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const user: any = {};
        headers.forEach((header, index) => {
          const value = values[index] || '';
          // Only include non-empty values
          if (value && value.trim() !== '') {
            user[header] = value;
          }
        });
        return user;
      }).filter(user => user.email); // Filter out empty rows

      if (users.length === 0) {
        toast.error('No valid user data found in CSV');
        return;
      }

      // Send to API
      const response = await fetch('/api/admin/system-users/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users }),
      });

      const data = await response.json();

      if (data.success) {
        setImportResults(data);
        toast.success(data.message);
        fetchUsers();
      } else {
        // Show detailed error information
        console.error('Import failed:', data);
        const errorMessage = data.error || 'Import failed';
        const detailsMessage = data.invalidRows
          ? `Row ${data.invalidRows[0]?.row}: ${data.invalidRows[0]?.errors?.join(', ')}`
          : data.details || '';

        toast.error(errorMessage, {
          description: detailsMessage,
          duration: 5000,
        });
        setImportResults(data);
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast.error('Failed to import CSV');
    } finally {
      setImportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Users Management</h1>
            <p className="text-gray-600 mt-1">Manage administrative user accounts and permissions</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsImportDialogOpen(true)}
              variant="outline"
              className="border-purple-200 hover:bg-purple-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Button
              onClick={() => setIsAddUserDialogOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{totalUsers}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">{activeUsers}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Admins</p>
                  <p className="text-2xl font-bold text-red-600 mt-2">{admins}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Managers</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{managers}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or employee ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Users List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
                <p className="text-gray-600">Try adjusting your filters or add a new user</p>
              </CardContent>
            </Card>
          ) : (
            filteredUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {user.firstName} {user.lastName}
                            </h3>
                            <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                              {user.role}
                            </Badge>
                            <Badge variant="outline" className={getStatusBadgeColor(user.status)}>
                              {user.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {user.email}
                            </span>
                            {user.employee?.employeeNumber && (
                              <>
                                <span>•</span>
                                <span>ID: {user.employee.employeeNumber}</span>
                              </>
                            )}
                            {user.department && (
                              <>
                                <span>•</span>
                                <span>{user.department.name}</span>
                              </>
                            )}
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Last login: {formatDate(user.lastLoginAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssignRole(user)}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Change Role
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusToggle(user)}
                          disabled={updatingStatus === user.id}
                          className={user.status === 'ACTIVE' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}
                        >
                          {updatingStatus === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : user.status === 'ACTIVE' ? (
                            <>
                              <Ban className="w-4 h-4 mr-2" />
                              Suspend
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Activate
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Summary */}
        {filteredUsers.length > 0 && (
          <div className="text-center text-sm text-gray-600">
            Showing {filteredUsers.length} of {totalUsers} users
          </div>
        )}
      </div>

      {/* User Role Dialog */}
      {selectedUser && (
        <UserRoleDialog
          user={{
            id: selectedUser.id,
            email: selectedUser.email,
            firstName: selectedUser.firstName,
            lastName: selectedUser.lastName,
            role: selectedUser.role,
            jobTitle: selectedUser.employee?.jobTitle || undefined,
            departmentId: selectedUser.departmentId || undefined,
          }}
          isOpen={isRoleDialogOpen}
          onClose={handleRoleDialogClose}
          onSuccess={handleRoleAssignmentSuccess}
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
                      <p className="text-sm text-gray-600">Create a new user account</p>
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
                        {departments.map((dept) => (
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

      {/* CSV Import Dialog */}
      <AnimatePresence>
        {isImportDialogOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => {
                if (!importLoading) {
                  setIsImportDialogOpen(false);
                  setImportFile(null);
                  setImportResults(null);
                }
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget && !importLoading) {
                  setIsImportDialogOpen(false);
                  setImportFile(null);
                  setImportResults(null);
                }
              }}
            >
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl p-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Import Users from CSV</h2>
                    <p className="text-gray-600 mt-1">Upload a CSV file to bulk import users</p>
                  </div>
                  <button
                    onClick={() => {
                      if (!importLoading) {
                        setIsImportDialogOpen(false);
                        setImportFile(null);
                        setImportResults(null);
                      }
                    }}
                    className="text-gray-400 hover:text-gray-600"
                    disabled={importLoading}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Download Templates Section */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download Templates
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Start with our templates to ensure proper formatting
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a href="/templates/system-users-import-template.csv" download>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        System Users Template
                      </Button>
                    </a>
                    <a href="/templates/departments-and-job-titles-reference.csv" download>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Job Titles Reference (110+ titles)
                      </Button>
                    </a>
                    <Button variant="outline" size="sm" onClick={async () => {
                      try {
                        const response = await fetch('/api/admin/departments');
                        const data = await response.json();
                        if (data.success && data.data) {
                          const csvContent = 'Department Name,Department ID\n' +
                            data.data.map((d: any) => `${d.name},${d.id}`).join('\n');
                          const blob = new Blob([csvContent], { type: 'text/csv' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'departments.csv';
                          a.click();
                          window.URL.revokeObjectURL(url);
                        }
                      } catch (error) {
                        console.error('Failed to download departments:', error);
                      }
                    }}>
                      <Download className="w-4 h-4 mr-2" />
                      Departments List
                    </Button>
                  </div>
                  <div className="mt-3 p-3 bg-white rounded-lg border border-indigo-200">
                    <p className="text-xs text-gray-600 mb-1">
                      <strong>Templates included:</strong>
                    </p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• <strong>System Users Template:</strong> Uses department names (easier!)</li>
                      <li>• <strong>Job Titles Reference:</strong> 110+ titles across 12 departments</li>
                      <li>• <strong>Departments List:</strong> Your organization's departments</li>
                    </ul>
                    <p className="text-xs text-indigo-700 mt-2 font-medium">
                      💡 Tip: Use department names like "Engineering" instead of UUIDs
                    </p>
                  </div>
                </div>

                {/* CSV Format Info */}
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <h4 className="font-semibold text-gray-900 mb-2">CSV Format</h4>
                  <p className="text-gray-600 mb-2">Required columns:</p>
                  <code className="block bg-white p-2 rounded border text-xs">
                    email,firstName,lastName,role,jobTitle,departmentName,departmentId,managerId
                  </code>
                  <p className="text-gray-600 mt-2">
                    <strong>Roles:</strong> ADMIN, MANAGER, EMPLOYEE, HR, ACCOUNTANT
                  </p>
                  <p className="text-gray-600 mt-1">
                    <strong>💡 Tip:</strong> Use departmentName (e.g., "Engineering") instead of departmentId UUIDs
                  </p>
                </div>

                {/* File Upload */}
                <div>
                  <Label>Select CSV File</Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImportFile(file);
                          setImportResults(null);
                        }
                      }}
                      disabled={importLoading}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-semibold
                        file:bg-purple-50 file:text-purple-700
                        hover:file:bg-purple-100
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  {importFile && (
                    <p className="text-sm text-gray-600 mt-2">
                      Selected: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>

                {/* Import Results */}
                {importResults && (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-2">Import Summary</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-green-600 font-medium">Successful</p>
                          <p className="text-2xl font-bold text-green-900">{importResults.summary?.successful || 0}</p>
                        </div>
                        <div>
                          <p className="text-yellow-600 font-medium">Skipped</p>
                          <p className="text-2xl font-bold text-yellow-900">{importResults.summary?.skipped || 0}</p>
                        </div>
                        <div>
                          <p className="text-red-600 font-medium">Failed</p>
                          <p className="text-2xl font-bold text-red-900">{importResults.summary?.failed || 0}</p>
                        </div>
                      </div>
                    </div>

                    {/* Failed Rows */}
                    {importResults.details?.failed?.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                        <h4 className="font-semibold text-red-900 mb-2">Failed Rows</h4>
                        <ul className="text-sm text-red-800 space-y-1">
                          {importResults.details.failed.map((item: any, index: number) => (
                            <li key={index}>
                              Row {item.row}: {item.email} - {item.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Skipped Rows */}
                    {importResults.details?.skipped?.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                        <h4 className="font-semibold text-yellow-900 mb-2">Skipped Rows</h4>
                        <ul className="text-sm text-yellow-800 space-y-1">
                          {importResults.details.skipped.map((item: any, index: number) => (
                            <li key={index}>
                              Row {item.row}: {item.email} - {item.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsImportDialogOpen(false);
                      setImportFile(null);
                      setImportResults(null);
                    }}
                    disabled={importLoading}
                    className="flex-1"
                  >
                    {importResults ? 'Close' : 'Cancel'}
                  </Button>
                  {!importResults && (
                    <Button
                      onClick={handleCSVImport}
                      disabled={!importFile || importLoading}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      {importLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Import Users
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
