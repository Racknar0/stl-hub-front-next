'use client';
import React, { Suspense, useEffect } from 'react';
import Layout from '../../components/layout/Layout/Layout';
import { usePathname } from 'next/navigation';
import HttpService from '@/services/HttpService';
import useStore from '../../../store/useStore';

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export default function SiteLayout({ children }) {
  const pathname = usePathname();
  const roleId = useStore((s) => s.roleId);

  useEffect(() => {
    // Excluir administradores y páginas del dashboard
    if (roleId === 2 || String(pathname).startsWith('/dashboard')) {
      return;
    }

    const recordVisit = async () => {
      try {
        let visitorId = localStorage.getItem('__stl_vid');
        if (!visitorId) {
          visitorId = generateId();
          localStorage.setItem('__stl_vid', visitorId);
        }

        let sessionId = sessionStorage.getItem('__stl_sid');
        if (!sessionId) {
          sessionId = generateId();
          sessionStorage.setItem('__stl_sid', sessionId);
        }

        const http = new HttpService();
        await http.postData('/track/site-visit', { 
          path: pathname,
          sessionId,
          visitorId
        });
      } catch (e) {
        // Ignorar errores silenciosamente para no romper la UX
      }
    };
    recordVisit();
  }, [pathname, roleId]);

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

