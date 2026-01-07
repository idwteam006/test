'use client';

import { useState, useEffect, useRef } from 'react';
import { X, DollarSign, FileText, Upload, Trash2, Eye, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  DESCRIPTION_MIN_LENGTH,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  EXPENSE_CATEGORIES,
} from '@/lib/expense-constants';
import { safeOpenUrl } from '@/lib/url-utils';

interface ExpenseFormData {
  title: string;
  category: string;
  amount: string;
  currency: string;
  expenseDate: string;
  description: string;
  tags: string[];
  receiptUrls: string[];
}

// Type for expense object when editing
interface Expense {
  id: string;
  claimNumber: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  expenseDate: string;
  status: string;
  description: string;
  receiptUrls?: string[];
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  notes?: string;
  tags?: string[];
}

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expense?: Expense | null;
  initialDate?: Date | null;
  allowFutureExpenses?: boolean;
}

// Use centralized categories from constants
const categories = EXPENSE_CATEGORIES;

const getInitialFormData = (): ExpenseFormData => ({
  title: '',
  category: 'TRAVEL',
  amount: '',
  currency: 'USD',
  expenseDate: format(new Date(), 'yyyy-MM-dd'),
  description: '',
  tags: [],
  receiptUrls: [],
});

export default function ExpenseFormModal({
  isOpen,
  onClose,
  onSuccess,
  expense,
  initialDate,
  allowFutureExpenses = false,
}: ExpenseFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ExpenseFormData>(getInitialFormData());

  // Reset form when modal opens/closes or expense changes
  useEffect(() => {
    if (isOpen) {
      if (expense) {
        // Editing existing expense
        // Extract date string without timezone conversion
        const expenseDateStr = expense.expenseDate || '';
        const dateStr = expenseDateStr.includes('T')
          ? expenseDateStr.split('T')[0]
          : expenseDateStr;
        setFormData({
          title: expense.title || '',
          category: expense.category || 'TRAVEL',
          amount: expense.amount?.toString() || '',
          currency: expense.currency || 'USD',
          expenseDate: dateStr || format(new Date(), 'yyyy-MM-dd'),
          description: expense.description || '',
          tags: expense.tags || [],
          receiptUrls: expense.receiptUrls || [],
        });
      } else {
        // Creating new expense - use initialDate if provided, otherwise today
        const dateToUse = initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
        setFormData({
          ...getInitialFormData(),
          expenseDate: dateToUse,
        });
      }
    }
  }, [isOpen, expense, initialDate]);

  // Handle modal close with form reset
  const handleClose = () => {
    setFormData(getInitialFormData());
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file size using centralized constant
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} is too large. Maximum size is 10MB`);
          continue;
        }

        // Validate file type using centralized constant
        if (!ALLOWED_FILE_TYPES.includes(file.type as typeof ALLOWED_FILE_TYPES[number])) {
          toast.error(`${file.name} is not a supported file type`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'RECEIPT');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          uploadedUrls.push(data.data.fileUrl);
          toast.success(`${file.name} uploaded successfully`);
        } else {
          throw new Error(data.error || 'Upload failed');
        }
      }

      // Add uploaded URLs to form data
      setFormData((prev) => ({
        ...prev,
        receiptUrls: [...prev.receiptUrls, ...uploadedUrls],
      }));
    } catch (error: any) {
      console.error('File upload error:', error);
      toast.error(error.message || 'Failed to upload receipt');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveReceipt = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      receiptUrls: prev.receiptUrls.filter((_, i) => i !== index),
    }));
    toast.success('Receipt removed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.amount || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    // Validate expense date is not in the future (unless allowed by tenant settings)
    const expenseDate = new Date(formData.expenseDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (expenseDate > today && !allowFutureExpenses) {
      toast.error('Expense date cannot be in the future');
      return;
    }

    // Validate description minimum length using centralized constant
    if (formData.description.length < DESCRIPTION_MIN_LENGTH) {
      toast.error(`Description must be at least ${DESCRIPTION_MIN_LENGTH} characters`);
      return;
    }

    setLoading(true);

    try {
      const url = expense
        ? `/api/employee/expenses/${expense.id}`
        : '/api/employee/expenses';

      const method = expense ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(expense ? 'Expense updated successfully' : 'Expense created successfully');
        onSuccess();
        handleClose();
      } else if (response.status === 409 && data.duplicate) {
        // Handle duplicate expense detection
        toast.error(
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Duplicate expense detected</span>
            </div>
            <p className="text-xs text-slate-600">
              A similar expense (#{data.existingExpense?.claimNumber}) already exists for this date, amount, and category.
            </p>
          </div>,
          { duration: 6000 }
        );
      } else {
        throw new Error(data.error || 'Failed to save expense');
      }
    } catch (error) {
      console.error('Save expense error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save expense';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              {expense ? 'Edit Expense' : 'New Expense Claim'}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Client Meeting - San Francisco"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="expenseDate">Date *</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={formData.expenseDate}
                  max={allowFutureExpenses ? undefined : format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  {allowFutureExpenses ? 'Select any date' : 'Cannot be a future date'}
                </p>
              </div>

              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description * (Min 10 characters)</Label>
              <Textarea
                id="description"
                placeholder="Describe the expense in detail..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                required
                minLength={10}
              />
              <p className="text-xs text-slate-500 mt-1">{formData.description.length} characters</p>
            </div>

            {/* Receipt Upload */}
            <div>
              <Label>
                Receipt(s) <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <div className="space-y-3 mt-1">
                {/* Upload button */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || loading}
                    className="w-full border-dashed"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Receipt(s)
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-slate-500 mt-1">
                    Accepted: JPG, PNG, WebP, PDF (Max 10MB each)
                  </p>
                </div>

                {/* Uploaded receipts list */}
                {formData.receiptUrls.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">
                      Uploaded Receipts ({formData.receiptUrls.length})
                    </p>
                    {formData.receiptUrls.map((url, index) => {
                      const fileName = url.split('/').pop() || 'receipt';
                      const isPdf = url.toLowerCase().endsWith('.pdf');

                      return (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200"
                        >
                          <FileText className={`h-4 w-4 ${isPdf ? 'text-red-600' : 'text-blue-600'}`} />
                          <span className="flex-1 text-sm text-slate-700 truncate">
                            {fileName}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => safeOpenUrl(url)}
                            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700"
                            title="View receipt"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveReceipt(index)}
                            disabled={loading}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                            title="Remove receipt"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    {expense ? 'Update Expense' : 'Create Expense'}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
