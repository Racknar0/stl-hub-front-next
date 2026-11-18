'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HttpService from '@/services/HttpService';
import ModelViewer, { parseModel } from './ModelViewer';
import './ArchivePreview.scss';

// Vista previa de un asset: a la izquierda el contenido del comprimido, a la derecha
// el archivo elegido (imagen, 3D, texto o PDF). No se descomprime todo: el backend lista
// el archivo y saca solo la entrada que se pincha.

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
const MODEL_EXT = ['stl', 'obj'];
const TEXT_EXT = ['txt', 'md', 'nfo'];
const ARCHIVE_EXT = ['zip', 'rar', '7z'];
const MAX_PREVIEW_BYTES = 512 * 1024 * 1024;
const EXPAND_ALL_LIMIT = 300; // con más archivos, solo se abre el primer nivel

const extOf = (p) => (p.match(/\.([^./]+)$/)?.[1] || '').toLowerCase();
const kindOf = (p) => {
  const ext = extOf(p);
  if (IMAGE_EXT.includes(ext)) return 'image';
  if (MODEL_EXT.includes(ext)) return 'model';
  if (TEXT_EXT.includes(ext)) return 'text';
  if (ext === 'pdf') return 'pdf';
  if (ARCHIVE_EXT.includes(ext)) return 'archive';
  return 'other';
};
const ICONS = { image: '🖼️', model: '🗿', text: '📄', pdf: '📕', archive: '📦', other: '▫️' };
const fmtSize = (b) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
};
const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

// Árbol de carpetas a partir de las rutas planas del listado
const buildTree = (entries) => {
  const root = { name: '', path: '', dirs: new Map(), files: [] };
  for (const e of entries) {
    const parts = e.path.split('/').filter(Boolean);
    if (!parts.length) continue;
    let node = root;
    const dirParts = e.isDir ? parts : parts.slice(0, -1);
    dirParts.forEach((part, i) => {
      if (!node.dirs.has(part)) {
        node.dirs.set(part, { name: part, path: parts.slice(0, i + 1).join('/'), dirs: new Map(), files: [] });
      }
      node = node.dirs.get(part);
    });
    if (!e.isDir) node.files.push({ name: parts[parts.length - 1], path: e.path, size: e.size });
  }
  return root;
};

