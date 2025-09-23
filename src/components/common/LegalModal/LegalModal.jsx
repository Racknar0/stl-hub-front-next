'use client';

import React from 'react';
import './LegalModal.scss';
import { useI18n } from '../../../i18n';
import useStore from '../../../store/useStore';

const LegalModal = ({ isOpen, onClose }) => {
  const { t } = useI18n?.() || { t: () => undefined };
  const language = useStore((s) => s.language);
  const isEn = String(language || 'es').toLowerCase() === 'en';
  
  const officialEmail = process.env.NEXT_PUBLIC_OFFICIAL_EMAIL || 'correo@correo.com';
  const currentDate = new Date().toLocaleDateString(isEn ? 'en-US' : 'es-ES');
  
  const getTranslation = (key, fallbackEs, fallbackEn) => {
    if (typeof t === 'function') {
      const translation = t(key);
      if (translation && translation !== key) return translation;
    }
    return isEn ? fallbackEn : fallbackEs;
  };

  if (!isOpen) return null;

  return (
    <div className="legal-modal-overlay" onClick={onClose}>
      <div className="legal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="legal-modal-header">
          <h2>{getTranslation('legal.title', 'AVISO LEGAL Y POLÍTICA DE ENLACES DE TERCEROS', 'LEGAL NOTICE AND THIRD-PARTY LINKS POLICY')}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="legal-modal-content">
          <div className="legal-meta">
            <p>{getTranslation('legal.effectiveDate', `Fecha de entrada en vigor: ${currentDate}`, `Effective date: ${currentDate}`).replace('{date}', currentDate)}</p>
            <p>{getTranslation('legal.responsible', 'Responsable: STL HUB, Internacional', 'Responsible: STL HUB, International').replace('{name}', 'STL HUB').replace('{country}', isEn ? 'International' : 'Internacional')}</p>
            <p>{getTranslation('legal.contact', `Contacto: ${officialEmail}`, `Contact: ${officialEmail}`).replace('{email}', officialEmail)}</p>
          </div>

          <div className="legal-section">
            <h3>{getTranslation('legal.section1.title', '1. Naturaleza del servicio', '1. Nature of the service')}</h3>
            <p>{getTranslation('legal.section1.content', 
              'STL HUB ofrece un servicio de curaduría y organización de enlaces de terceros a recursos alojados fuera de nuestra plataforma. No alojamos archivos, no controlamos los servidores de destino y no reclamamos propiedad sobre las obras a las que se enlaza. Cualquier contraprestación económica percibida corresponde exclusivamente al servicio de búsqueda, catalogación y acceso ordenado a enlaces públicos o aportados por usuarios.',
              'STL HUB offers a curation and organization service for third-party links to resources hosted outside our platform. We do not host files, do not control destination servers and do not claim ownership over linked works. Any economic consideration received corresponds exclusively to the search, cataloging and organized access service to public or user-contributed links.'
            )}</p>
          </div>

          <div className="legal-section">
            <h3>{getTranslation('legal.section2.title', '2. Propiedad intelectual', '2. Intellectual property')}</h3>
            <p>{getTranslation('legal.section2.content',
              'Los derechos de autor, marcas y demás derechos sobre los contenidos enlazados pertenecen a sus titulares. La inclusión de un enlace no implica patrocinio, asociación, licencia ni autorización por nuestra parte para descargar, usar o distribuir el contenido enlazado. El uso que haga el usuario de tales materiales es de su exclusiva responsabilidad y deberá respetar las licencias y condiciones establecidas por los titulares.',
              'Copyright, trademarks and other rights over linked content belong to their owners. Including a link does not imply sponsorship, association, license or authorization on our part to download, use or distribute linked content. The user\'s use of such materials is their sole responsibility and must respect the licenses and conditions established by the owners.'
            )}</p>
          </div>

          <div className="legal-section">
            <h3>{getTranslation('legal.section3.title', '3. Límites y ausencia de control sobre terceros', '3. Limits and absence of control over third parties')}</h3>
            <p>{getTranslation('legal.section3.content',
              'No garantizamos la disponibilidad, legalidad, integridad, calidad ni actualidad de los contenidos alojados por terceros, ni de los enlaces aportados por los usuarios. Los destinos de los enlaces pueden cambiar o ser retirados sin nuestro conocimiento. En la máxima medida permitida por la ley, no asumimos responsabilidad por daños derivados del acceso o uso de contenidos de terceros enlazados desde esta plataforma.',
              'We do not guarantee the availability, legality, integrity, quality or timeliness of content hosted by third parties, nor of links contributed by users. Link destinations may change or be removed without our knowledge. To the maximum extent permitted by law, we assume no responsibility for damages arising from access to or use of third-party content linked from this platform.'
            )}</p>
          </div>

          <div className="legal-section">
            <h3>{getTranslation('legal.section4.title', '4. Política de notificación y retiro (takedown)', '4. Notification and takedown policy')}</h3>
            <p>{getTranslation('legal.section4.content',
              `Si usted es titular de derechos y considera que algún enlace publicado a través de STL HUB vulnera sus derechos, por favor envíe una notificación a ${officialEmail} con la siguiente información: • Identificación del titular o su representante autorizado y datos de contacto. • Enlace(s) específico(s) dentro de nuestro dominio y el/los enlace(s) de destino que se solicita retirar. • Descripción de la obra y prueba razonable de titularidad. • Declaración de buena fe indicando que el uso no está autorizado por el titular, su agente o la ley. • Declaración de veracidad y firma digital o manuscrita escaneada.`,
              `If you are a rights holder and believe that any link published through STL HUB violates your rights, please send a notification to ${officialEmail} with the following information: • Identification of the owner or their authorized representative and contact details. • Specific link(s) within our domain and the destination link(s) requested to be removed. • Description of the work and reasonable proof of ownership. • Good faith statement indicating that use is not authorized by the owner, their agent or the law. • Statement of truthfulness and digital or handwritten scanned signature.`
            ).replace('{email}', officialEmail)}</p>
          </div>

          <div className="legal-section">
            <h3>{getTranslation('legal.section5.title', '5. Contenido aportado por usuarios y reincidencia', '5. User-contributed content and recidivism')}</h3>
            <p>{getTranslation('legal.section5.content',
              'Los usuarios que publiquen enlaces declaran contar con las autorizaciones necesarias. Nos reservamos el derecho de suspender o cancelar cuentas de infractores reincidentes, así como de bloquear preventivamente enlaces ante indicios razonables de infracción.',
              'Users who publish links declare that they have the necessary authorizations. We reserve the right to suspend or cancel accounts of repeat infringers, as well as to preventively block links upon reasonable indications of infringement.'
            )}</p>
          </div>

          <div className="legal-section">
            <h3>{getTranslation('legal.section6.title', '6. Prohibiciones', '6. Prohibitions')}</h3>
            <p>{getTranslation('legal.section6.content',
              'Queda prohibido usar esta plataforma para subir o difundir enlaces que infrinjan derechos de autor o marcas, vulneren acuerdos de licencia o leyes aplicables, o evadan medidas tecnológicas de protección.',
              'It is prohibited to use this platform to upload or disseminate links that infringe copyrights or trademarks, violate license agreements or applicable laws, or circumvent technological protection measures.'
            )}</p>
          </div>

          <div className="legal-section">
            <h3>{getTranslation('legal.section7.title', '7. Limitación de responsabilidad', '7. Limitation of liability')}</h3>
            <p>{getTranslation('legal.section7.content',
              'Salvo dolo o culpa grave y sin perjuicio de las obligaciones que imponga la normativa aplicable, STL HUB no será responsable de daños indirectos, incidentales, especiales o consecuenciales derivados del uso de enlaces de terceros.',
              'Except for willful misconduct or gross negligence and without prejudice to obligations imposed by applicable regulations, STL HUB shall not be liable for indirect, incidental, special or consequential damages arising from the use of third-party links.'
            )}</p>
          </div>

          <div className="legal-section">
            <h3>{getTranslation('legal.section8.title', '8. Colaboración con titulares y autoridades', '8. Collaboration with holders and authorities')}</h3>
            <p>{getTranslation('legal.section8.content',
              'STL HUB colabora de buena fe con titulares de derechos y autoridades competentes. Mantenemos procedimientos internos para registrar denuncias, auditar enlaces y evitar la republicación de contenidos previamente retirados.',
              'STL HUB collaborates in good faith with rights holders and competent authorities. We maintain internal procedures to register complaints, audit links and prevent republication of previously removed content.'
            )}</p>
          </div>

          <div className="legal-section">
            <h3>{getTranslation('legal.section9.title', '9. Modificaciones', '9. Modifications')}</h3>
            <p>{getTranslation('legal.section9.content',
              'Podremos actualizar este Aviso para reflejar cambios normativos u operativos. La versión vigente se publicará en nuestro sitio web con su fecha de entrada en vigor.',
              'We may update this Notice to reflect regulatory or operational changes. The current version will be published on our website with its effective date.'
            )}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;