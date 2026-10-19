'use client';
import React, { useCallback, useEffect, useState } from 'react';
import HttpService from '@/services/HttpService';

const TYPE_LABELS = { trend: 'Tendencias', season: 'Temporada', classic: 'Clásicos', explore: 'Exploración' };
const TYPES = Object.keys(TYPE_LABELS);
const STATUS_LABELS = { OK: 'completa', PARTIAL: 'incompleta', ERROR: 'con error', RUNNING: 'en curso' };

const fmtDateTime = (d) => new Date(d).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

// Tarjeta del piloto automático de Pinterest: interruptor, freno de publicación, mezcla y última ejecución
export default function AutopilotCard({ onScheduled }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null); // 'toggle' | 'pause' | 'save' | 'dry' | 'run'
  const [showSettings, setShowSettings] = useState(false);
  const [draft, setDraft] = useState(null);
  const [preview, setPreview] = useState(null);
  const [rejections, setRejections] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await new HttpService().getData('/pinterest/autopilot');
      setData(res.data);
      setDraft({ mix: { ...res.data.config.mix }, runHour: res.data.config.runHour });
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveConfig = async (patch, key) => {
    setBusy(key);
    setError('');
    try {
      await new HttpService().putData('/pinterest/autopilot', 'config', patch);
      await load();
      return true;
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
      return false;
    } finally { setBusy(null); }
  };

  const runNow = async (dryRun) => {
    if (!dryRun && !confirm('¿Programar ahora los pines que faltan para mañana?')) return;
    setBusy(dryRun ? 'dry' : 'run');
    setError('');
    try {
      const http = new HttpService();
      await http.postData('/pinterest/autopilot/run', { dryRun });
      // Se ejecuta en segundo plano: consultar hasta que termine y mostrar la última ejecución
      let last = null;
      for (let i = 0; i < 90; i++) {
        await new Promise(r => setTimeout(r, 4000));
        const res = await http.getData('/pinterest/autopilot');
        setData(res.data);
        if (!res.data.running) { last = res.data.runs[0]; break; }
      }
      if (last?.status === 'ERROR') setError(`La ejecución falló: ${last.error || 'error desconocido'}`);
      else if (last?.summary) setPreview({ ...last.summary, dryRun: last.dryRun, status: last.status });
      if (!dryRun) onScheduled?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally { setBusy(null); }
  };

  const toggleRejections = async () => {
    if (rejections) { setRejections(null); return; }
    try {
      const res = await new HttpService().getData('/pinterest/autopilot/rejections?limit=50');
      setRejections(res.data.rejections || []);
    } catch (e) { setError(e?.response?.data?.error || e.message); }
  };

  const approveRejection = async (assetId) => {
    try {
      await new HttpService().deleteData('/pinterest/autopilot/rejections', assetId);
      setRejections(prev => prev.filter(r => r.assetId !== assetId));
      load();
    } catch (e) { setError(e?.response?.data?.error || e.message); }
  };

  if (!data) {
    return (
      <div className="pr-autopilot">
        <div className="pr-autopilot-head"><span className="pr-side-eyebrow">Piloto automático</span></div>
        <p className="pr-muted">{error || 'Cargando…'}</p>
      </div>
    );
  }

  const { config, runs, tomorrowCount, rejectedCount, running } = data;
  const lastRun = runs.find(r => !r.dryRun);
  const mixTotal = draft ? TYPES.reduce((s, t) => s + (parseInt(draft.mix[t], 10) || 0), 0) : 0;

  return (
    <div className={`pr-autopilot ${config.enabled ? 'on' : ''}`}>
      <div className="pr-autopilot-head">
        <div>
          <span className="pr-side-eyebrow">Piloto automático</span>
          <strong className={`pr-autopilot-status ${config.enabled ? 'on' : ''}`}>{config.enabled ? 'Encendido' : 'Apagado'}</strong>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={config.enabled}
          aria-label="Encender o apagar el piloto automático"
          className={`pr-switch ${config.enabled ? 'on' : ''}`}
          disabled={busy === 'toggle'}
          onClick={() => saveConfig({ enabled: !config.enabled }, 'toggle')}
        >
          <span />
        </button>
      </div>

      <p className="pr-autopilot-line">
        {config.enabled
          ? `Prepara los pines de mañana cada día a las ${String(config.runHour).padStart(2, '0')}:00.`
          : 'No prepara pines nuevos. El publicador manual sigue funcionando.'}
        {' '}Mañana: <b>{tomorrowCount}/{config.dailyTarget}</b>.
      </p>
      {lastRun && (
        <p className="pr-autopilot-line pr-muted">
          Última ejecución: {fmtDateTime(lastRun.startedAt)} · {STATUS_LABELS[lastRun.status] || lastRun.status}
          {lastRun.summary?.scheduled !== undefined && ` · ${lastRun.summary.scheduled} programados`}
        </p>
      )}
      {running && <p className="pr-autopilot-line pr-muted">⏳ Ejecutándose ahora…</p>}

      {config.publishPaused ? (
        <div className="pr-alert err">
          <span>⏸ Publicación pausada: no se sube nada a Pinterest.</span>
          <button type="button" disabled={busy === 'pause'} onClick={() => saveConfig({ publishPaused: false }, 'pause')}>Reanudar</button>
        </div>
      ) : (
        <button type="button" className="pr-btn ghost pr-btn-small" disabled={busy === 'pause'}
          onClick={() => { if (confirm('¿Pausar toda la publicación en Pinterest? Los pines programados quedan en espera.')) saveConfig({ publishPaused: true }, 'pause'); }}>
          ⏸ Pausar publicación
        </button>
      )}

      <div className="pr-autopilot-actions">
        <button type="button" className="pr-btn pr-btn-small" disabled={!!busy || running} onClick={() => runNow(true)}>
          {busy === 'dry' ? 'Calculando…' : 'Probar sin programar'}
        </button>
        <button type="button" className="pr-btn pr-btn-small" disabled={!!busy || running} onClick={() => runNow(false)}>
          {busy === 'run' ? 'Programando…' : 'Ejecutar ahora'}
        </button>
      </div>
      {(busy === 'dry' || busy === 'run') && <p className="pr-muted">Puede tardar un par de minutos: revisa cada imagen con IA.</p>}

      <div className="pr-autopilot-links">
        <button type="button" onClick={() => setShowSettings(v => !v)}>{showSettings ? '▲' : '▼'} Mezcla y hora</button>
        <button type="button" onClick={toggleRejections}>{rejections ? '▲' : '▼'} Imágenes descartadas ({rejectedCount})</button>
      </div>

      {showSettings && draft && (
        <div className="pr-autopilot-settings">
          {TYPES.map(t => (
            <label key={t} htmlFor={`ap-mix-${t}`}>
              <span>{TYPE_LABELS[t]}</span>
              <input id={`ap-mix-${t}`} type="number" min="0" max="15" className="form-input" value={draft.mix[t]}
                onChange={(e) => setDraft(d => ({ ...d, mix: { ...d.mix, [t]: e.target.value } }))} />
            </label>
          ))}
          <label htmlFor="ap-hour">
            <span>Hora diaria</span>
            <select id="ap-hour" className="form-input" value={draft.runHour} onChange={(e) => setDraft(d => ({ ...d, runHour: e.target.value }))}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
          </label>
          <div className="pr-autopilot-save">
            <span className={mixTotal > 15 || mixTotal < 1 ? 'err' : ''}>Total: {mixTotal} pines/día</span>
            <button type="button" className="pr-btn primary pr-btn-small" disabled={busy === 'save' || mixTotal > 15 || mixTotal < 1}
              onClick={async () => { if (await saveConfig({ mix: draft.mix, runHour: draft.runHour }, 'save')) setShowSettings(false); }}>
              Guardar
            </button>
          </div>
        </div>
      )}

      {rejections && (
        <div className="pr-autopilot-list">
          {rejections.length === 0 ? <p className="pr-muted">Ninguna imagen descartada.</p> : rejections.map(r => (
            <div key={r.assetId} className="pr-autopilot-item">
              <span className="pr-id">#{r.assetId}</span>
              <span className="pr-autopilot-item-text">
                <b>{r.title || 'Sin título'}</b>
                <small>{r.reason}</small>
              </span>
              <button type="button" title="La IA se equivocó: permitir que se publique" onClick={() => approveRejection(r.assetId)}>Es apta</button>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="pr-autopilot-list">
          <div className="pr-autopilot-preview-head">
            <b>{preview.dryRun ? 'Propuesta para' : 'Programado para'} {preview.day}</b>
            <button type="button" className="pr-icon-btn" onClick={() => setPreview(null)} aria-label="Cerrar">✕</button>
          </div>
          <small className="pr-muted">
            {preview.needed === 0 ? 'Mañana ya está completo.' : `${preview.picks.length} de ${preview.needed} · descartadas: ${preview.rejected.length} · omitidas: ${preview.skipped.length}`}
            {preview.pinterestOk === false && ' · ⚠ Pinterest desconectado'}
          </small>
          {preview.picks.map(p => (
            <div key={p.assetId} className="pr-autopilot-item">
              <time>{fmtTime(p.scheduledAt)}</time>
              <span className="pr-autopilot-item-text">
                <b>{p.title}</b>
                <small>{TYPE_LABELS[p.type]}{p.keyword ? ` · ${p.keyword}` : ''} · {p.category}</small>
              </span>
            </div>
          ))}
        </div>
      )}

      {error && <p className="pr-autopilot-error">{error}</p>}
    </div>
  );
}
