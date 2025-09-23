import es from './es'
import en from './en'
import useStore from '../store/useStore'

const dicts = { es, en }

export function useI18n() {
  const lang = useStore((s) => s.language) || 'es'
  const dict = dicts[lang] || dicts.es
  const t = (path, fallback) => {
    const parts = String(path).split('.')
    let cur = dict
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) cur = cur[p]
      else { cur = undefined; break }
    }
    if (typeof cur === 'string') return cur
    return fallback || path
  }
  const get = (path, fallback) => {
    const parts = String(path).split('.')
    let cur = dict
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) cur = cur[p]
      else { cur = undefined; break }
    }
    return cur !== undefined ? cur : fallback
  }
  return { t, get, lang }
}

const i18n = { useI18n }
export default i18n
