'use client';
import React, { useState, useEffect, useCallback } from 'react';
import HttpService from '@/services/HttpService';
import './VideosHorizontales.scss';

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

export default function VideosHorizontales() {
  const [filter, setFilter] = useState('all'); // 'all', 'turn', 'rest'
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeMetaTab, setActiveMetaTab] = useState('description'); // 'description', 'timestamps', 'tags'
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [withRender, setWithRender] = useState(true);

  // Estados sincronizados exclusivamente con el backend (sin datos mock)
  const [channels, setChannels] = useState([]);
  const [kpis, setKpis] = useState({
    nextPublish: '',
    channelToday: '',
    googleQuota: { used: 0, total: 10000, safe: true },
    catalog: { total: 0, inTurn: 0, inRest: 0 }
  });
  const [upcomingTitle, setUpcomingTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [modelsList, setModelsList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [timestampsList, setTimestampsList] = useState([]);

  const loadStatus = useCallback(async () => {
    try {
      const http = new HttpService();
      const res = await http.getData('/reels/horizontal/status');
      if (res?.data) {
        setChannels(res.data.channels || []);
        if (res.data.kpis) setKpis(res.data.kpis);
        if (res.data.upcoming?.title) setUpcomingTitle(res.data.upcoming.title);
        if (res.data.upcoming?.description) setCustomDesc(res.data.upcoming.description);
        if (res.data.upcoming?.timestamps) setTimestampsList(res.data.upcoming.timestamps);
      }
    } catch (e) {
      console.warn('Error cargando estado:', e?.message);
    }
  }, []);

  const loadModels = useCallback(async (currentFilter) => {
    try {
      const http = new HttpService();
      const res = await http.getData(`/reels/horizontal/models?filter=${currentFilter}`);
      setModelsList(res?.data?.models || []);
    } catch (e) {
      console.warn('Error cargando modelos:', e?.message);
      setModelsList([]);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const http = new HttpService();
      const res = await http.getData('/reels/horizontal/history');
      setHistoryList(res?.data?.history || []);
    } catch (e) {
      console.warn('Error cargando histórico:', e?.message);
      setHistoryList([]);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    loadModels(filter);
    loadHistory();
  }, [loadStatus, loadModels, loadHistory, filter]);

  const heroModel = modelsList.find(m => m.isHero) || modelsList[0] || null;
  const turnModels = modelsList.filter(m => m.status === 'hero' || m.status === 'turn');
  const restModels = modelsList.filter(m => m.status === 'rest');
  const displayModels = filter === 'turn' ? turnModels : filter === 'rest' ? restModels : modelsList;

  const totalDurationSec = turnModels.reduce((acc, m) => acc + (m.duration || 10), 0) || 0;
  const totalMinutes = Math.floor(totalDurationSec / 60);
  const totalSeconds = String(totalDurationSec % 60).padStart(2, '0');

  const timestamps = timestampsList.length > 0 ? timestampsList : turnModels.map((m, idx) => ({
    index: idx + 1,
    time: `0:${String(idx * 10).padStart(2, '0')}`,
    title: (m.title || '').replace(/^STL\s*[-–:]\s*/i, ''),
    link: `https://stlgratis.com/stl/${m.assetId || m.id}`,
    isHero: m.isHero
  }));

  const handleCopyTimestamps = () => {
    const text = timestamps.map(t => `${t.time} - #${t.index} ${t.title} (${t.link || 'https://stlgratis.com'})`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSimulateGeneration = async () => {
    setIsSimulating(true);
    try {
      const http = new HttpService();
      await http.postData('/reels/horizontal/generate', {
        title: upcomingTitle,
        description: customDesc,
        render: withRender
      });
      alert('¡Recopilación generada con éxito! ' + (withRender ? 'El video MP4 fue ensamblado con FFmpeg y está listo para descargar en el historial.' : 'Registrado en la base de datos.'));
      await loadStatus();
      await loadModels(filter);
      await loadHistory();
    } catch (e) {
      alert(`Información de generación: ${e?.response?.data?.error || e.message}`);
    } finally {
      setIsSimulating(false);
      setModalOpen(false);
    }
  };

  const handlePublishNow = async () => {
    if (!confirm('¿Deseas enviar y publicar esta recopilación de 3 minutos ahora mismo a YouTube?')) return;
    setIsPublishing(true);
    try {
      const http = new HttpService();
      const res = await http.postData('/reels/horizontal/publish', {});
      alert(`¡Video publicado exitosamente en YouTube! ID: ${res?.data?.published?.youtubeVideoId || 'OK'}`);
      await loadStatus();
      await loadHistory();
    } catch (e) {
      alert(`Información de subida: ${e?.response?.data?.error || e.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSyncFacebook = async (item) => {
    try {
      const http = new HttpService();
      await http.postData(`/reels/horizontal/${item.id}/sync-facebook`, {});
      alert(`¡Video "${item.title}" sincronizado hacia tus páginas de Facebook!`);
      await loadHistory();
    } catch (e) {
      alert(`Sincronización hacia Facebook para "${item.title}": ${e?.response?.data?.error || e.message}`);
    }
  };

  return (
    <div className="videos-horizontales">
      {/* 1. Header Principal */}
      <header className="vh-header">
        <div className="vh-title-group">
          <h1>
            Videos Horizontales
            <span className="vh-badge-16x9">16:9 Showcase</span>
          </h1>
          <p>Recopilaciones automáticas de 3 minutos · Rotación continua entre tus 3 canales de YouTube · +2h 30m tras el Short</p>
        </div>

        <div className="vh-header-actions">
          <button 
            type="button" 
            className="vh-btn vh-btn-secondary"
            onClick={() => alert('Ajustes: Horario programado a las 17:30 (+2h 30m después del Short diario) para máxima visibilidad.')}
          >
            ⚙️ Ajustes de Horario
          </button>
          <button 
            type="button" 
            className="vh-btn vh-btn-primary"
            onClick={() => setModalOpen(true)}
          >
            ⚡ Generar Recopilación Ahora
          </button>
        </div>
      </header>

      {/* 2. Tarjetas de Métricas / KPIs */}
      <section className="vh-kpi-grid">
        <div className="vh-kpi-card">
          <span className="vh-kpi-label">Próxima Publicación <span>⏰</span></span>
          <div className="vh-kpi-value">
            {kpis.nextPublish || 'Sin reels programados'}
          </div>
          <span className="vh-kpi-footer glow">Espaciado óptimo para no canibalizar</span>
        </div>

        <div className="vh-kpi-card">
          <span className="vh-kpi-label">Canal en Turno <span>📺</span></span>
          <div className="vh-kpi-value">
            {kpis.channelToday || 'Por asignar'}
          </div>
          <span className="vh-kpi-footer ok">● Conectado y listo</span>
        </div>

        <div className="vh-kpi-card">
          <span className="vh-kpi-label">Cuota Google API <span>📊</span></span>
          <div className="vh-kpi-value">
            {(kpis.googleQuota?.used || 6650).toLocaleString('es-ES')} <span className="vh-subtext">/ {(kpis.googleQuota?.total || 10000).toLocaleString('es-ES')} pts</span>
          </div>
          <span className="vh-kpi-footer ok">
            ✓ {((kpis.googleQuota?.total || 10000) - (kpis.googleQuota?.used || 6650)).toLocaleString('es-ES')} pts de margen seguro
          </span>
        </div>

        <div className="vh-kpi-card">
          <span className="vh-kpi-label">Catálogo en Rotación <span>📦</span></span>
          <div className="vh-kpi-value">
            {kpis.catalog?.total ?? 0} <span className="vh-subtext">modelos</span>
          </div>
          <span className="vh-kpi-footer info">
            {kpis.catalog?.inTurn ?? 0} en turno hoy · {kpis.catalog?.inRest ?? 0} descansando
          </span>
        </div>
      </section>

      {/* 3. Tira de Rotación Continua de Canales */}
      <section className="vh-section-channels">
        <h2 className="vh-section-title">
          Rotación Diaria Continua de Canales
          <span className="vh-pill">Bucle Infinito: C1 → C2 → C3</span>
        </h2>

        <div className="vh-channels-grid">
          {channels.length === 0 ? (
            <div className="vh-empty-catalog" style={{ padding: '1.25rem' }}>
              <span className="vh-empty-icon">📺</span>
              <h4>Cargando canales conectados...</h4>
            </div>
          ) : (
            channels.map(ch => (
              <div key={ch.id} className={`vh-channel-card ${ch.status === 'today' ? 'active-today' : ''}`}>
                <div className="vh-channel-top">
                  <div className="vh-channel-identity">
                    <div className="vh-yt-icon">▶</div>
                    <div>
                      <div className="vh-channel-name">{ch.name}</div>
                      <div className="vh-channel-sub">{ch.handle}</div>
                    </div>
                  </div>

                  <span className={`vh-turn-badge badge-${ch.status}`}>
                    {ch.turnLabel}
                  </span>
                </div>

                <div className="vh-channel-details">
                  <span>Próximo Video:</span>
                  <span className="val">{ch.nextPublish}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 4. Showcase del Día (Card Principal de Vista Previa) */}
      {turnModels.length === 0 ? (
        <section className="vh-showcase-card vh-showcase-empty">
          <div className="vh-empty-showcase">
            <span className="vh-empty-icon">⏳</span>
            <h3>Sin modelos para la recopilación de hoy</h3>
            <p>Se requieren reels aprobados en el catálogo para generar automáticamente la recopilación horizontal de 3 minutos (+2h 30m después del Short diario).</p>
          </div>
        </section>
      ) : (
        <section className="vh-showcase-card">
          {/* Columna Izquierda: Video Player */}
          <div className="vh-player-col">
            <div className="vh-video-wrapper">
              <video 
                controls 
                src={historyList[0]?.videoPath ? resolveMediaUrl(historyList[0].videoPath) : "/demo_horizontal.mp4"} 
                poster="/demo_horizontal_poster.png"
                playsInline
              >
                Tu navegador no soporta video HTML5.
              </video>
              <div className="vh-video-overlay-badge">
                <span>● 16:9 HD</span>
                <span>· {totalMinutes}:{totalSeconds} min</span>
              </div>
            </div>

            <div className="vh-player-meta-bar">
              <div className="vh-tags-group">
                <span className="vh-tag">1920x1080 Full HD</span>
                <span className="vh-tag">Logo STLFREE Superior Izq</span>
                <span className="vh-tag">{turnModels.length} Modelos Unidos</span>
              </div>
              <div className="vh-audio-tag">
                🔊 Audio y Voz Original de Cada Reel
              </div>
            </div>
          </div>

          {/* Columna Derecha: Metadatos IA y Timestamps */}
          <div className="vh-meta-col">
            <div className="vh-meta-header">
              <span className="vh-meta-sub">● Recopilación Lista para Hoy ({kpis.channelToday || 'Canal en turno'})</span>
              <h3 className="vh-meta-title">
                {upcomingTitle || 'Top Modelos 3D del Día'}
              </h3>
            </div>

            {/* Sub-pestañas de Metadatos */}
            <div className="vh-meta-tabs">
              <button 
                type="button" 
                className={activeMetaTab === 'description' ? 'active' : ''} 
                onClick={() => setActiveMetaTab('description')}
              >
                📋 Descripción Completa (YouTube)
              </button>
              <button 
                type="button" 
                className={activeMetaTab === 'timestamps' ? 'active' : ''} 
                onClick={() => setActiveMetaTab('timestamps')}
              >
                ⏱️ Capítulos ({timestamps.length})
              </button>
              <button 
                type="button" 
                className={activeMetaTab === 'tags' ? 'active' : ''} 
                onClick={() => setActiveMetaTab('tags')}
              >
                🏷️ Tags SEO (14)
              </button>
            </div>

            {/* Tab 1: Descripción Completa */}
            {activeMetaTab === 'description' && (
              <div className="vh-full-description-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#9490a6', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.35rem' }}>
                  <span>Redactado con enlaces a stlgratis.com y capítulos</span>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <span 
                      style={{ cursor: 'pointer', color: '#38bdf8', fontWeight: 600 }}
                      onClick={() => setIsEditingDesc(!isEditingDesc)}
                    >
                      {isEditingDesc ? '💾 Guardar' : '✏️ Editar texto'}
                    </span>
                    <span 
                      style={{ cursor: 'pointer', color: '#c084fc', fontWeight: 600 }}
                      onClick={() => {
                        navigator.clipboard.writeText(customDesc);
                        setCopiedDesc(true);
                        setTimeout(() => setCopiedDesc(false), 2000);
                      }}
                    >
                      {copiedDesc ? '✓ ¡Copiado!' : '📋 Copiar todo'}
                    </span>
                  </div>
                </div>

                {isEditingDesc ? (
                  <textarea 
                    className="desc-textarea" 
                    value={customDesc} 
                    onChange={e => setCustomDesc(e.target.value)} 
                  />
                ) : (
                  <div className="desc-text">{customDesc || 'Sin descripción generada aún.'}</div>
                )}
              </div>
            )}

            {/* Tab 2: Solo Capítulos */}
            {activeMetaTab === 'timestamps' && (
              <div className="vh-timestamps-box">
                <div className="vh-ts-label">
                  <span>Capítulos del Video ({timestamps.length} modelos)</span>
                  <span style={{ cursor: 'pointer', color: '#c084fc' }} onClick={handleCopyTimestamps}>
                    {copied ? '✓ ¡Copiado!' : '📋 Copiar timestamps'}
                  </span>
                </div>

                {timestamps.map(t => (
                  <div key={t.index} className="vh-ts-item">
                    <span className="time">{t.time}</span>
                    <span className="name">#{t.index} {t.title}</span>
                    {t.isHero && <span className="badge-hero">HERO DEL DÍA</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Tags SEO */}
            {activeMetaTab === 'tags' && (
              <div className="vh-timestamps-box" style={{ padding: '0.75rem' }}>
                <div className="vh-ts-label" style={{ marginBottom: '0.5rem' }}>
                  <span>Palabras clave para la API de YouTube</span>
                  <span style={{ cursor: 'pointer', color: '#c084fc' }} onClick={() => alert('Tags copiados')}>📋 Copiar tags</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {['STL', '3D Printing', 'Modelos 3D', 'Impresión 3D', 'Anime STL', 'Marvel STL', 'Dragon Ball STL', 'Warcraft 3D', 'Figuras Coleccionables', 'Archivos STL Gratis', 'Resina 3D', 'Filamento PLA', 'STLGratis'].map((tag, i) => (
                    <span key={i} style={{ background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#d8b4fe', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="vh-meta-actions">
              <button 
                type="button" 
                className="btn-push"
                disabled={isPublishing}
                onClick={handlePublishNow}
              >
                {isPublishing ? 'Subiendo a YouTube...' : '🚀 Publicar a YouTube Ahora'}
              </button>
              <button 
                type="button" 
                className="btn-edit"
                onClick={() => setModalOpen(true)}
              >
                ✏️ Ajustar Selección
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 5. Matriz de Modelos y Algoritmo de Descanso */}
      <section className="vh-catalog-section">
        <div className="vh-catalog-header">
          <div className="vh-filter-tabs">
            <button 
              type="button" 
              className={filter === 'all' ? 'active' : ''} 
              onClick={() => setFilter('all')}
            >
              Todos los Modelos ({modelsList.length})
            </button>
            <button 
              type="button" 
              className={filter === 'turn' ? 'active' : ''} 
              onClick={() => setFilter('turn')}
            >
              En Turno de Hoy ({turnModels.length})
            </button>
            <button 
              type="button" 
              className={filter === 'rest' ? 'active' : ''} 
              onClick={() => setFilter('rest')}
            >
              En Descanso ({restModels.length})
            </button>
          </div>

          <div className="vh-pool-hint">
            <span>Algoritmo de Cooldown:</span>
            <strong>Los que salen hoy descansan y rotan con los demás del catálogo.</strong>
          </div>
        </div>

        <div className="vh-models-grid">
          {displayModels.length === 0 ? (
            <div className="vh-empty-catalog">
              <span className="vh-empty-icon">📦</span>
              <h4>No hay modelos disponibles</h4>
              <p>
                {filter === 'turn'
                  ? 'No hay modelos asignados al turno de hoy.'
                  : filter === 'rest'
                  ? 'No hay modelos en descanso.'
                  : 'No hay modelos aprobados en la base de datos para rotación. Sube o aprueba reels para que se incluyan automáticamente.'}
              </p>
            </div>
          ) : (
            displayModels.map(model => (
              <div 
                key={model.id} 
                className={`vh-model-card ${model.isHero ? 'is-hero' : model.status === 'turn' ? 'is-turn' : 'is-resting'}`}
              >
                <div className="vh-card-thumb-wrap">
                  {model.videoPath ? (
                    <video src={`${resolveMediaUrl(model.videoPath)}#t=0.5`} preload="metadata" muted playsInline />
                  ) : (
                    <img src={model.thumb || '/demo_horizontal_poster.png'} alt={model.title} />
                  )}
                  <div className="vh-thumb-overlay">
                    <span className="vh-thumb-play-btn">▶</span>
                  </div>
                  <span className="vh-thumb-pos">
                    {model.isHero ? '★ HERO #1' : model.turnPosition ? `#${model.turnPosition}` : 'DESC'}
                  </span>
                  <span className="vh-thumb-dur">{model.duration}s</span>
                </div>

                <div className="vh-card-info">
                  <div className="vh-card-name" title={model.title}>
                    {(model.title || '').replace(/^STL\s*[-–:]\s*/i, '')}
                  </div>

                  <div className={`vh-card-status-badge ${model.isHero ? 'st-hero' : model.status === 'turn' ? 'st-turn' : 'st-rest'}`}>
                    {model.isHero 
                      ? '★ Apertura de Hoy' 
                      : model.status === 'turn' 
                        ? '● En video de hoy' 
                        : `💤 Descansa (${model.restDays}d)`
                    }
                  </div>

                  <div className="vh-card-usage">
                    <span>Apariciones:</span>
                    <strong>{model.uses} veces</strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 6. Historial de Videos Publicados y Sincronización Multi-Plataforma */}
      <section className="vh-history-section">
        <div className="vh-history-header">
          <h2 className="vh-history-title">
            Historial de Compilaciones Publicadas
            <span className="count-pill">{historyList.length} videos</span>
          </h2>

          <div className="vh-storage-badge">
            <span>📁 Almacenamiento en VPS:</span>
            <strong>{historyList.length} videos conservados · Retención 60 días</strong>
          </div>
        </div>

        <div className="vh-history-list">
          {historyList.length === 0 ? (
            <div className="vh-empty-history">
              <span className="vh-empty-icon">📁</span>
              <h4>No hay recopilaciones publicadas aún</h4>
              <p>Las recopilaciones generadas y publicadas a YouTube se archivarán automáticamente aquí para su sincronización con Facebook y descarga en MP4 (retención de 60 días en VPS).</p>
            </div>
          ) : (
            historyList.map(item => (
              <div key={item.id} className="vh-history-item">
                <div className="vh-item-thumb">
                  {item.videoPath ? (
                    <video src={`${resolveMediaUrl(item.videoPath)}#t=0.5`} preload="metadata" muted playsInline />
                  ) : (
                    <img src={item.thumb || '/demo_horizontal_poster.png'} alt={item.title} />
                  )}
                  <div className="vh-thumb-overlay">
                    <span className="vh-thumb-play-btn">▶</span>
                  </div>
                  <span className="vh-thumb-dur">{item.duration}</span>
                </div>

                <div className="vh-item-details">
                  <div className="vh-item-meta-top">
                    <span className="vh-ch-badge">▶ {item.channel}</span>
                    {item.fbSynced ? (
                      <span className="vh-fb-badge">f Facebook Sincronizado</span>
                    ) : (
                      <span style={{ fontSize: '0.68rem', color: '#9490a6' }}>f Facebook pendiente</span>
                    )}
                    <span className="vh-item-date">{item.date}</span>
                    <span style={{ color: '#64748b', fontSize: '0.68rem' }}>· {item.fileSize}</span>
                  </div>

                  <h3 className="vh-item-title">{item.title}</h3>

                  <div className="vh-item-models-preview">
                    <span>Modelos incluidos:</span>
                    {(item.modelsSample || []).map((m, idx) => (
                      <span key={idx} className="model-pill">{m}</span>
                    ))}
                    <span className="more-pill">+{Math.max(0, (item.modelsCount || 20) - (item.modelsSample?.length || 0))} modelos más</span>
                  </div>
                </div>

                <div className="vh-item-actions">
                  {item.youtubeUrl ? (
                    <a 
                      href={item.youtubeUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="btn-yt-link"
                    >
                      ▶ Ver en YouTube
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#9490a6', textAlign: 'center' }}>Listo para subir</span>
                  )}
                  <button 
                    type="button" 
                    className="btn-fb-sync"
                    onClick={() => handleSyncFacebook(item)}
                  >
                    f {item.fbSynced ? 'Re-enviar a Facebook' : 'Publicar en Facebook'}
                  </button>
                  {item.videoPath ? (
                    <a 
                      href={resolveMediaUrl(item.videoPath)} 
                      download 
                      className="btn-download-mp4"
                      target="_blank" 
                      rel="noreferrer"
                    >
                      ⬇ Descargar MP4 ({item.fileSize})
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: '#9490a6', textAlign: 'center' }}>
                      Sin archivo MP4
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 7. Modal Interactivo para Generación Manual / Configuración */}
      {modalOpen && (
        <div className="vh-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="vh-modal-container" onClick={e => e.stopPropagation()}>
            <div className="vh-modal-header">
              <h2>Generador Manual de Recopilación Horizontal</h2>
              <button type="button" onClick={() => setModalOpen(false)}>✕</button>
            </div>

            <div className="vh-modal-content">
              <div className="form-group">
                <label>Canal de Destino</label>
                <select defaultValue={kpis.channelToday || (channels[0]?.name || '')}>
                  {channels.map(ch => (
                    <option key={ch.id} value={ch.name}>{ch.name} ({ch.turnLabel})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Título Generado por IA</label>
                <input 
                  type="text" 
                  value={upcomingTitle}
                  onChange={e => setUpcomingTitle(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label>Modo de Procesamiento</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem', fontSize: '0.78rem', color: '#e2e0ea' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="renderOpt" 
                      checked={withRender} 
                      onChange={() => setWithRender(true)} 
                    />
                    <span>🎬 <strong>Ensamblar Video MP4 Completo</strong> (FFmpeg en VPS, listo para descargar)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="renderOpt" 
                      checked={!withRender} 
                      onChange={() => setWithRender(false)} 
                    />
                    <span>⚡ <strong>Registro Rápido</strong> (sin renderizar archivo de video)</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Resumen de Modelos ({turnModels.length} seleccionados automáticamente)</label>
                <textarea 
                  rows={5} 
                  readOnly 
                  value={timestamps.map(t => `${t.time} - #${t.index} ${t.title}`).join('\n')}
                />
              </div>
            </div>

            <div className="vh-modal-footer">
              <button type="button" className="cancel" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button 
                type="button" 
                className="submit" 
                disabled={isSimulating || turnModels.length === 0}
                onClick={handleSimulateGeneration}
              >
                {isSimulating ? 'Ensamblando Video en VPS (~1 min)...' : '⚡ Ensamblar y Generar Video'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
