'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, Download, FileText, CheckCircle, XCircle, AlertCircle, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { downloadCSVTemplate, parseCSV, validateCSVFile, formatBulkInviteErrors } from '@/lib/csv-helpers';

// Function to download departments as CSV
async function downloadDepartmentsCSV(): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/departments');
    const data = await response.json();

    if (data.success && data.data) {
      const csvContent = 'Department Name\n' +
        data.data.map((d: { name: string }) => d.name).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `departments-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to download departments:', error);
    return false;
  }
}

interface BulkInviteResult {
  summary: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  details: {
    successful: Array<{ row: number; email: string; employeeId: string }>;
    skipped: Array<{ row: number; email: string; reason: string }>;
    failed: Array<{ row: number; email: string; error: string }>;
  };
}

export default function ImportEmployeesPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkInviteResult | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validation = validateCSVFile(selectedFile);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setFile(selectedFile);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a CSV file first');
      return;
    }

    setUploading(true);

    try {
      // Read CSV file
      const csvText = await file.text();

      // Parse CSV
      const employees = parseCSV(csvText);

      if (employees.length === 0) {
        toast.error('CSV file is empty');
        setUploading(false);
        return;
      }

      if (employees.length > 100) {
        toast.error('Maximum 100 employees per upload');
        setUploading(false);
        return;
      }

      // Send to API
      const response = await fetch('/api/hr/bulk-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        toast.success(data.message);
      } else {
        if (data.invalidRows) {
          const errorText = formatBulkInviteErrors(data.invalidRows);
          toast.error(`Validation failed:\n${errorText.substring(0, 200)}...`);
        } else if (data.duplicates) {
          toast.error(`Duplicate emails in CSV: ${data.duplicates.join(', ')}`);
        } else {
          toast.error(data.error || 'Bulk import failed');
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadCSVTemplate();
    toast.success('Template downloaded successfully');
  };

  const handleDownloadDepartments = async () => {
    const success = await downloadDepartmentsCSV();
    if (success) {
      toast.success('Departments list downloaded successfully');
    } else {
      toast.error('Failed to download departments list');
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push('/hr/employees')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Employees
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Import Employees</CardTitle>
                  <CardDescription className="text-purple-100">
                    Upload a CSV file to invite multiple employees at once (max 100 per upload)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Instructions */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
                <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                  <li>Download the CSV template and Departments list below</li>
                  <li>Fill in employee details (use department names from the list)</li>
                  <li>Save as CSV format</li>
                  <li>Upload the file to send onboarding invites</li>
                </ol>
              </div>

              {/* Download Templates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CSV Template */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="font-medium">CSV Template</p>
                      <p className="text-sm text-muted-foreground">
                        Template with example data
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleDownloadTemplate}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>

                {/* Departments List */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-indigo-600" />
                    <div>
                      <p className="font-medium">Departments List</p>
                      <p className="text-sm text-muted-foreground">
                        Available department names
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleDownloadDepartments}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>

              {/* File Upload */}
              {!result && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">
                      {file ? (
                        <span className="text-green-600 font-medium">
                          ✓ {file.name} ({(file.size / 1024).toFixed(2)} KB)
                        </span>
                      ) : (
                        'Select a CSV file to upload'
                      )}
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label htmlFor="csv-upload">
                      <Button variant="outline" asChild>
                        <span>
                          <Upload className="mr-2 h-4 w-4" />
                          Choose File
                        </span>
                      </Button>
                    </label>
                  </div>

                  {file && (
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleReset}
                        disabled={uploading}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                        onClick={handleUpload}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Import & Send Invites
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Results */}
              {result && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-2">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{result.summary.total}</p>
                          <p className="text-sm text-muted-foreground">Total</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-green-200 bg-green-50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <CheckCircle className="mx-auto h-8 w-8 text-green-600 mb-2" />
                          <p className="text-2xl font-bold text-green-700">{result.summary.successful}</p>
                          <p className="text-sm text-green-600">Successful</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-yellow-200 bg-yellow-50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <AlertCircle className="mx-auto h-8 w-8 text-yellow-600 mb-2" />
                          <p className="text-2xl font-bold text-yellow-700">{result.summary.skipped}</p>
                          <p className="text-sm text-yellow-600">Skipped</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-red-200 bg-red-50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <XCircle className="mx-auto h-8 w-8 text-red-600 mb-2" />
                          <p className="text-2xl font-bold text-red-700">{result.summary.failed}</p>
                          <p className="text-sm text-red-600">Failed</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detailed Results */}
                  <div className="space-y-3">
                    {result.details.successful.length > 0 && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="font-semibold text-green-900 mb-2">
                          ✓ Successfully Invited ({result.details.successful.length})
                        </h4>
                        <div className="space-y-1 text-sm text-green-800 max-h-48 overflow-y-auto">
                          {result.details.successful.map((item) => (
                            <div key={item.row}>
                              Row {item.row}: {item.email} → {item.employeeId}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.details.skipped.length > 0 && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h4 className="font-semibold text-yellow-900 mb-2">
                          ⚠ Skipped ({result.details.skipped.length})
                        </h4>
                        <div className="space-y-1 text-sm text-yellow-800 max-h-48 overflow-y-auto">
                          {result.details.skipped.map((item) => (
                            <div key={item.row}>
                              Row {item.row}: {item.email} - {item.reason}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.details.failed.length > 0 && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <h4 className="font-semibold text-red-900 mb-2">
                          ✗ Failed ({result.details.failed.length})
                        </h4>
                        <div className="space-y-1 text-sm text-red-800 max-h-48 overflow-y-auto">
                          {result.details.failed.map((item) => (
                            <div key={item.row}>
                              Row {item.row}: {item.email} - {item.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleReset}
                    >
                      Import Another File
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                      onClick={() => router.push('/hr/onboarding')}
                    >
                      View Onboarding Dashboard
                    </Button>
                  </div>
                </div>
              )}

              {/* CSV Format Reference */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">CSV Format (9 columns):</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>1. <strong>email</strong> - Business email (required)</p>
                  <p>2. <strong>firstName</strong> - First name (required)</p>
                  <p>3. <strong>lastName</strong> - Last name (required)</p>
                  <p>4. <strong>departmentName</strong> - Department name, e.g. &quot;Engineering&quot; (required)</p>
                  <p>5. <strong>designation</strong> - Job title (required)</p>
                  <p>6. <strong>joiningDate</strong> - Date in DD-MM-YYYY format, e.g. &quot;15-01-2025&quot; (required)</p>
                  <p>7. <strong>managerEmail</strong> - Manager&apos;s email address (optional)</p>
                  <p>8. <strong>employmentType</strong> - FULL_TIME/PART_TIME/CONTRACT/INTERN (optional, defaults to FULL_TIME)</p>
                  <p>9. <strong>workLocation</strong> - Office location (optional)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
