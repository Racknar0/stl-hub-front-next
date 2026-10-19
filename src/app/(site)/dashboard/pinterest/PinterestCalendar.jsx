'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import HttpService from '@/services/HttpService';
import './PinterestCalendar.scss';
import './PinterestRedesign.scss';
import AutopilotCard from './AutopilotCard';

const MAX_PINS_PER_DAY = 15;
function getUploadBase() {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return `${origin}/uploads`;
    }
  }
  return process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads';
}

function resolveImgUrl(img) {
  if (!img) return '';
  
  const uploadBase = getUploadBase();
  let pathPart = '';
  
  if (img.startsWith('http')) {
    if (img.includes('/uploads/')) {
      const parts = img.split('/uploads/');
      if (parts.length > 1) {
        pathPart = parts[1];
      }
    } else {
      return img;
    }
  } else {
    pathPart = String(img).replace(/^\\+|^\/+/, '');
  }

  if (pathPart.startsWith('uploads/')) {
    pathPart = pathPart.substring(8);
  }

  const encodedPath = pathPart.split('/').map(segment => encodeURIComponent(segment)).join('/');
  return `${uploadBase}/${encodedPath}`;
}

export default function PinterestCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [panelMode, setPanelMode] = useState('list'); // 'list' | 'create'
  const [activePinKey, setActivePinKey] = useState(null);
  const [thumbSize, setThumbSize] = useState('m'); // 'm' | 'l'
  const [hideUsedAssets, setHideUsedAssets] = useState(false);
  const lastThumbIndexRef = useRef(null);
  const [searchType, setSearchType] = useState('id'); // 'id' | 'semantic'
  const [trendKeyword, setTrendKeyword] = useState('');
  const [trendChips, setTrendChips] = useState(null); // null = sin cargar
  const [trendsMeta, setTrendsMeta] = useState(null);
  const [loadingTrends, setLoadingTrends] = useState(false);
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
  const [isOptimizingAll, setIsOptimizingAll] = useState(false);
  const [failedAssets, setFailedAssets] = useState([]);
  const [rangeStartId, setRangeStartId] = useState('');
  const [rangeCount, setRangeCount] = useState('10');
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
  const [boards, setBoards] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);

  const fetchBoards = async () => {
    setLoadingBoards(true);
    try {
      const http = new HttpService();
      const res = await http.getData('/pinterest/boards');
      setBoards(res.data?.boards || []);
    } catch (e) {
      console.error('Error fetching boards:', e);
      setBoards([]);
    } finally {
      setLoadingBoards(false);
    }
  };

  useEffect(() => {
    const http = new HttpService();
    http.getData('/pinterest/stats').then(r => { if (r.data) setStats(r.data); }).catch(() => {});
    http.getData('/pinterest/connection-status').then(r => { if (r.data) setPinterestStatus(r.data); }).catch(() => {});
    fetchBoards();
  }, []);

  // Auto-map selected pins to boards when the boards list is updated
  useEffect(() => {
    if (boards.length > 0) {
      setSelectedPins(prev => prev.map(pin => {
        if (pin.boardId === 'auto' || pin.boardId === 'Automático') {
          const categoryName = pin.category || 'General';
          const matchingBoard = boards.find(b => b.name.toLowerCase() === categoryName.toLowerCase());
          if (matchingBoard) {
            return { ...pin, boardId: matchingBoard.id };
          }
        }
        return pin;
      }));
    }
  }, [boards]);

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
  // Semana empieza en lunes
  const firstDayOfMonth = (new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() + 6) % 7;
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const weekdayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  const goToMonth = (offset) => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    const nextDays = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    setCurrentDate(next);
    setSelectedDay(d => Math.min(d || 1, nextDays));
  };
  const handlePrevMonth = () => goToMonth(-1);
  const handleNextMonth = () => goToMonth(1);
  const handleGoToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now.getDate());
  };

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

  // Abrir / cerrar el espacio de trabajo del día seleccionado
  const openWorkspace = (mode, pin = null) => {
    if (pin) {
      setExpandedPinId(pin.id);
      setEditPin({ title: pin.title || '', description: pin.description || '', link: pin.link || '' });
    }
    setPanelMode(mode);
    setIsWorkspaceOpen(true);
  };

  const requestCloseWorkspace = () => {
    if (selectedPins.length > 0 && !confirm('Tienes pines en la cola sin programar. ¿Seguro que deseas salir? (Tu selección se conservará si vuelves a abrir el mismo día)')) return;
    setIsWorkspaceOpen(false);
    setPanelMode('list');
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

  // === TENDENCIAS DEL DÍA (Pinterest Trends + Qdrant) ===
  const fetchTrendChips = async (refresh = false) => {
    setLoadingTrends(true);
    try {
      const http = new HttpService();
      const res = await http.getData(`/pinterest/trends${refresh ? '?refresh=1' : ''}`);
      setTrendChips(res.data?.trends || []);
      setTrendsMeta({ source: res.data?.source, generatedAt: res.data?.generatedAt });
    } catch (e) {
      alert('Error cargando tendencias: ' + (e?.response?.data?.error || e.message));
    } finally {
      setLoadingTrends(false);
    }
  };

  const handleTrendChipClick = async (chip) => {
    try {
      const http = new HttpService();
      const res = await http.getData(`/pinterest/search-assets?q=${encodeURIComponent(chip.assetIds.join(','))}&mode=id`);
      if (res.data?.found && res.data.assets?.length > 0) {
        // Mantener el orden de relevancia de Qdrant
        const order = new Map(chip.assetIds.map((id, i) => [id, i]));
        setSearchedAssets([...res.data.assets].sort((a, b) => order.get(a.id) - order.get(b.id)));
        setSearchQuery(chip.keyword);
        setTrendKeyword(chip.keyword);
      } else {
        alert('Los assets de esta tendencia ya no están disponibles.');
      }
    } catch (e) { alert('Error: ' + e.message); }
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
      } else if (searchType === 'range') {
        const startId = parseInt(rangeStartId, 10);
        const count = parseInt(rangeCount, 10);
        if (isNaN(startId) || startId < 0) {
          alert('Ingresa un ID inicial válido (número positivo).');
          return;
        }
        if (isNaN(count) || count <= 0) {
          alert('Ingresa una cantidad de assets a buscar válida (mayor a 0).');
          return;
        }
        const res = await http.getData(`/pinterest/search-assets?q=${startId}&mode=range&count=${count}`);
        if (res.data?.found && res.data.assets?.length > 0) {
          setSearchedAssets(res.data.assets);
          setTrendKeyword(''); // Sin tendencia para búsquedas por rango
        } else {
          alert('No se encontraron assets para el rango especificado.');
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
          // Los avisos de duplicado (ya publicado / ya programado) se muestran en la cabecera de cada asset de la galería
          const fetchedAssets = res.data.assets;
          setSearchedAssets(fetchedAssets);
          setIdChips(fetchedAssets.map(a => a.id));
          setTrendKeyword(''); // Sin tendencia para búsquedas por ID normales
        } else {
          alert('No se encontraron assets para los IDs especificados.');
          setSearchedAssets([]);
          setIdChips([]); // Limpiar chips si no se encontró ninguno
        }
      }
    } catch (e) { alert('Error: ' + e.message); }
  };

  const buildPin = (asset, imgUrl) => {
    const key = `${asset.id}_${imgUrl}`;
    const categoryName = asset.category || 'General';
    const matchingBoard = boards.find(b => b.name.toLowerCase() === categoryName.toLowerCase());
    return {
      key,
      assetId: asset.id,
      imageUrl: croppedUrls[key] || imgUrl,
      pinTitle: asset.titleEn || asset.title || '',
      pinDescription: asset.descriptionEn || asset.description || '',
      pinLink: `https://stlgratis.com/en/asset/${asset.slug || asset.id}`,
      pinHashtags: [],
      boardId: matchingBoard ? matchingBoard.id : 'auto',
      category: categoryName,
    };
  };

  // Añadir varias imágenes de golpe (Shift+clic, "1ª de cada asset")
  const addPins = (items) => {
    const nextPins = [...selectedPins];
    const nextAssets = [...selectedAssets];
    let hitMax = false;
    for (const { asset, img } of items) {
      const key = `${asset.id}_${img}`;
      if (nextPins.some(p => p.key === key)) continue;
      if (nextPins.length >= MAX_PINS_PER_DAY) { hitMax = true; break; }
      nextPins.push(buildPin(asset, img));
      if (!nextAssets.some(a => a.id === asset.id)) nextAssets.push(asset);
    }
    setSelectedPins(nextPins);
    setSelectedAssets(nextAssets);
    if (hitMax) alert(`Máximo ${MAX_PINS_PER_DAY} pines por día.`);
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
        setFailedAssets(prev => prev.filter(id => id !== asset.id));
      }
    } else {
      if (selectedPins.length >= MAX_PINS_PER_DAY) {
        alert(`Máximo ${MAX_PINS_PER_DAY} pines por día.`);
        return;
      }
      setSelectedPins(prev => [...prev, buildPin(asset, imgUrl)]);
      setActivePinKey(key);
      setSelectedAssets(prev => {
        if (prev.some(a => a.id === asset.id)) return prev;
        return [...prev, asset];
      });
    }
  };

  const removeAssetFromWorkspace = (assetId, alsoFromResults = false) => {
    if (alsoFromResults) setSearchedAssets(prev => prev.filter(a => a.id !== assetId));
    setSelectedPins(prev => prev.filter(p => p.assetId !== assetId));
    setSelectedAssets(prev => prev.filter(a => a.id !== assetId));
    setOptimizedAssets(prev => prev.filter(id => id !== assetId));
    setFailedAssets(prev => prev.filter(id => id !== assetId));
  };

  // AI optimize per asset
  const handleAiOptimize = async (asset) => {
    const assetPins = selectedPins.filter(p => p.assetId === asset.id);
    if (assetPins.length === 0) { alert('Selecciona imágenes primero.'); return; }

    setIsOptimizing(asset.id);
    try {
      const http = new HttpService();
      
      let attempts = 3;
      let success = false;
      let res = null;
      let lastError = null;

      while (attempts > 0 && !success) {
        try {
          res = await http.postData('/pinterest/ai-optimize', {
            title: asset.titleEn || asset.title,
            description: asset.descriptionEn || asset.description,
            tags: asset.tags || [],
            category: asset.category || 'General',
            imageUrl: resolveImgUrl(assetPins[0]?.imageUrl),
            variationCount: assetPins.length,
            trendKeyword: trendKeyword || undefined, // Pasar la tendencia si existe
          });
          success = true;
        } catch (err) {
          lastError = err;
          attempts--;
          if (attempts > 0) {
            console.warn(`Intento de optimización fallido para asset #${asset.id}. Reintentando en 500ms...`);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      if (!success) {
        throw lastError || new Error('Fallo al optimizar con IA tras 3 intentos');
      }

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
      // Remove from failed list if it succeeds now
      setFailedAssets(prev => prev.filter(id => id !== asset.id));
    } catch (e) { 
      // Add to failed list
      setFailedAssets(prev => {
        if (prev.includes(asset.id)) return prev;
        return [...prev, asset.id];
      });
      alert('Error AI: ' + (e?.response?.data?.error || e.message)); 
    }
    finally { setIsOptimizing(null); }
  };

  // AI optimize all selected assets sequentially
  const handleAiOptimizeAll = async () => {
    // Only optimize assets that are not already optimized
    const assetsToOptimize = selectedAssets.filter(a => !optimizedAssets.includes(a.id));
    if (assetsToOptimize.length === 0) {
      alert('Todos los assets ya están optimizados.');
      return;
    }

    setIsOptimizingAll(true);
    setFailedAssets(prev => prev.filter(id => !assetsToOptimize.some(a => a.id === id))); // Reset targeted failed
    let failedList = [];

    try {
      const http = new HttpService();
      for (const asset of assetsToOptimize) {
        const assetPins = selectedPins.filter(p => p.assetId === asset.id);
        if (assetPins.length === 0) continue; // Skip if no images selected

        setIsOptimizing(asset.id);
        let attempts = 3;
        let success = false;
        let variations = [];

        while (attempts > 0 && !success) {
          try {
            const res = await http.postData('/pinterest/ai-optimize', {
              title: asset.titleEn || asset.title,
              description: asset.descriptionEn || asset.description,
              tags: asset.tags || [],
              category: asset.category || 'General',
              imageUrl: resolveImgUrl(assetPins[0]?.imageUrl),
              variationCount: assetPins.length,
              trendKeyword: trendKeyword || undefined,
            });
            variations = res.data?.variations || [];
            success = true;
          } catch (err) {
            attempts--;
            if (attempts === 0) {
              failedList.push(asset.id);
              console.error(`Error optimizando asset #${asset.id} tras 3 intentos:`, err);
            } else {
              console.warn(`Intento de optimización masiva fallido para asset #${asset.id}. Reintentando en 500ms...`);
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }

        if (success) {
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
          setFailedAssets(prev => prev.filter(id => id !== asset.id)); // Remove on success
        }

        setIsOptimizing(null);
      }

      if (failedList.length > 0) {
        setFailedAssets(prev => Array.from(new Set([...prev, ...failedList])));
        alert(`Optimización masiva finalizada. ${failedList.length} assets fallaron tras 3 intentos (ver alerta en la cabecera del espacio de trabajo).`);
      } else {
        alert('¡Optimización con IA de todos los assets completada con éxito!');
      }
    } catch (e) {
      alert('Error en optimización masiva: ' + e.message);
    } finally {
      setIsOptimizingAll(false);
      setIsOptimizing(null);
    }
  };

  // Update a specific pin field
  const updatePinField = (key, field, value) => {
    setSelectedPins(prev => prev.map(p => p.key === key ? { ...p, [field]: value } : p));
  };

  // Schedule all
  const handleScheduleAll = async () => {
    if (selectedPins.length === 0 || !selectedDay) return;

    // Verify that all selected assets have suggestions generated
    const nonOptimized = selectedAssets.filter(a => !optimizedAssets.includes(a.id));
    if (nonOptimized.length > 0) {
      alert(`⚠️ Error: No se pueden programar pines sin sugerencias de IA generadas. Faltan optimizar ${nonOptimized.length} assets.`);
      return;
    }

    // Check if any of the selected pins belong to assets that have already been scheduled/published
    let duplicateMessages = [];
    selectedPins.forEach(pin => {
      const asset = searchedAssets.find(a => a.id === pin.assetId) || selectedAssets.find(a => a.id === pin.assetId);
      if (asset && asset.queueEntries && asset.queueEntries.length > 0) {
        const published = asset.queueEntries.filter(qe => qe.status === 'PUBLISHED');
        const pending = asset.queueEntries.filter(qe => qe.status === 'PENDING');
        
        let msg = '';
        if (published.length > 0) {
          const dates = published.map(p => new Date(p.scheduledAt).toLocaleDateString('es')).join(', ');
          msg += `ya fue publicado el: ${dates}`;
        }
        if (pending.length > 0) {
          const dates = pending.map(p => new Date(p.scheduledAt).toLocaleDateString('es')).join(', ');
          if (msg) msg += ' y ';
          msg += `ya está programado para: ${dates}`;
        }
        
        if (msg) {
          duplicateMessages.push(`- Asset #${pin.assetId} (${pin.pinTitle || 'Sin título'}): ${msg}.`);
        }
      }
    });

    if (duplicateMessages.length > 0) {
      const confirmSchedule = confirm(
        `⚠️ Alertas de Duplicación encontradas:\n\n` +
        duplicateMessages.join('\n') +
        `\n\n¿Estás seguro de que deseas programar estos pines de todas formas?`
      );
      if (!confirmSchedule) return;
    }

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
      const successfulKeys = new Set();
      const failedPins = [];

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

        try {
          const res = await http.postData('/pinterest/schedule', payload);
          totalQueued += res.data?.queued || 0;
          successfulKeys.add(pin.key);
        } catch (err) {
          const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Error desconocido';
          failedPins.push({
            assetId: pin.assetId,
            title: pin.pinTitle,
            error: errMsg
          });
        }
      }

      fetchDayPins();
      fetchPinStats();

      if (successfulKeys.size > 0) {
        setSelectedPins(prev => prev.filter(p => !successfulKeys.has(p.key)));
        
        // Find asset IDs whose pins were ALL successfully scheduled
        const remainingPins = selectedPins.filter(p => !successfulKeys.has(p.key));
        const remainingAssetIds = new Set(remainingPins.map(p => p.assetId));

        setSelectedAssets(prev => prev.filter(a => remainingAssetIds.has(a.id)));
        setOptimizedAssets(prev => prev.filter(id => remainingAssetIds.has(id)));
        setFailedAssets(prev => prev.filter(id => remainingAssetIds.has(id)));
        setSearchedAssets(prev => prev.filter(a => remainingAssetIds.has(a.id)));
      }

      if (failedPins.length === 0) {
        alert(`¡Éxito! ${totalQueued} pines programados.`);
        setSelectedPins([]);
        setSelectedAssets([]);
        setOptimizedAssets([]);
        setFailedAssets([]);
        setSearchedAssets([]);
        setPanelMode('list');
      } else {
        const errorDetails = failedPins
          .map(f => `• Asset #${f.assetId} ("${f.title || 'Sin título'}"): ${f.error}`)
          .join('\n');

        alert(
          `📊 Resumen de Programación:\n\n` +
          `✅ Exitosos: ${totalQueued}\n` +
          `❌ Fallidos: ${failedPins.length}\n\n` +
          `Detalle de errores:\n${errorDetails}\n\n` +
          `Los pines fallidos permanecen en el panel para que puedas corregirlos o eliminarlos.`
        );
      }
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

    // Verify that the asset of this pin has suggestions generated
    if (!optimizedAssets.includes(pin.assetId)) {
      alert(`⚠️ Error: No se puede publicar un pin sin sugerencias de IA generadas. Por favor optimiza primero el asset.`);
      return;
    }

    // Check duplication
    const asset = searchedAssets.find(a => a.id === pin.assetId) || selectedAssets.find(a => a.id === pin.assetId);
    if (asset && asset.queueEntries && asset.queueEntries.length > 0) {
      const published = asset.queueEntries.filter(qe => qe.status === 'PUBLISHED');
      const pending = asset.queueEntries.filter(qe => qe.status === 'PENDING');
      
      let msg = '';
      if (published.length > 0) {
        const dates = published.map(p => new Date(p.scheduledAt).toLocaleDateString('es')).join(', ');
        msg += `ya fue publicado el: ${dates}`;
      }
      if (pending.length > 0) {
        const dates = pending.map(p => new Date(p.scheduledAt).toLocaleDateString('es')).join(', ');
        if (msg) msg += ' y ';
        msg += `ya está programado para: ${dates}`;
      }
      
      if (msg) {
        const confirmPublish = confirm(
          `⚠️ Alerta de Duplicación para Asset #${pin.assetId} (${pin.pinTitle || 'Sin título'}):\n${msg}\n\n¿Estás seguro de que deseas publicar este pin ahora de todas formas?`
        );
        if (!confirmPublish) return;
      }
    }

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
      setFailedAssets([]);
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

  const missingBoards = [];
  selectedPins.forEach(p => {
    const catName = p.category || 'General';
    const exists = boards.some(b => b.name.toLowerCase() === catName.toLowerCase());
    if (!exists && !missingBoards.includes(catName)) {
      missingBoards.push(catName);
    }
  });

  const failedOptimizationsCount = selectedAssets.filter(
    a => failedAssets.includes(a.id) && !optimizedAssets.includes(a.id)
  ).length;

  // === GALERÍA ===
  const usedAssetsCount = searchedAssets.filter(a => a.queueEntries?.length > 0).length;
  const visibleAssets = hideUsedAssets ? searchedAssets.filter(a => !(a.queueEntries?.length > 0)) : searchedAssets;
  const flatImages = visibleAssets.flatMap(asset => (asset.images || []).map(img => ({ asset, img })));

  const handleThumbClick = (e, asset, img, flatIndex) => {
    if (e.shiftKey && lastThumbIndexRef.current !== null && lastThumbIndexRef.current < flatImages.length) {
      const from = Math.min(lastThumbIndexRef.current, flatIndex);
      const to = Math.max(lastThumbIndexRef.current, flatIndex);
      addPins(flatImages.slice(from, to + 1));
    } else {
      togglePin(asset, img);
    }
    lastThumbIndexRef.current = flatIndex;
  };

  const handlePickFirstOfEach = () => {
    addPins(visibleAssets
      .filter(a => a.images?.length > 0 && countForAsset(a.id) === 0)
      .map(a => ({ asset: a, img: a.images[0] })));
  };

  const describeQueueEntries = (entries = []) => {
    const fmt = (d) => new Date(d).toLocaleDateString('es', { day: '2-digit', month: '2-digit' });
    const published = entries.filter(qe => qe.status === 'PUBLISHED').map(qe => fmt(qe.scheduledAt));
    const pending = entries.filter(qe => qe.status === 'PENDING').map(qe => fmt(qe.scheduledAt));
    const parts = [];
    if (published.length) parts.push(`publicado ${published.join(', ')}`);
    if (pending.length) parts.push(`programado ${pending.join(', ')}`);
    return parts.join(' · ');
  };

  const activePin = selectedPins.find(p => p.key === activePinKey) || selectedPins[0] || null;
  const activePinAsset = activePin ? selectedAssets.find(a => a.id === activePin.assetId) : null;
  const pendingOptimizationCount = selectedAssets.filter(a => !optimizedAssets.includes(a.id)).length;

  // === CALENDARIO: panel lateral ===
  const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  const isPastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const firstFutureDay = isPastMonth ? daysInMonth + 1 : isCurrentMonth ? today.getDate() : 1;
  const gapDays = [];
  for (let d = firstFutureDay; d <= daysInMonth; d++) if (!pinsByDay[d]?.total) gapDays.push(d);
  const failedDays = Object.keys(pinsByDay).map(Number).filter(d => pinsByDay[d]?.failed > 0).sort((a, b) => a - b);
  const monthFailedCount = failedDays.reduce((sum, d) => sum + pinsByDay[d].failed, 0);
  const selectedDayStats = pinsByDay[selectedDay] || { total: 0, published: 0, pending: 0, failed: 0 };
  const selectedDayDate = selectedDay ? new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay) : null;
  const isSelectedDayToday = isCurrentMonth && selectedDay === today.getDate();
  const pinsLeftForDay = Math.max(0, MAX_PINS_PER_DAY - selectedDayStats.total);
  const dayPinImage = (pin) => {
    const f = typeof pin.filters === 'string' ? (() => { try { return JSON.parse(pin.filters); } catch { return {}; } })() : pin.filters;
    return resolveImgUrl(f?.imagePath || f?.imageUrl || '');
  };
  const statusIcon = { PUBLISHED: '✓', PENDING: '⏳', FAILED: '✕' };

  return (
    <div className="pinterest-calendar-container">
      <div className="calendar-header">
        <div className="month-navigation">
          <button onClick={handlePrevMonth} className="nav-btn">←</button>
          <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
          <button onClick={handleNextMonth} className="nav-btn">→</button>
          {!isCurrentMonth && <button onClick={handleGoToday} className="pr-btn ghost pr-today-btn">Hoy</button>}
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

      <div className="main-layout pr-main-layout">
        {/* CALENDAR */}
        <div className="calendar-grid">
          <div className="pr-cal-legend">
            <span><i className="ok" />Publicado</span>
            <span><i className="pen" />Programado</span>
            <span><i className="err" />Error</span>
            <span><i className="gap" />Día sin pines</span>
          </div>
          <div className="weekdays">
            <span>LUN</span><span>MAR</span><span>MIÉ</span><span>JUE</span><span>VIE</span><span>SÁB</span><span>DOM</span>
          </div>
          <div className="days">
            {days.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="day empty"></div>;
              const isToday = isCurrentMonth && day === today.getDate();
              const isPast = new Date(currentDate.getFullYear(), currentDate.getMonth(), day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const dayStats = pinsByDay[day];
              const pinsCount = dayStats?.total || 0;
              const isSelected = selectedDay === day;
              const isGap = !isPast && pinsCount === 0;
              const scale = Math.max(MAX_PINS_PER_DAY, pinsCount);
              const dayThumbs = [...(dayStats?.pins || [])].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

              return (
                <div key={`day-${day}`} className={`day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''} ${isGap ? 'gap' : ''}`}
                  onClick={() => handleDayClick(day)}
                  onDoubleClick={() => openWorkspace('list')}
                  title={pinsCount ? `${dayStats.published} publicados · ${dayStats.pending} programados · ${dayStats.failed} errores` : 'Sin pines'}>
                  <div className="day-top">
                    <div className="day-number">{day}</div>
                    {pinsCount > 0 && <span className={`pr-day-count ${pinsCount >= MAX_PINS_PER_DAY ? 'full' : ''}`}>{pinsCount}/{MAX_PINS_PER_DAY}</span>}
                  </div>
                  {pinsCount > 0 ? (
                    <>
                      <div className="pr-fill-bar">
                        <b className="ok" style={{ width: `${(dayStats.published / scale) * 100}%` }} />
                        <b className="pen" style={{ width: `${(dayStats.pending / scale) * 100}%` }} />
                        <b className="err" style={{ width: `${(dayStats.failed / scale) * 100}%` }} />
                      </div>
                      <div className="pr-day-thumbs">
                        {dayThumbs.slice(0, 4).map(pin => (
                          <img key={pin.id} src={resolveImgUrl(pin.imageUrl)} alt="" className={`st-${pin.status?.toLowerCase()}`} loading="lazy" />
                        ))}
                        {dayThumbs.length > 4 && <small>+{dayThumbs.length - 4}</small>}
                      </div>
                    </>
                  ) : isGap ? (
                    <span className="pr-gap-label">Sin pines</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL DEL DÍA */}
        <aside className="pr-cal-side">
          <AutopilotCard onScheduled={() => { fetchPinStats(); fetchDayPins(); }} />
          {selectedDayDate && (
            <>
              <div className="pr-side-head">
                <div>
                  <span className="pr-side-eyebrow">{isSelectedDayToday ? 'Hoy' : isSelectedDayPast ? 'Día pasado' : 'Día seleccionado'}</span>
                  <h4>{weekdayNames[selectedDayDate.getDay()]} {selectedDay} de {monthNames[currentDate.getMonth()].toLowerCase()}</h4>
                </div>
                <span className={`pr-day-goal ${selectedDayStats.total >= MAX_PINS_PER_DAY ? 'full' : ''}`}>{selectedDayStats.total}/{MAX_PINS_PER_DAY}</span>
              </div>

              <div className="pr-kpis">
                <div className="pr-kpi"><b className="ok">{selectedDayStats.published}</b><span>publicados</span></div>
                <div className="pr-kpi"><b className="pen">{selectedDayStats.pending}</b><span>programados</span></div>
                <div className="pr-kpi"><b className="err">{selectedDayStats.failed}</b><span>errores</span></div>
              </div>

              <div className="pr-side-actions">
                {selectedPins.length > 0 && (
                  <button type="button" className="pr-btn primary" onClick={() => openWorkspace('create')}>
                    Seguir creando ({selectedPins.length} en cola)
                  </button>
                )}
                {!isSelectedDayPast && selectedPins.length === 0 && (
                  <button type="button" className="pr-btn primary" onClick={() => openWorkspace('create')} disabled={pinsLeftForDay === 0}>
                    {pinsLeftForDay === 0 ? 'Día completo' : `+ Crear pines (quedan ${pinsLeftForDay})`}
                  </button>
                )}
                <button type="button" className="pr-btn" onClick={() => openWorkspace('list')}>Ver y editar pines del día</button>
              </div>

              {(monthFailedCount > 0 || gapDays.length > 0) && (
                <div className="pr-alerts">
                  {monthFailedCount > 0 && (
                    <div className="pr-alert err">
                      <span>{monthFailedCount} {monthFailedCount === 1 ? 'pin falló' : 'pines fallaron'} este mes ({failedDays.map(d => d).join(', ')})</span>
                      <button type="button" onClick={() => { setSelectedDay(failedDays[0]); lastDayRef.current = failedDays[0]; }}>Ver</button>
                    </div>
                  )}
                  {gapDays.length > 0 && (
                    <div className="pr-alert warn">
                      <span>{gapDays.length} {gapDays.length === 1 ? 'día sin pines' : 'días sin pines'} por delante (desde el {gapDays[0]})</span>
                      <button type="button" onClick={() => { setSelectedDay(gapDays[0]); lastDayRef.current = gapDays[0]; }}>Ir</button>
                    </div>
                  )}
                </div>
              )}

              <div className="pr-agenda">
                <span className="pr-side-eyebrow">Agenda del día</span>
                {loadingDayPins ? (
                  <p className="pr-muted">Cargando pines…</p>
                ) : dayPins.length === 0 ? (
                  <p className="pr-muted">No hay pines este día.</p>
                ) : (
                  <div className="pr-agenda-list">
                    {dayPins.map(pin => {
                      const img = dayPinImage(pin);
                      return (
                        <button type="button" key={pin.id} className={`pr-agenda-item st-${pin.status?.toLowerCase()}`} onClick={() => openWorkspace('list', pin)}>
                          <time>{statusIcon[pin.status] || ''} {new Date(pin.scheduledAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</time>
                          {img ? <img src={img} alt="" loading="lazy" /> : <span className="pr-noimg" />}
                          <span className="pr-agenda-title">{pin.title || 'Sin título'}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
      {/* WORKSPACE MODAL */}
      {selectedDay && isWorkspaceOpen && createPortal(
        <div className={`pinterest-modal-overlay ${panelMode === 'create' ? 'pr-fullscreen' : ''}`} onClick={requestCloseWorkspace}>
            <div className="pinterest-modal-content" onClick={(e) => e.stopPropagation()}>

              {/* Modal Header */}
              {panelMode === 'create' ? (
                <div className="pr-topbar">
                  <button type="button" className="pr-btn ghost" onClick={() => setPanelMode('list')}>← Pines del día</button>
                  <h3>{selectedDayDate ? `${weekdayNames[selectedDayDate.getDay()]} ${selectedDay} ${monthNames[currentDate.getMonth()].toLowerCase()} ${currentDate.getFullYear()}` : ''}</h3>
                  <div className="search-tabs pr-tabs">
                    <button type="button" className={`tab-button ${searchType === 'id' ? 'active' : ''}`} onClick={() => setSearchType('id')}>Por ID</button>
                    <button type="button" className={`tab-button ${searchType === 'semantic' ? 'active' : ''}`} onClick={() => setSearchType('semantic')}>Tendencias (IA)</button>
                    <button type="button" className={`tab-button ${searchType === 'range' ? 'active' : ''}`} onClick={() => setSearchType('range')}>Rango masivo</button>
                  </div>
                  <span className="pr-spacer" />
                  {dayPins.length > 0 && (
                    <span className="pr-topbar-stats">⏳ {pendingDayPins.length} programados · ✅ {publishedDayPins.length} publicados</span>
                  )}
                  <span className={`pr-counter ${selectedPins.length >= MAX_PINS_PER_DAY ? 'max' : ''}`}>{selectedPins.length} / {MAX_PINS_PER_DAY} imágenes</span>
                  <button className="close-modal" onClick={requestCloseWorkspace}>✕</button>
                </div>
              ) : (
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
                <button className="close-modal" onClick={requestCloseWorkspace}>✕</button>
              </div>
              )}
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
                  <div className={`pr-create thumbs-${thumbSize}`}>

                    {/* Columna 1: búsqueda según el modo */}
                    <div className="workspace-left-pane pr-left">
                      <div className="form-group search-group">
                        <label>
                          {searchType === 'id'
                            ? 'IDs de los assets (escribe y presiona Enter o coma)'
                            : searchType === 'range'
                            ? 'Rango de assets por ID'
                            : 'Palabra clave de tendencia o concepto'}
                        </label>

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
                                  <span>IDs agregados ({idChips.length})</span>
                                  <button type="button" className="btn-clear-all-chips" onClick={() => setIdChips([])}>Limpiar todos</button>
                                </div>
                                <div className="chips-wrapper">
                                  {idChips.map((chipId) => (
                                    <span key={chipId} className="id-chip">
                                      #{chipId}
                                      <button type="button" className="btn-remove-chip" onClick={() => removeIdChip(chipId)}>✕</button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <button className="btn-search-chips" onClick={handleBulkSearch}>Buscar IDs</button>
                          </div>
                        ) : searchType === 'range' ? (
                          <div className="range-search-container">
                            <div className="range-inputs-row">
                              <div className="range-field">
                                <label htmlFor="range-start-id">Desde ID (inclusivo)</label>
                                <input id="range-start-id" type="number" className="form-input" placeholder="Ej: 3000"
                                  value={rangeStartId} onChange={(e) => setRangeStartId(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleBulkSearch()} />
                              </div>
                              <div className="range-field">
                                <label htmlFor="range-count">Cantidad</label>
                                <input id="range-count" type="number" className="form-input" placeholder="Ej: 10"
                                  value={rangeCount} onChange={(e) => setRangeCount(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleBulkSearch()} />
                              </div>
                            </div>
                            <button className="btn-search-range" onClick={handleBulkSearch}>Buscar rango</button>
                          </div>
                        ) : (
                          <div className="search-bar">
                            <input type="text" className="form-input"
                              placeholder="Ej: Michael Jackson, Halloween..."
                              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleBulkSearch()} />
                            <button className="btn-search" onClick={handleBulkSearch}>Buscar</button>
                          </div>
                        )}

                        {searchType === 'semantic' && (
                          <div className="trend-chips-box">
                            <div className="trend-chips-header">
                              <button type="button" className="btn-load-trends" onClick={() => fetchTrendChips(false)} disabled={loadingTrends}>
                                {loadingTrends ? 'Buscando tendencias…' : '🔥 Tendencias de hoy'}
                              </button>
                              {trendChips && !loadingTrends && (
                                <button type="button" className="btn-refresh-trends" onClick={() => fetchTrendChips(true)} title="Volver a calcular">↻</button>
                              )}
                            </div>
                            {trendChips && !loadingTrends && (
                              trendChips.length === 0 ? (
                                <p className="trend-chips-empty">No hay tendencias que encajen con tus modelos hoy.</p>
                              ) : (
                                <>
                                  <div className="trend-chips">
                                    {trendChips.map(chip => (
                                      <button
                                        key={chip.keyword}
                                        type="button"
                                        className={`trend-chip ${trendKeyword === chip.keyword ? 'active' : ''}`}
                                        onClick={() => handleTrendChipClick(chip)}
                                        title={chip.from ? `Tendencia en Pinterest: "${chip.from}"` : 'Tendencia de temporada'}
                                      >
                                        {chip.keyword} <span className="trend-chip-count">{chip.count}</span>
                                      </button>
                                    ))}
                                  </div>
                                  <small className="trend-chips-source">
                                    Fuente: {trendsMeta?.source === 'pinterest' ? 'Pinterest Trends' : 'IA (temporada)'} · se actualiza cada día
                                  </small>
                                </>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      {trendKeyword && (
                        <div className="active-trend-badge">
                          <span>🎯 Tendencia: <strong>{trendKeyword}</strong></span>
                          <button type="button" className="btn-clear-trend" onClick={() => setTrendKeyword('')} title="Quitar tendencia">✕</button>
                        </div>
                      )}

                      <div className="pr-shortcuts">
                        <span className="pr-side-eyebrow">Atajos</span>
                        <span><kbd>Clic</kbd> marcar o desmarcar imagen</span>
                        <span><kbd>Shift</kbd> + <kbd>Clic</kbd> marcar todas las del tramo</span>
                        <span><kbd>👁</kbd> ver en grande · <kbd>✏️</kbd> recortar</span>
                      </div>
                    </div>

                    {/* Columna 2: galería */}
                    <div className="pr-gallery">
                      {searchedAssets.length > 0 && (
                        <div className="pr-gallery-tools">
                          <strong>{visibleAssets.length} assets</strong>
                          {trendKeyword && <span className="pr-muted">para “{trendKeyword}”</span>}
                          <span className="pr-spacer" />
                          <button type="button" className="pr-btn ghost" onClick={handlePickFirstOfEach}>Elegir la 1ª de cada uno</button>
                          {usedAssetsCount > 0 && (
                            <button type="button" className={`pr-btn ghost ${hideUsedAssets ? 'on' : ''}`} onClick={() => setHideUsedAssets(v => !v)}>
                              {hideUsedAssets ? `Mostrar ya usados (${usedAssetsCount})` : `Ocultar ya usados (${usedAssetsCount})`}
                            </button>
                          )}
                          <div className="pr-size-toggle" role="group" aria-label="Tamaño de miniaturas">
                            <button type="button" className={thumbSize === 'm' ? 'on' : ''} onClick={() => setThumbSize('m')} title="Miniaturas medianas">▦</button>
                            <button type="button" className={thumbSize === 'l' ? 'on' : ''} onClick={() => setThumbSize('l')} title="Miniaturas grandes">▣</button>
                          </div>
                        </div>
                      )}

                      <div className="pr-gallery-scroll">
                        {searchedAssets.length === 0 ? (
                          <div className="pr-empty">
                            <span>🔎</span>
                            <h3>Busca assets para empezar</h3>
                            <p>
                              {searchType === 'id' ? 'Escribe uno o varios IDs a la izquierda.'
                                : searchType === 'range' ? 'Indica desde qué ID y cuántos assets quieres ver.'
                                : 'Escribe un concepto o pulsa “🔥 Tendencias de hoy” y elige una.'}
                            </p>
                          </div>
                        ) : (() => {
                          let flatIndex = 0;
                          return visibleAssets.map(asset => {
                            const assetSelected = countForAsset(asset.id);
                            const usedInfo = describeQueueEntries(asset.queueEntries);
                            return (
                              <section key={asset.id} className="pr-asset-group">
                                <header>
                                  <span className="pr-id">#{asset.id}</span>
                                  <span className="pr-asset-title">{asset.titleEn || asset.title}</span>
                                  {usedInfo && <span className="pr-used">⚠ ya {usedInfo}</span>}
                                  <span className="pr-spacer" />
                                  {assetSelected > 0 && <span className="pr-sel-count">{assetSelected} elegida{assetSelected > 1 ? 's' : ''}</span>}
                                  <button type="button" className="pr-icon-btn" title="Quitar este asset de la lista" onClick={() => removeAssetFromWorkspace(asset.id, true)}>✕</button>
                                </header>
                                <div className="pr-thumb-grid">
                                  {(asset.images || []).map((img, idx) => {
                                    const myIndex = flatIndex++;
                                    const key = `${asset.id}_${img}`;
                                    const isSelected = selectedPins.some(p => p.key === key);
                                    const url = resolveImgUrl(img);
                                    return (
                                      <div key={idx} className={`pr-thumb ${isSelected ? 'selected' : ''}`}
                                        onClick={(e) => handleThumbClick(e, asset, img, myIndex)}>
                                        <img src={editedImages[key] || url} alt={`Render ${idx + 1}`} loading="lazy" draggable={false} />
                                        {isSelected && <div className="pr-check">✓</div>}
                                        <div className="pr-thumb-actions">
                                          <button type="button" onClick={(e) => { e.stopPropagation(); setPreviewImage(editedImages[key] || url); }} title="Ver en grande">👁</button>
                                          <button type="button" onClick={(e) => { e.stopPropagation(); setEditingImage({ assetId: asset.id, imageUrl: url, key }); }} title="Recortar / editar">✏️</button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </section>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Columna 3: cola de pines + editor */}
                    <div className="pr-right">
                      {selectedPins.length === 0 ? (
                        <div className="pr-empty">
                          <span>📌</span>
                          <h3>La cola está vacía</h3>
                          <p>Haz clic en las imágenes de la galería para añadirlas. Aquí podrás revisar el texto de cada pin y programarlos.</p>
                        </div>
                      ) : (
                        <>
                          <div className="pr-right-scroll">
                            {missingBoards.length > 0 && (
                              <div className="missing-boards-warning">
                                <div className="warning-text">
                                  <span className="warning-icon">⚠️</span>
                                  <span><strong>Faltan tableros en Pinterest:</strong> crea los tableros de <strong>{missingBoards.join(', ')}</strong></span>
                                </div>
                                <button type="button" className={`btn-sync-boards ${loadingBoards ? 'loading' : ''}`} disabled={loadingBoards} onClick={fetchBoards}>
                                  {loadingBoards ? '⏳ Sincronizando...' : '🔄 Sincronizar tableros'}
                                </button>
                              </div>
                            )}

                            {failedOptimizationsCount > 0 && (
                              <div className="failed-optimizations-warning">
                                <div className="warning-text">
                                  <span className="warning-icon">❌</span>
                                  <span><strong>{failedOptimizationsCount}</strong> assets fallaron al generar el texto con IA. No se pueden programar hasta que funcione.</span>
                                </div>
                                <button type="button" className="btn-retry-failed-opt" onClick={handleAiOptimizeAll}>🔄 Reintentar fallidos</button>
                              </div>
                            )}

                            {/* Editor del pin activo con vista previa tipo Pinterest */}
                            {activePin && (
                              <div className="pr-editor">
                                <div className="pr-editor-head">
                                  <span className="pr-side-eyebrow">Pin #{activePin.assetId} · vista previa</span>
                                  {optimizedAssets.includes(activePin.assetId)
                                    ? <span className="pr-ai ok">✓ texto IA listo</span>
                                    : <span className="pr-ai no">sin texto IA</span>}
                                </div>
                                <div className="pr-editor-body">
                                  <div className="pr-pin-preview">
                                    <img src={editedImages[activePin.key] || resolveImgUrl(activePin.imageUrl)} alt="" />
                                    <div className="pr-pin-preview-actions">
                                      <button type="button" onClick={() => setPreviewImage(editedImages[activePin.key] || resolveImgUrl(activePin.imageUrl))} title="Ver en grande">👁</button>
                                      <button type="button" onClick={() => setEditingImage({ assetId: activePin.assetId, imageUrl: resolveImgUrl(activePin.imageUrl), key: activePin.key })} title="Recortar / editar">✏️</button>
                                      {activePinAsset && <button type="button" onClick={() => togglePin(activePinAsset, activePin.key.slice(String(activePin.assetId).length + 1))} title="Quitar de la cola">✕</button>}
                                    </div>
                                  </div>
                                  <div className="pr-editor-fields">
                                    <input type="text" className="form-input" value={activePin.pinTitle}
                                      onChange={(e) => updatePinField(activePin.key, 'pinTitle', e.target.value)} placeholder="Título del pin" />
                                    <textarea className="form-input" rows="5" value={activePin.pinDescription}
                                      onChange={(e) => updatePinField(activePin.key, 'pinDescription', e.target.value)} placeholder="Descripción del pin" />
                                    {activePin.pinHashtags?.length > 0 && (
                                      <div className="pin-hashtags">
                                        {activePin.pinHashtags.map((tag, ti) => <span key={ti} className="hashtag">#{tag}</span>)}
                                      </div>
                                    )}
                                    <span className="pr-link" title={activePin.pinLink}>🔗 {activePin.pinLink.replace('https://', '')}</span>
                                  </div>
                                </div>
                                {activePinAsset && (
                                  <div className="pr-editor-asset">
                                    <button
                                      className={`btn-ai-optimize ${isOptimizing === activePinAsset.id ? 'loading' : ''}`}
                                      disabled={isOptimizing === activePinAsset.id}
                                      onClick={() => handleAiOptimize(activePinAsset)}
                                    >
                                      {isOptimizing === activePinAsset.id ? '⏳ Generando...' : '✨ Sugerencias SEO de este asset'}
                                    </button>
                                    <div className="board-selector-wrapper">
                                      <label>Tablero</label>
                                      <BoardSelector
                                        category={activePinAsset.category}
                                        boards={boards}
                                        selected={activePin.boardId || 'auto'}
                                        onSelect={(id) => setSelectedPins(prev => prev.map(p => p.assetId === activePinAsset.id ? { ...p, boardId: id } : p))}
                                        onCreateBoard={(newBoard) => setBoards(prev => [...prev, newBoard])}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Cola agrupada por asset */}
                            <div className="pr-queue">
                              <span className="pr-side-eyebrow">Cola del día ({selectedPins.length})</span>
                              {selectedAssets.map(asset => {
                                const assetPins = selectedPins.filter(p => p.assetId === asset.id);
                                const isOpt = optimizedAssets.includes(asset.id);
                                return (
                                  <div key={`q-${asset.id}`} className="pr-queue-group">
                                    <div className="pr-queue-group-head">
                                      <span className="pr-id">#{asset.id}</span>
                                      <span className="pr-asset-title">{asset.titleEn || asset.title}</span>
                                      <span className={`pr-ai ${isOpt ? 'ok' : failedAssets.includes(asset.id) ? 'err' : 'no'}`}>
                                        {isOptimizing === asset.id ? '⏳' : isOpt ? 'IA ✓' : failedAssets.includes(asset.id) ? 'IA ✕' : 'sin IA'}
                                      </span>
                                      <button type="button" className="pr-icon-btn" title="Quitar este asset y sus pines" onClick={() => removeAssetFromWorkspace(asset.id)}>🗑</button>
                                    </div>
                                    {assetPins.map((pin, i) => (
                                      <button type="button" key={pin.key} className={`pr-queue-item ${activePin?.key === pin.key ? 'active' : ''}`} onClick={() => setActivePinKey(pin.key)}>
                                        <img src={editedImages[pin.key] || resolveImgUrl(pin.imageUrl)} alt="" loading="lazy" />
                                        <span className="pr-queue-text">
                                          <b>{pin.pinTitle || 'Sin título'}</b>
                                          <small>Pin {i + 1}{pin.pinHashtags?.length ? ` · ${pin.pinHashtags.length} hashtags` : ''}</small>
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Pie fijo con acciones */}
                          <div className="workspace-footer-sticky pr-right-footer">
                            <button
                              type="button"
                              className={`btn-optimize-all ${isOptimizingAll ? 'disabled' : ''}`}
                              disabled={isOptimizingAll || pendingOptimizationCount === 0}
                              onClick={handleAiOptimizeAll}
                            >
                              {isOptimizingAll ? '⏳ Generando textos...' : pendingOptimizationCount === 0 ? '✓ Todos los textos generados' : `✨ Generar texto IA (${pendingOptimizationCount} pendiente${pendingOptimizationCount > 1 ? 's' : ''})`}
                            </button>
                            <div className={`global-filters-inline ${showAdvancedFilters ? 'expanded' : ''}`}>
                              <div className="filters-header" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
                                <span className="filters-label">⚙️ Ajustes visuales</span>
                                <span className="expand-arrow">{showAdvancedFilters ? '▲' : '▼'}</span>
                              </div>
                              {showAdvancedFilters && (
                                <div className="filters-body">
                                  <label className="filter-check">
                                    <input type="checkbox" checked={filters.flip} onChange={(e) => setFilters(f => ({...f, flip: e.target.checked}))} />
                                    <span>🔄 Espejo (variar imagen)</span>
                                  </label>
                                  <label className="filter-check">
                                    <input type="checkbox" checked={filters.zoom} onChange={(e) => setFilters(f => ({...f, zoom: e.target.checked}))} />
                                    <span>🔍 Auto-enfoque (mejorar resolución)</span>
                                  </label>
                                </div>
                              )}
                            </div>
                            <div className="panel-actions-row">
                              <button className="btn-secondary" onClick={() => { setSearchedAssets([]); setSelectedPins([]); setSelectedAssets([]); setOptimizedAssets([]); setFailedAssets([]); }}>Limpiar todo</button>
                              {selectedPins.length === 1 && (
                                <button className={`btn-publish-now ${isPublishingNow ? 'disabled' : ''}`}
                                  disabled={isPublishingNow} onClick={handlePublishNow}>
                                  {isPublishingNow ? '⏳ Publicando...' : '🚀 Publicar ahora'}
                                </button>
                              )}
                              <button className={`btn-primary ${isSubmitting ? 'disabled' : ''}`}
                                disabled={isSubmitting} onClick={handleScheduleAll}>
                                {isSubmitting ? 'Procesando...' : `📌 Programar ${selectedPins.length} pines`}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                  </div>
                )}
                
              </div>

            </div>
          </div>,
          document.body
        )}

      {/* LIGHTBOX */}
      {previewImage && createPortal(
        <div className="lightbox-overlay" onClick={() => setPreviewImage(null)}>
          <button className="lightbox-close" onClick={() => setPreviewImage(null)}>✕</button>
          <img src={previewImage} alt="Preview" onClick={(e) => e.stopPropagation()} />
        </div>,
        document.body
      )}

      {/* CROPPER EDITOR */}
      {editingImage && createPortal(
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
        </div>,
        document.body
      )}
    </div>
  );
}

// Board Selector
function BoardSelector({ category, selected, boards, onSelect, onCreateBoard }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleChange = (e) => { onSelect(e.target.value); };
  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const http = new HttpService();
      const res = await http.postData('/pinterest/boards', { name: newName.trim() });
      const board = res.data?.board;
      if (board) {
        onCreateBoard(board);
        onSelect(board.id);
        setNewName('');
        setShowCreate(false);
      }
    } catch (e) { alert('Error: ' + e.message); }
    finally { setCreating(false); }
  };

  return (
    <div className="board-selector">
      <select className="form-input" value={selected} onChange={handleChange}>
        <option value="auto">Automático ({category || 'General'})</option>
        {boards.map(b => (
          <option key={b.id} value={b.id}>
            {b.name} ({b.pinCount ?? 0} pines)
          </option>
        ))}
      </select>
      {!showCreate ? (
        <button className="btn-create-board" onClick={() => setShowCreate(true)} type="button">
          + Crear Tablero
        </button>
      ) : (
        <div className="create-board-inline">
          <input
            type="text"
            className="form-input"
            placeholder="Nombre"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <button className="btn-confirm-create" onClick={handleCreate} disabled={creating}>
            {creating ? '...' : '✓'}
          </button>
          <button className="btn-cancel-create" onClick={() => { setShowCreate(false); setNewName(''); }}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
