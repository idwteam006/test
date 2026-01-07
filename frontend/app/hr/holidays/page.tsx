'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Loader2,
  MapPin,
  Tag,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Building2,
  Globe,
  Heart,
  Star,
  List,
  Grid3X3,
  Download,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'PUBLIC' | 'COMPANY' | 'REGIONAL' | 'RELIGIOUS' | 'OPTIONAL';
  isOptional: boolean;
  description?: string;
  location?: string;
}

const HOLIDAY_TYPES = [
  { value: 'PUBLIC', label: 'Public Holiday', icon: Globe, color: 'bg-blue-100 text-blue-700 border-blue-200', bgColor: 'bg-blue-500' },
  { value: 'COMPANY', label: 'Company Holiday', icon: Building2, color: 'bg-purple-100 text-purple-700 border-purple-200', bgColor: 'bg-purple-500' },
  { value: 'REGIONAL', label: 'Regional Holiday', icon: MapPin, color: 'bg-green-100 text-green-700 border-green-200', bgColor: 'bg-green-500' },
  { value: 'RELIGIOUS', label: 'Religious Holiday', icon: Heart, color: 'bg-pink-100 text-pink-700 border-pink-200', bgColor: 'bg-pink-500' },
  { value: 'OPTIONAL', label: 'Optional Holiday', icon: Star, color: 'bg-amber-100 text-amber-700 border-amber-200', bgColor: 'bg-amber-500' },
];

// US Federal Holidays
const US_FEDERAL_HOLIDAYS: { name: string; getDate: (year: number) => Date; type: Holiday['type']; description: string }[] = [
  { name: "New Year's Day", getDate: (year) => new Date(year, 0, 1), type: 'PUBLIC', description: 'First day of the year' },
  { name: "Martin Luther King Jr. Day", getDate: (year) => getNthWeekdayOfMonth(year, 0, 1, 3), type: 'PUBLIC', description: 'Third Monday of January' },
  { name: "Presidents' Day", getDate: (year) => getNthWeekdayOfMonth(year, 1, 1, 3), type: 'PUBLIC', description: 'Third Monday of February' },
  { name: "Memorial Day", getDate: (year) => getLastWeekdayOfMonth(year, 4, 1), type: 'PUBLIC', description: 'Last Monday of May' },
  { name: "Juneteenth", getDate: (year) => new Date(year, 5, 19), type: 'PUBLIC', description: 'June 19 - Freedom Day' },
  { name: "Independence Day", getDate: (year) => new Date(year, 6, 4), type: 'PUBLIC', description: 'July 4th - Independence Day' },
  { name: "Labor Day", getDate: (year) => getNthWeekdayOfMonth(year, 8, 1, 1), type: 'PUBLIC', description: 'First Monday of September' },
  { name: "Columbus Day", getDate: (year) => getNthWeekdayOfMonth(year, 9, 1, 2), type: 'PUBLIC', description: 'Second Monday of October' },
  { name: "Veterans Day", getDate: (year) => new Date(year, 10, 11), type: 'PUBLIC', description: 'November 11 - Veterans Day' },
  { name: "Thanksgiving Day", getDate: (year) => getNthWeekdayOfMonth(year, 10, 4, 4), type: 'PUBLIC', description: 'Fourth Thursday of November' },
  { name: "Christmas Day", getDate: (year) => new Date(year, 11, 25), type: 'PUBLIC', description: 'December 25 - Christmas' },
];

// Helper function to get nth weekday of a month (e.g., 3rd Monday)
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  let day = 1 + (weekday - firstWeekday + 7) % 7 + (n - 1) * 7;
  return new Date(year, month, day);
}

// Helper function to get last weekday of a month (e.g., last Monday)
function getLastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const lastDay = new Date(year, month + 1, 0);
  const lastWeekday = lastDay.getDay();
  const diff = (lastWeekday - weekday + 7) % 7;
  return new Date(year, month, lastDay.getDate() - diff);
}

