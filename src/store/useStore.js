import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware'; // Importa el middleware

// Helper para decodificar JWT en cliente (sin validar firma)
const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
    return JSON.parse(jsonPayload)
  } catch (e) {
    return null
  }
}

// Idioma inicial constante para SSR para evitar mismatch
const initialLanguage = 'es'

// Crear un store con Zustand y subscribeWithSelector
const useStore = create(
    subscribeWithSelector((set, get) => ({
        // Estado inicial
        loading: false, // Indica si la aplicación está cargando algo
        userId: null, // ID del usuario
        token: null, // Token de autenticación (hidratado en cliente)
        roleId: null, // Rol del usuario (1=user, 2=admin)
        hydrated: false, // indica si ya se leyó localStorage
        
        // Idioma UI
        language: initialLanguage,
        setLanguage: (lang) => {
          const val = (String(lang || 'es').toLowerCase() === 'en') ? 'en' : 'es'
          set({ language: val })
          try { if (typeof window !== 'undefined') localStorage.setItem('lang', val) } catch {}
        },
        // Hidratar idioma desde localStorage tras montar (cliente)
        hydrateLanguage: () => {
          if (typeof window === 'undefined') return
          try {
            const val = window.localStorage.getItem('lang')
            const lang = (String(val || 'es').toLowerCase() === 'en') ? 'en' : 'es'
            set({ language: lang })
          } catch {}
        },
        
        // Loader global (overlay)
        globalLoading: false, // por defecto apagado; se activa sólo en Home
        setGlobalLoading: (value) => set({ globalLoading: Boolean(value) }),

        // Funciones para manejar el estado de loading
        setLoading: (value) => set({ loading: value }),

        // Hidratar token desde localStorage en cliente
        hydrateToken: () => {
            if (typeof window !== 'undefined') {
                const t = window.localStorage.getItem('token');
                if (t) {
                  const payload = decodeJwt(t)
                  set({ token: t, roleId: payload?.roleId ?? null, userId: payload?.id ?? null })
                } else {
                  // asegurar estado explícito cuando no hay token
                  set({ token: null, roleId: null, userId: null })
                }
                // marcar hidratación completada
                set({ hydrated: true })
            } else {
                // entorno no browser, marcar hidratado para evitar bloqueos
                set({ hydrated: true })
            }
        },

        // Función para iniciar sesión
        login: async ( token) => {
            set({ loading: true });
            try {
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem('token', token);
                }
                const payload = decodeJwt(token)
                set({ token, roleId: payload?.roleId ?? null, userId: payload?.id ?? null, hydrated: true });
            } catch (error) {
                console.error('Error al iniciar sesión:', error);
            } finally {
                set({ loading: false });
            }
        },

        // Función para cerrar sesión
        logout: async () => {
            set({ loading: true });
            set({ token: null, roleId: null, userId: null });
            try {
                if (typeof window !== 'undefined') {
                    window.localStorage.removeItem('token');
                }
                set({ token: null, roleId: null, userId: null, hydrated: true });
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
            } finally {
                set({ loading: false });
                console.log('Sesión cerrada');
            }
        },

    }))
);

export default useStore;

export const getState = useStore.getState;

// Suscribirte a todos los cambios de estado
useStore.subscribe(
    (state) => state, // Selector: monitorea todo el estado
    (state) => {
        console.log('Estado actualizado-------------------->:')
        console.log(JSON.stringify(state, null, 2));
    } // Callback ejecutado cada vez que el estado cambia
);
