// Datos estáticos del módulo Marketing que el backend todavía no entrega:
// metadatos de las plantillas de Brevo y las campañas planificadas.
// Todo lo demás (contactos, etapas, embudo, plantillas) viene de /admin/email-marketing.

// Metadatos por id de plantilla de Brevo.
export const PLANTILLAS_META = {
  15: { imagen: 'gratis-cada-dia', uso: 'Embudo · día 1' },
  16: { imagen: 'millon-archivos', uso: 'Embudo · día 3' },
  17: { imagen: null, uso: 'Embudo · día 7' },
  18: { imagen: 'premium', uso: 'Embudo · día 12' },
  19: { imagen: 'gratis-cada-dia', uso: 'Campaña única de reenganche' },
}

// Campañas planificadas (aún no hay motor de envío propio).
export const CAMPANAS = [
  {
    nombre: 'Reenganche a dormidos',
    tipo: 'Única',
    audiencia: 'Dormidos',
    estado: 'draft',
    nota: 'Se reparte en tandas respetando el cupo diario de envío.',
  },
  {
    nombre: 'Novedades de la semana',
    tipo: 'Recurrente',
    audiencia: 'Activos',
    estado: 'draft',
    nota: 'Cada 1 o 2 semanas, con los modelos nuevos de esos días.',
  },
]

export const ETIQUETAS_ESTADO = {
  on: { clase: 't-on', texto: 'Activa' },
  off: { clase: 't-off', texto: 'Inactiva' },
  draft: { clase: 't-draft', texto: 'Borrador' },
  wait: { clase: 't-wait', texto: 'Pendiente' },
}

// Asunto de cada paso del embudo de bienvenida, por id de plantilla.
export const ASUNTOS_EMBUDO = {
  15: 'Tu regalo de hoy ya está listo 🎲',
  16: 'Lo gratis es solo la muestra',
  17: 'Lo que todos están imprimiendo esta semana',
  18: 'Un rollo de filamento o un millón de modelos',
}
