'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  MapPin,
  Award,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department: string;
  jobTitle: string;
  phone?: string;
  location: string;
  joinDate: string;
  status: 'ACTIVE' | 'INACTIVE';
  avatarUrl?: string;
}

export default function EmployeeTeamPage() {
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [manager, setManager] = useState<TeamMember | null>(null);

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      setLoading(true);

      // Mock data - replace with actual API call
      setManager({
        id: 'm1',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'manager@demo.com',
        role: 'MANAGER',
        department: 'Engineering',
        jobTitle: 'Engineering Manager',
        phone: '+1 (555) 123-4567',
        location: 'San Francisco, CA',
        joinDate: '2021-03-15',
        status: 'ACTIVE',
      });

      setTeamMembers([
        {
          id: '1',
          firstName: 'Amanda',
          lastName: 'Foster',
          email: 'amanda.foster@demo.com',
          role: 'EMPLOYEE',
          department: 'Engineering',
          jobTitle: 'Senior Software Engineer',
          phone: '+1 (555) 234-5678',
          location: 'San Francisco, CA',
          joinDate: '2022-06-01',
          status: 'ACTIVE',
        },
        {
          id: '2',
          firstName: 'Tanish',
          lastName: 'Srinav',
          email: 'tanish.srinav@demo.com',
          role: 'EMPLOYEE',
          department: 'Engineering',
          jobTitle: 'Software Engineer',
          phone: '+1 (555) 345-6789',
          location: 'Austin, TX',
          joinDate: '2023-01-15',
          status: 'ACTIVE',
        },
        {
          id: '3',
          firstName: 'David',
          lastName: 'Chen',
          email: 'david.chen@demo.com',
          role: 'EMPLOYEE',
          department: 'Engineering',
          jobTitle: 'Full Stack Developer',
          phone: '+1 (555) 456-7890',
          location: 'Remote',
          joinDate: '2023-09-01',
          status: 'ACTIVE',
        },
      ]);
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading team...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          My Team
        </h1>
        <p className="text-slate-600 mt-2">
          Connect and collaborate with your team members
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-purple-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Team Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-purple-600">{teamMembers.length + 1}</div>
              <Users className="h-8 w-8 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Active Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-green-600">
                {teamMembers.filter(m => m.status === 'ACTIVE').length}
              </div>
              <Award className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-blue-600">{manager?.department || 'N/A'}</div>
              <Building2 className="h-8 w-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manager Card */}
      {manager && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              Reporting Manager
            </CardTitle>
          </CardHeader>
          <CardContent>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {manager.firstName[0]}{manager.lastName[0]}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-slate-900">
                      {manager.firstName} {manager.lastName}
                    </h3>
                    <Badge className="bg-purple-600 text-white">
                      {manager.role}
                    </Badge>
                  </div>

                  <p className="text-purple-900 font-medium mb-3">{manager.jobTitle}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-purple-600" />
                      <a href={`mailto:${manager.email}`} className="hover:text-purple-600">
                        {manager.email}
                      </a>
                    </div>
                    {manager.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-purple-600" />
                        <span>{manager.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-purple-600" />
                      <span>{manager.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      <span>Since {new Date(manager.joinDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleSendMessage(manager.email)}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamMembers.map((member) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                    {member.firstName[0]}{member.lastName[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-slate-900 truncate">
                        {member.firstName} {member.lastName}
                      </h3>
                      {member.status === 'ACTIVE' && (
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                      )}
                    </div>

                    <p className="text-sm text-slate-600 font-medium mb-2">{member.jobTitle}</p>

                    <div className="space-y-1 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <a
                          href={`mailto:${member.email}`}
                          className="hover:text-purple-600 truncate"
                        >
                          {member.email}
                        </a>
                      </div>
                      {member.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{member.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{member.location}</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleSendMessage(member.email)}
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full border-purple-600 text-purple-600 hover:bg-purple-50"
                    >
                      <MessageSquare className="h-3 w-3 mr-2" />
                      Send Email
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
