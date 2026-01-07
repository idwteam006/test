'use client';

import { useState, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  User,
  Mail,
  Briefcase,
  Users,
  Building2,
  Crown,
  Shield,
  UserCog,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import Image from 'next/image';

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

interface OrganizationTreeProps {
  data: EmployeeNode[];
  onEmployeeClick?: (employee: EmployeeNode) => void;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return <Crown className="w-4 h-4 text-yellow-600" />;
    case 'MANAGER':
      return <UserCog className="w-4 h-4 text-blue-600" />;
    case 'HR':
      return <Shield className="w-4 h-4 text-purple-600" />;
    default:
      return <User className="w-4 h-4 text-gray-600" />;
  }
};

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'MANAGER':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'HR':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'ACCOUNTANT':
      return 'bg-green-100 text-green-700 border-green-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

// Memoized tree node component to prevent cascade re-renders
const EmployeeTreeNode = memo(function EmployeeTreeNode({
  employee,
  level = 0,
  onEmployeeClick,
}: {
  employee: EmployeeNode;
  level?: number;
  onEmployeeClick?: (employee: EmployeeNode) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

  const hasSubordinates = employee.subordinates && employee.subordinates.length > 0;

  // Memoize click handlers to prevent unnecessary re-renders
  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);

  const handleEmployeeClick = useCallback(() => {
    onEmployeeClick?.(employee);
  }, [onEmployeeClick, employee]);

  return (
    <div className="relative">
      {/* Connection Line */}
      {level > 0 && (
        <div className="absolute left-0 top-0 w-6 h-6 border-l-2 border-b-2 border-gray-300 rounded-bl-lg" />
      )}

      <div className={`${level > 0 ? 'ml-6' : ''}`}>
        <Card
          className={`mb-3 p-4 hover:shadow-md transition-all cursor-pointer border-l-4 ${
            employee.role === 'ADMIN'
              ? 'border-l-yellow-500'
              : employee.role === 'MANAGER'
              ? 'border-l-blue-500'
              : employee.role === 'HR'
              ? 'border-l-purple-500'
              : 'border-l-gray-300'
          }`}
          onClick={handleEmployeeClick}
        >
          <div className="flex items-start gap-4">
            {/* Expand/Collapse Button */}
            {hasSubordinates && (
              <button
                onClick={handleToggleExpand}
                className="mt-1 p-1 hover:bg-gray-100 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                )}
              </button>
            )}

            {/* Avatar - Using next/image for optimization */}
            <div className="flex-shrink-0">
              {employee.avatarUrl ? (
                <Image
                  src={employee.avatarUrl}
                  alt={employee.name}
                  width={48}
                  height={48}
                  className="rounded-full object-cover border-2 border-gray-200"
                  loading="lazy"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-lg">
                  {employee.firstName[0]}
                  {employee.lastName[0]}
                </div>
              )}
            </div>

            {/* Employee Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-lg truncate">
                    {employee.firstName} {employee.lastName}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">{employee.jobTitle}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {getRoleIcon(employee.role)}
                  <Badge className={getRoleBadgeColor(employee.role)}>{employee.role}</Badge>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{employee.email}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  <span>{employee.departmentName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  <span>{employee.employeeNumber}</span>
                </div>
                {hasSubordinates && (
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>
                      {employee.subordinatesCount} direct report
                      {employee.subordinatesCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Subordinates */}
        <AnimatePresence>
          {hasSubordinates && isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="ml-6 border-l-2 border-gray-200 pl-4"
            >
              {employee.subordinates.map((subordinate) => (
                <EmployeeTreeNode
                  key={subordinate.id}
                  employee={subordinate}
                  level={level + 1}
                  onEmployeeClick={onEmployeeClick}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default function OrganizationTree({ data, onEmployeeClick }: OrganizationTreeProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No organization data</h3>
        <p className="text-gray-600">There are no employees to display in the organization tree.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((employee) => (
        <EmployeeTreeNode
          key={employee.id}
          employee={employee}
          level={0}
          onEmployeeClick={onEmployeeClick}
        />
      ))}
    </div>
  );
}
