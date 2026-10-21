'use client';

import React from 'react';
import './LegalModal.scss';
import LegalNoticeContent from './LegalNoticeContent';
import { useI18n } from '../../../i18n';
import useResolvedLanguage from '../../../hooks/useResolvedLanguage';

const LegalModal = ({ isOpen, onClose }) => {
  const resolvedLanguage = useResolvedLanguage();
  const isEn = resolvedLanguage === 'en';
  const { t } = useI18n?.(resolvedLanguage) || { t: () => undefined };
  
  const officialEmail = process.env.NEXT_PUBLIC_OFFICIAL_EMAIL || 'correo@correo.com';
  // Fecha fija — actualizar manualmente cada vez que se modifiquen las políticas
  const effectiveDate = isEn ? 'October 20, 2026' : '20 de octubre de 2026';

  if (!isOpen) return null;

  return (
    <div className="legal-modal-overlay" onClick={onClose}>
      <div className="legal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="legal-modal-header">
          <h2>{isEn ? 'LEGAL NOTICE AND THIRD-PARTY LINKS POLICY' : 'AVISO LEGAL Y POLÍTICA DE ENLACES DE TERCEROS'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="legal-modal-content">
          <LegalNoticeContent isEn={isEn} officialEmail={officialEmail} effectiveDate={effectiveDate} />
        </div>
      </div>
    </div>
  );
};

export default LegalModal;