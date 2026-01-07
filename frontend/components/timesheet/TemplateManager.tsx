'use client';

import { useState, useEffect } from 'react';
import { Save, Trash2, FileText, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  hoursWorked: number;
  description: string;
  activityType: string;
  isBillable: boolean;
  projectId?: string;
  taskId?: string;
  isRecurring: boolean;
  createdAt: string;
}

interface TemplateManagerProps {
  onApplyTemplate: (template: Template) => void;
}

export default function TemplateManager({ onApplyTemplate }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/employee/timesheets/templates');
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (templateData: Partial<Template>) => {
    if (!newTemplateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    try {
      const response = await fetch('/api/employee/timesheets/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName,
          ...templateData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Template saved successfully!');
        setShowSaveForm(false);
        setNewTemplateName('');
        fetchTemplates();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to save template:', error);
      toast.error(error.message || 'Failed to save template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;

    try {
      const response = await fetch(`/api/employee/timesheets/templates/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Template deleted');
        fetchTemplates();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to delete template:', error);
      toast.error(error.message || 'Failed to delete template');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-purple-600" />
          Quick Templates
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-slate-600">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-slate-600">
            <FileText className="h-12 w-12 mx-auto mb-2 text-slate-400" />
            <p>No templates yet</p>
            <p className="text-sm">Save frequently used entries as templates</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-purple-300 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900">{template.name}</h4>
                    {template.isRecurring && (
                      <Badge variant="outline" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Recurring
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-1">{template.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500">{template.hoursWorked}h</span>
                    <span className="text-xs text-slate-500">{template.activityType}</span>
                    {template.isBillable && (
                      <Badge variant="outline" className="text-xs bg-green-50">
                        Billable
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onApplyTemplate(template)}
                    className="text-purple-600 hover:text-purple-700"
                  >
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => setShowSaveForm(!showSaveForm)}
        >
          <Save className="h-4 w-4 mr-2" />
          {showSaveForm ? 'Cancel' : 'Save Current Entry as Template'}
        </Button>

        {showSaveForm && (
          <div className="mt-4 p-4 border border-purple-200 rounded-lg bg-purple-50">
            <Label htmlFor="templateName">Template Name</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="templateName"
                placeholder="e.g., Daily Standup"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
              <Button
                size="sm"
                onClick={() =>
                  handleSaveTemplate({
                    hoursWorked: 8,
                    description: 'Template description',
                    activityType: 'Development',
                    isBillable: true,
                  })
                }
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
