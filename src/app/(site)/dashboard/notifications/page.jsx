'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import styles from './notifications.module.scss'
import { Tabs, Tab } from '@mui/material'
import { Box, Card, CardHeader, CardContent, IconButton, LinearProgress, Stack, Tooltip, Typography, Button, Chip, Divider } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead'
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread'
import DeleteIcon from '@mui/icons-material/Delete'
import HttpService from '@/services/HttpService'
import { successAlert, errorAlert } from '@/helpers/alerts'

const http = new HttpService()

export default function NotificationsPage(){
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [marking, setMarking] = useState(false)
  const [filter, setFilter] = useState('ALL') // ALL | UNREAD | READ
  const [tabType, setTabType] = useState('AUTOMATION')

  // Tipos disponibles
  const types = [
    { key:'AUTOMATION', label:'Automatizaciones' },
    { key:'SALES', label:'Ventas' },
    { key:'REPORT', label:'Reportes' }
  ]

  // Filtrar por tipo
  const itemsByType = useMemo(() => items.filter(i => i.type === tabType), [items, tabType])
  const unreadCount = itemsByType.filter(i=>i.status==='UNREAD').length
  const readCount = itemsByType.filter(i=>i.status==='READ').length
  const allCount = itemsByType.length

  // Orden y filtro dentro del tipo
  const ordered = useMemo(()=>{
    const list = [...itemsByType]
    const unread = list.filter(i=>i.status==='UNREAD')
    const read = list.filter(i=>i.status==='READ')
    return [...unread, ...read]
  },[itemsByType])
  const filtered = useMemo(()=>{
    if(filter==='ALL') return ordered
    return ordered.filter(i=>i.status===filter)
  }, [ordered, filter])

  // Refresca desde backend
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true)
      const res = await http.getData('/admin/notifications?take=500')
      const list = res.data?.notifications || res.data?.items || []
      setItems(list)
    } catch(e){
      console.error('load notifications failed', e)
      await errorAlert('Error', 'No se pudieron cargar las notificaciones')
    } finally { setLoading(false) }
  }, [])

  useEffect(()=>{ fetchAll() }, [fetchAll])

  // Marcar todas y refrescar
  const markAll = async () => {
    try {
      setMarking(true)
      await http.postData('/admin/notifications/mark-all-read', {})
      await successAlert('Listo', 'Todas marcadas como leídas')
      await fetchAll()
    } catch(e){
      console.error('mark all failed', e)
      await errorAlert('Error', 'No se pudieron marcar todas')
    } finally { setMarking(false) }
  }

  // Toggle y refresca
  const toggleOne = async (n) => {
    const targetStatus = n.status==='UNREAD' ? 'READ' : 'UNREAD'
    try {
      await http.putData('/admin/notifications', n.id, { status: targetStatus })
      await fetchAll()
    } catch(e){
      console.error('toggle notification failed', e)
      await errorAlert('Error', 'No se pudo actualizar la notificación')
    }
  }

  return (
    <div className="dashboard-content p-3">
      <Box sx={{mb:2, display:'flex', alignItems:'center', gap:2}}>
        <Typography variant="h5" sx={{fontWeight:700}}>Notificaciones</Typography>
        <Chip label={`Sin leer: ${items.filter(i=>i.status==='UNREAD').length}`} color={items.filter(i=>i.status==='UNREAD').length>0?'error':'default'} size="small" />
        <Chip label={`Total: ${items.length}`} color="primary" size="small" />
      </Box>
      <Card className="glass" sx={{ mb: 2 }}>
        <CardHeader title={<>
          <Tabs value={tabType} onChange={(_,v)=>setTabType(v)} variant="scrollable" scrollButtons="auto">
            {types.map(t => (
              <Tab key={t.key} value={t.key} label={t.label + ` (${items.filter(i=>i.type===t.key).filter(i=>i.status==='UNREAD').length}/${items.filter(i=>i.type===t.key).length})`} />
            ))}
          </Tabs>
        </>} action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Refrescar"><span><IconButton onClick={fetchAll} disabled={loading}><RefreshIcon /></IconButton></span></Tooltip>
            <Tooltip title="Marcar todas como leídas"><span><IconButton color="primary" onClick={markAll} disabled={marking || unreadCount===0}><DoneAllIcon /></IconButton></span></Tooltip>
            {/* Limpiar automatizaciones */}
            <Tooltip title="Limpiar automatizaciones"><span><IconButton color="error" onClick={async ()=>{ try{ setMarking(true); await http.postData('/admin/notifications/clear-automation', {}); await successAlert('Hecho', 'Notificaciones de automatizaciones eliminadas'); await fetchAll(); } catch(e){ await errorAlert('Error', 'No se pudieron eliminar las automatizaciones'); } finally{ setMarking(false); } }} disabled={marking || items.filter(i=>i.type==='AUTOMATION').length===0}><DeleteIcon /></IconButton></span></Tooltip>
          </Stack>
        } />
        <CardContent sx={{ pt:0 }}>
          {loading && <LinearProgress sx={{ mb:2 }} />}
          <Stack direction="row" spacing={1} sx={{ mb:2, flexWrap:'wrap' }}>
            <Chip label={`Todas (${allCount})`} color={filter==='ALL' ? 'primary':'default'} onClick={()=>setFilter('ALL')} variant={filter==='ALL'?'filled':'outlined'} size="small" />
            <Chip label={`Sin leer (${unreadCount})`} color={filter==='UNREAD' ? 'error':'default'} onClick={()=>setFilter('UNREAD')} variant={filter==='UNREAD'?'filled':'outlined'} size="small" />
            <Chip label={`Leídas (${readCount})`} color={filter==='READ' ? 'success':'default'} onClick={()=>setFilter('READ')} variant={filter==='READ'?'filled':'outlined'} size="small" />
          </Stack>
          {!loading && !filtered.length && (
            <Typography variant="body2" color="text.secondary">No hay notificaciones.</Typography>
          )}
          <Stack spacing={2}>
            {filtered.map(n => {
              const unread = n.status==='UNREAD'
              return (
                <Card key={n.id}
                  className={
                    unread
                      ? `${styles['unread-card']} ` +
                        (n.typeStatus === 'SUCCESS' ? styles.success :
                         n.typeStatus === 'PENDING' ? styles.pending :
                         n.typeStatus === 'ERROR' ? styles.error : '')
                      : ''
                  }
                  elevation={unread?4:0}
                  sx={{
                    bgcolor: unread ? '#fff' : '#f5f5f7',
                    color: '#222',
                    opacity: unread ? 1 : 0.85,
                    transition:'all .2s',
                    position:'relative',
                    minHeight: 48,
                    mb: 0.5,
                  }}>
                  <CardContent sx={{display:'flex',alignItems:'center',gap:1, py:1.2, px:1.5}}>
                    <Box sx={{ flex:1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: unread ? 700 : 500, fontSize: '1rem', lineHeight:1.2, color:'#222' }}>{n.title}</Typography>
                      {n.body && <Typography variant="body2" sx={{ whiteSpace:'pre-wrap', opacity:0.95, mt:0.3, fontSize:'0.97rem', lineHeight:1.25, color:'#222' }}>{n.body}</Typography>}
                    </Box>
                    {/* Borrar notificación si es de automatización */}
                    {n.type==='AUTOMATION' && (
                      <Tooltip title="Eliminar automatización">
                        <span>
                          <IconButton size="small" onClick={async()=>{ try{ await http.deleteData('/admin/notifications', n.id); await fetchAll(); } catch(e){ await errorAlert('Error', 'No se pudo eliminar'); } }} color="error" sx={{p:0.5}}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    <Tooltip title={unread ? 'Marcar como leída' : 'Marcar como no leída'}>
                      <span>
                        <IconButton size="small" onClick={()=>toggleOne(n)} color={unread ? 'info':'default'} sx={{p:0.5}}>
                          {unread ? <MarkEmailReadIcon fontSize="small" /> : <MarkEmailUnreadIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </CardContent>
                </Card>
              )
            })}
          </Stack>
        </CardContent>
      </Card>
    </div>
  )
}
