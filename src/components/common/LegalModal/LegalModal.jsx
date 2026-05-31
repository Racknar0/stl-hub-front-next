'use client';

import React from 'react';
import './LegalModal.scss';
import { useI18n } from '../../../i18n';
import useResolvedLanguage from '../../../hooks/useResolvedLanguage';

const LegalModal = ({ isOpen, onClose }) => {
  const resolvedLanguage = useResolvedLanguage();
  const isEn = resolvedLanguage === 'en';
  const { t } = useI18n?.(resolvedLanguage) || { t: () => undefined };
  
  const officialEmail = process.env.NEXT_PUBLIC_OFFICIAL_EMAIL || 'correo@correo.com';
  // Fecha fija — actualizar manualmente cada vez que se modifiquen las políticas
  const effectiveDate = isEn ? 'May 17, 2026' : '17 de mayo de 2026';

  if (!isOpen) return null;

  return (
    <div className="legal-modal-overlay" onClick={onClose}>
      <div className="legal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="legal-modal-header">
          <h2>{isEn ? 'LEGAL NOTICE AND THIRD-PARTY LINKS POLICY' : 'AVISO LEGAL Y POLÍTICA DE ENLACES DE TERCEROS'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="legal-modal-content">
          <div className="legal-meta">
            <p>{isEn ? `Effective date: ${effectiveDate}` : `Fecha de entrada en vigor: ${effectiveDate}`}</p>
            <p>{isEn ? 'Responsible: STL HUB, International' : 'Responsable: STL HUB, Internacional'}</p>
            <p>{isEn ? `Contact: ${officialEmail}` : `Contacto: ${officialEmail}`}</p>
          </div>

          {/* 1. Naturaleza del servicio */}
          <div className="legal-section">
            <h3>{isEn ? '1. Nature of the service' : '1. Naturaleza del servicio'}</h3>
            {isEn ? (
              <p>STL HUB offers a <strong>curation and organization service for third-party links</strong> to resources hosted <strong>outside our platform</strong>. <strong>We do not host files</strong>, do not control destination servers and <strong>do not claim ownership</strong> over linked works. Any economic consideration received corresponds <strong>exclusively to the search, cataloging and organized access service</strong> to public or user-contributed links. <span className="legal-red">STL HUB does not sell, distribute or commercialize digital works of third parties.</span></p>
            ) : (
              <p>STL HUB ofrece un <strong>servicio de curaduría y organización de enlaces de terceros</strong> a recursos alojados <strong>fuera de nuestra plataforma</strong>. <strong>No alojamos archivos</strong>, no controlamos los servidores de destino y <strong>no reclamamos propiedad</strong> sobre las obras a las que se enlaza. Cualquier contraprestación económica percibida corresponde <strong>exclusivamente al servicio de búsqueda, catalogación y acceso ordenado</strong> a enlaces públicos o aportados por usuarios. <span className="legal-red">STL HUB no vende, distribuye ni comercializa obras digitales de terceros.</span></p>
            )}
          </div>

          {/* 2. Propiedad intelectual */}
          <div className="legal-section">
            <h3>{isEn ? '2. Intellectual property' : '2. Propiedad intelectual'}</h3>
            {isEn ? (
              <p><strong>Copyright, trademarks and other rights over linked content belong to their owners.</strong> Including a link does not imply sponsorship, association, license or authorization on our part to download, use or distribute linked content. <span className="legal-red">The user's use of such materials is their <strong>sole responsibility</strong> and must respect the licenses and conditions established by the owners.</span></p>
            ) : (
              <p><strong>Los derechos de autor, marcas y demás derechos sobre los contenidos enlazados pertenecen a sus titulares.</strong> La inclusión de un enlace no implica patrocinio, asociación, licencia ni autorización por nuestra parte para descargar, usar o distribuir el contenido enlazado. <span className="legal-red">El uso que haga el usuario de tales materiales es de su <strong>exclusiva responsabilidad</strong> y deberá respetar las licencias y condiciones establecidas por los titulares.</span></p>
            )}
          </div>

          {/* 3. Límites y ausencia de control sobre terceros */}
          <div className="legal-section">
            <h3>{isEn ? '3. Limits and absence of control over third parties' : '3. Límites y ausencia de control sobre terceros'}</h3>
            {isEn ? (
              <p><strong>We do not guarantee</strong> the availability, legality, integrity, quality or timeliness of content hosted by third parties, nor of links contributed by users. Link destinations may change or be removed without our knowledge. <span className="legal-red">To the <strong>maximum extent permitted by law</strong>, we assume no responsibility for damages arising from access to or use of third-party content linked from this platform.</span></p>
            ) : (
              <p><strong>No garantizamos</strong> la disponibilidad, legalidad, integridad, calidad ni actualidad de los contenidos alojados por terceros, ni de los enlaces aportados por los usuarios. Los destinos de los enlaces pueden cambiar o ser retirados sin nuestro conocimiento. <span className="legal-red">En la <strong>máxima medida permitida por la ley</strong>, no asumimos responsabilidad por daños derivados del acceso o uso de contenidos de terceros enlazados desde esta plataforma.</span></p>
            )}
          </div>

          {/* 4. Takedown — REFORZADO */}
          <div className="legal-section">
            <h3>{isEn ? '4. Notification and takedown policy' : '4. Política de notificación y retiro (takedown)'}</h3>
            {isEn ? (
              <>
                <p>If you are a rights holder and believe that any link published through STL HUB violates your rights, we act in accordance with the procedures of the <strong>Digital Millennium Copyright Act (DMCA, 17 U.S.C. §512)</strong> and equivalent applicable regulations. Send a notification to <strong>{officialEmail}</strong> with subject line <strong>[TAKEDOWN] - work_name</strong>, including <strong>all</strong> of the following (incomplete requests will not be processed):</p>
                <ul className="legal-list">
                  <li><strong>Valid government-issued photo identification</strong> (passport, national ID, driver's license) of the rights holder or authorized representative.</li>
                  <li><strong>Copyright registration certificate</strong> or documentary proof of original authorship (screenshots of 3D modeling software with metadata and dates, original source files such as .blend, .zbrush, .stl with creation dates).</li>
                  <li><strong>Exact URL(s)</strong> within our domain (stl-hub.com) of the specific content in question. <span className="legal-red">Generic or bulk requests such as "all my content" will not be accepted.</span></li>
                  <li><strong>Side-by-side visual comparison</strong> of the original work vs. the linked content, demonstrating substantial similarity.</li>
                  <li><strong>Verifiable creation timeline</strong> with dates (original publication on other platforms, creation date in software, social media posts, etc.).</li>
                  <li><strong>Sworn declaration under penalty of perjury</strong>, signed and dated, stating that you are the owner or authorized to act on behalf of the owner, and that the information provided is accurate.</li>
                  <li>If acting as a <strong>representative</strong> and not the direct holder: <strong>notarized power of attorney</strong> or written authorization letter from the rights holder.</li>
                </ul>
                <p><span className="legal-red"><strong>Notifications that do not meet all of the above requirements will be considered incomplete and will not be processed</strong> until all documentation is duly provided.</span> We commit to reviewing and acting on valid and complete notifications within <strong>24 to 72 business hours</strong>, removing or blocking access to the reported link.</p>
              </>
            ) : (
              <>
                <p>Si usted es titular de derechos y considera que algún enlace publicado a través de STL HUB vulnera sus derechos, actuamos conforme a los procedimientos de la <strong>Digital Millennium Copyright Act (DMCA, 17 U.S.C. §512)</strong> y normativas equivalentes aplicables. Envíe una notificación a <strong>{officialEmail}</strong> con asunto <strong>[TAKEDOWN] - nombre_obra</strong>, incluyendo <strong>la totalidad</strong> de la siguiente documentación (solicitudes incompletas no serán procesadas):</p>
                <ul className="legal-list">
                  <li><strong>Documento de identidad oficial vigente con fotografía</strong> (pasaporte, cédula, DNI, INE) del titular de derechos o su representante autorizado.</li>
                  <li><strong>Certificado de registro de obra</strong> o prueba documental de autoría original (capturas de pantalla del software de modelado 3D con metadatos y fechas, archivos fuente originales como .blend, .zbrush, .stl con fechas de creación).</li>
                  <li><strong>URL(s) exacta(s)</strong> dentro de nuestro dominio (stl-hub.com) del contenido específico en cuestión. <span className="legal-red">No se aceptan solicitudes genéricas o masivas del tipo "todo mi contenido".</span></li>
                  <li><strong>Comparación visual lado a lado</strong> de la obra original vs. el contenido enlazado, demostrando similitud sustancial.</li>
                  <li><strong>Línea de tiempo de creación verificable</strong> con fechas (publicación original en otras plataformas, fecha de creación en software, publicaciones en redes sociales, etc.).</li>
                  <li><strong>Declaración jurada bajo pena de perjurio</strong>, firmada y fechada, indicando que usted es el titular o está autorizado para actuar en nombre del titular, y que la información proporcionada es veraz.</li>
                  <li>Si actúa como <strong>representante</strong> y no como titular directo: <strong>poder notarial</strong> o carta de autorización escrita del titular de derechos.</li>
                </ul>
                <p><span className="legal-red"><strong>Las notificaciones que no cumplan con la totalidad de los requisitos anteriores serán consideradas incompletas y no serán procesadas</strong> hasta que toda la documentación sea debidamente proporcionada.</span> Nos comprometemos a revisar y actuar sobre las notificaciones válidas y completas en un plazo de <strong>24 a 72 horas hábiles</strong>, retirando o bloqueando el acceso al enlace reportado.</p>
              </>
            )}
          </div>

          {/* 5. Contra-notificación */}
          <div className="legal-section">
            <h3>{isEn ? '5. Counter-notification' : '5. Contra-notificación'}</h3>
            {isEn ? (
              <p>If a user believes that a link was removed in error or by misidentification, they may send a counter-notification to <strong>{officialEmail}</strong> including: <strong>full identification</strong>, description of the removed link, <strong>good faith statement</strong> that the removal was the result of an error, and consent to the corresponding jurisdiction. We will evaluate the counter-notification and, if appropriate, restore access within a reasonable time, <strong>unless the original claimant initiates legal action</strong>.</p>
            ) : (
              <p>Si un usuario considera que un enlace fue retirado por error o identificación incorrecta, podrá enviar una contra-notificación a <strong>{officialEmail}</strong> incluyendo: <strong>identificación completa</strong>, descripción del enlace retirado, <strong>declaración de buena fe</strong> de que el retiro fue resultado de un error, y consentimiento a la jurisdicción correspondiente. Evaluaremos la contra-notificación y, de ser procedente, restableceremos el acceso en un plazo razonable, <strong>salvo que el reclamante original inicie una acción judicial</strong>.</p>
            )}
          </div>

          {/* 6. Contenido aportado por usuarios y reincidencia */}
          <div className="legal-section">
            <h3>{isEn ? '6. User-contributed content and recidivism' : '6. Contenido aportado por usuarios y reincidencia'}</h3>
            {isEn ? (
              <p>Users who publish links declare that they have the <strong>necessary authorizations</strong>. We reserve the right to <strong>suspend or cancel accounts of repeat infringers</strong>, as well as to preventively block links upon reasonable indications of infringement.</p>
            ) : (
              <p>Los usuarios que publiquen enlaces declaran contar con las <strong>autorizaciones necesarias</strong>. Nos reservamos el derecho de <strong>suspender o cancelar cuentas de infractores reincidentes</strong>, así como de bloquear preventivamente enlaces ante indicios razonables de infracción.</p>
            )}
          </div>

          {/* 7. Prohibiciones */}
          <div className="legal-section">
            <h3>{isEn ? '7. Prohibitions' : '7. Prohibiciones'}</h3>
            {isEn ? (
              <p><span className="legal-red">It is <strong>prohibited</strong> to use this platform to upload or disseminate links that infringe copyrights or trademarks, violate license agreements or applicable laws, or circumvent technological protection measures.</span></p>
            ) : (
              <p><span className="legal-red">Queda <strong>prohibido</strong> usar esta plataforma para subir o difundir enlaces que infrinjan derechos de autor o marcas, vulneren acuerdos de licencia o leyes aplicables, o evadan medidas tecnológicas de protección.</span></p>
            )}
          </div>

          {/* 8. Contenido restringido y protección de menores */}
          <div className="legal-section">
            <h3>{isEn ? '8. Restricted content and protection of minors' : '8. Contenido restringido y protección de menores'}</h3>
            {isEn ? (
              <p>Certain content cataloged within our platform is classified as <strong>adult material (+18)</strong>. This content is <strong>inaccessible to unregistered users</strong> and requires age verification. STL HUB implements <strong>automated technical measures</strong> to filter, hide and restrict access to such material, including its exclusion from search engines, sitemaps and public results. <span className="legal-red">The platform is <strong>not directed at minors</strong>, and access to restricted content by minors is the <strong>sole responsibility of their legal guardians</strong>.</span></p>
            ) : (
              <p>Determinados contenidos catalogados dentro de nuestra plataforma están clasificados como <strong>material para adultos (+18)</strong>. Estos contenidos son <strong>inaccesibles para usuarios no registrados</strong> y requieren verificación de edad. STL HUB implementa <strong>medidas técnicas automatizadas</strong> para filtrar, ocultar y restringir el acceso a este tipo de material, incluyendo su exclusión de motores de búsqueda, sitemaps y resultados públicos. <span className="legal-red">La plataforma <strong>no está dirigida a menores de edad</strong>, y el acceso a contenido restringido por parte de menores es <strong>responsabilidad exclusiva de sus tutores legales</strong>.</span></p>
            )}
          </div>

          {/* 9. Limitación de responsabilidad */}
          <div className="legal-section">
            <h3>{isEn ? '9. Limitation of liability' : '9. Limitación de responsabilidad'}</h3>
            {isEn ? (
              <p>Except for willful misconduct or gross negligence and without prejudice to obligations imposed by applicable regulations, <span className="legal-red"><strong>STL HUB shall not be liable</strong> for indirect, incidental, special or consequential damages arising from the use of third-party links.</span></p>
            ) : (
              <p>Salvo dolo o culpa grave y sin perjuicio de las obligaciones que imponga la normativa aplicable, <span className="legal-red"><strong>STL HUB no será responsable</strong> de daños indirectos, incidentales, especiales o consecuenciales derivados del uso de enlaces de terceros.</span></p>
            )}
          </div>

          {/* 10. Exención de intermediario (Safe Harbor) */}
          <div className="legal-section">
            <h3>{isEn ? '10. Intermediary exemption (Safe Harbor)' : '10. Exención de intermediario (Safe Harbor)'}</h3>
            {isEn ? (
              <p>STL HUB acts as an <strong>intermediary service provider in the information society</strong>, as defined by <strong>Directive 2000/31/EC</strong> of the European Parliament, the <strong>United States Digital Millennium Copyright Act (DMCA)</strong>, and equivalent national legislation. Under these regulations, <strong>we have no general obligation to monitor</strong> the content transmitted or stored through third-party links, nor to actively seek facts or circumstances indicating illegal activities. <span className="legal-red">Our liability is limited in accordance with the <strong>exemptions provided for intermediaries</strong> acting in good faith who diligently remove content upon receiving effective notification.</span></p>
            ) : (
              <p>STL HUB actúa como <strong>prestador de servicios de intermediación en la sociedad de la información</strong>, en los términos de la <strong>Directiva 2000/31/CE</strong> del Parlamento Europeo, la <strong>Digital Millennium Copyright Act (DMCA) de Estados Unidos</strong>, y las legislaciones nacionales equivalentes. En virtud de dichas normas, <strong>no tenemos obligación general de supervisar</strong> los contenidos que se transmiten o almacenan a través de enlaces de terceros, ni de buscar activamente hechos o circunstancias que indiquen actividades ilícitas. <span className="legal-red">Nuestra responsabilidad queda limitada conforme a las <strong>exenciones previstas para intermediarios</strong> que actúan de buena fe y que retiran contenido con diligencia tras recibir notificación efectiva.</span></p>
            )}
          </div>

          {/* 11. Colaboración con titulares y autoridades */}
          <div className="legal-section">
            <h3>{isEn ? '11. Collaboration with holders and authorities' : '11. Colaboración con titulares y autoridades'}</h3>
            {isEn ? (
              <p>STL HUB collaborates in <strong>good faith</strong> with rights holders and competent authorities. We maintain <strong>internal procedures</strong> to register complaints, audit links and <strong>prevent republication</strong> of previously removed content.</p>
            ) : (
              <p>STL HUB colabora de <strong>buena fe</strong> con titulares de derechos y autoridades competentes. Mantenemos <strong>procedimientos internos</strong> para registrar denuncias, auditar enlaces y <strong>evitar la republicación</strong> de contenidos previamente retirados.</p>
            )}
          </div>

          {/* 12. Aceptación de términos y jurisdicción */}
          <div className="legal-section">
            <h3>{isEn ? '12. Acceptance of terms and jurisdiction' : '12. Aceptación de términos y jurisdicción'}</h3>
            {isEn ? (
              <p><span className="legal-red">By accessing, browsing or using STL HUB services, the user <strong>fully accepts this Legal Notice</strong> and agrees to comply with its provisions. If you disagree with any of these terms, <strong>you must refrain from using the platform</strong>.</span> For the resolution of any dispute arising from the use of this platform, the parties submit to the <strong>laws of the country of residence of STL HUB's responsible party</strong>, without prejudice to the user's right to access the consumer protection jurisdiction that corresponds to them.</p>
            ) : (
              <p><span className="legal-red">Al acceder, navegar o utilizar los servicios de STL HUB, el usuario <strong>acepta íntegramente el presente Aviso Legal</strong> y se compromete a cumplir sus disposiciones. Si no está de acuerdo con alguno de estos términos, <strong>deberá abstenerse de utilizar la plataforma</strong>.</span> Para la resolución de cualquier controversia derivada del uso de esta plataforma, las partes se someten a las <strong>leyes del país de residencia del responsable de STL HUB</strong>, sin perjuicio del derecho del usuario a acudir a la jurisdicción de protección al consumidor que le corresponda.</p>
            )}
          </div>

          {/* 13. Modificaciones */}
          <div className="legal-section">
            <h3>{isEn ? '13. Modifications' : '13. Modificaciones'}</h3>
            {isEn ? (
              <p>We may update this Notice to reflect regulatory or operational changes. The <strong>current version</strong> will be published on our website with its <strong>effective date</strong>.</p>
            ) : (
              <p>Podremos actualizar este Aviso para reflejar cambios normativos u operativos. La <strong>versión vigente</strong> se publicará en nuestro sitio web con su <strong>fecha de entrada en vigor</strong>.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;