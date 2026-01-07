'use client';

import { useState } from 'react';
import { Calendar, Copy, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';

interface BulkEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentWeekStart: Date;
}

export default function BulkEntryModal({
  isOpen,
  onClose,
  onSuccess,
  currentWeekStart,
}: BulkEntryModalProps) {
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    hoursWorked: '',
    description: '',
    activityType: 'Development',
    isBillable: true,
  });

  const toggleDay = (date: string) => {
    if (selectedDays.includes(date)) {
      setSelectedDays(selectedDays.filter((d) => d !== date));
    } else {
      setSelectedDays([...selectedDays, date]);
    }
  };

  const selectAllWorkdays = () => {
    // Select Monday-Friday
    const workdays = weekDays.slice(0, 5).map((d) => format(d, 'yyyy-MM-dd'));
    setSelectedDays(workdays);
  };

  const handleSubmit = async () => {
    if (selectedDays.length === 0) {
      toast.error('Please select at least one day');
      return;
    }

    if (!formData.hoursWorked || !formData.description) {
      toast.error('Please fill in hours and description');
      return;
    }

    try {
      const entries = selectedDays.map((date) => ({
        workDate: date,
        hoursWorked: parseFloat(formData.hoursWorked),
        description: formData.description,
        activityType: formData.activityType,
        isBillable: formData.isBillable,
        workType: 'REGULAR',
      }));

      const response = await fetch('/api/employee/timesheets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${selectedDays.length} entries created successfully!`);
        onSuccess();
        onClose();

        // Reset form
        setSelectedDays([]);
        setFormData({
          hoursWorked: '',
          description: '',
          activityType: 'Development',
          isBillable: true,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to create bulk entries:', error);
      toast.error(error.message || 'Failed to create bulk entries');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Bulk Entry - {format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Day Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Select Days</Label>
              <Button type="button" size="sm" variant="outline" onClick={selectAllWorkdays}>
                <Calendar className="h-4 w-4 mr-1" />
                Select Workdays (Mon-Fri)
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isSelected = selectedDays.includes(dateStr);

                return (
                  <div
                    key={dateStr}
                    onClick={() => toggleDay(dateStr)}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox checked={isSelected} />
                      <div>
                        <div className="text-sm font-medium text-slate-900">{format(day, 'EEE')}</div>
                        <div className="text-xs text-slate-600">{format(day, 'MMM d')}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-sm text-slate-600 mt-2">
              {selectedDays.length} {selectedDays.length === 1 ? 'day' : 'days'} selected
            </p>
          </div>

          {/* Entry Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bulkHours">Hours per Day *</Label>
                <Input
                  id="bulkHours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  placeholder="8.0"
                  value={formData.hoursWorked}
                  onChange={(e) => setFormData({ ...formData, hoursWorked: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="bulkActivity">Activity Type</Label>
                <select
                  id="bulkActivity"
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
            </div>

            <div>
              <Label htmlFor="bulkDescription">Description * (Same for all days)</Label>
              <Textarea
                id="bulkDescription"
                placeholder="Describe what you worked on..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                minLength={10}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.isBillable}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isBillable: checked as boolean })
                }
              />
              <Label className="cursor-pointer">Billable</Label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={handleSubmit} className="flex-1">
              Create {selectedDays.length} {selectedDays.length === 1 ? 'Entry' : 'Entries'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
