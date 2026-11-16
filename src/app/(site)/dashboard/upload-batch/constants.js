// ╔════════════════════════════════════════════════════════╗
// ║ constants.js                                          ║
// ║ Constantes globales del módulo Batch Upload            ║
// ║ Límites de almacenamiento, tamaños de UI, virtualizer  ║
// ╚════════════════════════════════════════════════════════╝

export const MAX_SIMILARITY_HASH_IMAGES = 8
export const ACCOUNT_MAX_USAGE_PCT = 0.95                // Tope de uso por cuenta: igual al objetivo de "Depurar exceso"
export const UI_ACCOUNT_LIMIT_MB = 18 * 1024            // Tope de respaldo si no se conoce el tamaño real de la cuenta
export const MIN_SELECTOR_FREE_MB = 500                 // Mínimo extra de MB utilizables para aparecer en el selector
export const REVIEW_ROW_HEIGHT = 130
export const REVIEW_VIEWPORT_HEIGHT = 620
export const RIGHT_SIDEBAR_WIDTH = 340
