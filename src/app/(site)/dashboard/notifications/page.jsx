'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { IconButton, LinearProgress, ListItemIcon, Menu, MenuItem, Tooltip } from '@mui/material'
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined'
import MarkEmailUnreadOutlined from '@mui/icons-material/MarkEmailUnreadOutlined'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import LayersOutlined from '@mui/icons-material/LayersOutlined'
import ReportGmailerrorredOutlined from '@mui/icons-material/ReportGmailerrorredOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import DoneIcon from '@mui/icons-material/Done'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import MarkEmailReadOutlined from '@mui/icons-material/MarkEmailReadOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import CloseRounded from '@mui/icons-material/CloseRounded'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import LinkOffOutlined from '@mui/icons-material/LinkOffOutlined'
import LinkOutlined from '@mui/icons-material/LinkOutlined'
import ShoppingBagOutlined from '@mui/icons-material/ShoppingBagOutlined'
import CreditCardOutlined from '@mui/icons-material/CreditCardOutlined'
import MailOutline from '@mui/icons-material/MailOutline'
import CloudOutlined from '@mui/icons-material/CloudOutlined'
import CloudSyncOutlined from '@mui/icons-material/CloudSyncOutlined'
import PersonOutline from '@mui/icons-material/PersonOutline'
import CampaignOutlined from '@mui/icons-material/CampaignOutlined'
import Pinterest from '@mui/icons-material/Pinterest'
import MovieOutlined from '@mui/icons-material/MovieOutlined'
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined'
import FlagOutlined from '@mui/icons-material/FlagOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import AutoModeOutlined from '@mui/icons-material/AutoModeOutlined'
import FileUploadOutlined from '@mui/icons-material/FileUploadOutlined'
import HubOutlined from '@mui/icons-material/HubOutlined'
import HttpService from '@/services/HttpService'
import { successAlert, errorAlert, confirmAlert } from '@/helpers/alerts'
import { useI18n } from '@/i18n'
import es from '@/i18n/es'
import en from '@/i18n/en'
import styles from './notifications.module.scss'

const http = new HttpService()
const TYPES = [
  { key: 'ALL', icon: NotificationsNoneOutlined },
  { key: 'SALES', icon: ShoppingBagOutlined },
  { key: 'BILLING', icon: CreditCardOutlined },
  { key: 'MAIL', icon: MailOutline },
  { key: 'STORAGE', icon: CloudOutlined },
  { key: 'SOCIAL', icon: CampaignOutlined },
  { key: 'REPORT', icon: FlagOutlined },
  { key: 'AUTOMATION', icon: AutoModeOutlined },
]
const fill = (text, values) => Object.entries(values).reduce((acc, [key, value]) => acc.replaceAll(`{${key}}`, value), text)
const toDate = value => { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date : null }
const isToday = date => date && date.toDateString() === new Date().toDateString()

// Lo crítico es lo que está sin leer y salió mal o espera una acción (errores, avisos y reportes de enlaces caídos).
const severityOf = n => n.typeStatus === 'ERROR' ? 'error'
  : n.typeStatus === 'WARNING' || (n.type === 'REPORT' && n.typeStatus === 'PENDING') ? 'warning'
    : 'ok'
const isCritical = n => n.status === 'UNREAD' && severityOf(n) !== 'ok'

