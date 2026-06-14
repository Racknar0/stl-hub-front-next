'use client';
import React, { Suspense, useEffect } from 'react';
import Layout from '../../components/layout/Layout/Layout';
import { usePathname } from 'next/navigation';
import HttpService from '@/services/HttpService';
import useStore from '@/store/useStore';
import { PromoProvider } from '@/hooks/usePromo';
import { GoogleOAuthProvider } from '@react-oauth/google';
import ClientTracker from '../../components/common/ClientTracker/ClientTracker';

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export default function SiteLayout({ children }) {
  const pathname = usePathname();
  const roleId = useStore((s) => s.roleId);
  const hydrated = useStore((s) => s.hydrated);
  const hydrateToken = useStore((s) => s.hydrateToken);

  useEffect(() => {
    hydrateToken();
  }, [hydrateToken]);

  useEffect(() => {
    if (!hydrated) return;

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
  }, [pathname, roleId, hydrated]);

  const isDashboard = pathname?.startsWith('/dashboard');

  // Dashboard: no usar Layout público (Header/Footer)
  if (isDashboard) {
    return (
      <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
        {children}
      </GoogleOAuthProvider>
    );
  }

  // Público: usar Layout con Header/Footer
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
      <PromoProvider>
        <ClientTracker />
        <Suspense fallback={null}>
          <Layout>
            {children}
          </Layout>
        </Suspense>
      </PromoProvider>
    </GoogleOAuthProvider>
  );
}

