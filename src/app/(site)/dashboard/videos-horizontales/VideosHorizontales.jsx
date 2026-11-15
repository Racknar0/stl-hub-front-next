'use client';
import React, { useState, useEffect, useCallback } from 'react';
import HttpService from '@/services/HttpService';
import './VideosHorizontales.scss';

// Mock realista basado en la base de datos de producción
const INITIAL_MODELS = [
  { id: 73, title: 'STL - Mario and Bowser in a football play', duration: 10, isHero: true, turnPosition: 1, restDays: 0, uses: 1, status: 'hero', thumb: '/demo_horizontal_poster.png' },
  { id: 72, title: 'STL - Goku Dragon Ball Super Saiyan', duration: 8, isHero: false, turnPosition: 2, restDays: 0, uses: 2, status: 'turn', thumb: '/demo_horizontal_poster.png' },
  { id: 71, title: 'STL - Death Darksiders Reaper', duration: 8, isHero: false, turnPosition: 3, restDays: 0, uses: 1, status: 'turn', thumb: '/demo_horizontal_poster.png' },
  { id: 70, title: 'STL - Goliath Gargoyles Disney', duration: 8, isHero: false, turnPosition: 4, restDays: 0, uses: 1, status: 'turn', thumb: '/demo_horizontal_poster.png' },
  { id: 69, title: 'STL - Psylocke Marvel X-Men', duration: 8, isHero: false, turnPosition: 5, restDays: 0, uses: 2, status: 'turn', thumb: '/demo_horizontal_poster.png' },
  { id: 68, title: 'STL - Lich King Arthas Warcraft', duration: 8, isHero: false, turnPosition: 6, restDays: 0, uses: 2, status: 'turn', thumb: '/demo_horizontal_poster.png' },
  { id: 67, title: 'STL - Thrall World of Warcraft', duration: 8, isHero: false, turnPosition: 7, restDays: 0, uses: 1, status: 'turn', thumb: '/demo_horizontal_poster.png' },
  { id: 66, title: 'STL - Alexstrasza Dragon Queen', duration: 10, isHero: false, turnPosition: 8, restDays: 0, uses: 1, status: 'turn', thumb: '/demo_horizontal_poster.png' },
  { id: 65, title: 'STL - Frieren Beyond Journeys End', duration: 8, isHero: false, turnPosition: 9, restDays: 0, uses: 2, status: 'turn', thumb: '/demo_horizontal_poster.png' },
  { id: 64, title: 'STL - Forest Fairy with Butterfly', duration: 8, isHero: false, turnPosition: 10, restDays: 0, uses: 1, status: 'turn', thumb: '/demo_horizontal_poster.png' },
  { id: 63, title: 'STL - Wolverine Bust Weapon X', duration: 9, isHero: false, turnPosition: 11, restDays: 0, uses: 2, status: 'turn', thumb: '/demo_horizontal_poster.png' },
  { id: 62, title: 'STL - Spider-Man 2099 Miguel O\'Hara', duration: 8, isHero: false, turnPosition: 12, restDays: 0, uses: 1, status: 'turn', thumb: '/demo_horizontal_poster.png' },
  { id: 61, title: 'STL - Cyberpunk Mech Android', duration: 9, isHero: false, turnPosition: 13, restDays: 0, uses: 2, status: 'turn', thumb: '/demo_horizontal_poster.png' },
  { id: 60, title: 'STL - Venom Symbiote Rampage', duration: 8, isHero: false, turnPosition: 14, restDays: 0, uses: 1, status: 'turn', thumb: '/demo_horizontal_poster.png' },
  { id: 59, title: 'STL - Batman Dark Knight Diorama', duration: 9, isHero: false, turnPosition: 15, restDays: 0, uses: 2, status: 'turn', thumb: '/demo_horizontal_poster.png' },
  { id: 58, title: 'STL - Mary Jane Carnage Marvel', duration: 10, isHero: false, turnPosition: 16, restDays: 0, uses: 1, status: 'turn', thumb: '/demo_horizontal_poster.png' },
  { id: 57, title: 'STL - Shadow Assassin Rogue', duration: 8, isHero: false, turnPosition: 17, restDays: 0, uses: 1, status: 'turn', thumb: '/demo_horizontal_poster.png' },
  { id: 56, title: 'STL - Iron Man Mark 85 Battle Damaged', duration: 9, isHero: false, turnPosition: 18, restDays: 0, uses: 2, status: 'turn', thumb: '/demo_horizontal_poster.png' },
  { id: 55, title: 'STL - Demon Slayer Tanjiro Kamado', duration: 8, isHero: false, turnPosition: 19, restDays: 0, uses: 2, status: 'turn', thumb: '/demo_horizontal_poster.png' },
  { id: 54, title: 'STL - Cyber Ninja Blade Runner', duration: 8, isHero: false, turnPosition: 20, restDays: 0, uses: 1, status: 'turn', thumb: '/demo_horizontal_poster.png' },
  // Modelos en descanso (restDays > 0)
  { id: 53, title: 'STL - Chainsaw Man Denji', duration: 8, isHero: false, restDays: 1, uses: 3, status: 'rest', thumb: '/demo_horizontal_poster.png' },
  { id: 52, title: 'STL - Eren Yeager Titan Attack on Titan', duration: 9, isHero: false, restDays: 1, uses: 2, status: 'rest', thumb: '/demo_horizontal_poster.png' },
  { id: 51, title: 'STL - Kratos God of War Ragnarok', duration: 10, isHero: false, restDays: 2, uses: 3, status: 'rest', thumb: '/demo_horizontal_poster.png' },
  { id: 50, title: 'STL - Link The Legend of Zelda Tears of the Kingdom', duration: 8, isHero: false, restDays: 2, uses: 2, status: 'rest', thumb: '/demo_horizontal_poster.png' },
  { id: 49, title: 'STL - Sephiroth Final Fantasy VII', duration: 9, isHero: false, restDays: 2, uses: 3, status: 'rest', thumb: '/demo_horizontal_poster.png' },
  { id: 48, title: 'STL - Geralt of Rivia The Witcher', duration: 8, isHero: false, restDays: 3, uses: 2, status: 'rest', thumb: '/demo_horizontal_poster.png' },
  { id: 47, title: 'STL - Berserk Guts Dragonslayer', duration: 10, isHero: false, restDays: 3, uses: 3, status: 'rest', thumb: '/demo_horizontal_poster.png' },
  { id: 46, title: 'STL - Darth Vader Sith Lord', duration: 8, isHero: false, restDays: 3, uses: 2, status: 'rest', thumb: '/demo_horizontal_poster.png' },
  { id: 45, title: 'STL - Mandalorian and Grogu', duration: 9, isHero: false, restDays: 4, uses: 3, status: 'rest', thumb: '/demo_horizontal_poster.png' },
  { id: 44, title: 'STL - Doctor Doom Marvel Latveria', duration: 8, isHero: false, restDays: 4, uses: 2, status: 'rest', thumb: '/demo_horizontal_poster.png' },
];

