'use client'
import React from 'react'
import { Dialog, DialogTitle, DialogContent, IconButton, Stack, Box, Chip, Typography, Link as MUILink } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import LinkIcon from '@mui/icons-material/Link'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'

const statusColor = (s) => ({
  DRAFT: 'default',
  PROCESSING: 'info',
  PUBLISHED: 'success',
  FAILED: 'error',
}[s] || 'default')

export default function ModalDetalle({ open, onClose, detail, selected, imgUrl, formatMBfromB, loadingDetail }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {detail?.title || selected?.title || 'Detalle del asset'}
        <IconButton onClick={onClose} aria-label="Cerrar"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {(detail || selected) ? (
          <Stack spacing={2}>
            <Box>
              {Array.isArray((detail?.images ?? selected?.images)) && (detail?.images ?? selected?.images).length > 0 ? (
                <Swiper modules={[Navigation]} navigation spaceBetween={10} slidesPerView={1} style={{ width: '100%', height: 320 }}>
                  {(detail?.images ?? selected.images).map((rel, idx) => (
                    <SwiperSlide key={idx}>
                      <img src={imgUrl(rel)} alt={`img-${idx}`} style={{ width: '100%', height: 320, objectFit: 'contain', borderRadius: 8 }} />
                    </SwiperSlide>
                  ))}
                </Swiper>
              ) : (
                <Box sx={{ width: '100%', height: 320, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)' }} />
              )}
            </Box>

            <Stack direction="row" spacing={2}>
              <Chip size="small" label={(detail?.category ?? selected?.category) || 'Sin categoría'} />
              {(detail?.isPremium ?? selected?.isPremium) && <Chip size="small" color="warning" label="Premium" />}
              <Chip size="small" label={(detail?.status ?? selected?.status)} color={statusColor(detail?.status ?? selected?.status)} />
            </Stack>

            <Box>
              <Typography variant="subtitle2">Título (ES)</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>{detail?.title || selected?.title || '-'}</Typography>
              <Typography variant="subtitle2">Title (EN)</Typography>
              <Typography variant="body2">{detail?.titleEn || selected?.titleEn || '-'}</Typography>
            </Box>

            {(() => {
              const cats = Array.isArray(detail?.categories) ? detail.categories : []
              const catsEs = cats.length ? cats.map(c => c?.name).filter(Boolean) : ((detail?.category ?? selected?.category) ? [detail?.category ?? selected?.category] : [])
              const catsEn = cats.length ? cats.map(c => c?.nameEn || c?.name).filter(Boolean) : catsEs
              return (
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Categorías (ES)</Typography>
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                    {catsEs.length ? catsEs.map((n, i) => (<Chip key={`ces-${i}`} size="small" label={n} variant="outlined" />)) : (<Typography variant="body2" color="text.secondary">-</Typography>)}
                  </Stack>
                  <Typography variant="subtitle2">Categories (EN)</Typography>
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                    {catsEn.length ? catsEn.map((n, i) => (<Chip key={`cen-${i}`} size="small" label={n} variant="outlined" />)) : (<Typography variant="body2" color="text.secondary">-</Typography>)}
                  </Stack>
                </Stack>
              )
            })()}

            {(() => {
              const tagsEs = Array.isArray(detail?.tagsEs) ? detail.tagsEs : (Array.isArray(selected?.tags) ? selected.tags.map(t=>t?.slug||t) : [])
              const tagsEn = Array.isArray(detail?.tagsEn) ? detail.tagsEn : (Array.isArray(selected?.tags) ? selected.tags.map(t=>t?.nameEn||t?.name||t?.slug||t) : tagsEs)
              return (
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Tags (ES)</Typography>
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                    {tagsEs.length ? tagsEs.map((t, i) => (<Chip key={`tes-${i}`} size="small" label={t} variant="outlined" />)) : (<Typography variant="body2" color="text.secondary">-</Typography>)}
                  </Stack>
                  <Typography variant="subtitle2">Tags (EN)</Typography>
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                    {tagsEn.length ? tagsEn.map((t, i) => (<Chip key={`ten-${i}`} size="small" label={t} variant="outlined" />)) : (<Typography variant="body2" color="text.secondary">-</Typography>)}
                  </Stack>
                </Stack>
              )
            })()}

            <Typography variant="body2">Cuenta: {detail?.account?.alias || detail?.accountId || selected?.account?.alias || selected?.accountId}</Typography>
            <Typography variant="body2">Tamaño: {formatMBfromB((detail?.fileSizeB ?? detail?.archiveSizeB) ?? (selected?.fileSizeB ?? selected?.archiveSizeB))}</Typography>
            <Typography variant="body2">Creado: {(detail?.createdAt ?? selected?.createdAt) ? new Date(detail?.createdAt ?? selected?.createdAt).toLocaleString() : '-'}</Typography>
            {(detail?.megaLink ?? selected?.megaLink) && (
              <Typography variant="body2">
                <LinkIcon fontSize="small" style={{ verticalAlign: 'middle' }} />{' '}
                <MUILink href={detail?.megaLink ?? selected?.megaLink} target="_blank" rel="noreferrer" underline="hover">Enlace MEGA</MUILink>
              </Typography>
            )}
            {(detail?.description ?? selected?.description) && (
              <Typography variant="body2" color="text.secondary">{detail?.description ?? selected?.description}</Typography>
            )}

            {loadingDetail && <Typography variant="caption" color="text.secondary">Cargando detalle…</Typography>}
          </Stack>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
