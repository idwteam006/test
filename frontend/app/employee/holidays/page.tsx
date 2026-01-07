'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Search,
  Loader2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Building2,
  Globe,
  Heart,
  Star,
  CalendarCheck,
  CalendarX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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
  { value: 'PUBLIC', label: 'Public', icon: Globe, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'COMPANY', label: 'Company', icon: Building2, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'REGIONAL', label: 'Regional', icon: MapPin, color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'RELIGIOUS', label: 'Religious', icon: Heart, color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { value: 'OPTIONAL', label: 'Optional', icon: Star, color: 'bg-amber-100 text-amber-700 border-amber-200' },
];

const getHolidayTypeInfo = (type: string) => {
  return HOLIDAY_TYPES.find(t => t.value === type) || HOLIDAY_TYPES[0];
};

export default function EmployeeHolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchHolidays();
  }, [year]);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: year.toString() });
      const response = await fetch(`/api/hr/holidays?${params}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setHolidays(data.data || []);
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

  const filteredHolidays = holidays.filter((holiday) => {
    const matchesSearch = holiday.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || holiday.type === typeFilter;
    return matchesSearch && matchesType;
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

  const isUpcoming = (dateString: string) => {
    const holidayDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return holidayDate >= today;
  };

  const isPast = (dateString: string) => {
    const holidayDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return holidayDate < today;
  };

  const isToday = (dateString: string) => {
    const holidayDate = new Date(dateString);
    const today = new Date();
    return holidayDate.toDateString() === today.toDateString();
  };

  // Group holidays by upcoming and past
  const upcomingHolidays = filteredHolidays.filter(h => isUpcoming(h.date));
  const pastHolidays = filteredHolidays.filter(h => isPast(h.date));

  // Get next upcoming holiday
  const nextHoliday = upcomingHolidays[0];
  const daysUntilNext = nextHoliday
    ? Math.ceil((new Date(nextHoliday.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Group holidays by month
  const groupedHolidays = filteredHolidays.reduce((acc, holiday) => {
    const month = new Date(holiday.date).toLocaleDateString('en-US', { month: 'long' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(holiday);
    return acc;
  }, {} as Record<string, Holiday[]>);

  const totalHolidays = holidays.filter(h => !h.isOptional).length;
  const optionalHolidays = holidays.filter(h => h.isOptional).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Holiday Calendar
          </h1>
          <p className="text-gray-600 mt-2">View company holidays and plan your time off</p>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          {/* Next Holiday */}
          <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Next Holiday</p>
                  {nextHoliday ? (
                    <>
                      <h3 className="text-xl font-bold mt-1">{nextHoliday.name}</h3>
                      <p className="text-purple-100 text-sm mt-2">
                        {isToday(nextHoliday.date) ? 'Today!' : `In ${daysUntilNext} days`}
                      </p>
                    </>
                  ) : (
                    <h3 className="text-xl font-bold mt-1">No upcoming holidays</h3>
                  )}
                </div>
                <CalendarCheck className="w-10 h-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          {/* Total Holidays */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Holidays</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-1">{totalHolidays}</h3>
                  <p className="text-gray-500 text-sm mt-2">Fixed holidays in {year}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Optional Holidays */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Optional Holidays</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-1">{optionalHolidays}</h3>
                  <p className="text-gray-500 text-sm mt-2">Restricted holidays</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Star className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                {/* Year Selector */}
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

        {/* Holiday List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : (
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
                    const past = isPast(holiday.date);
                    const today = isToday(holiday.date);

                    return (
                      <Card
                        key={holiday.id}
                        className={`transition-all ${past ? 'opacity-60' : 'hover:shadow-lg'} ${today ? 'ring-2 ring-purple-500 shadow-lg' : ''}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {/* Date Badge */}
                            <div className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center text-white ${
                              today
                                ? 'bg-gradient-to-br from-green-500 to-emerald-600 animate-pulse'
                                : past
                                  ? 'bg-gray-400'
                                  : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                            }`}>
                              <span className="text-xs font-medium">{getDayOfWeek(holiday.date)}</span>
                              <span className="text-xl font-bold">{new Date(holiday.date).getDate()}</span>
                            </div>

                            {/* Holiday Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                                {today && (
                                  <Badge className="bg-green-100 text-green-700 border-green-200">
                                    Today
                                  </Badge>
                                )}
                                {past && (
                                  <Badge variant="outline" className="text-gray-500 border-gray-300">
                                    <CalendarX className="w-3 h-3 mr-1" />
                                    Passed
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
                <p className="text-gray-600">
                  {searchQuery || typeFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : `No holidays configured for ${year}`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