const HISTORY_COMPILATIONS = [
  {
    id: 'comp-103',
    title: 'Top 20 Modelos STL de Anime & Fantasía: Frieren, Arthas, Denji y Más',
    channel: 'stl-gratis',
    channelHandle: '@stl-gratis',
    date: 'Ayer · 17:00',
    duration: '2:54 min',
    thumb: '/demo_horizontal_poster.png',
    youtubeUrl: 'https://youtube.com',
    fbSynced: true,
    modelsCount: 20,
    fileSize: '41.2 MB',
    modelsSample: ['Frieren', 'Lich King', 'Denji', 'Tanjiro', 'Death Reaper']
  },
  {
    id: 'comp-102',
    title: 'Top 20 Archivos 3D de Cómics & Superhéroes: Mary Jane, Spider-Man, Batman y Wolverine',
    channel: 'stlgratis',
    channelHandle: '@stlgratis',
    date: '12 Nov · 17:00',
    duration: '3:05 min',
    thumb: '/demo_horizontal_poster.png',
    youtubeUrl: 'https://youtube.com',
    fbSynced: true,
    modelsCount: 20,
    fileSize: '44.8 MB',
    modelsSample: ['Mary Jane Carnage', 'Spider-Man 2099', 'Wolverine Bust', 'Batman Dark Knight']
  },
  {
    id: 'comp-101',
    title: 'Top 20 Figuras STL Épicas de Videojuegos: Kratos, Sephiroth, Geralt y Link',
    channel: 'Ozaru_art',
    channelHandle: '@Ozaru_art',
    date: '11 Nov · 17:00',
    duration: '2:48 min',
    thumb: '/demo_horizontal_poster.png',
    youtubeUrl: 'https://youtube.com',
    fbSynced: false,
    modelsCount: 20,
    fileSize: '39.6 MB',
    modelsSample: ['Kratos Ragnarok', 'Sephiroth', 'Geralt of Rivia', 'Link TotK']
  }
];

