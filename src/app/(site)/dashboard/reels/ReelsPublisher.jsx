'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import HttpService from '@/services/HttpService';
import '../pinterest/PinterestCalendar.scss';
import '../pinterest/PinterestRedesign.scss';
import './ReelsPublisher.scss';

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram Reels', short: 'IG', maxSec: 900, linkHint: 'Link en la bio (Instagram no permite links clicables en el caption)' },
  { key: 'facebook', label: 'Facebook Reels', short: 'FB', maxSec: 90, linkHint: 'Link en el primer comentario (automático, con UTM)' },
  // YouTube queda para más adelante: se muestra en gris y no se puede elegir
  { key: 'youtube', label: 'YouTube Shorts', short: 'YT', maxSec: 180, linkHint: 'Link al final de la descripción (automático, con UTM)' },
];
const TIME_OPTIONS = ['12:00', '15:00', '18:00', '19:00', '20:00', '21:00'];
const SPREAD_OPTIONS = [0, 30, 60, 90, 120];

// "17:00 – 19:00" para una hora base y un margen en minutos
function spreadRange(base, spread) {
  const [h, m] = base.split(':').map(Number);
  const fmt = (min) => { const c = Math.min(Math.max(min, 0), 1439); return `${String(Math.floor(c / 60)).padStart(2, '0')}:${String(c % 60).padStart(2, '0')}`; };
  return `${fmt(h * 60 + m - spread)} – ${fmt(h * 60 + m + spread)}`;
}
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const weekdayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function getUploadBase() {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) return `${origin}/uploads`;
  }
  return process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads';
}

function resolveMediaUrl(relPath) {
  if (!relPath) return '';
  if (relPath.startsWith('http') || relPath.startsWith('blob:')) return relPath;
  const clean = String(relPath).replace(/^\/+/, '').replace(/^uploads\//, '');
  return `${getUploadBase()}/${clean.split('/').map(encodeURIComponent).join('/')}`;
}

const pad = (n) => String(n).padStart(2, '0');
const dayKeyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const dayKeyFromDate = (date) => { const d = new Date(date); return dayKeyOf(d.getFullYear(), d.getMonth(), d.getDate()); };
const fmtTime = (d) => new Date(d).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDayLong = (d) => { const x = new Date(d); return `${weekdayNames[x.getDay()]} ${x.getDate()} de ${monthNames[x.getMonth()].toLowerCase()}`; };
const fmtSize = (b) => (b ? `${(b / 1024 / 1024).toFixed(1)} MB` : '—');
const fmtDuration = (s) => (s ? `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}` : '—');
const errMsg = (e) => e?.response?.data?.error || e?.message || 'Error desconocido';
const toList = (v) => (Array.isArray(v) ? v : typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch { return []; } })() : []);

// Estado visible de un reel: qué le falta o en qué punto está
function reelState(post) {
  if (post.publishing) return { key: 'publishing', label: 'Publicando…', icon: '⏫' };
  if (post.status === 'PUBLISHED') return { key: 'published', label: post.simulated ? 'Publicado (simulado)' : 'Publicado', icon: '✓' };
  if (post.status === 'FAILED') return { key: 'failed', label: 'Error', icon: '✕' };
  if (post.aiStatus === 'PROCESSING') return { key: 'ai', label: 'IA generando…', icon: '⏳' };
  if (post.aiStatus === 'NONE') return { key: 'nometa', label: 'Sin metadata', icon: '○' };
  if (post.aiStatus === 'ERROR') return { key: 'failed', label: 'Error de IA', icon: '⚠' };
  if (post.scheduledAt && !post.approved && new Date(post.scheduledAt) < new Date()) return { key: 'overdue', label: 'Vencido sin aprobar', icon: '⚠' };
  if (post.approved) return { key: 'approved', label: post.scheduledAt ? 'Aprobado' : 'Aprobado · sin día', icon: '✔' };
  return { key: 'review', label: 'Por revisar', icon: '●' };
}

function videoChecks(post) {
  const checks = [];
  const { durationSec: d, width: w, height: h } = post;
  if (w && h) {
    if (Math.abs(w / h - 9 / 16) < 0.03) checks.push({ ok: true, text: `Vertical 9:16 (${w}×${h})` });
    else checks.push({ ok: false, text: `Proporción ${w}×${h}: lo ideal es 9:16` });
  }
  if (d) {
    const tooLong = PLATFORMS.filter(p => toList(post.platforms).includes(p.key) && d > p.maxSec);
    if (d < 3) checks.push({ ok: false, text: 'Dura menos de 3 s' });
    else if (tooLong.length) checks.push({ ok: false, text: `Demasiado largo para ${tooLong.map(p => p.short).join(', ')}` });
    else checks.push({ ok: true, text: `Duración ${fmtDuration(d)}` });
  }
  return checks;
}

function readVideoMeta(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { resolve({ durationSec: v.duration, width: v.videoWidth, height: v.videoHeight }); URL.revokeObjectURL(url); };
    v.onerror = () => { resolve({}); URL.revokeObjectURL(url); };
    v.src = url;
  });
}

// Video de la vista previa con controles: play/pausa, ±5 s, barra de progreso y sonido.
// Arranca en silencio porque el navegador solo permite autoplay sin sonido.
function PhoneVideo({ src }) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  };
  const skip = (secs) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.min(Math.max(0, v.currentTime + secs), v.duration || 0);
  };
  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && v.paused) v.play().catch(() => {});
  };

  return (
    <>
      <video ref={videoRef} src={src} autoPlay muted loop playsInline onClick={togglePlay}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} />
      <button type="button" className="rl-sound-btn" title={muted ? 'Activar sonido' : 'Silenciar'} onClick={toggleMute}>{muted ? '🔇' : '🔊'}</button>
      <div className={`rl-player-center ${playing ? '' : 'paused'}`}>
        <button type="button" title="Atrasar 5 s" onClick={() => skip(-5)}>⏪<small>5</small></button>
        <button type="button" className="main" title={playing ? 'Pausar' : 'Reproducir'} onClick={togglePlay}>{playing ? '❚❚' : '▶'}</button>
        <button type="button" title="Adelantar 5 s" onClick={() => skip(5)}>⏩<small>5</small></button>
      </div>
      <div className="rl-player-bar">
        <input type="range" min={0} max={duration || 0} step={0.05} value={Math.min(time, duration || 0)} aria-label="Posición del video"
          onChange={(e) => { if (videoRef.current) videoRef.current.currentTime = Number(e.target.value); }}
          style={{ '--pct': `${duration ? (time / duration) * 100 : 0}%` }} />
        <span>{time ? fmtDuration(time) : '0:00'} / {fmtDuration(duration)}</span>
      </div>
    </>
  );
}

