'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Laptop,
  Smartphone,
  Monitor,
  Headphones,
  Keyboard,
  FileText,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Asset {
  id: string;
  name: string;
  type: 'LAPTOP' | 'MONITOR' | 'PHONE' | 'HEADSET' | 'KEYBOARD' | 'OTHER';
  serialNumber: string;
  status: 'ASSIGNED' | 'IN_USE' | 'MAINTENANCE' | 'RETURNED';
  assignedDate: string;
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_REPAIR';
  location: string;
  notes?: string;
}

const assetIcons = {
  LAPTOP: Laptop,
  MONITOR: Monitor,
  PHONE: Smartphone,
  HEADSET: Headphones,
  KEYBOARD: Keyboard,
  OTHER: Package,
};

const statusColors = {
  ASSIGNED: 'bg-blue-500',
  IN_USE: 'bg-green-500',
  MAINTENANCE: 'bg-orange-500',
  RETURNED: 'bg-slate-500',
};

const conditionColors = {
  EXCELLENT: 'text-green-600 bg-green-50',
  GOOD: 'text-blue-600 bg-blue-50',
  FAIR: 'text-orange-600 bg-orange-50',
  NEEDS_REPAIR: 'text-red-600 bg-red-50',
};

export default function EmployeeAssetsPage() {
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([
    {
      id: '1',
      name: 'MacBook Pro 16"',
      type: 'LAPTOP',
      serialNumber: 'MBP-2023-12345',
      status: 'IN_USE',
      assignedDate: '2024-01-15',
      condition: 'EXCELLENT',
      location: 'Remote - Home Office',
      notes: 'Primary work laptop with 32GB RAM, 1TB SSD',
    },
    {
      id: '2',
      name: 'Dell UltraSharp 27" Monitor',
      type: 'MONITOR',
      serialNumber: 'MON-DELL-67890',
      status: 'IN_USE',
      assignedDate: '2024-01-15',
      condition: 'GOOD',
      location: 'Remote - Home Office',
    },
    {
      id: '3',
      name: 'iPhone 14 Pro',
      type: 'PHONE',
      serialNumber: 'IPH-14-54321',
      status: 'IN_USE',
      assignedDate: '2024-02-01',
      condition: 'EXCELLENT',
      location: 'Mobile',
      notes: 'Company phone for business communications',
    },
    {
      id: '4',
      name: 'Sony WH-1000XM5 Headphones',
      type: 'HEADSET',
      serialNumber: 'HEAD-SONY-99887',
      status: 'IN_USE',
      assignedDate: '2024-01-20',
      condition: 'GOOD',
      location: 'Remote - Home Office',
    },
    {
      id: '5',
      name: 'Magic Keyboard',
      type: 'KEYBOARD',
      serialNumber: 'KEY-APPLE-11223',
      status: 'ASSIGNED',
      assignedDate: '2024-01-15',
      condition: 'FAIR',
      location: 'Remote - Home Office',
      notes: 'Wireless keyboard, batteries need replacement',
    },
  ]);

  const stats = {
    total: assets.length,
    inUse: assets.filter(a => a.status === 'IN_USE').length,
    maintenance: assets.filter(a => a.status === 'MAINTENANCE').length,
    excellent: assets.filter(a => a.condition === 'EXCELLENT').length,
  };

  const handleReportIssue = (assetId: string) => {
    toast.info('Coming Soon', {
      description: 'Report issue functionality is under development',
    });
  };

  const handleRequestAsset = () => {
    toast.info('Coming Soon', {
      description: 'Request asset functionality is under development',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            My Assets
          </h1>
          <p className="text-slate-600 mt-2">
            Manage and track your assigned company assets
          </p>
        </div>
        <Button
          onClick={handleRequestAsset}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          <Package className="h-4 w-4 mr-2" />
          Request Asset
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-purple-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-purple-600">{stats.total}</div>
              <Package className="h-8 w-8 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">In Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-green-600">{stats.inUse}</div>
              <CheckCircle className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-orange-600">{stats.maintenance}</div>
              <AlertCircle className="h-8 w-8 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Excellent Condition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-blue-600">{stats.excellent}</div>
              <CheckCircle className="h-8 w-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assets List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            Assigned Assets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assets.map((asset) => {
              const Icon = assetIcons[asset.type];
              return (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <Icon className="h-8 w-8 text-purple-600" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">{asset.name}</h3>
                        <Badge className={`${statusColors[asset.status]} text-white`}>
                          {asset.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={conditionColors[asset.condition]}>
                          {asset.condition.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600 mb-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>Serial: {asset.serialNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Assigned: {new Date(asset.assignedDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>Location: {asset.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span>Type: {asset.type}</span>
                        </div>
                      </div>

                      {asset.notes && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-slate-700">
                          <p className="font-medium text-blue-900 mb-1">Notes:</p>
                          <p>{asset.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleReportIssue(asset.id)}
                        variant="outline"
                        size="sm"
                        className="border-orange-600 text-orange-600 hover:bg-orange-50"
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Report Issue
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
