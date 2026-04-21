'use client';
import React, { Suspense, useEffect } from 'react';
import Layout from '../../components/layout/Layout/Layout';
import { usePathname } from 'next/navigation';
import HttpService from '@/services/HttpService';

export default function SiteLayout({ children }) {
  const pathname = usePathname();

  useEffect(() => {
    // Para evitar múltiples peticiones en strict mode, Next.js lo ejecuta dos veces,
    // pero está bien para efectos de conteo básico. Si se quiere limitar a 1 por sesión, se puede usar sessionStorage.
    const recordVisit = async () => {
      try {
        const http = new HttpService();
        await http.postData('/track/site-visit', { path: pathname });
      } catch (e) {
        // Ignorar errores silenciosamente para no romper la UX
      }
    };
    recordVisit();
  }, [pathname]);

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
