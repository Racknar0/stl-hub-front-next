// ╔════════════════════════════════════════════════════════╗
// ║ constants.js                                          ║
// ║ Constantes globales del módulo Batch Upload            ║
// ║ Límites de almacenamiento, tamaños de UI, virtualizer  ║
// ╚════════════════════════════════════════════════════════╝

export const MAX_SIMILARITY_HASH_IMAGES = 8
export const UI_ACCOUNT_LIMIT_MB = 19 * 1024            // Tope real de subida (19 GB)
export const BACKEND_SAFETY_LIMIT_MB = 19 * 1024
export const DISTRIBUTION_HEADROOM_MB = 256              // Margen de seguridad
export const AUTO_DISTRIBUTION_LIMIT_MB = UI_ACCOUNT_LIMIT_MB
export const MIN_SELECTOR_FREE_MB = 0                    // Sin mínimo — si está verde, aparece
export const SELECTOR_GREEN_PCT = 80                     // Umbral verde = igual que Accounts page
export const REVIEW_ROW_HEIGHT = 130
export const REVIEW_VIEWPORT_HEIGHT = 620
export const RIGHT_SIDEBAR_WIDTH = 340
