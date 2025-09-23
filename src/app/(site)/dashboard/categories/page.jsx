'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Box, Card, CardContent, CardHeader, Grid, IconButton, LinearProgress, Stack, TextField, Tooltip, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import HttpService from '@/services/HttpService'
import { successAlert, errorAlert, confirmAlert } from '@/helpers/alerts'

const http = new HttpService()

const slugify = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9-\s_]+/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80)

export default function CategoriesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)

  const [form, setForm] = useState({ name: '', slug: '', description: '', nameEn: '', slugEn: '' })
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

  const startNew = () => { setSelected(null); setForm({ name: '', slug: '', description: '', nameEn: '', slugEn: '' }) }

  const onSelect = (it) => { setSelected(it); setForm({ name: it.name, slug: it.slug, description: it.description || '', nameEn: it.nameEn || '', slugEn: it.slugEn || '' }) }

  const save = async () => {
    if (!form.name?.trim() || !form.nameEn?.trim()) return
    const ok = await confirmAlert(selected ? 'Actualizar categoría' : 'Crear categoría', selected ? `¿Deseas actualizar "${form.name}"?` : `¿Deseas crear "${form.name}"?`, selected ? 'Sí, actualizar' : 'Sí, crear', 'Cancelar', 'question')
    if (!ok) return
    const nameEs = form.name.trim().toLowerCase()
    const nameEn = form.nameEn.trim().toLowerCase()
    const payload = {
      name: nameEs,
      slug: (form.slug?.trim() || slugify(nameEs)).toLowerCase(),
      description: form.description?.trim() || null,
      nameEn: nameEn,
      slugEn: (form.slugEn?.trim() || slugify(nameEn)).toLowerCase(),
    }
    try {
      setSaving(true)
      if (selected) {
        const res = await http.putData('/categories', selected.id, payload)
        const updated = res.data
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
        await successAlert('Actualizado', 'La categoría fue actualizada')
      } else {
        const res = await http.postData('/categories', payload)
        const created = res.data
        setItems(prev => [...prev, created].sort((a,b)=>a.name.localeCompare(b.name)))
        await successAlert('Creado', 'La categoría fue creada')
      }
      // Reiniciar formulario tras completar
      startNew()
    } catch (e) {
      console.error('save category failed', e)
      await errorAlert('Error', 'No se pudo guardar la categoría')
    } finally { setSaving(false) }
  }

  const remove = async () => {
    if (!selected) return
    const ok = await confirmAlert('Eliminar categoría', `¿Eliminar la categoría "${selected.name}"?`, 'Sí, eliminar', 'Cancelar', 'warning')
    if (!ok) return
    try {
      setSaving(true)
      await http.deleteData('/categories', selected.id)
      setItems(prev => prev.filter(i => i.id !== selected.id))
      await successAlert('Eliminada', 'La categoría fue eliminada')
      startNew()
    } catch (e) {
      console.error('delete category failed', e)
      await errorAlert('Error', 'No se pudo eliminar la categoría')
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
              <TableContainer sx={{ maxHeight: 520 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nombre (ES)</TableCell>
                      <TableCell>Nombre (EN)</TableCell>
                      <TableCell>Slug (ES)</TableCell>
                      <TableCell>Slug (EN)</TableCell>
                      <TableCell>Descripción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((it) => (
                      <TableRow key={it.id} hover selected={selected?.id === it.id} onClick={()=>onSelect(it)} sx={{ cursor: 'pointer' }}>
                        <TableCell>{it.name || '-'}</TableCell>
                        <TableCell>{it.nameEn || '-'}</TableCell>
                        <TableCell>{it.slug || '-'}</TableCell>
                        <TableCell>{it.slugEn || '-'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap title={it.description || ''}>
                            {it.description || '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {!filtered.length && !loading && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>Sin resultados</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card className="glass">
            <CardHeader title={selected ? 'Editar categoría' : 'Nueva categoría'} />
            <CardContent>
              <Stack spacing={2}>
                <TextField label="Nombre (ES)" value={form.name} onChange={(e)=>{
                  const name = e.target.value
                  setForm(f=>({ ...f, name, slug: slugify(name) }))
                }} fullWidth required />
                <TextField label="Nombre (EN)" value={form.nameEn} onChange={(e)=>{
                  const nameEn = e.target.value
                  setForm(f=>({ ...f, nameEn, slugEn: slugify(nameEn) }))
                }} fullWidth required />
                <TextField label="Descripción" value={form.description} onChange={(e)=>setForm(f=>({...f, description: e.target.value}))} fullWidth multiline minRows={3} />
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving || !form.name.trim() || !form.nameEn.trim()}>Guardar</Button>
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
