'use client'

import React, { memo } from 'react';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Tarjeta de la grilla. Memorizada: al cambiar la selección solo se repintan las tarjetas afectadas.
// `actions` es un objeto estable (no cambia entre renders) que delega en los handlers actuales de la página.
function OrganizerCard({ file, isSelectedAnchor, isSelectedFile, isToDelete, thumbUrl, actions }) {
  const isAnchor = file.type === 'anchor';
  return (
    <div
      className={`card ${isAnchor ? 'anchor' : ''} ${isSelectedAnchor ? 'selected-anchor' : ''} ${isSelectedFile ? 'selected-file' : ''} ${isToDelete ? 'to-delete' : ''}`}
      onClick={(e) => actions.onCardClick(file, e)}
      onMouseDown={(e) => actions.onCardMouseDown(file, e)}
      onMouseEnter={() => actions.onCardMouseEnter(file)}
    >
      <input
        type="checkbox"
        className="del-check"
        checked={isToDelete}
        onChange={() => {}}
        onClick={(e) => actions.onToggleDelete(file, e)}
      />
      <button className="delete-btn-quick" title="Eliminar" onClick={(e) => actions.onQuickDelete(file, e)}>🗑️</button>
      {!isAnchor && (
        <button className="preview-btn-quick" title="Ver en grande" onClick={(e) => actions.onPreview(file, e)}>
          <VisibilityIcon fontSize="small" />
        </button>
      )}

      {isAnchor && (
        <>
          <button className="quick-pack left" title="Pack ←" onClick={(e) => actions.onQuickPack(file, 'left', e)}>⬅️</button>
          <button className="quick-pack right" title="Pack →" onClick={(e) => actions.onQuickPack(file, 'right', e)}>➡️</button>
          <div className="badge">ASSET</div>
        </>
      )}

      <div className="card-img">
        {isAnchor ? (
          file.isCompressed ? '📚' : '🗿'
        ) : (
          <img src={thumbUrl} loading="lazy" decoding="async" alt={file.name} draggable="false" />
        )}
      </div>
      <div className="card-name">{file.name}</div>
    </div>
  );
}

export default memo(OrganizerCard);
