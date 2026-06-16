'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import './Footer.scss';
import { useI18n } from '../../../i18n';
import LegalModal from '../../common/LegalModal/LegalModal';
import useResolvedLanguage from '../../../hooks/useResolvedLanguage';

const Footer = () => {
  const [showLegalModal, setShowLegalModal] = useState(false);
  const { t } = useI18n?.() || { t: () => undefined };
  const resolvedLanguage = useResolvedLanguage();
  const isEn = resolvedLanguage === 'en';
  
  const officialEmail = process.env.NEXT_PUBLIC_OFFICIAL_EMAIL || 'stlhubmega@gmail.com';
  const currentYear = new Date().getFullYear();
  
  const getTranslation = (key, fallbackEs, fallbackEn) => {
    if (typeof t === 'function') {
      const translation = t(key);
      if (translation && translation !== key) return translation;
    }
    return isEn ? fallbackEn : fallbackEs;
  };

  const copyright = getTranslation('footer.copyright', 
    `© ${currentYear} STL HUB · Todos los derechos reservados`,
    `© ${currentYear} STL HUB · All rights reserved`
  ).replace('{year}', currentYear);

  const legalText = getTranslation('footer.legal',
    'Aviso legal: Esta plataforma actúa como directorio/índice de enlaces aportados por usuarios o disponibles públicamente. No alojamos archivos ni reclamamos propiedad sobre el contenido enlazado; cobramos por el servicio de curaduría y facilitación de búsqueda, no por la venta de obras de terceros.',
    'Legal Notice: This platform acts as a directory/index of links contributed by users or publicly available. We do not host files nor claim ownership over linked content; we charge for curation and search facilitation services, not for selling third-party works.'
  );

  const contactTextEs = `¿Eres titular de derechos y detectaste un enlace que te afecta? Escríbenos a ${officialEmail} con la evidencia y retiraremos o bloquearemos el acceso con prontitud (24–72 h).`;
  const contactTextEn = `Are you a rights holder and detected a link that affects you? Write to us at ${officialEmail} with evidence and we will remove or block access promptly (24–72 h).`;
  const contactText = getTranslation('footer.contact', contactTextEs, contactTextEn).replace('{email}', officialEmail);

  const policiesText = getTranslation('footer.policies', 'Términos y Condiciones', 'Terms and Conditions');
  const privacyText = getTranslation('footer.privacy', 'Política de Privacidad', 'Privacy Policy');

  return (
    <>
      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-content">
            <div className="legal-text">
              {legalText}
            </div>
            <div className="contact-text">
              {contactText.split(officialEmail).map((part, i, arr) => (
                <React.Fragment key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <a href={`mailto:${officialEmail}`}>{officialEmail}</a>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          
          <div className="footer-bottom">
            <div className="copyright">{copyright}</div>
            <div className="footer-links">
              <button 
                className="policies-btn"
                onClick={() => setShowLegalModal(true)}
              >
                {policiesText}
              </button>
              <Link 
                href="/privacy-policy" 
                className="policies-btn"
              >
                {privacyText}
              </Link>
              <Link 
                href={isEn ? "/en/free-3d-models" : "/modelos-3d-gratis"} 
                className="policies-btn"
              >
                {isEn ? "Free STL Models" : "Modelos STL Gratis"}
              </Link>
            </div>
          </div>
        </div>
      </footer>
      
      <LegalModal 
        isOpen={showLegalModal} 
        onClose={() => setShowLegalModal(false)} 
      />
    </>
  );
};

export default Footer;
