'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Grid, IconButton, TextField, Tooltip, Button, Checkbox, Stack, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import CallMergeIcon from '@mui/icons-material/CallMerge'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CloseIcon from '@mui/icons-material/Close'
import HttpService from '@/services/HttpService'
import { successAlert, errorAlert, confirmAlert } from '@/helpers/alerts'
import '../taxonomy.scss'

const http = new HttpService()

const slugify = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9-\s_]+/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80)

export default function CategoriesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  
  // Create/Edit form
  const [form, setForm] = useState({ name: '', slug: '', description: '', nameEn: '', slugEn: '' })
  
  // Merge form
  const [mergeDestType, setMergeDestType] = useState('new') // 'new' | 'existing'
  const [mergeForm, setMergeForm] = useState({ name: '', slug: '', nameEn: '', slugEn: '', targetId: '' })
  
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

  // Sync form when exactly 1 item is selected
  useEffect(() => {
    if (selectedItems.length === 1) {
      const it = selectedItems[0]
      setForm({ name: it.name, slug: it.slug, description: it.description || '', nameEn: it.nameEn || '', slugEn: it.slugEn || '' })
    } else {
      setForm({ name: '', slug: '', description: '', nameEn: '', slugEn: '' })
    }
  }, [selectedItems])

  const toggleSelect = (it) => {
    setSelectedItems(prev => {
      const exists = prev.find(p => p.id === it.id)
      if (exists) return prev.filter(p => p.id !== it.id)
      return [...prev, it]
    })
  }

  const selectOnly = (it) => {
    setSelectedItems([it])
  }

  const clearSelection = () => {
    setSelectedItems([])
  }

  const save = async () => {
    if (!form.name?.trim() || !form.nameEn?.trim()) return
    const isEdit = selectedItems.length === 1
    const selected = isEdit ? selectedItems[0] : null

    const ok = await confirmAlert(isEdit ? 'Actualizar categoría' : 'Crear categoría', isEdit ? `¿Deseas actualizar "${form.name}"?` : `¿Deseas crear "${form.name}"?`, isEdit ? 'Sí, actualizar' : 'Sí, crear', 'Cancelar', 'question')
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
      if (isEdit) {
        const res = await http.putData('/categories', selected.id, payload)
        const updated = res.data
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
        await successAlert('Actualizada', 'La categoría fue actualizada')
      } else {
        const res = await http.postData('/categories', payload)
        const created = res.data
        setItems(prev => [...prev, created].sort((a,b)=>a.name.localeCompare(b.name)))
        await successAlert('Creada', 'La categoría fue creada')
      }
      clearSelection()
    } catch (e) {
      console.error('save category failed', e)
      await errorAlert('Error', 'No se pudo guardar la categoría')
    } finally { setSaving(false) }
  }

  const remove = async () => {
    if (selectedItems.length !== 1) return
    const selected = selectedItems[0]
    const ok = await confirmAlert('Eliminar categoría', `¿Eliminar la categoría "${selected.name}"?`, 'Sí, eliminar', 'Cancelar', 'warning')
    if (!ok) return
    try {
      setSaving(true)
      await http.deleteData('/categories', selected.id)
      setItems(prev => prev.filter(i => i.id !== selected.id))
      await successAlert('Eliminada', 'La categoría fue eliminada')
      clearSelection()
    } catch (e) {
      console.error('delete category failed', e)
      await errorAlert('Error', 'No se pudo eliminar la categoría')
    } finally { setSaving(false) }
  }

  const simulateMerge = async () => {
    let msg = `Se fusionarían ${selectedItems.length} categorías `
    if (mergeDestType === 'new') {
      if (!mergeForm.name.trim() || !mergeForm.nameEn.trim()) {
        await errorAlert('Error', 'Debes indicar el nombre en ES y EN para la nueva categoría.')
        return
      }
      msg += `en una NUEVA categoría llamada "${mergeForm.name}".\n\n(Solo UI por ahora - Simulación)`
    } else {
      const target = items.find(i => i.id === mergeForm.targetId)
      if (!target) {
        await errorAlert('Error', 'Debes elegir una categoría destino válida.')
        return
      }
      msg += `dentro de la categoría EXISTENTE "${target.name}".\n\n(Solo UI por ahora - Simulación)`
    }
    await successAlert('Fusión Simulada', msg)
    clearSelection()
  }

  const mode = selectedItems.length === 0 ? 'create' : (selectedItems.length === 1 ? 'edit' : 'merge')

  return (
    <div className="dashboard-content p-3 taxonomy-container">
      <div className="header-actions">
        <Typography variant="h5" fontWeight={700} sx={{ color: '#f7f7fb' }}>Gestión de Categorías</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField size="small" placeholder="Buscar categoría..." value={q} onChange={(e)=>setQ(e.target.value)} sx={{ background: 'rgba(255,255,255,0.05)', borderRadius: 1, input: { color: '#f7f7fb' } }} />
          <Tooltip title="Recargar">
            <IconButton onClick={fetchItems} disabled={loading} sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: '#f7f7fb', boxShadow: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={clearSelection} sx={{ borderRadius: 8, px: 3 }}>
            Nueva Categoría
          </Button>
        </Stack>
      </div>

      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
        {/* Lado Izquierdo: Lista Moderna */}
        <Grid item xs={12} md={5} lg={4}>
          <div className="tax-card glass">
            {loading && <div style={{ height: 4, width: '100%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '30%', background: '#6c5ce7', animation: 'progress 1s infinite' }} />
            </div>}
            
            <ul className="tax-list">
              {filtered.map(it => {
                const isSelected = selectedItems.some(s => s.id === it.id)
                return (
                  <li key={it.id} className={`tax-item ${isSelected ? 'selected' : ''}`}>
                    <Checkbox 
                      checked={isSelected} 
                      onChange={() => toggleSelect(it)}
                      size="small"
                      sx={{ color: 'rgba(255,255,255,0.3)', '&.Mui-checked': { color: '#6c5ce7' } }}
                    />
                    <div className="tax-info" onClick={() => selectOnly(it)}>
                      <div className="tax-name">
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginRight: 4, fontWeight: 'normal' }}>ES:</span>
                        {it.name || 'Sin nombre'}
                        {it.nameEn && (
                          <span className="tax-name-en">
                            <span style={{ opacity: 0.7, marginRight: 2, fontWeight: 'normal' }}>EN:</span>
                            {it.nameEn}
                          </span>
                        )}
                      </div>
                      <div className="tax-slug">
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', marginRight: 4 }}>Slug:</span>
                        {it.slug || '-'}
                      </div>
                    </div>
                  </li>
                )
              })}
              {!filtered.length && !loading && <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>No se encontraron categorías.</div>}
            </ul>
          </div>
        </Grid>

        {/* Lado Derecho: Panel Dinámico */}
        <Grid item xs={12} md={7} lg={8}>
          <div className="tax-card glass tax-panel">
            
            {mode === 'create' && (
              <>
                <h3 className="panel-title"><AddIcon color="primary"/> Crear Nueva Categoría</h3>
                <Stack spacing={3}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Nombre (ES)" value={form.name} onChange={(e)=>{
                        const name = e.target.value
                        setForm(f=>({ ...f, name, slug: slugify(name) }))
                      }} fullWidth required variant="filled" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Nombre (EN)" value={form.nameEn} onChange={(e)=>{
                        const nameEn = e.target.value
                        setForm(f=>({ ...f, nameEn, slugEn: slugify(nameEn) }))
                      }} fullWidth required variant="filled" />
                    </Grid>
                  </Grid>
                  <TextField label="Descripción (Opcional)" value={form.description} onChange={(e)=>setForm(f=>({...f, description: e.target.value}))} fullWidth multiline minRows={3} variant="filled" />
                  
                  <div>
                    <Button variant="contained" size="large" startIcon={<SaveIcon />} onClick={save} disabled={saving || !form.name.trim() || !form.nameEn.trim()} sx={{ borderRadius: 8, px: 4 }}>
                      Guardar Categoría
                    </Button>
                  </div>
                </Stack>
              </>
            )}

            {mode === 'edit' && (
              <>
                <h3 className="panel-title" style={{ color: '#a29bfe' }}>Editar Categoría</h3>
                <Stack spacing={3}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Nombre (ES)" value={form.name} onChange={(e)=>{
                        const name = e.target.value
                        setForm(f=>({ ...f, name, slug: slugify(name) }))
                      }} fullWidth required variant="filled" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Nombre (EN)" value={form.nameEn} onChange={(e)=>{
                        const nameEn = e.target.value
                        setForm(f=>({ ...f, nameEn, slugEn: slugify(nameEn) }))
                      }} fullWidth required variant="filled" />
                    </Grid>
                  </Grid>
                  <TextField label="Descripción (Opcional)" value={form.description} onChange={(e)=>setForm(f=>({...f, description: e.target.value}))} fullWidth multiline minRows={3} variant="filled" />
                  
                  <Stack direction="row" spacing={2}>
                    <Button variant="contained" size="large" startIcon={<SaveIcon />} onClick={save} disabled={saving || !form.name.trim() || !form.nameEn.trim()} sx={{ borderRadius: 8, px: 4 }}>
                      Actualizar
                    </Button>
                    <Button color="error" variant="outlined" size="large" startIcon={<DeleteIcon />} onClick={remove} disabled={saving} sx={{ borderRadius: 8 }}>
                      Eliminar
                    </Button>
                  </Stack>
                </Stack>
              </>
            )}

            {mode === 'merge' && (
              <>
                <h3 className="panel-title" style={{ color: '#a29bfe' }}><CallMergeIcon /> Fusionar {selectedItems.length} Categorías</h3>
                
                <div className="merge-alert">
                  <WarningAmberIcon fontSize="small" />
                  <div>
                    <strong>Atención:</strong> Los assets pertenecientes a estas categorías serán transferidos al destino seleccionado. Las categorías originales serán eliminadas. Esta acción es irreversible.
                  </div>
                </div>

                <div className="selected-chips">
                  {selectedItems.map(it => (
                    <div key={it.id} style={{ display: 'flex', alignItems: 'center', background: 'rgba(108, 92, 231, 0.2)', border: '1px solid rgba(108, 92, 231, 0.4)', borderRadius: 16, padding: '4px 10px', fontSize: '0.85rem', color: '#f7f7fb' }}>
                      <span>{it.name}</span>
                      <IconButton size="small" onClick={() => toggleSelect(it)} sx={{ ml: 0.5, p: 0.25, color: '#f7f7fb' }}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </div>
                  ))}
                </div>

                <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                  <Button variant={mergeDestType === 'new' ? 'contained' : 'outlined'} color="primary" onClick={() => setMergeDestType('new')} sx={{ borderRadius: 8 }}>
                    Fusionar en una NUEVA
                  </Button>
                  <Button variant={mergeDestType === 'existing' ? 'contained' : 'outlined'} color="primary" onClick={() => setMergeDestType('existing')} sx={{ borderRadius: 8 }}>
                    Fusionar en EXISTENTE
                  </Button>
                </Stack>

                <div style={{ padding: '20px', border: '1px solid rgba(108, 92, 231, 0.2)', borderRadius: 12, marginTop: 16, background: 'rgba(255,255,255,0.02)' }}>
                  {mergeDestType === 'new' ? (
                    <Stack spacing={2}>
                      <Typography variant="body2" color="text.secondary">Define el nombre de la nueva categoría que agrupará a todas las seleccionadas:</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField label="Nombre Nueva (ES)" value={mergeForm.name} onChange={(e) => setMergeForm({...mergeForm, name: e.target.value, slug: slugify(e.target.value)})} fullWidth variant="filled" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField label="Nombre Nueva (EN)" value={mergeForm.nameEn} onChange={(e) => setMergeForm({...mergeForm, nameEn: e.target.value, slugEn: slugify(e.target.value)})} fullWidth variant="filled" />
                        </Grid>
                      </Grid>
                    </Stack>
                  ) : (
                    <Stack spacing={2}>
                      <Typography variant="body2" color="text.secondary">Selecciona una categoría existente de la lista para que absorba a las seleccionadas:</Typography>
                      <FormControl fullWidth variant="filled">
                        <InputLabel>Categoría Destino</InputLabel>
                        <Select
                          value={mergeForm.targetId}
                          onChange={(e) => setMergeForm({...mergeForm, targetId: e.target.value})}
                        >
                          {items.filter(i => !selectedItems.some(s => s.id === i.id)).map(i => (
                            <MenuItem key={i.id} value={i.id}>{i.name} ({i.nameEn})</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  )}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: 20 }}>
                  <Button variant="contained" color="primary" size="large" startIcon={<CallMergeIcon />} onClick={simulateMerge} sx={{ borderRadius: 8, px: 4, py: 1.5, fontWeight: 'bold' }}>
                    Confirmar Fusión
                  </Button>
                </div>
              </>
            )}
            
          </div>
        </Grid>

      </Grid>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(330%); }
        }
      `}} />
    </div>
  )
}
