"use client";
import React, { useState, useCallback } from 'react'
import './Account.scss'
import Button from '../../../components/layout/Buttons/Button';
import axiosInstance from '../../../services/AxiosInterceptor';
import HttpService from '../../../services/HttpService';
import AssetModal from '../../../components/common/AssetModal/AssetModal';
import { useRouter } from 'next/navigation';
import useStore from '../../../store/useStore';
import useResolvedLanguage from '../../../hooks/useResolvedLanguage';

const Account = () => {
  const token = useStore(s=>s.token);
  const resolvedLanguage = useResolvedLanguage();
  const isEn = resolvedLanguage === 'en';
  const router = useRouter();
  const homeHref = isEn ? '/en' : '/';
  const accountPath = isEn ? '/en/account' : '/account';
  const subscriptionHref = isEn ? '/en/suscripcion' : '/suscripcion';
  const dateLocale = isEn ? 'en-US' : 'es-ES';
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
  const [dlTotal, setDlTotal] = useState(0);
  const [dlPage, setDlPage] = useState(1);
  const [dlLoading, setDlLoading] = useState(false);
  const DL_PAGE_SIZE = 20;
  const [stats, setStats] = React.useState({ totalDownloads: 0, topCategories: [] });
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalAsset, setModalAsset] = React.useState(null);

  // Gift code redeem
  const [redeemCode, setRedeemCode] = React.useState('');
  const [redeemLoading, setRedeemLoading] = React.useState(false);
  const [redeemMsg, setRedeemMsg] = React.useState(null); // { type: 'ok'|'err', text }

  const onRedeemCode = async () => {
    if (!redeemCode.trim()) return;
    setRedeemLoading(true);
    setRedeemMsg(null);
    try {
      const http = new HttpService();
      const res = await http.postData('/gift-codes/redeem', { code: redeemCode.trim() });
      setRedeemMsg({
        type: 'ok',
        text: isEn
          ? `✓ Code redeemed! You received ${res?.data?.daysGranted || '?'} premium days.`
          : `✓ ¡Código canjeado! Recibiste ${res?.data?.daysGranted || '?'} días premium.`,
      });
      setRedeemCode('');
      // Reload profile to reflect new subscription
      try {
        const p = await axiosInstance.get('/me/profile');
        setProfile(p.data);
      } catch {}
    } catch (e) {
      setRedeemMsg({
        type: 'err',
        text: e?.response?.data?.message || (isEn ? 'Could not redeem code' : 'No se pudo canjear el código'),
      });
    } finally {
      setRedeemLoading(false);
    }
  };

  const fetchDownloads = useCallback(async (page = 1) => {
    setDlLoading(true);
    try {
      const d = await axiosInstance.get(`/me/downloads?page=${page}&pageSize=${DL_PAGE_SIZE}`);
      setDownloads(d.data?.data || []);
      setDlTotal(d.data?.total || 0);
      setDlPage(page);
    } catch (e) {
      console.warn('Downloads load error', e?.response?.data || e.message);
    } finally { setDlLoading(false); }
  }, []);

  React.useEffect(()=>{
    let mounted = true;
    async function load(){
      try {
        setLoading(true);
        const [p, d, s] = await Promise.all([
          axiosInstance.get('/me/profile'),
          axiosInstance.get(`/me/downloads?page=1&pageSize=${DL_PAGE_SIZE}`),
          axiosInstance.get('/me/stats'),
        ]);
        if (!mounted) return;
        setProfile(p.data);
        setDownloads(d.data?.data || []);
        setDlTotal(d.data?.total || 0);
        setDlPage(1);
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
      router.push(subscriptionHref);
    };

  return (
    <section className="account container-narrow">
      <div className="account-breadcrumb">
        <Button as="a" href={homeHref} variant="purple" styles={{width:'auto', padding:'0 .9rem'}}>
          {isEn ? 'Home' : 'Inicio'}
        </Button>
        <span className="path">{accountPath}</span>
      </div>

      <div className="account-grid">
        <div className="card">
          <h4>{isEn ? 'My subscription' : 'Mi suscripción'}</h4>
          {loading && <p>{isEn ? 'Loading...' : 'Cargando...'}</p>}
          {profile && (
            <>
              <p><strong>{isEn ? 'Email' : 'Email'}:</strong> {profile.email}</p>
              <p><strong>{isEn ? 'Registered' : 'Registro'}:</strong> {new Date(profile.createdAt).toLocaleDateString(dateLocale)}</p>
              <p><strong>{isEn ? 'Status' : 'Estado'}:</strong> {profile.subscription?.status}</p>
              <p><strong>{isEn ? 'Expires' : 'Expira'}:</strong> {profile.subscription?.currentPeriodEnd ? new Date(profile.subscription.currentPeriodEnd).toLocaleString(dateLocale) : '-'}</p>
              <p><strong>{isEn ? 'Days remaining' : 'Días restantes'}:</strong> {profile.subscription?.daysRemaining ?? 0}</p>
              <div style={{display:'flex', gap:'.5rem', flexWrap:'wrap'}}>
                <button className="btn-pill fill mt-4" onClick={onOpenPlans}>
                  {isEn ? 'Top up days' : 'Recargar días'}
                </button>
              </div>
            </>
          )}

          {/* Gift Code Redeem */}
          <div className="gift-redeem-section">
            <h5>{isEn ? '🎁 Redeem a gift code' : '🎁 Canjear código de regalo'}</h5>
            <div className="gift-redeem-row">
              <input
                type="text"
                value={redeemCode}
                onChange={(e) => { setRedeemCode(e.target.value.toUpperCase()); setRedeemMsg(null); }}
                placeholder={isEn ? 'Enter your code' : 'Ingresa tu código'}
                maxLength={30}
                disabled={redeemLoading}
              />
              <button
                className="btn-pill fill"
                onClick={onRedeemCode}
                disabled={redeemLoading || !redeemCode.trim()}
              >
                {redeemLoading
                  ? (isEn ? 'Redeeming...' : 'Canjeando...')
                  : (isEn ? 'Redeem' : 'Canjear')}
              </button>
            </div>
            {redeemMsg && (
              <p className={`redeem-msg ${redeemMsg.type === 'ok' ? 'is-ok' : 'is-err'}`}>
                {redeemMsg.text}
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <h4>{isEn ? 'Activity' : 'Actividad'}</h4>
          <div className="kpis">
            <div className="kpi"><div style={{fontWeight:800, fontSize:'1.3rem'}}>{stats.totalDownloads}</div><div>{isEn ? 'Total downloads' : 'Total descargas'}</div></div>
            <div className="kpi"><div style={{fontWeight:800, fontSize:'1.3rem'}}>{profile?.subscription?.daysRemaining ?? 0}</div><div>{isEn ? 'Days remaining' : 'Días restantes'}</div></div>
            <div className="kpi"><div style={{fontWeight:800, fontSize:'1.3rem'}}>—</div><div>{isEn ? 'Top categories' : 'Top categorías'}</div></div>
          </div>

          {stats.topCategories?.length ? (
            <ul style={{display:'flex', flexWrap:'wrap', gap:'.5rem', marginTop:'.5rem'}}>
              {stats.topCategories.map(c => (
                <li key={c.id} className="chip">{c.name} ({c.count})</li>
              ))}
            </ul>
          ) : null}

          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'1rem'}}>
            <h5 style={{margin:0}}>{isEn ? 'Download history' : 'Historial de descargas'}</h5>
            {dlTotal > DL_PAGE_SIZE && (
              <div style={{display:'flex', alignItems:'center', gap:'.4rem'}}>
                <button
                  className="btn-pill outline"
                  style={{padding:'.2rem .5rem', fontSize:'.8rem', minWidth:'auto'}}
                  disabled={dlPage <= 1 || dlLoading}
                  onClick={() => fetchDownloads(dlPage - 1)}
                >←</button>
                <span style={{fontSize:'.8rem', color:'#818199'}}>
                  {dlPage} / {Math.ceil(dlTotal / DL_PAGE_SIZE)}
                </span>
                <button
                  className="btn-pill outline"
                  style={{padding:'.2rem .5rem', fontSize:'.8rem', minWidth:'auto'}}
                  disabled={dlPage >= Math.ceil(dlTotal / DL_PAGE_SIZE) || dlLoading}
                  onClick={() => fetchDownloads(dlPage + 1)}
                >→</button>
              </div>
            )}
          </div>
          {dlLoading ? (
            <p style={{color:'#818199', textAlign:'center', padding:'.5rem 0'}}>{isEn ? 'Loading...' : 'Cargando...'}</p>
          ) : downloads?.length ? (
            <ul>
              {downloads.map((it, index) => (
                <li key={index} style={{display:'flex', alignItems:'center', gap:'.6rem', justifyContent:'space-between', padding:'.4rem 0', borderBottom:'1px dashed #eee'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'.6rem'}}>
                    {it.image ? <img src={imgUrl(it.image)} alt={it.title} style={{width:48, height:48, objectFit:'cover', borderRadius:8}}/> : <div style={{width:48, height:48, background:'#eee', borderRadius:8}}/>}
                    <div>
                      <div style={{fontWeight:600}}>{it.title}</div>
                      <div style={{color:'#818199', fontSize:'.85rem'}}>{new Date(it.downloadedAt).toLocaleString(dateLocale)}</div>
                    </div>
                  </div>
                  <button className="btn-pill outline w-25" onClick={()=>onClickSeeAsset(it.id)}>
                    {isEn ? 'View' : 'Ver'}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{color:'#818199'}}>{isEn ? 'No downloads available.' : 'Sin descargas disponibles.'}</p>
          )}
        </div>
      </div>

        <AssetModal open={modalOpen} onClose={()=>setModalOpen(false)} asset={modalAsset} />
    </section>
  )
}

export default Account
