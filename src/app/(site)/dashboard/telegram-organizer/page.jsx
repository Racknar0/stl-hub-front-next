'use client'

import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import HttpService from '@/services/HttpService';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Box } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import FileExplorer from '@/components/dashboard/FileExplorer/FileExplorer';
import useStore from '@/store/useStore';
import OrganizerCard from './OrganizerCard';
import './TelegramOrganizer.scss';

// Se carga la lista entera (son solo nombres) y la grilla está virtualizada: solo se pintan las filas visibles
const LOAD_LIMIT = 100000;
// Deben coincidir con .card / .grid de TelegramOrganizer.scss
const CARD_MIN_WIDTH = 160;
const CARD_HEIGHT = 208;
const GRID_GAP = 15;
const MAX_UNDO = 50;

export default function TelegramOrganizer() {
  const [files, setFiles] = useState([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [showExplorer, setShowExplorer] = useState(false);

  // Stats
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalImages, setTotalImages] = useState(0);

  const [selectedAnchor, setSelectedAnchor] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [filesToDelete, setFilesToDelete] = useState(new Set());
  const [lastCheckedName, setLastCheckedName] = useState(null);
  const [undoStack, setUndoStack] = useState([]);

  const isShiftDraggingRef = useRef(false);
  const dragSelectModeRef = useRef('select');
  const undoBusyRef = useRef(false);
  const packingRef = useRef(false); // evita doble envío (p. ej. Espacio dos veces) mientras se empaqueta
  
  // Avisos flotantes con tipo explícito: 'success' | 'error' | 'warning' | 'info'.
  // 'silent' no muestra nada (estados transitorios como "Empaquetando...").
  const [organizerAlerts, setOrganizerAlerts] = useState([]);

  const notify = useCallback((msg, type = 'info') => {
    if (!msg || type === 'silent') return;
    const alertId = `org-${Date.now()}-${Math.random()}`;
    // Solo la última alerta (evita apilamientos que tapen la grilla)
    setOrganizerAlerts([{ id: alertId, msg, type }]);
    setTimeout(() => {
      setOrganizerAlerts(prev => prev.filter(a => a.id !== alertId));
    }, 4000);
  }, []);

  const [loading, setLoading] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const hoveredRef = useRef(null); // tarjeta bajo el ratón (atajo X)
  const [purgeText, setPurgeText] = useState('');

  const http = new HttpService();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  const token = useStore(s => s.token);
  // <img> no manda cabeceras: el token va por query
  // La grilla usa la imagen original (no miniatura): la extensión de zoom al pasar el ratón amplía el <img>
  // y con una miniatura se veía borrosa.
  // Hover Zoom+ solo amplía un <img> si su src termina en ".jpg": el nombre va el último y, si no es .jpg,
  // se añade un fragmento "#.jpg" (no se envía al servidor).
  const imageUrl = (name) => {
    const url = `${apiBase}/api/organizer/image?token=${encodeURIComponent(token || '')}&name=${encodeURIComponent(name)}`;
    return /\.jpg$/i.test(name) ? url : `${url}#.jpg`;
  };

  useEffect(() => { loadFiles(); }, []);

  // Global mouseup to stop drag selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isShiftDraggingRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Teclado: Espacio = empaquetar, X = borrar la tarjeta bajo el ratón, Ctrl+Z = deshacer, Esc = limpiar selección.
  // El listener se registra una vez y llama a keyHandlerRef.current (siempre con el estado del último render).
  const keyHandlerRef = useRef(() => {});
  useEffect(() => {
    const handler = (e) => keyHandlerRef.current(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Filtros y búsqueda. Con un filtro activo no se puede empaquetar: el rango y las flechas trabajan
  // sobre la lista completa y se llevarían archivos que no se ven.
  const FILTERS = [
    { id: 'all', label: 'Todo' },
    { id: 'anchors', label: 'Assets' },
    { id: 'images', label: 'Imágenes' },
    { id: 'lonelyAssets', label: 'Assets sin foto', title: 'Assets sin ninguna imagen justo antes ni justo después' },
  ];
  const isLonelyAsset = (list, i) =>
    list[i].type === 'anchor' && list[i - 1]?.type !== 'image' && list[i + 1]?.type !== 'image';
  const filterCounts = useMemo(() => {
    let anchors = 0, lonelyAssets = 0;
    files.forEach((f, i) => {
      if (f.type === 'anchor') anchors++;
      if (isLonelyAsset(files, i)) lonelyAssets++;
    });
    return { all: files.length, anchors, images: files.length - anchors, lonelyAssets };
  }, [files]);
  const searchTerm = search.trim().toLowerCase();
  const isFiltering = filter !== 'all' || searchTerm !== '';
  const visibleFiles = useMemo(() => files.filter((f, i) => {
    if (filter === 'anchors' && f.type !== 'anchor') return false;
    if (filter === 'images' && f.type !== 'image') return false;
    if (filter === 'lonelyAssets' && !isLonelyAsset(files, i)) return false;
    return !searchTerm || f.name.toLowerCase().includes(searchTerm);
  }), [files, filter, searchTerm]);

  // Al activar un filtro se suelta la selección de empaquetado (no se puede empaquetar filtrando)
  useEffect(() => {
    if (isFiltering) {
      setSelectedAnchor(null);
      setSelectedFiles(new Set());
    }
  }, [isFiltering]);

  const loadFiles = async (reset = true) => {
    setLoading(true);
    try {
      // Lista entera de una vez (la grilla virtualizada aguanta miles de tarjetas); ya no hay "Cargar más".
      // El backend sigue aceptando el cursor `after` (pedir lo que va después del último nombre).
      const lastName = !reset && files.length ? files[files.length - 1].name : null;
      const cursor = lastName ? `after=${encodeURIComponent(lastName)}` : 'offset=0';
      const res = await http.getData(`/organizer/files?${cursor}&limit=${LOAD_LIMIT}`);
      const d = res.data || res;
      const newFiles = d.files || [];

      if (reset) {
        setFiles(newFiles);
        setSelectedAnchor(null);
        setSelectedFiles(new Set());
        setFilesToDelete(new Set());
      } else {
        setFiles(prev => [...prev, ...newFiles]);
      }
      setServerTotal(d.total || 0);
      setTotalAssets(d.totalAssets || 0);
      setTotalImages(d.totalImages || 0);
      notify(`${(reset ? 0 : files.length) + newFiles.length} de ${d.total} cargados.`, 'silent');
    } catch (e) {
      notify('Error cargando archivos', 'error');
    }
    setLoading(false);
  };

  const handleCardClick = (fileName, type) => {
    if (isFiltering) {
      notify('Quita el filtro o la búsqueda para empaquetar', 'warning');
      return;
    }
    if (!selectedAnchor && type === 'anchor') {
      setSelectedAnchor(fileName);
      setSelectedFiles(new Set());
    } else if (selectedAnchor === fileName) {
      setSelectedAnchor(null);
      setSelectedFiles(new Set());
    } else if (selectedAnchor) {
      const anchorIdx = files.findIndex(f => f.name === selectedAnchor);
      const clickedIdx = files.findIndex(f => f.name === fileName);
      if (anchorIdx === -1 || clickedIdx === -1) return;

      const newSelected = new Set();
      if (clickedIdx < anchorIdx) {
        for (let i = clickedIdx; i < anchorIdx; i++) newSelected.add(files[i].name);
      } else {
        for (let i = anchorIdx + 1; i <= clickedIdx; i++) newSelected.add(files[i].name);
      }
      setSelectedFiles(newSelected);
    } else {
      notify('Primero selecciona un asset (tarjeta naranja)', 'warning');
    }
  };

  const packageSelection = async () => {
    if (!selectedAnchor || packingRef.current || isFiltering) return;
    packingRef.current = true;
    const toMove = [selectedAnchor, ...Array.from(selectedFiles)];
    const items = files.filter(f => toMove.includes(f.name));
    notify('Empaquetando...', 'silent');
    try {
      const res = await http.postData('/organizer/package', { anchorName: selectedAnchor, filesToMove: toMove });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);

      setUndoStack(prev => [...prev.slice(-(MAX_UNDO - 1)), { type: 'package', destFolder: d.destFolder, mappings: d.mappings, items }]);
      setFiles(prev => prev.filter(f => !toMove.includes(f.name)));
      adjustTotals(items, -1);
      setSelectedAnchor(null);
      setSelectedFiles(new Set());
      notify(`${d.moved} archivos → "${d.folder}"`, 'success');
    } catch (e) {
      notify('Error empaquetando: ' + e.message, 'error');
    } finally {
      packingRef.current = false;
    }
  };

  const quickPackage = async (anchorName, side, e) => {
    e.stopPropagation();
    if (packingRef.current || isFiltering) return;
    const anchorIdx = files.findIndex(f => f.name === anchorName);
    if (anchorIdx === -1) return;

    const toMove = [anchorName];
    if (side === 'left') {
      for (let i = anchorIdx - 1; i >= 0; i--) {
        if (files[i].type === 'anchor') break;
        toMove.push(files[i].name);
      }
    } else {
      for (let i = anchorIdx + 1; i < files.length; i++) {
        if (files[i].type === 'anchor') break;
        toMove.push(files[i].name);
      }
    }

    const items = files.filter(f => toMove.includes(f.name));
    packingRef.current = true;
    notify(`Empaquetando exprés (${side})...`, 'silent');
    try {
      const res = await http.postData('/organizer/package', { anchorName, filesToMove: toMove });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);

      setUndoStack(prev => [...prev.slice(-(MAX_UNDO - 1)), { type: 'package', destFolder: d.destFolder, mappings: d.mappings, items }]);
      setFiles(prev => prev.filter(f => !toMove.includes(f.name)));
      adjustTotals(items, -1);
      if (selectedAnchor === anchorName) { setSelectedAnchor(null); setSelectedFiles(new Set()); }
      notify(`${d.moved} archivos → "${d.folder}"`, 'success');
    } catch (e) {
      notify('Error exprés: ' + e.message, 'error');
    } finally {
      packingRef.current = false;
    }
  };

  // Mismo orden que el backend (organizer.routes.js) para devolver archivos a su sitio
  const compareNames = (a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }) || (a < b ? -1 : a > b ? 1 : 0);

  // Mantiene al día los contadores (Total, Assets, Imágenes) al quitar (-1) o devolver (+1) archivos
  const adjustTotals = (items, sign) => {
    const assets = items.filter(f => f.type === 'anchor').length;
    setServerTotal(prev => prev + sign * items.length);
    setTotalAssets(prev => prev + sign * assets);
    setTotalImages(prev => prev + sign * (items.length - assets));
  };

  // Devuelve archivos a la grilla en su posición. Los que caen después del último cargado (con más
  // páginas pendientes) no se insertan: llegarán con "Cargar más" y así el cursor `after` no salta nada.
  const restoreToGrid = (items) => {
    if (items.length === 0) return;
    const morePages = serverTotal > files.length;
    setFiles(prev => {
      const present = new Set(prev.map(f => f.name));
      const last = prev.length ? prev[prev.length - 1].name : null;
      const toAdd = items.filter(f => !present.has(f.name) && (!morePages || !last || compareNames(f.name, last) < 0));
      return [...prev, ...toAdd].sort((x, y) => compareNames(x.name, y.name));
    });
    adjustTotals(items, +1);
  };

  // Borrado optimista: se quita de la grilla al instante y el servidor borra en segundo plano
  // (una sola petición). Lo que falle vuelve a la grilla con aviso. La entrada de Deshacer lleva
  // `ready`, que resuelve con lo realmente borrado, para que Deshacer espere al servidor.
  const deleteOptimistic = (names) => {
    if (names.length === 0) return;
    const nameSet = new Set(names);
    const removed = files.filter(f => nameSet.has(f.name));

    setFiles(prev => prev.filter(f => !nameSet.has(f.name)));
    adjustTotals(removed, -1);
    if (nameSet.has(selectedAnchor)) {
      setSelectedAnchor(null);
      setSelectedFiles(new Set());
    }
    setFilesToDelete(prev => {
      const next = new Set(prev);
      names.forEach(n => next.delete(n));
      return next;
    });
    notify(names.length === 1 ? `Archivo "${names[0]}" borrado.` : `${names.length} archivos borrados.`, 'success');

    const ready = http.postData('/organizer/delete-files', { fileNames: names })
      .then(res => {
        const d = res.data || res;
        return { deleted: d.deleted || [], failed: (d.failed || []).map(f => f.name) };
      })
      .catch(err => {
        console.error('Error en borrado:', err);
        return { deleted: [], failed: names };
      })
      .then(({ deleted, failed }) => {
        if (failed.length > 0) {
          const failedSet = new Set(failed);
          restoreToGrid(removed.filter(f => failedSet.has(f.name)));
          notify(`No se pudieron borrar ${failed.length} archivo(s); han vuelto a la grilla.`, 'error');
        }
        return deleted;
      });

    setUndoStack(prev => [...prev.slice(-(MAX_UNDO - 1)), { type: 'delete', files: names, ready, items: removed }]);
  };

  const quickDelete = (fileName, e) => {
    e.stopPropagation();
    deleteOptimistic([fileName]);
  };

  const deleteSelected = () => {
    deleteOptimistic(Array.from(filesToDelete));
  };

  // Purgar abre una ventana propia: hay que escribir PURGAR (antes bastaba un confirm() con Enter)
  const purgeFolder = () => {
    setPurgeText('');
    setPurgeOpen(true);
  };

  const confirmPurge = async () => {
    if (purgeText !== 'PURGAR') return;
    setPurgeOpen(false);
    notify('Purgando carpeta...', 'silent');
    try {
      const res = await http.deleteRaw('/organizer/purge?confirm=PURGAR');
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setFiles([]);
      setServerTotal(0);
      setTotalAssets(0);
      setTotalImages(0);
      setSelectedAnchor(null);
      setSelectedFiles(new Set());
      setFilesToDelete(new Set());
      setUndoStack([]);
      notify('Carpeta purgada correctamente.', 'success');
    } catch (e) {
      notify('Error al purgar: ' + e.message, 'error');
    }
  };

  const undoLast = async () => {
    if (undoStack.length === 0 || undoBusyRef.current) return;
    undoBusyRef.current = true;
    const { ready, items = [], ...action } = undoStack[undoStack.length - 1];
    try {
      if (ready) {
        // Esperar a que termine el borrado y deshacer solo lo que de verdad se borró
        action.files = await ready;
        if (action.files.length === 0) {
          setUndoStack(prev => prev.slice(0, -1));
          notify('Nada que deshacer: ese borrado no llegó a hacerse.', 'warning');
          return;
        }
      }
      const res = await http.postData('/organizer/undo', action);
      const d = res.data || res;
      setUndoStack(prev => prev.slice(0, -1));
      // Sin recargar: devolver a la grilla solo lo restaurado (se conserva scroll, lo cargado y la selección)
      const restored = new Set(d.restored || []);
      restoreToGrid(items.filter(f => restored.has(f.name)));
      notify(`Acción deshecha (${restored.size} archivos restaurados).`, 'success');
    } catch (e) {
      notify('Error al deshacer', 'error');
    } finally {
      undoBusyRef.current = false;
    }
  };

  const toggleDelete = (fileName, checked, e) => {
    // Si se presiona Shift y existe un elemento previamente seleccionado/deseleccionado
    if (e && e.nativeEvent && e.nativeEvent.shiftKey && lastCheckedName) {
      const startIdx = visibleFiles.findIndex(f => f.name === lastCheckedName);
      const endIdx = visibleFiles.findIndex(f => f.name === fileName);
      
      if (startIdx !== -1 && endIdx !== -1) {
        const [minIdx, maxIdx] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        
        setFilesToDelete(prev => {
          const next = new Set(prev);
          for (let i = minIdx; i <= maxIdx; i++) {
            const fName = visibleFiles[i].name;
            if (checked) {
              next.add(fName);
            } else {
              next.delete(fName);
            }
          }
          return next;
        });
        setLastCheckedName(fileName);
        return;
      }
    }

    // Comportamiento normal (un solo clic)
    setFilesToDelete(prev => {
      const next = new Set(prev);
      checked ? next.add(fileName) : next.delete(fileName);
      return next;
    });
    setLastCheckedName(fileName);
  };

  const toggleSelectAll = () => {
    if (filesToDelete.size > 0) setFilesToDelete(new Set());
    else setFilesToDelete(new Set(visibleFiles.map(f => f.name)));
  };

  const selectOnlyImages = () => {
    const images = visibleFiles.filter(f => f.type === 'image');
    if (images.length === 0) {
      notify('No hay imágenes en la lista actual', 'warning');
      return;
    }
    setFilesToDelete(new Set(images.map(f => f.name)));
    notify(`Seleccionadas ${images.length} imágenes para borrar.`, 'info');
  };

  const selectOnlyNonAnchors = () => {
    const nonAnchors = visibleFiles.filter(f => f.type !== 'anchor');
    if (nonAnchors.length === 0) {
      notify('No hay archivos sueltos en la lista actual', 'warning');
      return;
    }
    setFilesToDelete(new Set(nonAnchors.map(f => f.name)));
    notify(`Seleccionados ${nonAnchors.length} archivos sueltos para borrar.`, 'info');
  };



  // ── Grilla virtualizada ──
  // Las tarjetas reciben un objeto de acciones estable que delega en los handlers del render actual,
  // así OrganizerCard (memo) solo se repinta cuando cambian sus propias props.
  const handlersRef = useRef({});
  handlersRef.current = {
    onCardClick: (file, e) => {
      if (e.shiftKey) return;
      handleCardClick(file.name, file.type);
    },
    onCardMouseDown: (file, e) => {
      if (!e.shiftKey) return;
      e.preventDefault(); // prevent native ghost drag & text selection
      const mode = filesToDelete.has(file.name) ? 'deselect' : 'select';
      dragSelectModeRef.current = mode;
      isShiftDraggingRef.current = true;
      setFilesToDelete(prev => {
        const next = new Set(prev);
        mode === 'select' ? next.add(file.name) : next.delete(file.name);
        return next;
      });
      setLastCheckedName(file.name);
    },
    onCardMouseEnter: (file) => {
      hoveredRef.current = file.name;
      if (!isShiftDraggingRef.current) return;
      const mode = dragSelectModeRef.current;
      setFilesToDelete(prev => {
        const next = new Set(prev);
        mode === 'select' ? next.add(file.name) : next.delete(file.name);
        return next;
      });
      setLastCheckedName(file.name);
    },
    onToggleDelete: (file, e) => {
      e.stopPropagation();
      toggleDelete(file.name, !filesToDelete.has(file.name), e);
    },
    onQuickDelete: (file, e) => quickDelete(file.name, e),
    onPreview: (file, e) => {
      e.stopPropagation();
      setPreviewImage(imageUrl(file.name));
    },
    onCardMouseLeave: (file) => {
      if (hoveredRef.current === file.name) hoveredRef.current = null;
    },
    onQuickPack: (file, side, e) => quickPackage(file.name, side, e),
  };

  keyHandlerRef.current = (e) => {
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
    if (purgeOpen || previewImage || showExplorer) return; // con un diálogo abierto, los atajos no actúan
    const key = e.key.toLowerCase();

    if (e.code === 'Space' && selectedAnchor) {
      e.preventDefault();
      packageSelection();
    } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === 'z') {
      e.preventDefault();
      undoLast();
    } else if (e.key === 'Escape') {
      if (selectedAnchor || filesToDelete.size > 0) {
        setSelectedAnchor(null);
        setSelectedFiles(new Set());
        setFilesToDelete(new Set());
        notify('Selección limpiada', 'info');
      }
    } else if (key === 'x' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const name = hoveredRef.current;
      if (name && files.some(f => f.name === name)) {
        e.preventDefault();
        hoveredRef.current = null;
        deleteOptimistic([name]);
      }
    }
  };
  const cardActions = useMemo(() => {
    const call = (name) => (...args) => handlersRef.current[name](...args);
    return {
      onCardClick: call('onCardClick'),
      onCardMouseDown: call('onCardMouseDown'),
      onCardMouseEnter: call('onCardMouseEnter'),
      onCardMouseLeave: call('onCardMouseLeave'),
      onToggleDelete: call('onToggleDelete'),
      onQuickDelete: call('onQuickDelete'),
      onPreview: call('onPreview'),
      onQuickPack: call('onQuickPack'),
    };
  }, []);

  const scrollRef = useRef(null);
  const gridRef = useRef(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(null);

  // Ancho disponible -> número de columnas (mismo criterio que auto-fill minmax(160px, 1fr))
  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    setGridWidth(el.clientWidth); // medida inicial directa, sin esperar al primer aviso del observer
    const ro = new ResizeObserver(([entry]) => setGridWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fuera del modo revisión la grilla necesita su propio scroll: ocupa lo que queda de pantalla
  useLayoutEffect(() => {
    if (isReviewMode) { setScrollHeight(null); return; }
    const measure = () => {
      const el = scrollRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      setScrollHeight(Math.max(400, window.innerHeight - top - 16));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isReviewMode]);

  const columns = Math.max(1, Math.floor((gridWidth + GRID_GAP) / (CARD_MIN_WIDTH + GRID_GAP)));
  const rowCount = Math.ceil(visibleFiles.length / columns);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CARD_HEIGHT + GRID_GAP,
    overscan: 6, // filas extra montadas arriba/abajo: las fotos ya están cargadas al llegar con el scroll
  });

  return (
    <div className={`telegram-organizer ${isReviewMode ? 'review-mode' : ''}`}>
      {!isReviewMode && (
        <div className="header">
          <div>
            <h1>📦 Telegram Organizer</h1>
            <p>Organiza los archivos descargados en carpetas para el Batch Upload.</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={() => setIsReviewMode(true)}>
              <FullscreenIcon fontSize="small" /> Modo revisión
            </button>
            <button className="btn btn-secondary" onClick={() => setShowExplorer(true)}>
              <FolderIcon fontSize="small" /> Explorador de archivos
            </button>
            <button className="btn btn-secondary" onClick={() => loadFiles(true)} disabled={loading}>
              {loading ? 'Cargando...' : '⟳ Recargar'}
            </button>
            {serverTotal > 0 && (
              <button className="btn btn-purge" onClick={purgeFolder} title="Borra TODOS los archivos sueltos de la carpeta, sin vuelta atrás">
                ☠️ Purgar carpeta
              </button>
            )}
          </div>
        </div>
      )}

      <Dialog open={showExplorer} onClose={() => setShowExplorer(false)} maxWidth="xl" fullWidth PaperProps={{ sx: { bgcolor: '#0f172a', m: 2 } }}>
        <FileExplorer initialPath="/telegram_downloads_organized" isModal onClose={() => setShowExplorer(false)} />
      </Dialog>

      {/* Una sola barra (estadísticas + acciones) para los dos modos; el modo revisión añade Purgar y Salir */}
      <div className={isReviewMode ? 'header-review' : 'toolbar'}>
        <div className="stats-bar">
          <div className="stat">Assets:<span>{totalAssets}</span></div>
          <div className="stat">Imágenes:<span>{totalImages}</span></div>
          <div className="stat">Total:<span>{serverTotal}</span></div>
          <div className="stat">{isFiltering ? 'Mostrando:' : 'Cargados:'}<span>{visibleFiles.length}</span></div>
        </div>

        <div className="actions-bar">
          <button className="btn btn-package" onClick={packageSelection} disabled={!selectedAnchor}>
            ▶ Empaquetar
          </button>
          {files.length > 0 && (
            <>
              <button className="btn btn-secondary" onClick={toggleSelectAll}>
                {filesToDelete.size > 0 ? '🚫 Desmarcar' : '✅ Sel. Todo'}
              </button>
              <button className="btn btn-secondary" onClick={selectOnlyImages} title="Seleccionar solo imágenes para borrar">
                🖼️ Sel. Imágenes
              </button>
              <button className="btn btn-secondary" onClick={selectOnlyNonAnchors} title="Seleccionar todo excepto archivos base (ASSETS)">
                🍃 Sel. Sueltos
              </button>
            </>
          )}
          {filesToDelete.size > 0 && (
            <button className="btn btn-delete" onClick={deleteSelected}>
              🗑️ Borrar ({filesToDelete.size})
            </button>
          )}
          {undoStack.length > 0 && (
            <button className="btn btn-undo" onClick={undoLast}>
              ↩️ Deshacer ({undoStack.length})
            </button>
          )}
        </div>

        {isReviewMode && (
          <>
            {serverTotal > 0 && (
              <button className="btn btn-purge purge-review" onClick={purgeFolder} title="Borra TODOS los archivos sueltos de la carpeta, sin vuelta atrás">
                ☠️ Purgar
              </button>
            )}
            <button className="btn btn-exit" onClick={() => setIsReviewMode(false)}>
              <FullscreenExitIcon fontSize="small" /> Salir
            </button>
          </>
        )}
      </div>

      <div className="filter-bar">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`chip ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
            title={f.title}
          >
            {f.label} <span>{filterCounts[f.id]}</span>
          </button>
        ))}
        <input
          className="search"
          type="search"
          placeholder="Buscar por nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setSearch(''); e.currentTarget.blur(); } }}
        />
        {isFiltering && <span className="filter-note">Filtro activo: empaquetar desactivado</span>}
        <span className="legend">
          <span><i className="l-anchor" />Asset elegido</span>
          <span><i className="l-pack" />Se empaqueta</span>
          <span><i className="l-delete" />Para borrar</span>
        </span>
        <span className="shortcuts-hint" title="Atajos de teclado">
          ⌨️ <b>Espacio</b> empaquetar · <b>X</b> borrar (ratón encima) · <b>Ctrl+Z</b> deshacer · <b>Esc</b> limpiar
        </span>
      </div>

      <div className="scroll-area" ref={scrollRef} style={scrollHeight ? { height: scrollHeight, overflowY: 'auto' } : undefined}>
        <div ref={gridRef} style={{ position: 'relative', height: rowVirtualizer.getTotalSize() }}>
          {rowVirtualizer.getVirtualItems().map(row => (
            <div
              key={row.key}
              className="grid"
              style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                transform: `translateY(${row.start}px)`,
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {visibleFiles.slice(row.index * columns, row.index * columns + columns).map(file => (
                <OrganizerCard
                  key={file.name}
                  file={file}
                  isSelectedAnchor={selectedAnchor === file.name}
                  isSelectedFile={selectedFiles.has(file.name)}
                  isToDelete={filesToDelete.has(file.name)}
                  imageSrc={file.type === 'image' ? imageUrl(file.name) : undefined}
                  canPack={!isFiltering}
                  actions={cardActions}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <Dialog 
        open={!!previewImage} 
        onClose={() => setPreviewImage(null)} 
        maxWidth="lg" 
        PaperProps={{ 
          sx: { 
            background: 'transparent', 
            boxShadow: 'none',
            maxWidth: '95vw',
            maxHeight: '95vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            margin: 0
          } 
        }}
      >
        {previewImage && (
          <Box 
            onClick={() => setPreviewImage(null)} 
            sx={{ 
              cursor: 'zoom-out', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              width: '100%',
              height: '100%',
              overflow: 'hidden' 
            }}
          >
            <img 
              src={previewImage} 
              alt="Preview" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '90vh', 
                width: 'auto',
                height: 'auto',
                objectFit: 'contain', 
                borderRadius: '8px' 
              }} 
            />
          </Box>
        )}
      </Dialog>

      <Dialog open={purgeOpen} onClose={() => setPurgeOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: '#1a1020', color: '#fff', border: '1px solid rgba(239, 68, 68, 0.5)' } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#f87171' }}>☠️ Purgar carpeta de Telegram</DialogTitle>
        <DialogContent>
          <p style={{ margin: '0 0 10px', lineHeight: 1.5 }}>
            Vas a borrar <b>{serverTotal.toLocaleString('es')} archivos</b> ({totalAssets.toLocaleString('es')} assets y {totalImages.toLocaleString('es')} imágenes),
            también los que no tienes cargados en pantalla.
          </p>
          <p style={{ margin: '0 0 14px', lineHeight: 1.5, color: '#fca5a5' }}>
            También se vacía la papelera: <b>no se podrá deshacer</b>.
          </p>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Escribe PURGAR para confirmar"
            value={purgeText}
            onChange={(e) => setPurgeText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmPurge(); }}
            sx={{ input: { color: '#fff' }, '& .MuiOutlinedInput-root fieldset': { borderColor: 'rgba(255,255,255,0.25)' } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPurgeOpen(false)} sx={{ color: '#cbd5e0', textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" color="error" disabled={purgeText !== 'PURGAR'} onClick={confirmPurge} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Purgar {serverTotal.toLocaleString('es')} archivos
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════ ORGANIZER FLOATING ALERTS ═══════════ */}
      {organizerAlerts.length > 0 && (
        <Box sx={{
          position: 'fixed',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
          maxWidth: 480,
          width: '90vw',
        }}>
          {organizerAlerts.map((alert) => {
            const borderClr = {
              success: 'rgba(34, 197, 94, 0.55)',
              error: 'rgba(239, 68, 68, 0.6)',
              warning: 'rgba(245, 158, 11, 0.6)',
            }[alert.type] || 'rgba(255, 255, 255, 0.2)';
            const icon = { success: '✅', error: '⛔', warning: '⚠️' }[alert.type] || 'ℹ️';

            return (
              <Box
                key={alert.id}
                sx={{
                  px: 1.8,
                  py: 0.75,
                  borderRadius: 1.5,
                  background: 'rgba(15, 23, 42, 0.98)', // Slate-900 oscuro
                  border: '1px solid',
                  borderColor: borderClr,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.75rem', // Más pequeña
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(8px)',
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                <span>{icon}</span>
                <Box sx={{ flex: 1, whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.35 }}>
                  {alert.msg}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </div>
  );
}
