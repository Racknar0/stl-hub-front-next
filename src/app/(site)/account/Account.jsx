"use client";
import React from 'react'
import './Account.scss'
import Button from '../../../components/layout/Buttons/Button';
import axiosInstance from '../../../services/AxiosInterceptor';
import AssetModal from '../../../components/common/AssetModal/AssetModal';
import { useRouter } from 'next/navigation';
import useStore from '../../../store/useStore';

const Account = () => {
  const token = useStore(s=>s.token);
  const router = useRouter();
  const UPLOAD_BASE = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads';
  const imgUrl = (rel) => {
    if (!rel) return '';
    const s = String(rel).trim();
    if (/^https?:\/\//i.test(s)) return s;
    const clean = s.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${UPLOAD_BASE}/${clean}`;
  };
  const [profile, setProfile] = React.useState(null);
  const [downloads, setDownloads] = React.useState([]);
  const [stats, setStats] = React.useState({ totalDownloads: 0, topCategories: [] });
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalAsset, setModalAsset] = React.useState(null);

  React.useEffect(()=>{
    let mounted = true;
    async function load(){
      try {
        setLoading(true);
        const [p, d, s] = await Promise.all([
          axiosInstance.get('/me/profile'),
          axiosInstance.get('/me/downloads'),
          axiosInstance.get('/me/stats'),
        ]);
        if (!mounted) return;
        setProfile(p.data);
        setDownloads(d.data || []);
        setStats(s.data || { totalDownloads: 0, topCategories: [] });
      } catch (e) {
        console.warn('Account load error', e?.response?.data || e.message);
      } finally { setLoading(false); }
    }
    if (token) load();
    return ()=>{ mounted = false };
  }, [token]);

  const onClickSeeAsset = async (assetId)=>{
    try {
      const res = await axiosInstance.get(`/assets/${assetId}`);
      setModalAsset(res.data);
      setModalOpen(true);
    } catch (e) {
      console.warn('Asset fetch error', e?.response?.data || e.message);
    }
  };

    // Navegar a /suscripcion sin refrescar (Next Router)
    const onOpenPlans = () => {
      router.push('/suscripcion');
    };

  return (
    <section className="account container-narrow">
      <div className="account-breadcrumb">
        <Button as="a" href="/" variant="purple" styles={{width:'auto', padding:'0 .9rem'}}>Inicio</Button>
        <span className="path">/account</span>
      </div>

      <div className="account-grid">
        <div className="card">
          <h4>Mi suscripción</h4>
          {loading && <p>Cargando...</p>}
          {profile && (
            <>
              <p><strong>Email:</strong> {profile.email}</p>
              <p><strong>Registro:</strong> {new Date(profile.createdAt).toLocaleDateString()}</p>
              <p><strong>Estado:</strong> {profile.subscription?.status}</p>
              <p><strong>Expira:</strong> {profile.subscription?.currentPeriodEnd ? new Date(profile.subscription.currentPeriodEnd).toLocaleString() : '-'}</p>
              <p><strong>Días restantes:</strong> {profile.subscription?.daysRemaining ?? 0}</p>
              <div style={{display:'flex', gap:'.5rem', flexWrap:'wrap'}}>
                <button className="btn-pill fill mt-4" onClick={onOpenPlans}>Recargar días</button>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <h4>Actividad</h4>
          <div className="kpis">
            <div className="kpi"><div style={{fontWeight:800, fontSize:'1.3rem'}}>{stats.totalDownloads}</div><div>Total descargas</div></div>
            <div className="kpi"><div style={{fontWeight:800, fontSize:'1.3rem'}}>{profile?.subscription?.daysRemaining ?? 0}</div><div>Días restantes</div></div>
            <div className="kpi"><div style={{fontWeight:800, fontSize:'1.3rem'}}>—</div><div>Top categorías</div></div>
          </div>

          {stats.topCategories?.length ? (
            <ul style={{display:'flex', flexWrap:'wrap', gap:'.5rem', marginTop:'.5rem'}}>
              {stats.topCategories.map(c => (
                <li key={c.id} className="chip">{c.name} ({c.count})</li>
              ))}
            </ul>
          ) : null}

          <h5 style={{marginTop:'1rem'}}>Historial de descargas</h5>
          {downloads?.length ? (
            <ul>
              {downloads.map((it, index) => (
                <li key={index} style={{display:'flex', alignItems:'center', gap:'.6rem', justifyContent:'space-between', padding:'.4rem 0', borderBottom:'1px dashed #eee'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'.6rem'}}>
                    {it.image ? <img src={imgUrl(it.image)} alt={it.title} style={{width:48, height:48, objectFit:'cover', borderRadius:8}}/> : <div style={{width:48, height:48, background:'#eee', borderRadius:8}}/>}
                    <div>
                      <div style={{fontWeight:600}}>{it.title}</div>
                      <div style={{color:'#818199', fontSize:'.85rem'}}>{new Date(it.downloadedAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <button className="btn-pill outline w-25" onClick={()=>onClickSeeAsset(it.id)}>Ver</button>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{color:'#818199'}}>Sin descargas disponibles.</p>
          )}
        </div>
      </div>

        <AssetModal open={modalOpen} onClose={()=>setModalOpen(false)} asset={modalAsset} />
    </section>
  )
}

export default Account
