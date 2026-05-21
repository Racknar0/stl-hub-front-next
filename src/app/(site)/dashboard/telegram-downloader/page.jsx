'use client'

import React, { useState, useEffect, useRef } from 'react';
import HttpService from '@/services/HttpService';
import { Dialog } from '@mui/material';
import FileExplorer from '@/components/dashboard/FileExplorer/FileExplorer';
import './TelegramDownloader.scss';

function ChannelAvatar({ channel }) {
  const [hasError, setHasError] = useState(false);
  const size = '32px';
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  const imageUrl = channel.avatarUrl ? `${baseUrl}${channel.avatarUrl}` : null;

  if (imageUrl && !hasError) {
    return (
      <img
        src={imageUrl}
        alt={channel.label || channel.name}
        onError={() => setHasError(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      />
    );
  }

  // Fallback avatar with initials and gradient
  const initials = (channel.label || channel.name || '?')
    .trim()
    .split(/\s+/)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Generate a stable gradient based on the channel name
  let hash = 0;
  const str = channel.name || '';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    ['#ff4e50', '#f9d423'],
    ['#4facfe', '#00f2fe'],
    ['#b180f2', '#5ea3ff'],
    ['#11998e', '#38ef7d'],
    ['#fc466b', '#3f5efb'],
    ['#f12711', '#f5af19']
  ];
  const colorIndex = Math.abs(hash) % colors.length;
  const [c1, c2] = colors[colorIndex];

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        textShadow: '0 1px 2px rgba(0,0,0,0.2)',
        flexShrink: 0,
        border: '1px solid rgba(255, 255, 255, 0.15)'
      }}
    >
      {initials}
    </div>
  );
}

