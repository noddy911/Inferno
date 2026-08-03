import {
  FileText,
  FolderKanban,
  LayoutDashboard,
  Package,
  Settings,
  DoorOpen,
  Users,
  Sliders,
} from 'lucide-react';

/**
 * App navigation — Phase 2 complete.
 * Clients, Projects, and Rooms are now fully functional.
 *
 * @type {Array<{label: string, href: string, icon: any, soon?: boolean}>}
 */
export const navItems = [
  { label: 'Dashboard & Reports', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Rooms', href: '/rooms', icon: DoorOpen },
  { label: 'Materials Master', href: '/materials', icon: Package },
  { label: 'Calculation Simulator', href: '/simulator', icon: Sliders },
  { label: 'Quotations & BOQ', href: '/quotations', icon: FileText },
  { label: 'Settings & Pricing', href: '/settings', icon: Settings },
];