// Icono y color según el tipo y el contenido real que genera el backend.
function visualOf(n) {
  const title = String(n.title || '')
  const severity = severityOf(n)
  if (severity === 'error') return { Icon: CloseRounded, tone: 'red' }
  if (n.type === 'REPORT') return { Icon: LinkOffOutlined, tone: 'amber' }
  if (severity === 'warning') return { Icon: WarningAmberRounded, tone: 'amber' }
  if (n.type === 'SALES' || /nueva compra/i.test(title)) return { Icon: ShoppingBagOutlined, tone: 'green' }
  if (n.type === 'BILLING') return { Icon: CreditCardOutlined, tone: 'blue' }
  if (n.type === 'MAIL') return { Icon: MailOutline, tone: 'blue' }
  if (n.type === 'BATCH_UPLOADER') return { Icon: FileUploadOutlined, tone: 'blue' }
  if (n.type === 'SOCIAL') {
    if (/pin|pinterest/i.test(title)) return { Icon: Pinterest, tone: 'pink' }
    if (/reel/i.test(title)) return { Icon: MovieOutlined, tone: 'violet' }
    if (/tendencia|trend/i.test(title)) return { Icon: TrendingUpOutlined, tone: 'violet' }
    return { Icon: CampaignOutlined, tone: 'violet' }
  }
  if (n.type === 'AUTOMATION') return { Icon: /qdrant|vector/i.test(title) ? HubOutlined : SettingsOutlined, tone: 'slate' }
  if (n.type === 'STORAGE') {
    if (/restaur|completad/i.test(title)) return { Icon: CheckRounded, tone: 'green' }
    if (/link|enlace/i.test(title)) return { Icon: LinkOutlined, tone: 'blue' }
    if (/sync|sincroniz/i.test(title)) return { Icon: CloudSyncOutlined, tone: 'blue' }
    if (/l[ií]mite|espacio|cuota/i.test(title)) return { Icon: LayersOutlined, tone: 'blue' }
    if (/cuenta|account/i.test(title)) return { Icon: PersonOutline, tone: 'blue' }
    return { Icon: CloudOutlined, tone: 'blue' }
  }
  return n.typeStatus === 'SUCCESS' ? { Icon: CheckRounded, tone: 'green' } : { Icon: NotificationsNoneOutlined, tone: 'slate' }
}

// Línea secundaria: los datos clave del cuerpo en una sola línea ("Faltantes=14" → "Faltantes: 14").
function previewOf(body) {
  const lines = String(body || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const important = lines.filter(line => /^(?:plan|monto|proveedor|usuario email|email|cuenta|error|estado)\s*:/i.test(line))
  return (important.length ? important : lines).slice(0, 4).join(' · ')
    .replace(/\b([A-Za-zÁÉÍÓÚáéíóúñ]+)=(?=\S)/g, '$1: ')
    .replace(/\.\s+(?=[A-ZÁÉÍÓÚ])/g, ' · ')
}

// Acción contextual que el backend sí soporta: restaurar el enlace del modelo o ir a la vista relacionada.
function actionOf(n) {
  const text = `${n.title || ''} ${n.body || ''}`
  const assetId = text.match(/assetId=(\d+)/)?.[1] || text.match(/\(id: (\d+)\)/)?.[1]
  if (n.type === 'REPORT' && assetId) return { kind: 'restore', assetId, label: 'restoreLink', Icon: LinkOutlined }
  if (n.type === 'STORAGE' && n.typeStatus === 'ERROR' && assetId && /asset/i.test(n.title || '')) return { kind: 'restore', assetId, label: 'retry', Icon: RefreshIcon }
  if (n.type === 'STORAGE' && /cuenta|main|backup|accId|email=/i.test(text)) return { kind: 'link', href: '/dashboard/accounts', label: 'viewAccounts', Icon: OpenInNewIcon }
  if (n.type === 'BATCH_UPLOADER') return { kind: 'link', href: '/dashboard/upload-batch', label: 'viewBatch', Icon: OpenInNewIcon }
  if (n.type === 'SOCIAL' && /pin|pinterest/i.test(n.title || '')) return { kind: 'link', href: '/dashboard/pinterest', label: 'viewPins', Icon: OpenInNewIcon }
  if (n.type === 'SOCIAL' && /reel/i.test(n.title || '')) return { kind: 'link', href: '/dashboard/reels', label: 'viewReels', Icon: OpenInNewIcon }
  if (n.type === 'AUTOMATION' && /qdrant|vector/i.test(n.title || '')) return { kind: 'link', href: '/dashboard/assets', label: 'viewModels', Icon: OpenInNewIcon }
  if (n.type === 'MAIL') return /brevo/i.test(n.title || '')
    ? { kind: 'link', href: '/dashboard/marketing', label: 'viewMarketing', Icon: OpenInNewIcon }
    : { kind: 'link', href: '/dashboard/users', label: 'viewUsers', Icon: OpenInNewIcon }
  return null
}

function useWhen(lang, tt) {
  const locale = lang === 'en' ? 'en-US' : 'es-CO'
  return useCallback(date => {
    if (!date) return ''
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
    if (minutes >= 0 && minutes < 1) return tt('now')
    if (minutes >= 0 && minutes < 60) return fill(tt('minutesAgo'), { n: minutes })
    const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    if (isToday(date)) return `${tt('today')}, ${time}`
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) return `${tt('yesterday')}, ${time}`
    return `${date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}, ${time}`
  }, [locale, tt])
}