export default function TelegramDownloader() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authStep, setAuthStep] = useState('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [newChannel, setNewChannel] = useState('');
  const [newChannelLabel, setNewChannelLabel] = useState('');
  const [isPrivateChannel, setIsPrivateChannel] = useState(false);
  const [initialLastMsgId, setInitialLastMsgId] = useState('');
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [startId, setStartId] = useState('');
  const [endId, setEndId] = useState('');
  const [maxGB, setMaxGB] = useState(150);
  const [channelInfo, setChannelInfo] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);

  // Channel table state
  const [editedChannels, setEditedChannels] = useState({});
  const [scanningChannel, setScanningChannel] = useState(null);
  const [scanResults, setScanResults] = useState({});
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  const [filesDownloaded, setFilesDownloaded] = useState([]);
  const [showExplorer, setShowExplorer] = useState(false);

  const [isDownloading, setIsDownloading] = useState(false);
  const [progressData, setProgressData] = useState(null);
  const [logs, setLogs] = useState([]);

  const logsEndRef = useRef(null);
  const eventSourceRef = useRef(null);
  const http = new HttpService();

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    if (isAuthorized) {
      fetchChannels();
      recoverState();
      connectSSE();
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isAuthorized]);

  // Recover download state if browser was closed and reopened
  const recoverState = async () => {
    try {
      const res = await http.getData('/telegram/download-status');
      const d = res.data || res;
      if (d.success && d.isDownloading) {
        setIsDownloading(true);
        if (d.lastProgress) setProgressData(d.lastProgress);
        if (d.logBuffer && d.logBuffer.length > 0) {
          const recovered = d.logBuffer.map(entry => ({
            message: entry.message || `[${entry.type}] ${entry.fileName || ''}`,
            type: entry.type === 'file_done' ? 'success' : entry.type === 'error' ? 'error' : entry.type === 'file_skip' ? 'default' : 'info',
            time: new Date().toLocaleTimeString()
          }));
          setLogs(recovered);
        }
      }
    } catch {}
  };

  useEffect(() => {
    const el = logsEndRef.current;
    if (el?.parentElement) el.parentElement.scrollTop = el.parentElement.scrollHeight;
  }, [logs]);

  const checkAuth = async () => {
    try {
      const res = await http.getData('/telegram/auth/status');
      const d = res.data || res;
      if (d.success && d.isAuthorized) setIsAuthorized(true);
    } catch (e) { console.error('Error checking auth', e); }
  };

  const handleAuthPhone = async () => {
    if (!phoneNumber) return;
    setAuthLoading(true);
    try { await http.postData('/telegram/auth/start', { phoneNumber }); setAuthStep('code'); }
    catch { alert('Error starting auth'); }
    setAuthLoading(false);
  };

  const handleAuthCode = async () => {
    if (!authCode) return;
    setAuthLoading(true);
    try {
      await http.postData('/telegram/auth/code', { code: authCode });
      setTimeout(async () => {
        const res = await http.getData('/telegram/auth/status');
        const d = res.data || res;
        if (d.success && d.isAuthorized) setIsAuthorized(true);
        else setAuthStep('password');
        setAuthLoading(false);
      }, 3000);
    } catch { alert('Error sending code'); setAuthLoading(false); }
  };

  const handleAuthPassword = async () => {
    setAuthLoading(true);
    try {
      await http.postData('/telegram/auth/password', { password: authPassword });
      setTimeout(async () => {
        const res = await http.getData('/telegram/auth/status');
        const d = res.data || res;
        if (d.success && d.isAuthorized) setIsAuthorized(true);
        else alert('Autenticación fallida');
        setAuthLoading(false);
      }, 3000);
    } catch { alert('Error sending password'); setAuthLoading(false); }
  };

  const fetchChannels = async () => {
    try {
      const res = await http.getData('/telegram/channels');
      const d = res.data || res;
      if (d.success) {
        setChannels(d.channels);
        if (d.channels.length > 0 && !selectedChannel) setSelectedChannel(d.channels[0].name);
      }
    } catch (e) { console.error(e); }
  };

  const handleAddChannel = async () => {
    if (!newChannel) return;
    let formattedName = newChannel.trim();
    if (isPrivateChannel && !formattedName.startsWith('-100')) {
      formattedName = `-100${formattedName}`;
    }
    try {
      const res = await http.postData('/telegram/channels', {
        name: formattedName,
        label: newChannelLabel,
        lastMsgId: initialLastMsgId ? Number(initialLastMsgId) : undefined
      });
      const d = res.data || res;
      if (d.success) {
        await fetchChannels();
        setSelectedChannel(formattedName);
        setNewChannel('');
        setNewChannelLabel('');
        setIsPrivateChannel(false);
        setInitialLastMsgId('');
      }
    } catch { alert('Error adding channel'); }
  };

  // --- Channel Table handlers ---
  const handleEditField = (channelName, field, value) => {
    setEditedChannels(prev => ({ ...prev, [channelName]: { ...(prev[channelName] || {}), [field]: value } }));
  };

  const handleSaveChannel = async (originalName) => {
    const edits = editedChannels[originalName];
    if (!edits) return;
    try {
      // Find existing channel info to preserve untouched values
      const chan = channels.find(c => c.name === originalName);
      const label = edits.label !== undefined ? edits.label : (chan?.label || '');
      const newName = edits.name !== undefined ? edits.name : originalName;
      const lastMsgId = edits.lastMsgId !== undefined ? (edits.lastMsgId === '' ? null : Number(edits.lastMsgId)) : undefined;

      await http.patchData('/telegram/channels', encodeURIComponent(originalName), {
        label,
        newName,
        lastMsgId,
      });
      setEditedChannels(prev => { const n = { ...prev }; delete n[originalName]; return n; });
      await fetchChannels();
    } catch { alert('Error guardando canal'); }
  };

  const handleSaveAllChannels = async () => {
    setIsSavingAll(true);
    try {
      const editKeys = Object.keys(editedChannels);
      for (const originalName of editKeys) {
        const edits = editedChannels[originalName];
        const chan = channels.find(c => c.name === originalName);
        const label = edits.label !== undefined ? edits.label : (chan?.label || '');
        const newName = edits.name !== undefined ? edits.name : originalName;
        const lastMsgId = edits.lastMsgId !== undefined ? (edits.lastMsgId === '' ? null : Number(edits.lastMsgId)) : undefined;

        await http.patchData('/telegram/channels', encodeURIComponent(originalName), {
          label,
          newName,
          lastMsgId,
        });
      }
      setEditedChannels({});
      await fetchChannels();
      alert('Cambios guardados con éxito');
    } catch (e) {
      alert('Error guardando los cambios: ' + (e.message || ''));
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleDeleteChannel = async (name) => {
    if (!confirm(`¿Eliminar el canal "${name}"?`)) return;
    try {
      await http.deleteData('/telegram/channels', encodeURIComponent(name));
      await fetchChannels();
    } catch { alert('Error eliminando canal'); }
  };

  const handleQuickScan = async (channelName) => {
    setScanningChannel(channelName);
    try {
      const res = await http.getData(`/telegram/quick-scan?channelName=${encodeURIComponent(channelName)}`);
      const d = res.data || res;
      if (d.success) {
        setScanResults(prev => ({
          ...prev,
          [channelName]: {
            newFiles: d.newFiles,
            totalSize: d.totalSize,
            totalMessages: d.totalMessages,
            totalSizeBytes: d.totalSizeBytes,
            maxId: d.maxId
          }
        }));
        await fetchChannels();
      }
    } catch (e) {
      setScanResults(prev => ({ ...prev, [channelName]: { error: e.message || 'Error' } }));
    }
    setScanningChannel(null);
  };

  const getTelegramUrl = (channelName) => {
    if (String(channelName).startsWith('-100')) {
      return `https://t.me/c/${String(channelName).substring(4)}`;
    }
    return `https://t.me/${channelName.replace(/^@/, '')}`;
  };

  const handleLoadChannelToDownloader = (c) => {
    setSelectedChannel(c.name);
    setChannelInfo(null);
    setScanResult(null);

    // Resolver valores recomendados
    const lastLd = c.lastDownload;
    const lastScan = c.lastScanResult;
    const manualScan = scanResults[c.name];

    const resolvedStartId = lastLd ? lastLd.lastMsgId + 1 : 1;
    const resolvedEndId = manualScan?.maxId || lastScan?.maxId || lastLd?.lastMsgId || '';

    setStartId(resolvedStartId);
    setEndId(resolvedEndId);

    // Scroll suave hacia la cabecera/panel de descargas
    const element = document.querySelector('.telegram-downloader');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'size' ? 'desc' : 'asc'); // por defecto descendente para peso, ascendente para nombre
    }
  };

  const renderSortIndicator = (field) => {
    if (sortBy !== field) {
      return <span style={{ opacity: 0.3, marginLeft: '4px', fontSize: '0.8rem' }}>↕</span>;
    }
    return sortOrder === 'asc' ? (
      <span style={{ color: '#4facfe', marginLeft: '4px', fontSize: '0.8rem' }}>▲</span>
    ) : (
      <span style={{ color: '#4facfe', marginLeft: '4px', fontSize: '0.8rem' }}>▼</span>
    );
  };

  const getSortedChannels = () => {
    if (!sortBy) return channels;

    return [...channels].sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = (editedChannels[a.name]?.label || a.label || a.name || '').trim().toLowerCase();
        const nameB = (editedChannels[b.name]?.label || b.label || b.name || '').trim().toLowerCase();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }

      if (sortBy === 'size') {
        const sizeA = scanResults[a.name]?.totalSizeBytes || a.lastScanResult?.totalSizeBytes || 0;
        const sizeB = scanResults[b.name]?.totalSizeBytes || b.lastScanResult?.totalSizeBytes || 0;
        return sortOrder === 'asc' ? sizeA - sizeB : sizeB - sizeA;
      }

      return 0;
    });
  };

  const handleGetInfo = async () => {
    if (!selectedChannel) return;
    try {
      setChannelInfo({ loading: true });
      setScanResult(null);
      const res = await http.getData(`/telegram/info?channelName=${selectedChannel}&maxGB=${maxGB}`);
      const d = res.data || res;
      if (d.success) {
        setChannelInfo(d.info);
        setStartId(d.info.suggestedStart);
        setEndId(d.info.suggestedEnd);
        addLog(`Canal: ${selectedChannel} | Max ID: ${d.info.maxId} | ${d.info.newMessages} mensajes nuevos`, 'info');

        // Auto-scan with limit
        if (d.info.suggestedStart <= d.info.maxId) {
          setScanning(true);
          addLog(`Escaneando archivos desde msg #${d.info.suggestedStart} con límite de ${maxGB} GB...`, 'info');
          const scanRes = await http.getData(`/telegram/scan?channelName=${selectedChannel}&startId=${d.info.suggestedStart}&maxGB=${maxGB}`);
          const sd = scanRes.data || scanRes;
          if (sd.success) {
            setScanResult(sd);
            setEndId(sd.suggestedEndId);
            addLog(`Escaneo completo: ${sd.totalFiles} archivos (~${sd.totalSizeStr}) caben en ${maxGB} GB. End ID sugerido: ${sd.suggestedEndId}`, 'success');
          }
          setScanning(false);
        }
      }
    } catch (e) {
      setChannelInfo(null);
      setScanning(false);
      addLog('Error getting channel info: ' + (e.message || ''), 'error');
    }
  };

  const addLog = (message, type = 'default') => {
    setLogs(prev => [...prev.slice(-99), { message, type, time: new Date().toLocaleTimeString() }]);
  };

  const connectSSE = () => {
    // Close any previous connection to avoid saturation
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    const eventSource = new EventSource(`${baseUrl}/api/telegram/stream`);
    eventSourceRef.current = eventSource;
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.active) setIsDownloading(true);
      if (data.type === 'progress') setProgressData(data);
      else if (data.type === 'start') { setIsDownloading(true); setProgressData(data); addLog(`Iniciando: ${data.totalFiles} archivos, ${data.totalBytesStr}`, 'info'); }
      else if (data.type === 'file_start') addLog(`Descargando: [${data.msgId}] ${data.fileName}`, 'info');
      else if (data.type === 'file_done') addLog(`✓ ${data.fileName}`, 'success');
      else if (data.type === 'file_skip') addLog(`↷ Omitido: ${data.fileName}`, 'default');
      else if (data.type === 'finish') { setIsDownloading(false); addLog('¡Descarga completada!', 'success'); }
      else if (data.type === 'error') addLog(`Error: ${data.message}`, 'error');
      else if (data.type === 'info') addLog(data.message, 'info');
    };
  };

  const handleStartDownload = async () => {
    if (!selectedChannel || !startId || !endId) return;
    try {
      setIsDownloading(true); setProgressData(null); setLogs([]);
      await http.postData('/telegram/start', { channelName: selectedChannel, startId, endId });
      addLog('Descarga solicitada...', 'info');
    } catch { setIsDownloading(false); alert('Error starting download'); }
  };

  const handleCancel = async () => {
    try { await http.postData('/telegram/cancel', {}); addLog('Cancelación solicitada...', 'info'); setIsDownloading(false); }
    catch { alert('Error cancelling'); }
  };

  const handleLogout = async () => {
    if (!confirm('¿Cerrar sesión de Telegram? Tendrás que volver a autenticarte.')) return;
    try {
      await http.postData('/telegram/auth/logout', {});
      setIsAuthorized(false);
      setAuthStep('phone');
    } catch { alert('Error cerrando sesión'); }
  };

  const handleClearDownloads = async () => {
    if (!confirm('¿Eliminar TODOS los archivos descargados del servidor?')) return;
    try {
      const res = await http.postData('/telegram/clear-downloads', {});
      const d = res.data || res;
      alert(d.message || 'Carpeta limpiada');
    } catch { alert('Error limpiando descargas'); }
  };

  // Helper to format relative time
  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const then = new Date(dateStr.replace(' ', 'T'));
    const now = new Date();
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days} días`;
  };

  // AUTH VIEW
  if (!isAuthorized) {
    return (
      <div className="telegram-downloader" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '500px', width: '100%' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#4facfe' }}>Autenticación de Telegram</h1>
          <p style={{ marginBottom: '1.5rem', color: '#cbd5e0' }}>Inicia sesión con Telegram para descargar archivos de canales.</p>

          {authStep === 'phone' && (
            <div className="form-group">
              <label>Número de Teléfono (ej. +57...)</label>
              <input type="text" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} disabled={authLoading} placeholder="+573001234567" />
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={handleAuthPhone} disabled={authLoading}>
                {authLoading ? 'Enviando...' : 'Enviar Código'}
              </button>
            </div>
          )}
          {authStep === 'code' && (
            <div className="form-group">
              <label>Código de verificación</label>
              <input type="text" value={authCode} onChange={e => setAuthCode(e.target.value)} disabled={authLoading} placeholder="12345" />
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={handleAuthCode} disabled={authLoading}>
                {authLoading ? 'Verificando...' : 'Verificar Código'}
              </button>
            </div>
          )}
          {authStep === 'password' && (
            <div className="form-group">
              <label>Contraseña 2FA</label>
              <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} disabled={authLoading} />
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={handleAuthPassword} disabled={authLoading}>
                {authLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // MAIN VIEW
  return (
    <div className="telegram-downloader">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Telegram STL Downloader</h1>
          <p>Descarga archivos de canales de Telegram directamente al servidor.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={() => setShowExplorer(true)} style={{ whiteSpace: 'nowrap' }}>
            Abrir Explorador
          </button>
          <button className="btn btn-danger" onClick={handleClearDownloads} style={{ whiteSpace: 'nowrap' }}>
            Limpiar Descargas
          </button>
          <button className="btn btn-secondary" onClick={handleLogout} style={{ whiteSpace: 'nowrap' }}>
            Cerrar Sesión
          </button>
        </div>
      </div>

      <Dialog open={showExplorer} onClose={() => setShowExplorer(false)} maxWidth="xl" fullWidth PaperProps={{ sx: { bgcolor: '#0f172a', m: 2 } }}>
        <FileExplorer initialPath="/telegram_downloads" isModal onClose={() => setShowExplorer(false)} />
      </Dialog>

      <div className="grid-layout">
        {/* CONFIG */}
        <div className="glass-card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: '600' }}>Configuración</h2>

          <div className="form-group">
            <label>Canal Guardado</label>
            <select value={selectedChannel} onChange={e => { setSelectedChannel(e.target.value); setChannelInfo(null); setScanResult(null); }} disabled={isDownloading}>
              <option value="">-- Selecciona --</option>
              {channels.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          {/* LAST DOWNLOAD INFO - shows immediately from local data */}
          {selectedChannel && channels.find(c => c.name === selectedChannel)?.lastDownload && (() => {
            const ld = channels.find(c => c.name === selectedChannel).lastDownload;
            return (
              <div className="info-box" style={{ borderLeftColor: '#48bb78' }}>
                <p><strong>Último descargado:</strong> msg #{ld.lastMsgId}</p>
                <p style={{ fontSize: '0.85rem', color: '#a0aec0' }}>
                  {ld.lastFileName} • {timeAgo(ld.lastDownloadedAt)}
                </p>
                <a href={ld.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: '#4facfe', textDecoration: 'none' }}>
                  Abrir en Telegram ↗
                </a>
              </div>
            );
          })()}

          <div className="form-group">
            <label>Añadir nuevo Canal</label>
            <div className="input-wrapper" style={{ marginBottom: '0.5rem' }}>
              <input type="text" placeholder="Alias (ej. STLs Anime)" value={newChannelLabel} onChange={e => setNewChannelLabel(e.target.value)} disabled={isDownloading} style={{ flex: '0 0 40%' }} />
              <input type="text" placeholder="ID o @canal (ej. 1670826168)" value={newChannel} onChange={e => setNewChannel(e.target.value)} disabled={isDownloading} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0, fontSize: '0.85rem', color: '#cbd5e0' }}>
                <input
                  type="checkbox"
                  checked={isPrivateChannel}
                  onChange={e => setIsPrivateChannel(e.target.checked)}
                  disabled={isDownloading}
                  style={{ width: 'auto', margin: 0 }}
                />
                ¿Canal Privado? (añade -100)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e0' }}>Último Descargado:</span>
                <input
                  type="number"
                  placeholder="Ej: 891"
                  value={initialLastMsgId}
                  onChange={e => setInitialLastMsgId(e.target.value)}
                  disabled={isDownloading}
                  style={{ width: '120px', padding: '0.4rem 0.6rem', fontSize: '0.9rem' }}
                />
              </div>
              <button className="btn btn-secondary" onClick={handleAddChannel} disabled={isDownloading} style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}>
                Añadir Canal
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Límite máximo de descarga (GB)</label>
            <input type="number" value={maxGB} onChange={e => setMaxGB(Number(e.target.value) || 150)} disabled={isDownloading} min={1} max={500} />
          </div>

          <button className="btn btn-secondary" onClick={handleGetInfo} style={{ width: '100%', marginBottom: '1.5rem' }} disabled={isDownloading || !selectedChannel || scanning}>
            {channelInfo?.loading || scanning ? 'Consultando y escaneando...' : 'Verificar Nuevos Archivos'}
          </button>

          {/* SCAN RESULT - only after clicking Verificar */}
          {channelInfo && !channelInfo.loading && (
            <div className="info-box">
              <p><strong>Max ID:</strong> {channelInfo.maxId} • <strong>Nuevos:</strong> {channelInfo.newMessages} mensajes</p>
              {scanResult && (
                <p><strong>Caben:</strong> {scanResult.totalFiles} archivos (~{scanResult.totalSizeStr}) dentro de {maxGB} GB</p>
              )}
            </div>
          )}

          <div className="grid-layout" style={{ gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label>ID Inicial</label>
              <input type="number" value={startId} onChange={e => setStartId(e.target.value)} disabled={isDownloading} />
            </div>
            <div className="form-group">
              <label>ID Final</label>
              <input type="number" value={endId} onChange={e => setEndId(e.target.value)} disabled={isDownloading} />
            </div>
          </div>

          {!isDownloading ? (
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={handleStartDownload} disabled={!startId || !endId}>
              Comenzar Descarga
            </button>
          ) : (
            <button className="btn btn-danger" style={{ width: '100%', marginTop: '1rem' }} onClick={handleCancel}>
              Cancelar Descarga
            </button>
          )}
        </div>

        {/* PROGRESS */}
        <div className="glass-card progress-section">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: '600' }}>Progreso en Vivo</h2>

          <div className="overall-stats">
            <span>Progreso General</span>
            <span>{progressData?.overallPct ? progressData.overallPct.toFixed(2) : 0}%</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progressData?.overallPct || 0}%` }}></div>
          </div>

          <div className="current-file">
            <div className="file-name">{progressData?.fileName || 'Esperando archivos...'}</div>
            <div className="file-stats">
              <span>{progressData?.speedStr || '0 B/s'}</span>
              <span>{progressData?.downloadedStr || '0 B'} / {progressData?.totalStr || '0 B'}</span>
            </div>
            <div className="progress-bar-container" style={{ height: '4px', marginTop: '0.5rem', marginBottom: 0 }}>
              <div className="progress-bar-fill" style={{ width: `${progressData?.filePct || 0}%` }}></div>
            </div>
          </div>

          <div className="logs-container">
            <h3>Registro de Actividad</h3>
            <div className="logs-box">
              {logs.map((log, i) => (
                <div key={i} className={`log-entry ${log.type}`}>
                  [{log.time}] {log.message}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* CHANNELS TABLE */}
      <div className="glass-card" style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: '600' }}>Canales Configurados</h2>
        {channels.length === 0 ? (
          <p style={{ color: '#a0aec0' }}>No hay canales configurados. Añade uno arriba.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="channels-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Nombre {renderSortIndicator('name')}
                  </th>
                  <th>Canal</th>
                  <th style={{ textAlign: 'center' }}>
                    Último Descargado
                  </th>
                  <th onClick={() => toggleSort('size')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}>
                    Último Msg {renderSortIndicator('size')}
                  </th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {getSortedChannels().map(c => {
                  const edits = editedChannels[c.name] || {};
                  const currentLabel = edits.label !== undefined ? edits.label : (c.label || '');
                  const currentName = edits.name !== undefined ? edits.name : c.name;
                  const currentLastMsgId = edits.lastMsgId !== undefined ? edits.lastMsgId : (c.lastDownload?.lastMsgId || '');
                  
                  const isScanning = scanningChannel === c.name;
                  
                  // Combinar resultado de escaneo manual y automático
                  const lastScan = c.lastScanResult || {};
                  const sr = scanResults[c.name] || (lastScan.newFiles !== undefined ? {
                    newFiles: lastScan.newFiles,
                    totalSize: lastScan.totalSize,
                    maxId: lastScan.maxId,
                    error: lastScan.error
                  } : null);

                  return (
                    <tr key={c.name}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <ChannelAvatar channel={c} />
                          <input
                            type="text"
                            value={currentLabel}
                            onChange={e => handleEditField(c.name, 'label', e.target.value)}
                            placeholder="Alias"
                            className="table-input"
                          />
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={currentName}
                          onChange={e => handleEditField(c.name, 'name', e.target.value)}
                          className="table-input"
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          value={currentLastMsgId}
                          onChange={e => handleEditField(c.name, 'lastMsgId', e.target.value)}
                          placeholder="Sin ID"
                          className="table-input"
                          style={{ textAlign: 'center', width: '100px', fontFamily: 'monospace', color: '#4facfe' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1rem', color: '#cbd5e0' }}>
                            {sr?.maxId || '—'}
                          </span>
                          {sr && !sr.error && (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: sr.newFiles > 0 ? '#48bb78' : '#a0aec0', marginTop: '0.2rem' }}>
                              {sr.newFiles > 0 ? `${sr.newFiles} arch. (~${sr.totalSize})` : 'Al día'}
                            </span>
                          )}
                          {sr?.error && <span style={{ display: 'block', fontSize: '0.75rem', color: '#f56565', marginTop: '0.2rem' }}>Error</span>}
                          {c.lastCheckedAt ? (
                            <span style={{ display: 'block', fontSize: '0.65rem', color: '#718096', marginTop: '2px' }}>
                              Verificado {timeAgo(c.lastCheckedAt)}
                            </span>
                          ) : (
                            <span style={{ display: 'block', fontSize: '0.65rem', color: '#a0aec0', marginTop: '2px', fontStyle: 'italic' }}>
                              Cola de verificación
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                          <button
                            className="table-action-btn scan"
                            onClick={() => handleLoadChannelToDownloader(c)}
                            title="Cargar en panel de descarga"
                            style={{
                              width: 'auto',
                              padding: '0 10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: '600',
                              fontSize: '0.8rem',
                              color: '#00f2fe',
                              borderColor: 'rgba(0, 242, 254, 0.3)',
                              background: 'rgba(0, 242, 254, 0.08)'
                            }}
                          >
                            ⚡ Cargar
                          </button>
                          <button className="table-action-btn scan" onClick={() => handleQuickScan(c.name)} disabled={isScanning} title="Escanear nuevos mensajes">
                            {isScanning ? '⏳' : '🔍'}
                          </button>
                          <a href={getTelegramUrl(c.name)} target="_blank" rel="noopener noreferrer" className="table-action-btn open" title="Abrir en Telegram">🔗</a>
                          <button className="table-action-btn delete" onClick={() => handleDeleteChannel(c.name)} title="Eliminar canal">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {Object.keys(editedChannels).length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setEditedChannels({})}
                  disabled={isSavingAll}
                >
                  Cancelar Cambios
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveAllChannels}
                  disabled={isSavingAll}
                >
                  {isSavingAll ? 'Guardando...' : 'Guardar Todos los Cambios'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
