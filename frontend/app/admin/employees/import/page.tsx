'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';

interface ImportResult {
  success: boolean;
  imported: number;
  employees: Array<{
    employeeNumber: string;
    email: string;
    name: string;
    role: string;
    jobTitle: string;
  }>;
}

export default function ImportEmployeesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Invalid file type', {
        description: 'Please upload a CSV or Excel file',
      });
      return;
    }

    setFile(selectedFile);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file to import');
      return;
    }

    setLoading(true);

    try {
      // Parse CSV/Excel file
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length <= 1) {
        toast.error('File is empty or contains only headers');
        setLoading(false);
        return;
      }

      // Parse CSV (simple implementation)
      const headers = lines[0].split(',').map((h) => h.trim());
      const employees = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim());
        const employee: any = {};

        headers.forEach((header, index) => {
          employee[header] = values[index];
        });

        employees.push(employee);
      }

      // Send to API
      const response = await fetch('/api/admin/employees/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees: employees.map((emp) => ({
            email: emp.email,
            firstName: emp.firstName,
            lastName: emp.lastName,
            // Support both departmentId (UUID) and departmentName
            departmentId: emp.departmentId,
            departmentName: emp.departmentName,
            jobTitle: emp.jobTitle,
            role: emp.role || 'EMPLOYEE',
            employmentType: emp.employmentType || 'FULL_TIME',
            startDate: emp.startDate || new Date().toISOString(),
            emergencyContacts: [
              {
                name: emp.emergencyContactName || 'N/A',
                relationship: emp.emergencyContactRelationship || 'N/A',
                phone: emp.emergencyContactPhone || 'N/A',
                email: emp.emergencyContactEmail,
              },
            ],
          })),
          sendWelcomeEmails: true,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data.data);
        toast.success(`Successfully imported ${data.data.imported} employees!`, {
          description: 'Welcome emails have been sent',
        });
      } else {
        toast.error(data.error || 'Failed to import employees', {
          description: data.errors ? JSON.stringify(data.errors) : undefined,
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to process file', {
        description: 'Please check the file format and try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `email,firstName,lastName,departmentId,jobTitle,role,employmentType,startDate,emergencyContactName,emergencyContactRelationship,emergencyContactPhone
john@company.com,John,Doe,dept-id-here,Software Engineer,EMPLOYEE,FULL_TIME,2024-01-01,Jane Doe,Spouse,555-0100
jane@company.com,Jane,Smith,dept-id-here,Product Manager,MANAGER,FULL_TIME,2024-01-01,John Smith,Spouse,555-0101`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/admin/employees">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Employees
            </Button>
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Bulk Import Employees
          </h1>
          <p className="text-gray-600 mt-2">Import multiple employees from CSV or Excel file</p>
        </motion.div>

        {/* Template Download */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6 border-indigo-200 bg-indigo-50/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Download className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Download Templates</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Start with our templates to ensure proper formatting
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a href="/templates/employee-import-template.csv" download>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Employee Import Template
                      </Button>
                    </a>
                    <a href="/templates/departments-and-job-titles-reference.csv" download>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Job Titles Reference (110+ titles)
                      </Button>
                    </a>
                    <Button variant="outline" size="sm" onClick={async () => {
                      try {
                        const response = await fetch('/api/admin/departments');
                        const data = await response.json();
                        if (data.success && data.data) {
                          const csvContent = 'Department Name,Department ID\n' +
                            data.data.map((d: any) => `${d.name},${d.id}`).join('\n');
                          const blob = new Blob([csvContent], { type: 'text/csv' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'departments.csv';
                          a.click();
                          window.URL.revokeObjectURL(url);
                        }
                      } catch (error) {
                        console.error('Failed to download departments:', error);
                      }
                    }}>
                      <Download className="w-4 h-4 mr-2" />
                      Departments List
                    </Button>
                  </div>
                  <div className="mt-3 p-3 bg-white rounded-lg border border-indigo-200">
                    <p className="text-xs text-gray-600 mb-1">
                      <strong>Templates included:</strong>
                    </p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• <strong>Employee Import Template:</strong> Uses department names (easier!)</li>
                      <li>• <strong>Job Titles Reference:</strong> 110+ titles across 12 departments</li>
                      <li>• <strong>Departments List:</strong> Your organization's departments</li>
                    </ul>
                    <p className="text-xs text-indigo-700 mt-2 font-medium">
                      💡 Tip: Use department names like "Engineering" instead of UUIDs
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* File Upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Upload Employee Data</CardTitle>
              <CardDescription>
                Upload a CSV or Excel file containing employee information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  dragActive
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-300 hover:border-purple-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={loading}
                />

                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">
                      {file ? file.name : 'Drop your file here, or click to browse'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">CSV or Excel files up to 10MB</p>
                  </div>
                  {file && (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">File selected</span>
                    </div>
                  )}
                </div>
              </div>

              {file && !result && (
                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setFile(null)} disabled={loading}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import Employees
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Import Results */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6"
          >
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="w-6 h-6" />
                  Import Successful!
                </CardTitle>
                <CardDescription>
                  Successfully imported {result.imported} employee(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.employees.map((emp, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200"
                    >
                      <Users className="w-5 h-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium">{emp.name}</p>
                        <p className="text-sm text-gray-600">
                          {emp.email} • {emp.employeeNumber}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                      setResult(null);
                    }}
                  >
                    Import More
                  </Button>
                  <Link href="/admin/employees">
                    <Button className="bg-green-600 hover:bg-green-700">View All Employees</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
