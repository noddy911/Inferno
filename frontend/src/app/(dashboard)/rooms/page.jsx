'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DoorOpen,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Loader2,
  ArrowLeft,
  Ruler,
  FolderKanban,
  Layers,
} from 'lucide-react';
import { apiRequest } from '@/services/api-client';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const EMPTY_FORM = {
  name: '',
  width: '',
  length: '',
  height: '',
  wallFinish: '',
  floorFinish: '',
  ceilingFinish: '',
};

/** Convert mm to readable feet string. */
function mmToFt(mm) {
  if (!mm) return null;
  const ft = mm / 304.8;
  return `${ft.toFixed(1)} ft`;
}

/** Compute area in sqft from mm dimensions. */
function areaInSqft(widthMm, lengthMm) {
  if (!widthMm || !lengthMm) return null;
  const sqft = (widthMm / 304.8) * (lengthMm / 304.8);
  return `${sqft.toFixed(1)} sqft`;
}

export default function RoomsPage() {
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === 'admin' || user?.role === 'designer';
  const isAdmin = user?.role === 'admin';

  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId') || '';
  const projectName = searchParams.get('projectName') || '';

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId);
  const [selectedProjectName, setSelectedProjectName] = useState(projectName);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Load project list
  useEffect(() => {
    apiRequest('/projects?pageSize=200')
      .then((r) => setProjects(r.items || []))
      .catch(() => {});
  }, []);

  const fetchRooms = useCallback(async () => {
    if (!selectedProjectId) { setRooms([]); return; }
    setLoading(true);
    try {
      const data = await apiRequest(`/projects/${selectedProjectId}/rooms`);
      setRooms(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  function openAddDrawer() {
    setEditingRoom(null);
    setFormData(EMPTY_FORM);
    setDrawerOpen(true);
  }

  function openEditDrawer(room) {
    setEditingRoom(room);
    setFormData({
      name: room.name || '',
      width: room.width || '',
      length: room.length || '',
      height: room.height || '',
      wallFinish: room.wallFinish || '',
      floorFinish: room.floorFinish || '',
      ceilingFinish: room.ceilingFinish || '',
    });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingRoom(null);
    setFormData(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Room name is required');
    if (!selectedProjectId) return toast.error('Please select a project first');
    setSubmitting(true);
    try {
      if (editingRoom) {
        await apiRequest(`/projects/${selectedProjectId}/rooms/${editingRoom.id}`, {
          method: 'PUT',
          body: formData,
        });
        toast.success('Room updated');
      } else {
        await apiRequest(`/projects/${selectedProjectId}/rooms`, {
          method: 'POST',
          body: formData,
        });
        toast.success('Room added');
      }
      closeDrawer();
      fetchRooms();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (deletingId !== id) { setDeletingId(id); return; }
    try {
      await apiRequest(`/projects/${selectedProjectId}/rooms/${id}`, { method: 'DELETE' });
      toast.success('Room removed');
      setDeletingId(null);
      fetchRooms();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
      setDeletingId(null);
    }
  }

  function handleProjectChange(e) {
    const pid = e.target.value;
    const p = projects.find((x) => x.id === pid);
    setSelectedProjectId(pid);
    setSelectedProjectName(p?.projectName || '');
    setRooms([]);
  }

  // Stats
  const totalArea = rooms.reduce((acc, r) => {
    if (r.width && r.length) acc += (r.width / 304.8) * (r.length / 304.8);
    return acc;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/projects"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Projects
            </Link>
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Room Planner</h1>
          <p className="text-sm text-muted-foreground">
            {selectedProjectName
              ? `Rooms in — ${selectedProjectName}`
              : 'Select a project to manage its rooms and dimensions.'}
          </p>
        </div>
        {canEdit && selectedProjectId && (
          <button
            onClick={openAddDrawer}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-105 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Room</span>
          </button>
        )}
      </div>

      {/* Project Selector */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Select Project
        </label>
        <select
          value={selectedProjectId}
          onChange={handleProjectChange}
          className="w-full max-w-sm rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/60"
        >
          <option value="">— Choose a project —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.projectName}</option>
          ))}
        </select>
      </div>

      {/* Summary Stats */}
      {selectedProjectId && rooms.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Rooms</p>
            <p className="mt-1 text-2xl font-bold">{rooms.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Floor Area</p>
            <p className="mt-1 font-mono text-2xl font-bold text-primary">
              {totalArea > 0 ? `${totalArea.toFixed(1)} sqft` : '—'}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rooms with Finishes</p>
            <p className="mt-1 text-2xl font-bold">
              {rooms.filter((r) => r.wallFinish || r.floorFinish || r.ceilingFinish).length}
            </p>
          </div>
        </div>
      )}

      {/* Content area */}
      {!selectedProjectId ? (
        <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/5">
          <FolderKanban className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Choose a project above to manage rooms</p>
        </div>
      ) : loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/5">
          <DoorOpen className="h-10 w-10 text-muted-foreground/30" />
          <div className="text-center">
            <p className="font-medium text-muted-foreground">No rooms added yet</p>
            <p className="text-xs text-muted-foreground">
              {canEdit ? 'Add your first room to define the space.' : 'No rooms have been planned.'}
            </p>
          </div>
          {canEdit && (
            <button
              onClick={openAddDrawer}
              className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-105 active:scale-95 transition-all"
            >
              Add First Room
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => (
            <div key={room.id} className="group relative rounded-xl border bg-card p-5 shadow-sm hover:shadow-[var(--elev-2)] transition-shadow">
              {/* Room name */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-foreground">{room.name}</h3>
                  {(room.width || room.length) && (
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Ruler className="h-3 w-3" />
                      <span className="font-mono">
                        {room.width ? mmToFt(room.width) : '?'} × {room.length ? mmToFt(room.length) : '?'}
                        {room.height ? ` × ${mmToFt(room.height)} H` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {canEdit && (
                    <button
                      onClick={() => openEditDrawer(room)}
                      title="Edit room"
                      className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {(canEdit || isAdmin) && (
                    <button
                      onClick={() => handleDelete(room.id)}
                      title={deletingId === room.id ? 'Click again to confirm' : 'Delete room'}
                      className={`rounded p-1.5 transition-colors ${
                        deletingId === room.id
                          ? 'bg-destructive/15 text-destructive'
                          : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                      }`}
                    >
                      {deletingId === room.id ? <Check className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  {deletingId === room.id && (
                    <button
                      onClick={() => setDeletingId(null)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-accent transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Area badge */}
              {room.width && room.length && (
                <div className="mt-3">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                    {areaInSqft(room.width, room.length)}
                  </span>
                </div>
              )}

              {/* Finishes */}
              {(room.wallFinish || room.floorFinish || room.ceilingFinish) && (
                <div className="mt-3 space-y-1 border-t pt-3">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Finishes</p>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[11px]">
                    {[
                      { label: 'Wall', value: room.wallFinish },
                      { label: 'Floor', value: room.floorFinish },
                      { label: 'Ceiling', value: room.ceilingFinish },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded bg-muted/50 px-2 py-1">
                        <p className="text-[9px] font-semibold uppercase text-muted-foreground">{label}</p>
                        <p className="truncate text-foreground">{value || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-foreground/20 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="flex w-full max-w-md flex-col bg-card shadow-[var(--elev-3)] animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="font-heading text-lg font-semibold">
                {editingRoom ? 'Edit Room' : 'Add Room'}
              </h2>
              <button onClick={closeDrawer} className="rounded p-1.5 text-muted-foreground hover:bg-accent transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex-1 space-y-5 p-6">
                {/* Room Name */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Room Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Master Bedroom, Living Room…"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/60"
                    required
                  />
                </div>

                {/* Dimensions */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Dimensions (in millimetres)
                  </label>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    Enter dimensions in mm. e.g. 3600 = 12 ft, 4800 = 15 ft
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'width', label: 'Width' },
                      { key: 'length', label: 'Length' },
                      { key: 'height', label: 'Height' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-[10px] text-muted-foreground mb-1">{label}</label>
                        <input
                          type="number"
                          value={formData[key]}
                          onChange={(e) => setFormData((f) => ({ ...f, [key]: e.target.value }))}
                          placeholder="mm"
                          min="1"
                          step="1"
                          className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-ring/60"
                        />
                        {formData[key] && (
                          <p className="mt-0.5 text-[10px] text-primary font-mono">
                            ≈ {mmToFt(Number(formData[key]))}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  {formData.width && formData.length && (
                    <p className="mt-2 text-xs font-medium text-primary font-mono">
                      Area ≈ {areaInSqft(Number(formData.width), Number(formData.length))}
                    </p>
                  )}
                </div>

                {/* Finishes */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Finishes
                  </label>
                  <div className="space-y-2">
                    {[
                      { key: 'wallFinish', label: 'Wall Finish', placeholder: 'e.g. Asian Paints Tractor Emulsion' },
                      { key: 'floorFinish', label: 'Floor Finish', placeholder: 'e.g. Kajaria Vitrified 600×600mm' },
                      { key: 'ceilingFinish', label: 'Ceiling Finish', placeholder: 'e.g. POP False Ceiling + Cove' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="block text-[10px] text-muted-foreground mb-1">{label}</label>
                        <input
                          type="text"
                          value={formData[key]}
                          onChange={(e) => setFormData((f) => ({ ...f, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/60"
                        />
                      </div>
                    ))}
                  </div>
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
                  {editingRoom ? 'Save Changes' : 'Add Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
