'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Box, Card, CardContent, CardHeader, Divider, Grid, IconButton, LinearProgress, List, ListItem, ListItemButton, ListItemText, Stack, TextField, Tooltip, Typography, Button } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import HttpService from '@/services/HttpService'

const http = new HttpService()

const slugify = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9-\s_]+/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80)

export default function CategoriesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)

  const [form, setForm] = useState({ name: '', slug: '', description: '' })
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return (items || []).filter(it => !qq || it.name.toLowerCase().includes(qq) || it.slug.toLowerCase().includes(qq))
  }, [items, q])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const res = await http.getData('/categories')
      setItems(res.data?.items || [])
    } catch (e) {
      console.error('load categories failed', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [])

  const startNew = () => { setSelected(null); setForm({ name: '', slug: '', description: '' }) }

  const onSelect = (it) => { setSelected(it); setForm({ name: it.name, slug: it.slug, description: it.description || '' }) }

  const save = async () => {
    if (!form.name?.trim()) return
    const payload = { name: form.name.trim(), slug: form.slug?.trim() || slugify(form.name), description: form.description?.trim() || null }
    try {
      setSaving(true)
      if (selected) {
        const res = await http.putData('/categories', selected.id, payload)
        const updated = res.data
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
        setSelected(updated)
      } else {
        const res = await http.postData('/categories', payload)
        const created = res.data
        setItems(prev => [...prev, created].sort((a,b)=>a.name.localeCompare(b.name)))
        setSelected(created)
      }
    } catch (e) {
      console.error('save category failed', e)
    } finally { setSaving(false) }
  }

  const remove = async () => {
    if (!selected) return
    try {
      setSaving(true)
      await http.deleteData('/categories', selected.id)
      setItems(prev => prev.filter(i => i.id !== selected.id))
      startNew()
    } catch (e) {
      console.error('delete category failed', e)
    } finally { setSaving(false) }
  }

  return (
    <div className="dashboard-content p-3">
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card className="glass">
            <CardHeader title="Categorías" action={
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField size="small" placeholder="Buscar" value={q} onChange={(e)=>setQ(e.target.value)} />
                <Tooltip title="Recargar"><span><IconButton onClick={fetchItems} disabled={loading}><RefreshIcon /></IconButton></span></Tooltip>
                <Tooltip title="Nueva categoría"><span><IconButton color="primary" onClick={startNew}><AddIcon /></IconButton></span></Tooltip>
              </Stack>
            } />
            <CardContent sx={{ pt: 0 }}>
              {loading && <LinearProgress />}
              <List dense sx={{ maxHeight: 520, overflow: 'auto' }}>
                {filtered.map(it => (
                  <ListItem key={it.id} disableGutters>
                    <ListItemButton selected={selected?.id === it.id} onClick={()=>onSelect(it)}>
                      <ListItemText primary={it.name} secondary={it.slug} />
                    </ListItemButton>
                  </ListItem>
                ))}
                {!filtered.length && (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>Sin resultados</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card className="glass">
            <CardHeader title={selected ? 'Editar categoría' : 'Nueva categoría'} />
            <CardContent>
              <Stack spacing={2}>
                <TextField label="Nombre" value={form.name} onChange={(e)=>{
                  const name = e.target.value
                  setForm(f=>({ ...f, name, slug: slugify(name) }))
                }} fullWidth />
                <TextField label="Descripción" value={form.description} onChange={(e)=>setForm(f=>({...f, description: e.target.value}))} fullWidth multiline minRows={3} />
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving || !form.name.trim()}>Guardar</Button>
                  {selected && (
                    <Button color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={remove} disabled={saving}>Eliminar</Button>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  )
}
