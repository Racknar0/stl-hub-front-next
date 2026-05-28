// ╔════════════════════════════════════════════════════════════╗
// ║ SimilaritySidebar.jsx                                      ║
// ║ Sidebar lateral de búsqueda de similares:                   ║
// ║  - Muestra el ítem borrador actual + sus imágenes           ║
// ║  - Resultados de assets similares encontrados               ║
// ║  - Botones: cambiar lado, cerrar, revalidar                 ║
// ║  - Botón eliminar asset similar (🗑️)                        ║
// ╚════════════════════════════════════════════════════════════╝
'use client'

import React from 'react'
import { Box, Button, Stack, Typography, Divider, CircularProgress, IconButton, Tooltip } from '@mui/material'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import RightSidebar from '../../assets/componentes/RightSidebar'
import { RIGHT_SIDEBAR_WIDTH } from '../constants'

export default function SimilaritySidebar({
  searchSidebarOpen,
  setSearchSidebarOpen,
  searchSidebarSide,
  toggleSearchSidebarSide,
  similaritySelectedId,
  setSimilaritySelectedId,
  sidebarQueueItem,
  sidebarSimilarity,
  startSimilarityCheck,
  makeUploadsUrl,
  setPreviewImage,
  onDeleteAsset,
  deletingAssetIds,
}) {
  return (
    <RightSidebar
      side={searchSidebarSide}
      collapsedWidth={52}
      collapsible={true}
      open={searchSidebarOpen}
      onToggle={() => setSearchSidebarOpen(!searchSidebarOpen)}
      inFlow={false}
      width={RIGHT_SIDEBAR_WIDTH}
      title="Búsqueda Similares"
      headerAction={
        <Stack direction="row" spacing={0.5}>
          <Tooltip title={searchSidebarSide === 'right' ? 'Mover a Izquierda' : 'Mover a Derecha'}>
            <IconButton size="small" onClick={toggleSearchSidebarSide} sx={{ border: '1px solid rgba(173,175,184,0.35)', color: '#adafb8', p: 0.5, borderRadius: 2 }}>
              <SwapHorizIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cerrar Búsqueda">
            <IconButton size="small" color="error" onClick={() => setSimilaritySelectedId(null)} sx={{ border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444', p: 0.5, borderRadius: 2 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      }
    >
      {!sidebarQueueItem ? (
        <Typography variant="body2" sx={{ opacity: 0.8, px: 1 }}>Selecciona un ítem para ver similares.</Typography>
      ) : (
        <Box sx={{ px: 1 }}>
          {/* ── Ítem borrador actual ── */}
          <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Ítem Borrador</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5, wordBreak: 'break-word' }}>
            {sidebarQueueItem?.nombre || '(sin nombre)'}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 0.5 }}>
            Ítem en foco para búsqueda
          </Typography>

          <Divider sx={{ my: 1.25, opacity: 0.2 }} />

          {/* ── Resultados de similares ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Assets similares</Typography>
            {sidebarSimilarity?.status === 'loading' && <CircularProgress size={14} />}
            <Box sx={{ flex: 1 }} />
            <Button
              size="small"
              variant="outlined"
              onClick={() => { if (sidebarQueueItem) void startSimilarityCheck(sidebarQueueItem) }}
              disabled={!sidebarQueueItem || sidebarSimilarity?.status === 'loading'}
              sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: 12, lineHeight: 1.1 }}
            >
              Revalidar
            </Button>
          </Box>

          {sidebarSimilarity?.status === 'loading' && (
            <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 0.75 }}>
              {sidebarSimilarity?.phase || 'Buscando similares…'}
            </Typography>
          )}

          {sidebarSimilarity?.status === 'done' && (
            <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 0.5 }}>
              {(sidebarSimilarity?.items || []).length} encontrados · hashes usados: {Number(sidebarSimilarity?.imageHashCount || 0)}
            </Typography>
          )}

          {sidebarSimilarity?.status === 'error' && (
            <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5 }}>
              {sidebarSimilarity?.error || 'No se pudo buscar similares'}
            </Typography>
          )}

          {/* ── Lista de resultados ── */}
          {sidebarSimilarity?.status === 'done' && (
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {(sidebarSimilarity?.items || []).map((a) => {
                const scoreValue = Number(a?._score || a?._similarity?.score || 0);
                const percent = Math.round(scoreValue * 100);
                const isDeleting = deletingAssetIds?.has?.(a.id) || false;
                return (
                  <Box key={a.id} sx={{ p: 1, borderRadius: 2, border: '1px solid rgba(88, 214, 141, 0.45)', background: 'rgba(255,255,255,0.03)', opacity: isDeleting ? 0.45 : 1, transition: 'opacity 0.3s ease' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ flex: 1, pr: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{a.title}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.2, wordBreak: 'break-word', fontSize: '0.65rem' }}>{a.archiveName}</Typography>
                      </Box>
                      <Stack direction="row" alignItems="center" spacing={0.4} sx={{ flexShrink: 0 }}>
                        <Box sx={{
                          px: 0.8, py: 0.3, borderRadius: 1.5,
                          background: percent > 85 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                          border: `1px solid ${percent > 85 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`,
                          color: percent > 85 ? '#86efac' : '#fde047',
                          fontWeight: 800, fontSize: '0.75rem',
                        }}>
                          {percent}%
                        </Box>
                        <Tooltip title={isDeleting ? 'Eliminando…' : 'Eliminar asset'}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={isDeleting}
                              onClick={() => onDeleteAsset?.(a.id, a.title || a.archiveName || `ID ${a.id}`)}
                              sx={{
                                color: '#ef4444',
                                p: 0.4,
                                '&:hover': { background: 'rgba(239, 68, 68, 0.15)' },
                                '&.Mui-disabled': { color: 'rgba(239, 68, 68, 0.3)' },
                              }}
                            >
                              {isDeleting
                                ? <CircularProgress size={16} sx={{ color: '#ef4444' }} />
                                : <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                              }
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Stack>
                    
                    {(a.images || []).length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 1, overflowX: 'auto', pb: 0.5 }}>
                        {(a.images || []).map((src, i) => {
                          const safeSrc = makeUploadsUrl(src)
                          if (!safeSrc) return null
                          return (
                            <img
                              key={i}
                              src={safeSrc}
                              style={{
                                width: 75,
                                height: 75,
                                objectFit: 'cover',
                                borderRadius: 6,
                                border: '1px solid rgba(148,163,184,0.3)',
                                cursor: 'pointer'
                              }}
                              onClick={() => setPreviewImage(safeSrc)}
                            />
                          )
                        })}
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Box>
          )}

          {sidebarSimilarity?.status === 'done' && (sidebarSimilarity?.items || []).length === 0 && (
            <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 1 }}>
              No se encontraron coincidencias.
            </Typography>
          )}
        </Box>
      )}
    </RightSidebar>
  )
}
