'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  User,
  Users,
  Crown,
  Shield,
  UserCog,
  UserPlus,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

type AddPosition = 'above' | 'below';

interface OrganizationTreeChartProps {
  data: EmployeeNode[];
  onEmployeeClick?: (employee: EmployeeNode) => void;
  onAssignRole?: (employeeId: string) => void;
  onAddUser?: (position?: AddPosition, referenceEmployee?: EmployeeNode) => void;
  onAutoApprove?: (employeeId: string, employeeName: string) => void;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return <Crown className="w-3 h-3 text-yellow-600" />;
    case 'MANAGER':
      return <UserCog className="w-3 h-3 text-blue-600" />;
    case 'HR':
      return <Shield className="w-3 h-3 text-purple-600" />;
    default:
      return <User className="w-3 h-3 text-gray-600" />;
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

function EmployeeTreeNode({
  employee,
  level = 0,
  onEmployeeClick,
  onAssignRole,
  onAddUser,
  onAutoApprove,
  isFirst = false,
  isLast = false,
}: {
  employee: EmployeeNode;
  level?: number;
  onEmployeeClick?: (employee: EmployeeNode) => void;
  onAssignRole?: (employeeId: string) => void;
  onAddUser?: (position?: AddPosition, referenceEmployee?: EmployeeNode) => void;
  onAutoApprove?: (employeeId: string, employeeName: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

  const hasSubordinates = employee.subordinates && employee.subordinates.length > 0;

  return (
    <div className="relative flex flex-col items-center">
      {/* Employee Card */}
      <div className="relative z-10">
        <Card
          className={`w-64 p-3 hover:shadow-lg transition-all cursor-pointer border-t-4 group ${
            employee.role === 'ADMIN'
              ? 'border-t-yellow-500 hover:border-t-yellow-600'
              : employee.role === 'MANAGER'
              ? 'border-t-blue-500 hover:border-t-blue-600'
              : employee.role === 'HR'
              ? 'border-t-purple-500 hover:border-t-purple-600'
              : 'border-t-gray-300 hover:border-t-gray-400'
          }`}
          onClick={() => onEmployeeClick?.(employee)}
        >
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {employee.avatarUrl ? (
                <img
                  src={employee.avatarUrl}
                  alt={employee.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
                  {employee.firstName[0]}
                  {employee.lastName[0]}
                </div>
              )}
            </div>

            {/* Employee Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1">
                <h3 className="font-semibold text-gray-900 text-sm truncate">
                  {employee.firstName} {employee.lastName}
                </h3>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {getRoleIcon(employee.role)}
                </div>
              </div>
              <p className="text-xs text-gray-600 truncate mt-0.5">{employee.jobTitle}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-xs py-0 ${getRoleBadgeColor(employee.role)}`}>
                  {employee.role}
                </Badge>
                {hasSubordinates && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {employee.subordinatesCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons (shown on hover) */}
          <div className="mt-2 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onAssignRole?.(employee.id);
              }}
            >
              <UserPlus className="w-3 h-3 mr-1" />
              Assign Role
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              onClick={(e) => {
                e.stopPropagation();
                onAddUser?.('below', employee);
              }}
              title="Add subordinate (reports to this person)"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* Expand/Collapse Button */}
        {hasSubordinates && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 p-1 bg-white border-2 border-gray-300 rounded-full hover:bg-gray-50 transition-colors shadow-sm"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </button>
        )}
      </div>

      {/* Connector Line Down */}
      {hasSubordinates && isExpanded && (
        <div className="w-0.5 h-8 bg-gray-300 relative z-0" />
      )}

      {/* Subordinates */}
      <AnimatePresence>
        {hasSubordinates && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            {/* Subordinates Grid */}
            <div className="flex gap-4 pt-8 relative">
              {/* Horizontal Line - spans from first to last child center */}
              {employee.subordinates.length > 1 && (
                <div
                  className="absolute top-0 h-0.5 bg-gray-300"
                  style={{
                    left: 'calc(132px)',  // Half of first card (264px / 2)
                    right: 'calc(132px)', // Half of last card
                  }}
                />
              )}

              {employee.subordinates.map((subordinate, index) => (
                <div key={subordinate.id} className="relative">
                  {/* Vertical connector from horizontal line to card */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-0.5 bg-gray-300"
                    style={{
                      top: '-32px',
                      height: '32px',
                    }}
                  />

                  <EmployeeTreeNode
                    employee={subordinate}
                    level={level + 1}
                    onEmployeeClick={onEmployeeClick}
                    onAssignRole={onAssignRole}
                    onAddUser={onAddUser}
                    isFirst={index === 0}
                    isLast={index === employee.subordinates.length - 1}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OrganizationTreeChart({
  data,
  onEmployeeClick,
  onAssignRole,
  onAddUser,
}: OrganizationTreeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No organization data</h3>
        <p className="text-gray-600 mb-4">
          There are no employees to display in the organization tree.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-8">
      <div className="inline-flex flex-col items-center gap-4 min-w-full justify-center px-8">
        {data.map((employee, index) => (
          <EmployeeTreeNode
            key={employee.id}
            employee={employee}
            level={0}
            onEmployeeClick={onEmployeeClick}
            onAssignRole={onAssignRole}
            isFirst={index === 0}
            isLast={index === data.length - 1}
            onAddUser={onAddUser}
          />
        ))}
      </div>
    </div>
  );
}
