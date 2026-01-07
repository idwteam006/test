'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Briefcase, Loader2, Building2 } from 'lucide-react';
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
import { getDesignationsByDepartment, COMMON_DESIGNATIONS } from '@/lib/form-data';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  jobTitle?: string;
  departmentId?: string;
}

interface Department {
  id: string;
  name: string;
}

interface UserRoleDialogProps {
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

export default function UserRoleDialog({
  user,
  isOpen,
  onClose,
  onSuccess,
}: UserRoleDialogProps) {
  const [role, setRole] = useState(user.role);
  const [jobTitle, setJobTitle] = useState(user.jobTitle || '');
  const [customDesignation, setCustomDesignation] = useState('');
  const [departmentId, setDepartmentId] = useState(user.departmentId || '');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDesignations, setFilteredDesignations] = useState<string[]>(COMMON_DESIGNATIONS);

  // Fetch departments
  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      // Reset custom designation state
      setCustomDesignation('');
    }
  }, [isOpen]);

  // Update filtered designations when department changes
  useEffect(() => {
    if (departmentId && departmentId !== 'none') {
      const dept = departments.find(d => d.id === departmentId);
      if (dept) {
        const designations = getDesignationsByDepartment(dept.name);
        setFilteredDesignations(designations);
      }
    } else {
      setFilteredDesignations(COMMON_DESIGNATIONS);
    }
  }, [departmentId, departments]);

  const fetchDepartments = async () => {
    setLoadingData(true);
    try {
      const response = await fetch('/api/admin/departments');
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use custom designation if provided, otherwise use jobTitle from dropdown/input
      const finalJobTitle = customDesignation.trim() || jobTitle;

      const response = await fetch(`/api/admin/employees/${user.id}/assign-role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          jobTitle: finalJobTitle,
          departmentId: departmentId && departmentId !== 'none' ? departmentId : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('User role updated successfully', {
          description: `${user.firstName} ${user.lastName}'s role has been updated`,
        });
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Network error', {
        description: 'Please check your connection and try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentChange = (value: string) => {
    setDepartmentId(value);
    // Clear designation selections when department changes
    setJobTitle('');
    setCustomDesignation('');
  };

  const handleDesignationSelect = (value: string) => {
    setJobTitle(value);
    setCustomDesignation(''); // Clear custom when selecting from dropdown
  };

  const handleCustomDesignationChange = (value: string) => {
    setCustomDesignation(value);
    if (value.trim()) {
      setJobTitle(''); // Clear dropdown when typing custom
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
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Change Role & Designation</h2>
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

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className="flex-1 overflow-y-auto p-6 space-y-4"
              >
                {loadingData ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    <span className="ml-2 text-sm text-gray-600">Loading...</span>
                  </div>
                ) : (
                  <>
                    {/* User Role */}
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        User Role *
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

                    {/* Department */}
                    <div className="space-y-2">
                      <Label htmlFor="department" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Department
                      </Label>
                      <Select value={departmentId || 'none'} onValueChange={handleDepartmentChange}>
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
                        Select department to see relevant designations
                      </p>
                    </div>

                    {/* Job Designation */}
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Job Designation
                      </Label>
                      <Select
                        value={jobTitle}
                        onValueChange={handleDesignationSelect}
                        disabled={!departmentId || departmentId === 'none' || !!customDesignation.trim()}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={
                            departmentId && departmentId !== 'none'
                              ? "Select designation"
                              : "Select department first"
                          } />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {filteredDesignations.map((designation) => (
                            <SelectItem key={designation} value={designation}>
                              {designation}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="relative">
                        <Input
                          id="jobTitle"
                          type="text"
                          placeholder="Or type custom designation"
                          value={customDesignation}
                          onChange={(e) => handleCustomDesignationChange(e.target.value)}
                          disabled={!departmentId || departmentId === 'none'}
                          className="mt-2"
                        />
                        {customDesignation.trim() && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Custom designation will be used: "{customDesignation.trim()}"
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Job title/designation for employee profile
                      </p>
                    </div>

                  </>
                )}
              </form>

              {/* Actions */}
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
                      'Update Role'
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
