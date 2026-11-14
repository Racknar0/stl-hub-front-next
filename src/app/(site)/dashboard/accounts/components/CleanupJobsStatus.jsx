'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import CleaningServicesOutlined from '@mui/icons-material/CleaningServicesOutlined';
import axiosInstance from '@/services/AxiosInterceptor';
import useStore from '@/store/useStore';
import { isCleanupJobActive, notifyCleanupJobReport } from './ExcessCleanupJobClient';

const statusLabel = job => ({ queued: 'En cola', running: 'En curso', partial: 'Resultado parcial', failed: 'Se detuvo', interrupted: 'Interrumpida', succeeded: job.kind === 'preview' ? 'Vista previa lista' : 'Completada' }[job.status] || job.status);

export default function CleanupJobsStatus({ accounts, onOpen, onComplete }) {
  const ownerId = useStore(store => store.userId);
  const token = useStore(store => store.token);
  const [jobs, setJobs] = useState([]);
  const [reconnecting, setReconnecting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  const accountMap = useMemo(() => new Map(accounts.map(account => [account.id, account])), [accounts]);
  useEffect(() => {
    let disposed = false;
    let timer;
    let busy = false;
    const controller = new AbortController();
    let active = false;
    let authPaused = false;
    setAuthError('');
    const load = async () => {
      if (disposed || busy) return;
      busy = true;
      clearTimeout(timer);
      try {
        const response = await axiosInstance.get('/accounts/excess/jobs', { signal: controller.signal, timeout: 8000 });
        if (disposed) return;
        const list = Array.isArray(response.data?.jobs) ? response.data.jobs : [];
        active = list.some(isCleanupJobActive);
        setJobs(previous => JSON.stringify(previous) === JSON.stringify(list) ? previous : list);
        setReconnecting(false);
        // One account-list refresh covers all recently completed work. Avoid a
        // fan-out of 2,000-account fetches when restoring a full day of history.
        const latestExecution = list.filter(job => job.kind === 'execute' && !isCleanupJobActive(job))
          .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))[0];
        if (latestExecution) notifyCleanupJobReport(latestExecution, ownerId, typeof completeRef.current === 'function' ? result => completeRef.current?.(result) : undefined, { requireResult: false });
      } catch (error) {
        if (!disposed && [401, 403].includes(error?.response?.status)) {
          authPaused = true;
          setReconnecting(false);
          setAuthError(error.response.status === 401 ? 'Inicia sesión para consultar las tareas.' : 'No tienes permiso para consultar estas tareas.');
        } else if (!disposed) setReconnecting(true);
      }
      finally {
        busy = false;
        if (!disposed && !authPaused) timer = setTimeout(load, active ? 3000 : 15000);
      }
    };
    const changed = () => { if (!authPaused) void load(); };
    window.addEventListener('account-cleanup-jobs-changed', changed);
    void load();
    return () => { disposed = true; controller.abort(); clearTimeout(timer); window.removeEventListener('account-cleanup-jobs-changed', changed); };
  }, [ownerId, token, refreshKey]);

  const activeJobs = jobs.filter(isCleanupJobActive);
  const finished = jobs.filter(job => !isCleanupJobActive(job)).sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt))).slice(0, 20);
  const visible = [...activeJobs, ...(historyOpen ? finished : finished.slice(0, 1))];
  if (!visible.length && !reconnecting && !authError) return null;
  return <Box sx={{ mb: 1.5, py: .7, borderBottom: '1px solid rgba(148,163,184,.16)' }} aria-label="Depuraciones en segundo plano">
    <Box sx={{ display: 'flex', alignItems: 'center', gap: .8, mb: visible.length ? .4 : 0 }}>
      <CleaningServicesOutlined sx={{ color: '#fb923c', fontSize: 16 }} />
      <Typography component="strong" sx={{ fontSize: 12, color: '#cbd5e1' }}>Depuraciones</Typography>
      {activeJobs.length > 0 && <Typography sx={{ fontSize: 11, color: '#7dd3fc' }}>{activeJobs.length} en segundo plano</Typography>}
      {reconnecting && <Typography sx={{ fontSize: 11, color: '#fbbf24' }}>Reconectando para consultar el estado…</Typography>}
      {authError && <Typography sx={{ fontSize: 11, color: '#fbbf24' }}>{authError}</Typography>}
      {finished.length > 0 && <Button size="small" aria-expanded={historyOpen} aria-controls="cleanup-job-history" onClick={() => setHistoryOpen(value => !value)} sx={{ ml: 'auto', fontSize: 11, color: '#94a3b8', textTransform: 'none' }}>{historyOpen ? 'Cerrar historial' : `Historial (${finished.length})`}</Button>}
      {reconnecting && <Button size="small" onClick={() => setRefreshKey(value => value + 1)} sx={{ ml: 'auto', fontSize: 11, textTransform: 'none' }}>Comprobar estado</Button>}
    </Box>
    <Box id="cleanup-job-history" sx={{ maxHeight: 140, overflowY: 'auto' }}>
      {visible.map(job => {
        const account = accountMap.get(Number(job.requestedAccountId)) || { id: Number(job.requestedAccountId), alias: `Cuenta #${job.requestedAccountId}` };
        const running = isCleanupJobActive(job);
        return <Box key={job.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, py: .3 }}>
          {running ? <CircularProgress size={11} sx={{ color: '#38bdf8', flexShrink: 0 }} /> : <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: job.status === 'succeeded' ? '#6ee7b7' : '#fbbf24', ml: .3, mr: .3, flexShrink: 0 }} />}
          <Typography sx={{ fontSize: 11, color: '#e2e8f0', whiteSpace: 'nowrap' }}>{account.alias}</Typography>
          <Typography sx={{ fontSize: 11, color: '#94a3b8', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{statusLabel(job)}{job.progress?.message ? ` · ${job.progress.message}` : ''}</Typography>
          <Button size="small" onClick={() => onOpen({ ...account, cleanupJobId: job.id })} sx={{ ml: 'auto', flexShrink: 0, fontSize: 11, textTransform: 'none', color: '#7dd3fc' }}>{running ? 'Ver progreso' : 'Ver resultado'}</Button>
        </Box>;
      })}
    </Box>
  </Box>;
}
