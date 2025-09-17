import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware'; // Importa el middleware

// Crear un store con Zustand y subscribeWithSelector
const useStore = create(
    subscribeWithSelector((set, get) => ({
        // Estado inicial
        loading: false, // Indica si la aplicación está cargando algo
        userId: null, // ID del usuario
        token: localStorage.getItem('token') || null, // Token de autenticación
        

        // Funciones para manejar el estado de loading
        setLoading: (value) => set({ loading: value }),

        // Función para iniciar sesión
        login: async ( token) => {
            set({ loading: true });
            try {
                localStorage.setItem('token', token);
                set({ token });
            } catch (error) {
                console.error('Error al iniciar sesión:', error);
            } finally {
                set({ loading: false });
            }
        },

        // Función para cerrar sesión
        logout: async () => {
            set({ loading: true });
            set({ token: null });
            try {
                localStorage.removeItem('token');
                set({ token: null });
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
            } finally {
                set({ loading: false });
                console.log('Sesión cerrada');
            }
        },

        // Función para cargar el usuario desde AsyncStorage al inicio
        // loadUser: async () => {
        //     set({ loading: true });
        //     try {
        //         const userId = await AsyncStorage.getItem('userId');
        //         const token = await AsyncStorage.getItem('token');
        //         if (userId && token) {
        //             set({ userId: JSON.parse(userId), token });
        //         }
        //         console.log('Usuario cargado:', userId, token);
        //     } catch (error) {
        //         console.error('Error al cargar los datos del usuario:', error);
        //     } finally {
        //         set({ loading: false });
        //     }
        // },


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
