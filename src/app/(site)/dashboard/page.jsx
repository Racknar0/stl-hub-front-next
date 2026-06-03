'use client';
import React, { useEffect, useRef, useState } from 'react';
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


import TotalRegistros from '@/components/dashboard/modules/TotalRegistros/TotalRegistros';
import ReportsCard from '@/components/dashboard/modules/ReportsCard/ReportsCard';
import TotalVentas from '@/components/dashboard/modules/TotalVentas/TotalVentas';
import LastChecksCard from '@/components/dashboard/modules/LastChecksCard/LastChecksCard';
import TaxonomyCountsCard from '@/components/dashboard/modules/TaxonomyCountsCard/TaxonomyCountsCard';
import SearchInsightsCard from '@/components/dashboard/modules/SearchInsightsCard/SearchInsightsCard';
import SiteTraffic from '@/components/dashboard/modules/SiteTraffic/SiteTraffic';
import TrafficCharts from '@/components/dashboard/modules/TrafficCharts/TrafficCharts';
import GiftCodes from '@/components/dashboard/modules/GiftCodes/GiftCodes';
import RecentDownloadsCard from '@/components/dashboard/modules/RecentDownloadsCard/RecentDownloadsCard';
import RecentSearchesCard from '@/components/dashboard/modules/RecentSearchesCard/RecentSearchesCard';


