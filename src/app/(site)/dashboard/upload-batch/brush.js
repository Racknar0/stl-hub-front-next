// Helpers del "Pincel" (categorías/tags extra aplicados en lote).

// Clave comparable para una categoría o tag (objeto del catálogo o string libre).
export const brushKey = (o) =>
  String(typeof o === 'string' ? o : (o?.slug || o?.name || o?.es || o?.nameEn || o?.en || ''))
    .trim()
    .toLowerCase()

// true si la fila ya contiene todas las categorías y tags del pincel.
export const rowHasBrush = (row, catKeys, tagKeys) => {
  if (!catKeys?.size && !tagKeys?.size) return false
  const rowCats = new Set((Array.isArray(row?.categorias) ? row.categorias : []).map(brushKey))
  const rowTags = new Set((Array.isArray(row?.tags) ? row.tags : []).map(brushKey))
  for (const k of catKeys) if (!rowCats.has(k)) return false
  for (const k of tagKeys) if (!rowTags.has(k)) return false
  return true
}
