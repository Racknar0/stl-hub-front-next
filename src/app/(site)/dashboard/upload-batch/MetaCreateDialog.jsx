'use client'

import React, { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack } from '@mui/material'
import HttpService from '@/services/HttpService'

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-\s_]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

export default function MetaCreateDialog({ open = false, type = 'cat', onClose = () => {}, onCreated = () => {} }) {
  const http = new HttpService()
  const [nameEs, setNameEs] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const name = String(nameEs || '').trim()
    const nameE = String(nameEn || '').trim()
    if (!name || !nameE) return
    setSaving(true)
    try {
      const body = { name, slug: slugify(name), nameEn: nameE, slugEn: slugify(nameE) }
      const res = type === 'cat' ? await http.postData('/categories', body) : await http.postData('/tags', body)
      if (res?.data) {
        onCreated(res.data)
      }
      setNameEs(''); setNameEn('')
      onClose()
    } catch (e) {
      console.error('MetaCreateDialog save error', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{type === 'cat' ? 'Nueva Categoría' : 'Nuevo Tag'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Español" value={nameEs} onChange={e => setNameEs(e.target.value)} fullWidth />
          <TextField label="Inglés" value={nameEn} onChange={e => setNameEn(e.target.value)} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !String(nameEs||'').trim() || !String(nameEn||'').trim()}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
