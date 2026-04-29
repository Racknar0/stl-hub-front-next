'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import HttpService from '@/services/HttpService';
import './TelegramOrganizer.scss';

const PAGE_SIZE = 200;
const MAX_UNDO = 5;

export default function TelegramOrganizer() {
  const [files, setFiles] = useState([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [offset, setOffset] = useState(0);

  const [selectedAnchor, setSelectedAnchor] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [filesToDelete, setFilesToDelete] = useState(new Set());
  const [undoStack, setUndoStack] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const http = new HttpService();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

  useEffect(() => { loadFiles(); }, []);

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
    try {
      await http.postData('/organizer/delete-file', { fileName });
      setUndoStack(prev => [...prev.slice(-(MAX_UNDO - 1)), { type: 'delete', files: [fileName] }]);
      setFiles(prev => prev.filter(f => f.name !== fileName));
      setServerTotal(prev => prev - 1);
      if (selectedAnchor === fileName) { setSelectedAnchor(null); setSelectedFiles(new Set()); }
    } catch {}
  };

  const deleteSelected = async () => {
    if (!confirm(`¿Borrar ${filesToDelete.size} archivos?`)) return;
    setStatus(`Borrando ${filesToDelete.size}...`);
    for (const f of filesToDelete) {
      try { await http.postData('/organizer/delete-file', { fileName: f }); } catch {}
    }
    setUndoStack(prev => [...prev.slice(-(MAX_UNDO - 1)), { type: 'delete', files: Array.from(filesToDelete) }]);
    setFiles(prev => prev.filter(f => !filesToDelete.has(f.name)));
    setServerTotal(prev => prev - filesToDelete.size);
    setFilesToDelete(new Set());
    setStatus('✅ Archivos borrados.');
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
    e.stopPropagation();
    setFilesToDelete(prev => {
      const next = new Set(prev);
      checked ? next.add(fileName) : next.delete(fileName);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (filesToDelete.size > 0) setFilesToDelete(new Set());
    else setFilesToDelete(new Set(files.map(f => f.name)));
  };

  const remaining = serverTotal - offset;

  return (
    <div className="telegram-organizer">
      <div className="header">
        <div>
          <h1>📦 Telegram Organizer</h1>
          <p>Organiza los archivos descargados en carpetas para el Batch Upload.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => loadFiles(true)} disabled={loading}>
          {loading ? 'Cargando...' : 'Recargar'}
        </button>
      </div>

      <div className="stats-bar">
        <div className="stat">Assets:<span>{totalAssets}</span></div>
        <div className="stat">Imágenes:<span>{totalImages}</span></div>
        <div className="stat">Total:<span>{serverTotal}</span></div>
        <div className="stat">Cargados:<span>{files.length}</span></div>
      </div>

      <div className="actions-bar">
        <button className="btn btn-package" onClick={packageSelection} disabled={!selectedAnchor}>
          ▶ Empaquetar (Espacio)
        </button>
        
        {files.length > 0 && (
          <button className="btn btn-secondary" onClick={toggleSelectAll}>
            {filesToDelete.size > 0 ? '🚫 Desmarcar Todo' : '✅ Seleccionar Todo'}
          </button>
        )}

        {filesToDelete.size > 0 && (
          <button className="btn btn-delete" onClick={deleteSelected}>
            🗑️ Eliminar ({filesToDelete.size})
          </button>
        )}

        {undoStack.length > 0 && (
          <button className="btn btn-undo" onClick={undoLast}>
            ↩️ Deshacer ({undoStack.length})
          </button>
        )}
        <span className="status-text">{status}</span>
      </div>

      <div className="grid">
        {files.map(file => (
          <div
            key={file.name}
            className={`card ${file.type === 'anchor' ? 'anchor' : ''} ${selectedAnchor === file.name ? 'selected-anchor' : ''} ${selectedFiles.has(file.name) ? 'selected-file' : ''}`}
            onClick={() => handleCardClick(file.name, file.type)}
          >
            <input
              type="checkbox"
              className="del-check"
              checked={filesToDelete.has(file.name)}
              onChange={(e) => toggleDelete(file.name, e.target.checked, e)}
              onClick={e => e.stopPropagation()}
            />
            <button className="delete-btn-quick" title="Eliminar" onClick={(e) => quickDelete(file.name, e)}>🗑️</button>

            {file.type === 'anchor' && (
              <>
                <button className="quick-pack left" title="Pack ←" onClick={(e) => quickPackage(file.name, 'left', e)}>⬅️</button>
                <button className="quick-pack right" title="Pack →" onClick={(e) => quickPackage(file.name, 'right', e)}>➡️</button>
                <div className="badge">ASSET</div>
              </>
            )}

            <div className="card-img">
              {file.type === 'image' ? (
                <img src={`${apiBase}/api/organizer/image?name=${encodeURIComponent(file.name)}`} loading="lazy" alt={file.name} />
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
  );
}
