'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useStore from '../../../store/useStore';
import HttpService from '@/services/HttpService';
import { successAlert, errorAlert } from '@/helpers/alerts';

export default function Page() {
  const router = useRouter();
  const token = useStore((s) => s.token);
  const roleId = useStore((s) => s.roleId);
  const hydrateToken = useStore((s) => s.hydrateToken);
  const hydrated = useStore((s) => s.hydrated);

  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const http = new HttpService();

  useEffect(() => { hydrateToken() }, [hydrateToken]);

  useEffect(() => {
    if (!hydrated) return; // esperar hidratación
    if (!token || roleId !== 2) router.replace('/login');
  }, [hydrated, token, roleId, router]);

  if (!hydrated) return null;
  if (!token || roleId !== 2) return null;

  const randomize = async () => {
    try {
      setLoading(true);
      await http.postData('/assets/randomize-free', { count: Number(count) || 0 });
      await successAlert('Listo', 'Se actualizaron los FREE aleatoriamente');
    } catch (e) {
      await errorAlert('Error', e?.response?.data?.message || 'No se pudo actualizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="mb-3">Dashboard</h1>
      <div className="card glass p-3" style={{ display: 'grid', gap: 12 }}>
        <p>Panel principal</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label htmlFor="free-count">Cantidad FREE aleatoria:</label>
          <input
            id="free-count"
            type="number"
            min={0}
            value={count}
            onChange={(e)=>setCount(e.target.value)}
            style={{ width: 120 }}
          />
          <button className="btn btn-secondary" onClick={randomize} disabled={loading}>
            {loading ? 'Procesando…' : 'Randomizar FREE'}
          </button>
        </div>
      </div>
    </>
  );
}
