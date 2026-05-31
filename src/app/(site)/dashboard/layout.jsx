import DashboardClientLayout from './DashboardClientLayout';
import { buildNoindexMetadata } from '../noindexRouteMetadata';

export const metadata = buildNoindexMetadata('/dashboard', 'Dashboard | STL HUB');

export default function DashboardLayout({ children }) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
