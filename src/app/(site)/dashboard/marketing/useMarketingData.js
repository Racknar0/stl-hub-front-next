'use client'

import { useCallback, useEffect, useState } from 'react'

// Carga datos del módulo Marketing y expone el estado de la petición.
// `deps` son los valores de los que depende `fetcher` (p. ej. la página).
export default function useMarketingData(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetcher())
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'No se pudo cargar')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    load()
  }, [load])

  return { data, error, loading, reload: load }
}