// Maqueta de móvil con el aspecto de Reels / Shorts
function PhonePreview({ videoUrl, platform, caption, hashtags, title }) {
  const firstLine = (caption || '').split('\n')[0];
  const handle = platform === 'facebook' ? 'Stlgratis' : platform === 'youtube' ? '@stlhub' : 'stlhub_';
  return (
    <div className={`rl-phone pf-${platform}`}>
      {videoUrl ? <PhoneVideo key={videoUrl} src={videoUrl} /> : <div className="rl-phone-empty">Sin video</div>}
      <div className="rl-phone-top"><span>{platform === 'youtube' ? 'Shorts' : 'Reels'}</span></div>
      <div className="rl-phone-actions">
        <span>♥<small>{platform === 'youtube' ? 'Me gusta' : '1,2 mil'}</small></span>
        <span>💬<small>48</small></span>
        <span>➤<small>Compartir</small></span>
      </div>
      <div className="rl-phone-bottom">
        <div className="rl-phone-user"><b className="rl-avatar" />{handle}<em>Seguir</em></div>
        {platform === 'youtube' ? (
          <p className="rl-phone-caption">{title || 'Título del Short'}</p>
        ) : (
          <p className="rl-phone-caption">
            {firstLine || 'Aquí aparecerá la primera línea del caption'}
            {(caption || '').length > firstLine.length || hashtags?.length ? <span className="rl-more"> … más</span> : null}
          </p>
        )}
        {platform !== 'youtube' && hashtags?.length > 0 && <p className="rl-phone-tags">{hashtags.map(h => `#${h}`).join(' ')}</p>}
        <div className="rl-phone-audio">♫ Audio original · stlhub_</div>
      </div>
    </div>
  );
}

