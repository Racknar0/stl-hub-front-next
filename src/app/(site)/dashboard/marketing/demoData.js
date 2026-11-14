// Datos de ejemplo para la maqueta del módulo Marketing.
// Nada de esto viene del backend todavía: sirve para ver cómo quedaría la pantalla.
// Las cifras imitan el estado real de la cuenta de Brevo a 14/11/2026.

export const RESUMEN = {
  contactos: 597,
  enviadosHoy: 5,
  limiteDiario: 300,
  enCola: 0,
  proximoEnvio: 'Mañana 08:00',
  aperturaMedia: 6.9,
  clicMedio: 1.0,
  bajas: 3,
  quejasSpam: 0,
};

export const CICLO = [
  {
    key: 'nuevos',
    clase: 's-new',
    nombre: 'Nuevos',
    cantidad: 22,
    regla: 'Registrados hace menos de 15 días. Están recorriendo el embudo.',
  },
  {
    key: 'activos',
    clase: 's-active',
    nombre: 'Activos',
    cantidad: 36,
    regla: 'Abrieron, hicieron clic, entraron o descargaron en los últimos 60 días.',
  },
  {
    key: 'dormidos',
    clase: 's-sleep',
    nombre: 'Dormidos',
    cantidad: 540,
    regla: 'Sin señal de vida en 60 días. Reciben el correo de reenganche.',
  },
  {
    key: 'fuera',
    clase: 's-out',
    nombre: 'Fuera',
    cantidad: 0,
    regla: 'No reaccionaron al reenganche. Sin marketing, conservan su cuenta.',
  },
];

export const EMBUDO = [
  {
    dia: 1,
    etiqueta: '1 h',
    asunto: 'Tu regalo de hoy ya está listo 🎲',
    plantilla: 'STL Gratis 1 · Bienvenida',
    enviados: 0,
    aperturas: 0,
    clics: 0,
  },
  {
    dia: 3,
    etiqueta: 'Día 3',
    espera: '2 días',
    asunto: 'Lo gratis es solo la muestra',
    plantilla: 'STL Gratis 2 · Premium',
    enviados: 0,
    aperturas: 0,
    clics: 0,
  },
  {
    dia: 7,
    etiqueta: 'Día 7',
    espera: '4 días',
    asunto: 'Lo que todos están imprimiendo esta semana',
    plantilla: 'STL Gratis 3 · Top descargas',
    enviados: 0,
    aperturas: 0,
    clics: 0,
  },
  {
    dia: 12,
    etiqueta: 'Día 12',
    espera: '5 días',
    asunto: 'Un rollo de filamento o un millón de modelos',
    plantilla: 'STL Gratis 4 · Planes',
    enviados: 0,
    aperturas: 0,
    clics: 0,
  },
];

export const AUDIENCIAS = [
  {
    nombre: 'Activos',
    regla: 'Abrió, hizo clic, inició sesión o descargó · últimos 60 días',
    contactos: 36,
    apertura: 42.0,
    estado: 'on',
    senal: 'propia',
  },
  {
    nombre: 'Dormidos',
    regla: 'Sin ninguna señal · 60 días · registro hace más de 45 días',
    contactos: 540,
    apertura: 0.0,
    estado: 'wait',
    senal: 'propia',
  },
  {
    nombre: 'Nuevos',
    regla: 'Registrados en los últimos 15 días',
    contactos: 22,
    apertura: 0.0,
    estado: 'on',
    senal: 'propia',
  },
  {
    nombre: 'Premium',
    regla: 'Con suscripción activa · excluidos de los correos de venta',
    contactos: 0,
    apertura: 0.0,
    estado: 'off',
    senal: 'web',
  },
  {
    nombre: 'Bloqueados',
    regla: 'Baja voluntaria, rebote duro o queja de spam',
    contactos: 3,
    apertura: 0.0,
    estado: 'off',
    senal: 'brevo',
  },
];

export const CAMPANAS = [
  {
    nombre: 'Reenganche a dormidos',
    tipo: 'Única',
    audiencia: 'Dormidos',
    destinatarios: 540,
    enviados: 0,
    estado: 'draft',
    nota: 'La cola la reparte sola en 3 tandas (100 · 200 · 240) respetando el cupo diario.',
  },
  {
    nombre: 'Novedades de la semana',
    tipo: 'Recurrente',
    audiencia: 'Activos',
    destinatarios: 36,
    enviados: 0,
    estado: 'draft',
    nota: 'Cada 1 o 2 semanas, con los modelos nuevos de esos días.',
  },
];

export const PLANTILLAS = [
  {
    id: 15,
    nombre: 'STL Gratis 1 · Bienvenida',
    asunto: 'Tu regalo de hoy ya está listo 🎲',
    imagen: 'gratis-cada-dia',
    estado: 'on',
    uso: 'Embudo · día 1',
  },
  {
    id: 16,
    nombre: 'STL Gratis 2 · Premium',
    asunto: 'Lo gratis es solo la muestra',
    imagen: 'millon-archivos',
    estado: 'on',
    uso: 'Embudo · día 3',
  },
  {
    id: 17,
    nombre: 'STL Gratis 3 · Top descargas',
    asunto: 'Lo que todos están imprimiendo esta semana',
    imagen: null,
    estado: 'on',
    uso: 'Embudo · día 7',
  },
  {
    id: 18,
    nombre: 'STL Gratis 4 · Planes',
    asunto: 'Un rollo de filamento o un millón de modelos',
    imagen: 'premium',
    estado: 'on',
    uso: 'Embudo · día 12',
  },
  {
    id: 19,
    nombre: 'STL Gratis 5 · Reenganche',
    asunto: '¿Sigues imprimiendo en 3D?',
    imagen: 'gratis-cada-dia',
    estado: 'off',
    uso: 'Campaña única',
  },
];

export const ETIQUETAS_ESTADO = {
  on: { clase: 't-on', texto: 'Activa' },
  off: { clase: 't-off', texto: 'Inactiva' },
  draft: { clase: 't-draft', texto: 'Borrador' },
  wait: { clase: 't-wait', texto: 'Pendiente' },
};
