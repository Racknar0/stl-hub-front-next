'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useStore from '../../../../store/useStore';
import HttpService from '@/services/HttpService';
import { successAlert, errorAlert } from '@/helpers/alerts';
import './system-config.scss';
import { CONFIG_SECTIONS, ConfigHelp, configSection } from './configSections';
import SettingEditor from './SettingEditor';
import { Switch } from '@mui/material';

export default function SystemConfigPage() {
  const router = useRouter();
  const token = useStore((s) => s.token);
  const roleId = useStore((s) => s.roleId);
  const hydrateToken = useStore((s) => s.hydrateToken);
  const hydrated = useStore((s) => s.hydrated);

  const [settings, setSettings] = useState([]);
  const [activeSection, setActiveSection] = useState('access');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  
  // Local state for editing values
  const [editValues, setEditValues] = useState({});
  const [editDescriptions, setEditDescriptions] = useState({});

  // Plan prices state
  const DEFAULT_PLAN_PRICES = { '1m': '5.00', '3m': '10.00', '6m': '17.00', '12m': '25.00' };
  const [planPrices, setPlanPrices] = useState(DEFAULT_PLAN_PRICES);

  // Email test states
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState(null); // 'success' | 'error'
  const [testEmailError, setTestEmailError] = useState(null);
  const [testEmailMessageId, setTestEmailMessageId] = useState('');

  const http = new HttpService();

  useEffect(() => { hydrateToken() }, [hydrateToken]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token || roleId !== 2) {
      router.replace('/login');
      return;
    }
    loadSettings();
  }, [hydrated, token, roleId, router]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await http.getData('/admin/settings');
      const data = res.data || [];
      setSettings(data);
      
      const values = {};
      const descs = {};
      data.forEach(s => {
        values[s.key] = s.value;
        descs[s.key] = s.description || '';
      });
      
      // Ensure FREEBIES_DAILY_COUNT exists in local state even if not in DB yet
      if (!values['FREEBIES_DAILY_COUNT']) {
        values['FREEBIES_DAILY_COUNT'] = '40';
        descs['FREEBIES_DAILY_COUNT'] = 'Cantidad de freebies diarios que se seleccionaran aleatoriamente en el sistema.';
      }
      if (!values['FREEBIES_ROLLS_COUNT']) {
        values['FREEBIES_ROLLS_COUNT'] = '3';
        descs['FREEBIES_ROLLS_COUNT'] = 'Cantidad de tiradas de dados permitidas al día para el minijuego de freebies.';
      }

      // Ensure download limits exist in local state even if not in DB
      if (!values['LIMIT_FREE_PASS_FREE_DOWNLOADS']) {
        values['LIMIT_FREE_PASS_FREE_DOWNLOADS'] = '100';
        descs['LIMIT_FREE_PASS_FREE_DOWNLOADS'] = 'Límite diario de descargas para usuarios gratuitos cuando el Premium Free Pass está activo.';
      }
      if (!values['LIMIT_NORMAL_FREE_DOWNLOADS']) {
        values['LIMIT_NORMAL_FREE_DOWNLOADS'] = '50';
        descs['LIMIT_NORMAL_FREE_DOWNLOADS'] = 'Límite diario de descargas de archivos gratuitos para usuarios sin suscripción en modo normal.';
      }
      if (!values['LIMIT_SUBSCRIBED_DOWNLOADS']) {
        values['LIMIT_SUBSCRIBED_DOWNLOADS'] = '500';
        descs['LIMIT_SUBSCRIBED_DOWNLOADS'] = 'Límite diario de descargas para usuarios con suscripción de pago activa.';
      }
      
      setEditValues(values);
      setEditDescriptions(descs);

      // Parse PLAN_PRICES if exists
      if (values['PLAN_PRICES']) {
        try {
          const parsed = JSON.parse(values['PLAN_PRICES']);
          if (parsed && typeof parsed === 'object') {
            setPlanPrices({ ...DEFAULT_PLAN_PRICES, ...parsed });
          }
        } catch {}
      }
    } catch (e) {
      console.error(e);
      await errorAlert('Error', 'No se pudieron cargar las configuraciones del sistema.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key) => {
    try {
      setSavingKey(key);
      const value = editValues[key];
      const description = editDescriptions[key];
      
      await http.putData('/admin/settings', key, { value, description });
      await successAlert('Guardado', `La configuracion ${key} ha sido actualizada.`);
      await loadSettings();
    } catch (e) {
      console.error(e);
      await errorAlert('Error', e?.response?.data?.error || 'No se pudo guardar la configuracion.');
    } finally {
      setSavingKey(null);
    }
  };

  const specialKeys = ['FREEBIES_DAILY_COUNT', 'FREEBIES_ROLLS_COUNT', 'LAUNCH_PROMO_ACTIVE', 'LAUNCH_PROMO_DAYS', 'LAUNCH_PROMO_START', 'PLAN_PRICES', 'LIMIT_FREE_PASS_FREE_DOWNLOADS', 'LIMIT_NORMAL_FREE_DOWNLOADS', 'LIMIT_SUBSCRIBED_DOWNLOADS'];
  const genericSettings = settings.filter(setting => !specialKeys.includes(setting.key));
  const selectedSection = CONFIG_SECTIONS.find(section => section.id === activeSection);
  if (!hydrated || !token || roleId !== 2) return null;

  return (
    <section className="system-config-page">
      <nav className="config-tabs" role="tablist" aria-label="Áreas de configuración">
        {CONFIG_SECTIONS.map(({ id, label, icon: Icon }, index) => (
          <button key={id} id={`config-tab-${id}`} type="button" role="tab" aria-selected={activeSection === id}
            aria-controls="config-panel" tabIndex={activeSection === id ? 0 : -1}
            className={activeSection === id ? 'is-active' : ''} onClick={() => setActiveSection(id)}
            onKeyDown={event => {
              let next = index;
              if (event.key === 'ArrowRight') next = (index + 1) % CONFIG_SECTIONS.length;
              else if (event.key === 'ArrowLeft') next = (index - 1 + CONFIG_SECTIONS.length) % CONFIG_SECTIONS.length;
              else if (event.key === 'Home') next = 0;
              else if (event.key === 'End') next = CONFIG_SECTIONS.length - 1;
              else return;
              event.preventDefault(); setActiveSection(CONFIG_SECTIONS[next].id);
              document.getElementById(`config-tab-${CONFIG_SECTIONS[next].id}`)?.focus();
            }}><Icon aria-hidden="true" />{label}</button>
        ))}
      </nav>
      <p className="config-section-description">{selectedSection.description}</p>
      <div className="dashboard-page-content" id="config-panel" role="tabpanel" aria-labelledby={`config-tab-${activeSection}`}>
        {loading ? (
          <div className="loading-state">Cargando configuraciones...</div>
        ) : (
          <div className="settings-grid">
            
            {activeSection === 'access' && <>
            {/* 🚀 Premium Free Pass */}
            <article className="setting-card">
              <div className="setting-header">
                <div className="icon-wrapper" style={{ background: editValues['LAUNCH_PROMO_ACTIVE'] === 'true' ? 'rgba(52,211,153,0.15)' : undefined, color: editValues['LAUNCH_PROMO_ACTIVE'] === 'true' ? '#34d399' : undefined }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2>Acceso premium gratuito</h2>
                <ConfigHelp compact>Permite que los usuarios registrados descarguen modelos premium sin suscripción durante la promoción.</ConfigHelp>
              </div>
              <div className="setting-body">
                <div className="config-row">
                  <label htmlFor="promo-enabled">Habilitar Free Pass</label>
                  <div className="config-row-control"><span className={editValues.LAUNCH_PROMO_ACTIVE === 'true' ? 'status-on' : 'status-off'}>{editValues.LAUNCH_PROMO_ACTIVE === 'true' ? 'Habilitado' : 'Deshabilitado'}</span>
                    <Switch id="promo-enabled" size="small" checked={editValues.LAUNCH_PROMO_ACTIVE === 'true'}
                      onChange={event => setEditValues(previous => ({ ...previous, LAUNCH_PROMO_ACTIVE: String(event.target.checked) }))} />
                  </div>
                </div>
                <div className="config-row">
                  <label htmlFor="promo-duration">Duración</label>
                  <div className="config-row-control">
                    <select id="promo-duration" value={editValues.LAUNCH_PROMO_DAYS && editValues.LAUNCH_PROMO_DAYS !== '0' ? 'days' : 'unlimited'}
                      onChange={event => setEditValues(previous => ({ ...previous, LAUNCH_PROMO_DAYS: event.target.value === 'unlimited' ? '0' : '7' }))}>
                      <option value="unlimited">Sin fecha límite</option><option value="days">Por días</option>
                    </select>
                    {editValues.LAUNCH_PROMO_DAYS && editValues.LAUNCH_PROMO_DAYS !== '0' && <input type="number" min="1" aria-label="Días de promoción" value={editValues.LAUNCH_PROMO_DAYS} onChange={event => setEditValues(previous => ({ ...previous, LAUNCH_PROMO_DAYS: event.target.value }))} className="config-days" />}
                  </div>
                </div>
                {editValues.LAUNCH_PROMO_ACTIVE === 'true' && editValues.LAUNCH_PROMO_START && (() => {
                  const start = new Date(editValues.LAUNCH_PROMO_START);
                  if (Number.isNaN(start.getTime())) return null;
                  const days = Number(editValues.LAUNCH_PROMO_DAYS || 0);
                  const remaining = Math.ceil(days - (Date.now() - start.getTime()) / 86400000);
                  const expired = days > 0 && remaining <= 0;
                  return <div className={`promo-timing ${expired ? 'is-expired' : ''}`}>
                    <span>Desde {start.toLocaleDateString('es-CO')}</span>
                    <strong>{days === 0 ? 'Sin vencimiento' : expired ? `Venció hace ${Math.abs(remaining)} días` : `${remaining} días restantes`}</strong>
                  </div>;
                })()}
              </div>
              <div className="setting-footer">
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    try {
                      setSavingKey('LAUNCH_PROMO');
                      // Save all 3 keys
                      await http.putData('/admin/settings', 'LAUNCH_PROMO_ACTIVE', { value: editValues['LAUNCH_PROMO_ACTIVE'] || 'false', description: 'Premium Free Pass: permite descargar gratis a usuarios registrados.' });
                      await http.putData('/admin/settings', 'LAUNCH_PROMO_DAYS', { value: editValues['LAUNCH_PROMO_DAYS'] || '0', description: 'Dias de duracion del Premium Free Pass (0 = ilimitado).' });
                      // Auto-set start date when activating
                      if (editValues['LAUNCH_PROMO_ACTIVE'] === 'true') {
                        await http.putData('/admin/settings', 'LAUNCH_PROMO_START', { value: new Date().toISOString(), description: 'Fecha de inicio del Premium Free Pass.' });
                      }
                      await successAlert('Guardado', 'El Premium Free Pass ha sido actualizado.');
                      await loadSettings();
                    } catch (e) {
                      console.error(e);
                      await errorAlert('Error', 'No se pudo guardar el Premium Free Pass.');
                    } finally {
                      setSavingKey(null);
                    }
                  }}
                  disabled={savingKey === 'LAUNCH_PROMO'}
                >
                  {savingKey === 'LAUNCH_PROMO' ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </article>

            {/* 📊 Límites de Descargas Diarias */}
            <article className="setting-card">
              <div className="setting-header">
                <div className="icon-wrapper" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2>Límites de descarga</h2>
                <ConfigHelp compact>Cuotas por usuario cada 24 horas desde su primera descarga. Free Pass permite acceder al catálogo premium; en modo normal, los usuarios gratuitos solo descargan freebies.</ConfigHelp>
              </div>
              <div className="setting-body">
                {[
                  ['LIMIT_FREE_PASS_FREE_DOWNLOADS', 'Gratis con Free Pass'],
                  ['LIMIT_NORMAL_FREE_DOWNLOADS', 'Gratis (modo normal)'],
                  ['LIMIT_SUBSCRIBED_DOWNLOADS', 'Suscriptores premium'],
                ].map(([key, label]) => <div className="config-row" key={key}>
                  <label htmlFor={`limit-${key}`}>{label}</label>
                  <div className="config-row-control"><input id={`limit-${key}`} type="number" min="0" value={editValues[key] || ''} onChange={event => setEditValues(previous => ({ ...previous, [key]: event.target.value }))} /><span className="config-unit">/ día</span></div>
                </div>)}
              </div>
              <div className="setting-footer">
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    try {
                      setSavingKey('DOWNLOAD_LIMITS');
                      await http.putData('/admin/settings', 'LIMIT_FREE_PASS_FREE_DOWNLOADS', {
                        value: editValues['LIMIT_FREE_PASS_FREE_DOWNLOADS'] || '100',
                        description: 'Limite diario de descargas para usuarios gratuitos cuando el Premium Free Pass esta activo.'
                      });
                      await http.putData('/admin/settings', 'LIMIT_NORMAL_FREE_DOWNLOADS', {
                        value: editValues['LIMIT_NORMAL_FREE_DOWNLOADS'] || '50',
                        description: 'Limite diario de descargas de archivos gratuitos para usuarios sin suscripcion en modo normal.'
                      });
                      await http.putData('/admin/settings', 'LIMIT_SUBSCRIBED_DOWNLOADS', {
                        value: editValues['LIMIT_SUBSCRIBED_DOWNLOADS'] || '500',
                        description: 'Limite diario de descargas para usuarios con suscripcion de pago activa.'
                      });
                      await successAlert('Guardado', 'Los límites de descargas diarias han sido actualizados.');
                      await loadSettings();
                    } catch (e) {
                      console.error(e);
                      await errorAlert('Error', 'No se pudieron guardar los límites de descarga.');
                    } finally {
                      setSavingKey(null);
                    }
                  }}
                  disabled={savingKey === 'DOWNLOAD_LIMITS'}
                >
                  {savingKey === 'DOWNLOAD_LIMITS' ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </article>

            </>}
            {activeSection === 'freebies' && <>
            {/* Freebies Daily Count Setting */}
            <article className="setting-card">
              <div className="setting-header">
                <div className="icon-wrapper">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2>Modelos gratuitos diarios</h2>
                <ConfigHelp compact>{editDescriptions['FREEBIES_DAILY_COUNT']}</ConfigHelp>
              </div>
              <div className="setting-body">
                <div className="form-group">
                  <label>Valor (Cantidad)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={editValues['FREEBIES_DAILY_COUNT'] || ''} 
                    onChange={(e) => setEditValues({...editValues, 'FREEBIES_DAILY_COUNT': e.target.value})}
                  />
                </div>
              </div>
              <div className="setting-footer">
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleSave('FREEBIES_DAILY_COUNT')}
                  disabled={savingKey === 'FREEBIES_DAILY_COUNT'}
                >
                  {savingKey === 'FREEBIES_DAILY_COUNT' ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </article>

            {/* Freebies Rolls Count Setting */}
            <article className="setting-card">
              <div className="setting-header">
                <div className="icon-wrapper" style={{ background: 'rgba(0, 255, 170, 0.15)', color: '#00ffaa' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                    <circle cx="16" cy="16" r="1.5" fill="currentColor"/>
                    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                  </svg>
                </div>
                <h2>Tiradas del minijuego</h2>
                <ConfigHelp compact>{editDescriptions['FREEBIES_ROLLS_COUNT']}</ConfigHelp>
              </div>
              <div className="setting-body">
                <div className="form-group">
                  <label>Valor (Tiradas)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="6"
                    value={editValues['FREEBIES_ROLLS_COUNT'] || ''} 
                    onChange={(e) => setEditValues({...editValues, 'FREEBIES_ROLLS_COUNT': e.target.value})}
                  />
                </div>
              </div>
              <div className="setting-footer">
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleSave('FREEBIES_ROLLS_COUNT')}
                  disabled={savingKey === 'FREEBIES_ROLLS_COUNT'}
                >
                  {savingKey === 'FREEBIES_ROLLS_COUNT' ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </article>

            </>}
            {activeSection === 'prices' && <>
            {/* 💰 Plan Prices */}
            <article className="setting-card">
              <div className="setting-header">
                <div className="icon-wrapper" style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2>Precios de suscripción</h2>
                <ConfigHelp compact>
                  Configura el precio de cada plan de suscripción. Los periodos (30, 90, 180, 365 días) son fijos.
                  El cambio se refleja <strong style={{ color: '#38bdf8' }}>inmediatamente</strong> en la pasarela de pago y en la página de pricing.
                </ConfigHelp>
              </div>
              <div className="setting-body">

                {[{ key: '1m', label: '30 Días', days: 30 }, { key: '3m', label: '90 Días', days: 90 }, { key: '6m', label: '180 Días', days: 180 }, { key: '12m', label: '365 Días', days: 365 }].map((plan) => {
                  const price = Number(planPrices[plan.key] || 0);
                  const months = plan.days / 30;
                  const monthly = months > 0 ? (price / months).toFixed(2) : '0.00';
                  const baseMonthly = Number(planPrices['1m'] || 5);
                  const fullPrice = baseMonthly * months;
                  const saved = Math.max(0, fullPrice - price).toFixed(2);
                  return (
                    <div key={plan.key} className="config-price-row">
                      <label style={{ minWidth: '70px', margin: 0, fontWeight: 600 }}>{plan.label}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#64748b', fontSize: '1.1rem' }}>$</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={planPrices[plan.key] || ''}
                          onChange={(e) => setPlanPrices({ ...planPrices, [plan.key]: e.target.value })}
                          style={{ width: '100px', textAlign: 'right' }}
                        />
                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>USD</span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
                        <span style={{ color: '#38bdf8' }}>${monthly}/mes</span>
                        {Number(saved) > 0 && plan.key !== '1m' && (
                          <span style={{ color: '#4ade80' }}>Ahorra ${Math.round(Number(saved))}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="setting-footer">
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    try {
                      setSavingKey('PLAN_PRICES');
                      const cleanPrices = {};
                      for (const k of ['1m', '3m', '6m', '12m']) {
                        const v = Number(planPrices[k] || 0);
                        cleanPrices[k] = v > 0 ? v.toFixed(2) : DEFAULT_PLAN_PRICES[k];
                      }
                      await http.putData('/admin/settings', 'PLAN_PRICES', {
                        value: JSON.stringify(cleanPrices),
                        description: 'Precios de los 4 planes de suscripción en USD.',
                      });
                      await successAlert('Guardado', 'Los precios de los planes han sido actualizados.');
                      await loadSettings();
                    } catch (e) {
                      console.error(e);
                      await errorAlert('Error', 'No se pudieron guardar los precios.');
                    } finally {
                      setSavingKey(null);
                    }
                  }}
                  disabled={savingKey === 'PLAN_PRICES'}
                >
                  {savingKey === 'PLAN_PRICES' ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </article>

            </>}
            {activeSection === 'connections' && <>
            {/* ✉️ Probar Nodemailer (SMTP) */}
            <article className="setting-card">
              <div className="setting-header">
                <div className="icon-wrapper" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2>Prueba de correo</h2>
                <ConfigHelp compact>
                  Envía un correo de prueba de forma inmediata para verificar si las credenciales SMTP en tu archivo <code>.env</code> están funcionando.
                </ConfigHelp>
              </div>
              <div className="setting-body">
                <div className="form-group">
                  <label>Correo Destinatario</label>
                  <input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    style={{ background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px' }}
                  />
                </div>
                {testEmailStatus && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    background: testEmailStatus === 'success' ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${testEmailStatus === 'success' ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    color: testEmailStatus === 'success' ? '#34d399' : '#f87171',
                    wordBreak: 'break-word'
                  }}>
                    {testEmailStatus === 'success' ? (
                      <div>
                        <strong>✅ ¡Éxito! Correo enviado.</strong>
                        <div style={{ fontSize: '0.75rem', marginTop: '4px', color: '#94a3b8' }}>
                          Message ID: {testEmailMessageId}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <strong>❌ Fallo de envío:</strong>
                        <pre style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', fontSize: '0.75rem', fontFamily: 'monospace', color: '#f87171' }}>
                          {testEmailError}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="setting-footer">
                <button
                  className="btn btn-primary"
                  style={{ background: '#f43f5e', borderColor: '#f43f5e' }}
                  onClick={async () => {
                    if (!testEmailAddress) {
                      await errorAlert('Error', 'Por favor ingresa un correo destinatario.');
                      return;
                    }
                    try {
                      setTestingEmail(true);
                      setTestEmailStatus(null);
                      setTestEmailError(null);
                      const res = await http.postData('/admin/ops/test-email', { email: testEmailAddress });
                      if (res.data && res.data.ok) {
                        setTestEmailStatus('success');
                        setTestEmailMessageId(res.data.messageId);
                        await successAlert('Enviado', 'Correo de prueba enviado correctamente.');
                      } else {
                        throw new Error(res.data?.message || 'Error desconocido');
                      }
                    } catch (e) {
                      console.error(e);
                      setTestEmailStatus('error');
                      setTestEmailError(e?.response?.data?.error || e?.response?.data?.message || e.message || 'Error al enviar');
                      await errorAlert('Fallo de envío', 'El correo no se pudo enviar. Revisa el log de error en la tarjeta.');
                    } finally {
                      setTestingEmail(false);
                    }
                  }}
                  disabled={testingEmail}
                >
                  {testingEmail ? 'Enviando...' : 'Enviar Correo de Prueba'}
                </button>
              </div>
            </article>

            </>}
            {genericSettings.filter(setting => configSection(setting.key) === activeSection).map(setting => (
              <SettingEditor key={setting.key} setting={setting}
                value={editValues[setting.key]} description={editDescriptions[setting.key]}
                onValueChange={value => setEditValues(previous => ({ ...previous, [setting.key]: value }))}
                onDescriptionChange={value => setEditDescriptions(previous => ({ ...previous, [setting.key]: value }))}
                onSave={() => handleSave(setting.key)} saving={savingKey === setting.key} />
            ))}
            {['publishing', 'advanced'].includes(activeSection) && !genericSettings.some(setting => configSection(setting.key) === activeSection) &&
              <div className="config-empty">No hay ajustes en esta sección.</div>}


          </div>
        )}
      </div>
    </section>
  );
}
