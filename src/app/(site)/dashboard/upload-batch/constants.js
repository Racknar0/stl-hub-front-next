// ╔════════════════════════════════════════════════════════╗
// ║ constants.js                                          ║
// ║ Constantes globales del módulo Batch Upload            ║
// ║ Límites de almacenamiento, tamaños de UI, virtualizer  ║
// ╚════════════════════════════════════════════════════════╝

export const MAX_SIMILARITY_HASH_IMAGES = 8
export const UI_ACCOUNT_LIMIT_MB = 18 * 1024
export const BACKEND_SAFETY_LIMIT_MB = 19 * 1024
export const DISTRIBUTION_HEADROOM_MB = 128
export const AUTO_DISTRIBUTION_LIMIT_MB = UI_ACCOUNT_LIMIT_MB
export const MIN_SELECTOR_FREE_MB = 300
export const SIMILARITY_CURRENT_IMAGE_SIZE = Math.round(144 * 1.75)
export const SIMILARITY_MATCH_IMAGE_SIZE = Math.round(154 * 1.75)
export const REVIEW_ROW_HEIGHT = 130
export const REVIEW_VIEWPORT_HEIGHT = 620
export const REVIEW_OVERSCAN = 6
export const RIGHT_SIDEBAR_WIDTH = 340
