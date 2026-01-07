'use client';

import { useState, useEffect } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface Project {
  id: string;
  name: string;
  projectCode?: string;
  status: string;
}

interface Task {
  id: string;
  name: string;
  description?: string;
  status: string;
}

interface TimesheetFormProps {
  initialDate?: string;
  initialData?: Partial<FormData>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  workDate: string;
  projectId: string;
  taskId: string;
  startTime: string;
  endTime: string;
  breakHours: string;
  hoursWorked: string;
  description: string;
  activityType: string;
  isBillable: boolean;
}

export default function TimesheetForm({
  initialDate,
  initialData,
  onSuccess,
  onCancel,
}: TimesheetFormProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [entryMode, setEntryMode] = useState<'hours' | 'time'>('hours');

  const [formData, setFormData] = useState<FormData>({
    workDate: initialDate || format(new Date(), 'yyyy-MM-dd'),
    projectId: '',
    taskId: '',
    startTime: '',
    endTime: '',
    breakHours: '0',
    hoursWorked: '',
    description: '',
    activityType: 'Development',
    isBillable: true,
    ...initialData,
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await fetch('/api/employee/projects');
      const data = await response.json();

      if (data.success) {
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchTasks = async (projectId: string) => {
    if (!projectId) {
      setTasks([]);
      return;
    }

    try {
      setLoadingTasks(true);
      const response = await fetch(`/api/employee/projects/${projectId}/tasks`);
      const data = await response.json();

      if (data.success) {
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setFormData({ ...formData, projectId, taskId: '' });
    fetchTasks(projectId);
  };

  const calculateHoursFromTime = (start: string, end: string, breakHours: number = 0) => {
    if (!start || !end) return 0;

    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;

    // Handle overnight shifts
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }

    const totalMinutes = endMinutes - startMinutes;
    const hours = totalMinutes / 60 - breakHours;

    return Math.max(0, hours);
  };

  const handleTimeChange = (field: 'startTime' | 'endTime' | 'breakHours', value: string) => {
    const updated = { ...formData, [field]: value };

    // Auto-calculate hours when both times are set
    if (field === 'startTime' || field === 'endTime' || field === 'breakHours') {
      const hours = calculateHoursFromTime(
        updated.startTime,
        updated.endTime,
        parseFloat(updated.breakHours) || 0
      );
      updated.hoursWorked = hours > 0 ? hours.toFixed(2) : '';
    }

    setFormData(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.hoursWorked || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate work date is not in the future
    // Use parseISO to correctly parse yyyy-MM-dd without timezone shift
    const workDate = parseISO(formData.workDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (workDate > today) {
      toast.error('Work date cannot be in the future');
      return;
    }

    try {
      const response = await fetch('/api/employee/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workDate: formData.workDate,
          projectId: formData.projectId || null,
          taskId: formData.taskId || null,
          startTime: formData.startTime || null,
          endTime: formData.endTime || null,
          breakHours: parseFloat(formData.breakHours) || 0,
          hoursWorked: parseFloat(formData.hoursWorked),
          description: formData.description,
          activityType: formData.activityType,
          isBillable: formData.isBillable,
          workType: 'REGULAR',
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Time entry added successfully');

        // Reset form
        setFormData({
          workDate: format(new Date(), 'yyyy-MM-dd'),
          projectId: '',
          taskId: '',
          startTime: '',
          endTime: '',
          breakHours: '0',
          hoursWorked: '',
          description: '',
          activityType: 'Development',
          isBillable: true,
        });
        setTasks([]);

        if (onSuccess) onSuccess();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to add entry:', error);
      toast.error(error.message || 'Failed to add time entry');
    }
  };

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Time Entry
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Entry Mode Toggle */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Label className="text-sm font-medium">Entry Method:</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={entryMode === 'hours' ? 'default' : 'outline'}
                onClick={() => setEntryMode('hours')}
              >
                Hours
              </Button>
              <Button
                type="button"
                size="sm"
                variant={entryMode === 'time' ? 'default' : 'outline'}
                onClick={() => setEntryMode('time')}
              >
                Start/End Time
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="workDate">Date *</Label>
              <Input
                id="workDate"
                type="date"
                value={formData.workDate}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
                required
              />
              <p className="text-xs text-slate-500 mt-1">Cannot be a future date</p>
            </div>

            {entryMode === 'hours' ? (
              <div>
                <Label htmlFor="hoursWorked">Hours Worked *</Label>
                <Input
                  id="hoursWorked"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  placeholder="8.0"
                  value={formData.hoursWorked}
                  onChange={(e) => setFormData({ ...formData, hoursWorked: e.target.value })}
                  required
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="breakHours">Break Hours</Label>
                <Input
                  id="breakHours"
                  type="number"
                  step="0.5"
                  min="0"
                  max="4"
                  placeholder="0.5"
                  value={formData.breakHours}
                  onChange={(e) => handleTimeChange('breakHours', e.target.value)}
                />
              </div>
            )}
          </div>

          {entryMode === 'time' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleTimeChange('startTime', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleTimeChange('endTime', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label className="text-sm text-slate-600">Calculated Hours</Label>
                <div className="h-10 flex items-center px-3 bg-slate-100 rounded-md font-semibold text-purple-600">
                  {formData.hoursWorked || '0'} hours
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="project">Project</Label>
              <select
                id="project"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={formData.projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                disabled={loadingProjects}
              >
                <option value="">Select Project (Optional)</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} {project.projectCode && `(${project.projectCode})`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="task">Task</Label>
              <select
                id="task"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                value={formData.taskId}
                onChange={(e) => setFormData({ ...formData, taskId: e.target.value })}
                disabled={!formData.projectId || loadingTasks}
              >
                <option value="">
                  {!formData.projectId
                    ? 'Select project first'
                    : loadingTasks
                      ? 'Loading tasks...'
                      : 'Select Task (Optional)'}
                </option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="activityType">Activity Type</Label>
            <select
              id="activityType"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={formData.activityType}
              onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
            >
              <option>Development</option>
              <option>Testing</option>
              <option>Meeting</option>
              <option>Code Review</option>
              <option>Documentation</option>
              <option>Bug Fixing</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <Label htmlFor="description">Description * (Min 10 characters)</Label>
            <Textarea
              id="description"
              placeholder="Describe what you worked on..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              required
              minLength={10}
            />
            <p className="text-xs text-slate-500 mt-1">{formData.description.length} characters</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isBillable"
              checked={formData.isBillable}
              onChange={(e) => setFormData({ ...formData, isBillable: e.target.checked })}
              className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
            />
            <Label htmlFor="isBillable" className="cursor-pointer">
              Billable
            </Label>
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save Entry
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
