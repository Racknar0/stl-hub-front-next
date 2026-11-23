'use client'

// Barra de redes conectadas (cuentas, canales y páginas) común a todas las vistas de Publicaciones.
// Cada red tiene un botón con desplegable para ver sus cuentas, conectar otra o desconectarla.
import { useCallback, useEffect, useRef, useState } from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import HttpService from '@/services/HttpService'
import PlatformIcon from './PlatformIcon'
import './SocialConnections.scss'

const NETWORKS = [
  { key: 'instagram', label: 'Instagram', title: 'Instagram Reels' },
  { key: 'facebook', label: 'Facebook', title: 'Facebook Reels' },
  { key: 'youtube', label: 'YouTube', title: 'YouTube Shorts' },
  { key: 'tiktok', label: 'TikTok', title: 'TikTok' },
  { key: 'threads', label: 'Threads', title: 'Threads' },
  { key: 'pinterest', label: 'Pinterest', title: 'Pinterest' },
  { key: 'bluesky', label: 'Bluesky', title: 'Bluesky' },
  { key: 'tumblr', label: 'Tumblr', title: 'Tumblr' },
  { key: 'mastodon', label: 'Mastodon', title: 'Mastodon' },
]
// Aviso para que la vista abierta (p. ej. Reels) recargue lo que depende de las conexiones
export const CONNECTIONS_EVENT = 'social-connections:changed'

const errMsg = (e) => e?.response?.data?.error || e?.message || 'Error desconocido'
const wait = (ms) => new Promise(r => setTimeout(r, ms))

