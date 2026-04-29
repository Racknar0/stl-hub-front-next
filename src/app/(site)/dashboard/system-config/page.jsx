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
            {settings.filter(s => s.key !== 'FREEBIES_DAILY_COUNT').map((setting) => (
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
