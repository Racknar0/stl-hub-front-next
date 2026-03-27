// ╔════════════════════════════════════════════════════════════╗
// ║ SimilaritySidebar.jsx                                      ║
// ║ Sidebar lateral de búsqueda de similares:                   ║
// ║  - Muestra el ítem borrador actual + sus imágenes           ║
// ║  - Resultados de assets similares encontrados               ║
// ║  - Botones: cambiar lado, cerrar, revalidar                 ║
// ╚════════════════════════════════════════════════════════════╝
'use client'

import React from 'react'
import { Box, Button, Stack, Typography, Divider, CircularProgress } from '@mui/material'
import RightSidebar from '../../assets/uploader/RightSidebar'
import {
  RIGHT_SIDEBAR_WIDTH,
  SIMILARITY_CURRENT_IMAGE_SIZE,
  SIMILARITY_MATCH_IMAGE_SIZE,
} from '../constants'

export default function SimilaritySidebar({
  searchSidebarSide,
  toggleSearchSidebarSide,
  similaritySelectedId,
  setSimilaritySelectedId,
  sidebarQueueItem,
  sidebarSimilarity,
  startSimilarityCheck,
  makeUploadsUrl,
  setPreviewImage,
}) {
  return (
    <RightSidebar
      side={searchSidebarSide}
      collapsible={false}
      inFlow={false}
      open
      width={RIGHT_SIDEBAR_WIDTH}
      title="Búsqueda Similares"
      headerAction={
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={toggleSearchSidebarSide} sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: 12, lineHeight: 1.1, color: '#adafb8', borderColor: 'rgba(173,175,184,0.35)' }}>
            {searchSidebarSide === 'right' ? 'A Izquierda' : 'A Derecha'}
          </Button>
          <Button size="small" variant="contained" color="error" onClick={() => setSimilaritySelectedId(null)} sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: 12, lineHeight: 1.1 }}>
            Cerrar
          </Button>
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
          <Typography variant="caption" sx={{ opacity: 0.75, display: 'block' }}>
            {sidebarQueueItem?.pesoMB} MB • {(sidebarQueueItem?.imagenes || []).length} imágenes
          </Typography>

          {/* ── Imágenes del ítem ── */}
          {(sidebarQueueItem?.imagenes || []).length > 0 && (
            <Box sx={{ mt: 0.9 }}>
              <Typography variant="caption" sx={{ opacity: 0.82, display: 'block', mb: 0.55 }}>
                Imágenes del ítem actual
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.25 }}>
                {(sidebarQueueItem?.imagenes || []).map((src, i) => {
                  const safeSrc = makeUploadsUrl(src)
                  if (!safeSrc) return null
                  return (
                    <img
                      key={`current-${i}`}
                      src={safeSrc}
                      alt={`current-${i}`}
                      style={{
                        width: SIMILARITY_CURRENT_IMAGE_SIZE,
                        height: SIMILARITY_CURRENT_IMAGE_SIZE,
                        objectFit: 'cover',
                        borderRadius: 6,
                        border: '1px solid rgba(173, 175, 184, 0.45)',
                        cursor: 'pointer',
                        background: 'rgba(255,255,255,0.06)'
                      }}
                      onClick={() => setPreviewImage(safeSrc)}
                    />
                  )
                })}
              </Box>
            </Box>
          )}

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
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1.1 }}>
              {(sidebarSimilarity?.items || []).map((a) => (
                <Box key={a.id} sx={{ p: 1, borderRadius: 2, border: '1px solid rgba(88, 214, 141, 0.65)', background: 'rgba(255,255,255,0.05)' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.25 }}>{a.title}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.25, wordBreak: 'break-word' }}>{a.archiveName}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 0.25 }}>
                    {((Number(a.fileSizeB || a.archiveSizeB || 0)) / (1024*1024)).toFixed(2)} MB • {(a.images || []).length} imágenes
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.85, display: 'block', mt: 0.35 }}>
                    Score total: {Number(a?._similarity?.score || 0)} · nombre: {Number(a?._similarity?.name || 0)} · imagen: {Number(a?._similarity?.image || 0)}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'inline-block', mt: 0.55, px: 0.8, py: 0.2, borderRadius: 999, border: '1px solid rgba(88, 214, 141, 0.55)', background: 'rgba(88, 214, 141, 0.14)', color: '#d7ffe7', fontWeight: 700 }}>
                    Coincidencia visual alta
                  </Typography>
                  {(a.images || []).length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.75, overflowX: 'auto' }}>
                      {(a.images || []).map((src, i) => {
                        const safeSrc = makeUploadsUrl(src)
                        if (!safeSrc) return null
                        return (
                          <img
                            key={i}
                            src={safeSrc}
                            style={{
                              width: SIMILARITY_MATCH_IMAGE_SIZE,
                              height: SIMILARITY_MATCH_IMAGE_SIZE,
                              objectFit: 'cover',
                              borderRadius: 6,
                              border: '1px solid rgba(148,163,184,0.45)',
                              cursor: 'pointer'
                            }}
                            onClick={() => setPreviewImage(safeSrc)}
                          />
                        )
                      })}
                    </Box>
                  )}
                </Box>
              ))}
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
