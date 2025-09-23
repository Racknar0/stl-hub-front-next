'use client';
import React from 'react';
import Layout from '../../components/layout/Layout/Layout';
import { usePathname } from 'next/navigation';

export default function SiteLayout({ children }) {
  const pathname = usePathname();

  // Retornar siempre el componente Loader
  // 

  const isDashboard = pathname?.startsWith('/dashboard');

  // Dashboard: no usar Layout público (Header/Footer)
  if (isDashboard) {
    return <>{children}</>;
  }

  // Público: usar Layout con Header/Footer
  return (
    <Layout>
      {children}
    </Layout>
  );
}
