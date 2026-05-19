export const metadata = {
  title: 'Política de Privacidad | STL Hub',
  description: 'Política de Privacidad, manejo de datos y uso de APIs de terceros en STL Hub.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
            Política de Privacidad Integral
          </h1>
          <p className="mt-4 text-lg text-neutral-400">
            Última actualización: {new Date().toLocaleDateString('es-ES')}
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 sm:p-10 space-y-10 shadow-2xl">
          
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Introducción y Alcance</h2>
            <p className="leading-relaxed text-neutral-400">
              En <strong>STL Hub</strong> respetamos su privacidad y estamos comprometidos con la protección de sus datos personales. 
              Esta Política de Privacidad describe exhaustivamente cómo recopilamos, procesamos, almacenamos y protegemos la información 
              de nuestros usuarios, así como nuestras prácticas relativas a la integración con plataformas y APIs de terceros (como Pinterest, Meta, TikTok, entre otras). 
              Esta política está diseñada para cumplir con los estándares internacionales de protección de datos (incluyendo normativas tipo GDPR y CCPA).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Integración con APIs de Terceros y Redes Sociales</h2>
            <p className="leading-relaxed text-neutral-400 mb-4">
              Para optimizar nuestra operativa y conectar nuestro catálogo de modelos 3D con la comunidad, STL Hub utiliza Interfaces de Programación de Aplicaciones (APIs) de terceros, incluyendo pero no limitándose a <strong>Pinterest, Facebook (Meta), Instagram, y TikTok</strong>. Nuestras integraciones se rigen por los siguientes principios estrictos:
            </p>
            <ul className="list-disc pl-6 space-y-3 text-neutral-400">
              <li><strong>Automatización Interna:</strong> Las aplicaciones conectadas a estas redes sociales se utilizan con el propósito exclusivo de gestionar, automatizar y publicar nuestro propio contenido (assets 3D, renders, catálogos) en nuestros perfiles oficiales.</li>
              <li><strong>Cero Acceso a Credenciales:</strong> STL Hub NUNCA solicita, recopila ni almacena contraseñas de las cuentas personales de redes sociales de los usuarios.</li>
              <li><strong>No Venta de Datos:</strong> No compartimos, vendemos, alquilamos ni transferimos a terceros ningún dato estadístico, personal o de rendimiento obtenido a través de estas APIs.</li>
              <li><strong>Tokens de Acceso:</strong> Los tokens de autenticación (OAuth) utilizados para conectar nuestras cuentas oficiales con estas plataformas se almacenan mediante cifrado de grado militar y no son accesibles públicamente.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Recopilación de Datos del Usuario</h2>
            <p className="leading-relaxed text-neutral-400 mb-4">
              Para brindar nuestros servicios de descarga de archivos STL y modelos 3D, recopilamos la siguiente información estrictamente necesaria:
            </p>
            <ul className="list-disc pl-6 space-y-3 text-neutral-400">
              <li><strong>Datos de Identificación:</strong> Correo electrónico y nombre de usuario al momento del registro.</li>
              <li><strong>Datos de Interacción:</strong> Historial de descargas, modelos guardados en favoritos, clics e interacciones dentro de la plataforma para mejorar el algoritmo de recomendaciones.</li>
              <li><strong>Datos Técnicos:</strong> Dirección IP anonimizada, tipo de navegador y zona horaria para prevención de fraudes y análisis estadístico básico.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Seguridad y Retención de Datos</h2>
            <p className="leading-relaxed text-neutral-400">
              La seguridad de su información es nuestra prioridad. Empleamos protocolos de cifrado robustos (SSL/TLS) para la transmisión de datos y algoritmos de hashing fuertes (como bcrypt) para el almacenamiento de contraseñas. Retenemos su información personal únicamente durante el tiempo necesario para cumplir con los fines descritos en esta política o para cumplir con obligaciones legales.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Sus Derechos</h2>
            <p className="leading-relaxed text-neutral-400 mb-4">
              Usted tiene control total sobre su información. En cualquier momento tiene derecho a:
            </p>
            <ul className="list-disc pl-6 space-y-3 text-neutral-400">
              <li>Solicitar el acceso a los datos personales que tenemos sobre usted.</li>
              <li>Solicitar la rectificación o eliminación total de su cuenta y sus datos asociados.</li>
              <li>Darse de baja de cualquier comunicación promocional.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Modificaciones a esta Política</h2>
            <p className="leading-relaxed text-neutral-400">
              Nos reservamos el derecho de actualizar esta Política de Privacidad para reflejar cambios en nuestras prácticas o requisitos legales y de las APIs de terceros. Cualquier cambio significativo será notificado a través de nuestra plataforma de forma visible.
            </p>
          </section>

          <section className="bg-neutral-800/50 p-6 rounded-xl border border-neutral-700">
            <h2 className="text-xl font-bold text-white mb-2">Contacto y Soporte Legal</h2>
            <p className="leading-relaxed text-neutral-400">
              Si representa a una plataforma de terceros (Pinterest, Meta, etc.) revisando nuestra aplicación, o si es un usuario con dudas sobre el manejo de sus datos, puede contactarnos directamente en nuestro correo oficial de soporte administrativo.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
