'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Calendar,
  User,
  Building2,
} from 'lucide-react';
import { apiRequest } from '@/services/api-client';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const PROJECT_STATUSES = ['new', 'design', 'in-progress', 'completed', 'cancelled'];

const STATUS_META = {
  new: { label: 'New', color: 'bg-info/15 text-info' },
  design: { label: 'Design', color: 'bg-primary/15 text-primary' },
  'in-progress': { label: 'In Progress', color: 'bg-warning/15 text-warning' },
  completed: { label: 'Completed', color: 'bg-success/15 text-success' },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground' },
};

const EMPTY_FORM = {
  projectName: '',
  clientId: '',
  siteAddress: '',
  status: 'new',
  timeline: '',
  notes: '',
};

export default function ProjectsPage() {
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === 'admin' || user?.role === 'designer';
  const isAdmin = user?.role === 'admin';

  const searchParams = useSearchParams();
  const presetClientId = searchParams.get('clientId') || '';
  const presetClientName = searchParams.get('clientName') || '';

  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState(presetClientId);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch dropdown clients
  useEffect(() => {
    apiRequest('/clients?pageSize=200').then((r) => setClients(r.items || [])).catch(() => {});
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        ...(statusFilter && { status: statusFilter }),
        ...(clientFilter && { clientId: clientFilter }),
      }).toString();
      const res = await apiRequest(`/projects?${q}`);
      setProjects(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, clientFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  function openAddDrawer() {
    setEditingProject(null);
    setFormData({ ...EMPTY_FORM, clientId: clientFilter || '' });
    setDrawerOpen(true);
  }

  function openEditDrawer(p) {
    setEditingProject(p);
    setFormData({
      projectName: p.projectName || '',
      clientId: p.clientId?._id || p.clientId || '',
      siteAddress: p.siteAddress || '',
      status: p.status || 'new',
      timeline: p.timeline ? new Date(p.timeline).toISOString().split('T')[0] : '',
      notes: p.notes || '',
    });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingProject(null);
    setFormData(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.projectName.trim()) return toast.error('Project name is required');
    if (!formData.clientId) return toast.error('Please select a client');
    setSubmitting(true);
    try {
      if (editingProject) {
        await apiRequest(`/projects/${editingProject.id}`, { method: 'PUT', body: formData });
        toast.success('Project updated');
      } else {
        await apiRequest('/projects', { method: 'POST', body: formData });
        toast.success('Project created');
      }
      closeDrawer();
      fetchProjects();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (deletingId !== id) {
      setDeletingId(id);
      return;
    }
    try {
      await apiRequest(`/projects/${id}`, { method: 'DELETE' });
      toast.success('Project removed');
      setDeletingId(null);
      fetchProjects();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
      setDeletingId(null);
    }
  }

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Project Hub</h1>
          <p className="text-sm text-muted-foreground">
            {presetClientId && presetClientName
              ? `Showing projects for ${presetClientName}`
              : 'Track all interior design projects and their workflow status.'}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openAddDrawer}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-105 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring/60"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/60"
        >
          <option value="">All Statuses</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
        <select
          value={clientFilter}
          onChange={(e) => { setClientFilter(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/60"
        >
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <span className="flex items-center text-xs text-muted-foreground">
          {loading ? '…' : `${total} project${total !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Projects Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/5">
          <FolderKanban className="h-10 w-10 text-muted-foreground/40" />
          <div className="text-center">
            <p className="font-medium text-muted-foreground">No projects found</p>
            <p className="text-xs text-muted-foreground">
              {canEdit ? 'Create your first project to begin.' : 'No projects have been created.'}
            </p>
          </div>
          {canEdit && (
            <button
              onClick={openAddDrawer}
              className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-105 active:scale-95 transition-all"
            >
              New Project
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Project
                  </th>
                  <th className="hidden px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                    Client
                  </th>
                  <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="hidden px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Timeline
                  </th>
                  <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {projects.map((project) => {
                  const meta = STATUS_META[project.status] || STATUS_META.new;
                  const clientObj = project.client || project.clientId;
                  return (
                    <tr key={project.id} className="hover:bg-muted/20 transition-colors">
                      {/* Project name + address */}
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-foreground">{project.projectName}</p>
                        {project.siteAddress && (
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                            {project.siteAddress}
                          </p>
                        )}
                      </td>

                      {/* Client */}
                      <td className="hidden px-5 py-3.5 sm:table-cell">
                        {clientObj ? (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <User className="h-3 w-3 shrink-0" />
                            <span>{clientObj.name || '—'}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>

                      {/* Timeline */}
                      <td className="hidden px-5 py-3.5 md:table-cell">
                        {project.timeline ? (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(project.timeline)}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/rooms?projectId=${project.id}&projectName=${encodeURIComponent(project.projectName)}`}
                            title="View rooms"
                            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
                          >
                            <DoorOpen className="h-4 w-4" />
                          </Link>
                          {canEdit && (
                            <button
                              onClick={() => openEditDrawer(project)}
                              title="Edit project"
                              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(project.id)}
                              title={deletingId === project.id ? 'Click again to confirm' : 'Delete project'}
                              className={`rounded p-1.5 transition-colors ${
                                deletingId === project.id
                                  ? 'bg-destructive/15 text-destructive'
                                  : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                              }`}
                            >
                              {deletingId === project.id ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          {deletingId === project.id && (
                            <button
                              onClick={() => setDeletingId(null)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-accent transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded border px-2 py-1 hover:bg-accent disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded border px-2 py-1 hover:bg-accent disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add / Edit Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-foreground/20 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="flex w-full max-w-md flex-col bg-card shadow-[var(--elev-3)] animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="font-heading text-lg font-semibold">
                {editingProject ? 'Edit Project' : 'New Project'}
              </h2>
              <button onClick={closeDrawer} className="rounded p-1.5 text-muted-foreground hover:bg-accent transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex-1 space-y-4 p-6">

                {/* Project Name */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Project Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => setFormData((f) => ({ ...f, projectName: e.target.value }))}
                    placeholder="e.g. Sharma Residence — 3BHK"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/60"
                    required
                  />
                </div>

                {/* Client */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Client <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData((f) => ({ ...f, clientId: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/60"
                    required
                  >
                    <option value="">— Select client —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Status + Timeline */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData((f) => ({ ...f, status: e.target.value }))}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/60"
                    >
                      {PROJECT_STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_META[s].label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={formData.timeline}
                      onChange={(e) => setFormData((f) => ({ ...f, timeline: e.target.value }))}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/60"
                    />
                  </div>
                </div>

                {/* Site Address */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Site Address
                  </label>
                  <textarea
                    value={formData.siteAddress}
                    onChange={(e) => setFormData((f) => ({ ...f, siteAddress: e.target.value }))}
                    placeholder="Property address where work will be executed…"
                    rows={2}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/60 resize-none"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Project brief, special requirements…"
                    rows={3}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/60 resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:brightness-105 active:scale-95 transition-all disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
