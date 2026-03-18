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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Perfiles rápidos</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <TextField
            label="Buscar perfil"
            value={profilesSearch}
            onChange={e => setProfilesSearch(e.target.value)}
            size="small"
            fullWidth
            sx={{ mb: 2 }}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {profiles.length === 0 && <Typography variant="caption" sx={{ opacity: 0.6 }}>No hay perfiles. Crea uno con tus categorías y tags frecuentes.</Typography>}
            {sortProfilesByName(profiles).filter(p => {
              const q = String(profilesSearch || '').toLowerCase().trim()
              if (!q) return true
              return (p.name || '').toLowerCase().includes(q) || (p.categories || []).join(' ').toLowerCase().includes(q) || (p.tags || []).join(' ').toLowerCase().includes(q)
            }).map(p => (
              <Chip
                key={p.name}
                label={p.name}
                size="small"
                onClick={() => { onApply?.(p) }}
                onDelete={() => removeProfile(p.name)}
                sx={{ cursor:'pointer', mb: 1 }}
              />
            ))}
          </Stack>
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
        {/* Import dialog */}
        <Dialog open={importProfilesOpen} onClose={()=>setImportProfilesOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Importar perfiles JSON</DialogTitle>
          <DialogContent>
            <TextField
              label="Perfiles JSON"
              value={importProfilesText}
              onChange={e=>setImportProfilesText(e.target.value)}
              multiline
              minRows={6}
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={()=>setImportProfilesOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={applyImportedProfiles}>Aplicar</Button>
          </DialogActions>
        </Dialog>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}
