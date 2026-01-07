'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Edit,
  FileText,
  Flag,
  X,
  Calendar,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Upload,
  Download,
  Share2,
  Eye,
  Plus,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Subordinate {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
  };
}

interface Project {
  id: string;
  projectCode?: string | null;
  name: string;
  description?: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  budgetHours?: number | null;
  budgetCost?: number | null;
  currency?: string | null;
  createdAt: string;
  client: {
    id: string;
    clientId: string;
    companyName: string;
  };
  assignments: Array<{
    id: string;
    role: string | null;
    billableRate: number;
    employee: {
      id: string;
      user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl?: string | null;
      };
      subordinates?: Subordinate[];
    };
  }>;
  tasks?: Array<{
    id: string;
    name: string;
    status: string;
    dueDate?: string | null;
    description?: string | null;
    assigneeId?: string | null;
  }>;
  _count?: {
    tasks: number;
    timeEntries: number;
  };
}

interface ProjectFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  description?: string | null;
  createdAt: string;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [deleting, setDeleting] = useState(false);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    fetchProject();
  }, [projectId]);

  useEffect(() => {
    if (activeTab === 'files' && projectId) {
      fetchFiles();
    }
  }, [activeTab, projectId]);

  const fetchFiles = async () => {
    try {
      setFilesLoading(true);
      const response = await fetch(`/api/projects/files?projectId=${projectId}`);
      const data = await response.json();

      if (data.success) {
        setFiles(data.files || []);
      } else {
        console.error('Failed to fetch files:', data.error);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setFilesLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);

      const response = await fetch('/api/projects/files', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success('File uploaded successfully');
        setFiles((prev) => [data.file, ...prev]);
      } else {
        toast.error(data.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/projects/files?id=${fileId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('File deleted successfully');
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      } else {
        toast.error(data.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'doc';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
    return 'file';
  };

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();

      if (data.success) {
        console.log('Project loaded:', data.project);
        setProject(data.project);
      } else {
        console.error('Failed to fetch project:', data.error);
        toast.error('Failed to load project');
        router.push('/admin/projects');
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project');
      router.push('/admin/projects');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'ON_HOLD':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const calculateDaysElapsed = () => {
    if (!project) return 0;
    const start = new Date(project.startDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateDaysRemaining = () => {
    if (!project || !project.endDate) return 0;
    const end = new Date(project.endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const calculateTotalDuration = () => {
    if (!project || !project.endDate) return 0;
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateProgress = () => {
    const total = calculateTotalDuration();
    if (total === 0) return 0;
    const elapsed = calculateDaysElapsed();
    return Math.min(100, Math.round((elapsed / total) * 100));
  };

  const handleCloseProject = async () => {
    if (!project) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Project closed successfully');
        router.push('/admin/projects');
      } else {
        toast.error(data.error || 'Failed to close project');
      }
    } catch (error) {
      console.error('Error closing project:', error);
      toast.error('Failed to close project');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!project) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Project status updated to ${newStatus.replace('_', ' ')}`);
        setProject({ ...project, status: newStatus });
      } else {
        toast.error(data.error || 'Failed to update project status');
      }
    } catch (error) {
      console.error('Error updating project status:', error);
      toast.error('Failed to update project status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Project not found</h2>
          <Button onClick={() => router.push('/admin/projects')} className="mt-4">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();
  const daysElapsed = calculateDaysElapsed();
  const daysRemaining = calculateDaysRemaining();
  const totalDuration = calculateTotalDuration();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/admin/projects')}
                  className="text-gray-600"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                <Badge variant="outline" className={getStatusColor(project.status)}>
                  {project.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1 font-semibold text-purple-600">
                  <FileText className="w-4 h-4" />
                  {project.projectCode || project.id}
                </span>
                <span>•</span>
                <span>Client: {project.client.companyName}</span>
                <span>•</span>
                <span>Created: {formatDate(project.createdAt)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/admin/projects/${projectId}/edit`)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                Report
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Close Project
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close Project</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to close this project? This action will delete the project
                      if it has no time entries. Projects with time entries cannot be deleted -
                      consider changing the status to &quot;Completed&quot; or &quot;Cancelled&quot; instead.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateStatus('COMPLETED')}
                      className="mr-2"
                    >
                      Mark as Completed
                    </Button>
                    <AlertDialogAction
                      onClick={handleCloseProject}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Project'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Timeline</p>
                <p className="text-sm font-semibold">{daysRemaining} days left</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Budget</p>
                <p className="text-sm font-semibold">
                  {project.budgetCost ? formatCurrency(project.budgetCost, project.currency || 'USD') : 'Not set'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Team</p>
                <p className="text-sm font-semibold">{project.assignments.length} members</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Tasks</p>
                <p className="text-sm font-semibold">{project._count?.tasks || 0} tasks</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-gray-200 p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Project Health
                  </CardTitle>
                  <CardDescription>Overall project status and progress</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Overall Progress</span>
                      <span className="font-semibold text-blue-600">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Timeline Progress</span>
                      <span className="font-semibold text-green-600">
                        {daysElapsed} of {totalDuration} days ({progress}%)
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{formatDate(project.startDate)}</span>
                      <span>Today</span>
                      <span>{formatDate(project.endDate)}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tasks Completed</span>
                      <span className="font-semibold">0/{project._count?.tasks || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Hours Logged</span>
                      <span className="font-semibold">0/{project.budgetHours || 0}h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Team Utilization</span>
                      <span className="font-semibold text-green-600">
                        {(() => {
                          // Find project manager's team (subordinates)
                          const projectManager = project.assignments.find(a =>
                            a.role?.toLowerCase().includes('manager') ||
                            a.role?.toLowerCase().includes('lead')
                          );
                          const teamSize = projectManager?.employee?.subordinates?.length || 0;
                          const assignedCount = project.assignments.length;
                          if (teamSize === 0) return `${assignedCount} assigned`;
                          return `${assignedCount}/${teamSize} (${Math.round((assignedCount / teamSize) * 100)}%)`;
                        })()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Project Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Project Details
                  </CardTitle>
                  <CardDescription>Basic project information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Client Information</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">Company: <span className="font-medium text-gray-900">{project.client.companyName}</span></p>
                      <p className="text-gray-600">Client ID: <span className="font-medium text-gray-900">{project.client.clientId}</span></p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Timeline</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">Start Date: <span className="font-medium text-gray-900">{formatDate(project.startDate)}</span></p>
                      <p className="text-gray-600">End Date: <span className="font-medium text-gray-900">{formatDate(project.endDate)}</span></p>
                      <p className="text-gray-600">Duration: <span className="font-medium text-gray-900">{totalDuration} days</span></p>
                      <p className="text-gray-600">Days Elapsed: <span className="font-medium text-gray-900">{daysElapsed} days</span></p>
                      <p className="text-gray-600">Days Remaining: <span className="font-medium text-green-600">{daysRemaining} days</span></p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Financial</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">Total Budget: <span className="font-medium text-gray-900">
                        {project.budgetCost ? formatCurrency(project.budgetCost, project.currency || 'USD') : 'Not set'}
                      </span></p>
                      <p className="text-gray-600">Budget Hours: <span className="font-medium text-gray-900">{project.budgetHours || 0}h</span></p>
                      <p className="text-gray-600">Currency: <span className="font-medium text-gray-900">{project.currency || 'USD'}</span></p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Description */}
            {project.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{project.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Manager's Team */}
            {(() => {
              // Find project manager and their team
              const projectManager = project.assignments.find(a =>
                a.role?.toLowerCase().includes('manager') ||
                a.role?.toLowerCase().includes('lead')
              );
              const subordinates = projectManager?.employee?.subordinates || [];

              if (!projectManager || subordinates.length === 0) return null;

              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      {projectManager.employee.user.firstName}&apos;s Team
                    </CardTitle>
                    <CardDescription>
                      {subordinates.length} team member{subordinates.length !== 1 ? 's' : ''} reporting to the project manager
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {subordinates.map((sub) => {
                        const isAssigned = project.assignments.some(
                          a => a.employee.user.id === sub.user.id
                        );
                        return (
                          <div
                            key={sub.id}
                            className={`p-4 rounded-lg border ${
                              isAssigned
                                ? 'border-green-200 bg-green-50'
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                                isAssigned
                                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                                  : 'bg-gradient-to-br from-gray-400 to-gray-500'
                              }`}>
                                {sub.user.firstName[0]}{sub.user.lastName[0]}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {sub.user.firstName} {sub.user.lastName}
                                </p>
                                <p className="text-xs text-gray-500">{sub.user.email}</p>
                                {isAssigned && (
                                  <Badge variant="outline" className="mt-1 text-xs bg-green-100 text-green-700 border-green-300">
                                    Assigned
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Project Team</h2>
                <p className="text-gray-600">Team structure under the project manager</p>
              </div>
            </div>

            {/* Team Tree Structure */}
            {(() => {
              // Find project manager
              const projectManager = project.assignments.find(a =>
                a.role?.toLowerCase().includes('manager') ||
                a.role?.toLowerCase().includes('lead')
              );
              const subordinates = projectManager?.employee?.subordinates || [];

              if (!projectManager) {
                return (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Project Manager Assigned</h3>
                      <p className="text-gray-600">Assign a project manager to see the team structure</p>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <Card>
                  <CardContent className="p-6">
                    {/* Tree Structure */}
                    <div className="flex flex-col items-center">
                      {/* Project Manager (Root) */}
                      <div className="flex flex-col items-center">
                        <div className="relative p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg text-white">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
                              {projectManager.employee.user.firstName[0]}{projectManager.employee.user.lastName[0]}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold">
                                {projectManager.employee.user.firstName} {projectManager.employee.user.lastName}
                              </h3>
                              <p className="text-sm text-purple-100">{projectManager.role || 'Project Manager'}</p>
                              <p className="text-xs text-purple-200">{projectManager.employee.user.email}</p>
                            </div>
                          </div>
                          <Badge className="absolute -top-2 -right-2 bg-yellow-500 text-yellow-900 border-0">
                            Manager
                          </Badge>
                        </div>

                        {/* Connector Line */}
                        {subordinates.length > 0 && (
                          <div className="w-0.5 h-8 bg-gray-300" />
                        )}
                      </div>

                      {/* Team Members (Children) */}
                      {subordinates.length > 0 && (
                        <div className="relative">
                          {/* Horizontal connector */}
                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-0.5 bg-gray-300"
                               style={{ width: `${Math.min(subordinates.length * 200, 800)}px` }} />

                          <div className="flex flex-wrap justify-center gap-6 pt-8">
                            {subordinates.map((sub, index) => {
                              const isAssigned = project.assignments.some(
                                a => a.employee.user.id === sub.user.id
                              );
                              const assignment = project.assignments.find(
                                a => a.employee.user.id === sub.user.id
                              );

                              return (
                                <div key={sub.id} className="flex flex-col items-center">
                                  {/* Vertical connector to child */}
                                  <div className="w-0.5 h-4 bg-gray-300 -mt-4" />

                                  <div className={`relative p-4 rounded-xl shadow-md border-2 transition-all ${
                                    isAssigned
                                      ? 'bg-green-50 border-green-300'
                                      : 'bg-gray-50 border-gray-200'
                                  }`}>
                                    <div className="flex items-center gap-3">
                                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                                        isAssigned
                                          ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                                          : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                      }`}>
                                        {sub.user.firstName[0]}{sub.user.lastName[0]}
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-gray-900">
                                          {sub.user.firstName} {sub.user.lastName}
                                        </h4>
                                        <p className="text-xs text-gray-500">{sub.user.email}</p>
                                        {isAssigned && assignment && (
                                          <p className="text-xs text-green-600 font-medium mt-1">
                                            {assignment.role || 'Team Member'}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    {isAssigned ? (
                                      <Badge className="absolute -top-2 -right-2 bg-green-500 text-white border-0 text-xs">
                                        Assigned
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="absolute -top-2 -right-2 bg-white text-gray-500 border-gray-300 text-xs">
                                        Not Assigned
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {subordinates.length === 0 && (
                        <div className="mt-8 text-center text-gray-500">
                          <p className="text-sm">No team members reporting to this manager</p>
                        </div>
                      )}
                    </div>

                    {/* Summary */}
                    <div className="mt-8 pt-6 border-t">
                      <div className="flex justify-center gap-8">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">{subordinates.length}</p>
                          <p className="text-sm text-gray-600">Team Size</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {subordinates.filter(sub =>
                              project.assignments.some(a => a.employee.user.id === sub.user.id)
                            ).length}
                          </p>
                          <p className="text-sm text-gray-600">Assigned</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-500">
                            {subordinates.filter(sub =>
                              !project.assignments.some(a => a.employee.user.id === sub.user.id)
                            ).length}
                          </p>
                          <p className="text-sm text-gray-600">Available</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Project Tasks</h2>
                <p className="text-gray-600">{project.tasks?.length || 0} tasks in this project</p>
              </div>
              <Button onClick={() => router.push('/manager/tasks/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>

            {(!project.tasks || project.tasks.length === 0) ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks yet</h3>
                  <p className="text-gray-600 mb-4">Create tasks to track work on this project</p>
                  <Button onClick={() => router.push('/manager/tasks/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Task Status Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {project.tasks.filter(t => t.status === 'TODO').length}
                        </p>
                        <p className="text-sm text-gray-600">To Do</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {project.tasks.filter(t => t.status === 'IN_PROGRESS').length}
                        </p>
                        <p className="text-sm text-blue-600">In Progress</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-yellow-50">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-600">
                          {project.tasks.filter(t => t.status === 'IN_REVIEW').length}
                        </p>
                        <p className="text-sm text-yellow-600">In Review</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {project.tasks.filter(t => t.status === 'COMPLETED').length}
                        </p>
                        <p className="text-sm text-green-600">Completed</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Task List */}
                <Card>
                  <CardHeader>
                    <CardTitle>All Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {project.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start gap-4">
                            <div className={`w-3 h-3 mt-1.5 rounded-full ${
                              task.status === 'COMPLETED' ? 'bg-green-500' :
                              task.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                              task.status === 'IN_REVIEW' ? 'bg-yellow-500' :
                              'bg-gray-400'
                            }`} />
                            <div>
                              <h4 className={`font-medium ${task.status === 'COMPLETED' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {task.name}
                              </h4>
                              {task.description && (
                                <p className="text-sm text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span className={`px-2 py-0.5 rounded-full ${
                                  task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                  task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                  task.status === 'IN_REVIEW' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {task.status.replace('_', ' ')}
                                </span>
                                {task.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(task.dueDate)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/manager/tasks`)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-6">
            {/* Project Duration Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Project Timeline</CardTitle>
                <CardDescription>
                  {formatDate(project.startDate)} - {project.endDate ? formatDate(project.endDate) : 'No end date set'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Overall Progress</span>
                    <span className="font-medium">{calculateProgress()}%</span>
                  </div>
                  <Progress value={calculateProgress()} className="h-3" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{calculateDaysElapsed()} days elapsed</span>
                    <span>{calculateTotalDuration() - calculateDaysElapsed()} days remaining</span>
                  </div>
                </div>

                {/* Key Dates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Flag className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Start Date</p>
                      <p className="font-semibold text-gray-900">{formatDate(project.startDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Today</p>
                      <p className="font-semibold text-gray-900">{formatDate(new Date().toISOString())}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <Flag className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">End Date</p>
                      <p className="font-semibold text-gray-900">{project.endDate ? formatDate(project.endDate) : 'Not set'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Task Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Task Milestones</CardTitle>
                <CardDescription>Tasks with due dates</CardDescription>
              </CardHeader>
              <CardContent>
                {(!project.tasks || project.tasks.filter(t => t.dueDate).length === 0) ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No tasks with due dates</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                    <div className="space-y-6">
                      {project.tasks
                        .filter(t => t.dueDate)
                        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                        .map((task, index) => {
                          const isOverdue = new Date(task.dueDate!) < new Date() && task.status !== 'COMPLETED';
                          const isCompleted = task.status === 'COMPLETED';

                          return (
                            <div key={task.id} className="flex gap-4 relative">
                              {/* Timeline dot */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                                isCompleted ? 'bg-green-500' :
                                isOverdue ? 'bg-red-500' :
                                'bg-blue-500'
                              }`}>
                                {isCompleted ? (
                                  <CheckCircle2 className="w-4 h-4 text-white" />
                                ) : (
                                  <span className="text-white text-xs font-bold">{index + 1}</span>
                                )}
                              </div>

                              {/* Task content */}
                              <div className={`flex-1 pb-6 ${index === project.tasks!.filter(t => t.dueDate).length - 1 ? 'pb-0' : ''}`}>
                                <div className={`p-4 rounded-lg border ${
                                  isCompleted ? 'bg-green-50 border-green-200' :
                                  isOverdue ? 'bg-red-50 border-red-200' :
                                  'bg-white border-gray-200'
                                }`}>
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className={`font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                        {task.name}
                                      </h4>
                                      {task.description && (
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                                      )}
                                    </div>
                                    <Badge variant={isCompleted ? 'default' : isOverdue ? 'destructive' : 'secondary'}>
                                      {task.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 mt-3 text-sm">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span className={isOverdue && !isCompleted ? 'text-red-600 font-medium' : 'text-gray-600'}>
                                      {formatDate(task.dueDate!)}
                                      {isOverdue && !isCompleted && ' (Overdue)'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Milestones Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{calculateTotalDuration()}</p>
                  <p className="text-sm text-gray-600">Total Days</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{calculateDaysElapsed()}</p>
                  <p className="text-sm text-gray-600">Days Elapsed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {project.tasks?.filter(t => t.status === 'COMPLETED').length || 0}
                  </p>
                  <p className="text-sm text-gray-600">Tasks Completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {project.tasks?.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length || 0}
                  </p>
                  <p className="text-sm text-gray-600">Overdue Tasks</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Budget Overview</CardTitle>
                <CardDescription>Track project budget and expenses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Total Budget</h4>
                  <p className="text-3xl font-bold text-gray-900">
                    {project.budgetCost ? formatCurrency(project.budgetCost, project.currency || 'USD') : 'Not set'}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-4">Budget allocation and tracking features coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Project Documents</h2>
                <p className="text-gray-600">{files.length} file{files.length !== 1 ? 's' : ''} uploaded</p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.zip,.rar"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </>
                  )}
                </Button>
              </div>
            </div>

            {filesLoading ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading files...</p>
                </CardContent>
              </Card>
            ) : files.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No files uploaded yet</h3>
                  <p className="text-gray-600 mb-4">Upload documents, designs, and other project files</p>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload File
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>All Files</CardTitle>
                  <CardDescription>Click on a file to download</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{file.fileName}</h4>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                              <span>{formatFileSize(file.fileSize)}</span>
                              <span>{formatDate(file.createdAt)}</span>
                              <span>by {file.uploadedBy.firstName} {file.uploadedBy.lastName}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(file.fileUrl, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete File</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{file.fileName}&quot;? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteFile(file.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Drag and Drop Zone */}
            <Card className="border-dashed border-2 border-gray-300 hover:border-purple-400 transition-colors">
              <CardContent
                className="p-8 text-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Click to upload or drag and drop files here
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PDF, Word, Excel, PowerPoint, Images (max 25MB)
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}
