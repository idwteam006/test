'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Send,
  Loader2,
  Building2,
  FolderKanban,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

interface Client {
  id: string;
  companyName: string;
  contactEmail: string;
  currency?: string;
}

interface Project {
  id: string;
  name: string;
  clientId: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingAction, setSendingAction] = useState<'draft' | 'send' | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);

  // Form state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState('NET_30');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 },
  ]);

  // Tax settings
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState(18); // Default GST rate

  // Payment terms options
  const paymentTermsOptions = [
    { value: 'NET_15', label: 'Net 15 days', days: 15 },
    { value: 'NET_30', label: 'Net 30 days', days: 30 },
    { value: 'NET_45', label: 'Net 45 days', days: 45 },
    { value: 'NET_60', label: 'Net 60 days', days: 60 },
    { value: 'NET_90', label: 'Net 90 days', days: 90 },
    { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt', days: 0 },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      const clientProjects = projects.filter(p => p.clientId === selectedClientId);
      setFilteredProjects(clientProjects);
      // Reset project selection if current project doesn't belong to selected client
      if (selectedProjectId && !clientProjects.find(p => p.id === selectedProjectId)) {
        setSelectedProjectId('');
      }
    } else {
      setFilteredProjects([]);
      setSelectedProjectId('');
    }
  }, [selectedClientId, projects]);

  // Update due date when payment terms or issue date changes
  useEffect(() => {
    const selectedTerm = paymentTermsOptions.find(term => term.value === paymentTerms);
    if (selectedTerm && issueDate) {
      const issueDateObj = new Date(issueDate);
      const dueDateObj = new Date(issueDateObj);
      dueDateObj.setDate(dueDateObj.getDate() + selectedTerm.days);
      setDueDate(dueDateObj.toISOString().split('T')[0]);
    }
  }, [paymentTerms, issueDate]);

  const fetchData = async () => {
    try {
      const [clientsRes, projectsRes] = await Promise.all([
        fetch('/api/clients/list'),
        fetch('/api/projects/list'),
      ]);

      const clientsData = await clientsRes.json();
      const projectsData = await projectsRes.json();

      console.log('Clients API Response:', clientsData);
      console.log('Projects API Response:', projectsData);

      if (clientsData.success) {
        setClients(clientsData.clients || []);
        console.log('Loaded clients:', clientsData.clients?.length || 0);
      } else {
        console.error('Failed to fetch clients:', clientsData.error);
        toast.error(clientsData.error || 'Failed to load clients');
      }

      if (projectsData.success) {
        setProjects(projectsData.projects || []);
        console.log('Loaded projects:', projectsData.projects?.length || 0);
      } else {
        console.error('Failed to fetch projects:', projectsData.error);
        toast.error(projectsData.error || 'Failed to load projects');
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load clients and projects');
    } finally {
      setLoading(false);
    }
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) {
      toast.error('Invoice must have at least one line item');
      return;
    }
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(
      lineItems.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Recalculate total
          if (field === 'quantity' || field === 'unitPrice') {
            updated.total = updated.quantity * updated.unitPrice;
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = taxEnabled ? (subtotal * taxRate) / 100 : 0;
  const total = subtotal + taxAmount;

  const validateForm = () => {
    if (!selectedClientId) {
      toast.error('Please select a client');
      return false;
    }

    if (lineItems.length === 0) {
      toast.error('Please add at least one line item');
      return false;
    }

    const hasEmptyItems = lineItems.some(
      item => !item.description.trim() || item.quantity <= 0 || item.unitPrice <= 0
    );

    if (hasEmptyItems) {
      toast.error('Please fill in all line item details');
      return false;
    }

    if (new Date(dueDate) < new Date(issueDate)) {
      toast.error('Due date cannot be before issue date');
      return false;
    }

    return true;
  };

  const handleSave = async (sendImmediately: boolean = false) => {
    if (!validateForm()) return;

    setSaving(true);
    setSendingAction(sendImmediately ? 'send' : 'draft');

    try {
      const payload = {
        clientId: selectedClientId,
        projectId: selectedProjectId || null,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        paymentTerms,
        notes,
        taxEnabled,
        taxRate: taxEnabled ? taxRate : 0,
        lineItems: lineItems.map(item => ({
          description: item.description,
          hours: item.quantity,
          rate: item.unitPrice,
          amount: item.total,
        })),
      };

      console.log('[Invoice] Creating invoice with payload:', payload);

      // Create invoice
      const response = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      console.log('[Invoice] API response:', { status: response.status, data });

      if (response.ok && data.success) {
        toast.success('Invoice created successfully!');

        // If user wants to send immediately
        if (sendImmediately) {
          const sendResponse = await fetch(`/api/admin/invoices/${data.invoice.id}/send`, {
            method: 'POST',
          });

          const sendData = await sendResponse.json();

          if (sendData.success) {
            toast.success(sendData.message || 'Invoice sent successfully!');
          } else {
            toast.warning('Invoice created but failed to send: ' + (sendData.error || 'Unknown error'));
          }
        }

        // Redirect to invoices list
        router.push('/admin/invoices');
      } else {
        const errorMsg = data.error || 'Failed to create invoice';
        console.error('[Invoice] Failed to create invoice:', errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('[Invoice] Error creating invoice:', error);
      toast.error('Failed to create invoice: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
      setSendingAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push('/admin/invoices')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Create New Invoice
                </h1>
                <p className="text-gray-600 mt-2">Generate an invoice for your client</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Client & Project Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Client & Project Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="client">Client *</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger id="client">
                      <SelectValue placeholder={clients.length === 0 ? "No clients available" : "Select a client"} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.length === 0 ? (
                        <div className="px-2 py-6 text-center text-sm text-slate-500">
                          No clients found. Please create a client first.
                        </div>
                      ) : (
                        clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.companyName} ({client.contactEmail})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {clients.length === 0 && (
                    <p className="mt-2 text-sm text-amber-600">
                      No clients available. Please create a client from the Clients page first.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="project">Project (Optional)</Label>
                  <Select
                    value={selectedProjectId || 'none'}
                    onValueChange={(value) => setSelectedProjectId(value === 'none' ? '' : value)}
                    disabled={!selectedClientId || filteredProjects.length === 0}
                  >
                    <SelectTrigger id="project">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {filteredProjects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="paymentTerms">Payment Terms *</Label>
                  <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                    <SelectTrigger id="paymentTerms">
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTermsOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="issueDate">Issue Date *</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      value={issueDate}
                      onChange={e => setIssueDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date *</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Auto-calculated based on payment terms
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Line Items</CardTitle>
                  <Button onClick={addLineItem} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">
                        Item #{index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(item.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div>
                      <Label>Description *</Label>
                      <Input
                        placeholder="Describe the service or product"
                        value={item.description}
                        onChange={e =>
                          updateLineItem(item.id, 'description', e.target.value)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={e =>
                            updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div>
                        <Label>Unit Price *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={e =>
                            updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div>
                        <Label>Total</Label>
                        <Input
                          type="number"
                          value={item.total.toFixed(2)}
                          disabled
                          className="bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes & Payment Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Add any additional notes, payment instructions, or terms..."
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Summary Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>

                  {/* Tax Toggle */}
                  <div className="p-3 bg-slate-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="taxEnabled" className="text-sm font-medium cursor-pointer">
                        Apply Tax
                      </Label>
                      <Switch
                        id="taxEnabled"
                        checked={taxEnabled}
                        onCheckedChange={setTaxEnabled}
                      />
                    </div>

                    {taxEnabled && (
                      <div className="space-y-2">
                        <Label htmlFor="taxRate" className="text-xs text-slate-500">
                          Tax Rate (%)
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="taxRate"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={taxRate}
                            onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm"
                          />
                          <span className="text-sm text-slate-500">%</span>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {[5, 12, 18, 28].map((rate) => (
                            <Button
                              key={rate}
                              type="button"
                              variant={taxRate === rate ? 'default' : 'outline'}
                              size="sm"
                              className={`h-6 text-xs px-2 ${taxRate === rate ? 'bg-purple-600' : ''}`}
                              onClick={() => setTaxRate(rate)}
                            >
                              {rate}%
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {taxEnabled && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Tax ({taxRate}%)</span>
                      <span className="font-medium">${taxAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <div className="flex justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="text-2xl font-bold text-purple-600">
                        ${total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <Button
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {sendingAction === 'draft' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save as Draft
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    variant="outline"
                    className="w-full"
                  >
                    {sendingAction === 'send' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Save & Send
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-slate-500 text-center">
                  Invoice will be saved as draft and can be sent later
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