function NotificationRow({ notification: n, busy, tt, when, onToggle, onDelete, onRestore }) {
  const [expanded, setExpanded] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const unread = n.status === 'UNREAD'
  const { Icon, tone } = visualOf(n)
  const action = actionOf(n)
  const preview = previewOf(n.body)
  const date = toDate(n.createdAt)
  const closeMenu = () => setMenuAnchor(null)
  const detailButton = { label: expanded ? 'hideDetail' : 'showDetail', Icon: ExpandMoreIcon }
  const shown = action || (n.body ? detailButton : null)
  return <article className={`${styles.row} ${unread ? styles.unread : ''}`}>
    <div className={styles.rowMain}>
      <span className={styles.dotSlot}>{unread && <span className={styles.unreadDot} role="img" aria-label={tt('unreadDot')} />}</span>
      <span className={`${styles.icon} ${styles[tone]}`} aria-hidden="true"><Icon /></span>
      <button type="button" className={styles.content} disabled={!n.body} aria-expanded={expanded} aria-controls={`notification-${n.id}`} onClick={() => setExpanded(value => !value)}>
        <span className={styles.title}>{n.title || tt('untitled')}</span>
        {preview && <span className={styles.preview}>{preview}</span>}
      </button>
      {date && <time dateTime={date.toISOString()} title={date.toLocaleString()} className={styles.date}>{when(date)}</time>}
      <div className={styles.actions}>
        {shown && (action?.kind === 'link'
          ? <Link href={action.href} className={styles.actionButton}><action.Icon fontSize="small" />{tt(action.label)}</Link>
          : <button type="button" className={styles.actionButton} disabled={busy}
            onClick={() => action ? onRestore(action.assetId) : setExpanded(value => !value)}
            aria-expanded={action ? undefined : expanded} aria-controls={action ? undefined : `notification-${n.id}`}>
            <shown.Icon fontSize="small" sx={!action && expanded ? { transform: 'rotate(180deg)' } : undefined} />{tt(shown.label)}
          </button>)}
        <Tooltip title={tt('moreActions')}><IconButton size="small" aria-label={tt('moreActions')} aria-haspopup="menu" onClick={event => setMenuAnchor(event.currentTarget)}><MoreHorizIcon fontSize="small" /></IconButton></Tooltip>
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <MenuItem disabled={busy} onClick={() => { closeMenu(); onToggle(n) }}><ListItemIcon>{unread ? <MarkEmailReadOutlined fontSize="small" /> : <MarkEmailUnreadOutlined fontSize="small" />}</ListItemIcon>{tt(unread ? 'markRead' : 'markUnread')}</MenuItem>
          {n.body && action && <MenuItem onClick={() => { closeMenu(); setExpanded(value => !value) }}><ListItemIcon><ExpandMoreIcon fontSize="small" /></ListItemIcon>{tt(expanded ? 'hideDetail' : 'showDetail')}</MenuItem>}
          <MenuItem disabled={busy} onClick={() => { closeMenu(); onDelete(n) }}><ListItemIcon><DeleteOutlineIcon fontSize="small" /></ListItemIcon>{tt('delete')}</MenuItem>
        </Menu>
      </div>
    </div>
    {expanded && <div id={`notification-${n.id}`} className={styles.detail}>{n.body}</div>}
  </article>
}

