'use client';
import React, { Suspense } from 'react';
import Layout from '../../components/layout/Layout/Layout';
import { usePathname } from 'next/navigation';
import AttributionBootstrap from '../../components/tracking/AttributionBootstrap';

export default function SiteLayout({ children }) {
  const pathname = usePathname();

  const isDashboard = pathname?.startsWith('/dashboard');

  // Dashboard: no usar Layout público (Header/Footer)
  if (isDashboard) {
    return <>{children}</>;
  }

  // Público: usar Layout con Header/Footer
  return (
    <Suspense fallback={null}>
      <AttributionBootstrap />
      <Layout>
        {children}
      </Layout>
    </Suspense>
  );
}
