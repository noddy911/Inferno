import {
  FileText,
  FolderKanban,
  LayoutDashboard,
  Package,
  Settings,
  Sofa,
  Users,
  Sliders,
} from 'lucide-react';

/**
 * App navigation. Phase-3 sections are now enabled.
 *
 * @type {Array<{label: string, href: string, icon: any, soon?: boolean}>}
 */
export const navItems = [
  { label: 'Dashboard & Reports', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Clients', href: '/clients', icon: Users, soon: true },
  { label: 'Projects', href: '/projects', icon: FolderKanban, soon: true },
  { label: 'Rooms', href: '/rooms', icon: Sofa, soon: true },
  { label: 'Materials Master', href: '/materials', icon: Package },
  { label: 'Calculation Simulator', href: '/simulator', icon: Sliders },
  { label: 'Quotations & BOQ', href: '/quotations', icon: FileText },
  { label: 'Settings & Pricing', href: '/settings', icon: Settings },
];
