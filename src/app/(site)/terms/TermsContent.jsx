'use client';

import React from 'react';
import '../../../components/common/LegalModal/LegalModal.scss';
import LegalNoticeContent from '../../../components/common/LegalModal/LegalNoticeContent';
import useResolvedLanguage from '../../../hooks/useResolvedLanguage';

// Mismo texto que el modal "Términos y Condiciones" del footer, como página propia (/terms)
export default function TermsContent() {
  const resolvedLanguage = useResolvedLanguage();
  const isEn = resolvedLanguage === 'en';
  const officialEmail = process.env.NEXT_PUBLIC_OFFICIAL_EMAIL || 'stlhubmega@gmail.com';
  const effectiveDate = isEn ? 'October 20, 2026' : '20 de octubre de 2026';

  return (
    <div style={{ minHeight: '100vh', padding: '4rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#fff', textAlign: 'center', letterSpacing: '-0.02em' }}>
          {isEn ? 'Terms and Conditions' : 'Términos y Condiciones'}
        </h1>
        <div className="legal-modal-content" style={{ background: '#fff', borderRadius: '24px', maxHeight: 'none' }}>
          <LegalNoticeContent isEn={isEn} officialEmail={officialEmail} effectiveDate={effectiveDate} />
        </div>
      </div>
    </div>
  );
}
