'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Briefcase, Loader2, Building2, Users as UsersIcon, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  jobTitle?: string;
  departmentId?: string;
  managerId?: string;
}

interface Department {
  id: string;
  name: string;
}

interface Manager {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  role: string;
  departmentId?: string;
  employeeId?: string;
  managerId?: string; // Employee.id of this manager's manager
  manager?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  teamLeadId?: string;
  leadId: string;
  lead: {
    firstName: string;
    lastName: string;
  };
}

interface RoleAssignmentDialogProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin', color: 'text-red-600' },
  { value: 'MANAGER', label: 'Manager', color: 'text-blue-600' },
  { value: 'HR', label: 'HR', color: 'text-purple-600' },
  { value: 'ACCOUNTANT', label: 'Accountant', color: 'text-green-600' },
  { value: 'EMPLOYEE', label: 'Employee', color: 'text-gray-600' },
];

export default function RoleAssignmentDialog({
  user,
  isOpen,
  onClose,
  onSuccess,
}: RoleAssignmentDialogProps) {
  const [role, setRole] = useState(user.role);
  const [jobTitle, setJobTitle] = useState(user.jobTitle || '');
  const [departmentId, setDepartmentId] = useState(user.departmentId || '');
  const [managerId, setManagerId] = useState(user.managerId || '');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Data from API
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  // Fetch departments, managers, and teams
  useEffect(() => {
    if (isOpen) {
      fetchDropdownData();
    }
  }, [isOpen]);

  const fetchDropdownData = async () => {
    setLoadingData(true);
    try {
      // Reset scroll position to top when opening
      setTimeout(() => {
        const formElement = document.querySelector('[data-role-assignment-form]');
        if (formElement) {
          formElement.scrollTop = 0;
        }
      }, 0);

      // Fetch departments
      const deptRes = await fetch('/api/admin/departments');
      const deptData = await deptRes.json();
      if (deptData.success) {
        setDepartments(deptData.data || []);
      }

      // Fetch users with managerial roles (ADMIN, MANAGER, and HR)
      const mgrRes = await fetch('/api/admin/employees?role=ADMIN,MANAGER,HR');
      const mgrData = await mgrRes.json();
      if (mgrData.success) {
        setManagers(mgrData.data || []);
      }

      // Fetch teams
      const teamRes = await fetch('/api/admin/teams');
      const teamData = await teamRes.json();
      if (teamData.success) {
        setTeams(teamData.teams || []);
      }

      // Fetch employee's current team memberships
      const empRes = await fetch(`/api/admin/employees/${user.id}/details`);
      const empData = await empRes.json();
      if (empData.success && empData.data?.employee?.teamMemberships) {
        const currentTeams = empData.data.employee.teamMemberships.map(
          (tm: any) => tm.teamId
        );
        setSelectedTeams(currentTeams);
      }
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      toast.error('Failed to load options');
    } finally {
      setLoadingData(false);
    }
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeams((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId]
    );
  };

  // Show all managers without department filter
  // All ADMIN, MANAGER, and HR users can be selected as managers
  const filteredManagers = managers;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      // Update role, designation, department, and manager
      const response = await fetch(`/api/admin/employees/${user.id}/assign-role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          jobTitle,
          departmentId: departmentId || undefined,
          managerId: managerId || undefined,
          teams: selectedTeams,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Employee updated successfully', {
          description: `${user.firstName} ${user.lastName}'s details have been updated`,
        });
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || 'Failed to update employee');
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Network error', {
        description: 'Please check your connection and try again',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={onClose}
          >
            <div
              className="w-full max-w-md max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header - Fixed */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Assign Role & Designation</h2>
                  <p className="text-sm text-gray-600">
                    {user.firstName} {user.lastName}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form - Scrollable */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-6 space-y-4"
              data-role-assignment-form
            >
              {loadingData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  <span className="ml-2 text-sm text-gray-600">Loading options...</span>
                </div>
              ) : (
                <>
                  {/* User Role */}
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      User Role
                    </Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className={option.color}>{option.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      User role determines system access permissions
                    </p>
                  </div>

                  {/* Job Title/Designation */}
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Job Designation
                    </Label>
                    <Input
                      id="jobTitle"
                      type="text"
                      placeholder="e.g., Senior Software Engineer"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      Job title/designation for employee profile
                    </p>
                  </div>

                  {/* Department */}
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Department
                    </Label>
                    <Select value={departmentId || "none"} onValueChange={(val) => setDepartmentId(val === "none" ? "" : val)}>
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
                    <p className="text-xs text-gray-500">
                      Organizational department assignment
                    </p>
                  </div>

                  {/* Manager */}
                  <div className="space-y-2">
                    <Label htmlFor="manager" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <UsersIcon className="w-4 h-4" />
                      Reporting Manager
                    </Label>
                    <Select value={managerId || "none"} onValueChange={(val) => setManagerId(val === "none" ? "" : val)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {filteredManagers.filter((m) => m.id !== user.id).map((mgr) => (
                          <SelectItem key={mgr.id} value={mgr.id}>
                            {mgr.firstName} {mgr.lastName} ({mgr.role === 'ADMIN' ? 'Admin' : mgr.role === 'MANAGER' ? 'Manager' : 'HR'})
                            {mgr.jobTitle && ` - ${mgr.jobTitle}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Direct reporting manager for this employee
                    </p>
                  </div>

                  {/* Reporting Hierarchy Chain */}
                  {managerId && managerId !== "none" && (() => {
                    // Build hierarchy chain from selected manager upwards
                    const buildHierarchyChain = (): Manager[] => {
                      const chain: Manager[] = [];
                      let currentManager = managers.find((m) => m.id === managerId);

                      while (currentManager) {
                        chain.push(currentManager);
                        // Find this manager's manager using Employee.id reference
                        if (currentManager.managerId) {
                          // managerId here is Employee.id, we need to find the manager by employeeId
                          currentManager = managers.find((m) => m.employeeId === currentManager?.managerId);
                        } else if (currentManager.manager) {
                          // Try to find by manager.id (Employee.id)
                          currentManager = managers.find((m) => m.employeeId === currentManager?.manager?.id);
                        } else {
                          currentManager = undefined;
                        }
                      }
                      return chain;
                    };

                    const hierarchyChain = buildHierarchyChain();

                    if (hierarchyChain.length <= 1) return null;

                    return (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <UsersIcon className="w-4 h-4" />
                          Reporting Hierarchy
                        </Label>
                        <div className="flex flex-wrap items-center gap-1 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100">
                          {/* Show from top of hierarchy to selected manager */}
                          {[...hierarchyChain].reverse().map((mgr, index, arr) => (
                            <div key={mgr.id} className="flex items-center">
                              <span className={`text-sm px-2 py-1 rounded ${
                                index === arr.length - 1
                                  ? 'bg-purple-600 text-white font-medium'
                                  : 'bg-white text-gray-700 border'
                              }`}>
                                {mgr.firstName} {mgr.lastName}
                                <span className="text-xs opacity-75 ml-1">
                                  ({mgr.role === 'ADMIN' ? 'Admin' : mgr.role === 'MANAGER' ? 'Mgr' : mgr.role})
                                </span>
                              </span>
                              {index < arr.length - 1 && (
                                <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />
                              )}
                            </div>
                          ))}
                          <ChevronRight className="w-4 h-4 text-purple-400 mx-1" />
                          <span className="text-sm px-2 py-1 rounded bg-indigo-600 text-white font-medium">
                            {user.firstName} {user.lastName}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Reporting chain from top management to this employee
                        </p>
                      </div>
                    );
                  })()}

                  {/* Manager's Teams */}
                  {managerId && managerId !== "none" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <UsersIcon className="w-4 h-4" />
                        Manager's Teams
                      </Label>
                      {(() => {
                        const selectedManager = managers.find((m) => m.id === managerId);
                        const managerTeams = teams.filter((team) => team.teamLeadId === selectedManager?.employeeId);

                        if (managerTeams.length === 0) {
                          return (
                            <p className="text-sm text-gray-500 py-2">
                              {selectedManager?.firstName} {selectedManager?.lastName} doesn't lead any teams
                            </p>
                          );
                        }

                        return (
                          <div className="space-y-2 border rounded-md p-3 bg-gray-50">
                            {managerTeams.map((team) => (
                              <div
                                key={team.id}
                                className="flex items-center gap-2 p-2 bg-white rounded border"
                              >
                                <UsersIcon className="w-4 h-4 text-purple-600" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{team.name}</p>
                                  {team.description && (
                                    <p className="text-xs text-gray-500">{team.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      <p className="text-xs text-gray-500">
                        Teams led by the selected manager
                      </p>
                    </div>
                  )}
                </>
              )}
            </form>

            {/* Actions - Fixed Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading || loadingData}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update'
                  )}
                </Button>
              </div>
            </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
