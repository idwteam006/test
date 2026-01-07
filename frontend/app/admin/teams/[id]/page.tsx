'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  UserPlus,
  UserMinus,
  Crown,
  Building2,
  Loader2,
  Mail,
  Briefcase,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TeamMember {
  id: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
    jobTitle?: string;
  };
  role: string;
  joinedAt: string;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  teamType: string;
  status: string;
  teamLead: {
    id: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
  } | null;
  department: {
    id: string;
    name: string;
  } | null;
  members: TeamMember[];
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  jobTitle?: string;
}

export default function TeamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedRole, setSelectedRole] = useState('MEMBER');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (teamId) {
      fetchTeamDetails();
      fetchAvailableEmployees();
    }
  }, [teamId]);

  const fetchTeamDetails = async () => {
    try {
      const response = await fetch(`/api/admin/teams/${teamId}`);
      const data = await response.json();

      if (data.success) {
        setTeam(data.team);
      } else {
        toast.error(data.error || 'Failed to load team details');
      }
    } catch (error) {
      console.error('Error fetching team:', error);
      toast.error('Failed to load team details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableEmployees = async () => {
    try {
      const response = await fetch('/api/admin/employees');
      const data = await response.json();

      if (data.success) {
        setAvailableEmployees(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleAddMember = async () => {
    if (!selectedEmployeeId) {
      toast.error('Please select an employee');
      return;
    }

    setActionLoading('add');

    try {
      const response = await fetch(`/api/admin/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedEmployeeId,
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Member added successfully!');
        setIsAddMemberOpen(false);
        setSelectedEmployeeId('');
        setSelectedRole('MEMBER');
        fetchTeamDetails();
      } else {
        toast.error(data.error || 'Failed to add member');
      }
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this team?`)) {
      return;
    }

    setActionLoading(memberId);

    try {
      const response = await fetch(`/api/admin/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Member removed successfully');
        fetchTeamDetails();
      } else {
        toast.error(data.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    } finally {
      setActionLoading(null);
    }
  };

  const getFilteredEmployees = () => {
    if (!team) return [];
    const memberUserIds = team.members.map(m => m.userId);
    return availableEmployees.filter(emp => !memberUserIds.includes(emp.id));
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      LEAD: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      MEMBER: 'bg-blue-100 text-blue-700 border-blue-200',
    };
    return colors[role] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading team details...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">Team not found</p>
          <Button onClick={() => router.push('/admin/teams')} className="mt-4">
            Back to Teams
          </Button>
        </div>
      </div>
    );
  }

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
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push('/admin/teams')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {team.name}
                </h1>
                {team.description && (
                  <p className="text-gray-600 mt-2">{team.description}</p>
                )}
              </div>
            </div>
            <Button
              onClick={() => setIsAddMemberOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Team Info Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Team Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-slate-500">Type</p>
                  <Badge className="mt-1">{team.teamType}</Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <Badge className="mt-1">{team.status}</Badge>
                </div>
                {team.teamLead && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Team Lead</p>
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium">
                          {team.teamLead.firstName} {team.teamLead.lastName}
                        </p>
                        {team.teamLead.jobTitle && (
                          <p className="text-xs text-slate-500">{team.teamLead.jobTitle}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {team.department && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Department</p>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <p className="text-sm">{team.department.name}</p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-500">Total Members</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {team.members.length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Members List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Members ({team.members.length})
                </CardTitle>
                <CardDescription>Manage team membership and roles</CardDescription>
              </CardHeader>
              <CardContent>
                {team.members.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 mb-4">No team members yet</p>
                    <Button onClick={() => setIsAddMemberOpen(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add First Member
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {team.members.map((member, index) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                            {member.user.firstName[0]}
                            {member.user.lastName[0]}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">
                                {member.user.firstName} {member.user.lastName}
                              </h3>
                              <Badge className={getRoleBadge(member.role)}>
                                {member.role}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {member.user.email}
                              </span>
                              {member.user.jobTitle && (
                                <span className="flex items-center gap-1">
                                  <Briefcase className="w-3 h-3" />
                                  {member.user.jobTitle}
                                </span>
                              )}
                              <span className="text-xs text-slate-400">
                                ID: {member.user.employeeId}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRemoveMember(
                              member.id,
                              `${member.user.firstName} ${member.user.lastName}`
                            )
                          }
                          disabled={actionLoading === member.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {actionLoading === member.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <UserMinus className="w-4 h-4" />
                          )}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add an employee to {team.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Employee *</label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {getFilteredEmployees().map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} - {emp.employeeId}
                      {emp.jobTitle && ` (${emp.jobTitle})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="LEAD">Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddMemberOpen(false);
                setSelectedEmployeeId('');
                setSelectedRole('MEMBER');
              }}
              disabled={actionLoading === 'add'}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={actionLoading === 'add' || !selectedEmployeeId}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600"
            >
              {actionLoading === 'add' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Member'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
