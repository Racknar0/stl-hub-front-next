'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useStore from '../../../store/useStore';
import HttpService from '@/services/HttpService';
import { successAlert, errorAlert } from '@/helpers/alerts';
import TopDownloadsCard from '@/components/dashboard/modules/TopDownloadsCard/TopDownloadsCard';
import AssetsSubidos from '@/components/dashboard/modules/AssetsSubidos/AssetsSubidos';
import TotalArchivo from '@/components/dashboard/modules/TotalArchivo/TotalArchivo';
import TotalUsers from '@/components/dashboard/modules/TotalUsers/TotalUsers';
import ConexionesHoy from '@/components/dashboard/modules/ConexionesHoy/ConexionesHoy';
import Storage from '@/components/dashboard/modules/Storage/Storage';
import TotalDescargas from '@/components/dashboard/modules/TotalDescargas/TotalDescargas';
import TotalVisitas from '@/components/dashboard/modules/TotalVisitas/TotalVisitas';
import TotalRegistros from '@/components/dashboard/modules/TotalRegistros/TotalRegistros';
import ReportsCard from '@/components/dashboard/modules/ReportsCard/ReportsCard';
import TotalVentas from '@/components/dashboard/modules/TotalVentas/TotalVentas';

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
      <div className=" p-3" style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
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
        <div style={{display:'flex',gap:8,marginBottom:8,justifyContent:'center',flexWrap:'wrap'}}>
          <AssetsSubidos />
          <TotalArchivo value={1234} />
          <TotalUsers />
          <ConexionesHoy value={42} />
          <Storage />
          <TotalDescargas value={98765} />
          <TotalVisitas value={54321} />
          <TotalRegistros value={4321} />
        </div>

        <div className='d-flex justify-content-start' style={{gap:12,width:'100%'}}>
            <TopDownloadsCard />
              <ReportsCard />
              <TotalVentas />
        </div>

      </div>
    </>
  );
}