// Logos de las redes (dibujados en SVG para no depender de archivos externos)
function PlatformIcon({ platform, size = 16, title }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', className: `rl-icon rl-icon-${platform}`, role: 'img', 'aria-label': title || platform };
  if (platform === 'instagram') {
    return (
      <svg {...common}>
        <defs>
          <radialGradient id="rl-ig-grad" cx="0.3" cy="1.07" r="1.2">
            <stop offset="0" stopColor="#fdf497" />
            <stop offset="0.1" stopColor="#fdf497" />
            <stop offset="0.5" stopColor="#fd5949" />
            <stop offset="0.68" stopColor="#d6249f" />
            <stop offset="1" stopColor="#285AEB" />
          </radialGradient>
        </defs>
        {title && <title>{title}</title>}
        <rect x="1" y="1" width="22" height="22" rx="6.5" fill="url(#rl-ig-grad)" />
        <rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.2" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="16.3" cy="7.7" r="1.05" fill="#fff" />
      </svg>
    );
  }
  if (platform === 'facebook') {
    return (
      <svg {...common}>
        {title && <title>{title}</title>}
        <circle cx="12" cy="12" r="11" fill="#1877F2" />
        <path fill="#fff" d="M13.4 23v-8.1h2.7l.4-3.2h-3.1V9.7c0-.9.3-1.6 1.6-1.6h1.7V5.3c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.4H7.6v3.2h2.7V23z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      {title && <title>{title}</title>}
      <rect x="1" y="4.5" width="22" height="15" rx="4.5" fill="#FF0033" />
      <path fill="#fff" d="M10 8.6v6.8l5.8-3.4z" />
    </svg>
  );
}

const PlatformBadges = ({ list }) => (
  <span className="rl-platform-badges">
    {PLATFORMS.filter(p => toList(list).includes(p.key)).map(p => <PlatformIcon key={p.key} platform={p.key} title={p.label} />)}
  </span>
);

const postToForm = (post) => ({
  caption: post.caption || '', facebookCaption: post.facebookCaption || '', title: post.title || '',
  youtubeDescription: post.youtubeDescription || '',
  hashtags: toList(post.hashtags), platforms: toList(post.platforms),
  time: post.scheduledAt ? fmtTime(post.scheduledAt) : '', assetId: post.assetId ? String(post.assetId) : '',
});

export default function ReelsPublisher() {
  const http = useRef(new HttpService()).current;
  const [currentDate, setCurrentDate] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  const [tray, setTray] = useState([]);
  const [postsByDay, setPostsByDay] = useState({});
  const [stats, setStats] = useState({});
  const [settings, setSettings] = useState({ defaultTime: '18:00', language: 'es' });
  const [connection, setConnection] = useState(null);
  const [connectingYt, setConnectingYt] = useState(false);
  const ytConnected = !!connection?.youtube?.connected;
  const [uploading, setUploading] = useState(null); // null | { count, pct }
  const [dragOver, setDragOver] = useState(null); // 'tray' | dayNumber
  const [toast, setToast] = useState(null);
  const [editorId, setEditorId] = useState(null);
  const fileInputRef = useRef(null);
  const today = new Date();

  const showToast = (text, kind = 'ok') => { setToast({ text, kind }); setTimeout(() => setToast(null), 3500); };

  // ---------- Datos ----------
  const fetchTray = useCallback(() => http.getData('/reels/tray').then(r => setTray(r.data?.posts || [])).catch(() => {}), [http]);
  const fetchMonth = useCallback(() => http.getData(`/reels/month?year=${currentDate.getFullYear()}&month=${currentDate.getMonth()}`)
    .then(r => setPostsByDay(r.data?.postsByDay || {})).catch(() => setPostsByDay({})), [currentDate, http]);
  const fetchConnection = useCallback(() => http.getData('/reels/connection-status').then(r => { setConnection(r.data); return r.data; }).catch(() => null), [http]);
  const fetchStats = useCallback(() => http.getData('/reels/stats').then(r => r.data && setStats(r.data)).catch(() => {}), [http]);
  const refreshAll = useCallback(() => Promise.all([fetchTray(), fetchMonth(), fetchStats()]), [fetchTray, fetchMonth, fetchStats]);

  useEffect(() => {
    fetchTray(); fetchStats();
    http.getData('/reels/settings').then(r => r.data && setSettings(r.data)).catch(() => {});
    fetchConnection();
  }, [fetchTray, fetchStats, fetchConnection, http]);
  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  // Mientras la IA trabaja en algún reel, refrescar cada 3 s
  const allPosts = [...tray, ...Object.values(postsByDay).flat()];
  const anyProcessing = allPosts.some(p => p.aiStatus === 'PROCESSING' || p.publishing);
  useEffect(() => {
    if (!anyProcessing) return;
    const t = setInterval(() => { fetchTray(); fetchMonth(); }, 3000);
    return () => { clearInterval(t); fetchStats(); };
  }, [anyProcessing, fetchTray, fetchMonth, fetchStats]);

  // ---------- Subida ----------
  const uploadFiles = async (fileList) => {
    const files = [...(fileList || [])].filter(f => /^video\/(mp4|quicktime)$/.test(f.type));
    if (!files.length) return showToast('Solo se aceptan videos MP4 o MOV', 'err');
    setUploading({ count: files.length, pct: 0 });
    try {
      const meta = await Promise.all(files.map(readVideoMeta));
      const form = new FormData();
      files.forEach(f => form.append('videos', f));
      form.append('meta', JSON.stringify(meta));
      await http.postFormData('/reels/upload', form, {
        onUploadProgress: (e) => e.total && setUploading({ count: files.length, pct: Math.round((e.loaded / e.total) * 100) }),
      });
      showToast(`${files.length} ${files.length === 1 ? 'video subido' : 'videos subidos'}. Pulsa "Generar metadata IA" cuando quieras los textos`);
      refreshAll();
    } catch (e) { showToast('Error subiendo: ' + errMsg(e), 'err'); }
    finally { setUploading(null); }
  };

  // ---------- Arrastrar y soltar ----------
  const onDragStartPost = (e, post) => {
    e.dataTransfer.setData('text/reel-id', String(post.id));
    e.dataTransfer.effectAllowed = 'move';
  };
  const isFileDrag = (e) => [...(e.dataTransfer?.types || [])].includes('Files');

  const assign = async (postId, day) => {
    try {
      await http.postData(`/reels/${postId}/assign`, { day });
      await refreshAll();
    } catch (e) { showToast(errMsg(e), 'err'); }
  };

  const onDropTray = (e) => {
    e.preventDefault();
    setDragOver(null);
    if (isFileDrag(e)) return uploadFiles(e.dataTransfer.files);
    const id = e.dataTransfer.getData('text/reel-id');
    if (id) assign(id, null);
  };

  const onDropDay = (e, day) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData('text/reel-id');
    if (!id) return;
    setSelectedDay(day);
    assign(id, dayKeyOf(currentDate.getFullYear(), currentDate.getMonth(), day));
  };

  const autoFill = async () => {
    try {
      const res = await http.postData('/reels/auto-fill');
      showToast(res.data.assigned ? `${res.data.assigned} ${res.data.assigned === 1 ? 'reel colocado' : 'reels colocados'} en los próximos días libres` : 'No hay reels en la bandeja');
      refreshAll();
    } catch (e) { showToast(errMsg(e), 'err'); }
  };

  const deletePost = async (e, post) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${post.subject || post.originalName}" y su video?`)) return;
    try {
      await http.deleteData('/reels', post.id);
      if (editorId === post.id) setEditorId(null);
      showToast('Reel eliminado');
      refreshAll();
    } catch (err) { showToast(errMsg(err), 'err'); }
  };

  const [generating, setGenerating] = useState(false);
  const generateMetadata = async () => {
    setGenerating(true);
    try {
      const res = await http.postData('/reels/ai-generate', {});
      showToast(res.data.queued ? `Generando metadata de ${res.data.queued} ${res.data.queued === 1 ? 'reel' : 'reels'}…` : 'Todos los reels ya tienen metadata');
      await refreshAll();
    } catch (e) { showToast(errMsg(e), 'err'); }
    finally { setGenerating(false); }
  };

  // Abre la autorización de Google en una ventana y espera (hasta 3 min) a que el canal quede conectado
  const connectYoutube = async () => {
    try {
      const res = await http.getData('/reels/youtube/auth');
      window.open(res.data.url, 'youtube-auth', 'width=520,height=720');
      setConnectingYt(true);
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const status = await fetchConnection();
        if (status?.youtube?.connected) {
          showToast(`✓ YouTube conectado: ${status.youtube.channel?.title || ''}`);
          return;
        }
      }
      showToast('No se completó la conexión con YouTube', 'err');
    } catch (e) { showToast(errMsg(e), 'err'); }
    finally { setConnectingYt(false); }
  };

  const disconnectYoutube = async (e) => {
    e.stopPropagation();
    if (!confirm('¿Desconectar el canal de YouTube? Los reels dejarán de subirse a YouTube.')) return;
    try {
      await http.postData('/reels/youtube/disconnect');
      await fetchConnection();
      showToast('YouTube desconectado');
    } catch (err) { showToast(errMsg(err), 'err'); }
  };

  const saveSetting = async (patch) => {
    try {
      const res = await http.putData('/reels', 'settings', patch);
      setSettings(res.data);
      showToast('Ajuste guardado');
    } catch (e) { showToast(errMsg(e), 'err'); }
  };

  // ---------- Calendario ----------
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (currentDate.getDay() + 6) % 7;
  const days = [...Array(firstDayOfMonth).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isDayPast = (day) => new Date(currentDate.getFullYear(), currentDate.getMonth(), day) < startOfToday;
  const goToMonth = (offset) => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(next);
    setSelectedDay(d => Math.min(d || 1, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
  };
  const goToday = () => { setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDay(today.getDate()); };

  const selectedPosts = postsByDay[selectedDay] || [];
  const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay);
  const firstFutureDay = isCurrentMonth ? today.getDate() : currentDate > today ? 1 : daysInMonth + 1;
  const emptyDays = [];
  for (let d = firstFutureDay; d <= daysInMonth; d++) if (!postsByDay[d]?.length) emptyDays.push(d);
  const toReview = allPosts.filter(p => ['review', 'overdue'].includes(reelState(p).key));

  // Orden de revisión para "Aprobar y siguiente": calendario por fecha y luego bandeja
  const reviewOrder = [...Object.values(postsByDay).flat().sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)), ...tray]
    .filter(p => p.status !== 'PUBLISHED');
  const editorPost = allPosts.find(p => p.id === editorId) || null;

  const openNextToReview = (afterId) => {
    const idx = reviewOrder.findIndex(p => p.id === afterId);
    const next = [...reviewOrder.slice(idx + 1), ...reviewOrder.slice(0, Math.max(idx, 0))]
      .find(p => p.id !== afterId && ['review', 'overdue'].includes(reelState(p).key));
    setEditorId(next ? next.id : null);
    if (!next) showToast('No quedan reels por revisar 🎉');
  };

  return (
    <div className="pinterest-calendar-container reels-publisher">
      {/* CABECERA */}
      <div className="calendar-header">
        <div className="month-navigation">
          <button onClick={() => goToMonth(-1)} className="nav-btn">←</button>
          <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
          <button onClick={() => goToMonth(1)} className="nav-btn">→</button>
          {!isCurrentMonth && <button onClick={goToday} className="pr-btn ghost pr-today-btn">Hoy</button>}
        </div>
        <div className="calendar-stats">
          <span className="stat published">✅ {stats.published ?? 0} Publicados</span>
          <span className="stat pending">✔ {stats.scheduled ?? 0} Aprobados</span>
          <span className="stat rl-stat-review">● {stats.pendingReview ?? 0} Por revisar</span>
          <span className="stat rl-stat-cover" title="Días seguidos con reel desde hoy">📆 {stats.coveredDays ?? 0} días cubiertos</span>
        </div>
        <div className="rl-connections">
          {PLATFORMS.map(p => (
            p.key === 'youtube' && !ytConnected ? (
              <button key={p.key} type="button" className="rl-conn rl-conn-btn" onClick={connectYoutube} disabled={connectingYt}
                title="Autoriza tu canal de YouTube para publicar Shorts">
                <PlatformIcon platform={p.key} title={p.label} />{connectingYt ? 'Esperando autorización…' : 'Conectar YouTube'}
              </button>
            ) : (
              <span key={p.key} className={`rl-conn ${connection?.[p.key]?.configured ? 'on' : 'off'}`}
                title={p.key === 'youtube' ? `Canal conectado: ${connection.youtube.channel?.title || ''}` : connection?.[p.key]?.configured ? 'Credenciales configuradas' : 'Sin credenciales'}>
                <PlatformIcon platform={p.key} title={p.label} />{p.key === 'youtube' ? (connection.youtube.channel?.title || 'YouTube') : p.label.split(' ')[0]}
                {p.key === 'youtube' && <button type="button" className="rl-conn-x" title="Desconectar YouTube" onClick={disconnectYoutube}>✕</button>}
              </span>
            )
          ))}
        </div>
      </div>

      <div className="main-layout pr-main-layout rl-layout">
        {/* BANDEJA */}
        <aside className={`rl-tray ${dragOver === 'tray' ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver('tray'); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null); }}
          onDrop={onDropTray}>
          <div className="rl-tray-head">
            <div>
              <span className="pr-side-eyebrow">Bandeja</span>
              <h4>{tray.length} {tray.length === 1 ? 'video sin día' : 'videos sin día'}</h4>
            </div>
          </div>

          <button type="button" className="rl-upload" onClick={() => fileInputRef.current?.click()} disabled={!!uploading}>
            <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime" multiple hidden onChange={(e) => { uploadFiles(e.target.files); e.target.value = ''; }} />
            {uploading ? (
              <div className="rl-progress"><i style={{ width: `${uploading.pct}%` }} /><small>Subiendo {uploading.count} {uploading.count === 1 ? 'video' : 'videos'} · {uploading.pct}%</small></div>
            ) : (
              <><b>⬇ Suelta tus videos aquí</b><span>el nombre empieza por el ID del asset: «11848 squall.mp4»</span></>
            )}
          </button>

          {(stats.noMetadata > 0 || anyProcessing) && (
            <button type="button" className="pr-btn rl-ai-generate" onClick={generateMetadata} disabled={generating || anyProcessing}
              title="Genera caption, hashtags y textos de cada red para los reels que aún no los tienen">
              {anyProcessing ? '⏳ Generando metadata…' : `✨ Generar metadata IA (${stats.noMetadata})`}
            </button>
          )}
          {tray.length > 0 && (
            <button type="button" className="pr-btn primary rl-autofill" onClick={autoFill} title={`Coloca un reel por día en los próximos días libres, a una hora distinta cada día${settings.timeSpread ? ` (${spreadRange(settings.defaultTime, settings.timeSpread)})` : ` a las ${settings.defaultTime}`}`}>
              ⚡ Rellenar días vacíos
            </button>
          )}

          <div className="rl-tray-list">
            {tray.length === 0 && !uploading && <p className="pr-muted rl-tray-empty">Sube videos, genera su metadata con IA y arrástralos a un día del calendario.</p>}
            {tray.map(post => {
              const st = reelState(post);
              return (
                <div key={post.id} className={`rl-tray-card st-${st.key}`} draggable onDragStart={(e) => onDragStartPost(e, post)}
                  onClick={() => setEditorId(post.id)} title="Arrástralo a un día · clic para revisar">
                  <video src={`${resolveMediaUrl(post.videoPath)}#t=0.5`} preload="metadata" muted playsInline />
                  <div className="rl-tray-info">
                    <span className={`rl-state st-${st.key}`}>{st.icon} {st.label}</span>
                    <b>{post.subject || post.originalName}</b>
                    {post.assetTitle ? <small className="rl-asset-ok">🔗 #{post.assetId} {post.assetTitle}</small>
                      : <small className="rl-asset-none">Sin asset: el nombre no empieza por un ID</small>}
                    <small className="pr-muted">{fmtDuration(post.durationSec)} · {fmtSize(post.fileSizeB)}</small>
                  </div>
                  <button type="button" className="rl-delete-btn" title="Eliminar reel" onClick={(e) => deletePost(e, post)} onMouseDown={(e) => e.stopPropagation()}>🗑</button>
                  <span className="rl-grip" aria-hidden>⋮⋮</span>
                </div>
              );
            })}
          </div>
        </aside>

        {/* CALENDARIO */}
        <div className="calendar-grid rl-calendar">
          <div className="pr-cal-legend">
            <span><i className="ok" />Publicado</span>
            <span><i className="pen" />Aprobado</span>
            <span><i className="rv" />Por revisar</span>
            <span><i className="err" />Error</span>
            <span><i className="gap" />Día vacío</span>
          </div>
          <div className="weekdays">
            <span>LUN</span><span>MAR</span><span>MIÉ</span><span>JUE</span><span>VIE</span><span>SÁB</span><span>DOM</span>
          </div>
          <div className="days">
            {days.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="day empty" />;
              const dayPosts = postsByDay[day] || [];
              // El que se muestra: el pendiente si lo hay (lo que falta por hacer), si no el primero
              const post = dayPosts.find(p => p.status !== 'PUBLISHED') || dayPosts[0];
              const extra = dayPosts.length - 1;
              const isPast = isDayPast(day);
              const st = post ? reelState(post) : null;
              const canDrop = !isPast && !dayPosts.some(p => p.status === 'PUBLISHED');
              return (
                <div key={`day-${day}`}
                  className={`day rl-day ${isCurrentMonth && day === today.getDate() ? 'today' : ''} ${selectedDay === day ? 'selected' : ''} ${isPast ? 'past' : ''} ${!post && !isPast ? 'gap' : ''} ${dragOver === day ? (canDrop ? 'drop-ok' : 'drop-no') : ''}`}
                  onClick={() => setSelectedDay(day)}
                  onDoubleClick={() => post && setEditorId(post.id)}
                  onDragOver={(e) => { if (canDrop && !isFileDrag(e)) { e.preventDefault(); setDragOver(day); } }}
                  onDragLeave={() => setDragOver(d => (d === day ? null : d))}
                  onDrop={(e) => onDropDay(e, day)}>
                  <div className="day-top">
                    <div className="day-number">{day}</div>
                    {post && <span className="rl-day-time">{fmtTime(post.scheduledAt)}</span>}
                  </div>
                  {post ? (
                    <div className={`rl-day-reel st-${st.key}`} draggable={post.status !== 'PUBLISHED' && !post.publishing} onDragStart={(e) => onDragStartPost(e, post)}
                      onClick={(e) => { e.stopPropagation(); setSelectedDay(day); setEditorId(post.id); }} title={`${st.label} · ${post.subject || ''}`}>
                      <video src={`${resolveMediaUrl(post.videoPath)}#t=0.5`} preload="metadata" muted playsInline />
                      <span className="rl-day-state">{st.icon}</span>
                      {extra > 0 && <span className="rl-day-extra" title={`${dayPosts.length} reels este día`}>+{extra}</span>}
                      <button type="button" className="rl-delete-btn" title="Eliminar reel" draggable={false}
                        onClick={(e) => deletePost(e, post)} onMouseDown={(e) => e.stopPropagation()}>🗑</button>
                    </div>
                  ) : !isPast ? <span className="pr-gap-label">{dragOver === day ? 'Suelta aquí' : 'Vacío'}</span> : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL DEL DÍA */}
        <aside className="pr-cal-side rl-side">
          <div className="pr-autopilot rl-tip">
            <span className="pr-side-eyebrow">Ajustes</span>
            <label className="rl-setting">
              Hora base
              <select value={settings.defaultTime} onChange={(e) => saveSetting({ defaultTime: e.target.value })}>
                {[...new Set([...TIME_OPTIONS, settings.defaultTime])].sort().map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="rl-setting" title="Cada reel sale a una hora distinta dentro de este margen, para que no parezca un bot">
              Variación
              <select value={settings.timeSpread ?? 60} onChange={(e) => saveSetting({ timeSpread: Number(e.target.value) })}>
                {SPREAD_OPTIONS.map(m => <option key={m} value={m}>{m ? `± ${m >= 60 ? `${m / 60} h` : `${m} min`}` : 'Hora exacta'}</option>)}
              </select>
            </label>
            {settings.timeSpread > 0 && <p className="pr-autopilot-line">Franja: <b>{spreadRange(settings.defaultTime, settings.timeSpread)}</b>, cada día a una hora distinta.</p>}
            {ytConnected && (
              <label className="rl-setting" title="Hasta que Google apruebe la auditoría del proyecto, YouTube deja en privado los videos subidos por API">
                Privacidad YouTube
                <select value={settings.youtubePrivacy || 'private'} onChange={(e) => saveSetting({ youtubePrivacy: e.target.value })}>
                  <option value="private">Privado</option>
                  <option value="unlisted">No listado</option>
                  <option value="public">Público</option>
                </select>
              </label>
            )}
            <label className="rl-setting">
              Idioma de la IA
              <select value={settings.language} onChange={(e) => saveSetting({ language: e.target.value })}>
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </label>
            <p className="pr-autopilot-line">1 reel al día. Al llegar su hora se publica en las redes marcadas, solo si está <b>aprobado</b>.</p>
          </div>

          <div className="pr-side-head">
            <div>
              <span className="pr-side-eyebrow">{isCurrentMonth && selectedDay === today.getDate() ? 'Hoy' : isDayPast(selectedDay) ? 'Día pasado' : 'Día seleccionado'}</span>
              <h4>{fmtDayLong(selectedDate)}</h4>
            </div>
          </div>

          {selectedPosts.length > 0 ? (
            <div className="rl-side-list">
              {selectedPosts.length > 1 && <span className="pr-side-eyebrow">{selectedPosts.length} reels este día</span>}
              {selectedPosts.map(selectedPost => {
                const st = reelState(selectedPost);
                return (
                  <div key={selectedPost.id} className="rl-side-reel">
                    <div className="rl-side-reel-video" onClick={() => setEditorId(selectedPost.id)}>
                      <video src={`${resolveMediaUrl(selectedPost.videoPath)}#t=0.5`} preload="metadata" muted playsInline />
                    </div>
                    <div className="rl-side-reel-info">
                      <span className={`rl-state st-${st.key}`}>{st.icon} {st.label}</span>
                      <b>{selectedPost.subject || selectedPost.originalName}</b>
                      <small>🕒 {fmtTime(selectedPost.scheduledAt)}</small>
                      <PlatformBadges list={selectedPost.platforms} />
                      {selectedPost.assetTitle && <small className="rl-asset-ok">🔗 #{selectedPost.assetId} {selectedPost.assetTitle}</small>}
                    </div>
                    <div className="pr-side-actions">
                      <button type="button" className="pr-btn primary" onClick={() => setEditorId(selectedPost.id)}>
                        {selectedPost.status === 'PUBLISHED' ? 'Ver detalle' : st.key === 'approved' ? 'Ver / editar' : 'Revisar y aprobar'}
                      </button>
                      {selectedPost.status !== 'PUBLISHED' && (
                        <button type="button" className="pr-btn" onClick={() => assign(selectedPost.id, null)}>↩ Devolver a la bandeja</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rl-side-empty">
              {isDayPast(selectedDay) ? <p className="pr-muted">Este día no tuvo reel.</p> : (
                <>
                  <span>🎬</span>
                  <p>Día vacío</p>
                  <small>Arrastra aquí un video de la bandeja{tray.length ? '' : ' (primero súbelo)'}.</small>
                </>
              )}
            </div>
          )}

          {(toReview.length > 0 || emptyDays.length > 0) && (
            <div className="pr-alerts">
              {toReview.length > 0 && (
                <div className="pr-alert warn">
                  <span>{toReview.length} {toReview.length === 1 ? 'reel por revisar' : 'reels por revisar'}</span>
                  <button type="button" onClick={() => setEditorId(toReview[0].id)}>Revisar</button>
                </div>
              )}
              {emptyDays.length > 0 && (
                <div className="pr-alert warn">
                  <span>{emptyDays.length} {emptyDays.length === 1 ? 'día vacío' : 'días vacíos'} este mes (desde el {emptyDays[0]})</span>
                  <button type="button" onClick={() => setSelectedDay(emptyDays[0])}>Ir</button>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {editorPost && createPortal(
        <ReelEditor key={editorPost.id} post={editorPost} http={http} settings={settings} ytConnected={ytConnected}
          onClose={() => setEditorId(null)}
          onChanged={refreshAll}
          onApprovedNext={() => openNextToReview(editorPost.id)}
          onDeleted={() => { setEditorId(null); refreshAll(); }}
          showToast={showToast} />,
        document.body,
      )}
      {toast && createPortal(<div className={`rl-toast ${toast.kind}`}>{toast.text}</div>, document.body)}
    </div>
  );
}

// ---------- Editor de un reel ----------
function ReelEditor({ post, http, settings, ytConnected, onClose, onChanged, onApprovedNext, onDeleted, showToast }) {
  // Una red no disponible: por ahora solo YouTube sin el canal conectado
  const unavailable = (p) => p.key === 'youtube' && !ytConnected;
  const [form, setForm] = useState(() => postToForm(post));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(null); // 'save' | 'approve' | 'ai' | 'publish'
  const [previewPlatform, setPreviewPlatform] = useState(toList(post.platforms)[0] || 'instagram');
  const [hashtagInput, setHashtagInput] = useState('');
  const [aiNotes, setAiNotes] = useState('');
  const [assetTitle, setAssetTitle] = useState(post.assetTitle || '');
  const st = reelState(post);
  const readOnly = post.status === 'PUBLISHED';
  const processing = post.aiStatus === 'PROCESSING';

  // Cuando la IA termina (o se recarga el reel) y no hay cambios sin guardar, refrescar el formulario
  useEffect(() => {
    if (!dirty) { setForm(postToForm(post)); setAssetTitle(post.assetTitle || ''); }
  }, [post.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') requestClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const update = (patch) => { setForm(f => ({ ...f, ...patch })); setDirty(true); };
  const requestClose = () => {
    if (dirty && !confirm('Tienes cambios sin guardar. ¿Cerrar de todos modos?')) return;
    onClose();
  };

  const payload = () => {
    const { time, assetId, ...rest } = form;
    return { ...rest, ...(post.scheduledAt && time && { time }), ...(String(post.assetId || '') !== assetId && { assetId: assetId || null }) };
  };

  const save = async (extra = {}) => {
    const res = await http.putData('/reels', post.id, { ...payload(), ...extra });
    setDirty(false);
    await onChanged();
    return res.data.post;
  };

  const run = async (kind, fn) => {
    setBusy(kind);
    try { await fn(); } catch (e) { showToast(errMsg(e), 'err'); } finally { setBusy(null); }
  };

  const onSave = () => run('save', async () => { await save(); showToast('Cambios guardados'); });
  const onApprove = () => run('approve', async () => {
    await save({ approved: true });
    showToast(post.scheduledAt ? `✔ Aprobado: se publicará el ${fmtDayLong(post.scheduledAt)} a las ${form.time}` : '✔ Aprobado (arrástralo a un día para programarlo)');
    onApprovedNext();
  });
  const onUnapprove = () => run('approve', async () => { await save({ approved: false }); showToast('Aprobación retirada'); });
  const onRegenerate = () => run('ai', async () => {
    if (dirty && !confirm('La IA reemplazará los textos actuales. ¿Continuar?')) return;
    await http.postData(`/reels/${post.id}/ai`, { notes: aiNotes, ...(String(post.assetId || '') !== form.assetId && { assetId: form.assetId || null }) });
    setDirty(false);
    await onChanged();
    showToast('Textos regenerados');
  });
  const onPublishNow = () => run('publish', async () => {
    const targets = PLATFORMS.filter(p => form.platforms.includes(p.key)).map(p => p.label.split(' ')[0]).join(' y ');
    if (!confirm(`🔴 Se va a publicar DE VERDAD en ${targets}.\nSerá público para todos tus seguidores.\n\n¿Publicar ahora?`)) return;
    if (dirty) await save();
    await http.postData(`/reels/${post.id}/publish`);
    await onChanged();
    showToast('⏫ Publicando… Instagram y YouTube pueden tardar unos minutos en procesar el video');
  });
  const onDelete = async () => {
    if (!confirm('¿Eliminar este reel y su video?')) return;
    try { await http.deleteData('/reels', post.id); onDeleted(); } catch (e) { showToast(errMsg(e), 'err'); }
  };

  const lookupAsset = async () => {
    const id = parseInt(form.assetId, 10);
    if (isNaN(id)) { setAssetTitle(''); return; }
    try {
      const res = await http.getData(`/reels/asset/${id}?lang=${post.language}`);
      setAssetTitle(res.data.asset.titleEn || res.data.asset.title);
    } catch (e) { setAssetTitle(''); showToast(errMsg(e), 'err'); }
  };

  const togglePlatform = (key) => {
    const next = form.platforms.includes(key) ? form.platforms.filter(p => p !== key) : [...form.platforms, key];
    update({ platforms: next });
    if (!next.includes(previewPlatform) && next.length) setPreviewPlatform(next[0]);
  };

  const addHashtags = (raw) => {
    const tags = String(raw).split(/[\s,]+/).map(t => t.replace(/#/g, '')).filter(Boolean);
    if (!tags.length) return;
    update({ hashtags: [...new Set([...form.hashtags, ...tags])].slice(0, 5) });
    setHashtagInput('');
  };

  const previewCaption = previewPlatform === 'facebook' ? (form.facebookCaption || form.caption) : form.caption;
  const checks = videoChecks({ ...post, platforms: form.platforms });

  return (
    <div className="pinterest-modal-overlay reels-publisher-modal rl-editor-overlay" onClick={requestClose}>
      <div className="pinterest-modal-content rl-editor" onClick={(e) => e.stopPropagation()}>
        <div className="pr-topbar">
          <h3>{post.subject || post.originalName}</h3>
          <span className={`rl-state st-${st.key}`}>{st.icon} {st.label}</span>
          {post.scheduledAt ? <span className="pr-topbar-stats">📅 {fmtDayLong(post.scheduledAt)}</span> : <span className="pr-topbar-stats">📥 En la bandeja (sin día)</span>}
          <span className="pr-spacer" />
          <button className="close-modal" onClick={requestClose}>✕</button>
        </div>

        <div className="rl-editor-body">
          {/* Vista previa */}
          <div className="rl-editor-preview">
            <div className="pr-size-toggle" role="group" aria-label="Plataforma de la vista previa">
              {PLATFORMS.filter(p => form.platforms.includes(p.key)).map(p => (
                <button key={p.key} type="button" title={p.label}
                  className={previewPlatform === p.key ? 'on' : ''} onClick={() => setPreviewPlatform(p.key)}>{p.short}</button>
              ))}
            </div>
            <PhonePreview videoUrl={resolveMediaUrl(post.videoPath)} platform={previewPlatform} caption={previewCaption}
              hashtags={form.hashtags} title={form.title} />
            <ul className="rl-checks">{checks.map((c, i) => <li key={i} className={c.ok ? 'ok' : 'warn'}>{c.ok ? '✓' : '⚠'} {c.text}</li>)}</ul>
          </div>

          {/* Formulario */}
          <div className="rl-editor-form">
            {processing ? (
              <div className="rl-ai-working"><span className="rl-spinner" />La IA está generando los textos…</div>
            ) : post.aiStatus === 'NONE' ? (
              <div className="rl-ai-working rl-ai-none">
                <span>Este reel aún no tiene metadata.</span>
                <button type="button" className="pr-btn primary" onClick={onRegenerate} disabled={!!busy}>{busy === 'ai' ? '✨ Generando…' : '✨ Generar metadata IA'}</button>
              </div>
            ) : post.aiStatus === 'ERROR' ? (
              <div className="pr-alert err"><span>La IA falló: {post.aiError}</span></div>
            ) : null}

            <section className="rl-section">
              <div className="rl-section-head">
                <span className="pr-side-eyebrow">Asset y redes</span>
              </div>
              <div className="rl-row">
                <label className="rl-field rl-field-asset">
                  Asset de STL HUB
                  <input type="number" className="form-input" placeholder="ID" value={form.assetId} disabled={readOnly}
                    onChange={(e) => update({ assetId: e.target.value })} onBlur={lookupAsset} onKeyDown={(e) => e.key === 'Enter' && lookupAsset()} />
                </label>
                <div className="rl-asset-info">
                  {assetTitle ? <><b>🔗 {assetTitle}</b>{post.link && String(post.assetId) === form.assetId && <a href={post.link} target="_blank" rel="noreferrer">{post.link.replace('https://', '')} ↗</a>}</>
                    : <span className="rl-asset-none">Sin asset: escribe su ID (o nombra el video empezando por el ID, p. ej. "11848 squall.mp4")</span>}
                </div>
              </div>
              <div className="rl-platform-toggles row">
                {PLATFORMS.map(p => (
                  <button key={p.key} type="button" disabled={readOnly || unavailable(p)} title={unavailable(p) ? 'Conecta tu canal de YouTube en la cabecera' : undefined}
                    className={`rl-platform-toggle ${form.platforms.includes(p.key) ? 'on' : ''} ${unavailable(p) ? 'rl-soon' : ''}`} onClick={() => togglePlatform(p.key)}>
                    <PlatformIcon platform={p.key} title={p.label} />{p.label}{unavailable(p) && <small>Sin conectar</small>}
                  </button>
                ))}
              </div>
            </section>

            <section className="rl-section">
              <div className="rl-section-head">
                <span className="pr-side-eyebrow">Textos</span>
                {post.aiGenerated && <span className="pr-ai ok">✨ generado por IA</span>}
              </div>
              {form.platforms.includes('instagram') && (
                <label className="rl-field">
                  <span><PlatformIcon platform="instagram" /> Caption de Instagram <small>{form.caption.length}/2200</small></span>
                  <textarea className="form-input" rows="5" maxLength={2200} value={form.caption} disabled={readOnly || processing} onChange={(e) => update({ caption: e.target.value })} />
                </label>
              )}
              {form.platforms.includes('facebook') && (
                <label className="rl-field">
                  <span><PlatformIcon platform="facebook" /> Caption de Facebook <small>{form.facebookCaption.length}/2200</small></span>
                  <textarea className="form-input" rows="3" maxLength={2200} value={form.facebookCaption} placeholder="Vacío = se usa el de Instagram" disabled={readOnly || processing} onChange={(e) => update({ facebookCaption: e.target.value })} />
                </label>
              )}
              {form.platforms.some(p => p !== 'youtube') && (
                <div className="rl-field">
                  <span>Hashtags <small>{form.hashtags.length}/5 (límite de Instagram)</small></span>
                  <div className="rl-chips">
                    {form.hashtags.map(h => (
                      <span key={h} className="rl-chip">#{h}{!readOnly && <button type="button" onClick={() => update({ hashtags: form.hashtags.filter(x => x !== h) })}>✕</button>}</span>
                    ))}
                    {!readOnly && form.hashtags.length < 5 && (
                      <input className="rl-chip-input" placeholder="+ hashtag" value={hashtagInput} onChange={(e) => setHashtagInput(e.target.value)}
                        onKeyDown={(e) => { if (['Enter', ',', ' '].includes(e.key)) { e.preventDefault(); addHashtags(hashtagInput); } }}
                        onBlur={() => addHashtags(hashtagInput)} />
                    )}
                  </div>
                </div>
              )}
              {!ytConnected && (
                <div className="rl-field rl-soon-block" title="Conecta tu canal de YouTube en la cabecera">
                  <span><PlatformIcon platform="youtube" /> Título y descripción de YouTube Shorts <small>Sin conectar</small></span>
                  <input type="text" className="form-input" disabled value={form.title} placeholder="Conecta YouTube para publicar también en Shorts" />
                </div>
              )}
              {form.platforms.includes('youtube') && (
                <>
                  <label className="rl-field">
                    <span><PlatformIcon platform="youtube" /> Título de YouTube Shorts <small>{form.title.length}/100</small></span>
                    <input type="text" className="form-input" maxLength={100} value={form.title} disabled={readOnly || processing} onChange={(e) => update({ title: e.target.value })} />
                  </label>
                  <label className="rl-field">
                    <span>Descripción de YouTube</span>
                    <textarea className="form-input" rows="3" value={form.youtubeDescription} disabled={readOnly || processing} onChange={(e) => update({ youtubeDescription: e.target.value })} />
                  </label>
                </>
              )}

              {!readOnly && (
                <div className="rl-regenerate">
                  <input type="text" className="form-input" placeholder="Notas para la IA (opcional): ej. es una figura premium de colección" value={aiNotes} onChange={(e) => setAiNotes(e.target.value)} />
                  <button type="button" className="pr-btn" onClick={onRegenerate} disabled={!!busy || processing}>{busy === 'ai' ? '✨ Generando…' : '✨ Regenerar'}</button>
                </div>
              )}
            </section>

            <section className="rl-section">
              <div className="rl-section-head"><span className="pr-side-eyebrow">Enlaces al publicar</span></div>
              <ul className="rl-link-plan">
                {PLATFORMS.filter(p => form.platforms.includes(p.key)).map(p => (
                  <li key={p.key}><PlatformIcon platform={p.key} title={p.label} />{p.linkHint}</li>
                ))}
              </ul>
            </section>

            {post.publishing && (
              <div className="rl-ai-working"><span className="rl-spinner" />Publicando en las redes… Instagram puede tardar unos minutos en procesar el video.</div>
            )}
            {post.results && Object.keys(post.results).length > 0 && (
              <section className="rl-section">
                <div className="rl-section-head"><span className="pr-side-eyebrow">Resultado</span>{post.simulated && <span className="rl-sim-badge">simulado</span>}</div>
                <ul className="rl-results">
                  {PLATFORMS.filter(p => post.results[p.key]).map(p => {
                    const r = post.results[p.key];
                    return (
                      <li key={p.key}>
                        <PlatformIcon platform={p.key} title={p.label} />{p.label}
                        {r.url ? <a href={r.url} target="_blank" rel="noreferrer">Ver publicación ↗</a> : <code>{r.id}</code>}
                        {p.key === 'facebook' && !r.simulated && <small>{r.commentId ? '💬 link comentado' : '⚠ sin comentario con link'}</small>}
                        ✓
                      </li>
                    );
                  })}
                </ul>
                {post.publishedAt && <p className="pr-muted">Publicado el {new Date(post.publishedAt).toLocaleString('es')}</p>}
              </section>
            )}
            {post.errorMessage && <div className="pr-alert err"><span>{post.errorMessage}</span></div>}
          </div>
        </div>

        {/* Barra de acciones */}
        {!readOnly && !post.publishing && (
          <div className="rl-editor-footer">
            <button type="button" className="pr-btn ghost rl-danger" onClick={onDelete}>🗑 Eliminar</button>
            {post.scheduledAt && (
              <label className="rl-time">
                🕒 Hora
                <input type="time" value={form.time} onChange={(e) => update({ time: e.target.value })} />
              </label>
            )}
            <span className="pr-spacer" />
            <button type="button" className="pr-btn rl-publish-real" onClick={onPublishNow} disabled={!!busy || processing}>
              {post.status === 'FAILED' ? '🔄 Reintentar publicación' : '🚀 Publicar ahora'}
            </button>
            {dirty && <button type="button" className="pr-btn" onClick={onSave} disabled={!!busy}>{busy === 'save' ? 'Guardando…' : '💾 Guardar'}</button>}
            {post.approved
              ? <button type="button" className="pr-btn on" onClick={onUnapprove} disabled={!!busy}>✔ Aprobado · quitar</button>
              : <button type="button" className="pr-btn primary rl-approve" onClick={onApprove} disabled={!!busy || processing}>{busy === 'approve' ? 'Aprobando…' : '✔ Aprobar y siguiente'}</button>}
          </div>
        )}
      </div>
    </div>
  );
}