export default function ArchivePreviewDialog({ file, apiBase, token, onClose }) {
  const http = useMemo(() => new HttpService(), []);
  const [entries, setEntries] = useState(null);
  const [listError, setListError] = useState('');
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState({ status: 'idle' });
  const selectedRef = useRef(null);

  const name = file?.name;

  // Listado del comprimido
  useEffect(() => {
    if (!name) return;
    let cancelled = false;
    setEntries(null); setListError(''); setSelected(null); setQuery(''); setPreview({ status: 'idle' });
    http.getData(`/organizer/archive/list?name=${encodeURIComponent(name)}`)
      .then(res => {
        if (cancelled) return;
        const list = res.data.entries || [];
        setEntries(list);
        const files = list.filter(e => !e.isDir);
        // Abrir carpetas: todas si son pocas, si no solo el primer nivel
        const dirs = new Set();
        for (const e of list) {
          const parts = e.path.split('/').filter(Boolean);
          const depth = files.length <= EXPAND_ALL_LIMIT ? parts.length : 1;
          for (let i = 1; i <= Math.min(depth, e.isDir ? parts.length : parts.length - 1); i++) dirs.add(parts.slice(0, i).join('/'));
        }
        setExpanded(dirs);
        // Primera imagen; si no hay, el primer modelo 3D
        const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
        const first = sorted.find(e => kindOf(e.path) === 'image') || sorted.find(e => kindOf(e.path) === 'model') || sorted[0];
        if (first) {
          setSelected(first);
          // Que la carpeta del elegido quede abierta
          const parts = first.path.split('/');
          setExpanded(prev => {
            const next = new Set(prev);
            for (let i = 1; i < parts.length; i++) next.add(parts.slice(0, i).join('/'));
            return next;
          });
        }
      })
      .catch(err => { if (!cancelled) setListError(err?.response?.data?.error || err.message || 'Error al leer el comprimido'); });
    return () => { cancelled = true; };
  }, [name, http]);

  const entryUrl = (entry) =>
    `${apiBase}/api/organizer/archive/entry?token=${encodeURIComponent(token || '')}&name=${encodeURIComponent(name)}&entry=${encodeURIComponent(entry)}`;

  // Carga de la vista previa del archivo elegido
  useEffect(() => {
    if (!selected) return;
    const kind = kindOf(selected.path);
    if (selected.size > MAX_PREVIEW_BYTES) { setPreview({ status: 'too-big' }); return; }
    if (kind === 'image' || kind === 'pdf') { setPreview({ status: 'ready', kind }); return; }
    if (kind !== 'model' && kind !== 'text') { setPreview({ status: 'none', kind }); return; }

    const controller = new AbortController();
    setPreview({ status: 'loading', kind });
    http.getRaw(`/organizer/archive/entry?name=${encodeURIComponent(name)}&entry=${encodeURIComponent(selected.path)}`, {
      responseType: kind === 'model' ? 'arraybuffer' : 'text',
      signal: controller.signal,
      timeout: 0,
    })
      .then(res => {
        if (kind === 'text') return setPreview({ status: 'ready', kind, text: String(res.data).slice(0, 200000) });
        const positions = parseModel(res.data, extOf(selected.path));
        if (!positions.length) return setPreview({ status: 'error', kind, error: 'El modelo no tiene triángulos legibles' });
        setPreview({ status: 'ready', kind, positions, triangles: positions.length / 9 });
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        let msg = err.message || 'Error al extraer';
        const data = err?.response?.data;
        if (data && typeof data === 'object' && !(data instanceof ArrayBuffer)) msg = data.error || msg;
        if (data instanceof ArrayBuffer) {
          try { msg = JSON.parse(new TextDecoder().decode(data)).error || msg; } catch {}
        }
        setPreview({ status: 'error', kind, error: msg });
      });
    return () => controller.abort();
  }, [selected, name, http]);

  const tree = useMemo(() => (entries ? buildTree(entries) : null), [entries]);
  const fileCount = useMemo(() => (entries ? entries.filter(e => !e.isDir).length : 0), [entries]);
  const totalSize = useMemo(() => (entries ? entries.reduce((s, e) => s + (e.isDir ? 0 : e.size), 0) : 0), [entries]);

  // Archivos visibles en orden (para ↑/↓)
  const visibleFiles = useMemo(() => {
    if (!tree) return [];
    const q = query.trim().toLowerCase();
    if (q) {
      return entries.filter(e => !e.isDir && e.path.toLowerCase().includes(q))
        .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
    }
    const out = [];
    const walk = (node) => {
      for (const d of [...node.dirs.values()].sort(byName)) if (expanded.has(d.path)) walk(d);
      for (const f of [...node.files].sort(byName)) out.push(f);
    };
    walk(tree);
    return out;
  }, [tree, entries, expanded, query]);

  useEffect(() => { selectedRef.current?.scrollIntoView({ block: 'nearest' }); }, [selected]);

  const onKeyDown = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    if (!visibleFiles.length) return;
    e.preventDefault();
    const idx = visibleFiles.findIndex(f => f.path === selected?.path);
    const next = e.key === 'ArrowDown' ? Math.min(visibleFiles.length - 1, idx + 1) : Math.max(0, idx - 1);
    const f = visibleFiles[next];
    setSelected({ path: f.path, size: f.size });
  };

  const toggleDir = (p) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(p) ? next.delete(p) : next.add(p);
    return next;
  });

  const renderFile = (f, depth, label) => {
    const kind = kindOf(f.path);
    const isSel = selected?.path === f.path;
    return (
      <div
        key={f.path}
        ref={isSel ? selectedRef : undefined}
        className={`ap-row file ${isSel ? 'selected' : ''} kind-${kind}`}
        style={{ paddingLeft: 10 + depth * 14 }}
        onClick={() => setSelected({ path: f.path, size: f.size })}
        title={f.path}
      >
        <span className="ap-icon">{ICONS[kind]}</span>
        <span className="ap-name">{label || f.name}</span>
        <span className="ap-size">{fmtSize(f.size)}</span>
      </div>
    );
  };

  const renderDir = (node, depth) => {
    const open = expanded.has(node.path);
    return (
      <React.Fragment key={`d:${node.path}`}>
        <div className="ap-row dir" style={{ paddingLeft: 10 + depth * 14 }} onClick={() => toggleDir(node.path)} title={node.path}>
          <span className="ap-caret">{open ? '▾' : '▸'}</span>
          <span className="ap-icon">📁</span>
          <span className="ap-name">{node.name}</span>
        </div>
        {open && renderChildren(node, depth + 1)}
      </React.Fragment>
    );
  };

  const renderChildren = (node, depth) => (
    <>
      {[...node.dirs.values()].sort(byName).map(d => renderDir(d, depth))}
      {[...node.files].sort(byName).map(f => renderFile(f, depth))}
    </>
  );

  const renderPreview = () => {
    if (listError) return <div className="ap-msg error">{listError}</div>;
    if (!entries) return <div className="ap-msg"><CircularProgress size={28} /></div>;
    if (!selected) return <div className="ap-msg">El comprimido está vacío</div>;
    const { status, kind } = preview;
    if (status === 'too-big') return <div className="ap-msg">Archivo demasiado grande para la vista previa ({fmtSize(selected.size)})</div>;
    if (status === 'loading') return <div className="ap-msg"><CircularProgress size={28} /><span>Extrayendo {fmtSize(selected.size)}…</span></div>;
    if (status === 'error') return <div className="ap-msg error">{preview.error}</div>;
    if (status === 'none') {
      return (
        <div className="ap-msg">
          <span style={{ fontSize: 42 }}>{ICONS[kind]}</span>
          <span>{kind === 'archive' ? 'Comprimido dentro del comprimido: no se puede previsualizar' : 'Sin vista previa para este tipo de archivo'}</span>
        </div>
      );
    }
    if (status !== 'ready') return null;
    if (kind === 'image') return <img key={selected.path} className="ap-image" src={entryUrl(selected.path)} alt={selected.path} onError={() => setPreview({ status: 'error', kind, error: 'No se pudo extraer la imagen' })} />;
    if (kind === 'pdf') return <iframe key={selected.path} className="ap-pdf" src={entryUrl(selected.path)} title={selected.path} />;
    if (kind === 'text') return <pre className="ap-text">{preview.text}</pre>;
    if (kind === 'model') {
      return (
        <>
          <ModelViewer positions={preview.positions} zUp={extOf(selected.path) === 'stl'} />
          <div className="ap-model-info">{preview.triangles.toLocaleString('es')} triángulos · arrastra para girar · rueda para zoom · doble clic para reiniciar</div>
        </>
      );
    }
    return null;
  };

  const displayName = name ? (name.match(/^\d+_\d+_(.+)$/)?.[1] || name) : '';

  return (
    <Dialog
      open={!!file}
      onClose={onClose}
      maxWidth={false}
      onKeyDown={onKeyDown}
      PaperProps={{ className: 'archive-preview-paper' }}
    >
      <div className="archive-preview">
        <div className="ap-header">
          <div className="ap-title" title={name}>
            <span>👁</span> {displayName}
            {entries && <span className="ap-meta">{fileCount.toLocaleString('es')} archivos · {fmtSize(totalSize)}</span>}
          </div>
          <button className="ap-close" onClick={onClose} title="Cerrar (Esc)"><CloseIcon fontSize="small" /></button>
        </div>
        <div className="ap-body">
          <div className="ap-left">
            <input
              className="ap-search"
              placeholder="Buscar dentro…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="ap-tree">
              {listError && <div className="ap-msg error small">{listError}</div>}
              {!entries && !listError && <div className="ap-msg small"><CircularProgress size={20} /></div>}
              {tree && (query.trim()
                ? (visibleFiles.length ? visibleFiles.map(f => renderFile(f, 0, f.path)) : <div className="ap-msg small">Sin resultados</div>)
                : renderChildren(tree, 0))}
            </div>
          </div>
          <div className="ap-right">
            {selected && <div className="ap-path" title={selected.path}>{selected.path}</div>}
            <div className="ap-stage">{renderPreview()}</div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
