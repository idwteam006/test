'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface TenantSettings {
  currency: string;
  companyName: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
}

interface TenantContextType {
  settings: TenantSettings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  settings: null,
  loading: true,
  refreshSettings: async () => {},
});

export function useTenant() {
  return useContext(TenantContext);
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();

      if (data.success) {
        setSettings({
          currency: data.settings.currency || 'USD',
          companyName: data.settings.companyName,
          timezone: data.settings.timezone,
          dateFormat: data.settings.dateFormat,
          timeFormat: data.settings.timeFormat,
        });
      }
    } catch (error) {
      console.error('Failed to fetch tenant settings:', error);
      // Set defaults on error
      setSettings({
        currency: 'USD',
        companyName: 'Company',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <TenantContext.Provider
      value={{
        settings,
        loading,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}
