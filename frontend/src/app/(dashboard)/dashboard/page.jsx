'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Calendar,
  Briefcase,
  Users,
  HardHat,
  PackageOpen,
  Download,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  FolderKanban,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { apiRequest } from '@/services/api-client';
import { toast } from 'sonner';
import Link from 'next/link';

export default function DashboardPage() {
  const [reportType, setReportType] = useState('sales');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);

  // Filters
  const [from, setFrom] = useState('2026-01-01');
  const [to, setTo] = useState('2026-12-31');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Dropdowns lists
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);

  // Project Hub — recent projects
  const [recentProjects, setRecentProjects] = useState([]);
  const [hubLoading, setHubLoading] = useState(true);

  const STATUS_META = {
    new: { label: 'New', color: 'bg-info/15 text-info' },
    design: { label: 'Design', color: 'bg-primary/15 text-primary' },
    'in-progress': { label: 'In Progress', color: 'bg-warning/15 text-warning' },
    completed: { label: 'Completed', color: 'bg-success/15 text-success' },
    cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground' },
  };

  const fetchDropdowns = async () => {
    try {
      const [clientsList, projectsList] = await Promise.all([
        apiRequest('/clients'),
        apiRequest('/projects'),
      ]);
      setClients(clientsList?.items || []);
      setProjects(projectsList?.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecentProjects = async () => {
    setHubLoading(true);
    try {
      const res = await apiRequest('/projects?pageSize=6');
      setRecentProjects(res?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHubLoading(false);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (from) q.append('from', from);
      if (to) q.append('to', to);
      if (selectedClientId) q.append('clientId', selectedClientId);
      if (selectedProjectId) q.append('projectId', selectedProjectId);
      q.append('groupBy', 'month');

      const data = await apiRequest(`/reports/${reportType}?${q.toString()}`);
      setReportData(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load report analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDropdowns();
    fetchRecentProjects();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [reportType, selectedClientId, selectedProjectId]);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchReport();
  };

  const handleExport = () => {
    const q = new URLSearchParams();
    if (from) q.append('from', from);
    if (to) q.append('to', to);
    if (selectedClientId) q.append('clientId', selectedClientId);
    if (selectedProjectId) q.append('projectId', selectedProjectId);
    q.append('format', 'xlsx');

    window.open(
      `http://localhost:5000/api/v1/reports/${reportType}/export?${q.toString()}`,
      '_blank'
    );
    toast.success('Spreadsheet download triggered!');
  };

  const formatRupees = (paise) => {
    return '₹' + (Number(paise || 0) / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-6">
      {/* Project Hub */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Project Hub</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/clients"
              className="flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              <Users className="h-3 w-3" />
              Clients
            </Link>
            <Link
              href="/projects"
              className="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="h-3 w-3" />
              New Project
            </Link>
            <Link
              href="/projects"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
        {hubLoading ? (
          <div className="flex h-28 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : recentProjects.length === 0 ? (
          <div className="flex h-28 flex-col items-center justify-center gap-1 text-muted-foreground">
            <FolderKanban className="h-7 w-7 opacity-30" />
            <p className="text-xs">No projects yet —{' '}
              <Link href="/projects" className="text-primary hover:underline">create one</Link>
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {recentProjects.map((p) => {
              const meta = STATUS_META[p.status] || STATUS_META.new;
              const clientObj = p.client || p.clientId;
              return (
                <div key={p.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FolderKanban className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.projectName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {clientObj?.name || 'No client'}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${meta.color}`}>
                    {meta.label}
                  </span>
                  <Link
                    href={`/rooms?projectId=${p.id}&projectName=${encodeURIComponent(p.projectName)}`}
                    className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
                    title="View rooms"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Studio Reports &amp; Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Monitor sales cycles, labor hours, profit margins, and material optimization waste metrics.
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105 active:scale-95 transition-all"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Export Excel Sheet</span>
        </button>
      </div>

      {/* Filter Card */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <form onSubmit={handleApplyFilters} className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {/* Start Date */}
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded border bg-background px-3 py-1.5 text-xs"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">
              End Date
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded border bg-background px-3 py-1.5 text-xs"
            />
          </div>

          {/* Client filter */}
          {reportType !== 'material' && (
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                Filter Client
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full rounded border bg-background px-3 py-1.5 text-xs"
              >
                <option value="">All Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Project filter */}
          {reportType !== 'material' && (
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                Filter Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded border bg-background px-3 py-1.5 text-xs"
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded bg-primary text-primary-foreground py-1.5 text-xs font-semibold hover:brightness-105 active:scale-95 transition-all"
            >
              Apply Filter Parameters
            </button>
          </div>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-1 overflow-x-auto text-sm">
        {[
          { id: 'sales', label: 'Sales & Revenue', icon: TrendingUp },
          { id: 'profit', label: 'Profit Margins', icon: Award },
          { id: 'material', label: 'Material Waste', icon: PackageOpen },
          { id: 'labour', label: 'Labour Breakdown', icon: HardHat },
        ].map((tab) => {
          const active = reportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id)}
              className={`pb-2 px-3 border-b-2 font-medium transition-all flex items-center gap-1.5 ${
                active
                  ? 'border-primary text-foreground font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Metrics Banner cards */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !reportData ? (
        <div className="flex h-64 items-center justify-center border border-dashed rounded-xl bg-muted/5">
          <AlertCircle className="h-6 w-6 text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Failed to calculate report metrics.</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Dashboard Summary Metrics Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {reportType === 'sales' && (
              <>
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Proposals Count</div>
                  <div className="text-2xl font-bold mt-1 text-foreground">{reportData.total?.count || 0}</div>
                </div>
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Revenue (Pre-Tax)</div>
                  <div className="text-2xl font-bold mt-1 text-primary">
                    {formatRupees(reportData.total?.revenuePaise)}
                  </div>
                </div>
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">GST Collected</div>
                  <div className="text-2xl font-bold mt-1 text-indigo-500">
                    {formatRupees(reportData.total?.gstPaise)}
                  </div>
                </div>
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Total Contracted</div>
                  <div className="text-2xl font-bold mt-1 text-foreground">
                    {formatRupees(reportData.total?.revenuePaise + reportData.total?.gstPaise)}
                  </div>
                </div>
              </>
            )}

            {reportType === 'profit' && (
              <>
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Revenue</div>
                  <div className="text-2xl font-bold mt-1 text-foreground">
                    {formatRupees(reportData.total?.revenuePaise)}
                  </div>
                </div>
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Production Costs</div>
                  <div className="text-2xl font-bold mt-1 text-destructive">
                    {formatRupees(reportData.total?.costPaise)}
                  </div>
                </div>
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Net Profits</div>
                  <div className="text-2xl font-bold mt-1 text-success">
                    {formatRupees(reportData.total?.profitPaise)}
                  </div>
                </div>
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Margin Efficiency</div>
                  <div className="text-2xl font-bold mt-1 text-primary">
                    {reportData.total?.profitMarginPercent || 0}%
                  </div>
                </div>
              </>
            )}

            {reportType === 'material' && (
              <>
                <div className="rounded-xl border bg-card p-5 shadow-sm col-span-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Total Material Consumed</div>
                  <div className="text-2xl font-bold mt-1 text-primary">
                    {formatRupees(reportData.total?.amountPaise)}
                  </div>
                </div>
                <div className="rounded-xl border bg-card p-5 shadow-sm col-span-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Unique Materials Utilized</div>
                  <div className="text-2xl font-bold mt-1 text-foreground">{reportData.rows?.length || 0} items</div>
                </div>
              </>
            )}

            {reportType === 'labour' && (
              <>
                <div className="rounded-xl border bg-card p-5 shadow-sm col-span-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Total Labour Expenditure</div>
                  <div className="text-2xl font-bold mt-1 text-success">
                    {formatRupees(reportData.total?.labourPaise)}
                  </div>
                </div>
                <div className="rounded-xl border bg-card p-5 shadow-sm col-span-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Active Trades Monitored</div>
                  <div className="text-2xl font-bold mt-1 text-foreground">{reportData.rows?.length || 0} trades</div>
                </div>
              </>
            )}
          </div>

          {/* Breakdown Table */}
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="px-6 py-4 border-b">
              <h3 className="text-sm font-semibold text-foreground">Detailed Items List</h3>
            </div>
            
            {reportData.rows?.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground text-xs">
                No breakdown entries found in selected date bounds.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="border-b bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider">
                    {reportType === 'sales' && (
                      <tr>
                        <th className="px-6 py-3">Reporting Bucket</th>
                        <th className="px-6 py-3">Contracts Signed</th>
                        <th className="px-6 py-3">Taxable Revenue</th>
                        <th className="px-6 py-3">GST Tax Collected</th>
                      </tr>
                    )}
                    {reportType === 'profit' && (
                      <tr>
                        <th className="px-6 py-3">Metric Indicator</th>
                        <th className="px-6 py-3">Value</th>
                      </tr>
                    )}
                    {reportType === 'material' && (
                      <tr>
                        <th className="px-6 py-3">Material Name</th>
                        <th className="px-6 py-3">Category</th>
                        <th className="px-6 py-3">Net Qty</th>
                        <th className="px-6 py-3">Waste Scrap</th>
                        <th className="px-6 py-3">Total Qty</th>
                        <th className="px-6 py-3">Purchased Amount</th>
                      </tr>
                    )}
                    {reportType === 'labour' && (
                      <tr>
                        <th className="px-6 py-3">Trade Specialist</th>
                        <th className="px-6 py-3">Labour Cost Burden</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y text-sm">
                    {reportType === 'sales' &&
                      reportData.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="px-6 py-3 font-semibold">{row.label}</td>
                          <td className="px-6 py-3">{row.count}</td>
                          <td className="px-6 py-3 font-mono">{formatRupees(row.revenuePaise)}</td>
                          <td className="px-6 py-3 font-mono text-muted-foreground">
                            {formatRupees(row.gstPaise)}
                          </td>
                        </tr>
                      ))}

                    {reportType === 'profit' && (
                      <>
                        <tr className="hover:bg-muted/20">
                          <td className="px-6 py-3">Total Project Proposals</td>
                          <td className="px-6 py-3 font-semibold">{reportData.total.quotations}</td>
                        </tr>
                        <tr className="hover:bg-muted/20">
                          <td className="px-6 py-3">Accumulated Cost Basis</td>
                          <td className="px-6 py-3 font-semibold text-destructive">
                            {formatRupees(reportData.total.costPaise)}
                          </td>
                        </tr>
                        <tr className="hover:bg-muted/20">
                          <td className="px-6 py-3">Accumulated Revenue</td>
                          <td className="px-6 py-3 font-semibold text-foreground">
                            {formatRupees(reportData.total.revenuePaise)}
                          </td>
                        </tr>
                        <tr className="hover:bg-muted/20">
                          <td className="px-6 py-3">Net Realized Profits</td>
                          <td className="px-6 py-3 font-semibold text-success">
                            {formatRupees(reportData.total.profitPaise)}
                          </td>
                        </tr>
                        <tr className="hover:bg-muted/20">
                          <td className="px-6 py-3">Overall Studio Margin %</td>
                          <td className="px-6 py-3 font-semibold text-primary">
                            {reportData.total.profitMarginPercent}%
                          </td>
                        </tr>
                      </>
                    )}

                    {reportType === 'material' &&
                      reportData.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="px-6 py-3 font-semibold">
                            {row.materialName}{' '}
                            <span className="text-[10px] font-mono text-muted-foreground">({row.materialId})</span>
                          </td>
                          <td className="px-6 py-3 text-xs capitalize text-muted-foreground">{row.category}</td>
                          <td className="px-6 py-3 font-mono">
                            {row.quantity} {row.unit}
                          </td>
                          <td className="px-6 py-3 font-mono text-destructive">
                            {row.wasteQty.toFixed(2)} {row.unit}
                          </td>
                          <td className="px-6 py-3 font-mono font-semibold">
                            {row.totalQty.toFixed(2)} {row.unit}
                          </td>
                          <td className="px-6 py-3 font-mono text-primary">
                            {formatRupees(row.amountPaise)}
                          </td>
                        </tr>
                      ))}

                    {reportType === 'labour' &&
                      reportData.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="px-6 py-3 font-semibold capitalize">{row.trade}</td>
                          <td className="px-6 py-3 font-mono text-success">
                            {formatRupees(row.amountPaise)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
