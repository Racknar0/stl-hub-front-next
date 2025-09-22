import axios from 'axios';
import useStore from '../store/useStore';

// Crear una instancia de Axios
const axiosInstance = axios.create({
  baseURL: "http://localhost:3001/api",
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de solicitud para añadir el token de autorización y registrar la URL
axiosInstance.interceptors.request.use(
  (config) => {
    const { token } = useStore.getState();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    
    return config;
  },
  (error) => Promise.reject(error)
);

 
// Interceptor de respuesta para manejar errores de autenticación y otros
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      try { useStore.getState().logout(); } catch {}
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
