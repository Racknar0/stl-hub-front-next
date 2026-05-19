'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import HttpService from '@/services/HttpService';
import './PinterestCalendar.scss';

const MAX_PINS_PER_DAY = 15;
const UPLOAD_BASE = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads';

function resolveImgUrl(img) {
  if (!img) return '';
  if (img.startsWith('http')) return img;
  const clean = String(img).replace(/^\\+|^\/+/, '');
  return `${UPLOAD_BASE}/${clean}`;
}

export default function PinterestCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [panelMode, setPanelMode] = useState('list'); // 'list' | 'create'

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
  const [expandedAssetId, setExpandedAssetId] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(null); // assetId being optimized
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [filters, setFilters] = useState({ flip: true, zoom: true });
  // CropperJS editor
  const [editingImage, setEditingImage] = useState(null); // { assetId, imageUrl, key }
  const [editedImages, setEditedImages] = useState({}); // key -> dataURL (visual)
  const [croppedUrls, setCroppedUrls] = useState({}); // key -> server-side relative path
  const cropperRef = useRef(null);
  const cropperInstanceRef = useRef(null);

  // Destroy cropper when editor closes
  useEffect(() => {
    if (!editingImage) {
      if (cropperInstanceRef.current) { try { cropperInstanceRef.current.destroy(); } catch {} }
      cropperInstanceRef.current = null;
    }
  }, [editingImage]);

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
    setSelectedDay(day);
    setPanelMode('list');
    setSearchedAssets([]);
    setSelectedPins([]);
    setSearchQuery('');
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

  // === BULK SEARCH ===
  const handleBulkSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const http = new HttpService();
      const res = await http.getData(`/pinterest/search-assets?q=${encodeURIComponent(searchQuery)}&mode=id`);
      if (res.data?.found && res.data.assets?.length > 0) {
        setSearchedAssets(res.data.assets);
      } else {
        alert('No se encontraron assets.');
        setSearchedAssets([]);
      }
    } catch (e) { alert('Error: ' + e.message); }
    setSelectedPins([]);
  };

  // Toggle image selection
  const togglePin = (asset, imgUrl) => {
    const key = `${asset.id}_${imgUrl}`;
    const exists = selectedPins.find(p => p.key === key);
    if (exists) {
      setSelectedPins(prev => prev.filter(p => p.key !== key));
    } else {
      if (selectedPins.length >= MAX_PINS_PER_DAY) {
        alert(`Máximo ${MAX_PINS_PER_DAY} pines por día.`);
        return;
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

      // Window: full day (24 hours = 1440 minutes)
      const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay, 0, 0, 0);
      const WINDOW_MINUTES = 1440;
      const totalPins = selectedPins.length;
      const slotSize = WINDOW_MINUTES / totalPins; // minutes per slot

      // Generate randomized times within each slot
      const pinTimes = [];
      for (let i = 0; i < totalPins; i++) {
        const slotStart = i * slotSize;
        const jitter = Math.floor(Math.random() * (slotSize - 10)) + 5; // 5 min margin
        pinTimes.push(new Date(dayStart.getTime() + (slotStart + jitter) * 60000));
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
      setSearchedAssets([]);
      setPanelMode('list');
      fetchDayPins();
      fetchPinStats();
    } catch (e) {
      alert('\u274c Error: ' + (e?.response?.data?.error || e.message));
    } finally { setIsPublishingNow(false); }
  };

  return (
    <div className="pinterest-calendar-container">
      <div className="calendar-header">
        <div className="month-navigation">
          <button onClick={handlePrevMonth} className="nav-btn">←</button>
          <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
          <button onClick={handleNextMonth} className="nav-btn">→</button>
        </div>
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
              return (
                <div key={`day-${day}`} className={`day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''}`}
                  onClick={() => !isPast && handleDayClick(day)}>
                  <div className="day-number">{day}</div>
                  {pinsCount > 0 && (
                    <div className={`pin-indicator ${dayStats.published > 0 ? 'published' : ''} ${dayStats.failed > 0 ? 'has-failed' : ''}`}>
                      <span className="dot"></span>
                      <span className="count">{pinsCount} {pinsCount === 1 ? 'Pin' : 'Pines'}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SIDE PANEL */}
        <div className={`side-panel ${selectedDay ? 'open' : ''}`}>
          {selectedDay && (
            <div className="panel-content scrollable">
              <button className="close-panel" onClick={() => { setSelectedDay(null); setPanelMode('list'); }}>✕</button>
              <h3 className="panel-title">{selectedDay} de {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>

              {/* ====== LIST MODE ====== */}
              {panelMode === 'list' && (
                <div className="day-pins-view">
                  {loadingDayPins ? (
                    <p className="help-text">Cargando pines...</p>
                  ) : dayPins.length === 0 ? (
                    <div className="empty-day"><p>No hay pines programados.</p></div>
                  ) : (
                    <div className="pins-list">
                      {dayPins.map(pin => (
                        <div key={pin.id} className={`pin-item ${expandedPinId === pin.id ? 'expanded' : ''}`}>
                          <div className={`pin-row status-${pin.status?.toLowerCase()}`} onClick={() => {
                            if (expandedPinId === pin.id) setExpandedPinId(null);
                            else { setExpandedPinId(pin.id); setEditPin({ title: pin.title || '', description: pin.description || '', link: pin.link || '' }); }
                          }}>
                            <div className="pin-row-info">
                              <span className={`status-badge ${pin.status?.toLowerCase()}`}>{pin.status}</span>
                              <span className="pin-row-title">{pin.title || 'Sin título'}</span>
                              <span className="pin-row-time">{new Date(pin.scheduledAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="pin-row-actions">
                              {pin.status === 'PENDING' && <button className="btn-delete-pin" onClick={(e) => { e.stopPropagation(); handleDeletePin(pin.id); }}>🗑</button>}
                              {pin.status === 'PUBLISHED' && pin.publishedPinId && <a href={`https://pinterest.com/pin/${pin.publishedPinId}`} target="_blank" rel="noreferrer" className="btn-view-pin" onClick={(e) => e.stopPropagation()}>↗</a>}
                              {pin.status === 'FAILED' && <span className="fail-icon" title={pin.errorMessage || 'Error'}>⚠️</span>}
                              <span className="expand-arrow">{expandedPinId === pin.id ? '▲' : '▼'}</span>
                            </div>
                          </div>
                          {expandedPinId === pin.id && (
                            <div className="pin-detail">
                              {pin.status === 'PENDING' ? (
                                <>
                                  <label>Título</label>
                                  <input type="text" className="form-input" value={editPin.title} onChange={(e) => setEditPin(p => ({...p, title: e.target.value}))} />
                                  <label>Descripción</label>
                                  <textarea className="form-input" rows="3" value={editPin.description} onChange={(e) => setEditPin(p => ({...p, description: e.target.value}))} />
                                  <label>Link</label>
                                  <input type="text" className="form-input" value={editPin.link} onChange={(e) => setEditPin(p => ({...p, link: e.target.value}))} />
                                  <div className="pin-detail-actions">
                                    <button className="btn-save-pin" onClick={() => handleUpdatePin(pin.id)} disabled={isSavingPin}>{isSavingPin ? 'Guardando...' : '💾 Guardar'}</button>
                                    <button className="btn-delete-pin-full" onClick={() => handleDeletePin(pin.id)}>🗑 Eliminar</button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="detail-field"><strong>Título:</strong> {pin.title || '—'}</div>
                                  <div className="detail-field"><strong>Descripción:</strong> {pin.description || '—'}</div>
                                  <div className="detail-field"><strong>Link:</strong> <a href={pin.link} target="_blank" rel="noreferrer">{pin.link || '—'}</a></div>
                                  {pin.errorMessage && <div className="detail-field error"><strong>Error:</strong> {pin.errorMessage}</div>}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <button className="btn-create-pin" onClick={() => setPanelMode('create')}>+ Crear Pines (Bulk)</button>
                </div>
              )}

              {/* ====== CREATE / BULK MODE ====== */}
              {panelMode === 'create' && (
                <div className="create-pin-view">
                  <button className="btn-back-to-list" onClick={() => { setPanelMode('list'); setSearchedAssets([]); setSelectedPins([]); }}>← Volver</button>

                  {/* Search */}
                  <div className="form-group search-group">
                    <label>IDs separados por coma</label>
                    <div className="search-bar">
                      <input type="text" className="form-input" placeholder="Ej: 12878, 15432, 9876"
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleBulkSearch()} />
                      <button className="btn-search" onClick={handleBulkSearch}>Buscar</button>
                    </div>
                  </div>

                  {/* Counter */}
                  {searchedAssets.length > 0 && (
                    <div className="pin-counter">
                      <span className={`counter ${selectedPins.length >= MAX_PINS_PER_DAY ? 'max' : ''}`}>
                        {selectedPins.length}/{MAX_PINS_PER_DAY} imágenes
                      </span>
                    </div>
                  )}

                  {/* Asset Sections */}
                  {searchedAssets.map(asset => {
                    const assetSelected = countForAsset(asset.id);
                    const isExpanded = expandedAssetId === asset.id;
                    return (
                      <div key={asset.id} className="bulk-asset-section">
                        <div className="bulk-asset-header" onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)}>
                          <div className="bulk-asset-info">
                            <span className="asset-id">#{asset.id}</span>
                            <span className="asset-name">{asset.titleEn || asset.title}</span>
                            {assetSelected > 0 && <span className="asset-badge">{assetSelected} sel.</span>}
                          </div>
                          <span className="expand-arrow">{isExpanded ? '▲' : '▼'}</span>
                        </div>

                        {isExpanded && (
                          <div className="bulk-asset-body">
                            {/* Image Grid */}
                            <div className="image-grid">
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

                            {/* Per-asset AI + Board */}
                            {assetSelected > 0 && (
                              <div className="bulk-asset-config">
                                <div className="config-header">
                                  <span>Pin Info ({assetSelected} {assetSelected === 1 ? 'imagen' : 'imágenes'})</span>
                                  <button className={`btn-ai-optimize ${isOptimizing === asset.id ? 'loading' : ''}`}
                                    disabled={isOptimizing === asset.id}
                                    onClick={() => handleAiOptimize(asset)}>
                                    {isOptimizing === asset.id ? '⏳ Optimizing...' : '✨ AI Variations'}
                                  </button>
                                </div>

                                {/* Show each pin's title/desc */}
                                {selectedPins.filter(p => p.assetId === asset.id).map((pin, i) => (
                                  <div key={pin.key} className="pin-variation">
                                    <span className="variation-label">Pin #{i + 1}</span>
                                    <input type="text" className="form-input" value={pin.pinTitle}
                                      onChange={(e) => updatePinField(pin.key, 'pinTitle', e.target.value)}
                                      placeholder="Title" />
                                    <textarea className="form-input" rows="4" value={pin.pinDescription}
                                      onChange={(e) => updatePinField(pin.key, 'pinDescription', e.target.value)}
                                      placeholder="Description" />
                                    {pin.pinHashtags?.length > 0 && (
                                      <div className="pin-hashtags">
                                        {pin.pinHashtags.map((tag, ti) => (
                                          <span key={ti} className="hashtag">#{tag}</span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}

                                <div className="form-group board-group">
                                  <label>Tablero</label>
                                  <BoardSelector category={asset.category}
                                    onSelect={(id) => {
                                      setSelectedPins(prev => prev.map(p => p.assetId === asset.id ? { ...p, boardId: id } : p));
                                    }} />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Global Filters */}
                  {selectedPins.length > 0 && (
                    <div className="global-filters">
                      <span className="filters-label">Filtros Anti-Detección:</span>
                      <label className="filter-check">
                        <input type="checkbox" checked={filters.flip} onChange={(e) => setFilters(f => ({...f, flip: e.target.checked}))} />
                        <span>🔄 Espejo</span>
                      </label>
                      <label className="filter-check">
                        <input type="checkbox" checked={filters.zoom} onChange={(e) => setFilters(f => ({...f, zoom: e.target.checked}))} />
                        <span>🔍 Micro-Zoom</span>
                      </label>
                    </div>
                  )}

                  {/* Actions */}
                  {selectedPins.length > 0 && (
                    <div className="panel-actions">
                      <button className="btn-secondary" onClick={() => { setSearchedAssets([]); setSelectedPins([]); }}>Limpiar</button>
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
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
