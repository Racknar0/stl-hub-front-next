'use client'

import React, { memo } from 'react';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Tarjeta de la grilla. Memorizada: al cambiar la selección solo se repintan las tarjetas afectadas.
// `actions` es un objeto estable (no cambia entre renders) que delega en los handlers actuales de la página.
//
// Fotos: la imagen ocupa toda la tarjeta y el nombre aparece en hover sobre un degradado. Ese degradado
// y el nombre tienen pointer-events: none para que el ratón siga "encima" del <img> (la extensión de zoom
// del navegador detecta la imagen bajo el cursor).
function OrganizerCard({ file, isSelectedAnchor, isSelectedFile, isToDelete, imageSrc, canPack, actions }) {
  const isAnchor = file.type === 'anchor';
  return (
    <div
      className={`card ${isAnchor ? 'anchor' : 'image-card'} ${isSelectedAnchor ? 'selected-anchor' : ''} ${isSelectedFile ? 'selected-file' : ''} ${isToDelete ? 'to-delete' : ''}`}
      onClick={(e) => actions.onCardClick(file, e)}
      onMouseDown={(e) => actions.onCardMouseDown(file, e)}
      onMouseEnter={() => actions.onCardMouseEnter(file)}
      onMouseLeave={() => actions.onCardMouseLeave(file)}
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
          {canPack && (
            <>
              <button className="quick-pack left" title="Pack ←" onClick={(e) => actions.onQuickPack(file, 'left', e)}>⬅️</button>
              <button className="quick-pack right" title="Pack →" onClick={(e) => actions.onQuickPack(file, 'right', e)}>➡️</button>
            </>
          )}
          <div className="badge">ASSET</div>
        </>
      )}

      {isAnchor ? (
        <>
          <div className="card-img">{file.isCompressed ? '📚' : '🗿'}</div>
          <div className="card-name">{file.name}</div>
        </>
      ) : (
        <>
          <div className="card-img">
            <img src={imageSrc} loading="lazy" decoding="async" alt={file.name} title={file.name} draggable="false" />
          </div>
          <div className="card-photo-name">{file.name}</div>
        </>
      )}
    </div>
  );
}

export default memo(OrganizerCard);
