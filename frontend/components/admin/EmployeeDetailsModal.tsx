'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  UserCircle,
  Shield,
  Clock,
  FileText,
  Heart,
  GraduationCap,
  Award,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EmployeeDetails {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  status: string;
  employeeNumber: string;
  jobTitle?: string;
  department?: string;
  departmentId?: string;
  startDate?: string;
  employmentType?: string;
  employeeStatus?: string;
  lastLoginAt?: string;
  createdAt?: string;
  profile?: {
    personalEmail?: string;
    personalPhone?: string;
    alternatePhone?: string;
    dateOfBirth?: string;
    gender?: string;
    bloodGroup?: string;
    currentAddress?: any;
    permanentAddress?: any;
    emergencyContactName?: string;
    emergencyRelationship?: string;
    emergencyPhone?: string;
    highestQualification?: string;
    university?: string;
    yearOfPassing?: number;
    yearsOfExperience?: number;
    skills?: string[];
    accountHolderName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    branchName?: string;
  };
}

interface EmployeeDetailsModalProps {
  employee: EmployeeDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EmployeeDetailsModal({
  employee,
  isOpen,
  onClose,
}: EmployeeDetailsModalProps) {
  if (!employee) return null;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'HR':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'ACCOUNTANT':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'EMPLOYEE':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAddress = (address: any) => {
    if (!address) return 'N/A';
    if (typeof address === 'string') return address;
    const { street, city, state, zipCode, country } = address;
    return `${street || ''}, ${city || ''}, ${state || ''} ${zipCode || ''}, ${country || ''}`.replace(/,\s*,/g, ',').trim();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={onClose}
          >
            <div
              className="w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold">
                    {employee.firstName[0]}{employee.lastName[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{employee.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getRoleBadgeColor(employee.role)}>
                        {employee.role}
                      </Badge>
                      <Badge className={getStatusBadgeColor(employee.status)}>
                        {employee.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="contact">Contact</TabsTrigger>
                  <TabsTrigger value="professional">Professional</TabsTrigger>
                  <TabsTrigger value="documents">Other</TabsTrigger>
                </TabsList>

                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-6 mt-6">
                  <div className="grid grid-cols-2 gap-6">
                    <InfoCard
                      icon={<User className="w-5 h-5" />}
                      label="Employee ID"
                      value={employee.employeeNumber}
                    />
                    <InfoCard
                      icon={<Mail className="w-5 h-5" />}
                      label="Work Email"
                      value={employee.email}
                    />
                    <InfoCard
                      icon={<Briefcase className="w-5 h-5" />}
                      label="Job Title"
                      value={employee.jobTitle || 'N/A'}
                    />
                    <InfoCard
                      icon={<Building2 className="w-5 h-5" />}
                      label="Department"
                      value={employee.department || 'N/A'}
                    />
                    <InfoCard
                      icon={<Calendar className="w-5 h-5" />}
                      label="Start Date"
                      value={formatDate(employee.startDate)}
                    />
                    <InfoCard
                      icon={<Clock className="w-5 h-5" />}
                      label="Employment Type"
                      value={employee.employmentType || 'N/A'}
                    />
                    <InfoCard
                      icon={<Calendar className="w-5 h-5" />}
                      label="Date of Birth"
                      value={formatDate(employee.profile?.dateOfBirth)}
                    />
                    <InfoCard
                      icon={<UserCircle className="w-5 h-5" />}
                      label="Gender"
                      value={employee.profile?.gender || 'N/A'}
                    />
                    <InfoCard
                      icon={<Heart className="w-5 h-5" />}
                      label="Blood Group"
                      value={employee.profile?.bloodGroup || 'N/A'}
                    />
                    <InfoCard
                      icon={<Clock className="w-5 h-5" />}
                      label="Last Login"
                      value={formatDate(employee.lastLoginAt)}
                    />
                  </div>
                </TabsContent>

                {/* Contact Tab */}
                <TabsContent value="contact" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <InfoCard
                        icon={<Mail className="w-5 h-5" />}
                        label="Personal Email"
                        value={employee.profile?.personalEmail || 'N/A'}
                      />
                      <InfoCard
                        icon={<Phone className="w-5 h-5" />}
                        label="Personal Phone"
                        value={employee.profile?.personalPhone || 'N/A'}
                      />
                      <InfoCard
                        icon={<Phone className="w-5 h-5" />}
                        label="Alternate Phone"
                        value={employee.profile?.alternatePhone || 'N/A'}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Address Information
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <InfoCard
                        icon={<MapPin className="w-5 h-5" />}
                        label="Current Address"
                        value={formatAddress(employee.profile?.currentAddress)}
                      />
                      <InfoCard
                        icon={<MapPin className="w-5 h-5" />}
                        label="Permanent Address"
                        value={formatAddress(employee.profile?.permanentAddress)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Emergency Contact
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <InfoCard
                        icon={<User className="w-5 h-5" />}
                        label="Contact Name"
                        value={employee.profile?.emergencyContactName || 'N/A'}
                      />
                      <InfoCard
                        icon={<UserCircle className="w-5 h-5" />}
                        label="Relationship"
                        value={employee.profile?.emergencyRelationship || 'N/A'}
                      />
                      <InfoCard
                        icon={<Phone className="w-5 h-5" />}
                        label="Emergency Phone"
                        value={employee.profile?.emergencyPhone || 'N/A'}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Professional Tab */}
                <TabsContent value="professional" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5" />
                      Education
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <InfoCard
                        icon={<GraduationCap className="w-5 h-5" />}
                        label="Highest Qualification"
                        value={employee.profile?.highestQualification || 'N/A'}
                      />
                      <InfoCard
                        icon={<Building2 className="w-5 h-5" />}
                        label="University"
                        value={employee.profile?.university || 'N/A'}
                      />
                      <InfoCard
                        icon={<Calendar className="w-5 h-5" />}
                        label="Year of Passing"
                        value={employee.profile?.yearOfPassing?.toString() || 'N/A'}
                      />
                      <InfoCard
                        icon={<Briefcase className="w-5 h-5" />}
                        label="Years of Experience"
                        value={employee.profile?.yearsOfExperience?.toString() || 'N/A'}
                      />
                    </div>
                  </div>

                  {employee.profile?.skills && employee.profile.skills.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        Skills
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {employee.profile.skills.map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Documents/Other Tab */}
                <TabsContent value="documents" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Bank Details
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <InfoCard
                        icon={<User className="w-5 h-5" />}
                        label="Account Holder Name"
                        value={employee.profile?.accountHolderName || 'N/A'}
                      />
                      <InfoCard
                        icon={<CreditCard className="w-5 h-5" />}
                        label="Account Number"
                        value={employee.profile?.accountNumber ? '****' + employee.profile.accountNumber.slice(-4) : 'N/A'}
                      />
                      <InfoCard
                        icon={<Building2 className="w-5 h-5" />}
                        label="Bank Name"
                        value={employee.profile?.bankName || 'N/A'}
                      />
                      <InfoCard
                        icon={<FileText className="w-5 h-5" />}
                        label="IFSC Code"
                        value={employee.profile?.ifscCode || 'N/A'}
                      />
                      <InfoCard
                        icon={<MapPin className="w-5 h-5" />}
                        label="Branch Name"
                        value={employee.profile?.branchName || 'N/A'}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      System Information
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <InfoCard
                        icon={<Calendar className="w-5 h-5" />}
                        label="Account Created"
                        value={formatDate(employee.createdAt)}
                      />
                      <InfoCard
                        icon={<Shield className="w-5 h-5" />}
                        label="User ID"
                        value={employee.id}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end">
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Helper component for displaying information
function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <p className="text-gray-900 font-medium truncate" title={value}>
        {value}
      </p>
    </div>
  );
}
