'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  Loader2,
  Phone,
  Mail,
  MapPin,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { apiRequest } from '@/services/api-client';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';
import Link from 'next/link';

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  address: '',
  gstNumber: '',
  notes: '',
};

export default function ClientsPage() {
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === 'admin' || user?.role === 'designer';
  const isAdmin = user?.role === 'admin';

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 12;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page, pageSize: PAGE_SIZE, search: debouncedSearch }).toString();
      const res = await apiRequest(`/clients?${q}`);
      setClients(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  function openAddDrawer() {
    setEditingClient(null);
    setFormData(EMPTY_FORM);
    setDrawerOpen(true);
  }

  function openEditDrawer(client) {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      gstNumber: client.gstNumber || '',
      notes: client.notes || '',
    });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingClient(null);
    setFormData(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Client name is required');
    setSubmitting(true);
    try {
      if (editingClient) {
        await apiRequest(`/clients/${editingClient.id}`, { method: 'PUT', body: formData });
        toast.success('Client updated successfully');
      } else {
        await apiRequest('/clients', { method: 'POST', body: formData });
        toast.success('Client added successfully');
      }
      closeDrawer();
      fetchClients();
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
      await apiRequest(`/clients/${id}`, { method: 'DELETE' });
      toast.success('Client removed');
      setDeletingId(null);
      fetchClients();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
      setDeletingId(null);
    }
  }

  const getInitials = (name) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Client Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage your client profiles and track their project history.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openAddDrawer}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-105 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New Client</span>
          </button>
        )}
      </div>

      {/* Search + Summary Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring/60"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {loading ? '…' : `${total} client${total !== 1 ? 's' : ''} found`}
        </span>
      </div>

      {/* Client Grid / Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : clients.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/5">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <div className="text-center">
            <p className="font-medium text-muted-foreground">No clients yet</p>
            <p className="text-xs text-muted-foreground">
              {canEdit ? 'Add your first client to get started.' : 'No clients have been added.'}
            </p>
          </div>
          {canEdit && (
            <button
              onClick={openAddDrawer}
              className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-105 active:scale-95 transition-all"
            >
              Add Client
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
                    Client
                  </th>
                  <th className="hidden px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                    Contact
                  </th>
                  <th className="hidden px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Address
                  </th>
                  <th className="hidden px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                    GST No.
                  </th>
                  <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-muted/20 transition-colors">
                    {/* Client name + avatar */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {getInitials(client.name)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{client.name}</p>
                          {client.notes && (
                            <p className="line-clamp-1 text-[11px] text-muted-foreground">{client.notes}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="hidden px-5 py-3.5 sm:table-cell">
                      <div className="space-y-0.5">
                        {client.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {client.phone}
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Address */}
                    <td className="hidden px-5 py-3.5 md:table-cell">
                      {client.address ? (
                        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                          <span className="line-clamp-2">{client.address}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* GST */}
                    <td className="hidden px-5 py-3.5 lg:table-cell">
                      {client.gstNumber ? (
                        <span className="font-mono text-xs">{client.gstNumber}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/projects?clientId=${client.id}&clientName=${encodeURIComponent(client.name)}`}
                          title="View projects"
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
                        >
                          <FolderKanban className="h-4 w-4" />
                        </Link>
                        {canEdit && (
                          <button
                            onClick={() => openEditDrawer(client)}
                            title="Edit client"
                            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(client.id)}
                            title={deletingId === client.id ? 'Click again to confirm' : 'Delete client'}
                            className={`rounded p-1.5 transition-colors ${
                              deletingId === client.id
                                ? 'bg-destructive/15 text-destructive'
                                : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                            }`}
                          >
                            {deletingId === client.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {deletingId === client.id && (
                          <button
                            onClick={() => setDeletingId(null)}
                            title="Cancel"
                            className="rounded p-1.5 text-muted-foreground hover:bg-accent transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {page} of {totalPages}
              </span>
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
          {/* Backdrop */}
          <div
            className="flex-1 bg-foreground/20 backdrop-blur-sm"
            onClick={closeDrawer}
          />
          {/* Panel */}
          <div className="flex w-full max-w-md flex-col bg-card shadow-[var(--elev-3)] animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="font-heading text-lg font-semibold">
                {editingClient ? 'Edit Client' : 'New Client'}
              </h2>
              <button
                onClick={closeDrawer}
                className="rounded p-1.5 text-muted-foreground hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex-1 space-y-4 p-6">
                {/* Name */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Full Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/60"
                    required
                  />
                </div>

                {/* Phone + Email */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/60"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                      placeholder="client@example.com"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/60"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Site / Billing Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Building, Street, City, Pin…"
                    rows={2}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/60 resize-none"
                  />
                </div>

                {/* GST */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, gstNumber: e.target.value.toUpperCase() }))
                    }
                    placeholder="22AAAAA0000A1Z5"
                    className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-ring/60"
                    maxLength={15}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Internal Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Any internal notes about this client…"
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
                  {editingClient ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