const getHolidayTypeInfo = (type: string) => {
  return HOLIDAY_TYPES.find(t => t.value === type) || HOLIDAY_TYPES[0];
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HRHolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [year, setYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [locations, setLocations] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSeedDialogOpen, setIsSeedDialogOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'PUBLIC' as Holiday['type'],
    isOptional: false,
    description: '',
    location: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHolidays();
  }, [year]);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: year.toString() });
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (locationFilter !== 'all') params.append('location', locationFilter);

      const response = await fetch(`/api/hr/holidays?${params}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setHolidays(data.data || []);
        setLocations(data.locations || []);
      } else {
        toast.error(data.error || 'Failed to load holidays');
      }
    } catch (error) {
      console.error('Fetch holidays error:', error);
      toast.error('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  // Generate calendar days for a month
  const getCalendarDays = (year: number, month: number) => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true,
      });
    }

    // Next month days to complete the grid (6 weeks = 42 days)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  // Get holidays for a specific date
  const getHolidaysForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return holidays.filter(h => {
      const holidayDate = new Date(h.date).toISOString().split('T')[0];
      return holidayDate === dateStr;
    });
  };

  // Check if a date is a weekend
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleAddHoliday = async () => {
    if (!formData.name || !formData.date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/hr/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Holiday created successfully');
        setIsAddDialogOpen(false);
        resetForm();
        fetchHolidays();
      } else {
        toast.error(data.error || 'Failed to create holiday');
      }
    } catch (error) {
      console.error('Create holiday error:', error);
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditHoliday = async () => {
    if (!selectedHoliday || !formData.name || !formData.date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/hr/holidays/${selectedHoliday.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Holiday updated successfully');
        setIsEditDialogOpen(false);
        setSelectedHoliday(null);
        resetForm();
        fetchHolidays();
      } else {
        toast.error(data.error || 'Failed to update holiday');
      }
    } catch (error) {
      console.error('Update holiday error:', error);
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHoliday = async () => {
    if (!selectedHoliday) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/hr/holidays/${selectedHoliday.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Holiday deleted successfully');
        setIsDeleteDialogOpen(false);
        setSelectedHoliday(null);
        fetchHolidays();
      } else {
        toast.error(data.error || 'Failed to delete holiday');
      }
    } catch (error) {
      console.error('Delete holiday error:', error);
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedUSHolidays = async () => {
    setSaving(true);
    try {
      const holidaysToSeed = US_FEDERAL_HOLIDAYS.map(h => ({
        name: h.name,
        date: h.getDate(year).toISOString().split('T')[0],
        type: h.type,
        isOptional: false,
        description: h.description,
        location: 'United States',
      }));

      const response = await fetch('/api/hr/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holidays: holidaysToSeed }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`${data.count} US Federal holidays added for ${year}`);
        setIsSeedDialogOpen(false);
        fetchHolidays();
      } else {
        toast.error(data.error || 'Failed to add US holidays');
      }
    } catch (error) {
      console.error('Seed holidays error:', error);
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      date: '',
      type: 'PUBLIC',
      isOptional: false,
      description: '',
      location: '',
    });
    setSelectedDate(null);
  };

  const openAddDialogForDate = (date: Date) => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      date: date.toISOString().split('T')[0],
    }));
    setSelectedDate(date);
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setFormData({
      name: holiday.name,
      date: holiday.date.split('T')[0],
      type: holiday.type,
      isOptional: holiday.isOptional,
      description: holiday.description || '',
      location: holiday.location || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setIsDeleteDialogOpen(true);
  };

  const filteredHolidays = holidays.filter((holiday) => {
    const matchesSearch = holiday.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || holiday.type === typeFilter;
    const matchesLocation = locationFilter === 'all' || holiday.location === locationFilter;
    return matchesSearch && matchesType && matchesLocation;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Group holidays by month for list view
  const groupedHolidays = filteredHolidays.reduce((acc, holiday) => {
    const month = new Date(holiday.date).toLocaleDateString('en-US', { month: 'long' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(holiday);
    return acc;
  }, {} as Record<string, Holiday[]>);

  const calendarDays = useMemo(() => getCalendarDays(year, currentMonth), [year, currentMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setYear(year - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setYear(year + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

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
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Holiday Calendar
              </h1>
              <p className="text-gray-600 mt-2">Manage company holidays and observances</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsSeedDialogOpen(true)}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Add US Holidays
              </Button>
              <Button
                onClick={() => {
                  resetForm();
                  setIsAddDialogOpen(true);
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Holiday
              </Button>
            </div>
          </div>
        </motion.div>

        {/* View Toggle & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                  <Button
                    variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('calendar')}
                    className={viewMode === 'calendar' ? 'bg-purple-600' : ''}
                  >
                    <Grid3X3 className="w-4 h-4 mr-1" />
                    Calendar
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={viewMode === 'list' ? 'bg-purple-600' : ''}
                  >
                    <List className="w-4 h-4 mr-1" />
                    List
                  </Button>
                </div>

                {/* Month/Year Selector */}
                {viewMode === 'calendar' ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigateMonth('prev')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-lg min-w-[180px] justify-center">
                      <CalendarDays className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-purple-700">
                        {MONTHS[currentMonth]} {year}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigateMonth('next')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentMonth(new Date().getMonth());
                        setYear(new Date().getFullYear());
                      }}
                    >
                      Today
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setYear(y => y - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-lg">
                      <CalendarDays className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-purple-700">{year}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setYear(y => y + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Search */}
                <div className="flex-1">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search holidays..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Type Filter */}
                <div className="w-full md:w-48">
                  <Label htmlFor="type">Type</Label>
                  <select
                    id="type"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full mt-1 h-10 px-3 rounded-md border border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="all">All Types</option>
                    {HOLIDAY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-4 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gray-200 border border-gray-300"></div>
                  <span className="text-sm text-gray-600">Weekend</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-purple-600 border border-purple-700"></div>
                  <span className="text-sm text-gray-600">Today</span>
                </div>
                {HOLIDAY_TYPES.map(type => (
                  <div key={type.value} className="flex items-center gap-2">
                    <div className={cn("w-4 h-4 rounded", type.bgColor)}></div>
                    <span className="text-sm text-gray-600">{type.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6"
        >
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setTypeFilter('all')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <Calendar className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{holidays.length}</p>
                <p className="text-xs text-gray-500">Total Holidays</p>
              </div>
            </CardContent>
          </Card>
          {HOLIDAY_TYPES.map(type => {
            const count = holidays.filter(h => h.type === type.value).length;
            const Icon = type.icon;
            return (
              <Card key={type.value} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setTypeFilter(type.value)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${type.color.split(' ')[0]}`}>
                    <Icon className={`w-5 h-5 ${type.color.split(' ')[1]}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-500">{type.label.split(' ')[0]}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        {/* Main Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : viewMode === 'calendar' ? (
          /* Calendar View */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardContent className="p-6">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 mb-2">
                  {WEEKDAYS.map((day, index) => (
                    <div
                      key={day}
                      className={cn(
                        "text-center py-2 text-sm font-semibold",
                        index === 0 || index === 6 ? "text-red-500" : "text-gray-700"
                      )}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map(({ date, isCurrentMonth }, index) => {
                    const dayHolidays = getHolidaysForDate(date);
                    const weekend = isWeekend(date);
                    const today = isToday(date);

                    return (
                      <TooltipProvider key={index}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "min-h-[100px] p-2 border rounded-lg cursor-pointer transition-all hover:shadow-md",
                                !isCurrentMonth && "opacity-40",
                                weekend && isCurrentMonth && "bg-gray-100",
                                today && "ring-2 ring-purple-600 bg-purple-50",
                                dayHolidays.length > 0 && "border-2 border-purple-300"
                              )}
                              onClick={() => openAddDialogForDate(date)}
                            >
                              {/* Date Number */}
                              <div className={cn(
                                "text-right mb-1",
                                weekend && "text-red-500 font-semibold",
                                today && "text-purple-700 font-bold"
                              )}>
                                <span className={cn(
                                  "inline-flex items-center justify-center w-7 h-7 rounded-full",
                                  today && "bg-purple-600 text-white"
                                )}>
                                  {date.getDate()}
                                </span>
                              </div>

                              {/* Holiday Indicators */}
                              <div className="space-y-1">
                                {dayHolidays.slice(0, 2).map((holiday) => {
                                  const typeInfo = getHolidayTypeInfo(holiday.type);
                                  return (
                                    <div
                                      key={holiday.id}
                                      className={cn(
                                        "text-xs px-1 py-0.5 rounded truncate text-white",
                                        typeInfo.bgColor
                                      )}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditDialog(holiday);
                                      }}
                                    >
                                      {holiday.name}
                                    </div>
                                  );
                                })}
                                {dayHolidays.length > 2 && (
                                  <div className="text-xs text-gray-500 text-center">
                                    +{dayHolidays.length - 2} more
                                  </div>
                                )}
                              </div>

                              {/* Weekend Label */}
                              {weekend && isCurrentMonth && dayHolidays.length === 0 && (
                                <div className="text-xs text-gray-400 text-center mt-2">
                                  {date.getDay() === 0 ? 'Sunday' : 'Saturday'}
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="p-1">
                              <p className="font-semibold">{date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                              {dayHolidays.length > 0 ? (
                                <ul className="mt-1 space-y-1">
                                  {dayHolidays.map(h => (
                                    <li key={h.id} className="text-sm">• {h.name}</li>
                                  ))}
                                </ul>
                              ) : weekend ? (
                                <p className="text-sm text-gray-500">Weekend</p>
                              ) : (
                                <p className="text-sm text-gray-500">Click to add holiday</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* List View */
          <div className="space-y-6">
            {Object.entries(groupedHolidays).map(([month, monthHolidays], monthIndex) => (
              <motion.div
                key={month}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + monthIndex * 0.05 }}
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  {month} {year}
                </h2>
                <div className="grid gap-3">
                  {monthHolidays.map((holiday) => {
                    const typeInfo = getHolidayTypeInfo(holiday.type);
                    const TypeIcon = typeInfo.icon;
                    return (
                      <Card key={holiday.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {/* Date Badge */}
                              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex flex-col items-center justify-center text-white">
                                <span className="text-xs font-medium">{getDayOfWeek(holiday.date)}</span>
                                <span className="text-xl font-bold">{new Date(holiday.date).getDate()}</span>
                              </div>

                              {/* Holiday Info */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-lg text-gray-900">{holiday.name}</h3>
                                  <Badge className={typeInfo.color}>
                                    <TypeIcon className="w-3 h-3 mr-1" />
                                    {typeInfo.label}
                                  </Badge>
                                  {holiday.isOptional && (
                                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                                      Optional
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span>{formatDate(holiday.date)}</span>
                                  {holiday.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {holiday.location}
                                    </span>
                                  )}
                                </div>
                                {holiday.description && (
                                  <p className="mt-1 text-sm text-gray-500">{holiday.description}</p>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(holiday)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteDialog(holiday)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </motion.div>
            ))}

            {filteredHolidays.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No holidays found</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery || typeFilter !== 'all' || locationFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : `No holidays configured for ${year}`}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsSeedDialogOpen(true)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Add US Federal Holidays
                  </Button>
                  <Button
                    onClick={() => {
                      resetForm();
                      setIsAddDialogOpen(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom Holiday
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Holiday Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Holiday</DialogTitle>
            <DialogDescription>
              {selectedDate
                ? `Create a holiday for ${selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`
                : 'Create a new holiday for your organization.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Holiday Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., New Year's Day"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="type">Holiday Type</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Holiday['type'] })}
                className="w-full mt-1 h-10 px-3 rounded-md border border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              >
                {HOLIDAY_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="location">Location (optional)</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., United States"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isOptional"
                checked={formData.isOptional}
                onChange={(e) => setFormData({ ...formData, isOptional: e.target.checked })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <Label htmlFor="isOptional" className="cursor-pointer">
                This is an optional/restricted holiday
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddHoliday} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Holiday
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Holiday Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Holiday</DialogTitle>
            <DialogDescription>
              Update holiday details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Holiday Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., New Year's Day"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-date">Date *</Label>
              <Input
                id="edit-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-type">Holiday Type</Label>
              <select
                id="edit-type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Holiday['type'] })}
                className="w-full mt-1 h-10 px-3 rounded-md border border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              >
                {HOLIDAY_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="edit-location">Location (optional)</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., United States"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-isOptional"
                checked={formData.isOptional}
                onChange={(e) => setFormData({ ...formData, isOptional: e.target.checked })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <Label htmlFor="edit-isOptional" className="cursor-pointer">
                This is an optional/restricted holiday
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditHoliday} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit className="w-4 h-4 mr-2" />}
              Update Holiday
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedHoliday?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteHoliday}
              className="bg-red-600 hover:bg-red-700"
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Seed US Holidays Dialog */}
      <AlertDialog open={isSeedDialogOpen} onOpenChange={setIsSeedDialogOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Add US Federal Holidays for {year}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This will add the following 11 US Federal holidays for {year}:</p>
              <ul className="text-sm space-y-1 max-h-[200px] overflow-y-auto border rounded-lg p-3 bg-gray-50">
                {US_FEDERAL_HOLIDAYS.map((holiday) => {
                  const date = holiday.getDate(year);
                  return (
                    <li key={holiday.name} className="flex justify-between">
                      <span className="font-medium">{holiday.name}</span>
                      <span className="text-gray-500">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="text-sm text-gray-500">
                Duplicate holidays will be skipped automatically.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSeedUSHolidays}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Add Holidays
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