function ConnGroup({ platform, label, iconTitle, items, action }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])
  const on = items.length > 0
  return (
    <div className="sc-grp" ref={ref}>
      <button type="button" className={`sc-grp-btn ${on ? 'on' : 'off'}`} aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <PlatformIcon platform={platform} title={iconTitle} />
        <span>{label}</span>
        {on && <span className="sc-grp-count">{items.length}</span>}
        <i className="sc-grp-dot" />
        <span className="sc-grp-caret">▾</span>
      </button>
      {open && (
        <div className="sc-grp-menu" role="menu">
          {!on && <div className="sc-grp-empty">Sin cuentas conectadas</div>}
          {items.map(it => (
            <div key={it.id} className="sc-grp-item" title={it.title}>
              <span className="sc-grp-name">{it.name}</span>
              {it.onRemove && <button type="button" className="sc-grp-x" title={it.removeTitle} onClick={(e) => { it.onRemove(e); setOpen(false) }}>✕</button>}
            </div>
          ))}
          {action && (
            <button type="button" className="sc-grp-add" onClick={() => { action.onClick(); setOpen(false) }} disabled={action.busy} title={action.title}>
              {action.busy ? 'Esperando autorización…' : action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function SocialConnections() {
  const http = useRef(new HttpService()).current
  const [connection, setConnection] = useState(null)
  const [busy, setBusy] = useState(null) // red que se está conectando
  const [toast, setToast] = useState(null)
  const showToast = (text, kind = 'success') => setToast({ text, kind })

  const fetchConnection = useCallback(() => http.getData('/reels/connection-status')
    .then(r => { setConnection(r.data); return r.data })
    .catch(() => null), [http])
  useEffect(() => { fetchConnection() }, [fetchConnection])

  // Tras conectar o desconectar se recarga y se avisa a la vista abierta
  const refresh = async () => {
    const status = await fetchConnection()
    window.dispatchEvent(new CustomEvent(CONNECTIONS_EVENT, { detail: status }))
    return status
  }

  // OAuth en una ventana: se espera (hasta 3 min) a que la cuenta quede conectada
  const connectOAuth = async (key, authUrl, windowName, size, isDone, okText) => {
    try {
      const res = await http.getData(authUrl)
      window.open(res.data.url, windowName, size)
      setBusy(key)
      for (let i = 0; i < 60; i++) {
        await wait(3000)
        const status = await refresh()
        if (isDone(status)) { showToast(okText(status)); return }
      }
      showToast(`No se completó la conexión con ${NETWORKS.find(n => n.key === key)?.label}`, 'error')
    } catch (e) { showToast(errMsg(e), 'error') }
    finally { setBusy(null) }
  }

  const disconnect = async (e, { url, body, question, okText }) => {
    e.stopPropagation()
    if (!confirm(question)) return
    try {
      await http.postData(url, body)
      await refresh()
      showToast(okText)
    } catch (err) { showToast(errMsg(err), 'error') }
  }

  const connectYoutube = () => {
    const before = connection?.youtube?.channels?.length || 0
    return connectOAuth('youtube', '/reels/youtube/auth', 'youtube-auth', 'width=520,height=720',
      s => (s?.youtube?.channels?.length || 0) > before, s => `✓ YouTube conectado: ${s.youtube.channel?.title || ''}`)
  }
  const connectTiktok = () => connectOAuth('tiktok', '/reels/tiktok/auth', 'tiktok-auth', 'width=520,height=760',
    s => s?.tiktok?.connected, s => `✓ TikTok conectado: ${s.tiktok.account?.displayName || ''}`)
  const connectThreads = () => connectOAuth('threads', '/reels/threads/auth', 'threads-auth', 'width=520,height=760',
    s => s?.threads?.connected, s => `✓ Threads conectado: @${s.threads.account?.username || ''}`)

  // Tumblr: la primera vez se pegan la Consumer Key y la Secret Key de la app (tumblr.com/oauth/apps)
  const connectTumblr = async () => {
    try {
      if (!connection?.tumblr?.appConfigured) {
        const clientId = window.prompt('OAuth Consumer Key de tu app de Tumblr (tumblr.com/oauth/apps)')
        if (!clientId) return
        const clientSecret = window.prompt('Secret Key de la misma app de Tumblr')
        if (!clientSecret) return
        await http.postData('/reels/tumblr/app', { clientId, clientSecret })
      }
    } catch (e) { showToast(errMsg(e), 'error'); return }
    return connectOAuth('tumblr', '/reels/tumblr/auth', 'tumblr-auth', 'width=560,height=760',
      s => s?.tumblr?.connected, s => `✓ Tumblr conectado: ${s.tumblr.account?.blog || ''}`)
  }

  // Bluesky: usuario y contraseña de aplicación (no la de la cuenta)
  const connectBluesky = async () => {
    const identifier = window.prompt('Usuario de Bluesky', 'stl-gratis.bsky.social')
    if (!identifier) return
    const appPassword = window.prompt('Contraseña de aplicación de Bluesky (formato xxxx-xxxx-xxxx-xxxx).\nSe crea en Bluesky: Ajustes → Privacidad y seguridad → Contraseñas de aplicación. No uses la contraseña de tu cuenta.')
    if (!appPassword) return
    setBusy('bluesky')
    try {
      const res = await http.postData('/reels/bluesky/connect', { identifier, appPassword })
      await refresh()
      showToast(`✓ Bluesky conectado: @${res.data?.account?.handle || identifier}`)
    } catch (e) { showToast(errMsg(e), 'error') }
    finally { setBusy(null) }
  }

  // Mastodon: servidor y token de acceso (Preferencias → Desarrollo → Nueva aplicación)
  const connectMastodon = async () => {
    const instance = window.prompt('Servidor de Mastodon', 'mastodon.social')
    if (!instance) return
    const token = window.prompt('Token de acceso de Mastodon.\nSe crea en Mastodon: Preferencias → Desarrollo → Nueva aplicación (permisos write:statuses, write:media y read:statuses) → "Tu token de acceso".')
    if (!token) return
    setBusy('mastodon')
    try {
      const res = await http.postData('/reels/mastodon/connect', { instance, token })
      await refresh()
      showToast(`✓ Mastodon conectado: @${res.data?.account?.acct || ''}`)
    } catch (e) { showToast(errMsg(e), 'error') }
    finally { setBusy(null) }
  }

  const groupFor = (key) => {
    const c = connection || {}
    if (key === 'pinterest') {
      return c.pinterest?.connected
        ? { items: [{ id: 'pn', name: c.pinterest.username ? `@${c.pinterest.username}` : 'Pinterest', title: 'Cuenta conectada (la de los pines automáticos)' }] }
        : { items: [], action: { label: 'Conectar Pinterest', onClick: () => { window.location.href = '/dashboard/pinterest' }, title: 'Se conecta en Publicaciones → Pinterest' } }
    }
    if (key === 'mastodon') {
      return c.mastodon?.connected
        ? { items: [{ id: 'md', name: `@${c.mastodon.account?.username || 'mastodon'}`, title: c.mastodon.account?.acct ? `Cuenta conectada: @${c.mastodon.account.acct}` : 'Cuenta conectada', onRemove: (e) => disconnect(e, { url: '/reels/mastodon/disconnect', question: '¿Desconectar la cuenta de Mastodon? Los reels dejarán de publicarse en Mastodon.', okText: 'Mastodon desconectado' }), removeTitle: 'Desconectar Mastodon' }] }
        : { items: [], action: { label: 'Conectar Mastodon', onClick: connectMastodon, busy: busy === 'mastodon', title: 'Conecta tu cuenta de Mastodon con un token de acceso' } }
    }
    if (key === 'tumblr') {
      return c.tumblr?.connected
        ? { items: [{ id: 'tb', name: c.tumblr.account?.blog || 'tumblr', title: 'Blog conectado', onRemove: (e) => disconnect(e, { url: '/reels/tumblr/disconnect', question: '¿Desconectar el blog de Tumblr? Los reels dejarán de publicarse en Tumblr.', okText: 'Tumblr desconectado' }), removeTitle: 'Desconectar Tumblr' }] }
        : { items: [], action: { label: 'Conectar Tumblr', onClick: connectTumblr, busy: busy === 'tumblr', title: 'Autoriza tu blog de Tumblr para publicar videos' } }
    }
    if (key === 'bluesky') {
      return c.bluesky?.connected
        ? { items: [{ id: 'bs', name: `@${c.bluesky.account?.handle || 'bluesky'}`, title: 'Cuenta conectada', onRemove: (e) => disconnect(e, { url: '/reels/bluesky/disconnect', question: '¿Desconectar la cuenta de Bluesky? Los reels dejarán de publicarse en Bluesky.', okText: 'Bluesky desconectado' }), removeTitle: 'Desconectar Bluesky' }] }
        : { items: [], action: { label: 'Conectar Bluesky', onClick: connectBluesky, busy: busy === 'bluesky', title: 'Conecta tu cuenta de Bluesky con una contraseña de aplicación' } }
    }
    if (key === 'threads') {
      return c.threads?.connected
        ? { items: [{ id: 'th', name: `@${c.threads.account?.username || 'threads'}`, title: 'Cuenta conectada', onRemove: (e) => disconnect(e, { url: '/reels/threads/disconnect', question: '¿Desconectar la cuenta de Threads? Los reels dejarán de publicarse en Threads.', okText: 'Threads desconectado' }), removeTitle: 'Desconectar Threads' }] }
        : { items: [], action: { label: 'Conectar Threads', onClick: connectThreads, busy: busy === 'threads', title: 'Autoriza tu cuenta de Threads para publicar videos' } }
    }
    if (key === 'tiktok') {
      return c.tiktok?.connected
        ? { items: [{ id: 'tt', name: c.tiktok.account?.displayName || 'TikTok', title: 'Cuenta conectada', onRemove: (e) => disconnect(e, { url: '/reels/tiktok/disconnect', question: '¿Desconectar la cuenta de TikTok? Se revocará el acceso y los reels dejarán de publicarse en TikTok.', okText: 'TikTok desconectado' }), removeTitle: 'Desconectar TikTok' }] }
        : { items: [], action: { label: 'Conectar TikTok', onClick: connectTiktok, busy: busy === 'tiktok', title: 'Autoriza tu cuenta de TikTok para publicar videos' } }
    }
    if (key === 'youtube') {
      const connected = !!c.youtube?.connected
      return {
        items: connected ? (c.youtube.channels || []).map(ch => ({ id: ch.id, name: ch.title || 'YouTube', title: 'Canal conectado', onRemove: (e) => disconnect(e, { url: '/reels/youtube/disconnect', body: { channelId: ch.id }, question: `¿Desconectar el canal de YouTube "${ch.title || ''}"? Los reels dejarán de subirse a ese canal.`, okText: `${ch.title || 'Canal'} desconectado` }), removeTitle: `Desconectar ${ch.title || 'el canal'}` })) : [],
        action: { label: connected ? '+ Añadir canal' : 'Conectar YouTube', onClick: connectYoutube, busy: busy === 'youtube', title: connected ? 'Conecta otro canal de YouTube (elígelo en la pantalla de Google)' : 'Autoriza tu canal de YouTube para publicar Shorts' },
      }
    }
    if (key === 'instagram') {
      const accs = c.instagram?.accounts || []
      return { items: accs.length ? accs.map(acc => ({ id: acc.id, name: `@${acc.username}`, title: acc.pageName ? `Vinculada a ${acc.pageName}` : 'Cuenta vinculada' }))
        : c.instagram?.configured ? [{ id: 'ig', name: 'Cuenta configurada', title: 'Credenciales configuradas' }] : [] }
    }
    if (key === 'facebook') {
      const pgs = c.facebook?.pages || []
      return { items: pgs.length ? pgs.map(pg => ({ id: pg.id, name: pg.name, title: 'Página asignada' }))
        : c.facebook?.configured ? [{ id: 'fb', name: 'Página configurada', title: 'Credenciales configuradas' }] : [] }
    }
    return { items: c[key]?.configured ? [{ id: key, name: 'Configurada', title: 'Credenciales configuradas' }] : [] }
  }

  return (
    <div className="social-connections" aria-label="Redes conectadas">
      {NETWORKS.map(n => {
        const { items, action } = groupFor(n.key)
        return <ConnGroup key={n.key} platform={n.key} label={n.label} iconTitle={n.title} items={items} action={action} />
      })}
      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.kind} variant="filled" onClose={() => setToast(null)}>{toast.text}</Alert> : <span />}
      </Snackbar>
    </div>
  )
}
