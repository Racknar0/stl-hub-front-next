'use client';

import React from 'react';
import useStore from '../../../../store/useStore';

export default function PrivacyPolicyPage() {
  const language = useStore((s) => s.language);
  const isEn = String(language || 'es').toLowerCase() === 'en';

  const t = {
    title: isEn ? 'Comprehensive Privacy Policy' : 'Política de Privacidad Integral',
    lastUpdated: isEn ? 'Last updated' : 'Última actualización',
    
    s1Title: isEn ? '1. Introduction and Scope' : '1. Introducción y Alcance',
    s1Text: isEn 
      ? 'At STL Hub, we respect your privacy and are committed to protecting your personal data. This Privacy Policy comprehensively describes how we collect, process, store, and protect user information, as well as our practices regarding integration with third-party platforms and APIs (such as Pinterest, Meta, TikTok, among others). This policy is designed to comply with international data protection standards (including GDPR and CCPA regulations).'
      : 'En STL Hub respetamos su privacidad y estamos comprometidos con la protección de sus datos personales. Esta Política de Privacidad describe exhaustivamente cómo recopilamos, procesamos, almacenamos y protegemos la información de nuestros usuarios, así como nuestras prácticas relativas a la integración con plataformas y APIs de terceros (como Pinterest, Meta, TikTok, entre otras). Esta política está diseñada para cumplir con los estándares internacionales de protección de datos (incluyendo normativas tipo GDPR y CCPA).',
    
    s2Title: isEn ? '2. Third-Party API and Social Media Integration' : '2. Integración con APIs de Terceros y Redes Sociales',
    s2Text: isEn
      ? 'To optimize our operations and connect our 3D model catalog with the community, STL Hub uses third-party Application Programming Interfaces (APIs), including but not limited to Pinterest, Facebook (Meta), Instagram, and TikTok. Our integrations are governed by the following strict principles:'
      : 'Para optimizar nuestra operativa y conectar nuestro catálogo de modelos 3D con la comunidad, STL Hub utiliza Interfaces de Programación de Aplicaciones (APIs) de terceros, incluyendo pero no limitándose a Pinterest, Facebook (Meta), Instagram, y TikTok. Nuestras integraciones se rigen por los siguientes principios estrictos:',
    s2L1: isEn ? 'Internal Automation: Applications connected to these social networks are used exclusively to manage, automate, and publish our own content (3D assets, renders, catalogs) on our official profiles.' : 'Automatización Interna: Las aplicaciones conectadas a estas redes sociales se utilizan con el propósito exclusivo de gestionar, automatizar y publicar nuestro propio contenido (assets 3D, renders, catálogos) en nuestros perfiles oficiales.',
    s2L2: isEn ? 'Zero Credential Access: STL Hub NEVER requests, collects, or stores passwords from users\' personal social media accounts.' : 'Cero Acceso a Credenciales: STL Hub NUNCA solicita, recopila ni almacena contraseñas de las cuentas personales de redes sociales de los usuarios.',
    s2L3: isEn ? 'No Data Selling: We do not share, sell, rent, or transfer any statistical, personal, or performance data obtained through these APIs to third parties.' : 'No Venta de Datos: No compartimos, vendemos, alquilamos ni transferimos a terceros ningún dato estadístico, personal o de rendimiento obtenido a través de estas APIs.',
    s2L4: isEn ? 'Access Tokens: Authentication tokens (OAuth) used to connect our official accounts with these platforms are stored using military-grade encryption and are not publicly accessible.' : 'Tokens de Acceso: Los tokens de autenticación (OAuth) utilizados para conectar nuestras cuentas oficiales con estas plataformas se almacenan mediante cifrado de grado militar y no son accesibles públicamente.',

    s3Title: isEn ? '3. User Data Collection' : '3. Recopilación de Datos del Usuario',
    s3Text: isEn
      ? 'To provide our STL file and 3D model download services, we collect the following strictly necessary information:'
      : 'Para brindar nuestros servicios de descarga de archivos STL y modelos 3D, recopilamos la siguiente información estrictamente necesaria:',
    s3L1: isEn ? 'Identification Data: Email address and username upon registration.' : 'Datos de Identificación: Correo electrónico y nombre de usuario al momento del registro.',
    s3L2: isEn ? 'Interaction Data: Download history, bookmarked models, clicks, and interactions within the platform to improve the recommendation algorithm.' : 'Datos de Interacción: Historial de descargas, modelos guardados en favoritos, clics e interacciones dentro de la plataforma para mejorar el algoritmo de recomendaciones.',
    s3L3: isEn ? 'Technical Data: Anonymized IP address, browser type, and time zone for fraud prevention and basic statistical analysis.' : 'Datos Técnicos: Dirección IP anonimizada, tipo de navegador y zona horaria para prevención de fraudes y análisis estadístico básico.',

    s4Title: isEn ? '4. Security and Data Retention' : '4. Seguridad y Retención de Datos',
    s4Text: isEn
      ? 'The security of your information is our priority. We employ robust encryption protocols (SSL/TLS) for data transmission and strong hashing algorithms (such as bcrypt) for password storage. We retain your personal information only for as long as necessary to fulfill the purposes outlined in this policy or to comply with legal obligations.'
      : 'La seguridad de su información es nuestra prioridad. Empleamos protocolos de cifrado robustos (SSL/TLS) para la transmisión de datos y algoritmos de hashing fuertes (como bcrypt) para el almacenamiento de contraseñas. Retenemos su información personal únicamente durante el tiempo necesario para cumplir con los fines descritos en esta política o para cumplir con obligaciones legales.',

    s5Title: isEn ? '5. Your Rights' : '5. Sus Derechos',
    s5Text: isEn
      ? 'You have full control over your information. At any time you have the right to:'
      : 'Usted tiene control total sobre su información. En cualquier momento tiene derecho a:',
    s5L1: isEn ? 'Request access to the personal data we hold about you.' : 'Solicitar el acceso a los datos personales que tenemos sobre usted.',
    s5L2: isEn ? 'Request the total rectification or deletion of your account and associated data.' : 'Solicitar la rectificación o eliminación total de su cuenta y sus datos asociados.',
    s5L3: isEn ? 'Opt-out of any promotional communications.' : 'Darse de baja de cualquier comunicación promocional.',

    s6Title: isEn ? '6. Policy Changes' : '6. Modificaciones a esta Política',
    s6Text: isEn
      ? 'We reserve the right to update this Privacy Policy to reflect changes in our practices or legal and third-party API requirements. Any significant changes will be visibly notified through our platform.'
      : 'Nos reservamos el derecho de actualizar esta Política de Privacidad para reflejar cambios en nuestras prácticas o requisitos legales y de las APIs de terceros. Cualquier cambio significativo será notificado a través de nuestra plataforma de forma visible.',

    contactTitle: isEn ? 'Legal Contact and Support' : 'Contacto y Soporte Legal',
    contactText: isEn
      ? 'If you represent a third-party platform (Pinterest, Meta, etc.) reviewing our application, or if you are a user with questions about the handling of your data, you can contact us directly at our official administrative support email.'
      : 'Si representa a una plataforma de terceros (Pinterest, Meta, etc.) revisando nuestra aplicación, o si es un usuario con dudas sobre el manejo de sus datos, puede contactarnos directamente en nuestro correo oficial de soporte administrativo.',
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '4rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      color: '#cfd6ff'
    }}>
      <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#fff', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            {t.title}
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '1rem' }}>
            {t.lastUpdated}: {new Date().toLocaleDateString(isEn ? 'en-US' : 'es-ES')}
          </p>
        </div>

        <div style={{
          background: 'rgba(10, 10, 12, 0.5)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '3rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          
          <section>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>{t.s1Title}</h2>
            <p style={{ lineHeight: '1.7', color: '#a1a1aa', fontSize: '0.95rem' }}>{t.s1Text}</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>{t.s2Title}</h2>
            <p style={{ lineHeight: '1.7', color: '#a1a1aa', fontSize: '0.95rem', marginBottom: '1rem' }}>{t.s2Text}</p>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: '#a1a1aa', fontSize: '0.95rem', lineHeight: '1.6' }}>
              <li>{t.s2L1}</li>
              <li>{t.s2L2}</li>
              <li>{t.s2L3}</li>
              <li>{t.s2L4}</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>{t.s3Title}</h2>
            <p style={{ lineHeight: '1.7', color: '#a1a1aa', fontSize: '0.95rem', marginBottom: '1rem' }}>{t.s3Text}</p>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: '#a1a1aa', fontSize: '0.95rem', lineHeight: '1.6' }}>
              <li>{t.s3L1}</li>
              <li>{t.s3L2}</li>
              <li>{t.s3L3}</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>{t.s4Title}</h2>
            <p style={{ lineHeight: '1.7', color: '#a1a1aa', fontSize: '0.95rem' }}>{t.s4Text}</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>{t.s5Title}</h2>
            <p style={{ lineHeight: '1.7', color: '#a1a1aa', fontSize: '0.95rem', marginBottom: '1rem' }}>{t.s5Text}</p>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: '#a1a1aa', fontSize: '0.95rem', lineHeight: '1.6' }}>
              <li>{t.s5L1}</li>
              <li>{t.s5L2}</li>
              <li>{t.s5L3}</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>{t.s6Title}</h2>
            <p style={{ lineHeight: '1.7', color: '#a1a1aa', fontSize: '0.95rem' }}>{t.s6Text}</p>
          </section>

          <section style={{ 
            background: 'rgba(255, 255, 255, 0.03)', 
            border: '1px solid rgba(255, 255, 255, 0.08)', 
            borderRadius: '16px', 
            padding: '1.5rem' 
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff', marginBottom: '0.75rem' }}>{t.contactTitle}</h2>
            <p style={{ lineHeight: '1.7', color: '#a1a1aa', fontSize: '0.95rem' }}>{t.contactText}</p>
          </section>

        </div>
      </div>
    </div>
  );
}
