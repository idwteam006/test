/**
 * User Status Helper Utilities
 *
 * Provides helper functions for displaying and managing user status
 * according to the onboarding journey
 */

export type UserStatus =
  | 'INVITED'
  | 'PENDING_ONBOARDING'
  | 'ONBOARDING_COMPLETED'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'TERMINATED'
  | 'RESIGNED'
  | 'PENDING'; // Legacy

/**
 * Get user-friendly status label
 */
export function getUserStatusLabel(status: UserStatus): string {
  const labels: Record<UserStatus, string> = {
    INVITED: 'Invited',
    PENDING_ONBOARDING: 'Pending Onboarding',
    ONBOARDING_COMPLETED: 'Onboarding Completed',
    CHANGES_REQUESTED: 'Changes Requested',
    APPROVED: 'Approved',
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    SUSPENDED: 'Suspended',
    TERMINATED: 'Terminated',
    RESIGNED: 'Resigned',
    PENDING: 'Pending',
  };

  return labels[status] || status;
}

/**
 * Get status badge color classes for Tailwind CSS
 */
export function getUserStatusBadgeClass(status: UserStatus): string {
  const classes: Record<UserStatus, string> = {
    INVITED: 'bg-blue-100 text-blue-700 border-blue-300',
    PENDING_ONBOARDING: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    ONBOARDING_COMPLETED: 'bg-purple-100 text-purple-700 border-purple-300',
    CHANGES_REQUESTED: 'bg-orange-100 text-orange-700 border-orange-300',
    APPROVED: 'bg-green-100 text-green-700 border-green-300',
    ACTIVE: 'bg-green-100 text-green-700 border-green-300',
    INACTIVE: 'bg-gray-100 text-gray-700 border-gray-300',
    SUSPENDED: 'bg-red-100 text-red-700 border-red-300',
    TERMINATED: 'bg-red-100 text-red-700 border-red-300',
    RESIGNED: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    PENDING: 'bg-blue-100 text-blue-700 border-blue-300',
  };

  return classes[status] || 'bg-gray-100 text-gray-700 border-gray-300';
}

/**
 * Get status description for tooltips
 */
export function getUserStatusDescription(status: UserStatus): string {
  const descriptions: Record<UserStatus, string> = {
    INVITED: 'HR sent invite, waiting for employee to start onboarding',
    PENDING_ONBOARDING: 'Employee opened invite link but hasn\'t completed form',
    ONBOARDING_COMPLETED: 'Employee submitted form, waiting for HR review',
    CHANGES_REQUESTED: 'HR requested changes, employee needs to update information',
    APPROVED: 'HR approved profile, account ready to be activated',
    ACTIVE: 'Can login and access systems',
    INACTIVE: 'Temporarily disabled account',
    SUSPENDED: 'Account suspended due to disciplinary action',
    TERMINATED: 'Employee left the company',
    RESIGNED: 'Employee in notice period',
    PENDING: 'Legacy status - pending activation',
  };

  return descriptions[status] || 'Unknown status';
}

/**
 * Check if user can login based on status
 */
export function canUserLogin(status: UserStatus): boolean {
  return status === 'ACTIVE';
}

/**
 * Check if status is part of onboarding journey
 */
export function isOnboardingStatus(status: UserStatus): boolean {
  return [
    'INVITED',
    'PENDING_ONBOARDING',
    'ONBOARDING_COMPLETED',
    'CHANGES_REQUESTED',
    'APPROVED',
  ].includes(status);
}

/**
 * Get next possible statuses for transitions
 */
export function getNextPossibleStatuses(currentStatus: UserStatus): UserStatus[] {
  const transitions: Record<UserStatus, UserStatus[]> = {
    INVITED: ['PENDING_ONBOARDING', 'INACTIVE'],
    PENDING_ONBOARDING: ['ONBOARDING_COMPLETED', 'INVITED', 'INACTIVE'],
    ONBOARDING_COMPLETED: ['CHANGES_REQUESTED', 'APPROVED', 'INACTIVE'],
    CHANGES_REQUESTED: ['ONBOARDING_COMPLETED', 'INACTIVE'],
    APPROVED: ['ACTIVE', 'INACTIVE'],
    ACTIVE: ['INACTIVE', 'SUSPENDED', 'RESIGNED', 'TERMINATED'],
    INACTIVE: ['ACTIVE', 'TERMINATED'],
    SUSPENDED: ['ACTIVE', 'TERMINATED'],
    TERMINATED: [], // Terminal state
    RESIGNED: ['TERMINATED', 'ACTIVE'], // Can cancel resignation
    PENDING: ['ACTIVE', 'INACTIVE'], // Legacy
  };

  return transitions[currentStatus] || [];
}

/**
 * Validate if status transition is allowed
 */
export function isValidStatusTransition(
  from: UserStatus,
  to: UserStatus
): boolean {
  const allowedTransitions = getNextPossibleStatuses(from);
  return allowedTransitions.includes(to);
}

/**
 * Get status journey progress percentage
 * Only applicable for onboarding statuses
 */
export function getOnboardingProgress(status: UserStatus): number {
  const progress: Record<string, number> = {
    INVITED: 0,
    PENDING_ONBOARDING: 25,
    ONBOARDING_COMPLETED: 75,
    CHANGES_REQUESTED: 50,
    APPROVED: 90,
    ACTIVE: 100,
  };

  return progress[status] || 0;
}
