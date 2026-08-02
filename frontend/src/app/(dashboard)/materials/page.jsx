'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, ShieldAlert, Check, X, Loader2 } from 'lucide-react';
import { apiRequest } from '@/services/api-client';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

export default function MaterialsPage() {
  const user = useAuthStore((s) => s.user);
  const isReadOnly = user?.role === 'client' || user?.role === 'sales';

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Edit / Add state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    brand: '',
    category: 'board',
    type: 'plywood',
    thickness: 18,
    sheetSize: { width: 2440, height: 1220 },
    unit: 'sheet',
    purchaseRate: 2000,
    sellingRate: 2500,
    gst: 18,
    supplier: '',
    isActive: true,
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page,
        pageSize: 10,
        search,
        category,
      }).toString();

      const res = await apiRequest(`/materials?${q}`);
      setMaterials(res.items || []);
      setTotalPages(Math.ceil((res.total || 0) / 10));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [page, category]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchMaterials();
  };

  const openAddDrawer = () => {
    setEditingMaterial(null);
    setFormData({
      sku: '',
      name: '',
      brand: '',
      category: 'board',
      type: 'plywood',
      thickness: 18,
      sheetSize: { width: 2440, height: 1220 },
      unit: 'sheet',
      purchaseRate: 2000,
      sellingRate: 2500,
      gst: 18,
      supplier: '',
      isActive: true,
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (material) => {
    setEditingMaterial(material);
    setFormData({
      sku: material.sku,
      name: material.name,
      brand: material.brand || '',
      category: material.category,
      type: material.type || '',
      thickness: material.thickness || 0,
      sheetSize: {
        width: material.sheetSize?.width || 0,
        height: material.sheetSize?.height || 0,
      },
      unit: material.unit,
      purchaseRate: material.purchaseRate,
      sellingRate: material.sellingRate,
      gst: material.gst || 18,
      supplier: material.supplier || '',
      isActive: material.isActive !== false,
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingMaterial) {
        await apiRequest(`/materials/${editingMaterial.id}`, {
          method: 'PUT',
          body: formData,
        });
        toast.success('Material updated successfully');
      } else {
        await apiRequest('/materials', {
          method: 'POST',
          body: formData,
        });
        toast.success('Material created successfully');
      }
      setDrawerOpen(false);
      fetchMaterials();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Materials Master
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage SKUs, raw boards, hardware, finishes, and price sheets.
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={openAddDrawer}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-105 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Add Material</span>
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU, name, brand..."
              className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
          >
            <option value="">All Categories</option>
            <option value="board">Boards & Plywood</option>
            <option value="finish">Finishes (Laminates, PU)</option>
            <option value="hardware">Hardware Fittings</option>
            <option value="countertop">Countertops</option>
            <option value="other">Other Components</option>
          </select>
          <button
            type="submit"
            className="rounded-md border bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:brightness-105 active:scale-95 transition-all"
          >
            Search
          </button>
        </form>
      </div>

      {/* Materials List */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : materials.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center p-6">
            <ShieldAlert className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-base font-medium">No materials found</p>
            <p className="text-sm text-muted-foreground max-w-xs mt-1">
              Try adjusting your filters or search queries, or seed the dataset.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">SKU</th>
                  <th className="px-6 py-3">Name / Brand</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Specs</th>
                  <th className="px-6 py-3">Purchase Rate</th>
                  <th className="px-6 py-3">Selling Rate</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  {!isReadOnly && <th className="px-6 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {materials.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-mono font-medium text-foreground">
                      {m.sku}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.brand || 'No Brand'}</div>
                    </td>
                    <td className="px-6 py-4 capitalize text-muted-foreground">{m.category}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {m.category === 'board' ? (
                        <span>
                          {m.thickness}mm · {m.sheetSize?.width}×{m.sheetSize?.height}
                        </span>
                      ) : (
                        <span>Unit: {m.unit}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">₹{m.purchaseRate}</td>
                    <td className="px-6 py-4 font-medium text-primary">₹{m.sellingRate}</td>
                    <td className="px-6 py-4 text-center">
                      {m.isActive !== false ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                          <Check className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                          <X className="h-3 w-3" /> Retired
                        </span>
                      )}
                    </td>
                    {!isReadOnly && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openEditDrawer(m)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
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

      {/* Edit/Add Drawer Overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-md flex-col border-l bg-card text-card-foreground shadow-2xl transition-transform duration-300 translate-x-0 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="font-heading text-lg font-semibold">
                {editingMaterial ? 'Edit Material Spec' : 'Add Material Spec'}
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-full p-1.5 hover:bg-muted text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  SKU
                </label>
                <input
                  type="text"
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g., BD-PLY-18"
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/25"
                  disabled={!!editingMaterial}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 18mm MR Plywood"
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/25"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g., Century"
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                  >
                    <option value="board">Board</option>
                    <option value="finish">Finish</option>
                    <option value="hardware">Hardware</option>
                    <option value="countertop">Countertop</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Type
                  </label>
                  <input
                    type="text"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    placeholder="e.g., plywood, hinge"
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g., sheet, pc, sqft"
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              {formData.category === 'board' && (
                <div className="rounded-md border p-3 bg-muted/10 space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground">Board Dimensions</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground block">Thickness (mm)</label>
                      <input
                        type="number"
                        value={formData.thickness}
                        onChange={(e) =>
                          setFormData({ ...formData, thickness: parseInt(e.target.value, 10) })
                        }
                        className="w-full rounded border bg-background px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block">Width (mm)</label>
                      <input
                        type="number"
                        value={formData.sheetSize.width}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sheetSize: { ...formData.sheetSize, width: parseInt(e.target.value, 10) },
                          })
                        }
                        className="w-full rounded border bg-background px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block">Height (mm)</label>
                      <input
                        type="number"
                        value={formData.sheetSize.height}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sheetSize: { ...formData.sheetSize, height: parseInt(e.target.value, 10) },
                          })
                        }
                        className="w-full rounded border bg-background px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Purchase (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.purchaseRate}
                    onChange={(e) =>
                      setFormData({ ...formData, purchaseRate: parseFloat(e.target.value) })
                    }
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Selling (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.sellingRate}
                    onChange={(e) =>
                      setFormData({ ...formData, sellingRate: parseFloat(e.target.value) })
                    }
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    GST (%)
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.gst}
                    onChange={(e) => setFormData({ ...formData, gst: parseFloat(e.target.value) })}
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Supplier
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="e.g., Century Distributors Ltd."
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-primary focus:ring-primary/20"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-foreground select-none">
                  Spec Active (Available for calculations)
                </label>
              </div>

              <div className="pt-4 flex gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
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
                  <span>Save Spec</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
