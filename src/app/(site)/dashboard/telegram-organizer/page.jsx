'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import HttpService from '@/services/HttpService';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { Button, Dialog, Box } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FileExplorer from '@/components/dashboard/FileExplorer/FileExplorer';
import './TelegramOrganizer.scss';

const PAGE_SIZE = 400;
const MAX_UNDO = 5;

export default function TelegramOrganizer() {
  const [files, setFiles] = useState([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [showExplorer, setShowExplorer] = useState(false);

  // Stats
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [offset, setOffset] = useState(0);

  const [selectedAnchor, setSelectedAnchor] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [filesToDelete, setFilesToDelete] = useState(new Set());
  const [lastCheckedName, setLastCheckedName] = useState(null);
  const [undoStack, setUndoStack] = useState([]);

  const isShiftDraggingRef = useRef(false);
  const dragSelectModeRef = useRef('select');
  
  // Interceptador premium de status para alertas flotantes
  const [status, setStatusState] = useState('');
  const [organizerAlerts, setOrganizerAlerts] = useState([]);

  const setStatus = useCallback((msg) => {
    setStatusState(msg || '');
    if (!msg) return;

    const msgLower = msg.toLowerCase();
    
    // Omitir alertas de cargados o estados de carga transitorios (empaquetando, borrando, purgando)
    if (msgLower.includes('cargados') || msgLower.includes('empaquetando') || msgLower.includes('borrando') || msgLower.includes('purgando')) {
      return;
    }

    let type = 'info';
    if (msg.includes('✅') || msg.includes('⚡') || msgLower.includes('correctamente') || msgLower.includes('borrados') || msgLower.includes('deshecha')) {
      type = 'success';
    } else if (msgLower.includes('error') || msg.includes('⚠️')) {
      type = 'error';
    }

    const alertId = `org-${Date.now()}-${Math.random()}`;
    
    // Mostrar ÚNICAMENTE la última alerta de acción real (evita apilamientos e invasión de la UI)
    setOrganizerAlerts([
      { id: alertId, msg, type }
    ]);
    
    setTimeout(() => {
      setOrganizerAlerts(prev => prev.filter(a => a.id !== alertId));
    }, 4000);
  }, []);

  const [loading, setLoading] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const http = new HttpService();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

  useEffect(() => { loadFiles(); }, []);

  // Global mouseup to stop drag selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isShiftDraggingRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Keyboard: Space = package
  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && selectedAnchor) {
        e.preventDefault();
        packageSelection();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedAnchor, selectedFiles, files]);

  const loadFiles = async (reset = true) => {
    setLoading(true);
    try {
      const newOffset = reset ? 0 : offset;
      const res = await http.getData(`/organizer/files?offset=${newOffset}&limit=${PAGE_SIZE}`);
      const d = res.data || res;

      if (reset) {
        setFiles(d.files || []);
        setOffset(d.files?.length || 0);
        setSelectedAnchor(null);
        setSelectedFiles(new Set());
        setFilesToDelete(new Set());
      } else {
        setFiles(prev => [...prev, ...(d.files || [])]);
        setOffset(prev => prev + (d.files?.length || 0));
      }
      setServerTotal(d.total || 0);
      setTotalAssets(d.totalAssets || 0);
      setTotalImages(d.totalImages || 0);
      setStatus(`${reset ? d.files?.length : offset + d.files?.length} de ${d.total} cargados.`);
    } catch (e) {
      setStatus('Error cargando archivos');
    }
    setLoading(false);
  };

  const handleCardClick = (fileName, type) => {
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
      setStatus('⚠️ Primero selecciona un Archivo Principal (Caja Naranja)');
    }
  };

  const packageSelection = async () => {
    if (!selectedAnchor) return;
    const toMove = [selectedAnchor, ...Array.from(selectedFiles)];
    setStatus('Empaquetando...');
    try {
      const res = await http.postData('/organizer/package', { anchorName: selectedAnchor, filesToMove: toMove });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);

      setUndoStack(prev => [...prev.slice(-(MAX_UNDO - 1)), { type: 'package', destFolder: d.destFolder, mappings: d.mappings }]);
      setFiles(prev => prev.filter(f => !toMove.includes(f.name)));
      setServerTotal(prev => prev - toMove.length);
      setSelectedAnchor(null);
      setSelectedFiles(new Set());
      setStatus(`✅ ${d.moved} archivos → "${d.folder}"`);
    } catch (e) {
      setStatus('Error empaquetando: ' + e.message);
    }
  };

  const quickPackage = async (anchorName, side, e) => {
    e.stopPropagation();
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

    setStatus(`Empaquetando exprés (${side})...`);
    try {
      const res = await http.postData('/organizer/package', { anchorName, filesToMove: toMove });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);

      setUndoStack(prev => [...prev.slice(-(MAX_UNDO - 1)), { type: 'package', destFolder: d.destFolder, mappings: d.mappings }]);
      setFiles(prev => prev.filter(f => !toMove.includes(f.name)));
      setServerTotal(prev => prev - toMove.length);
      if (selectedAnchor === anchorName) { setSelectedAnchor(null); setSelectedFiles(new Set()); }
      setStatus(`⚡ ${d.moved} archivos → "${d.folder}"`);
    } catch (e) {
      setStatus('Error exprés: ' + e.message);
    }
  };

  const quickDelete = async (fileName, e) => {
    e.stopPropagation();
    
    // 1. Optimistic UI updates
    setFiles(prev => prev.filter(f => f.name !== fileName));
    setServerTotal(prev => prev - 1);
    if (selectedAnchor === fileName) {
      setSelectedAnchor(null);
      setSelectedFiles(new Set());
    }

    // 2. Add to undo stack and status immediately
    setUndoStack(prev => [...prev.slice(-(MAX_UNDO - 1)), { type: 'delete', files: [fileName] }]);
    setStatus(`✅ Archivo "${fileName}" borrado.`);

    try {
      // 3. Process backend deletion in background
      await http.postData('/organizer/delete-file', { fileName });
    } catch (err) {
      console.error(err);
      setStatus(`⚠️ No se pudo borrar "${fileName}".`);
    }
  };

  const deleteSelected = async () => {
    const toDelete = Array.from(filesToDelete);

    // 1. Optimistic UI updates
    setFiles(prev => prev.filter(f => !filesToDelete.has(f.name)));
    setServerTotal(prev => prev - filesToDelete.size);
    if (filesToDelete.has(selectedAnchor)) {
      setSelectedAnchor(null);
      setSelectedFiles(new Set());
    }
    setFilesToDelete(new Set());

    // 2. Add to undo stack and status immediately
    setUndoStack(prev => [...prev.slice(-(MAX_UNDO - 1)), { type: 'delete', files: toDelete }]);
    setStatus(`✅ ${toDelete.length} archivos borrados correctamente.`);

    try {
      // 3. Parallel backend requests in background
      await Promise.all(toDelete.map(async (fileName) => {
        try {
          await http.postData('/organizer/delete-file', { fileName });
        } catch (err) {
          console.error(`Error al borrar ${fileName}:`, err);
        }
      }));
    } catch (e) {
      console.error('Error en borrado masivo:', e);
    }
  };

  const purgeFolder = async () => {
    if (!confirm('🚨 ¿Estás seguro? Esto eliminará TODOS los archivos sueltos en la carpeta de Telegram Downloads que no han sido empaquetados. Esta acción no se puede deshacer.')) return;
    setStatus('Purgando carpeta...');
    try {
      const res = await http.deleteRaw('/organizer/purge');
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setFiles([]);
      setServerTotal(0);
      setSelectedAnchor(null);
      setSelectedFiles(new Set());
      setFilesToDelete(new Set());
      setUndoStack([]);
      setStatus('Carpeta purgada correctamente.');
    } catch (e) {
      setStatus('Error al purgar: ' + e.message);
    }
  };

  const undoLast = async () => {
    if (undoStack.length === 0) return;
    const action = undoStack[undoStack.length - 1];
    try {
      await http.postData('/organizer/undo', action);
      setUndoStack(prev => prev.slice(0, -1));
      setStatus('✅ Acción deshecha.');
      loadFiles();
    } catch (e) {
      setStatus('Error al deshacer');
    }
  };

  const toggleDelete = (fileName, checked, e) => {
    // Si se presiona Shift y existe un elemento previamente seleccionado/deseleccionado
    if (e && e.nativeEvent && e.nativeEvent.shiftKey && lastCheckedName) {
      const startIdx = files.findIndex(f => f.name === lastCheckedName);
      const endIdx = files.findIndex(f => f.name === fileName);
      
      if (startIdx !== -1 && endIdx !== -1) {
        const [minIdx, maxIdx] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        
        setFilesToDelete(prev => {
          const next = new Set(prev);
          for (let i = minIdx; i <= maxIdx; i++) {
            const fName = files[i].name;
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
    else setFilesToDelete(new Set(files.map(f => f.name)));
  };

  const selectOnlyImages = () => {
    const images = files.filter(f => f.type === 'image');
    if (images.length === 0) {
      setStatus('⚠️ No hay imágenes en la lista actual');
      return;
    }
    setFilesToDelete(new Set(images.map(f => f.name)));
    setStatus(`✅ Seleccionadas ${images.length} imágenes para borrar.`);
  };

  const selectOnlyNonAnchors = () => {
    const nonAnchors = files.filter(f => f.type !== 'anchor');
    if (nonAnchors.length === 0) {
      setStatus('⚠️ No hay archivos sueltos en la lista actual');
      return;
    }
    setFilesToDelete(new Set(nonAnchors.map(f => f.name)));
    setStatus(`✅ Seleccionados ${nonAnchors.length} archivos sueltos para borrar.`);
  };

  const remaining = serverTotal - offset;

  const getStatusClass = () => {
    if (!status) return '';
    const stLower = status.toLowerCase();
    if (status.includes('✅') || status.includes('⚡') || stLower.includes('correctamente') || stLower.includes('borrados')) {
      return 'status-success';
    }
    if (stLower.includes('error') || status.includes('⚠️')) {
      return 'status-error';
    }
    if (stLower.includes('empaquetando') || stLower.includes('borrando') || stLower.includes('purgando')) {
      return 'status-loading';
    }
    return 'status-info';
  };

  return (
    <div className={`telegram-organizer ${isReviewMode ? 'review-mode' : ''}`}>
      {!isReviewMode && (
        <div className="header">
          <div>
            <h1>📦 Telegram Organizer</h1>
            <p>Organiza los archivos descargados en carpetas para el Batch Upload.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {files.length > 0 && (
              <Button
                variant="contained"
                color="error"
                onClick={purgeFolder}
              >
                ☠️ Purgar Carpeta
              </Button>
            )}
            <Button
              variant="outlined"
              color="info"
              onClick={() => setIsReviewMode(true)}
              startIcon={<FullscreenIcon />}
            >
              Modo Revisión
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setShowExplorer(true)}
              startIcon={<FolderIcon />}
              sx={{ ml: 1, textTransform: 'none', fontWeight: 600 }}
            >
              Explorador de Archivos
            </Button>
            <button className="btn btn-secondary" onClick={() => loadFiles(true)} disabled={loading} style={{ marginLeft: '8px' }}>
              {loading ? 'Cargando...' : 'Recargar'}
            </button>
          </div>
        </div>
      )}

      <Dialog open={showExplorer} onClose={() => setShowExplorer(false)} maxWidth="xl" fullWidth PaperProps={{ sx: { bgcolor: '#0f172a', m: 2 } }}>
        <FileExplorer initialPath="/telegram_downloads_organized" isModal onClose={() => setShowExplorer(false)} />
      </Dialog>

      {isReviewMode ? (
        <div className="header-review">
          <div className="stats-bar">
            <div className="stat">Assets:<span>{totalAssets}</span></div>
            <div className="stat">Imágenes:<span>{totalImages}</span></div>
            <div className="stat">Total:<span>{serverTotal}</span></div>
            <div className="stat">Cargados:<span>{files.length}</span></div>
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
            {files.length > 0 && (
              <button className="btn btn-delete" style={{ marginLeft: 'auto', backgroundColor: '#dc2626' }} onClick={purgeFolder}>
                ☠️ Purgar
              </button>
            )}
          </div>

          <Button
            size="small"
            variant="contained"
            onClick={() => setIsReviewMode(false)}
            startIcon={<FullscreenExitIcon />}
            sx={{
              position: 'fixed',
              top: 12,
              right: 16,
              zIndex: 9999,
              bgcolor: 'rgba(239, 68, 68, 0.85)',
              color: '#fff',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
              textTransform: 'none',
              '&:hover': {
                bgcolor: 'rgba(220, 38, 38, 0.95)',
              },
            }}
          >
            Salir
          </Button>
        </div>
      ) : (
        <>
          <div className="stats-bar">
            <div className="stat">Assets:<span>{totalAssets}</span></div>
            <div className="stat">Imágenes:<span>{totalImages}</span></div>
            <div className="stat">Total:<span>{serverTotal}</span></div>
            <div className="stat">Cargados:<span>{files.length}</span></div>
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
        </>
      )}

      <div className="scroll-area">
        <div className="grid">
          {files.map(file => (
            <div
              key={file.name}
              className={`card ${file.type === 'anchor' ? 'anchor' : ''} ${selectedAnchor === file.name ? 'selected-anchor' : ''} ${selectedFiles.has(file.name) ? 'selected-file' : ''} ${filesToDelete.has(file.name) ? 'to-delete' : ''}`}
              onClick={(e) => {
                if (e.shiftKey) return;
                handleCardClick(file.name, file.type);
              }}
              onMouseDown={(e) => {
                if (e.shiftKey) {
                  e.preventDefault(); // prevent native ghost drag & text selection
                  const isChecked = filesToDelete.has(file.name);
                  const mode = isChecked ? 'deselect' : 'select';
                  dragSelectModeRef.current = mode;
                  isShiftDraggingRef.current = true;

                  setFilesToDelete(prev => {
                    const next = new Set(prev);
                    if (mode === 'select') {
                      next.add(file.name);
                    } else {
                      next.delete(file.name);
                    }
                    return next;
                  });
                  setLastCheckedName(file.name);
                }
              }}
              onMouseEnter={() => {
                if (isShiftDraggingRef.current) {
                  const mode = dragSelectModeRef.current;
                  setFilesToDelete(prev => {
                    const next = new Set(prev);
                    if (mode === 'select') {
                      next.add(file.name);
                    } else {
                      next.delete(file.name);
                    }
                    return next;
                  });
                  setLastCheckedName(file.name);
                }
              }}
            >
              <input
                type="checkbox"
                className="del-check"
                checked={filesToDelete.has(file.name)}
                onChange={() => {}}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDelete(file.name, !filesToDelete.has(file.name), e);
                }}
              />
              <button className="delete-btn-quick" title="Eliminar" onClick={(e) => quickDelete(file.name, e)}>🗑️</button>
              {file.type === 'image' && (
                <button 
                  className="preview-btn-quick" 
                  title="Ver en grande" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewImage(`${apiBase}/api/organizer/image?name=${encodeURIComponent(file.name)}`);
                  }}
                >
                  <VisibilityIcon fontSize="small" />
                </button>
              )}

              {file.type === 'anchor' && (
                <>
                  <button className="quick-pack left" title="Pack ←" onClick={(e) => quickPackage(file.name, 'left', e)}>⬅️</button>
                  <button className="quick-pack right" title="Pack →" onClick={(e) => quickPackage(file.name, 'right', e)}>➡️</button>
                  <div className="badge">ASSET</div>
                </>
              )}

              <div className="card-img">
                {file.type === 'image' ? (
                  <img 
                    src={`${apiBase}/api/organizer/image?name=${encodeURIComponent(file.name)}`} 
                    loading="lazy" 
                    alt={file.name} 
                    draggable="false" 
                  />
                ) : (
                  file.isCompressed ? '📚' : '🗿'
                )}
              </div>
              <div className="card-name">{file.name}</div>
            </div>
          ))}
        </div>

        {remaining > 0 && (
          <div className="load-more">
            <button className="btn btn-load" onClick={() => loadFiles(false)} disabled={loading}>
              📦 Cargar {Math.min(remaining, PAGE_SIZE)} Más ({remaining} restantes)
            </button>
          </div>
        )}
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
            const isSuccess = alert.type === 'success';
            const isError = alert.type === 'error';

            // Tono oscuro premium con bordes de color sutiles
            const borderClr = isSuccess
              ? 'rgba(34, 197, 94, 0.45)'
              : isError
              ? 'rgba(239, 68, 68, 0.45)'
              : 'rgba(255, 255, 255, 0.2)';

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
