'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Filter,
  Grid,
  List,
  UserPlus,
  Download,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Network,
  ChevronDown,
  ChevronRight,
  Crown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  role: string;
  status: string;
  departmentId: string;
  department: {
    name: string;
  } | null;
  avatarUrl: string | null;
  employee?: {
    jobTitle: string;
    startDate: string;
  } | null;
  employeeProfile?: {
    personalPhone: string;
  } | null;
}

interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  onLeaveToday: number;
  pendingTasks: number;
  departments: { name: string; count: number }[];
}

export default function MyTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<TeamStats>({
    totalMembers: 0,
    activeMembers: 0,
    onLeaveToday: 0,
    pendingTasks: 0,
    departments: [],
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'tree'>('grid');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTeamData();
  }, []);

  useEffect(() => {
    filterTeamMembers();
  }, [searchQuery, selectedDepartment, selectedStatus, teamMembers]);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/manager/team');
      const data = await response.json();

      if (data.success) {
        setTeamMembers(data.members);
        setStats(data.stats);
        setFilteredMembers(data.members);
      } else {
        toast.error('Failed to fetch team data');
      }
    } catch (error) {
      console.error('Error fetching team:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const filterTeamMembers = () => {
    let filtered = [...teamMembers];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((member) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          member.firstName.toLowerCase().includes(searchLower) ||
          member.lastName.toLowerCase().includes(searchLower) ||
          member.email.toLowerCase().includes(searchLower) ||
          member.employeeId?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Department filter
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter((m) => m.departmentId === selectedDepartment);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((m) => m.status === selectedStatus);
    }

    setFilteredMembers(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'ON_LEAVE':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800';
      case 'HR':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Build tree hierarchy based on manager-subordinate relationships
  const buildTeamTree = () => {
    // For tree view, we need to fetch the actual manager-subordinate relationship
    // For now, we'll organize by department and role hierarchy
    const managers = filteredMembers.filter(m => m.role === 'MANAGER' || m.role === 'ADMIN');
    const others = filteredMembers.filter(m => m.role !== 'MANAGER' && m.role !== 'ADMIN');

    return managers.map(manager => ({
      ...manager,
      subordinates: others.filter(emp => emp.departmentId === manager.departmentId)
    }));
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Tree Node Component
  const TreeNode = ({ member, level = 0, subordinates = [] }: { member: TeamMember; level?: number; subordinates?: TeamMember[] }) => {
    const hasChildren = subordinates && subordinates.length > 0;
    const isExpanded = expandedNodes.has(member.id);
    const indent = level * 24;

    return (
      <div>
        <div
          className={`flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors ${
            level === 0 ? 'bg-purple-50 border-l-4 border-purple-600' : ''
          }`}
          style={{ paddingLeft: `${indent + 12}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleNode(member.id);
            } else {
              router.push(`/manager/team/${member.id}`);
            }
          }}
        >
          {/* Expand/Collapse Icon */}
          <div className="w-5 flex-shrink-0">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(member.id);
                }}
                className="p-0.5 hover:bg-slate-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                )}
              </button>
            )}
          </div>

          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${
            level === 0 ? 'from-purple-600 to-indigo-600' : 'from-blue-500 to-cyan-500'
          } flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
            {getInitials(member.firstName, member.lastName)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 truncate">
                {member.firstName} {member.lastName}
              </h3>
              {level === 0 && <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />}
            </div>
            <p className="text-sm text-slate-600 truncate">
              {member.employee?.jobTitle || member.department?.name || 'Employee'}
            </p>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={getStatusColor(member.status)} >
              {member.status}
            </Badge>
            <Badge className={getRoleBadgeColor(member.role)}>
              {member.role}
            </Badge>
            {hasChildren && (
              <Badge variant="outline" className="text-xs">
                {subordinates.length} {subordinates.length === 1 ? 'member' : 'members'}
              </Badge>
            )}
          </div>
        </div>

        {/* Subordinates */}
        {hasChildren && isExpanded && (
          <div className="ml-4 mt-1 space-y-1">
            {subordinates.map(sub => (
              <TreeNode key={sub.id} member={sub} level={level + 1} subordinates={[]} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Team</h1>
          <p className="text-gray-600 mt-1">
            Manage and monitor your team members
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push('/manager/invite-employee')} variant="outline">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Members</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMembers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Members</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeMembers}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">On Leave Today</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.onLeaveToday}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Tasks</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingTasks}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, email, or employee ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Department Filter */}
            <div>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="all">All Departments</option>
                {stats.departments.map((dept) => (
                  <option key={dept.name} value={dept.name}>
                    {dept.name} ({dept.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ON_LEAVE">On Leave</option>
              </select>

              {/* View Toggle */}
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none border-x"
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'tree' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('tree')}
                  className="rounded-l-none"
                  title="Tree View - Organizational Hierarchy"
                >
                  <Network className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Team Members ({filteredMembers.length})
          </h2>
        </div>

        {viewMode === 'tree' ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5 text-purple-600" />
                Team Hierarchy
              </CardTitle>
              <p className="text-sm text-slate-600">
                Click on managers to expand/collapse their team members. Crown icon indicates team leaders.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {buildTeamTree().map(manager => (
                  <TreeNode
                    key={manager.id}
                    member={manager}
                    level={0}
                    subordinates={manager.subordinates}
                  />
                ))}
                {buildTeamTree().length === 0 && (
                  <div className="text-center py-12">
                    <Network className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">No hierarchy found</p>
                    <p className="text-sm text-slate-500 mt-1">
                      No managers or team leaders in the filtered results
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => (
              <Card
                key={member.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/manager/team/${member.id}`)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-semibold">
                      {getInitials(member.firstName, member.lastName)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {member.firstName} {member.lastName}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">{member.email}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {member.employee?.jobTitle || member.department?.name || 'Employee'}
                      </p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <Badge className={getStatusColor(member.status)}>
                      {member.status}
                    </Badge>
                    <Badge className={getRoleBadgeColor(member.role)}>
                      {member.role}
                    </Badge>
                    {member.department && (
                      <Badge variant="outline">
                        {member.department.name}
                      </Badge>
                    )}
                  </div>

                  {/* Employee ID */}
                  {member.employeeId && (
                    <p className="text-xs text-gray-500 mt-3">
                      ID: {member.employeeId}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Employee ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredMembers.map((member) => (
                      <tr
                        key={member.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/manager/team/${member.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                              {getInitials(member.firstName, member.lastName)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="text-sm text-gray-500">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getRoleBadgeColor(member.role)}>
                            {member.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {member.department?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getStatusColor(member.status)}>
                            {member.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {member.employeeId || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {filteredMembers.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No team members found</p>
              <p className="text-sm text-gray-500 mt-1">
                Try adjusting your filters or search query
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
