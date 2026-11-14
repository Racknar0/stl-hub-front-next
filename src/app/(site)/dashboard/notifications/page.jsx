'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { IconButton, LinearProgress, Tooltip } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead'
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RestoreIcon from '@mui/icons-material/Restore'
import ShoppingBagOutlined from '@mui/icons-material/ShoppingBagOutlined'
import CreditCardOutlined from '@mui/icons-material/CreditCardOutlined'
import MailOutline from '@mui/icons-material/MailOutline'
import CloudOutlined from '@mui/icons-material/CloudOutlined'
import CampaignOutlined from '@mui/icons-material/CampaignOutlined'
import FlagOutlined from '@mui/icons-material/FlagOutlined'
import AutoModeOutlined from '@mui/icons-material/AutoModeOutlined'
import HttpService from '@/services/HttpService'
import { successAlert, errorAlert } from '@/helpers/alerts'
import styles from './notifications.module.scss'

const http = new HttpService()
const TYPES = [
  { key: 'SALES', label: 'Ventas', icon: ShoppingBagOutlined },
  { key: 'BILLING', label: 'Cobros', icon: CreditCardOutlined },
  { key: 'MAIL', label: 'Correos', icon: MailOutline },
  { key: 'STORAGE', label: 'Almacenamiento', icon: CloudOutlined },
  { key: 'SOCIAL', label: 'Redes sociales', icon: CampaignOutlined },
  { key: 'REPORT', label: 'Reportes', icon: FlagOutlined },
  { key: 'AUTOMATION', label: 'Automatizaciones', icon: AutoModeOutlined },
]

