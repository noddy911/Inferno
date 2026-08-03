'use client';

import { useState, useEffect } from 'react';
import { Settings, Shield, Hammer, Calculator, FileText, Loader2, Save } from 'lucide-react';
import { apiRequest } from '@/services/api-client';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Settings structure matching DEFAULT_SETTINGS in backend
  const [settings, setSettings] = useState({
    companyName: 'ACME Interiors',
    address: '101 Suite, Panvel, India',
    phone: '+91 99999 88888',
    email: 'contact@acmeinteriors.com',
    gstNumber: '27AAAAA1111A1Z1',
    logo: '',
    profitMargin: 25,
    kerf: 3,
    sheetSizes: [],
    manufacturingRates: {
      cutting: 150,
      cnc: 1200,
      drilling: 20,
      assembly: 1500,
      painting: 80,
      polishing: 120,
    },
    labourRates: {
      carpenter: 1200,
      painter: 900,
      electrician: 1000,
      plumber: 1000,
      helper: 600,
    },
    taxes: {
      outputGstRate: 18,
    },
  });

  useEffect(() => {
    apiRequest('/settings')
      .then((data) => {
        if (data) setSettings(data);
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load settings');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/settings', {
        method: 'PUT',
        body: settings,
      });
      toast.success('Pricing and company settings saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSubmitting(false);
    }
  };

  const updateSetting = (section, key, val) => {
    if (section) {
      setSettings((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [key]: val,
        },
      }));
    } else {
      setSettings((prev) => ({
        ...prev,
        [key]: val,
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            <span>Settings &amp; Pricing Rules</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure company branding, global profit margins, manufacturing rates, and trade labour daily wages.
          </p>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-105 transition-all active:scale-95 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>Save Changes</span>
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Navigation Sidebar (Left) */}
        <div className="md:col-span-3 space-y-1">
          {[
            { id: 'company', label: 'Company Profile', icon: Shield },
            { id: 'nesting', label: 'Engine & Margins', icon: Calculator },
            { id: 'mfg', label: 'Manufacturing Rates', icon: Hammer },
            { id: 'labour', label: 'Labour Day Rates', icon: FileText },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 rounded-md px-3.5 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Content (Right) */}
        <div className="md:col-span-9 rounded-xl border bg-card p-6 shadow-sm min-h-[300px]">
          {/* TAB 1: Company Profile */}
          {activeTab === 'company' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold border-b pb-2">Company Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.companyName}
                    onChange={(e) => updateSetting(null, 'companyName', e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/25"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    GSTIN / Tax Registration
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.gstNumber}
                    onChange={(e) => updateSetting(null, 'gstNumber', e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/25"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.phone}
                    onChange={(e) => updateSetting(null, 'phone', e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/25"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={settings.email}
                    onChange={(e) => updateSetting(null, 'email', e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/25"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Office Address
                </label>
                <input
                  type="text"
                  required
                  value={settings.address}
                  onChange={(e) => updateSetting(null, 'address', e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/25"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Logo URL
                </label>
                <input
                  type="text"
                  value={settings.logo || ''}
                  onChange={(e) => updateSetting(null, 'logo', e.target.value)}
                  placeholder="https://acme.com/logo.png"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/25"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Nesting & Margins */}
          {activeTab === 'nesting' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold border-b pb-2">Engine Optimization &amp; Margins</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Default Profit Margin (%)
                  </label>
                  <input
                    type="number"
                    required
                    value={settings.profitMargin}
                    onChange={(e) => updateSetting(null, 'profitMargin', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/25"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Optimizer Kerf Width (mm)
                  </label>
                  <input
                    type="number"
                    required
                    value={settings.kerf}
                    onChange={(e) => updateSetting(null, 'kerf', parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/25"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Output GST Rate (%)
                  </label>
                  <input
                    type="number"
                    required
                    value={settings.taxes?.outputGstRate ?? 18}
                    onChange={(e) => updateSetting('taxes', 'outputGstRate', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/25"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Manufacturing Rates */}
          {activeTab === 'mfg' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold border-b pb-2">Manufacturing &amp; Machine Rates</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Board Sheet Cut (₹ / sheet)
                  </label>
                  <input
                    type="number"
                    required
                    value={settings.manufacturingRates?.cutting}
                    onChange={(e) =>
                      updateSetting('manufacturingRates', 'cutting', parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    CNC Routing (₹ / sheet)
                  </label>
                  <input
                    type="number"
                    required
                    value={settings.manufacturingRates?.cnc}
                    onChange={(e) =>
                      updateSetting('manufacturingRates', 'cnc', parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Drilling Hole (₹ / hole)
                  </label>
                  <input
                    type="number"
                    required
                    value={settings.manufacturingRates?.drilling}
                    onChange={(e) =>
                      updateSetting('manufacturingRates', 'drilling', parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Unit Assembly (₹ / unit)
                  </label>
                  <input
                    type="number"
                    required
                    value={settings.manufacturingRates?.assembly}
                    onChange={(e) =>
                      updateSetting('manufacturingRates', 'assembly', parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Painting / PU (₹ / sqft)
                  </label>
                  <input
                    type="number"
                    required
                    value={settings.manufacturingRates?.painting}
                    onChange={(e) =>
                      updateSetting('manufacturingRates', 'painting', parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Polishing (₹ / sqft)
                  </label>
                  <input
                    type="number"
                    required
                    value={settings.manufacturingRates?.polishing}
                    onChange={(e) =>
                      updateSetting('manufacturingRates', 'polishing', parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Labour Day Rates */}
          {activeTab === 'labour' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold border-b pb-2">Trade Labour Daily Rates</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Carpenter (₹ / day)
                  </label>
                  <input
                    type="number"
                    required
                    value={settings.labourRates?.carpenter}
                    onChange={(e) =>
                      updateSetting('labourRates', 'carpenter', parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Painter (₹ / day)
                  </label>
                  <input
                    type="number"
                    required
                    value={settings.labourRates?.painter}
                    onChange={(e) =>
                      updateSetting('labourRates', 'painter', parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Electrician (₹ / day)
                  </label>
                  <input
                    type="number"
                    required
                    value={settings.labourRates?.electrician}
                    onChange={(e) =>
                      updateSetting('labourRates', 'electrician', parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Plumber (₹ / day)
                  </label>
                  <input
                    type="number"
                    required
                    value={settings.labourRates?.plumber}
                    onChange={(e) =>
                      updateSetting('labourRates', 'plumber', parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Helper (₹ / day)
                  </label>
                  <input
                    type="number"
                    required
                    value={settings.labourRates?.helper}
                    onChange={(e) => updateSetting('labourRates', 'helper', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
