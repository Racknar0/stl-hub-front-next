'use client';
import React, { useEffect, useCallback } from 'react';
import './SimplyModal.scss';

export default function SimplyModal({
  open,
  onClose,
  title,
  children,
  brand = 'STL Hub',
  ariaLabelledBy = 'simply-modal-title',
}) {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKey);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.classList.remove('modal-open');
    };
  }, [open, handleKey]);

  if (!open) return null;

  return (
    <>
      <div
        className={`simply-modal modal fade show`}
        style={{ display: 'block' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        onMouseDown={handleBackdropClick}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content simply-modal__content">
            <div className="topbar">
              <span className="brand">{brand}</span>
              <button type="button" className="btn-close" aria-label="Cerrar" onClick={onClose} />
            </div>

            <div className="simple-body">
              {title && <h3 id={ariaLabelledBy} className="title">{title}</h3>}
              <div className="simple-content">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Backdrop */}
      <div className="modal-backdrop fade show" />
    </>
  );
}
