'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  Loader2,
  Building2,
  Briefcase,
  CreditCard,
  MapPin,
  Shield,
  Award,
  Receipt,
  Calendar,
  Printer,
  Eye,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface DocumentType {
  id: string;
  name: string;
  description: string;
  available: boolean;
}

interface Payslip {
  id: string;
  period: string;
  netPay: number;
  processedAt: string;
  paidAt: string | null;
}

interface EmployeeInfo {
  name: string;
  email: string;
  employeeNumber?: string;
  jobTitle?: string;
  department?: string;
  startDate?: string;
}

const DOCUMENT_ICONS: Record<string, any> = {
  employment_verification: Building2,
  salary_certificate: CreditCard,
  experience_letter: Award,
  relieving_letter: FileText,
  bonafide_certificate: Shield,
  address_proof: MapPin,
};

export default function EmployeeDocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [generatingDocument, setGeneratingDocument] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [purposeDialogOpen, setPurposeDialogOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const [purpose, setPurpose] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/employee/documents');
      const data = await response.json();

      if (response.ok && data.success) {
        setDocumentTypes(data.data.documentTypes || []);
        setPayslips(data.data.payslips || []);
        setEmployee(data.data.employee || null);
      } else {
        toast.error(data.error || 'Failed to load documents');
      }
    } catch (error) {
      console.error('Fetch documents error:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDocument = async (type: string, docPurpose?: string) => {
    setGeneratingDocument(type);
    try {
      const response = await fetch('/api/employee/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, purpose: docPurpose }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPreviewContent(data.data.content);
        setPreviewTitle(data.data.title);
        setPreviewOpen(true);
        setPurposeDialogOpen(false);
        setPurpose('');
      } else {
        toast.error(data.error || 'Failed to generate document');
      }
    } catch (error) {
      console.error('Generate document error:', error);
      toast.error('Network error');
    } finally {
      setGeneratingDocument(null);
    }
  };

  const handleRequestDocument = (type: string) => {
    if (type === 'employment_verification' || type === 'bonafide_certificate') {
      setSelectedDocType(type);
      setPurposeDialogOpen(true);
    } else {
      handleGenerateDocument(type);
    }
  };

  const handlePrint = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.print();
    }
  };

  const handleDownload = () => {
    const blob = new Blob([previewContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${previewTitle.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Document downloaded');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
            My Documents
          </h1>
          <p className="text-gray-600 mt-2">Download official letters and payslips</p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Employee Info Card */}
            {employee && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                        {employee.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{employee.name}</h2>
                        <p className="text-purple-100">{employee.jobTitle || 'Employee'}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-purple-200">
                          {employee.employeeNumber && (
                            <span>ID: {employee.employeeNumber}</span>
                          )}
                          {employee.department && (
                            <span>{employee.department}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Document Letters Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Official Letters
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documentTypes.map((doc) => {
                  const Icon = DOCUMENT_ICONS[doc.id] || FileText;
                  return (
                    <Card
                      key={doc.id}
                      className={`transition-all ${doc.available ? 'hover:shadow-lg cursor-pointer' : 'opacity-60'}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${doc.available ? 'bg-purple-100' : 'bg-gray-100'}`}>
                            <Icon className={`w-6 h-6 ${doc.available ? 'text-purple-600' : 'text-gray-400'}`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">{doc.description}</p>
                            {doc.available ? (
                              <Button
                                size="sm"
                                className="mt-3 bg-purple-600 hover:bg-purple-700"
                                onClick={() => handleRequestDocument(doc.id)}
                                disabled={generatingDocument === doc.id}
                              >
                                {generatingDocument === doc.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-4 h-4 mr-2" />
                                    Generate
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Badge variant="outline" className="mt-3 text-gray-500">
                                Not Available
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>

            {/* Payslips Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-purple-600" />
                Payslips
              </h2>
              {payslips.length > 0 ? (
                <div className="grid gap-3">
                  {payslips.map((payslip) => (
                    <Card key={payslip.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <Receipt className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{payslip.period}</h3>
                              <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Processed: {formatDate(payslip.processedAt)}
                                </span>
                                {payslip.paidAt && (
                                  <Badge className="bg-green-100 text-green-700 border-green-200">
                                    Paid
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900">
                                {formatCurrency(payslip.netPay)}
                              </p>
                              <p className="text-xs text-gray-500">Net Pay</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Payslips Available</h3>
                    <p className="text-gray-500">Your payslips will appear here once processed.</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </div>
        )}
      </div>

      {/* Purpose Dialog */}
      <Dialog open={purposeDialogOpen} onOpenChange={setPurposeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Document Purpose</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="purpose">Purpose (optional)</Label>
              <Input
                id="purpose"
                placeholder="e.g., Visa application, Bank loan, etc."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                This will be mentioned in the letter for context.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPurposeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleGenerateDocument(selectedDocType, purpose)}
              disabled={generatingDocument === selectedDocType}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {generatingDocument === selectedDocType ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Letter
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>{previewTitle}</DialogTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-gray-100 rounded-lg">
            <iframe
              ref={iframeRef}
              srcDoc={previewContent}
              className="w-full h-full bg-white"
              title="Document Preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
