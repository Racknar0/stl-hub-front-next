'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, LinearProgress, Typography } from '@mui/material';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import CleaningServicesOutlined from '@mui/icons-material/CleaningServicesOutlined';
import axiosInstance from '@/services/AxiosInterceptor';
import useStore from '@/store/useStore';
import { createExcessCleanupJobClient, initialCleanupJobState, isCleanupJobActive } from './ExcessCleanupJobClient';

const gb = mb => `${(Number(mb) / 1024).toLocaleString('es-CO', { maximumFractionDigits: 2 })} GB`;
export default function ExcessCleanupModal({ account, onClose, onComplete }) {
  const ownerId = useStore(store => store.userId);
  const token = useStore(store => store.token);
  const clientRef = useRef(null);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  const [state, setState] = useState(initialCleanupJobState);
  const [confirmed, setConfirmed] = useState(false);
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    if (!account) return;
    setState(initialCleanupJobState());
    setConfirmed(false);
    const client = createExcessCleanupJobClient({ accountId: account.id, ownerId, initialJobId: account.cleanupJobId,
      request: async (method, url, body, signal) => {
        const response = method === 'get' ? await axiosInstance.get(url, { signal, timeout: 8000 }) : await axiosInstance.post(url, body, { signal, timeout: 15000 });
        return response.data;
      },
      onChange: setState, onComplete: typeof completeRef.current === 'function' ? result => completeRef.current?.(result) : undefined,
    });
    clientRef.current = client;
    void client.start();
    return () => { client.dispose(); clientRef.current = null; };
  }, [account?.id, account?.cleanupJobId, ownerId, token]);
  const { plan, report, error, diagnostics, job } = state;
  useEffect(() => {
    if (job?.id) window.dispatchEvent(new Event('account-cleanup-jobs-changed'));
  }, [job?.id, job?.status]);
  const active = isCleanupJobActive(job);
  const blocked = active || state.checking || state.pending || state.uncertain || state.reconnecting || state.authBlocked;
  const expired = Boolean(plan?.expiresAt && new Date(plan.expiresAt).getTime() <= clock);
  useEffect(() => {
    setConfirmed(false);
    setClock(Date.now());
    if (!plan?.expiresAt) return;
    const expiresAt = new Date(plan.expiresAt).getTime();
    if (!Number.isFinite(expiresAt)) return;
    const timer = setTimeout(() => setClock(Date.now()), Math.max(0, Math.min(2147483647, expiresAt - Date.now() + 20)));
    return () => clearTimeout(timer);
  }, [plan?.planId, plan?.expiresAt, job?.id]);
  const preview = () => { setConfirmed(false); void clientRef.current?.preview(); };
  const execute = () => {
    if (!plan || !confirmed || blocked || expired || job?.kind !== 'preview') return;
    setConfirmed(false);
    void clientRef.current?.execute(plan.planId);
  };
  const progress = job?.progress || {};
  const total = Number(progress.totalFiles) || Number(progress.totalModels) || 0;
  const done = Number(progress.totalFiles) ? Number(progress.completedFiles) || 0 : Number(progress.completedModels) || 0;
  const showPlan = plan && job?.kind === 'preview';
  const assetTitle = typeof progress.currentAsset === 'string' ? progress.currentAsset : progress.currentAsset?.title;
  return <Dialog open={Boolean(account)} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { bgcolor: '#101b2a', border: '1px solid rgba(148,163,184,.23)', borderRadius: 2 } }}>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 16 }}><CleaningServicesOutlined sx={{ color: '#fb923c', fontSize: 20 }} />Depurar exceso · {account?.alias || `Cuenta #${account?.id}`}<IconButton size="small" aria-label="Cerrar" onClick={onClose} sx={{ ml: 'auto' }}><CloseOutlined fontSize="small" /></IconButton></DialogTitle>
    <DialogContent dividers>
      {(state.checking || state.pending) && <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, mb: 1, color: '#94a3b8', fontSize: 12 }}><CircularProgress size={16} />{state.checking ? 'Recuperando el estado guardado en el servidor…' : 'Enviando la solicitud al servidor…'}</Box>}
      {state.warning && <Alert severity="warning" sx={{ mb: 1.5, fontSize: 12 }}>{state.warning}</Alert>}
      {active && <Box role="status" aria-live="polite" sx={{ mb: 1.5, p: 1.3, border: '1px solid #334155', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, fontSize: 12, color: '#e2e8f0', mb: 1 }}><strong>{job.kind === 'preview' ? 'Calculando vista previa' : 'Depuración en segundo plano'}</strong><Box component="span" sx={{ fontSize: 11, color: '#7dd3fc' }}>{job.status === 'queued' ? 'En cola' : 'En curso'}</Box></Box>
        <LinearProgress variant={total ? 'determinate' : 'indeterminate'} value={total ? Math.min(100, done / total * 100) : undefined} sx={{ height: 4, borderRadius: 2, bgcolor: '#263548', '& .MuiLinearProgress-bar': { bgcolor: '#38bdf8' } }} />
        <Typography sx={{ mt: 1, fontSize: 12, color: '#cbd5e1' }}>{progress.message || (job.status === 'queued' ? 'La tarea espera su turno para trabajar con MEGA.' : 'Procesando la tarea en el servidor…')}</Typography>
        {progress.currentAccount && <Typography sx={{ mt: .4, fontSize: 11, color: '#94a3b8' }}>{progress.currentAccount.type === 'main' ? 'Main' : 'Backup'} · {progress.currentAccount.alias || `#${progress.currentAccount.id}`}</Typography>}
        {assetTitle && <Typography sx={{ mt: .4, fontSize: 11, color: '#94a3b8', overflowWrap: 'anywhere' }}>{assetTitle}</Typography>}
        {(progress.totalModels || progress.totalFiles) > 0 && <Typography sx={{ mt: .6, fontSize: 11, color: '#7b91aa' }}>{progress.totalModels > 0 ? `${progress.completedModels || 0} / ${progress.totalModels} modelos` : ''}{progress.totalModels > 0 && progress.totalFiles > 0 ? ' · ' : ''}{progress.totalFiles > 0 ? `${progress.completedFiles || 0} / ${progress.totalFiles} archivos` : ''}</Typography>}
        <Typography sx={{ mt: .7, fontSize: 11, color: '#7dd3fc' }}>Puedes cerrar esta ventana; la tarea continúa en el servidor. Vuelve a abrirla para ver el progreso.</Typography>
      </Box>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {diagnostics?.accounts && <Box sx={{ mb: 1 }}>
        {diagnostics.accounts.map(item => <Box key={item.id} sx={{ py: 1, borderBottom: '1px solid rgba(148,163,184,.15)' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{item.type === 'main' ? 'Main' : 'Backup'} · {item.alias} <Box component="span" sx={{ color: item.remainingMB > 0 ? '#fda4af' : '#6ee7b7', ml: 1 }}>{item.beforePercent.toFixed(2)} %</Box></Typography>
          <Typography sx={{ fontSize: 11, color: '#94a3b8', mt: .4 }}>Necesita liberar {gb(item.requiredMB)} · {item.scannedFiles} archivos encontrados · Disponibles {gb(item.availableMB)}{item.remainingMB > 0 ? ` · Faltan ${gb(item.remainingMB)}` : ''}</Typography>
          {item.protectedFiles > 0 && <Typography sx={{ fontSize: 10, color: '#7b91aa', mt: .4 }}>{item.protectedFiles} archivos de otros modelos o en procesamiento se conservan.</Typography>}
        </Box>)}
      </Box>}
      {showPlan && <>
        <Typography sx={{ fontSize: 12, color: '#cbd5e1', mb: 1.5 }}>Objetivo: 95 % o menos. Se seleccionan archivos completos, de mayor a menor; el resultado puede quedar por debajo del 95 %.</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))' }, gap: 1.5, mb: 2 }}>
          {plan.accounts.map(item => <Box key={item.id} sx={{ p: 1.2, border: '1px solid rgba(148,163,184,.2)', borderRadius: 1 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{item.type === 'main' ? 'Main' : 'Backup'} · {item.alias}</Typography>
            <Typography sx={{ fontSize: 14, mt: .5, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{item.beforePercent.toFixed(2)} % → <Box component="strong" sx={{ color: '#6ee7b7' }}>{item.afterPercent.toFixed(2)} %</Box></Typography>
            <Typography sx={{ fontSize: 11, mt: .5, color: '#94a3b8' }}>Liberar {gb(item.freedMB)} · Necesarios {gb(item.requiredMB)}</Typography>
            <Typography sx={{ fontSize: 10, mt: .4, color: '#7b91aa' }}>{item.scannedFiles} archivos leídos · {item.matchedFiles} asociados al catálogo{item.unmatchedFiles ? ` · ${item.unmatchedFiles} sin asociación` : ''}</Typography>
            {item.protectedFiles > 0 && <Typography sx={{ fontSize: 10, mt: .4, color: '#7b91aa' }}>{item.protectedFiles} archivos de otros modelos o en procesamiento se conservan.</Typography>}
          </Box>)}
        </Box>
        <Alert severity="warning" sx={{ mb: 1.5, fontSize: 12 }}>Al confirmar se borran las copias indicadas de Main y Backup. Los modelos asociados se retiran del catálogo público.{plan.files.some(file => file.catalogued === false) ? ' La selección también incluye archivos sin asociación al catálogo; revisa sus rutas.' : ''}</Alert>
        <Box sx={{ maxHeight: 260, overflow: 'auto', borderTop: '1px solid rgba(148,163,184,.2)' }}>
          {plan.files.map(file => <Box key={file.key || file.assetId} sx={{ py: 1, borderBottom: '1px solid rgba(148,163,184,.12)' }}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', fontSize: 12 }}><span>{file.assetId ? `#${file.assetId} · ` : ''}{file.title}</span><strong style={{ whiteSpace: 'nowrap' }}>{gb(file.sizeMB)}</strong></Box>
            {file.catalogued === false && <Typography sx={{ fontSize: 10, color: '#fdba74', mt: .4, overflowWrap: 'anywhere' }}>Sin asociación al catálogo · {file.relativePath}</Typography>}
            {file.copies.map(copy => <Box key={copy.accountId} sx={{ mt: .5 }}>
              <Typography sx={{ fontSize: 10, color: '#94a3b8' }}>{plan.accounts.find(item => item.id === copy.accountId)?.alias}: {copy.missing ? 'no existe, se omite' : `${copy.fileCount || 1} archivo(s) · ${gb(copy.sizeMB)}`}</Typography>
              {!copy.missing && copy.paths?.map(filePath => <Typography key={filePath} sx={{ fontSize: 10, color: '#7b91aa', overflowWrap: 'anywhere' }}>{filePath}</Typography>)}
            </Box>)}
          </Box>)}
        </Box>
        <FormControlLabel sx={{ mt: 1.5, '& .MuiFormControlLabel-label': { fontSize: 12 } }} control={<Checkbox size="small" checked={confirmed} disabled={blocked || expired} onChange={event => setConfirmed(event.target.checked)} />} label="Confirmo eliminar estos archivos de Main y Backup. Se borrarán las copias indicadas." />
        {expired && <Typography sx={{ fontSize: 11, color: '#fdba74', mb: .5 }}>Esta vista previa caducó. Recalcula para confirmar los archivos y el espacio actuales.</Typography>}
        <Typography sx={{ fontSize: 10, color: '#7b91aa' }}>La vista previa caduca a las {new Date(plan.expiresAt).toLocaleTimeString('es-CO')}. Si cambian las cuentas, será necesario recalcularla.</Typography>
      </>}
      {report && <>
        <Alert severity={report.ok ? 'success' : 'warning'} sx={{ mb: 1.5 }}>{report.message}</Alert>
        {(report.accounts || []).map(item => <Typography key={item.id} sx={{ fontSize: 12, mb: .5 }}>{item.alias}: {item.error || `${Number(item.percent).toFixed(2)} % · ${gb(item.usedMB)} / ${gb(item.totalMB)}`}</Typography>)}
        {(report.results || []).map(item => <Typography key={item.key || item.assetId} sx={{ fontSize: 11, color: item.error ? '#fda4af' : '#94a3b8', mt: .5 }}>{item.assetId ? `#${item.assetId}` : item.title} · {item.completed ? 'Depurado' : item.error || 'Pendiente'}</Typography>)}
      </>}
    </DialogContent>
    <DialogActions sx={{ px: 3, py: 1.5 }}>
      <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cerrar</Button>
      {(state.reconnecting || state.uncertain || state.warning) && <Button onClick={() => clientRef.current?.refresh()} disabled={state.checking || state.pending || state.authBlocked} sx={{ textTransform: 'none' }}>Comprobar estado</Button>}
      <Button variant="outlined" onClick={preview} disabled={blocked} sx={{ textTransform: 'none', ml: 'auto' }}>Recalcular vista previa</Button>
      {showPlan && <Button variant="contained" color="error" disabled={!confirmed || blocked || expired} onClick={execute} sx={{ textTransform: 'none' }}>Confirmar depuración</Button>}
    </DialogActions>
  </Dialog>;
}
