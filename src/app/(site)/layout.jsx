'use client';
import React, { Suspense } from 'react';
import Layout from '../../components/layout/Layout/Layout';
import { usePathname } from 'next/navigation';

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
      <Layout>
        {children}
      </Layout>
    </Suspense>
  );
}
