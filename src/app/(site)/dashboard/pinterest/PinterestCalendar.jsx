'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import HttpService from '@/services/HttpService';
import './PinterestCalendar.scss';

const MAX_PINS_PER_DAY = 15;
function getUploadBase() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      return 'https://api.stl-hub.com/uploads';
    }
  }
  return process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads';
}

function resolveImgUrl(img) {
  if (!img) return '';
  
  const uploadBase = getUploadBase();
  
  if (img.startsWith('http')) {
    if (img.includes('/uploads/')) {
      const parts = img.split('/uploads/');
      if (parts.length > 1) {
        return `${uploadBase}/${parts[1]}`;
      }
    }
    return img;
  }
  
  const clean = String(img).replace(/^\\+|^\/+/, '');
  return `${uploadBase}/${clean}`;
}

export default function PinterestCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [panelMode, setPanelMode] = useState('list'); // 'list' | 'create'
  const [searchType, setSearchType] = useState('id'); // 'id' | 'semantic'
  const [trendKeyword, setTrendKeyword] = useState('');
  const [idChips, setIdChips] = useState([]);
  const [idInput, setIdInput] = useState('');

  // Day pins list
  const [dayPins, setDayPins] = useState([]);
  const [loadingDayPins, setLoadingDayPins] = useState(false);
  const [expandedPinId, setExpandedPinId] = useState(null);
  const [editPin, setEditPin] = useState({});
  const [isSavingPin, setIsSavingPin] = useState(false);

  // === BULK CREATE STATE ===
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedAssets, setSearchedAssets] = useState([]); // array of assets
  // selectedPins: array of { key, assetId, assetData, imageUrl, pinTitle, pinDescription, pinLink, pinHashtags, boardId }
  const [selectedPins, setSelectedPins] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [optimizedAssets, setOptimizedAssets] = useState([]);
  const [expandedAssetId, setExpandedAssetId] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(null); // assetId being optimized
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [filters, setFilters] = useState({ flip: true, zoom: true });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  // CropperJS editor
  const [editingImage, setEditingImage] = useState(null); // { assetId, imageUrl, key }
  const [editedImages, setEditedImages] = useState({}); // key -> dataURL (visual)
  const [croppedUrls, setCroppedUrls] = useState({}); // key -> server-side relative path
  const cropperRef = useRef(null);
  const cropperInstanceRef = useRef(null);
  const lastDayRef = useRef(null);

  // Destroy cropper when editor closes
  useEffect(() => {
    if (!editingImage) {
      if (cropperInstanceRef.current) { try { cropperInstanceRef.current.destroy(); } catch {} }
      cropperInstanceRef.current = null;
    }
  }, [editingImage]);

  // Stats + connection status
  const [stats, setStats] = useState({ published: 0, pending: 0, failed: 0 });
  const [pinterestStatus, setPinterestStatus] = useState({ connected: false, username: '' });

  useEffect(() => {
    const http = new HttpService();
    http.getData('/pinterest/stats').then(r => { if (r.data) setStats(r.data); }).catch(() => {});
    http.getData('/pinterest/connection-status').then(r => { if (r.data) setPinterestStatus(r.data); }).catch(() => {});
  }, []);

  const handleDisconnect = async (e) => {
    e.stopPropagation();
    if (!confirm('¿Desconectar tu cuenta de Pinterest?')) return;
    try {
      const http = new HttpService();
      await http.postData('/pinterest/disconnect');
      setPinterestStatus({ connected: false, username: '' });
    } catch (err) {
      alert('Error al desconectar: ' + err.message);
    }
  };

  // Calendar
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // Calendar stats
  const [pinsByDay, setPinsByDay] = useState({});
  const fetchPinStats = useCallback(async () => {
    try {
      const http = new HttpService();
      const res = await http.getData(`/pinterest/queue-stats?year=${currentDate.getFullYear()}&month=${currentDate.getMonth()}`);
      setPinsByDay(res.data?.pinsByDay || {});
    } catch { setPinsByDay({}); }
  }, [currentDate]);
  useEffect(() => { fetchPinStats(); }, [fetchPinStats]);

  const today = new Date();
  const isSelectedDayPast = selectedDay
    ? new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay) < new Date(today.getFullYear(), today.getMonth(), today.getDate())
    : false;

  // Fetch pins for selected day
  const fetchDayPins = useCallback(async () => {
    if (!selectedDay) return;
    setLoadingDayPins(true);
    try {
      const http = new HttpService();
      const res = await http.getData(`/pinterest/queue-day?year=${currentDate.getFullYear()}&month=${currentDate.getMonth()}&day=${selectedDay}`);
      setDayPins(res.data?.pins || []);
    } catch { setDayPins([]); }
    finally { setLoadingDayPins(false); }
  }, [selectedDay, currentDate]);
  useEffect(() => { if (selectedDay) fetchDayPins(); }, [selectedDay, fetchDayPins]);

  const handleDayClick = (day) => {
    const isSameDay = lastDayRef.current === day;
    let willKeepSelections = selectedPins.length > 0;

    if (!isSameDay && selectedPins.length > 0) {
      const keepSelections = confirm(`Tienes ${selectedPins.length} pines seleccionados en la cola de creación. ¿Deseas conservarlos para programarlos en el día ${day}? (Cancelar descartará estos pines y abrirá el listado del día ${day})`);
      if (!keepSelections) {
        setSelectedPins([]);
        setSelectedAssets([]);
        setOptimizedAssets([]);
        setSearchedAssets([]);
        setSearchQuery('');
        setIdChips([]);
        setIdInput('');
        willKeepSelections = false;
      }
    }

    lastDayRef.current = day;
    setSelectedDay(day);
    setPanelMode(willKeepSelections ? 'create' : 'list');
  };

  // Delete pin
  const handleDeletePin = async (pinId) => {
    if (!confirm('¿Eliminar este pin?')) return;
    try {
      const http = new HttpService();
      await http.deleteData('/pinterest/queue', pinId);
      fetchDayPins();
      fetchPinStats();
    } catch (e) { alert('Error: ' + e.message); }
  };

  // Update pin
  const handleUpdatePin = async (pinId) => {
    setIsSavingPin(true);
    try {
      const http = new HttpService();
      await http.putData('/pinterest/queue', pinId, editPin);
      fetchDayPins();
      setExpandedPinId(null);
    } catch (e) { alert('Error: ' + (e?.response?.data?.error || e.message)); }
    finally { setIsSavingPin(false); }
  };

  // === CHIPS LOGIC ===
  const addIdFromInput = () => {
    const val = idInput.trim();
    if (!val) return;
    
    // Si contiene múltiples números separados por comas o espacios
    const parts = val.split(/[\s,]+/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    
    if (parts.length > 0) {
      setIdChips(prev => {
        const next = [...prev];
        parts.forEach(num => {
          if (!next.includes(num)) next.push(num);
        });
        return next;
      });
      setIdInput('');
    }
  };

  const handleIdInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addIdFromInput();
    } else if (e.key === 'Backspace' && !idInput && idChips.length > 0) {
      setIdChips(prev => prev.slice(0, -1));
    }
  };

  const removeIdChip = (idToRemove) => {
    setIdChips(prev => prev.filter(id => id !== idToRemove));
  };

  // === BULK SEARCH ===
  const handleBulkSearch = async () => {
    try {
      const http = new HttpService();
      if (searchType === 'semantic') {
        if (!searchQuery.trim()) return;
        const res = await http.getData(`/pinterest/search-assets?q=${encodeURIComponent(searchQuery)}&mode=semantic`);
        if (res.data?.found && res.data.assets?.length > 0) {
          setSearchedAssets(res.data.assets);
          setTrendKeyword(searchQuery.trim()); // Establecemos la tendencia asociada
        } else {
          alert('No se encontraron assets relacionados con este concepto/tendencia.');
          setSearchedAssets([]);
        }
      } else {
        // En búsqueda por ID, si hay algo a medio escribir en el input, lo procesamos primero
        let activeChips = [...idChips];
        const val = idInput.trim();
        if (val) {
          const parts = val.split(/[\s,]+/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
          parts.forEach(num => {
            if (!activeChips.includes(num)) activeChips.push(num);
          });
          setIdChips(activeChips);
          setIdInput('');
        }

        if (activeChips.length === 0) {
          alert('Ingresa al menos un ID de Pin.');
          return;
        }

        const q = activeChips.join(',');
        const res = await http.getData(`/pinterest/search-assets?q=${encodeURIComponent(q)}&mode=id`);
        if (res.data?.found && res.data.assets?.length > 0) {
          setSearchedAssets(res.data.assets);
          setTrendKeyword(''); // Sin tendencia para búsquedas por ID normales
        } else {
          alert('No se encontraron assets para los IDs especificados.');
          setSearchedAssets([]);
        }
      }
    } catch (e) { alert('Error: ' + e.message); }
  };

  // Toggle image selection
  const togglePin = (asset, imgUrl) => {
    const key = `${asset.id}_${imgUrl}`;
    const exists = selectedPins.find(p => p.key === key);
    if (exists) {
      const newPins = selectedPins.filter(p => p.key !== key);
      setSelectedPins(newPins);
      
      const hasOtherPins = newPins.some(p => p.assetId === asset.id);
      if (!hasOtherPins) {
        setSelectedAssets(prev => prev.filter(a => a.id !== asset.id));
        setOptimizedAssets(prev => prev.filter(id => id !== asset.id));
      }
    } else {
      if (selectedPins.length >= MAX_PINS_PER_DAY) {
        alert(`Máximo ${MAX_PINS_PER_DAY} pines por día.`);
        return;
      }

      // Check if this asset has already been scheduled/published
      if (asset.queueEntries && asset.queueEntries.length > 0) {
        const published = asset.queueEntries.filter(qe => qe.status === 'PUBLISHED');
        const pending = asset.queueEntries.filter(qe => qe.status === 'PENDING');
        
        let msg = '';
        if (published.length > 0) {
          const dates = published.map(p => new Date(p.scheduledAt).toLocaleDateString('es')).join(', ');
          msg += `Este asset ya fue publicado en Pinterest el día: ${dates}.\n`;
        }
        if (pending.length > 0) {
          const dates = pending.map(p => new Date(p.scheduledAt).toLocaleDateString('es')).join(', ');
          msg += `Este asset ya está programado para el día: ${dates}.\n`;
        }
        
        if (msg) {
          alert(`⚠️ Alerta de Duplicación:\n${msg}`);
        }
      }

      setSelectedPins(prev => [...prev, {
        key,
        assetId: asset.id,
        imageUrl: croppedUrls[key] || imgUrl,
        pinTitle: asset.titleEn || asset.title || '',
        pinDescription: asset.descriptionEn || asset.description || '',
        pinLink: `https://stl-hub.com/en/asset/${asset.slug || asset.id}`,
        pinHashtags: [],
        boardId: 'auto',
      }]);
      setSelectedAssets(prev => {
        if (prev.some(a => a.id === asset.id)) return prev;
        return [...prev, asset];
      });
    }
  };

  // AI optimize per asset
  const handleAiOptimize = async (asset) => {
    const assetPins = selectedPins.filter(p => p.assetId === asset.id);
    if (assetPins.length === 0) { alert('Selecciona imágenes primero.'); return; }

    setIsOptimizing(asset.id);
    try {
      const http = new HttpService();
      const res = await http.postData('/pinterest/ai-optimize', {
        title: asset.titleEn || asset.title,
        description: asset.descriptionEn || asset.description,
        tags: asset.tags || [],
        category: asset.category || 'General',
        imageUrl: resolveImgUrl(assetPins[0]?.imageUrl),
        variationCount: assetPins.length,
        trendKeyword: trendKeyword || undefined, // Pasar la tendencia si existe
      });
      const variations = res.data?.variations || [];
      // Apply variations to pins of this asset
      setSelectedPins(prev => prev.map(pin => {
        if (pin.assetId !== asset.id) return pin;
        const idx = assetPins.findIndex(p => p.key === pin.key);
        const v = variations[idx] || variations[0] || {};
        return {
          ...pin,
          pinTitle: v.pinTitle || pin.pinTitle,
          pinDescription: v.pinDescription || pin.pinDescription,
          pinHashtags: v.pinHashtags || pin.pinHashtags,
        };
      }));
      setOptimizedAssets(prev => {
        if (prev.includes(asset.id)) return prev;
        return [...prev, asset.id];
      });
    } catch (e) { alert('Error AI: ' + (e?.response?.data?.error || e.message)); }
    finally { setIsOptimizing(null); }
  };

  // Update a specific pin field
  const updatePinField = (key, field, value) => {
    setSelectedPins(prev => prev.map(p => p.key === key ? { ...p, [field]: value } : p));
  };

  // Schedule all
  const handleScheduleAll = async () => {
    if (selectedPins.length === 0 || !selectedDay) return;
    setIsSubmitting(true);
    try {
      const http = new HttpService();

      const now = new Date();
      const isToday = selectedDay === now.getDate() && 
                      currentDate.getMonth() === now.getMonth() && 
                      currentDate.getFullYear() === now.getFullYear();

      let startTime;
      let windowMinutes;

      if (isToday) {
        // Start from current time + 10 minutes buffer
        startTime = new Date(now.getTime() + 10 * 60000);
        // Calculate remaining minutes until the end of today (11:59 PM)
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0);
        windowMinutes = Math.max(30, Math.floor((endOfDay.getTime() - startTime.getTime()) / 60000));
      } else {
        // Future day: start at 12:00 AM (midnight)
        startTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay, 0, 0, 0);
        windowMinutes = 1440; // 24 hours
      }

      const totalPins = selectedPins.length;
      const slotSize = windowMinutes / totalPins;

      // Generate randomized times within each slot
      const pinTimes = [];
      for (let i = 0; i < totalPins; i++) {
        const slotStart = i * slotSize;
        const minMargin = Math.min(5, Math.floor(slotSize / 3));
        const maxMargin = Math.max(1, Math.floor(slotSize - minMargin * 2));
        const jitter = Math.floor(Math.random() * maxMargin) + minMargin;
        pinTimes.push(new Date(startTime.getTime() + (slotStart + jitter) * 60000));
      }

      // Flatten all pins in order
      const allPins = [];
      const byAsset = {};
      selectedPins.forEach(p => {
        if (!byAsset[p.assetId]) byAsset[p.assetId] = [];
        byAsset[p.assetId].push(p);
      });
      for (const pins of Object.values(byAsset)) allPins.push(...pins);

      let totalQueued = 0;
      for (let i = 0; i < allPins.length; i++) {
        const pin = allPins[i];
        const assetId = pin.assetId;
          const hashtags = pin.pinHashtags.length > 0 ? '\n\n' + pin.pinHashtags.map(h => '#' + h).join(' ') : '';
          const finalImageUrl = croppedUrls[pin.key] || pin.imageUrl;
          const payload = {
            assetId: parseInt(assetId),
            images: [finalImageUrl],
            scheduledAt: pinTimes[i].toISOString(),
            boardId: pin.boardId || 'auto',
            title: pin.pinTitle,
            description: pin.pinDescription + hashtags,
            link: pin.pinLink,
            filters: { flip: filters.flip, zoom: filters.zoom ? 1.05 : 1 },
          };
          const res = await http.postData('/pinterest/schedule', payload);
          totalQueued += res.data?.queued || 0;
      }

      alert(`¡Éxito! ${totalQueued} pines programados.`);
      setSelectedPins([]);
      setSelectedAssets([]);
      setOptimizedAssets([]);
      setSearchedAssets([]);
      setPanelMode('list');
      fetchDayPins();
      fetchPinStats();
    } catch (e) { alert('Error: ' + e.message); }
    finally { setIsSubmitting(false); }
  };

  // Count selected per asset
  const countForAsset = (assetId) => selectedPins.filter(p => p.assetId === assetId).length;

  // Publish NOW (single pin test)
  const [isPublishingNow, setIsPublishingNow] = useState(false);
  const [isRetryingPin, setIsRetryingPin] = useState(false);

  const handlePublishNow = async () => {
    if (selectedPins.length !== 1) return;
    const pin = selectedPins[0];
    setIsPublishingNow(true);
    try {
      const http = new HttpService();
      const hashtags = pin.pinHashtags.length > 0 ? '\n\n' + pin.pinHashtags.map(h => '#' + h).join(' ') : '';
      const res = await http.postData('/pinterest/publish-now', {
        assetId: pin.assetId,
        imageUrl: croppedUrls[pin.key] || pin.imageUrl,
        title: pin.pinTitle,
        description: pin.pinDescription + hashtags,
        link: pin.pinLink,
        boardId: pin.boardId || 'auto',
        filters: { flip: filters.flip, zoom: filters.zoom ? 1.05 : 1 },
      });
      alert(`\u2705 Publicado! Pinterest ID: ${res.data?.pinId}\n${res.data?.url || ''}`);
      setSelectedPins([]);
      setSelectedAssets([]);
      setOptimizedAssets([]);
      setSearchedAssets([]);
      setPanelMode('list');
      fetchDayPins();
      fetchPinStats();
    } catch (e) {
      alert('\u274c Error: ' + (e?.response?.data?.error || e.message));
    } finally { setIsPublishingNow(false); }
  };

  const handleRetryPin = async (pinId) => {
    setIsRetryingPin(true);
    try {
      const http = new HttpService();
      await http.postData(`/pinterest/queue/retry/${pinId}`);
      alert('\u2705 ¡Pin publicado con éxito en Pinterest!');
      fetchDayPins();
      fetchPinStats();
      setExpandedPinId(null);
    } catch (e) {
      alert('\u274c Error al reintentar: ' + (e?.response?.data?.error || e.message));
    } finally {
      setIsRetryingPin(false);
    }
  };

  const failedDayPins = dayPins.filter(p => p.status === 'FAILED');
  const pendingDayPins = dayPins.filter(p => p.status === 'PENDING');
  const publishedDayPins = dayPins.filter(p => p.status === 'PUBLISHED');

  const renderPinCard = (pin) => {
    const filtersObj = typeof pin.filters === 'string'
      ? JSON.parse(pin.filters)
      : pin.filters;
    const imageUrl = resolveImgUrl(filtersObj?.imagePath || filtersObj?.imageUrl || '');
    const isExpanded = expandedPinId === pin.id;
    return (
      <div 
        key={pin.id} 
        className={`pin-card-item ${isExpanded ? 'active' : ''} status-${pin.status?.toLowerCase()}`}
        onClick={() => {
          if (isExpanded) {
            setExpandedPinId(null);
          } else {
            setExpandedPinId(pin.id);
            setEditPin({ 
              title: pin.title || '', 
              description: pin.description || '', 
              link: pin.link || '' 
            });
          }
        }}
      >
        <div className="pin-card-img-wrapper">
          {imageUrl ? <img src={imageUrl} alt="" /> : <div className="no-img">No Img</div>}
          <span className={`status-badge ${pin.status?.toLowerCase()}`}>{pin.status}</span>
        </div>
        <div className="pin-card-body">
          <div className="pin-card-meta">
            <span className="pin-card-time">
              ⏳ {new Date(pin.scheduledAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {pin.assetId && (
              <span className="pin-asset-id-badge">#{pin.assetId}</span>
            )}
          </div>
          <h4 className="pin-card-title">{pin.title || 'Sin título'}</h4>
        </div>
      </div>
    );
  };

  return (
    <div className="pinterest-calendar-container">
      <div className="calendar-header">
        <div className="month-navigation">
          <button onClick={handlePrevMonth} className="nav-btn">←</button>
          <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
          <button onClick={handleNextMonth} className="nav-btn">→</button>
        </div>
        <div className="calendar-stats">
          <span className="stat published">✅ {stats.published} Publicados</span>
          <span className="stat pending">⏳ {stats.pending} Programados</span>
          <span className="stat failed">❌ {stats.failed} Errores</span>
        </div>
        {pinterestStatus.connected ? (
          <div className="btn-connect-pinterest connected">
            <span className="status-dot" />
            <span className="username-link" onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}/api/pinterest/auth-test`, '_blank')} title="Re-conectar / Cambiar cuenta">
              @{pinterestStatus.username}
            </span>
            <button className="btn-disconnect" onClick={handleDisconnect} title="Desconectar cuenta">✕</button>
          </div>
        ) : (
          <button className="btn-connect-pinterest disconnected"
            onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}/api/pinterest/auth-test`, '_blank')}>
            <span className="status-dot" />
            Conectar Pinterest
          </button>
        )}
      </div>

      <div className="main-layout">
        {/* CALENDAR */}
        <div className="calendar-grid">
          <div className="weekdays">
            <span>DOM</span><span>LUN</span><span>MAR</span><span>MIÉ</span><span>JUE</span><span>VIE</span><span>SÁB</span>
          </div>
          <div className="days">
            {days.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="day empty"></div>;
              const today = new Date();
              const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
              const isPast = new Date(currentDate.getFullYear(), currentDate.getMonth(), day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const dayStats = pinsByDay[day];
              const pinsCount = dayStats?.total || 0;
              const isSelected = selectedDay === day;
              
              const dayPinsList = dayStats?.pins || [];
              const publishedPins = dayPinsList.filter(p => p.status === 'PUBLISHED');
              const pendingPins = dayPinsList.filter(p => p.status === 'PENDING');
              const failedPins = dayPinsList.filter(p => p.status === 'FAILED');

              return (
                <div key={`day-${day}`} className={`day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''}`}
                  onClick={() => handleDayClick(day)}>
                  <div className="day-top">
                    <div className="day-number">{day}</div>
                    {pinsCount > 0 && <span className="total-chip">{pinsCount} {pinsCount === 1 ? 'Pin' : 'Pins'}</span>}
                  </div>
                  {pinsCount > 0 && (
                    <div className="day-status-groups" onClick={(e) => {
                      // Permite click en la celda normal
                    }}>
                      {publishedPins.length > 0 && (
                        <div className="status-thumbnail-group published" title={`${publishedPins.length} Publicados`}>
                          <span className="group-label">✓</span>
                          <div className="thumbnails-list">
                            {publishedPins.map(pin => (
                              <div key={pin.id} className="day-mini-thumbnail-wrapper">
                                <img
                                  src={resolveImgUrl(pin.imageUrl)}
                                  alt=""
                                  className="day-mini-thumbnail"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {pendingPins.length > 0 && (
                        <div className="status-thumbnail-group pending" title={`${pendingPins.length} Programados`}>
                          <span className="group-label">⏳</span>
                          <div className="thumbnails-list">
                            {pendingPins.map(pin => (
                              <div key={pin.id} className="day-mini-thumbnail-wrapper">
                                <img
                                  src={resolveImgUrl(pin.imageUrl)}
                                  alt=""
                                  className="day-mini-thumbnail"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {failedPins.length > 0 && (
                        <div className="status-thumbnail-group failed" title={`${failedPins.length} Errores`}>
                          <span className="group-label">✕</span>
                          <div className="thumbnails-list">
                            {failedPins.map(pin => (
                              <div key={pin.id} className="day-mini-thumbnail-wrapper">
                                <img
                                  src={resolveImgUrl(pin.imageUrl)}
                                  alt=""
                                  className="day-mini-thumbnail"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* WORKSPACE MODAL */}
      {selectedDay && (
        <div className="pinterest-modal-overlay" onClick={() => {
          if (selectedPins.length > 0) {
            if (confirm('Tienes pines en la cola sin programar. ¿Seguro que deseas salir del calendario? (Tu selección se conservará si vuelves a abrir el mismo día)')) {
              setSelectedDay(null);
              setPanelMode('list');
            }
          } else {
            setSelectedDay(null);
            setPanelMode('list');
          }
        }}>
            <div className="pinterest-modal-content" onClick={(e) => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div className="modal-header">
                <div className="modal-header-info">
                  <h3>{selectedDay} de {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                  <div className="modal-header-stats">
                    {dayPins.length > 0 && (
                      <>
                        <span className="stat pending">⏳ {dayPins.filter(p => p.status === 'PENDING').length} Programados</span>
                        <span className="stat published">✅ {dayPins.filter(p => p.status === 'PUBLISHED').length} Publicados</span>
                        <span className="stat failed">❌ {dayPins.filter(p => p.status === 'FAILED').length} Errores</span>
                      </>
                    )}
                  </div>
                </div>
                <button className="close-modal" onClick={() => {
                  if (selectedPins.length > 0) {
                    if (confirm('Tienes pines en la cola sin programar. ¿Seguro que deseas salir? (Tu selección se conservará si vuelves a abrir el mismo día)')) {
                      setSelectedDay(null);
                      setPanelMode('list');
                    }
                  } else {
                    setSelectedDay(null);
                    setPanelMode('list');
                  }
                }}>✕</button>
              </div>

              {/* Modal Body */}
              <div className="modal-body">
                
                {/* ====== LIST MODE ====== */}
                {panelMode === 'list' && (
                  <div className="day-pins-workspace">
                    <div className="pins-list-column">
                      {loadingDayPins ? (
                        <p className="help-text">Cargando pines...</p>
                      ) : dayPins.length === 0 ? (
                        <div className="empty-day">
                          <div className="empty-icon">📅</div>
                          <p>No hay pines programados para este día.</p>
                          {!isSelectedDayPast && (
                            <button className="btn-create-pin-empty" onClick={() => setPanelMode('create')}>
                              + Crear primer Pin
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="day-pins-sections">
                          {failedDayPins.length > 0 && (
                            <div className="pins-status-section failed">
                              <h4 className="section-title">❌ Errores ({failedDayPins.length})</h4>
                              <div className="pins-grid">
                                {failedDayPins.map(pin => renderPinCard(pin))}
                              </div>
                            </div>
                          )}

                          {pendingDayPins.length > 0 && (
                            <div className="pins-status-section pending">
                              <h4 className="section-title">⏳ Programados ({pendingDayPins.length})</h4>
                              <div className="pins-grid">
                                {pendingDayPins.map(pin => renderPinCard(pin))}
                              </div>
                            </div>
                          )}

                          {publishedDayPins.length > 0 && (
                            <div className="pins-status-section published">
                              <h4 className="section-title">✅ Publicados ({publishedDayPins.length})</h4>
                              <div className="pins-grid">
                                {publishedDayPins.map(pin => renderPinCard(pin))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {dayPins.length > 0 && !isSelectedDayPast && (
                        <button className="btn-create-pin" onClick={() => setPanelMode('create')}>
                          + Crear Pin
                        </button>
                      )}
                    </div>

                    {/* Detail / Edit Column */}
                    <div className="pin-detail-column">
                      {expandedPinId ? (
                        (() => {
                          const pin = dayPins.find(p => p.id === expandedPinId);
                          if (!pin) return <p className="select-prompt">Selecciona un pin de la lista para ver o editar sus detalles.</p>;
                          
                          const filtersObj = typeof pin.filters === 'string'
                            ? JSON.parse(pin.filters)
                            : pin.filters;
                          const imageUrl = resolveImgUrl(filtersObj?.imagePath || filtersObj?.imageUrl || '');
                          
                          return (
                            <div className="pin-detail-card-panel">
                              <div className="detail-panel-header">
                                <h4>Detalles del Pin</h4>
                                <button className="btn-close-detail" onClick={() => setExpandedPinId(null)}>✕</button>
                              </div>
                              
                              {imageUrl && (
                                <div className="pin-detail-preview">
                                  <img src={imageUrl} alt="Pin preview" />
                                </div>
                              )}

                              <div className="pin-detail-fields">
                                {pin.status === 'PENDING' ? (
                                  <>
                                    <div className="form-group">
                                      <label>Título</label>
                                      <input 
                                        type="text" 
                                        className="form-input" 
                                        value={editPin.title} 
                                        onChange={(e) => setEditPin(p => ({...p, title: e.target.value}))} 
                                      />
                                    </div>
                                    <div className="form-group">
                                      <label>Descripción</label>
                                      <textarea 
                                        className="form-input" 
                                        rows="5" 
                                        value={editPin.description} 
                                        onChange={(e) => setEditPin(p => ({...p, description: e.target.value}))} 
                                      />
                                    </div>
                                    <div className="form-group">
                                      <label>Link de Destino</label>
                                      <input 
                                        type="text" 
                                        className="form-input" 
                                        value={editPin.link} 
                                        onChange={(e) => setEditPin(p => ({...p, link: e.target.value}))} 
                                      />
                                    </div>
                                    <div className="pin-detail-actions">
                                      <button 
                                        className="btn-save-pin" 
                                        onClick={() => handleUpdatePin(pin.id)} 
                                        disabled={isSavingPin}
                                      >
                                        {isSavingPin ? 'Guardando...' : '💾 Guardar Cambios'}
                                      </button>
                                      <button 
                                        className="btn-delete-pin-full" 
                                        onClick={() => handleDeletePin(pin.id)}
                                      >
                                        🗑 Eliminar Pin
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="detail-field">
                                      <strong>Título:</strong> 
                                      <p>{pin.title || '—'}</p>
                                    </div>
                                    <div className="detail-field">
                                      <strong>Descripción:</strong> 
                                      <p>{pin.description || '—'}</p>
                                    </div>
                                    <div className="detail-field">
                                      <strong>Link:</strong> 
                                      <p>
                                        {pin.link ? (
                                          <a href={pin.link} target="_blank" rel="noreferrer">{pin.link} ↗</a>
                                        ) : '—'}
                                      </p>
                                    </div>
                                    {pin.errorMessage && (
                                      <div className="detail-field error">
                                        <strong>Error del Servidor:</strong>
                                        <p>{pin.errorMessage}</p>
                                      </div>
                                    )}
                                    <div className="pin-detail-actions">
                                      {pin.status === 'PUBLISHED' && pin.publishedPinId && (
                                        <a 
                                          href={`https://pinterest.com/pin/${pin.publishedPinId}`} 
                                          target="_blank" 
                                          rel="noreferrer" 
                                          className="btn-view-external"
                                        >
                                          ↗ Ver en Pinterest
                                        </a>
                                      )}
                                      {pin.status === 'FAILED' && (
                                        <>
                                          <button 
                                            className="btn-retry-pin-full" 
                                            onClick={() => handleRetryPin(pin.id)}
                                            disabled={isRetryingPin}
                                          >
                                            {isRetryingPin ? '⏳ Reintentando...' : '🔄 Reintentar Publicación'}
                                          </button>
                                          <button 
                                            className="btn-delete-pin-full" 
                                            onClick={() => handleDeletePin(pin.id)}
                                          >
                                            🗑 Eliminar Pin
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="no-selection-placeholder">
                          <span className="info-icon">💡</span>
                          <p>Selecciona un pin de la izquierda para ver su detalle o editarlo.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ====== CREATE / BULK MODE ====== */}
                {panelMode === 'create' && (
                  <div className="create-workspace-layout">
                    
                    {/* Left Column: Picker / Search */}
                    <div className="workspace-left-pane">
                      <button className="btn-back-to-list" onClick={() => setPanelMode('list')}>← Volver</button>

                      {/* Selector de pestañas */}
                      <div className="search-tabs">
                        <button 
                          type="button" 
                          className={`tab-button ${searchType === 'id' ? 'active' : ''}`}
                          onClick={() => {
                            setSearchType('id');
                            setSearchQuery('');
                            setSearchedAssets([]);
                            setTrendKeyword('');
                          }}
                        >
                          Búsqueda por ID
                        </button>
                        <button 
                          type="button" 
                          className={`tab-button ${searchType === 'semantic' ? 'active' : ''}`}
                          onClick={() => {
                            setSearchType('semantic');
                            setSearchQuery('');
                            setSearchedAssets([]);
                            setTrendKeyword('');
                          }}
                        >
                          Buscar Tendencias (IA Qdrant)
                        </button>
                      </div>

                      {/* Search Form */}
                      <div className="form-group search-group">
                        <label>{searchType === 'id' ? 'IDs de los Pins (escribe y presiona Enter o Coma)' : 'Palabra clave de tendencia o concepto'}</label>
                        
                        {searchType === 'id' ? (
                          <div className="chips-input-container">
                            <textarea 
                              className="chips-textarea"
                              placeholder="Pega o escribe los IDs aquí (Ej: 20, 23, 28) y presiona Enter para agregarlos..."
                              value={idInput} 
                              onChange={(e) => setIdInput(e.target.value)}
                              onKeyDown={handleIdInputKeyDown}
                              onBlur={addIdFromInput}
                              rows="3"
                            />
                            
                            {idChips.length > 0 && (
                              <div className="chips-display-area">
                                <div className="chips-display-header">
                                  <span>IDs Agregados ({idChips.length})</span>
                                  <button 
                                    type="button" 
                                    className="btn-clear-all-chips" 
                                    onClick={() => setIdChips([])}
                                  >
                                    Limpiar todos
                                  </button>
                                </div>
                                <div className="chips-wrapper">
                                  {idChips.map((chipId) => (
                                    <span key={chipId} className="id-chip">
                                      #{chipId}
                                      <button 
                                        type="button" 
                                        className="btn-remove-chip"
                                        onClick={() => removeIdChip(chipId)}
                                      >
                                        ✕
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <button className="btn-search-chips" onClick={handleBulkSearch}>
                              Buscar IDs
                            </button>
                          </div>
                        ) : (
                          <div className="search-bar">
                            <input type="text" className="form-input" 
                              placeholder="Ej: Michael Jackson, Halloween..."
                              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleBulkSearch()} />
                            <button className="btn-search" onClick={handleBulkSearch}>
                              Buscar con IA
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Active Trend Badge */}
                      {trendKeyword && (
                        <div className="active-trend-badge">
                          <span>🎯 Tendencia: <strong>{trendKeyword}</strong></span>
                          <button 
                            type="button" 
                            className="btn-clear-trend" 
                            onClick={() => setTrendKeyword('')}
                            title="Eliminar tendencia"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {/* Counter */}
                      {searchedAssets.length > 0 && (
                        <div className="pin-counter">
                          <span className={`counter ${selectedPins.length >= MAX_PINS_PER_DAY ? 'max' : ''}`}>
                            {selectedPins.length}/{MAX_PINS_PER_DAY} imágenes seleccionadas
                          </span>
                        </div>
                      )}

                      {/* Asset List Scroll */}
                      <div className="workspace-assets-scroll">
                        {searchedAssets.map(asset => {
                          const assetSelected = countForAsset(asset.id);
                          return (
                            <div key={asset.id} className="bulk-asset-section">
                              <div className="bulk-asset-header">
                                <div className="bulk-asset-info">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSearchedAssets(prev => prev.filter(a => a.id !== asset.id));
                                      setSelectedPins(prev => prev.filter(p => p.assetId !== asset.id));
                                      setSelectedAssets(prev => prev.filter(a => a.id !== asset.id));
                                      setOptimizedAssets(prev => prev.filter(id => id !== asset.id));
                                    }}
                                    className="btn-remove-asset-search"
                                    title="Quitar este asset de la lista"
                                  >
                                    ✕
                                  </button>
                                  <span className="asset-id">#{asset.id}</span>
                                  <span className="asset-name">{asset.titleEn || asset.title}</span>
                                  {assetSelected > 0 && <span className="asset-badge">{assetSelected} sel.</span>}
                                </div>
                              </div>

                              <div className="bulk-asset-body">
                                <div className="horizontal-image-scroll">
                                  {asset.images.map((img, idx) => {
                                    const key = `${asset.id}_${img}`;
                                    const isSelected = selectedPins.some(p => p.key === key);
                                    const url = resolveImgUrl(img);
                                    return (
                                      <div key={idx} className={`image-card ${isSelected ? 'selected' : ''}`}
                                        onClick={() => togglePin(asset, img)}>
                                        <img src={editedImages[key] || url} alt={`Render ${idx}`} />
                                        {isSelected && <div className="check-overlay">✓</div>}
                                        <button className="preview-eye" onClick={(e) => { e.stopPropagation(); setPreviewImage(editedImages[key] || url); }}>👁</button>
                                        <button className="edit-pencil" onClick={(e) => { e.stopPropagation(); setEditingImage({ assetId: asset.id, imageUrl: url, key }); }}>✏️</button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Column: Editor Workspace */}
                    <div className="workspace-right-pane">
                      {selectedPins.length === 0 ? (
                        <div className="empty-workspace-right">
                          <span className="workspace-icon">📌</span>
                          <h3>Espacio de Trabajo Vacío</h3>
                          <p>Selecciona una o más imágenes de los assets de la izquierda para comenzar a configurar tus pines.</p>
                        </div>
                      ) : (
                        <div className="workspace-right-content">
                          <div className="selected-pins-list">
                            {selectedAssets.map(asset => {
                              const assetPins = selectedPins.filter(p => p.assetId === asset.id);
                              return (
                                <div key={`config-${asset.id}`} className="asset-config-card">
                                  
                                  <div className="asset-config-header">
                                    <div className="asset-info">
                                      <span className="asset-id">#{asset.id}</span>
                                      <h4 className="asset-title">{asset.titleEn || asset.title}</h4>
                                      {optimizedAssets.includes(asset.id) && (
                                        <span className="ai-optimized-badge">
                                          <span className="dot" />
                                          sugerencia generada
                                        </span>
                                      )}
                                      <button 
                                        type="button" 
                                        className="btn-remove-asset-config"
                                        title="Quitar este asset y sus pines del espacio de trabajo"
                                        onClick={() => {
                                          setSelectedPins(prev => prev.filter(p => p.assetId !== asset.id));
                                          setSelectedAssets(prev => prev.filter(a => a.id !== asset.id));
                                          setOptimizedAssets(prev => prev.filter(id => id !== asset.id));
                                        }}
                                      >
                                        🗑️ Quitar
                                      </button>
                                    </div>
                                    <div className="asset-meta-actions">
                                      <button 
                                        className={`btn-ai-optimize ${isOptimizing === asset.id ? 'loading' : ''}`}
                                        disabled={isOptimizing === asset.id}
                                        onClick={() => handleAiOptimize(asset)}
                                      >
                                        {isOptimizing === asset.id ? '⏳ Generando...' : '✨ Sugerencias SEO'}
                                      </button>
                                      <div className="board-selector-wrapper">
                                        <label>Tablero Pinterest</label>
                                        <BoardSelector 
                                          category={asset.category}
                                          onSelect={(id) => {
                                            setSelectedPins(prev => prev.map(p => p.assetId === asset.id ? { ...p, boardId: id } : p));
                                          }} 
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="pin-variations-list">
                                    {assetPins.map((pin, i) => (
                                      <div key={pin.key} className="pin-variation-row">
                                        
                                        <div className="variation-img-pane">
                                          <img src={editedImages[pin.key] || resolveImgUrl(pin.imageUrl)} alt="" />
                                          <div className="variation-actions">
                                            <button className="preview-eye" onClick={() => setPreviewImage(editedImages[pin.key] || resolveImgUrl(pin.imageUrl))} title="Previsualizar">👁</button>
                                            <button className="edit-pencil" onClick={() => setEditingImage({ assetId: asset.id, imageUrl: resolveImgUrl(pin.imageUrl), key: pin.key })} title="Recortar/Editar">✏️</button>
                                            <button className="btn-remove-variation" onClick={() => togglePin(asset, pin.imageUrl)} title="Quitar pin">✕</button>
                                          </div>
                                          <span className="variation-badge">Pin #{i + 1}</span>
                                        </div>

                                        <div className="variation-fields-pane">
                                          <div className="form-group">
                                            <input 
                                              type="text" 
                                              className="form-input" 
                                              value={pin.pinTitle}
                                              onChange={(e) => updatePinField(pin.key, 'pinTitle', e.target.value)}
                                              placeholder="Título del Pin" 
                                            />
                                          </div>
                                          <div className="form-group">
                                            <textarea 
                                              className="form-input" 
                                              rows="3" 
                                              value={pin.pinDescription}
                                              onChange={(e) => updatePinField(pin.key, 'pinDescription', e.target.value)}
                                              placeholder="Descripción del Pin" 
                                            />
                                          </div>
                                          {pin.pinHashtags?.length > 0 && (
                                            <div className="pin-hashtags">
                                              {pin.pinHashtags.map((tag, ti) => (
                                                <span key={ti} className="hashtag">#{tag}</span>
                                              ))}
                                            </div>
                                          )}
                                        </div>

                                      </div>
                                    ))}
                                  </div>

                                </div>
                              );
                            })}
                          </div>

                          {/* Sticky footer for filters and actions */}
                          <div className="workspace-footer-sticky">
                            <div className={`global-filters-inline ${showAdvancedFilters ? 'expanded' : ''}`}>
                              <div className="filters-header" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
                                <span className="filters-label">⚙️ Ajustes Visuales</span>
                                <span className="expand-arrow">{showAdvancedFilters ? '▲' : '▼'}</span>
                              </div>
                              {showAdvancedFilters && (
                                <div className="filters-body">
                                  <label className="filter-check">
                                    <input type="checkbox" checked={filters.flip} onChange={(e) => setFilters(f => ({...f, flip: e.target.checked}))} />
                                    <span>🔄 Espejo (Variar imagen)</span>
                                  </label>
                                  <label className="filter-check">
                                    <input type="checkbox" checked={filters.zoom} onChange={(e) => setFilters(f => ({...f, zoom: e.target.checked}))} />
                                    <span>🔍 Auto-Enfoque (Mejorar resolución)</span>
                                  </label>
                                </div>
                              )}
                            </div>

                            <div className="panel-actions-row">
                              <button className="btn-secondary" onClick={() => { setSearchedAssets([]); setSelectedPins([]); setSelectedAssets([]); setOptimizedAssets([]); }}>Limpiar Todo</button>
                              {selectedPins.length === 1 && (
                                <button className={`btn-publish-now ${isPublishingNow ? 'disabled' : ''}`}
                                  disabled={isPublishingNow} onClick={handlePublishNow}>
                                  {isPublishingNow ? '⏳ Publicando...' : '🚀 Publicar Ahora'}
                                </button>
                              )}
                              <button className={`btn-primary ${isSubmitting ? 'disabled' : ''}`}
                                disabled={isSubmitting} onClick={handleScheduleAll}>
                                {isSubmitting ? 'Procesando...' : `📌 Programar ${selectedPins.length} Pines`}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                )}
                
              </div>

            </div>
          </div>
        )}

      {/* LIGHTBOX */}
      {previewImage && (
        <div className="lightbox-overlay" onClick={() => setPreviewImage(null)}>
          <button className="lightbox-close" onClick={() => setPreviewImage(null)}>✕</button>
          <img src={previewImage} alt="Preview" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* CROPPER EDITOR */}
      {editingImage && (
        <div className="editor-overlay">
          <div className="editor-toolbar">
            <button title="Flip H" onClick={() => cropperInstanceRef.current?.scaleX(-(cropperInstanceRef.current?.getData()?.scaleX || 1))}>↔</button>
            <button title="Flip V" onClick={() => cropperInstanceRef.current?.scaleY(-(cropperInstanceRef.current?.getData()?.scaleY || 1))}>↕</button>
            <button title="Rotate -90" onClick={() => cropperInstanceRef.current?.rotate(-90)}>↺</button>
            <button title="Rotate +90" onClick={() => cropperInstanceRef.current?.rotate(90)}>↻</button>
            <button title="Reset" onClick={() => cropperInstanceRef.current?.reset()}>⟲</button>
            <div className="toolbar-spacer" />
            <button className="btn-cancel" onClick={() => { cropperInstanceRef.current?.destroy(); setEditingImage(null); }}>Cancelar</button>
            <button className="btn-save" onClick={async () => {
              const canvas = cropperInstanceRef.current?.getCroppedCanvas({ maxWidth: 2000, maxHeight: 2000 });
              if (canvas) {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                setEditedImages(prev => ({ ...prev, [editingImage.key]: dataUrl }));

                // Upload to backend
                try {
                  const http = new HttpService();
                  const res = await http.postData('/pinterest/upload-cropped', {
                    base64: dataUrl,
                    assetId: editingImage.assetId,
                  });
                  const newUrl = res.data?.imageUrl;
                  if (newUrl) {
                    // Store in persistent map
                    setCroppedUrls(prev => ({ ...prev, [editingImage.key]: newUrl }));
                    // Update any existing selected pin
                    setSelectedPins(prev => prev.map(p =>
                      p.key === editingImage.key ? { ...p, imageUrl: newUrl } : p
                    ));
                  }
                } catch (e) { console.error('Error uploading cropped image:', e); }
              }
              cropperInstanceRef.current?.destroy();
              setEditingImage(null);
            }}>✓ Guardar</button>
          </div>
          <div className="editor-canvas">
            <img
              ref={(el) => {
                if (el && !cropperInstanceRef.current) {
                  cropperInstanceRef.current = new Cropper(el, {
                    viewMode: 1,
                    dragMode: 'crop',
                    autoCropArea: 0.9,
                    responsive: true,
                    background: false,
                  });
                }
              }}
              src={editedImages[editingImage.key] || editingImage.imageUrl}
              alt="Editor"
              onLoad={() => { /* cropper auto-inits via ref */ }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Board Selector
function BoardSelector({ category, onSelect }) {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('auto');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const http = new HttpService();
    http.getData('/pinterest/boards').then(res => setBoards(res.data?.boards || [])).catch(() => setBoards([])).finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => { setSelected(e.target.value); onSelect(e.target.value); };
  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const http = new HttpService();
      const res = await http.postData('/pinterest/boards', { name: newName.trim() });
      const board = res.data?.board;
      if (board) { setBoards(prev => [...prev, board]); setSelected(board.id); onSelect(board.id); setNewName(''); setShowCreate(false); }
    } catch (e) { alert('Error: ' + e.message); }
    finally { setCreating(false); }
  };

  return (
    <div className="board-selector">
      <select className="form-input" value={selected} onChange={handleChange} disabled={loading}>
        <option value="auto">Automático ({category || 'General'})</option>
        {boards.map(b => <option key={b.id} value={b.id}>{b.name} ({b.pinCount ?? 0} pines)</option>)}
      </select>
      {!showCreate ? (
        <button className="btn-create-board" onClick={() => setShowCreate(true)} type="button">+ Crear Tablero</button>
      ) : (
        <div className="create-board-inline">
          <input type="text" className="form-input" placeholder="Nombre" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} autoFocus />
          <button className="btn-confirm-create" onClick={handleCreate} disabled={creating}>{creating ? '...' : '✓'}</button>
          <button className="btn-cancel-create" onClick={() => { setShowCreate(false); setNewName(''); }}>✕</button>
        </div>
      )}
      {loading && <span className="board-loading">Cargando...</span>}
    </div>
  );
}
