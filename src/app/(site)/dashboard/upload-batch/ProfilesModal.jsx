'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box, Stack, Chip, Typography } from '@mui/material'
import HttpService from '@/services/HttpService'

export default function ProfilesModal({ open = false, onClose = () => {}, selectedRow = null, onApply = () => {} }) {
  const http = new HttpService()
  const LS_PROFILES_KEY = 'uploader_profiles_v1'
  const [profiles, setProfiles] = useState([])
  const [profilesSearch, setProfilesSearch] = useState('')
  const [addProfileOpen, setAddProfileOpen] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [importProfilesOpen, setImportProfilesOpen] = useState(false)
  const [importProfilesText, setImportProfilesText] = useState('')

  const readLegacyProfilesFromLocalStorage = useCallback(() => {
    try { return JSON.parse(localStorage.getItem(LS_PROFILES_KEY)) || [] } catch { return [] }
  }, [])

  const sortProfilesByName = useCallback((arr = []) => {
    return [...(arr || [])].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { sensitivity: 'base' }))
  }, [])

  const saveProfilesToDb = useCallback(async (arr) => {
    const ordered = sortProfilesByName(arr)
    try {
      await http.postData('/me/uploader-profiles', { profiles: ordered })
    } catch (e) {
      console.error('saveProfilesToDb error', e)
    }
    return ordered
  }, [http, sortProfilesByName])

  const loadProfilesFromDb = useCallback(async () => {
    try {
      const res = await http.getData('/me/uploader-profiles')
      const arr = Array.isArray(res?.data?.profiles) ? res.data.profiles : []

      if (arr.length === 0) {
        const legacy = readLegacyProfilesFromLocalStorage()
        if (Array.isArray(legacy) && legacy.length > 0) {
          const ordered = await saveProfilesToDb(legacy)
          setProfiles(ordered)
          return ordered
        }
      }

      const ordered = sortProfilesByName(arr)
      setProfiles(ordered)
      return ordered
    } catch (e) {
      console.error('loadProfilesFromDb error', e)
      setProfiles([])
      return []
    }
  }, [http, readLegacyProfilesFromLocalStorage, saveProfilesToDb, sortProfilesByName])

  useEffect(() => {
    if (!open) return
    void loadProfilesFromDb()
  }, [open, loadProfilesFromDb])

  const addProfile = useCallback((name, catsSlugs = [], tagsList = []) => {
    const trimmed = String(name || '').trim()
    if (!trimmed) return
    setProfiles((prev) => {
      const all = Array.isArray(prev) ? [...prev] : []
      const idx = all.findIndex(p => String(p?.name || '').toLowerCase() === trimmed.toLowerCase())
      const next = { name: trimmed, categories: Array.from(new Set(catsSlugs)), tags: Array.from(new Set(tagsList)) }
      if (idx >= 0) all[idx] = next
      else all.push(next)
      const ordered = sortProfilesByName(all)
      void saveProfilesToDb(ordered)
      return ordered
    })
  }, [saveProfilesToDb, sortProfilesByName])

  const removeProfile = useCallback((name) => {
    const target = String(name || '').toLowerCase()
    setProfiles((prev) => {
      const all = Array.isArray(prev) ? prev : []
      const next = all.filter(p => String(p?.name || '').toLowerCase() !== target)
      const ordered = sortProfilesByName(next)
      void saveProfilesToDb(ordered)
      return ordered
    })
  }, [saveProfilesToDb, sortProfilesByName])

  const exportProfiles = useCallback(async () => {
    try {
      const json = JSON.stringify(profiles || [], null, 2)
      await navigator.clipboard.writeText(json)
      window.alert('Perfiles copiados al portapapeles')
    } catch (e) {
      console.error('exportProfiles error', e)
      window.alert('No pude copiar al portapapeles')
    }
  }, [profiles])

  const importProfiles = useCallback(() => {
    setImportProfilesText(JSON.stringify(profiles || [], null, 2))
    setImportProfilesOpen(true)
  }, [profiles])

  const applyImportedProfiles = useCallback(async () => {
    let parsed
    try {
      parsed = JSON.parse(importProfilesText)
    } catch {
      window.alert('JSON inválido')
      return
    }
    if (!Array.isArray(parsed)) {
      window.alert('El JSON debe ser un array de perfiles')
      return
    }
    const ordered = sortProfilesByName(parsed)
    setProfiles(ordered)
    await saveProfilesToDb(ordered)
    setImportProfilesOpen(false)
  }, [importProfilesText, saveProfilesToDb, sortProfilesByName])

    const getCleanCount = (value) => {
      if (Array.isArray(value)) return value.map(v => typeof v === 'string' ? v : (v?.slug || v?.name || '')).filter(Boolean).length;
      if (typeof value === 'string') return value.split(',').filter(Boolean).length;
      return 0;
    }

    return (
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          className: "glass",
          sx: {
            background: '#1d1e26 !important',
            color: '#adafb8 !important',
            border: '1px solid rgba(173,175,184,0.2)',
            '& .MuiTypography-root': { color: '#adafb8 !important' },
            '& .MuiChip-root': {
              background: 'rgba(173,175,184,0.13)',
              color: '#adafb8',
              border: '1px solid rgba(173,175,184,0.24)',
            },
            '& .MuiChip-root.profile-chip-single': {
              background: 'rgba(0, 200, 120, 0.12)',
              border: '1px solid rgba(0, 200, 120, 0.34)',
              color: '#c8f5e3',
              height: 25,
              transform: 'scale(1.01)',
            },
            '& .MuiChip-root.profile-chip-single:hover': {
              background: 'rgba(0, 200, 120, 0.16)',
              borderColor: 'rgba(0, 200, 120, 0.46)',
            },
            '& .MuiButton-outlined': {
              color: '#adafb8',
              borderColor: 'rgba(173,175,184,0.35)',
            },
            '& .MuiInputBase-root': {
              color: '#adafb8',
              background: 'rgba(23,24,31,0.92)',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(173,175,184,0.3)',
            },
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff !important' }}>Perfiles Rápidos</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Box sx={{ mb: 2 }}>
            <TextField
              placeholder="Buscar perfil..."
              value={profilesSearch}
              onChange={e => setProfilesSearch(e.target.value)}
              size="small"
              fullWidth
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {profiles.length === 0 && <Typography variant="caption" sx={{ opacity: 0.6 }}>No hay perfiles. Crea uno con tus categorías y tags frecuentes.</Typography>}
              {sortProfilesByName(profiles).filter(p => {
                const q = String(profilesSearch || '').toLowerCase().trim()
                if (!q) return true
                return (p.name || '').toLowerCase().includes(q) || (p.categories || []).join(' ').toLowerCase().includes(q) || (p.tags || []).join(' ').toLowerCase().includes(q)
              }).map(p => {
                const hasSingleCategory = getCleanCount(p?.categories) === 1
                const hasSingleTag = getCleanCount(p?.tags) === 1
                const isSingleCatSingleTag = hasSingleCategory && hasSingleTag

                return (
                  <Chip
                    key={p.name}
                    label={p.name}
                    className={isSingleCatSingleTag ? 'profile-chip-single' : undefined}
                    size="small"
                    onClick={() => { onApply?.(p) }}
                    onDelete={() => removeProfile(p.name)}
                    sx={{ cursor:'pointer', transition: 'background-color .15s ease, border-color .15s ease, transform .15s ease' }}
                  />
                )
              })}
            </Box>
          </Box>
        <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', mb:2 }}>
          <Button size="small" variant="outlined" onClick={exportProfiles} disabled={profiles.length === 0}>Exportar JSON</Button>
          <Button size="small" variant="outlined" onClick={importProfiles}>Importar JSON</Button>
          {!addProfileOpen ? (
            <Button size="small" variant="outlined" onClick={() => setAddProfileOpen(true)}>Añadir perfil</Button>
          ) : (
            <>
              <TextField size="small" placeholder="Nombre del perfil" value={newProfileName} onChange={e=>setNewProfileName(e.target.value)} sx={{ minWidth: 200 }} />
              <Button size="small" variant="contained" onClick={() => {
                if (!String(newProfileName||'').trim()) return
                // crear desde selectedRow si existe
                const cats = Array.isArray(selectedRow?.categorias) ? selectedRow.categorias.map(c => c.slug || c) : []
                const tags = Array.isArray(selectedRow?.tags) ? selectedRow.tags.map(t => t.slug || t) : []
                addProfile(newProfileName, cats, tags)
                setNewProfileName('')
                setAddProfileOpen(false)
              }} disabled={!String(newProfileName||'').trim()}>Guardar</Button>
              <Button size="small" onClick={()=>{ setAddProfileOpen(false); setNewProfileName('') }}>Cancelar</Button>
            </>
          )}
        </Box>
        <Dialog open={importProfilesOpen} onClose={()=>setImportProfilesOpen(false)} maxWidth="sm" fullWidth
          PaperProps={{
            className: "glass",
            sx: {
              background: '#1d1e26 !important',
              color: '#adafb8 !important',
              border: '1px solid rgba(173,175,184,0.2)',
              '& .MuiInputBase-root': { color: '#adafb8', background: 'rgba(23,24,31,0.92)' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(173,175,184,0.3)' },
            }
          }}
        >
          <DialogTitle sx={{ color: '#fff !important' }}>Importar perfiles JSON</DialogTitle>
          <DialogContent sx={{ py: 2 }}>
            <TextField
              placeholder="Pega aquí el JSON..."
              value={importProfilesText}
              onChange={e=>setImportProfilesText(e.target.value)}
              multiline
              minRows={6}
              fullWidth
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={()=>setImportProfilesOpen(false)} sx={{ color: '#adafb8' }}>Cancelar</Button>
            <Button variant="contained" onClick={applyImportedProfiles} sx={{ background: '#00C853', color: '#fff' }}>Aplicar</Button>
          </DialogActions>
        </Dialog>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, borderTop: '1px solid rgba(173,175,184,0.1)' }}>
        <Button onClick={onClose} sx={{ color: '#adafb8' }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}
