'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useStore from '../../../../store/useStore';
import HttpService from '@/services/HttpService';
import { successAlert, errorAlert } from '@/helpers/alerts';
import './system-config.scss';

export default function SystemConfigPage() {
  const router = useRouter();
  const token = useStore((s) => s.token);
  const roleId = useStore((s) => s.roleId);
  const hydrateToken = useStore((s) => s.hydrateToken);
  const hydrated = useStore((s) => s.hydrated);

  const [settings, setSettings] = useState([]);
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

  if (!hydrated || !token || roleId !== 2) return null;

  return (
    <section className="dashboard-page-theme system-config-page">
      <header className="page-header">
        <h1 className="dashboard-title">System Configurations</h1>
        <p className="subtitle">Administra los parametros globales y configuraciones del motor.</p>
      </header>

      <div className="dashboard-page-content">
        {loading ? (
          <div className="loading-state">Cargando configuraciones...</div>
        ) : (
          <div className="settings-grid">
            
            {/* 🚀 Premium Free Pass */}
            <article className="setting-card" style={{ border: editValues['LAUNCH_PROMO_ACTIVE'] === 'true' ? '1px solid rgba(52,211,153,0.4)' : undefined }}>
              <div className="setting-header">
                <div className="icon-wrapper" style={{ background: editValues['LAUNCH_PROMO_ACTIVE'] === 'true' ? 'rgba(52,211,153,0.15)' : undefined, color: editValues['LAUNCH_PROMO_ACTIVE'] === 'true' ? '#34d399' : undefined }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2>🚀 Premium Free Pass</h2>
              </div>
              <div className="setting-body">
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Cuando está activo, <strong style={{ color: '#34d399' }}>cualquier usuario registrado</strong> puede descargar todo el catálogo premium sin necesidad de suscripción. Ideal para lanzamientos y eventos especiales.
                </p>

                {/* Toggle activo/inactivo */}
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ margin: 0, minWidth: '80px' }}>Estado</label>
                  <button
                    type="button"
                    onClick={() => setEditValues({ ...editValues, 'LAUNCH_PROMO_ACTIVE': editValues['LAUNCH_PROMO_ACTIVE'] === 'true' ? 'false' : 'true' })}
                    style={{
                      width: '56px', height: '28px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                      background: editValues['LAUNCH_PROMO_ACTIVE'] === 'true' ? '#34d399' : 'rgba(255,255,255,0.1)',
                      position: 'relative', transition: 'background 0.2s ease',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: '3px',
                      left: editValues['LAUNCH_PROMO_ACTIVE'] === 'true' ? '31px' : '3px',
                      width: '22px', height: '22px', borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }} />
                  </button>
                  <span style={{ color: editValues['LAUNCH_PROMO_ACTIVE'] === 'true' ? '#34d399' : '#ef4444', fontWeight: 600, fontSize: '0.9rem' }}>
                    {editValues['LAUNCH_PROMO_ACTIVE'] === 'true' ? '✅ ACTIVA' : '❌ INACTIVA'}
                  </span>
                </div>

                {/* Modo: todos o por días */}
                <div className="form-group">
                  <label>Duración</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select
                      value={editValues['LAUNCH_PROMO_DAYS'] && editValues['LAUNCH_PROMO_DAYS'] !== '0' ? 'days' : 'unlimited'}
                      onChange={(e) => {
                        if (e.target.value === 'unlimited') {
                          setEditValues((prev) => ({ ...prev, 'LAUNCH_PROMO_DAYS': '0' }));
                        } else {
                          setEditValues((prev) => ({ ...prev, 'LAUNCH_PROMO_DAYS': '7' }));
                        }
                      }}
                      style={{ padding: '8px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem' }}
                    >
                      <option value="unlimited" style={{ background: '#1e293b', color: '#fff' }}>♾️ Ilimitado (siempre gratis)</option>
                      <option value="days" style={{ background: '#1e293b', color: '#fff' }}>📅 Por cantidad de días</option>
                    </select>
                    {editValues['LAUNCH_PROMO_DAYS'] && editValues['LAUNCH_PROMO_DAYS'] !== '0' && (
                      <input
                        type="number"
                        min="1"
                        value={editValues['LAUNCH_PROMO_DAYS'] || ''}
                        onChange={(e) => setEditValues({ ...editValues, 'LAUNCH_PROMO_DAYS': e.target.value })}
                        placeholder="Días"
                        style={{ width: '80px' }}
                      />
                    )}
                  </div>
                  <small style={{ color: '#64748b', marginTop: '4px', display: 'block' }}>
                    {(!editValues['LAUNCH_PROMO_DAYS'] || editValues['LAUNCH_PROMO_DAYS'] === '0')
                      ? 'La promo estará activa hasta que la desactives manualmente.'
                      : `La promo durará ${editValues['LAUNCH_PROMO_DAYS']} día(s) desde que la actives.`
                    }
                  </small>

                  {/* ⏱️ Countdown indicator */}
                  {editValues['LAUNCH_PROMO_ACTIVE'] === 'true' && editValues['LAUNCH_PROMO_START'] && (() => {
                    const start = new Date(editValues['LAUNCH_PROMO_START']);
                    if (isNaN(start.getTime())) return null;
                    const days = Number(editValues['LAUNCH_PROMO_DAYS'] || 0);
                    const elapsed = (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24);
                    const startStr = start.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

                    if (days === 0) {
                      return (
                        <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                          <span>♾️</span>
                          <span style={{ color: '#94a3b8' }}>Activo desde <strong style={{ color: '#34d399' }}>{startStr}</strong></span>
                          <span style={{ color: '#64748b' }}>•</span>
                          <span style={{ color: '#34d399', fontWeight: 700 }}>Ilimitado</span>
                        </div>
                      );
                    }

                    const daysLeft = Math.ceil(days - elapsed);
                    const expired = daysLeft <= 0;
                    const urgentColor = daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : '#34d399';

                    return (
                      <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '10px', background: expired ? 'rgba(239,68,68,0.08)' : 'rgba(52,211,153,0.08)', border: `1px solid ${expired ? 'rgba(239,68,68,0.2)' : 'rgba(52,211,153,0.2)'}`, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                        <span>{expired ? '⏰' : '⏱️'}</span>
                        <span style={{ color: '#94a3b8' }}>Desde <strong style={{ color: expired ? '#ef4444' : '#34d399' }}>{startStr}</strong></span>
                        <span style={{ color: '#64748b' }}>•</span>
                        {expired
                          ? <span style={{ color: '#ef4444', fontWeight: 700 }}>Expirada (terminó hace {Math.abs(daysLeft)} día{Math.abs(daysLeft) !== 1 ? 's' : ''})</span>
                          : <span style={{ color: urgentColor, fontWeight: 700 }}>Quedan {daysLeft} día{daysLeft !== 1 ? 's' : ''}</span>
                        }
                      </div>
                    );
                  })()}
                </div>
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
                  {savingKey === 'LAUNCH_PROMO' ? 'Guardando...' : 'Guardar Premium Free Pass'}
                </button>
              </div>
            </article>

            {/* 📊 Límites de Descargas Diarias */}
            <article className="setting-card" style={{ border: '1px solid rgba(14, 165, 233, 0.3)' }}>
              <div className="setting-header">
                <div className="icon-wrapper" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2>📊 Límites de Descargas Diarias</h2>
              </div>
              <div className="setting-body">
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Define cuántas descargas pueden realizar los usuarios cada 24 horas según su estado y el modo del sistema. El reinicio de cuotas se calcula dinámicamente desde la primera descarga.
                </p>

                <div className="form-group">
                  <label>Límite Free con "Free Pass" Activo</label>
                  <input
                    type="number"
                    min="0"
                    value={editValues['LIMIT_FREE_PASS_FREE_DOWNLOADS'] || ''}
                    onChange={(e) => setEditValues({ ...editValues, 'LIMIT_FREE_PASS_FREE_DOWNLOADS': e.target.value })}
                  />
                  <small style={{ color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Cantidad de descargas diarias permitidas para usuarios Free cuando el Premium Free Pass está encendido (aplica a todo el catálogo).
                  </small>
                </div>

                <div className="form-group">
                  <label>Límite Free en Modo Normal</label>
                  <input
                    type="number"
                    min="0"
                    value={editValues['LIMIT_NORMAL_FREE_DOWNLOADS'] || ''}
                    onChange={(e) => setEditValues({ ...editValues, 'LIMIT_NORMAL_FREE_DOWNLOADS': e.target.value })}
                  />
                  <small style={{ color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Cantidad de descargas diarias permitidas para usuarios Free en modo normal (solo aplica a modelos Freebies/gratuitos, los Premium están bloqueados).
                  </small>
                </div>

                <div className="form-group">
                  <label>Límite de Suscriptores Premium</label>
                  <input
                    type="number"
                    min="0"
                    value={editValues['LIMIT_SUBSCRIBED_DOWNLOADS'] || ''}
                    onChange={(e) => setEditValues({ ...editValues, 'LIMIT_SUBSCRIBED_DOWNLOADS': e.target.value })}
                  />
                  <small style={{ color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Límite diario de descargas para usuarios con suscripción Premium activa. Funciona como un límite de seguridad.
                  </small>
                </div>
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
                  {savingKey === 'DOWNLOAD_LIMITS' ? 'Guardando...' : 'Guardar Límites'}
                </button>
              </div>
            </article>

            {/* Freebies Daily Count Setting */}
            <article className="setting-card">
              <div className="setting-header">
                <div className="icon-wrapper">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2>FREEBIES_DAILY_COUNT</h2>
              </div>
              <div className="setting-body">
                <div className="form-group">
                  <label>Descripcion</label>
                  <textarea 
                    value={editDescriptions['FREEBIES_DAILY_COUNT'] || ''} 
                    onChange={(e) => setEditDescriptions({...editDescriptions, 'FREEBIES_DAILY_COUNT': e.target.value})}
                    placeholder="Describe para que sirve esta configuracion..."
                    rows={2}
                  />
                </div>
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
                  {savingKey === 'FREEBIES_DAILY_COUNT' ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </article>

            {/* 💰 Plan Prices */}
            <article className="setting-card" style={{ border: '1px solid rgba(168,85,247,0.3)' }}>
              <div className="setting-header">
                <div className="icon-wrapper" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2>💰 Precios de Planes</h2>
              </div>
              <div className="setting-body">
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Configura el precio de cada plan de suscripción. Los periodos (30, 90, 180, 365 días) son fijos.
                  El cambio se refleja <strong style={{ color: '#a855f7' }}>inmediatamente</strong> en la pasarela de pago y en la página de pricing.
                </p>

                {[{ key: '1m', label: '30 Días', days: 30 }, { key: '3m', label: '90 Días', days: 90 }, { key: '6m', label: '180 Días', days: 180 }, { key: '12m', label: '365 Días', days: 365 }].map((plan) => {
                  const price = Number(planPrices[plan.key] || 0);
                  const months = plan.days / 30;
                  const monthly = months > 0 ? (price / months).toFixed(2) : '0.00';
                  const baseMonthly = Number(planPrices['1m'] || 5);
                  const fullPrice = baseMonthly * months;
                  const saved = Math.max(0, fullPrice - price).toFixed(2);
                  return (
                    <div key={plan.key} className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
                  {savingKey === 'PLAN_PRICES' ? 'Guardando...' : 'Guardar Precios'}
                </button>
              </div>
            </article>

            {/* ✉️ Probar Nodemailer (SMTP) */}
            <article className="setting-card" style={{ border: '1px solid rgba(244,63,94,0.3)' }}>
              <div className="setting-header">
                <div className="icon-wrapper" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2>✉️ Probar Nodemailer</h2>
              </div>
              <div className="setting-body">
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Envía un correo de prueba de forma inmediata para verificar si las credenciales SMTP en tu archivo <code>.env</code> están funcionando.
                </p>
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

            {/* Render any other settings from DB that are not explicitly handled above */}
            {settings.filter(s => ![
              'FREEBIES_DAILY_COUNT',
              'LAUNCH_PROMO_ACTIVE',
              'LAUNCH_PROMO_DAYS',
              'LAUNCH_PROMO_START',
              'PLAN_PRICES',
              'LIMIT_FREE_PASS_FREE_DOWNLOADS',
              'LIMIT_NORMAL_FREE_DOWNLOADS',
              'LIMIT_SUBSCRIBED_DOWNLOADS',
              'PINTEREST_ACCESS_TOKEN',
              'PINTEREST_REFRESH_TOKEN',
              'PINTEREST_TOKEN_EXPIRES_AT',
              'PINTEREST_REFRESH_EXPIRES_AT'
            ].includes(s.key)).map((setting) => (
              <article className="setting-card" key={setting.key}>
                <div className="setting-header">
                  <div className="icon-wrapper">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h2>{setting.key}</h2>
                </div>
                <div className="setting-body">
                  <div className="form-group">
                    <label>Descripcion</label>
                    <textarea 
                      value={editDescriptions[setting.key] || ''} 
                      onChange={(e) => setEditDescriptions({...editDescriptions, [setting.key]: e.target.value})}
                      placeholder="Describe para que sirve esta configuracion..."
                      rows={2}
                    />
                  </div>
                  <div className="form-group">
                    <label>Valor</label>
                    <input 
                      type="text" 
                      value={editValues[setting.key] || ''} 
                      onChange={(e) => setEditValues({...editValues, [setting.key]: e.target.value})}
                    />
                  </div>
                </div>
                <div className="setting-footer">
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleSave(setting.key)}
                    disabled={savingKey === setting.key}
                  >
                    {savingKey === setting.key ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </article>
            ))}

          </div>
        )}
      </div>
    </section>
  );
}
