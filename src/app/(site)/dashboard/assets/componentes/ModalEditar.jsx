'use client'
import React from 'react'
import { Dialog, DialogTitle, DialogContent, Box, Stack, TextField, Chip, Button, Autocomplete, FormControlLabel, Switch, Typography } from '@mui/material'
import ImagesSection from '../uploader/ImagesSection'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'

export default function ModalEditar({ open, onClose, selected, editForm, setEditForm, categories, allTags, editImageFiles, setEditImageFiles, editPreviewIndex, setEditPreviewIndex, fileInputRef, onSelectFiles, onOpenFilePicker, onPrev, onNext, onDrop, onDragOver, onRemove, onSelectPreview, loading, onSave, imgUrl }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      slotProps={{ backdrop: { sx: { zIndex: 1500 } }, paper: { sx: { zIndex: 1600 } } }}>
      <DialogTitle>Editar STL</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField label="Nombre (ES)" value={editForm.title} onChange={(e)=>setEditForm(f=>({...f, title: e.target.value}))} fullWidth size="small" />
          <TextField label="Nombre (EN)" value={editForm.titleEn} onChange={(e)=>setEditForm(f=>({...f, titleEn: e.target.value}))} fullWidth size="small" />

          <Autocomplete
            multiple
            disableCloseOnSelect
            options={categories}
            getOptionLabel={(o)=>o?.name || ''}
            isOptionEqualToValue={(o,v)=>o.id===v.id}
            value={editForm.categories || []}
            onChange={(_, v) => setEditForm(f=>({...f, categories: v }))}
            renderTags={(value, getTagProps) => value.map((option, index) => (
              <Chip variant="outlined" label={option.name} {...getTagProps({ index })} key={`${option.slug}-${index}`} />
            ))}
            renderInput={(params) => (
              <TextField {...params} size="small" label="Categorías" placeholder="Selecciona categorías" />
            )}
          />

          <Autocomplete
            multiple
            freeSolo
            options={allTags}
            getOptionLabel={(o)=> (typeof o === 'string' ? o : (o?.name || o?.slug || ''))}
            value={editForm.tags}
            onChange={(_, v) => {
              const slugify = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9-\s_]+/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80)
              const normalized = Array.from(new Set((v||[]).map(item => {
                if (typeof item === 'string') return slugify(item)
                return slugify(item.slug || item.name)
              }).filter(Boolean)))
              setEditForm(f=>({...f, tags: normalized}))
            }}
            slotProps={{ popper: { sx: { zIndex: 2000 } }, paper: { sx: { zIndex: 2000 } } }}
            renderTags={(value, getTagProps) => (value||[]).map((option, index) => (
              <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option+index} />
            ))}
            renderInput={(params) => (
              <TextField {...params} size="small" label="Tags" placeholder="Añadir tag" />
            )}
          />

          <FormControlLabel control={<Switch checked={editForm.isPremium} onChange={(e)=>setEditForm(f=>({...f, isPremium: e.target.checked}))} />} label={editForm.isPremium ? 'Premium' : 'Free'} />

          {editImageFiles.length > 0 ? (
            <ImagesSection
              imageFiles={editImageFiles}
              previewIndex={editPreviewIndex}
              onPrev={onPrev}
              onNext={onNext}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onOpenFilePicker={onOpenFilePicker}
              fileInputRef={fileInputRef}
              onSelectFiles={onSelectFiles}
              onRemove={onRemove}
              onSelectPreview={onSelectPreview}
            />
          ) : (
            <>
              {Array.isArray(selected?.images) && selected.images.length > 0 ? (
                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>Imágenes actuales</Typography>
                  <Swiper modules={[Navigation]} navigation spaceBetween={10} slidesPerView={1} style={{ width: '100%', height: 320 }}>
                    {selected.images.map((rel, idx) => (
                      <SwiperSlide key={idx}>
                        <img src={imgUrl(rel)} alt={`img-${idx}`} style={{ width: '100%', height: 320, objectFit: 'contain', borderRadius: 8 }} />
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </Box>
              ) : (
                <Box sx={{ width: '100%', height: 320, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)' }} />
              )}
              <Box sx={{ mt: 1 }}>
                <Button variant="outlined" onClick={onOpenFilePicker}>Reemplazar imágenes</Button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onSelectFiles} />
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={onSave} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
      </Box>
    </Dialog>
  )
}