export default function Page() {
  const router = useRouter();
  const token = useStore((s) => s.token);
  const roleId = useStore((s) => s.roleId);
  const hydrateToken = useStore((s) => s.hydrateToken);
  const hydrated = useStore((s) => s.hydrated);

  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const copyTimerRef = useRef(null);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    slug: '',
    source: '',
    medium: 'cpc',
    content: '',
    term: '',
    landingPath: '/',
    notes: '',
  });
  const campaignFieldLabels = {
    name: 'Nombre',
    slug: 'Slug de campana',
    source: 'Fuente (utm_source)',
    medium: 'Medio (utm_medium)',
    content: 'Contenido (utm_content)',
    term: 'Termino (utm_term)',
    landingPath: 'Landing Path',
    notes: 'Notas',
  };
  const http = new HttpService();

  useEffect(() => { hydrateToken() }, [hydrateToken]);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const tab = String(new URLSearchParams(window.location.search).get('tab') || '').toLowerCase();
      if (tab === 'campaigns') setActiveTab('campaigns');
      if (tab === 'traffic') setActiveTab('traffic');
      if (tab === 'gift-codes') setActiveTab('gift-codes');
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return; // esperar hidratación
    if (!token || roleId !== 2) router.replace('/login');
  }, [hydrated, token, roleId, router]);

  const loadCampaigns = async () => {
    try {
      setCampaignsLoading(true);
      const res = await http.getData('/admin/marketing/campaigns');
      setCampaigns(Array.isArray(res?.data?.items) ? res.data.items : []);
    } catch (e) {
      await errorAlert('Error', e?.response?.data?.message || 'No se pudieron cargar las campanas');
    } finally {
      setCampaignsLoading(false);
    }
  };

  const onCreateCampaign = async (e) => {
    e.preventDefault();
    const missing = Object.entries(campaignFieldLabels)
      .filter(([key]) => !String(campaignForm?.[key] || '').trim())
      .map(([, label]) => label);

    if (missing.length) {
      await errorAlert('Campos obligatorios', `Completa estos campos: ${missing.join(', ')}`);
      return;
    }

    try {
      setCampaignSaving(true);
      await http.postData('/admin/marketing/campaigns', campaignForm);
      await successAlert('Campana creada', 'Tu campana publicitaria fue creada con exito');
      setCampaignForm({
        name: '',
        slug: '',
        source: '',
        medium: 'cpc',
        content: '',
        term: '',
        landingPath: '/',
        notes: '',
      });
      await loadCampaigns();
    } catch (e2) {
      await errorAlert('Error', e2?.response?.data?.message || 'No se pudo crear la campana');
    } finally {
      setCampaignSaving(false);
    }
  };

  const onToggleCampaignActive = async (campaign) => {
    try {
      await http.putData('/admin/marketing/campaigns', campaign.id, {
        isActive: !campaign.isActive,
      });
      await loadCampaigns();
    } catch (e) {
      await errorAlert('Error', e?.response?.data?.message || 'No se pudo actualizar la campana');
    }
  };

  const copyTrackingUrl = async (campaignId, url) => {
    if (!url) {
      setCopyFeedback({ id: campaignId, ok: false });
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopyFeedback(null), 1400);
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback({ id: campaignId, ok: true });
    } catch {
      setCopyFeedback({ id: campaignId, ok: false });
    }

    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyFeedback(null), 1400);
  };

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const getCopyTooltipText = (campaignId) => {
    if (!copyFeedback || copyFeedback.id !== campaignId) return '';
    return copyFeedback.ok ? 'Copiado' : 'No se pudo copiar';
  };

  const isCopyFeedbackVisible = (campaignId) => {
    return Boolean(copyFeedback && copyFeedback.id === campaignId);
  };

  const getCopyFeedbackClass = (campaignId) => {
    if (!copyFeedback || copyFeedback.id !== campaignId) return '';
    return copyFeedback.ok ? 'is-success' : 'is-error';
  };

  useEffect(() => {
    if (activeTab !== 'campaigns') {
      setCopyFeedback(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'campaigns') {
      loadCampaigns();
    }
  }, [activeTab]);

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

  const toPct = (part, total) => {
    const p = Number(part || 0);
    const t = Number(total || 0);
    if (!Number.isFinite(p) || !Number.isFinite(t) || t <= 0) return '0%';
    return `${((p / t) * 100).toFixed(1)}%`;
  };

  const formatCop = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const InfoLabel = ({ label, tip }) => (
    <span className="field-head">
      <span>{label}</span>
      <span className="field-help" tabIndex={0} role="note" aria-label={`Info: ${label}`}>
        <span className="field-help-icon" aria-hidden>i</span>
        <span className="field-help-tooltip">{tip}</span>
      </span>
    </span>
  );

  return (
    <section className="dashboard-page-theme">
      <h1 className="dashboard-title mb-3">Dashboard</h1>
      <div className="dashboard-page-content">
        <div className="dashboard-tabs" role="tablist" aria-label="Dashboard tabs">
          <button
            className={`dashboard-tab-btn ${activeTab === 'overview' ? 'is-active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          >
            Principal
          </button>
          <button
            className={`dashboard-tab-btn ${activeTab === 'campaigns' ? 'is-active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'campaigns'}
            onClick={() => setActiveTab('campaigns')}
          >
            Campanas publicitarias
          </button>
          <button
            className={`dashboard-tab-btn ${activeTab === 'traffic' ? 'is-active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'traffic'}
            onClick={() => setActiveTab('traffic')}
          >
            Tráfico
          </button>
          <button
            className={`dashboard-tab-btn ${activeTab === 'gift-codes' ? 'is-active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'gift-codes'}
            onClick={() => setActiveTab('gift-codes')}
          >
            🎁 Gift Codes
          </button>
        </div>

        {activeTab === 'traffic' && (
          <div className="dashboard-traffic-tab">
            <SiteTraffic />
            <TrafficCharts />
          </div>
        )}

        {activeTab === 'overview' && (
          <>
            <div className="dashboard-kpi-row">
              <AssetsSubidos />
              <TotalArchivo value={1234} />
              <TotalUsers />
              <ConexionesHoy value={42} />
              <Storage />
              <TotalRegistros value={4321} />
            </div>

            <div className="dashboard-cards-wrap">
              <div className="dashboard-card-cell"><TaxonomyCountsCard /></div>
              <div className="dashboard-card-cell"><SearchInsightsCard /></div>
              <div className="dashboard-card-cell"><LastChecksCard /></div>
              <div className="dashboard-card-cell"><TopDownloadsCard /></div>
              <div className="dashboard-card-cell"><RecentDownloadsCard /></div>
              <div className="dashboard-card-cell"><RecentSearchesCard /></div>
              <div className="dashboard-card-cell"><ReportsCard /></div>
              <div className="dashboard-card-cell"><TotalVentas /></div>
            </div>
          </>
        )}

        {activeTab === 'campaigns' && (
          <div className="campaigns-grid">
            <section className="campaign-card">
              <h3>Crear campana</h3>
              <form onSubmit={onCreateCampaign} className="campaign-form">
                <label>
                  <InfoLabel
                    label="Nombre"
                    tip="Nombre interno para identificar esta campana en tu panel. Ejemplo: Promo Abril TikTok Colombia."
                  />
                  <input
                    type="text"
                    required
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm((v) => ({ ...v, name: e.target.value }))}
                    placeholder="Ej: Promo Abril TikTok"
                  />
                </label>
                <label>
                  <InfoLabel
                    label="Slug de campana (utm_campaign)"
                    tip="Es el identificador clave para comparar resultados. Recomendado: minusculas, sin espacios, con guiones. Ejemplo: promo-abril-tiktok."
                  />
                  <input
                    type="text"
                    required
                    value={campaignForm.slug}
                    onChange={(e) => setCampaignForm((v) => ({ ...v, slug: e.target.value }))}
                    placeholder="Ej: promo-abril-tiktok"
                  />
                </label>
                <label>
                  <InfoLabel
                    label="Fuente (utm_source)"
                    tip="Canal de origen del trafico. Ejemplos: tiktok, meta, google, youtube, influencer-juan."
                  />
                  <input
                    type="text"
                    required
                    value={campaignForm.source}
                    onChange={(e) => setCampaignForm((v) => ({ ...v, source: e.target.value }))}
                    placeholder="Ej: tiktok"
                  />
                </label>
                <label>
                  <InfoLabel
                    label="Medio (utm_medium)"
                    tip="Tipo de trafico. Ejemplos: cpc (pago por clic), paid-social, organic-social, email, referral."
                  />
                  <input
                    type="text"
                    required
                    value={campaignForm.medium}
                    onChange={(e) => setCampaignForm((v) => ({ ...v, medium: e.target.value }))}
                    placeholder="Ej: cpc"
                  />
                </label>
                <label>
                  <InfoLabel
                    label="Contenido (utm_content)"
                    tip="Sirve para diferenciar creatividad/anuncio. Ejemplos: video-1, carrusel-a, banner-home."
                  />
                  <input
                    type="text"
                    required
                    value={campaignForm.content}
                    onChange={(e) => setCampaignForm((v) => ({ ...v, content: e.target.value }))}
                    placeholder="Ej: video-1"
                  />
                </label>
                <label>
                  <InfoLabel
                    label="Termino (utm_term)"
                    tip="Usalo para marcar la intencion exacta o segmento de ese anuncio: keyword, interes, adset o audiencia. Te ayuda a comparar cual sub-segmento funciona mejor dentro de la misma campana. Ejemplos: keyword-dragon, audience-cosplay-beginners, interest-resin-miniatures."
                  />
                  <input
                    type="text"
                    required
                    value={campaignForm.term}
                    onChange={(e) => setCampaignForm((v) => ({ ...v, term: e.target.value }))}
                    placeholder="Ej: dragon-stl"
                  />
                </label>
                <label>
                  <InfoLabel
                    label="Landing Path"
                    tip="Ruta de destino en tu web. Ejemplos: /, /search, /suscripcion. Siempre mejor una ruta real de conversión."
                  />
                  <input
                    type="text"
                    required
                    value={campaignForm.landingPath}
                    onChange={(e) => setCampaignForm((v) => ({ ...v, landingPath: e.target.value }))}
                    placeholder="Ej: / o /search"
                  />
                </label>
                <label>
                  <InfoLabel
                    label="Notas"
                    tip="Contexto operativo para tu equipo: pais, presupuesto diario, objetivo, publico, fechas, etc."
                  />
                  <textarea
                    required
                    value={campaignForm.notes}
                    onChange={(e) => setCampaignForm((v) => ({ ...v, notes: e.target.value }))}
                    placeholder="Objetivo, presupuesto, audiencia..."
                    rows={3}
                  />
                </label>
                <button className="btn btn-primary" type="submit" disabled={campaignSaving}>
                  {campaignSaving ? 'Guardando...' : 'Crear campana'}
                </button>
              </form>
            </section>

            <section className="campaign-card">
              <h3>Campañas creadas</h3>
              {campaignsLoading && <p>Cargando campanas...</p>}
              {!campaignsLoading && campaigns.length === 0 && <p>No hay campanas todavia.</p>}
              {!campaignsLoading && campaigns.length > 0 && (
                <div className="campaign-list">
                  {campaigns.map((item) => {
                    const visits = Number(item?.stats?.visits || 0);
                    const registrations = Number(item?.stats?.registrations || 0);
                    const purchases = Number(item?.stats?.purchases || 0);

                    const visitsToday = Number(item?.statsToday?.visits || 0);
                    const registrationsToday = Number(item?.statsToday?.registrations || 0);
                    const purchasesToday = Number(item?.statsToday?.purchases || 0);

                    return (
                    <article key={item.id} className="campaign-item">
                      <div className="campaign-item-head">
                        <strong>{item.name}</strong>
                        <button
                          className={`campaign-status-btn ${item.isActive ? 'is-active' : 'is-inactive'}`}
                          type="button"
                          onClick={() => onToggleCampaignActive(item)}
                        >
                          {item.isActive ? 'Activa' : 'Inactiva'}
                        </button>
                      </div>
                      <div className="campaign-meta">
                        <span>utm_campaign: {item.slug}</span>
                        <span>source: {item.source || '-'}</span>
                        <span>medium: {item.medium || '-'}</span>
                      </div>
                      
                      <div className="campaign-stats-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '1rem',
                        marginTop: '1rem',
                        marginBottom: '1.5rem'
                      }}>
                        <div className="campaign-stats-col" style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                          <h4 style={{ margin: '0 0 0.75rem 0', color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hoy (UTC-5)</h4>
                          <div className="campaign-stats" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                            <span>Visitas: {visitsToday}</span>
                            <span>Unicos: {item?.statsToday?.uniqueVisitors || 0}</span>
                            <span>Registros: {registrationsToday}</span>
                            <span>Compras: {purchasesToday}</span>
                            <span>Ingresos: {formatCop(item?.statsToday?.revenue || 0)}</span>
                          </div>
                          <div className="campaign-rates" style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: '#888' }}>
                            <span>Visita {'->'} Registro: {toPct(registrationsToday, visitsToday)}</span>
                            <span>Visita {'->'} Compra: {toPct(purchasesToday, visitsToday)}</span>
                            <span>Registro {'->'} Compra: {toPct(purchasesToday, registrationsToday)}</span>
                          </div>
                        </div>

                        <div className="campaign-stats-col" style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                          <h4 style={{ margin: '0 0 0.75rem 0', color: '#10b981', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Histórico</h4>
                          <div className="campaign-stats" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                            <span>Visitas: {visits}</span>
                            <span>Unicos: {item?.stats?.uniqueVisitors || 0}</span>
                            <span>Registros: {registrations}</span>
                            <span>Compras: {purchases}</span>
                            <span>Ingresos: {formatCop(item?.stats?.revenue || 0)}</span>
                          </div>
                          <div className="campaign-rates" style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: '#888' }}>
                            <span>Visita {'->'} Registro: {toPct(registrations, visits)}</span>
                            <span>Visita {'->'} Compra: {toPct(purchases, visits)}</span>
                            <span>Registro {'->'} Compra: {toPct(purchases, registrations)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="campaign-url">
                        <input type="text" readOnly value={item.trackingUrl || ''} />
                        <div className="copy-url-wrap">
                          <button
                            className="copy-url-btn"
                            type="button"
                            onClick={() => copyTrackingUrl(item.id, item.trackingUrl || '')}
                          >
                            Copiar URL
                          </button>
                          <span
                            className={`copy-url-tooltip ${isCopyFeedbackVisible(item.id) ? 'is-visible' : ''} ${getCopyFeedbackClass(item.id)}`}
                            role="status"
                            aria-live="polite"
                          >
                            {getCopyTooltipText(item.id)}
                          </span>
                        </div>
                      </div>
                    </article>
                  )})}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'gift-codes' && (
          <div className="dashboard-traffic-tab">
            <GiftCodes />
          </div>
        )}
      </div>
    </section>
  );
}
