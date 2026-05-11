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
      
      setEditValues(values);
      setEditDescriptions(descs);
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

            {/* Render any other settings from DB that are not explicitly handled above */}
            {settings.filter(s => !['FREEBIES_DAILY_COUNT','LAUNCH_PROMO_ACTIVE','LAUNCH_PROMO_DAYS','LAUNCH_PROMO_START'].includes(s.key)).map((setting) => (
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
