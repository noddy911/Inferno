import { FileText, FolderKanban, LayoutPanelLeft, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Dashboard' };

const stats = [
  { label: 'Projects', value: '—', icon: FolderKanban },
  { label: 'Clients', value: '—', icon: Users },
  { label: 'Open quotations', value: '—', icon: FileText },
  { label: 'Rooms designed', value: '—', icon: LayoutPanelLeft },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your studio&apos;s activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
          <CardDescription>Phase 1 lays the foundation: accounts, auth, and the app shell.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Projects, rooms, furniture &amp; materials, and quotation workflows arrive in Phase 2.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