export default function NotificationsPage() {
  const { lang } = useI18n()
  // Traductor estable por idioma: el `t` de useI18n cambia en cada render y recargaría la lista en bucle.
  const tt = useCallback(key => (lang === 'en' ? en : es).dashboardNotifications?.[key] ?? key, [lang])
  const typeLabel = key => tt('types')?.[key] || key
  const when = useWhen(lang, tt)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [marking, setMarking] = useState(false)
  const [filter, setFilter] = useState('UNREAD')
  const [sort, setSort] = useState('recent')
  const [tabType, setTabType] = useState('ALL')

  const itemsByType = useMemo(() => tabType === 'ALL' ? items : items.filter(item => item.type === tabType), [items, tabType])
  const counts = useMemo(() => ({
    UNREAD: itemsByType.filter(item => item.status === 'UNREAD').length,
    TODAY: itemsByType.filter(item => isToday(toDate(item.createdAt))).length,
    ALL: itemsByType.length,
  }), [itemsByType])
  const filtered = useMemo(() => itemsByType.filter(item => filter === 'ALL'
    || (filter === 'UNREAD' && item.status === 'UNREAD')
    || (filter === 'TODAY' && isToday(toDate(item.createdAt)))), [itemsByType, filter])
  const critical = useMemo(() => filtered.filter(isCritical)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)), [filtered])
  const rest = useMemo(() => filtered.filter(item => !isCritical(item)).sort((a, b) => {
    const byDate = new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    if (sort === 'oldest') return -byDate
    if (sort === 'unread') return (a.status === 'UNREAD' ? 0 : 1) - (b.status === 'UNREAD' ? 0 : 1) || byDate
    return byDate
  }), [filtered, sort])
  const totalUnread = items.filter(item => item.status === 'UNREAD').length

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await http.getData('/admin/notifications?take=200')
      setItems(res.data?.notifications || res.data?.items || [])
    } catch { await errorAlert(tt('errorTitle'), tt('errorLoad')) }
    finally { setLoading(false) }
  }, [tt])
  useEffect(() => { fetchAll() }, [fetchAll])

  const run = async (task, errorKey) => {
    setMarking(true)
    try { await task(); await fetchAll() }
    catch (error) { await errorAlert(tt('errorTitle'), error?.response?.data?.message || tt(errorKey)) }
    finally { setMarking(false) }
  }
  const markAll = () => run(() => http.postData('/admin/notifications/mark-all-read', {}), 'errorMarkAll')
  const resolveCritical = () => run(() => Promise.all(critical.map(n => http.putData('/admin/notifications', n.id, { status: 'READ' }))), 'errorUpdate')
  const toggleOne = n => run(() => http.putData('/admin/notifications', n.id, { status: n.status === 'UNREAD' ? 'READ' : 'UNREAD' }), 'errorUpdate')
  const deleteOne = async n => {
    const ok = await confirmAlert(tt('confirmDeleteTitle'), fill(tt('confirmDeleteText'), { title: n.title || tt('untitled') }), tt('confirmYes'), tt('cancel'), 'warning')
    if (ok) await run(() => http.deleteData('/admin/notifications', n.id), 'errorDelete')
  }
  const clearType = async () => {
    const ok = await confirmAlert(tt('confirmDeleteTypeTitle'), fill(tt('confirmDeleteTypeText'), { type: typeLabel(tabType) }), tt('confirmYes'), tt('cancel'), 'warning')
    if (ok) await run(() => http.postData('/admin/notifications/clear-by-type', { type: tabType }), 'errorDelete')
  }
  const restoreAsset = async id => {
    const ok = await confirmAlert(tt('restoreLink'), fill(tt('confirmRestore'), { id }), tt('confirmRetry'), tt('cancel'), 'question')
    if (!ok) return
    setMarking(true)
    try {
      const response = await http.postData(`/assets/${id}/restore-link`, {})
      const result = response?.data || response
      if (!result?.ok) throw new Error(tt('errorRestore'))
      await successAlert(tt('restored'), result.link || tt('restoredText')); await fetchAll()
    } catch (error) { await errorAlert(tt('errorTitle'), error?.response?.data?.message || error.message || tt('errorRestore')) }
    finally { setMarking(false) }
  }
  const busy = loading || marking
  const rowProps = { busy, tt, when, onToggle: toggleOne, onDelete: deleteOne, onRestore: restoreAsset }
  const counters = [
    { key: 'UNREAD', label: tt('unread'), Icon: MarkEmailUnreadOutlined },
    { key: 'TODAY', label: tt('today'), Icon: CalendarMonthOutlined },
    { key: 'ALL', label: tt('all'), Icon: LayersOutlined },
  ]

  return <section className={styles.page} aria-label={tt('title')}>
    <nav className={styles.tabs} role="tablist" aria-label={tt('categories')}>
      {TYPES.map(({ key, icon: Icon }, index) => {
        const ofType = key === 'ALL' ? items : items.filter(item => item.type === key)
        const count = ofType.length
        const unread = ofType.filter(item => item.status === 'UNREAD').length
        return <button key={key} id={`notification-tab-${key}`} type="button" role="tab" aria-selected={tabType === key} aria-controls="notification-panel" tabIndex={tabType === key ? 0 : -1}
          className={`${styles.tabButton} ${tabType === key ? styles.activeTab : ''}`}
          onClick={() => { setTabType(key); setFilter('UNREAD') }} onKeyDown={event => {
            let next = index
            if (event.key === 'ArrowRight') next = (index + 1) % TYPES.length
            else if (event.key === 'ArrowLeft') next = (index - 1 + TYPES.length) % TYPES.length
            else if (event.key === 'Home') next = 0
            else if (event.key === 'End') next = TYPES.length - 1
            else return
            event.preventDefault(); setTabType(TYPES[next].key); setFilter('UNREAD')
            document.getElementById(`notification-tab-${TYPES[next].key}`)?.focus()
          }}><Icon sx={{ fontSize: 17 }} /><span className={styles.tabLabel}>{typeLabel(key)}<span className={unread ? styles.tabUnread : styles.tabCount}>{unread || count}</span></span></button>
      })}
    </nav>

    <header className={styles.header}>
      <span className={styles.bell} aria-hidden="true"><NotificationsNoneOutlined /></span>
      <div className={styles.heading}>
        <h1>{tt('title')}</h1>
        <p>{tt('subtitle')}</p>
      </div>
      <div className={styles.counters}>
        {counters.map(({ key, label, Icon }) => <button key={key} type="button" aria-pressed={filter === key} className={`${styles.counter} ${filter === key ? styles.activeCounter : ''}`} onClick={() => setFilter(key)}>
          <span className={styles.counterIcon} aria-hidden="true"><Icon /></span>
          <span className={styles.counterText}><span>{label}</span><strong>{counts[key]}</strong></span>
        </button>)}
      </div>
    </header>

    {loading && <LinearProgress sx={{ height: 2, bgcolor: 'transparent', mb: 1 }} />}

    <div id="notification-panel" role="tabpanel" aria-labelledby={`notification-tab-${tabType}`} aria-busy={busy}>
      {critical.length > 0 && <section className={styles.critical} aria-labelledby="notifications-critical">
        <div className={styles.criticalHead}>
          <span className={styles.criticalIcon} aria-hidden="true"><ReportGmailerrorredOutlined /></span>
          <div className={styles.heading}>
            <h2 id="notifications-critical">{fill(tt('criticalTitle'), { n: critical.length })}</h2>
            <p>{tt('criticalSubtitle')}</p>
          </div>
          <Tooltip title={tt('resolveAllHint')}><span><button type="button" className={styles.primaryButton} disabled={busy} onClick={resolveCritical}><DoneIcon fontSize="small" />{tt('resolveAll')}</button></span></Tooltip>
        </div>
        <div className={styles.list}>{critical.map(n => <NotificationRow key={n.id} notification={n} {...rowProps} />)}</div>
      </section>}

      <section className={styles.rest} aria-labelledby="notifications-rest">
        <div className={styles.restHead}>
          <div className={styles.heading}>
            <h2 id="notifications-rest">{tt('restTitle')}</h2>
            <p>{tt('restSubtitle')}</p>
          </div>
          <div className={styles.restTools}>
            <label className={styles.sort}>{tt('sortBy')}
              <select value={sort} onChange={event => setSort(event.target.value)}>
                <option value="recent">{tt('sortRecent')}</option>
                <option value="oldest">{tt('sortOldest')}</option>
                <option value="unread">{tt('sortUnread')}</option>
              </select>
            </label>
            <button type="button" className={styles.ghostButton} disabled={busy || !totalUnread} onClick={markAll}><DoneAllIcon fontSize="small" />{tt('markAllRead')}</button>
            <Tooltip title={tt('refresh')}><span><IconButton size="small" aria-label={tt('refresh')} onClick={fetchAll} disabled={busy}><RefreshIcon fontSize="small" /></IconButton></span></Tooltip>
            {tabType !== 'ALL' && <Tooltip title={tt('deleteType')}><span><IconButton size="small" aria-label={tt('deleteType')} onClick={clearType} disabled={busy || !itemsByType.length}><DeleteOutlineIcon fontSize="small" /></IconButton></span></Tooltip>}
          </div>
        </div>
        <div className={styles.list}>
          {!loading && !rest.length && <div className={styles.empty}>{filtered.length ? tt('emptyRest') : tt('empty')}</div>}
          {rest.map(n => <NotificationRow key={n.id} notification={n} {...rowProps} />)}
        </div>
      </section>
    </div>
  </section>
}
