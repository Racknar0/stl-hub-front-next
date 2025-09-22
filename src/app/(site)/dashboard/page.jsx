'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useStore from '../../../store/useStore';

export default function Page() {
  const router = useRouter();
  const token = useStore((s) => s.token);
  const roleId = useStore((s) => s.roleId);
  const hydrateToken = useStore((s) => s.hydrateToken);
  const hydrated = useStore((s) => s.hydrated);

  useEffect(() => { hydrateToken() }, [hydrateToken]);

  useEffect(() => {
    if (!hydrated) return; // esperar hidratación
    if (!token || roleId !== 2) router.replace('/login');
  }, [hydrated, token, roleId, router]);

  if (!hydrated) return null;
  if (!token || roleId !== 2) return null;

  return (
    <>
      <h1 className="mb-3">Dashboard</h1>
      <div className="card glass p-3">
        <p>Selecciona una opción del menú lateral.</p>
      </div>
    </>
  );
}
