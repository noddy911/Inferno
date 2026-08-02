import {
  FileText,
  FolderKanban,
  LayoutDashboard,
  Package,
  Settings,
  Sofa,
  Users,
} from 'lucide-react';

/**
 * App navigation. Phase-2 sections are stubbed with `soon: true` and rendered
 * disabled so they don't link to non-existent routes.
 *
 * @type {Array<{label: string, href: string, icon: any, soon?: boolean}>}
 */
export const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Clients', href: '/clients', icon: Users, soon: true },
  { label: 'Projects', href: '/projects', icon: FolderKanban, soon: true },
  { label: 'Rooms', href: '/rooms', icon: Sofa, soon: true },
  { label: 'Furniture & Materials', href: '/materials', icon: Package, soon: true },
  { label: 'Quotations', href: '/quotations', icon: FileText, soon: true },
  { label: 'Settings', href: '/settings', icon: Settings, soon: true },
];