function NotificationRow({ notification: n, busy, onToggle, onDelete, onRestore }) {
  const [expanded, setExpanded] = useState(false)
  const unread = n.status === 'UNREAD'
  const lines = String(n.body || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const important = lines.filter(line => /^(?:plan|monto|proveedor|usuario email|email|cuenta|error|estado)\s*:/i.test(line))
  const preview = (important.length ? important : lines).slice(0, 3).join(' · ')
  const date = n.createdAt ? new Date(n.createdAt) : null
  const validDate = date && !Number.isNaN(date.getTime())
  const assetId = n.type === 'REPORT' ? String(n.body || '').match(/assetId=(\d+)/)?.[1] : null
  const tone = n.typeStatus === 'ERROR' ? 'error' : n.typeStatus === 'PENDING' ? 'pending' : n.typeStatus === 'SUCCESS' ? 'success' : ''
  return <article className={`${styles.row} ${unread ? styles.unread : ''} ${tone ? styles[tone] : ''}`}>
    <div className={styles.rowMain}>
      <button type="button" className={styles.content} disabled={!n.body} aria-expanded={expanded} aria-controls={`notification-${n.id}`} onClick={() => setExpanded(value => !value)}>
        <span className={styles.titleLine}><span className={styles.title}>{n.title || 'Notificación'}</span>{unread && <span className={styles.unreadDot} aria-label="Sin leer" />}
          {tone === 'error' && <span className={styles.status}>Error</span>}{tone === 'pending' && <span className={styles.status}>Pendiente</span>}
        </span>
        {preview && <span className={styles.preview}>{preview}</span>}
      </button>
      <div className={styles.actions}>
        {validDate && <time dateTime={date.toISOString()} title={date.toLocaleString('es-CO')} className={styles.date}>{date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} · {date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</time>}
        {assetId && <Tooltip title="Restaurar enlace del modelo"><span><IconButton size="small" disabled={busy} aria-label="Restaurar enlace del modelo" onClick={() => onRestore(assetId)}><RestoreIcon fontSize="small" /></IconButton></span></Tooltip>}
        <Tooltip title={unread ? 'Marcar como leída' : 'Marcar como no leída'}><span><IconButton size="small" disabled={busy} aria-label={unread ? 'Marcar como leída' : 'Marcar como no leída'} onClick={() => onToggle(n)}>{unread ? <MarkEmailReadIcon fontSize="small" /> : <MarkEmailUnreadIcon fontSize="small" />}</IconButton></span></Tooltip>
        <Tooltip title="Eliminar notificación"><span><IconButton size="small" disabled={busy} aria-label="Eliminar notificación" onClick={() => onDelete(n.id)}><DeleteOutlineIcon fontSize="small" /></IconButton></span></Tooltip>
        {n.body && <Tooltip title={expanded ? 'Ocultar detalle' : 'Mostrar detalle'}><IconButton size="small" aria-label={expanded ? 'Ocultar detalle' : 'Mostrar detalle'} aria-expanded={expanded} aria-controls={`notification-${n.id}`} onClick={() => setExpanded(value => !value)}><ExpandMoreIcon fontSize="small" sx={{ transform: expanded ? 'rotate(180deg)' : undefined }} /></IconButton></Tooltip>}
      </div>
    </div>
    {expanded && <div id={`notification-${n.id}`} className={styles.detail}>{n.body}</div>}
  </article>
}

export default function NotificationsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [marking, setMarking] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const [tabType, setTabType] = useState('SALES')
  const totalUnread = items.filter(item => item.status === 'UNREAD').length
  const itemsByType = useMemo(() => items.filter(item => item.type === tabType), [items, tabType])
  const unreadCount = itemsByType.filter(item => item.status === 'UNREAD').length
  const filtered = useMemo(() => [...itemsByType]
    .filter(item => filter === 'ALL' || item.status === filter)
    .sort((a, b) => (a.status === 'UNREAD' ? 0 : 1) - (b.status === 'UNREAD' ? 0 : 1) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0)), [itemsByType, filter])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await http.getData('/admin/notifications?take=500')
      setItems(res.data?.notifications || res.data?.items || [])
    } catch { await errorAlert('Error', 'No se pudieron cargar las notificaciones') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchAll() }, [fetchAll])

  const markAll = async () => {
    setMarking(true)
    try { await http.postData('/admin/notifications/mark-all-read', {}); await fetchAll() }
    catch { await errorAlert('Error', 'No se pudieron marcar todas como leídas') }
    finally { setMarking(false) }
  }
  const clearType = async () => {
    setMarking(true)
    try { await http.postData('/admin/notifications/clear-by-type', { type: tabType }); await fetchAll() }
    catch { await errorAlert('Error', 'No se pudieron eliminar las notificaciones') }
    finally { setMarking(false) }
  }
  const toggleOne = async n => {
    setMarking(true)
    try { await http.putData('/admin/notifications', n.id, { status: n.status === 'UNREAD' ? 'READ' : 'UNREAD' }); await fetchAll() }
    catch { await errorAlert('Error', 'No se pudo actualizar la notificación') }
    finally { setMarking(false) }
  }
  const deleteOne = async id => {
    setMarking(true)
    try { await http.deleteData('/admin/notifications', id); await fetchAll() }
    catch { await errorAlert('Error', 'No se pudo eliminar la notificación') }
    finally { setMarking(false) }
  }
  const restoreAsset = async id => {
    if (!window.confirm('¿Deseas intentar restaurar este modelo ahora?')) return
    setMarking(true)
    try {
      const response = await http.postData(`/assets/${id}/restore-link`, {})
      const result = response?.data || response
      if (!result?.ok) throw new Error('No se pudo restaurar el modelo')
      await successAlert('Modelo restaurado', result.link || 'El enlace fue restaurado.'); await fetchAll()
    } catch (error) { await errorAlert('Error', error?.response?.data?.message || error.message || 'No se pudo restaurar el modelo') }
    finally { setMarking(false) }
  }
  const busy = loading || marking
  return <section className={styles.page} aria-label="Notificaciones">
    <nav className={styles.tabs} role="tablist" aria-label="Categorías de notificaciones">
      {TYPES.map(({ key, label, icon: Icon }, index) => {
        const count = items.filter(item => item.type === key).length
        const unread = items.filter(item => item.type === key && item.status === 'UNREAD').length
        return <button key={key} id={`notification-tab-${key}`} type="button" role="tab" aria-selected={tabType === key} aria-controls="notification-panel" tabIndex={tabType === key ? 0 : -1}
          className={`${styles.tabButton} ${tabType === key ? styles.activeTab : ''}`} title={`${count} notificaciones · ${unread} sin leer`}
          onClick={() => { setTabType(key); setFilter('ALL') }} onKeyDown={event => {
            let next = index;
            if (event.key === 'ArrowRight') next = (index + 1) % TYPES.length;
            else if (event.key === 'ArrowLeft') next = (index - 1 + TYPES.length) % TYPES.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = TYPES.length - 1;
            else return;
            event.preventDefault(); setTabType(TYPES[next].key); setFilter('ALL');
            document.getElementById(`notification-tab-${TYPES[next].key}`)?.focus();
          }}><Icon sx={{ fontSize: 17 }} /><span className={styles.tabLabel}>{label}<span className={unread ? styles.tabUnread : styles.tabCount}>{unread || count}</span></span></button>

      })}
    </nav>
    <div className={styles.toolbar}>
      <div className={styles.filters}>{[['ALL', 'Todas', itemsByType.length], ['UNREAD', 'Sin leer', unreadCount], ['READ', 'Leídas', itemsByType.length - unreadCount]].map(([value, label, count]) => <button key={value} type="button" aria-pressed={filter === value} className={filter === value ? styles.activeFilter : ''} onClick={() => setFilter(value)}>{label}<span>{count}</span></button>)}</div>
      <div className={styles.globalActions}><span className={styles.counts}>{items.length} total · {totalUnread} sin leer</span>
        <Tooltip title="Actualizar"><span><IconButton size="small" aria-label="Actualizar notificaciones" onClick={fetchAll} disabled={busy}><RefreshIcon fontSize="small" /></IconButton></span></Tooltip>
        <Tooltip title="Marcar todas las categorías como leídas"><span><IconButton size="small" aria-label="Marcar todas las categorías como leídas" onClick={markAll} disabled={busy || !totalUnread}><DoneAllIcon fontSize="small" /></IconButton></span></Tooltip>
        <Tooltip title={`Eliminar todas de ${TYPES.find(type => type.key === tabType)?.label}`}><span><IconButton size="small" aria-label={`Eliminar notificaciones de ${TYPES.find(type => type.key === tabType)?.label}`} onClick={clearType} disabled={busy || !itemsByType.length}><DeleteOutlineIcon fontSize="small" /></IconButton></span></Tooltip>
      </div>
    </div>
    {loading && <LinearProgress sx={{ height: 2, bgcolor: 'transparent' }} />}
    <div className={styles.list} id="notification-panel" role="tabpanel" aria-labelledby={`notification-tab-${tabType}`} aria-busy={busy}>
      {!loading && !filtered.length && <div className={styles.empty}>No hay notificaciones en esta categoría con el filtro seleccionado.</div>}
      {filtered.map(notification => <NotificationRow key={notification.id} notification={notification} busy={busy} onToggle={toggleOne} onDelete={deleteOne} onRestore={restoreAsset} />)}
    </div>
  </section>
}
