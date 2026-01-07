'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface RejectedEntry {
  id: string;
  workDate: string;
  hoursWorked: number;
  rejectedReason: string;
  rejectionCategory: string | null;
  approvedAt: string | null;
  approver: {
    firstName: string;
    lastName: string;
  } | null;
}

interface NotificationData {
  success: boolean;
  count: number;
  entries: RejectedEntry[];
}

const categoryLabels: Record<string, string> = {
  INSUFFICIENT_DETAIL: 'Insufficient Detail',
  HOURS_EXCEED_LIMIT: 'Hours Exceed Limit',
  WRONG_PROJECT_TASK: 'Wrong Project/Task',
  BILLABLE_STATUS_INCORRECT: 'Billable Status Incorrect',
  MISSING_TASK_ASSIGNMENT: 'Missing Task Assignment',
  HOURS_TOO_LOW: 'Hours Too Low',
  DUPLICATE_ENTRY: 'Duplicate Entry',
  INVALID_WORK_DATE: 'Invalid Work Date',
  OTHER: 'Other',
};

export function NotificationBell() {
  const router = useRouter();
  const [notificationData, setNotificationData] = useState<NotificationData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/employee/timesheets/rejected-count');
      const data = await response.json();
      if (data.success) {
        setNotificationData(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 2 minutes
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, []);

  const handleViewTimesheets = () => {
    router.push('/employee/timesheets');
  };

  const count = notificationData?.count || 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
            >
              {count > 9 ? '9+' : count}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Rejected Timesheets</span>
          {count > 0 && (
            <Badge variant="destructive" className="ml-2">
              {count}
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading && (
          <div className="p-4 text-center text-sm text-slate-500">
            Loading notifications...
          </div>
        )}

        {!loading && count === 0 && (
          <div className="p-4 text-center text-sm text-slate-500">
            No rejected timesheets
          </div>
        )}

        {!loading && notificationData && notificationData.entries.length > 0 && (
          <div className="max-h-96 overflow-y-auto">
            {notificationData.entries.map((entry) => (
              <DropdownMenuItem
                key={entry.id}
                className="flex flex-col items-start p-3 cursor-pointer hover:bg-slate-50"
                onClick={handleViewTimesheets}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-sm font-medium text-slate-900">
                    {format(new Date(entry.workDate), 'MMM d, yyyy')}
                  </span>
                  <span className="text-xs text-slate-500">
                    {entry.hoursWorked}h
                  </span>
                </div>

                {entry.rejectionCategory && (
                  <Badge variant="outline" className="mb-1 text-xs">
                    {categoryLabels[entry.rejectionCategory] || entry.rejectionCategory}
                  </Badge>
                )}

                <p className="text-xs text-slate-600 line-clamp-2 w-full">
                  {entry.rejectedReason}
                </p>

                {entry.approver && (
                  <span className="text-xs text-slate-400 mt-1">
                    by {entry.approver.firstName} {entry.approver.lastName}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}

        {!loading && count > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-center justify-center text-primary font-medium cursor-pointer"
              onClick={handleViewTimesheets}
            >
              View All Timesheets
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
