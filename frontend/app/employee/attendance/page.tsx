'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  LogIn,
  LogOut,
  Coffee,
  Calendar,
  TrendingUp,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Timer,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AttendancePage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [onBreak, setOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const [totalBreakMinutes, setTotalBreakMinutes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [fetchingData, setFetchingData] = useState(true);

  useEffect(() => {
    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Fetch today's attendance status and recent history
    fetchTodayAttendance();
    fetchRecentAttendance();

    return () => clearInterval(interval);
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      const response = await fetch('/api/employee/attendance/today');
      const data = await response.json();

      if (data.success && data.attendance) {
        setClockedIn(!!data.attendance.clockIn && !data.attendance.clockOut);
        if (data.attendance.clockIn) {
          setClockInTime(new Date(data.attendance.clockIn));
        }
        setTotalBreakMinutes(data.attendance.totalBreakMinutes || 0);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    }
  };

  const fetchRecentAttendance = async () => {
    try {
      setFetchingData(true);
      const response = await fetch('/api/employee/attendance/recent?days=30&limit=10');
      const data = await response.json();

      if (data.success) {
        setRecentAttendance(data.attendance || []);
        setStats(data.stats || {});
      }
    } catch (error) {
      console.error('Failed to fetch recent attendance:', error);
    } finally {
      setFetchingData(false);
    }
  };

  const handleClockIn = async () => {
    try {
      setLoading(true);

      // Check if geolocation is available
      if (!navigator.geolocation) {
        toast.error('Geolocation not supported', {
          description: 'Your browser does not support location services',
        });
        return;
      }

      // Get geolocation with better error handling
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error) => {
            switch (error.code) {
              case error.PERMISSION_DENIED:
                reject(new Error('Location access denied. Please enable location permissions in your browser settings.'));
                break;
              case error.POSITION_UNAVAILABLE:
                reject(new Error('Location information unavailable. Please check your device settings.'));
                break;
              case error.TIMEOUT:
                reject(new Error('Location request timed out. Please try again.'));
                break;
              default:
                reject(new Error('An unknown error occurred while accessing location.'));
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      });

      // Call clock-in API
      const response = await fetch('/api/employee/attendance/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setClockedIn(true);
        setClockInTime(new Date(data.attendance.clockIn));
        toast.success('Clocked in successfully!', {
          description: `Time: ${format(new Date(data.attendance.clockIn), 'hh:mm a')} • Location captured`,
        });
        // Refresh recent attendance
        fetchRecentAttendance();
      } else {
        throw new Error(data.error || 'Failed to clock in');
      }
    } catch (error: any) {
      console.error('Clock in error:', error);
      toast.error('Failed to clock in', {
        description: error.message || 'Please enable location access and try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setLoading(true);

      // Get current location
      if (!navigator.geolocation) {
        toast.error('Geolocation not supported');
        return;
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      // Call clock-out API
      const response = await fetch('/api/employee/attendance/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setClockedIn(false);
        setOnBreak(false);
        toast.success('Clocked out successfully!', {
          description: `Total hours worked: ${data.attendance.workHours?.toFixed(2) || '0'} hrs`,
        });
        setClockInTime(null);
        setBreakStartTime(null);
        setTotalBreakMinutes(0);
        // Refresh recent attendance
        fetchRecentAttendance();
      } else {
        throw new Error(data.error || 'Failed to clock out');
      }
    } catch (error: any) {
      console.error('Clock out error:', error);
      toast.error('Failed to clock out', {
        description: error.message || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = () => {
    setOnBreak(true);
    setBreakStartTime(new Date());
    toast.info('Break started', {
      description: 'Remember to end your break when you return!',
    });
  };

  const handleEndBreak = () => {
    if (breakStartTime) {
      const breakMinutes = (new Date().getTime() - breakStartTime.getTime()) / (1000 * 60);
      setTotalBreakMinutes(prev => prev + breakMinutes);
      setOnBreak(false);
      setBreakStartTime(null);
      toast.success('Break ended', {
        description: `Break duration: ${Math.round(breakMinutes)} minutes`,
      });
    }
  };

  const getWorkHours = () => {
    if (!clockInTime) return '0:00';
    const totalMilliseconds = new Date().getTime() - clockInTime.getTime();
    const totalMinutes = Math.floor(totalMilliseconds / (1000 * 60));
    const workMinutes = totalMinutes - totalBreakMinutes;
    const hours = Math.floor(workMinutes / 60);
    const minutes = Math.floor(workMinutes % 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PRESENT: { label: 'Present', className: 'bg-green-100 text-green-700 border-green-300' },
      ABSENT: { label: 'Absent', className: 'bg-red-100 text-red-700 border-red-300' },
      LATE: { label: 'Late', className: 'bg-orange-100 text-orange-700 border-orange-300' },
      WORK_FROM_HOME: { label: 'WFH', className: 'bg-blue-100 text-blue-700 border-blue-300' },
      HALF_DAY: { label: 'Half Day', className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
      ON_LEAVE: { label: 'On Leave', className: 'bg-purple-100 text-purple-700 border-purple-300' },
    };

    const config = statusMap[status] || statusMap.PRESENT;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Attendance</h1>
        <p className="text-slate-600 mt-1">Track your daily attendance and work hours</p>
      </div>

      {/* Clock In/Out Card */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Current Time */}
            <div>
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="text-6xl font-bold text-slate-900 tracking-tight"
              >
                {format(currentTime, 'hh:mm:ss')}
              </motion.div>
              <p className="text-xl text-slate-600 mt-2">{format(currentTime, 'EEEE, MMMM do, yyyy')}</p>
            </div>

            {/* Status */}
            {clockedIn && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg p-6 shadow-md"
              >
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Clock In</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {clockInTime ? format(clockInTime, 'hh:mm a') : '--:--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Work Hours</p>
                    <p className="text-2xl font-bold text-green-600">{getWorkHours()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Break Time</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {Math.round(totalBreakMinutes)} min
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Location Permission Info */}
            {!clockedIn && (
              <Alert className="bg-blue-50 border-blue-200 max-w-2xl mx-auto">
                <MapPin className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800">
                  <strong>Location access required:</strong> Please allow location permissions when prompted to clock in.
                  This helps verify your attendance location.
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              {!clockedIn ? (
                <Button
                  onClick={handleClockIn}
                  disabled={loading}
                  size="lg"
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  ) : (
                    <LogIn className="h-6 w-6 mr-3" />
                  )}
                  Clock In
                </Button>
              ) : (
                <>
                  {!onBreak ? (
                    <Button
                      onClick={handleStartBreak}
                      variant="outline"
                      size="lg"
                      className="border-2 border-orange-500 text-orange-600 hover:bg-orange-50 px-6 py-6"
                    >
                      <Coffee className="h-5 w-5 mr-2" />
                      Start Break
                    </Button>
                  ) : (
                    <Button
                      onClick={handleEndBreak}
                      variant="outline"
                      size="lg"
                      className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 px-6 py-6"
                    >
                      <Coffee className="h-5 w-5 mr-2" />
                      End Break
                    </Button>
                  )}
                  <Button
                    onClick={handleClockOut}
                    disabled={loading}
                    size="lg"
                    className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    ) : (
                      <LogOut className="h-6 w-6 mr-3" />
                    )}
                    Clock Out
                  </Button>
                </>
              )}
            </div>

            {/* Location Info */}
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
              <MapPin className="h-4 w-4" />
              <span>Location tracking enabled for accurate attendance</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {fetchingData ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-slate-600 mt-2">Loading attendance data...</p>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Days Present</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.present || 0}</div>
              <p className="text-xs text-slate-500 mt-1">Last 30 Days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats.totalHours?.toFixed(1) || '0'}</div>
              <p className="text-xs text-slate-500 mt-1">Last 30 Days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Average</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.avgHoursPerDay?.toFixed(2) || '0'}</div>
              <p className="text-xs text-slate-500 mt-1">Hours/Day</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Late Arrivals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.late || 0}</div>
              <p className="text-xs text-slate-500 mt-1">Last 30 Days</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Recent Attendance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Attendance</CardTitle>
              <CardDescription>Your attendance history for the past 5 days</CardDescription>
            </div>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fetchingData ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-sm text-slate-600 mt-2">Loading recent attendance...</p>
            </div>
          ) : recentAttendance.length > 0 ? (
            <div className="space-y-4">
              {recentAttendance.map((attendance, idx) => (
                <div
                  key={attendance.id || idx}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <Calendar className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {format(new Date(attendance.date), 'EEEE, MMM do')}
                      </p>
                      <p className="text-sm text-slate-600">
                        {attendance.clockIn ? format(new Date(attendance.clockIn), 'hh:mm a') : '--:--'} -{' '}
                        {attendance.clockOut ? format(new Date(attendance.clockOut), 'hh:mm a') : '--:--'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-slate-600">Work Hours</p>
                      <p className="font-semibold text-slate-900">
                        {attendance.workHours ? attendance.workHours.toFixed(2) : '0'} hrs
                      </p>
                    </div>
                    {getStatusBadge(attendance.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No attendance records yet</p>
              <p className="text-sm mt-1">Clock in to start tracking your attendance</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Guidelines */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <AlertCircle className="h-5 w-5" />
            Attendance Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Clock in before 9:00 AM to avoid being marked late</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Minimum 8 hours of work per day required</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Remember to start/end breaks for accurate time tracking</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Location services must be enabled for clock in/out</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
