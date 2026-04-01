// ╔════════════════════════════════════════════════════════════╗
// ║ BatchControlPanel.jsx                                      ║
// ║ Panel superior de acciones: SCP dropzone, Escanear,         ║
// ║ IA Metadatos, Distribuir, Selector de cuentas,              ║
// ║ Rotar Proxy, Detener Todo, Modo Revisión,                   ║
// ║ Eliminar Completados, Eliminar Todo                         ║
// ╚════════════════════════════════════════════════════════════╝
'use client'

import React from 'react'
import {
  Button, Stack, Box, Typography, FormControl, InputLabel,
  Select, MenuItem, Checkbox, ListItemText, Switch, FormControlLabel,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import ReplayIcon from '@mui/icons-material/Replay'

export default function BatchControlPanel({
  // ─── SCP Dropzone ───
  scpPickerRef,
  scpDropActive,
  scpIndexedFile,
  formatBytes,
  handleScpPick,
  handleScpDrop,
  setScpDropActive,
  // ─── Acciones principales ───
  isScanning,
  isApplyingAiMetadata,
  isRetryingAi,
  isProcessing,
  isStoppingAll,
  aiRetryCandidateIds,
  handleScanLocal,
  handleApplyAiMetadata,
  handleRetryFailedAi,
  handleAutoDistribute,
  distributionAccountIdsRef,
  // ─── Distribución de cuentas ───
  distributionAccountIds,
  handleDistributionAccountsChange,
  handleDistributionSelectorClose,
  handleDistributionSelectorOpen,
  accountSelectionMeta,
  minPendingAssetMb,
  cuentas,
  // ─── Rotar proxy ───
  activeUploadingRow,
  handleRotateProxyGlobal,
  // ─── Detener todo ───
  rows,
  handleStopAndResetToDraft,
  // ─── Modo revisión ───
  reviewMode,
  setReviewMode,
  // ─── Eliminar completados / todo ───
  http,
  setToast,
  setRows,
  fetchQueue,
  // ─── Estilos compartidos ───
  compactActionBtnSx,
}) {
  return (
    <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
      {/* ── SCP Dropzone ── */}
      <input
        ref={scpPickerRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleScpPick}
      />
      <Box
        onClick={() => scpPickerRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setScpDropActive(true) }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setScpDropActive(false) }}
        onDrop={handleScpDrop}
        sx={{
          minWidth: { xs: '100%', md: 360 },
          maxWidth: 420,
          borderRadius: 2,
          px: 2,
          py: 1.25,
          border: '1px solid',
          borderColor: scpDropActive ? '#38bdf8' : 'rgba(148,163,184,0.7)',
          background: scpDropActive ? 'rgba(56,189,248,0.12)' : 'rgba(15,23,42,0.35)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 700, lineHeight: 1.2 }}>
          Arrastra para preparar comando de subida
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(226,232,240,0.78)', display: 'block', mt: 0.45 }}>
          {scpIndexedFile?.name
            ? `${scpIndexedFile.name} · ${formatBytes(scpIndexedFile.size)}`
            : 'Suelta aquí el archivo pesado (o haz clic para elegir)'}
        </Typography>
      </Box>

      {/* ── Escanear ── */}
      <Button
        variant="outlined"
        color="primary"
        size="small"
        onClick={handleScanLocal}
        disabled={isScanning || isApplyingAiMetadata || isRetryingAi}
        sx={compactActionBtnSx}
      >
        {isScanning ? 'Escaneando...' : 'Escanear Carpetas'}
      </Button>

      {/* ── Metadatos IA ── */}
      <Button
        variant="outlined"
        size="small"
        startIcon={<AutoFixHighIcon />}
        onClick={handleApplyAiMetadata}
        disabled={isApplyingAiMetadata || isScanning || isRetryingAi}
        sx={{
          ...compactActionBtnSx,
          borderColor: '#5eead4',
          color: '#5eead4',
          '&:hover': { borderColor: '#99f6e4', color: '#99f6e4', background: 'rgba(45,212,191,0.12)' }
        }}
      >
        {isApplyingAiMetadata ? 'Metadatos IA...' : 'Metadatos IA'}
      </Button>

      {/* ── Reintentar IA fallidos ── */}
      <Button
        variant="outlined"
        size="small"
        startIcon={<ReplayIcon />}
        onClick={handleRetryFailedAi}
        disabled={isRetryingAi || isScanning || isApplyingAiMetadata || aiRetryCandidateIds.length === 0}
        sx={compactActionBtnSx}
      >
        {isRetryingAi ? 'Reintentando IA...' : `Reintentar IA fallidos (${aiRetryCandidateIds.length})`}
      </Button>

      {/* ── Distribuir automáticamente ── */}
      <Button
        variant="outlined"
        size="small"
        startIcon={<AutoAwesomeIcon />}
        onClick={() => void handleAutoDistribute({ preferredAccountIds: distributionAccountIdsRef.current })}
        sx={{ ...compactActionBtnSx, borderColor: '#b388ff', color: '#b388ff', '&:hover': { borderColor: '#d1c4e9', color: '#d1c4e9' } }}
      >
        Distribuir Automáticamente
      </Button>

      {/* ── Selector de cuentas para distribución ── */}
      <Box sx={{ minWidth: { xs: '100%', md: 330 }, maxWidth: 460 }}>
        <FormControl size="small" fullWidth>
          <InputLabel id="batch-distribution-accounts-label" sx={{ color: 'rgba(226,232,240,0.88)' }}>
            Cuentas para distribución
          </InputLabel>
          <Select
            labelId="batch-distribution-accounts-label"
            multiple
            displayEmpty
            value={distributionAccountIds}
            onChange={handleDistributionAccountsChange}
            onOpen={handleDistributionSelectorOpen}
            onClose={handleDistributionSelectorClose}
            renderValue={(selected) => {
              const ids = Array.isArray(selected) ? selected.map(Number) : []
              if (!ids.length) return 'Selecciona cuentas y cierra para redistribuir'
              const labels = (Array.isArray(cuentas) ? cuentas : [])
                .filter((c) => ids.includes(Number(c.id)))
                .map((c) => c.alias)
              return labels.join(', ')
            }}
            sx={{
              color: '#f8fbff',
              bgcolor: 'rgba(30,41,59,0.55)',
              borderRadius: 2,
              '& .MuiSelect-icon': { color: '#e2e8f0' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.45)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(191,219,254,0.72)' },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  bgcolor: '#020617',
                  border: '1px solid rgba(71,85,105,0.55)',
                },
              },
            }}
          >
            {accountSelectionMeta.selectable.map((c) => {
              const freeMb = Math.max(0, Number(c.freeMb || 0))
              const freeGb = (freeMb / 1024).toFixed(2)
              const checked = distributionAccountIds.includes(Number(c.id))
              return (
                <MenuItem
                  key={c.id}
                  value={c.id}
                  sx={{
                    color: '#e2e8f0',
                    bgcolor: '#0f172a',
                    '&.Mui-selected': { bgcolor: '#020617' },
                    '&.Mui-selected:hover': { bgcolor: '#111827' },
                    '&:hover': { bgcolor: '#1e293b' },
                  }}
                >
                  <Checkbox checked={checked} size="small" sx={{ color: '#93c5fd', '&.Mui-checked': { color: '#d1d5db' } }} />
                  <ListItemText
                    primary={c.alias}
                    secondary={`${freeGb} GB libres`}
                    primaryTypographyProps={{ fontWeight: checked ? 800 : 700, color: '#e2e8f0' }}
                    secondaryTypographyProps={{ color: checked ? 'rgba(226,232,240,0.92)' : 'rgba(203,213,225,0.82)' }}
                  />
                </MenuItem>
              )
            })}
          </Select>
        </FormControl>
        <Typography variant="caption" sx={{ mt: 0.5, color: 'rgba(191,219,254,0.9)', display: 'block' }}>
          Filtro activo: solo cuentas con al menos {(Math.max(0, minPendingAssetMb) / 1024).toFixed(2)} GB libres (asset mínimo pendiente).
          {accountSelectionMeta.blockedCount > 0 ? ` Ocultas por espacio insuficiente: ${accountSelectionMeta.blockedCount}.` : ''}
        </Typography>
      </Box>

      {/* ── Rotar Proxy ── */}
      <Button
        variant="outlined"
        color="warning"
        size="small"
        onClick={handleRotateProxyGlobal}
        disabled={!activeUploadingRow}
        sx={compactActionBtnSx}
      >
        Rotar Proxy
      </Button>

      {/* ── Detener Todo → Borrador ── */}
      <Button
        variant="outlined"
        size="small"
        color="error"
        onClick={handleStopAndResetToDraft}
        disabled={isStoppingAll || rows.every((r) => String(r?.estado || '').toLowerCase() === 'borrador')}
        sx={{
          ...compactActionBtnSx,
          borderColor: '#ef4444',
          color: '#fecaca',
          '&:hover': { borderColor: '#fca5a5', color: '#fee2e2', background: 'rgba(239,68,68,0.14)' }
        }}
      >
        {isStoppingAll ? 'Deteniendo...' : 'Detener Todo -> Borrador'}
      </Button>

      {/* ── Modo Revisión ── */}
      <FormControlLabel
        control={<Switch checked={reviewMode} onChange={(e) => setReviewMode(Boolean(e?.target?.checked))} color="info" />}
        label={
          <Typography variant="caption" sx={{ color: 'rgba(226,232,240,0.95)', fontWeight: 700 }}>
            Modo revisión (virtual) · Atajos: A/D/F
          </Typography>
        }
        sx={{
          m: 0, px: 1, py: 0.2, borderRadius: 2,
          border: '1px solid rgba(125,211,252,0.35)',
          background: 'rgba(14,116,144,0.18)',
        }}
      />

      {/* ── Eliminar Completados ── */}
      <Button
        variant="outlined"
        size="small"
        onClick={async () => {
          if (!confirm('¿Eliminar todos los items COMPLETADOS del batch?')) return
          try {
            const res = await http.deleteRaw('/batch-imports/completed')
            if (res.data?.success) {
              setToast({ open: true, msg: res.data.message || 'Completados eliminados', type: 'success' })
              fetchQueue()
            } else {
              setToast({ open: true, msg: 'Error al eliminar completados', type: 'error' })
            }
          } catch (e) {
            console.error(e)
            setToast({ open: true, msg: 'Error de red al eliminar completados', type: 'error' })
          }
        }}
        sx={{ ...compactActionBtnSx, borderColor: '#f59e0b', color: '#f59e0b', '&:hover': { borderColor: '#fbbf24', color: '#fbbf24', background: 'rgba(245,158,11,0.08)' } }}
      >
        ✅ Eliminar Completados
      </Button>

      {/* ── Eliminar Todo (purge) ── */}
      <Button
        variant="outlined"
        size="small"
        onClick={async () => {
          if (!confirm('¿Estás seguro? Esto eliminará TODOS los items del batch, las carpetas y los registros de la BD.')) return
          try {
            const res = await http.deleteRaw('/batch-imports/purge-all')
            if (res.data?.success) {
              setRows([])
              setToast({ open: true, msg: res.data.message, type: 'success' })
            } else {
              setToast({ open: true, msg: 'Error al purgar', type: 'error' })
            }
          } catch (e) {
            console.error(e)
            setToast({ open: true, msg: 'Error de red al purgar', type: 'error' })
          }
        }}
        sx={{ ...compactActionBtnSx, borderColor: '#ff5252', color: '#ff5252', '&:hover': { borderColor: '#ff8a80', color: '#ff8a80', background: 'rgba(255,82,82,0.08)' } }}
      >
        🗑️ Eliminar Todo
      </Button>
    </Stack>
  )
}
