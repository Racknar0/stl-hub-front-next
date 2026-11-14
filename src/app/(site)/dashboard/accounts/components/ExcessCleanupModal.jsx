'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Typography } from '@mui/material';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import CleaningServicesOutlined from '@mui/icons-material/CleaningServicesOutlined';
import HttpService from '@/services/HttpService';

const gb = mb => `${(Number(mb) / 1024).toLocaleString('es-CO', { maximumFractionDigits: 2 })} GB`;
export default function ExcessCleanupModal({ account, onClose, onComplete }) {
  const http = useMemo(() => new HttpService(), []);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');
  const [diagnostics, setDiagnostics] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [report, setReport] = useState(null);
  const preview = async signal => {
    setBusy(true); setError(''); setDiagnostics(null); setPlan(null); setReport(null); setConfirmed(false);
    try {
      const response = await http.postData(`/accounts/${account.id}/excess/preview`, {}, { signal, timeout: 300000 });
      if (!signal?.aborted) setPlan(response.data);
    } catch (failure) {
      if (!signal?.aborted) {
        setError(failure?.response?.data?.message || 'No se pudo leer Main y Backup. Vuelve a calcular; no se ha iniciado ningún borrado.');
        setDiagnostics(failure?.response?.data?.details || null);
      }
    } finally { if (!signal?.aborted) setBusy(false); }
  };
  useEffect(() => {
    if (!account) return;
    const controller = new AbortController();
    void preview(controller.signal);
    return () => controller.abort();
    // A new account starts a fresh server-side preview; recalculation is explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id]);
  const execute = async () => {
    if (!plan || !confirmed || executing) return;
    setExecuting(true); setError(''); setDiagnostics(null);
    try {
      const response = await http.postData(`/accounts/${account.id}/excess/execute`, { planId: plan.planId, confirm: true }, { timeout: 600000 });
      setReport(response.data); setPlan(null); setConfirmed(false);
      await onComplete?.();
    } catch (failure) {
      setPlan(null); setConfirmed(false);
      setError(failure?.response?.data?.message || 'No se pudo completar la operación. Revisa las cuentas antes de volver a calcular.');
      setDiagnostics(failure?.response?.data?.details || null);
      await onComplete?.();
    } finally { setExecuting(false); }
  };
  return <Dialog open={Boolean(account)} onClose={executing ? undefined : onClose} fullWidth maxWidth="md" PaperProps={{ sx: { bgcolor: '#101b2a', border: '1px solid rgba(148,163,184,.23)', borderRadius: 2 } }}>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 16 }}><CleaningServicesOutlined sx={{ color: '#fb923c', fontSize: 20 }} />Depurar exceso · {account?.alias}<IconButton size="small" aria-label="Cerrar" disabled={executing} onClick={onClose} sx={{ ml: 'auto' }}><CloseOutlined fontSize="small" /></IconButton></DialogTitle>
    <DialogContent dividers>
      {busy && <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2, color: '#94a3b8', fontSize: 13 }}><CircularProgress size={20} />Leyendo Main y Backup para calcular cuánto liberar hasta el 95 %…</Box>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {diagnostics?.accounts && <Box sx={{ mb: 1 }}>
        {diagnostics.accounts.map(item => <Box key={item.id} sx={{ py: 1, borderBottom: '1px solid rgba(148,163,184,.15)' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{item.type === 'main' ? 'Main' : 'Backup'} · {item.alias} <Box component="span" sx={{ color: item.remainingMB > 0 ? '#fda4af' : '#6ee7b7', ml: 1 }}>{item.beforePercent.toFixed(2)} %</Box></Typography>
          <Typography sx={{ fontSize: 11, color: '#94a3b8', mt: .4 }}>Necesita liberar {gb(item.requiredMB)} · {item.scannedFiles} archivos encontrados · Disponibles {gb(item.availableMB)}{item.remainingMB > 0 ? ` · Faltan ${gb(item.remainingMB)}` : ''}</Typography>
          {item.protectedFiles > 0 && <Typography sx={{ fontSize: 10, color: '#7b91aa', mt: .4 }}>{item.protectedFiles} archivos de otros modelos o en procesamiento se conservan.</Typography>}
        </Box>)}
      </Box>}
      {plan && <>
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
        <FormControlLabel sx={{ mt: 1.5, '& .MuiFormControlLabel-label': { fontSize: 12 } }} control={<Checkbox size="small" checked={confirmed} disabled={executing} onChange={event => setConfirmed(event.target.checked)} />} label="Confirmo eliminar estos archivos de Main y Backup. Se borrarán las copias indicadas." />
        <Typography sx={{ fontSize: 10, color: '#7b91aa' }}>La vista previa caduca a las {new Date(plan.expiresAt).toLocaleTimeString('es-CO')}. Si cambian las cuentas, será necesario recalcularla.</Typography>
      </>}
      {executing && <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, fontSize: 12 }}><CircularProgress size={18} />Revalidando y depurando los archivos confirmados…</Box>}
      {report && <>
        <Alert severity={report.ok ? 'success' : 'warning'} sx={{ mb: 1.5 }}>{report.message}</Alert>
        {report.accounts.map(item => <Typography key={item.id} sx={{ fontSize: 12, mb: .5 }}>{item.alias}: {item.error || `${item.percent.toFixed(2)} % · ${gb(item.usedMB)} / ${gb(item.totalMB)}`}</Typography>)}
        {report.results.map(item => <Typography key={item.key || item.assetId} sx={{ fontSize: 11, color: item.error ? '#fda4af' : '#94a3b8', mt: .5 }}>{item.assetId ? `#${item.assetId}` : item.title} · {item.completed ? 'Depurado' : item.error || 'Pendiente'}</Typography>)}
      </>}
    </DialogContent>
    <DialogActions sx={{ px: 3, py: 1.5 }}>
      <Button onClick={onClose} disabled={executing} sx={{ textTransform: 'none' }}>Cerrar</Button>
      {!busy && !executing && !plan && !report?.ok && <Button variant="outlined" onClick={() => preview()} sx={{ textTransform: 'none' }}>Recalcular vista previa</Button>}
      {plan && <Button variant="contained" color="error" disabled={!confirmed || busy || executing} onClick={execute} sx={{ textTransform: 'none' }}>Confirmar depuración</Button>}
    </DialogActions>
  </Dialog>;
}
