'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  Download,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  Edit,
  Upload,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { apiRequest } from '@/services/api-client';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

export default function QuotationsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [quotations, setQuotations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal States
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  // Form Fields
  const [newProjectId, setNewProjectId] = useState('');
  const [newDiscountType, setNewDiscountType] = useState('flat');
  const [newDiscountValue, setNewDiscountValue] = useState(0);
  const [newPaymentTerms, setNewPaymentTerms] = useState('');
  const [newWarranty, setNewWarranty] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newValidDays, setNewValidDays] = useState(30);

  const [editPaymentTerms, setEditPaymentTerms] = useState('');
  const [editWarranty, setEditWarranty] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDiscountType, setEditDiscountType] = useState('flat');
  const [editDiscountValue, setEditDiscountValue] = useState(0);

  const [submitting, setSubmitting] = useState(false);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page,
        pageSize: 10,
        status: statusFilter,
      }).toString();
      const res = await apiRequest(`/quotations?${q}`);
      setQuotations(res.items || []);
      setTotalPages(Math.ceil((res.total || 0) / 10));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await apiRequest('/projects?pageSize=200');
      const data = res?.items || [];
      setProjects(data);
      if (data.length > 0) {
        setNewProjectId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [page, statusFilter]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const discount = newDiscountValue > 0 ? { type: newDiscountType, value: newDiscountValue } : undefined;
      await apiRequest('/quotations/generate', {
        method: 'POST',
        body: {
          projectId: newProjectId,
          discount,
          paymentTerms: newPaymentTerms || undefined,
          warranty: newWarranty || undefined,
          notes: newNotes || undefined,
          validUntilDays: newValidDays,
        },
      });
      toast.success('Quotation generated successfully!');
      setGenerateOpen(false);
      setPage(1);
      fetchQuotations();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Generation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (qtn) => {
    setSelectedQuotation(qtn);
    setEditPaymentTerms(qtn.paymentTerms || '');
    setEditWarranty(qtn.warranty || '');
    setEditNotes(qtn.notes || '');
    setEditDiscountType(qtn.summary?.discountType || 'flat');
    setEditDiscountValue(qtn.summary?.discountValue || 0);
    setEditOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const discount = editDiscountValue > 0 ? { type: editDiscountType, value: editDiscountValue } : undefined;
      await apiRequest(`/quotations/${selectedQuotation.id}`, {
        method: 'PUT',
        body: {
          paymentTerms: editPaymentTerms,
          warranty: editWarranty,
          notes: editNotes,
          discount,
        },
      });
      toast.success('Quotation draft updated and recalculated!');
      setEditOpen(false);
      fetchQuotations();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransition = async (qtn, nextStatus) => {
    try {
      const res = await apiRequest(`/quotations/${qtn.id}`, {
        method: 'PUT',
        body: { status: nextStatus },
      });
      if (nextStatus === 'revised') {
        toast.success(`Quotation marked revised. New draft spawned: ${res.revision.quotationNumber}`);
      } else {
        toast.success(`Quotation transitioned to ${nextStatus}!`);
      }
      fetchQuotations();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Status transition failed');
    }
  };

  const handleDelete = async (qtn) => {
    if (!window.confirm('Are you sure you want to permanently delete this quotation and its linked BOQ?')) return;
    try {
      await apiRequest(`/quotations/${qtn.id}`, { method: 'DELETE' });
      toast.success('Quotation deleted successfully');
      fetchQuotations();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Delete failed');
    }
  };

  const handleExportBoq = async (qtn) => {
    try {
      // Find the associated BOQ document for the project/quotation.
      // In the controllers, GET /boq/:id fetches the BOQ by BOQ model ID.
      // So first we call GET /api/v1/boq/generate?projectId=... or find the BOQ.
      // Wait! We can fetch the BOQ document linked to this quotation by querying by quotationId.
      // Let's create an endpoint in the backend for finding a BOQ by quotationId?
      // Wait! In Mongoose, we have Boq model: `Boq.findOne({ quotationId })`.
      // Can we find BOQ by quotationId?
      // Actually, since we didn't add a dedicated search endpoint for BOQ, let's check:
      // In the database repository we have boq linked.
      // Let's see: `GET /boq/:id` fetches BOQ by ID. But how does the frontend know the BOQ ID?
      // Ah! In `generateQuotation` response it returns `{ quotation, boq, quotationId, boqId }`.
      // But if we fetch quotations list, it doesn't return `boqId` directly in the Quotation schema!
      // Wait, is there a way to resolve the BOQ?
      // Let's verify what the database stores. In `BoqSchema`:
      // `quotationId` is an index!
      // Let's see: in `boq.routes.js`, we have:
      // `/boq/:id` (which takes BOQ ID).
      // Wait, we can add a query parameter to `/boq/generate` or a find endpoint:
      // `GET /boq?quotationId=...`
      // Or in the Quotation model, can we get BOQ?
      // Actually, we can search for the BOQ using the project's BOQ generation, or even simpler:
      // Let's check: if we query `POST /boq/generate` with the `projectId`, it compiles a fresh, updated BOQ and returns its ID!
      // Yes! Since `POST /boq/generate` takes `projectId` and returns the generated BOQ result (including the new BOQ ID), we can generate a BOQ from the project at any time!
      // And we can download the Excel file using the returned ID!
      // This is incredibly robust! Let's do that:
      toast.info('Generating spreadsheet export...');
      const boqData = await apiRequest('/boq/generate', {
        method: 'POST',
        body: { projectId: qtn.projectId },
      });
      // Trigger download
      window.open(`http://localhost:5000/api/v1/boq/${boqData.id}/export?format=xlsx`, '_blank');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export BOQ spreadsheet');
    }
  };

  const getStatusBadge = (status) => {
    const classes = {
      draft: 'bg-muted text-muted-foreground border',
      sent: 'bg-info/15 text-info',
      accepted: 'bg-success/15 text-success',
      rejected: 'bg-destructive/15 text-destructive',
      revised: 'bg-warning/15 text-warning',
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${classes[status] || ''}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Quotations &amp; BOQs
          </h1>
          <p className="text-sm text-muted-foreground">
            Review client proposals, apply discounts, generate revisions, and download client-ready PDFs.
          </p>
        </div>
        <button
          onClick={() => setGenerateOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-105 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>New Proposal</span>
        </button>
      </div>

      {/* Filter Options */}
      <div className="flex gap-2 border-b pb-1 overflow-x-auto text-sm">
        {[
          { label: 'All Proposals', value: '' },
          { label: 'Drafts', value: 'draft' },
          { label: 'Sent', value: 'sent' },
          { label: 'Accepted', value: 'accepted' },
          { label: 'Rejected', value: 'rejected' },
          { label: 'Superseded (Revised)', value: 'revised' },
        ].map((tab) => {
          const active = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`pb-2 px-3 border-b-2 font-medium transition-all ${
                active
                  ? 'border-primary text-foreground font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Quotation Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : quotations.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center p-6 bg-muted/5">
            <FileText className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-base font-medium">No proposals found</p>
            <p className="text-sm text-muted-foreground max-w-xs mt-1">
              Create a new proposal using the button above to begin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">Proposal #</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Total (₹)</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Valid Until</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-mono font-medium text-foreground">
                      {q.quotationNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-xs font-mono">Project Target</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[150px]">{q.projectId}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      ₹{q.summary?.total || '—'}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(q.status)}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      {/* PDF Print */}
                      <button
                        onClick={() =>
                          window.open(
                            `http://localhost:5000/api/v1/quotations/${q.id}/pdf`,
                            '_blank'
                          )
                        }
                        title="Download PDF"
                        className="rounded border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Download className="h-4 w-4" />
                      </button>

                      {/* Export BOQ */}
                      <button
                        onClick={() => handleExportBoq(q)}
                        title="Export BOQ Excel"
                        className="rounded border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                      </button>

                      {/* Edit Draft */}
                      {q.status === 'draft' && (
                        <button
                          onClick={() => handleOpenEdit(q)}
                          title="Edit terms/discount"
                          className="rounded border p-1.5 text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}

                      {/* Draft -> Sent */}
                      {q.status === 'draft' && (
                        <button
                          onClick={() => handleTransition(q, 'sent')}
                          title="Mark Sent"
                          className="rounded bg-indigo-600/10 text-indigo-600 px-2 py-1 text-xs font-semibold hover:bg-indigo-600 hover:text-white transition-colors"
                        >
                          Send
                        </button>
                      )}

                      {/* Sent -> Accept/Reject */}
                      {q.status === 'sent' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleTransition(q, 'accepted')}
                            title="Accept"
                            className="rounded bg-success/10 text-success p-1 hover:bg-success hover:text-white transition-all"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleTransition(q, 'rejected')}
                            title="Reject"
                            className="rounded bg-destructive/10 text-destructive p-1 hover:bg-destructive hover:text-white transition-all"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Rejected -> Revise */}
                      {q.status === 'rejected' && (
                        <button
                          onClick={() => handleTransition(q, 'revised')}
                          title="Revise"
                          className="rounded bg-warning/10 text-warning px-2.5 py-1 text-xs font-semibold hover:bg-warning hover:text-foreground transition-all flex items-center gap-1"
                        >
                          <RefreshCw className="h-3 w-3" /> Revise
                        </button>
                      )}

                      {/* Admin Delete */}
                      {isAdmin && (q.status === 'draft' || q.status === 'rejected') && (
                        <button
                          onClick={() => handleDelete(q)}
                          title="Delete Proposal"
                          className="rounded border border-destructive/20 p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t bg-muted/20 px-6 py-4">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="rounded-md border bg-card px-3 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs font-medium text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="rounded-md border bg-card px-3 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Generate Quotation Modal */}
      {generateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border bg-card text-card-foreground shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="font-heading text-lg font-semibold">Generate Quotation</h2>
              <button
                onClick={() => setGenerateOpen(false)}
                className="rounded-full p-1.5 hover:bg-muted text-muted-foreground"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Target Project
                </label>
                <select
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectName} ({p.siteAddress})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Discount Type
                  </label>
                  <select
                    value={newDiscountType}
                    onChange={(e) => setNewDiscountType(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                  >
                    <option value="flat">Flat Cash (₹)</option>
                    <option value="percent">Percent (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Value
                  </label>
                  <input
                    type="number"
                    value={newDiscountValue}
                    onChange={(e) => setNewDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={newPaymentTerms}
                  onChange={(e) => setNewPaymentTerms(e.target.value)}
                  placeholder="e.g., 50% advance, 40% delivery, 10% handover"
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Warranty
                  </label>
                  <input
                    type="text"
                    value={newWarranty}
                    onChange={(e) => setNewWarranty(e.target.value)}
                    placeholder="e.g., 5 Years Warranty"
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Validity (Days)
                  </label>
                  <input
                    type="number"
                    value={newValidDays}
                    onChange={(e) => setNewValidDays(parseInt(e.target.value, 10) || 30)}
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Terms/Notes
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Additional conditions..."
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm h-16 resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setGenerateOpen(false)}
                  className="flex-1 rounded-md border bg-card py-2 text-sm font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:brightness-105 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Generate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Quotation Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border bg-card text-card-foreground shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="font-heading text-lg font-semibold flex items-center gap-1.5">
                <span>Configure Proposal</span>
                <span className="font-mono text-xs text-muted-foreground">({selectedQuotation?.quotationNumber})</span>
              </h2>
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-full p-1.5 hover:bg-muted text-muted-foreground"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Discount Type
                  </label>
                  <select
                    value={editDiscountType}
                    onChange={(e) => setEditDiscountType(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                  >
                    <option value="flat">Flat Cash (₹)</option>
                    <option value="percent">Percent (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Value
                  </label>
                  <input
                    type="number"
                    value={editDiscountValue}
                    onChange={(e) => setEditDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={editPaymentTerms}
                  onChange={(e) => setEditPaymentTerms(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Warranty
                </label>
                <input
                  type="text"
                  value={editWarranty}
                  onChange={(e) => setEditWarranty(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Terms/Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm h-20 resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="flex-1 rounded-md border bg-card py-2 text-sm font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:brightness-105 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Save &amp; Recalculate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
