'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Upload,
  Save,
  Edit3,
  FileText,
  Download,
  CheckCircle2,
  Building2,
  Users,
  Linkedin,
  Github,
  Globe,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PhoneInput } from '@/components/ui/phone-input';
import { toast } from 'sonner';

export default function MyProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userChanges, setUserChanges] = useState<{ firstName?: string; lastName?: string }>({});
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/employee/profile');
      const data = await response.json();
      if (data.success && data.data) {
        setUser(data.data);
        setDocuments(data.data.documents || []);
        setProfile(data.data.employeeProfile || {
          middleName: '',
          preferredName: '',
          dateOfBirth: null,
          gender: '',
          maritalStatus: '',
          personalEmail: '',
          personalPhone: '',
          alternatePhone: '',
          bloodGroup: '',
          profilePhotoUrl: '',
          currentAddress: null,
          permanentAddress: null,
          sameAsCurrentAddress: false,
          highestQualification: '',
          fieldOfStudy: '',
          university: '',
          yearOfPassing: null,
          linkedinUrl: '',
          githubUrl: '',
          portfolioUrl: '',
          previousCompany: '',
          previousDesignation: '',
          yearsOfExperience: null,
          skills: [],
          certifications: '',
          emergencyContactName: '',
          emergencyRelationship: '',
          emergencyPhone: '',
          emergencyAlternatePhone: '',
          emergencyEmail: '',
          accountHolderName: '',
          accountNumber: '',
          bankName: '',
          ifscCode: '',
          branchName: '',
          accountType: '',
        });
      } else {
        toast.error(data.error || 'Failed to load profile');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (field: string, value: any) => {
    setProfile((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUserChange = (field: 'firstName' | 'lastName', value: string) => {
    setUserChanges((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddressChange = (addressType: 'currentAddress' | 'permanentAddress', field: string, value: string) => {
    setProfile((prev: any) => ({
      ...prev,
      [addressType]: {
        ...(prev?.[addressType] || {}),
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/employee/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...profile,
          // Include user changes (firstName, lastName) for User model update
          userUpdates: Object.keys(userChanges).length > 0 ? userChanges : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Profile updated successfully');
        setEditing(false);
        setUserChanges({}); // Reset user changes
        fetchUserProfile(); // Refresh data
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const calculateProfileCompletion = () => {
    if (!profile) return 0;

    const fields = [
      profile.personalEmail,
      profile.personalPhone,
      profile.dateOfBirth,
      profile.gender,
      profile.bloodGroup,
      profile.currentAddress?.street,
      profile.currentAddress?.city,
      profile.currentAddress?.state,
      profile.currentAddress?.country,
      profile.highestQualification,
      profile.university,
      profile.emergencyContactName,
      profile.emergencyPhone,
      profile.emergencyRelationship,
    ];

    const completed = fields.filter(f => f && f !== '').length;
    return Math.round((completed / fields.length) * 100);
  };

  const handleAddSkill = () => {
    if (!skillInput.trim()) return;

    const currentSkills = profile?.skills || [];
    if (currentSkills.includes(skillInput.trim())) {
      toast.info('Skill already added');
      return;
    }

    setProfile((prev: any) => ({
      ...prev,
      skills: [...currentSkills, skillInput.trim()],
    }));
    setSkillInput('');
    toast.success('Skill added');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile((prev: any) => ({
      ...prev,
      skills: (prev?.skills || []).filter((skill: string) => skill !== skillToRemove),
    }));
    toast.success('Skill removed');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'EMPLOYEE_DOCUMENT');
      formData.append('description', docType);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Map document type to profile field
        const fieldMap: Record<string, string> = {
          'resume': 'resumeUrl',
          'photo_id': 'photoIdUrl',
          'education': 'educationCertsUrl',
          'experience': 'experienceLettersUrl',
          'pan_card': 'panCardUrl',
          'cheque': 'cancelledChequeUrl',
          'aadhaar': 'aadhaarCardUrl',
          'passport': 'passportPhotoUrl',
        };

        const fileUrl = data.data?.fileUrl || data.fileUrl;
        const profileField = fieldMap[docType];
        if (profileField) {
          // Update profile state immediately
          setProfile((prev: any) => ({
            ...prev,
            [profileField]: fileUrl,
          }));

          // Also save to database
          const updateResponse = await fetch('/api/employee/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              [profileField]: fileUrl,
            }),
          });

          if (updateResponse.ok) {
            toast.success('File uploaded and saved successfully');
          } else {
            const errorData = await updateResponse.json();
            console.error('Failed to save document to profile:', errorData);
            toast.warning('File uploaded but failed to save to profile');
          }
        } else {
          toast.success('File uploaded successfully');
        }

        fetchUserProfile(); // Refresh to get latest data
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (2MB for photos)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'EMPLOYEE_PHOTO');
      formData.append('description', 'Profile Photo');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Update profile state immediately
        const fileUrl = data.data?.fileUrl || data.fileUrl;

        console.log('📸 Photo upload response:', {
          fileUrl,
          fileName: data.data?.fileName,
          fileSize: data.data?.fileSize,
          optimized: data.data?.optimized
        });

        setProfile((prev: any) => ({
          ...prev,
          profilePhotoUrl: fileUrl,
        }));

        // Save to database
        console.log('💾 Saving photo URL to database:', fileUrl);
        const updateResponse = await fetch('/api/employee/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            profilePhotoUrl: fileUrl,
          }),
        });

        if (updateResponse.ok) {
          const result = await updateResponse.json();
          console.log('✅ Photo saved to database:', result);
          toast.success('Photo uploaded and saved successfully');
          fetchUserProfile(); // Refresh to get latest data
        } else {
          const errorData = await updateResponse.json();
          console.error('❌ Failed to save photo to profile:', errorData);
          toast.warning('Photo uploaded but failed to save to profile');
        }
      } else {
        console.error('❌ Upload failed:', data);
        toast.error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const getDocumentByType = (type: string) => {
    // Map document types to EmployeeProfile URL fields
    let url: string | undefined;

    switch (type) {
      case 'resume':
        url = profile?.resumeUrl;
        break;
      case 'photo_id':
        url = profile?.photoIdUrl;
        break;
      case 'education':
        url = Array.isArray(profile?.educationCertsUrl) && profile.educationCertsUrl.length > 0
          ? profile.educationCertsUrl[0]
          : typeof profile?.educationCertsUrl === 'string'
          ? profile.educationCertsUrl
          : undefined;
        break;
      case 'experience':
        url = Array.isArray(profile?.experienceLettersUrl) && profile.experienceLettersUrl.length > 0
          ? profile.experienceLettersUrl[0]
          : typeof profile?.experienceLettersUrl === 'string'
          ? profile.experienceLettersUrl
          : undefined;
        break;
      case 'pan_card':
        url = profile?.panCardUrl;
        break;
      case 'cheque':
        url = profile?.cancelledChequeUrl;
        break;
      case 'aadhaar':
        url = profile?.aadhaarCardUrl;
        break;
      case 'passport':
        url = profile?.passportPhotoUrl;
        break;
      default:
        url = undefined;
    }

    if (!url || typeof url !== 'string') return null;

    // Return a document-like object for compatibility with existing UI
    return {
      fileUrl: url,
      fileName: url.split('/').pop() || 'Document',
      fileSize: 0, // Unknown size for URLs stored in profile
    };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
          <p className="text-slate-600 mt-1">Manage your personal information and documents</p>
        </div>
        <div className="flex gap-3">
          {!editing ? (
            <Button onClick={() => setEditing(true)} className="bg-purple-600 hover:bg-purple-700">
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Profile Card with Tabs */}
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-6">
            <div className="relative">
              {profile?.profilePhotoUrl ? (
                <img
                  src={profile.profilePhotoUrl}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              )}
              <label
                htmlFor="profile-photo-upload"
                className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                ) : (
                  <Upload className="h-4 w-4 text-purple-600" />
                )}
              </label>
              <input
                id="profile-photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploading}
              />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-slate-600 mt-1">{user?.email}</p>
              <div className="flex gap-3 mt-3">
                <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                  {user?.role}
                </Badge>
                <Badge className="bg-green-100 text-green-700 border-green-300">
                  {user?.status}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="professional">Professional</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="emergency">Emergency Contact</TabsTrigger>
            </TabsList>

            {/* Personal Info Tab */}
            <TabsContent value="personal" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={userChanges.firstName ?? user?.firstName ?? ''}
                    onChange={(e) => handleUserChange('firstName', e.target.value)}
                    disabled={!editing}
                    className="disabled:opacity-70"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={userChanges.lastName ?? user?.lastName ?? ''}
                    onChange={(e) => handleUserChange('lastName', e.target.value)}
                    disabled={!editing}
                    className="disabled:opacity-70"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Work Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="disabled:opacity-70"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personalEmail">Personal Email</Label>
                  <Input
                    id="personalEmail"
                    type="email"
                    value={profile?.personalEmail || ''}
                    onChange={(e) => handleProfileChange('personalEmail', e.target.value)}
                    disabled={!editing}
                    placeholder="personal@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Personal Phone</Label>
                  <PhoneInput
                    id="phone"
                    value={profile?.personalPhone || ''}
                    onChange={(value) => handleProfileChange('personalPhone', value)}
                    disabled={!editing}
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={profile?.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleProfileChange('dateOfBirth', e.target.value)}
                    disabled={!editing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Input
                    id="gender"
                    value={profile?.gender || ''}
                    onChange={(e) => handleProfileChange('gender', e.target.value)}
                    disabled={!editing}
                    placeholder="Male / Female / Other"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  <Input
                    id="bloodGroup"
                    value={profile?.bloodGroup || ''}
                    onChange={(e) => handleProfileChange('bloodGroup', e.target.value)}
                    disabled={!editing}
                    placeholder="O+, A+, B+, AB+, etc."
                  />
                </div>
              </div>

              {/* Address Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  Current Address
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="addressLine1">Street Address</Label>
                    <Input
                      id="addressLine1"
                      value={profile?.currentAddress?.street || ''}
                      onChange={(e) => handleAddressChange('currentAddress', 'street', e.target.value)}
                      disabled={!editing}
                      placeholder="Street address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={profile?.currentAddress?.city || ''}
                      onChange={(e) => handleAddressChange('currentAddress', 'city', e.target.value)}
                      disabled={!editing}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={profile?.currentAddress?.state || ''}
                      onChange={(e) => handleAddressChange('currentAddress', 'state', e.target.value)}
                      disabled={!editing}
                      placeholder="State"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Pincode</Label>
                    <Input
                      id="postalCode"
                      value={profile?.currentAddress?.pincode || ''}
                      onChange={(e) => handleAddressChange('currentAddress', 'pincode', e.target.value)}
                      disabled={!editing}
                      placeholder="Pincode"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={profile?.currentAddress?.country || ''}
                      onChange={(e) => handleAddressChange('currentAddress', 'country', e.target.value)}
                      disabled={!editing}
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Professional Tab */}
            <TabsContent value="professional" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input
                    id="employeeId"
                    value={user?.employeeId || 'N/A'}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={user?.department?.name || 'N/A'}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualification">Highest Qualification</Label>
                  <Input
                    id="qualification"
                    value={profile?.highestQualification || ''}
                    onChange={(e) => handleProfileChange('highestQualification', e.target.value)}
                    disabled={!editing}
                    placeholder="Bachelor's, Master's, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="university">University</Label>
                  <Input
                    id="university"
                    value={profile?.university || ''}
                    onChange={(e) => handleProfileChange('university', e.target.value)}
                    disabled={!editing}
                    placeholder="University name"
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-purple-600" />
                  Professional Links
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin" className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4" />
                      LinkedIn Profile
                    </Label>
                    <Input
                      id="linkedin"
                      value={profile?.linkedinUrl || ''}
                      onChange={(e) => handleProfileChange('linkedinUrl', e.target.value)}
                      disabled={!editing}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="github" className="flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      GitHub Profile
                    </Label>
                    <Input
                      id="github"
                      value={profile?.githubUrl || ''}
                      onChange={(e) => handleProfileChange('githubUrl', e.target.value)}
                      disabled={!editing}
                      placeholder="https://github.com/..."
                    />
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Skills & Expertise</h3>

                {editing && (
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Enter a skill (e.g. React, Python, Design)"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                      className="flex-1"
                    />
                    <Button onClick={handleAddSkill} variant="outline" size="sm">
                      + Add
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {profile?.skills?.length > 0 ? (
                    profile.skills.map((skill: string, idx: number) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-slate-200 transition-colors"
                      >
                        {skill}
                        {editing && (
                          <button
                            onClick={() => handleRemoveSkill(skill)}
                            className="ml-1 hover:text-red-600 transition-colors"
                          >
                            ×
                          </button>
                        )}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm">
                      {editing ? 'Add your skills using the input above' : 'No skills added yet'}
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4 mt-6">
              <p className="text-slate-600 text-sm mb-4">
                Upload and manage your important documents. Supported formats: PDF, JPG, PNG (Max 5MB)
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Resume', type: 'resume' },
                  { name: 'Photo ID (Aadhaar/Passport)', type: 'photo_id' },
                  { name: 'Education Certificates', type: 'education' },
                  { name: 'Experience Letters', type: 'experience' },
                  { name: 'PAN Card', type: 'pan_card' },
                  { name: 'Cancelled Cheque', type: 'cheque' },
                  { name: 'Aadhaar Card', type: 'aadhaar' },
                  { name: 'Passport', type: 'passport' },
                ].map((docType, idx) => {
                  const uploadedDoc = getDocumentByType(docType.type);
                  const isUploaded = !!uploadedDoc;

                  return (
                    <Card key={idx} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isUploaded ? 'bg-green-100' : 'bg-slate-100'
                          }`}>
                            <FileText className={`h-5 w-5 ${
                              isUploaded ? 'text-green-600' : 'text-slate-500'
                            }`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-900 truncate">{docType.name}</p>
                            {isUploaded ? (
                              <>
                                <p className="text-xs text-green-600 truncate" title={uploadedDoc.fileName}>
                                  {uploadedDoc.fileName}
                                </p>
                                {uploadedDoc.fileSize > 0 && (
                                  <p className="text-xs text-slate-500">
                                    {formatFileSize(uploadedDoc.fileSize)}
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-xs text-slate-500">Not uploaded</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {isUploaded ? (
                            <>
                              <a
                                href={uploadedDoc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                              >
                                <Button variant="ghost" size="sm" title="Download">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </a>
                              <label htmlFor={`doc-upload-${idx}`}>
                                <Button variant="ghost" size="sm" asChild title="Replace">
                                  <span>
                                    <Upload className="h-4 w-4" />
                                  </span>
                                </Button>
                              </label>
                            </>
                          ) : (
                            <label htmlFor={`doc-upload-${idx}`}>
                              <Button variant="outline" size="sm" disabled={uploading} asChild>
                                <span>
                                  {uploading ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                                  ) : (
                                    <Upload className="h-4 w-4 mr-2" />
                                  )}
                                  Upload
                                </span>
                              </Button>
                            </label>
                          )}
                          <input
                            id={`doc-upload-${idx}`}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(e, docType.type)}
                            className="hidden"
                            disabled={uploading}
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {(() => {
                const uploadedCount = [
                  profile?.resumeUrl,
                  profile?.photoIdUrl,
                  profile?.educationCertsUrl,
                  profile?.experienceLettersUrl,
                  profile?.panCardUrl,
                  profile?.cancelledChequeUrl,
                  profile?.aadhaarCardUrl,
                  profile?.passportPhotoUrl,
                ].filter(Boolean).length;

                return uploadedCount > 0 ? (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      You have {uploadedCount} document{uploadedCount > 1 ? 's' : ''} uploaded
                    </p>
                  </div>
                ) : null;
              })()}
            </TabsContent>

            {/* Emergency Contact Tab */}
            <TabsContent value="emergency" className="space-y-6 mt-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  This information will be used in case of emergencies. Please keep it up to date.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="emergencyName">Contact Name *</Label>
                  <Input
                    id="emergencyName"
                    value={profile?.emergencyContactName || ''}
                    onChange={(e) => handleProfileChange('emergencyContactName', e.target.value)}
                    disabled={!editing}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyRelationship">Relationship *</Label>
                  <Input
                    id="emergencyRelationship"
                    value={profile?.emergencyRelationship || ''}
                    onChange={(e) => handleProfileChange('emergencyRelationship', e.target.value)}
                    disabled={!editing}
                    placeholder="Spouse, Parent, Sibling, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Primary Phone *</Label>
                  <PhoneInput
                    id="emergencyPhone"
                    value={profile?.emergencyPhone || ''}
                    onChange={(value) => handleProfileChange('emergencyPhone', value)}
                    disabled={!editing}
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyAltPhone">Alternate Phone</Label>
                  <PhoneInput
                    id="emergencyAltPhone"
                    value={profile?.emergencyAlternatePhone || ''}
                    onChange={(value) => handleProfileChange('emergencyAlternatePhone', value)}
                    disabled={!editing}
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyEmail">Email</Label>
                  <Input
                    id="emergencyEmail"
                    type="email"
                    disabled={!editing}
                    placeholder="emergency@example.com"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Profile Completion */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-purple-600" />
            Profile Completion
          </CardTitle>
          <CardDescription>Complete your profile to unlock all features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{calculateProfileCompletion()}% Complete</span>
              <span className="text-slate-500">
                {14 - Math.round((calculateProfileCompletion() / 100) * 14)} fields remaining
              </span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${calculateProfileCompletion()}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