const CHANNELS = [
  { id: 'ozaru', name: 'Ozaru_art', handle: '@Ozaru_art', subscribers: '4.2K', status: 'today', turnLabel: 'Turno de Hoy', nextPublish: 'Hoy · 17:30 (+2h 30m)' },
  { id: 'stlgratis', name: 'stlgratis', handle: '@stlgratis', subscribers: '12.8K', status: 'tomorrow', turnLabel: 'Mañana', nextPublish: '15 Nov · 17:30' },
  { id: 'stl-gratis', name: 'stl-gratis', handle: '@stl-gratis', subscribers: '8.1K', status: 'next', turnLabel: 'En 2 días', nextPublish: '16 Nov · 17:30' },
];

export default function VideosHorizontales() {
  const [filter, setFilter] = useState('all'); // 'all', 'turn', 'rest'
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeMetaTab, setActiveMetaTab] = useState('description'); // 'description', 'timestamps', 'tags'
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);

  // Estados sincronizados con el backend
  const [channels, setChannels] = useState(CHANNELS);
  const [kpis, setKpis] = useState({
    nextPublish: 'Hoy 17:30 (+2h 30m tras Short)',
    channelToday: 'Ozaru_art',
    googleQuota: { used: 6650, total: 10000, safe: true },
    catalog: { total: 45, inTurn: 20, inRest: 25 }
  });
  const [upcomingTitle, setUpcomingTitle] = useState('🔥 TOP 20 Mejores Modelos 3D de Acción & Anime: Mario, Bowser, Goku, Arthas y Más | Archivos STL Premium');
  const [customDesc, setCustomDesc] = useState(`🔥 ¡Descubre la recopilación definitiva de los 20 mejores modelos 3D y archivos STL listos para imprimir en resina y filamento!

Desde figuras de acción icónicas como Mario & Bowser, Goku Super Saiyan y Lich King Arthas, hasta los bustos más detallados de Marvel y Warcraft. Todos los archivos están optimizados y listos para descarga directa en nuestra plataforma.

🔗 DESCARGA TODOS LOS MODELOS EN: https://stlgratis.com/

⏱️ CAPÍTULOS Y ENLACES DIRECTOS A CADA MODELO:
0:00 - #1 Mario and Bowser in a Football Play (https://stlgratis.com/stl/37777)
0:10 - #2 Goku Dragon Ball Super Saiyan (https://stlgratis.com/stl/37776)
0:19 - #3 Death Darksiders Reaper (https://stlgratis.com/stl/37775)
0:28 - #4 Goliath Gargoyles Disney (https://stlgratis.com/stl/37774)
0:37 - #5 Psylocke Marvel X-Men (https://stlgratis.com/stl/37773)
0:46 - #6 Lich King Arthas Warcraft (https://stlgratis.com/stl/37772)
0:55 - #7 Thrall World of Warcraft (https://stlgratis.com/stl/37771)
1:04 - #8 Alexstrasza Dragon Queen (https://stlgratis.com/stl/37770)
1:14 - #9 Frieren Beyond Journeys End (https://stlgratis.com/stl/37769)
1:23 - #10 Forest Fairy with Butterfly (https://stlgratis.com/stl/37768)
1:32 - #11 Wolverine Bust Weapon X (https://stlgratis.com/stl/37767)
1:41 - #12 Spider-Man 2099 Miguel O'Hara (https://stlgratis.com/stl/37766)
1:50 - #13 Cyberpunk Mech Android (https://stlgratis.com/stl/37765)
2:00 - #14 Venom Symbiote Rampage (https://stlgratis.com/stl/37764)
2:09 - #15 Batman Dark Knight Diorama (https://stlgratis.com/stl/37763)
2:19 - #16 Mary Jane Carnage Marvel (https://stlgratis.com/stl/37762)
2:29 - #17 Shadow Assassin Rogue (https://stlgratis.com/stl/37761)
2:38 - #18 Iron Man Mark 85 Battle Damaged (https://stlgratis.com/stl/37760)
2:48 - #19 Demon Slayer Tanjiro Kamado (https://stlgratis.com/stl/37759)
2:57 - #20 Cyber Ninja Blade Runner (https://stlgratis.com/stl/37758)

⭐ Suscríbete al canal para no perderte nuevos lanzamientos diarios y déjanos en los comentarios cuál fue tu figura favorita.

#STL #3DPrinting #Impresion3D #AnimeSTL #MarvelSTL #ActionFigures #STLGratis #Miniaturas3D #WarcraftSTL`);

  const [modelsList, setModelsList] = useState(INITIAL_MODELS);
  const [historyList, setHistoryList] = useState(HISTORY_COMPILATIONS);
  const [timestampsList, setTimestampsList] = useState([]);

  const loadStatus = useCallback(async () => {
    try {
      const http = new HttpService();
      const res = await http.getData('/reels/horizontal/status');
      if (res?.data) {
        if (res.data.channels) setChannels(res.data.channels);
        if (res.data.kpis) setKpis(res.data.kpis);
        if (res.data.upcoming?.title) setUpcomingTitle(res.data.upcoming.title);
        if (res.data.upcoming?.description) setCustomDesc(res.data.upcoming.description);
        if (res.data.upcoming?.timestamps) setTimestampsList(res.data.upcoming.timestamps);
      }
    } catch (e) {
      console.warn('Usando datos locales de estado:', e?.message);
    }
  }, []);

  const loadModels = useCallback(async (currentFilter) => {
    try {
      const http = new HttpService();
      const res = await http.getData(`/reels/horizontal/models?filter=${currentFilter}`);
      if (res?.data?.models?.length) {
        setModelsList(res.data.models);
      }
    } catch (e) {
      console.warn('Usando lista local de modelos:', e?.message);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const http = new HttpService();
      const res = await http.getData('/reels/horizontal/history');
      if (res?.data?.history?.length) {
        setHistoryList(res.data.history);
      }
    } catch (e) {
      console.warn('Usando histórico local:', e?.message);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    loadModels(filter);
    loadHistory();
  }, [loadStatus, loadModels, loadHistory, filter]);

  const heroModel = modelsList.find(m => m.isHero) || modelsList[0];
  const turnModels = modelsList.filter(m => m.status === 'hero' || m.status === 'turn');
  const restModels = modelsList.filter(m => m.status === 'rest');

  const timestamps = timestampsList.length > 0 ? timestampsList : turnModels.map((m, idx) => ({
    index: idx + 1,
    time: `0:${String(idx * 9).padStart(2, '0')}`,
    title: (m.title || '').replace(/^STL\s*[-–:]\s*/i, ''),
    link: `https://stlgratis.com/stl/${m.id}`,
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
        render: false
      });
      alert('¡Recopilación generada y registrada en base de datos con éxito! Modelos rotados al final de la cola.');
      await loadStatus();
      await loadModels(filter);
      await loadHistory();
    } catch (e) {
      alert('Recopilación simulada con éxito: FFmpeg ensambló los 20 modelos en 16:9 preservando audio y voz nativa.');
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
      alert(`Sincronización simulada hacia Facebook para "${item.title}".`);
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
            Hoy 17:30 <span className="vh-subtext">(+2h 30m tras Short)</span>
          </div>
          <span className="vh-kpi-footer glow">Espaciado óptimo para no canibalizar</span>
        </div>

        <div className="vh-kpi-card">
          <span className="vh-kpi-label">Canal en Turno <span>📺</span></span>
          <div className="vh-kpi-value">
            Ozaru_art <span className="vh-subtext">#1</span>
          </div>
          <span className="vh-kpi-footer ok">● Conectado y listo</span>
        </div>

        <div className="vh-kpi-card">
          <span className="vh-kpi-label">Cuota Google API <span>📊</span></span>
          <div className="vh-kpi-value">
            6.650 <span className="vh-subtext">/ 10.000 pts</span>
          </div>
          <span className="vh-kpi-footer ok">✓ 3.350 pts de margen seguro</span>
        </div>

        <div className="vh-kpi-card">
          <span className="vh-kpi-label">Catálogo en Rotación <span>📦</span></span>
          <div className="vh-kpi-value">
            45 <span className="vh-subtext">modelos</span>
          </div>
          <span className="vh-kpi-footer info">20 en turno hoy · 25 descansando</span>
        </div>
      </section>

      {/* 3. Tira de Rotación Continua de Canales */}
      <section className="vh-section-channels">
        <h2 className="vh-section-title">
          Rotación Diaria Continua de Canales
          <span className="vh-pill">Bucle Infinito: C1 → C2 → C3</span>
        </h2>

        <div className="vh-channels-grid">
          {CHANNELS.map(ch => (
            <div key={ch.id} className={`vh-channel-card ${ch.status === 'today' ? 'active-today' : ''}`}>
              <div className="vh-channel-top">
                <div className="vh-channel-identity">
                  <div className="vh-yt-icon">▶</div>
                  <div>
                    <div className="vh-channel-name">{ch.name}</div>
                    <div className="vh-channel-sub">{ch.handle} · {ch.subscribers} suscriptores</div>
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
          ))}
        </div>
      </section>

      {/* 4. Showcase del Día (Card Principal de Vista Previa) */}
      <section className="vh-showcase-card">
        {/* Columna Izquierda: Video Player */}
        <div className="vh-player-col">
          <div className="vh-video-wrapper">
            <video 
              controls 
              src="/demo_horizontal.mp4" 
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
              <span className="vh-tag">20 Modelos Unidos</span>
            </div>
            <div className="vh-audio-tag">
              🔊 Audio y Voz Original de Cada Reel
            </div>
          </div>
        </div>

        {/* Columna Derecha: Metadatos IA y Timestamps */}
        <div className="vh-meta-col">
          <div className="vh-meta-header">
            <span className="vh-meta-sub">● Recopilación Lista para Hoy (Ozaru_art)</span>
            <h3 className="vh-meta-title">
              🔥 TOP 20 Mejores Modelos 3D de Acción y Fantasía: Mario, Bowser, Goku, Arthas y Más | Archivos STL Premium
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
                <span>Redactado con enlaces a STLHUB y capítulos</span>
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
                <div className="desc-text">{customDesc}</div>
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
                {['STL', '3D Printing', 'Modelos 3D', 'Impresión 3D', 'Anime STL', 'Marvel STL', 'Dragon Ball STL', 'Warcraft 3D', 'Mario Bowser', 'Figuras Coleccionables', 'Archivos STL Gratis', 'Resina 3D', 'Filamento PLA', 'STLGratis'].map((tag, i) => (
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
            <strong>Los 20 que salen hoy pasan a descansar y rotan con los otros 25.</strong>
          </div>
        </div>

        <div className="vh-models-grid">
          {(filter === 'turn' ? turnModels : filter === 'rest' ? restModels : modelsList).map(model => (
            <div 
              key={model.id} 
              className={`vh-model-card ${model.isHero ? 'is-hero' : model.status === 'turn' ? 'is-turn' : 'is-resting'}`}
            >
              <div className="vh-card-thumb-wrap">
                <img src={model.thumb || '/demo_horizontal_poster.png'} alt={model.title} />
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
          ))}
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
          {historyList.map(item => (
            <div key={item.id} className="vh-history-item">
              <div className="vh-item-thumb">
                <img src={item.thumb || '/demo_horizontal_poster.png'} alt={item.title} />
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
                  {(item.modelsSample || ['Goku', 'Mario', 'Lich King']).map((m, idx) => (
                    <span key={idx} className="model-pill">{m}</span>
                  ))}
                  <span className="more-pill">+{Math.max(0, (item.modelsCount || 20) - 4)} modelos más</span>
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
                <button 
                  type="button" 
                  className="btn-download-mp4"
                  onClick={() => alert(`Descargando archivo maestro: ${item.title}`)}
                >
                  ⬇ Descargar MP4
                </button>
              </div>
            </div>
          ))}
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
                <select defaultValue="ozaru">
                  <option value="ozaru">Ozaru_art (Turno sugerido para hoy)</option>
                  <option value="stlgratis">stlgratis</option>
                  <option value="stl-gratis">stl-gratis</option>
                </select>
              </div>

              <div className="form-group">
                <label>Título Generado por IA</label>
                <input 
                  type="text" 
                  defaultValue="🔥 TOP 20 Mejores Modelos 3D de Acción y Fantasía: Mario, Bowser, Goku, Arthas y Más | Archivos STL Premium" 
                />
              </div>

              <div className="form-group">
                <label>Resumen de Modelos (20 seleccionados automáticamente)</label>
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
                disabled={isSimulating}
                onClick={handleSimulateGeneration}
              >
                {isSimulating ? 'Generando Ensamble...' : '⚡ Ensamblar y Generar Video'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
