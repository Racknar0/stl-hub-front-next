import axios from 'axios';
import useStore from '../store/useStore';
import { timerAlert } from '@/helpers/alerts';

// Crear una instancia de Axios
const axiosInstance = axios.create({
  // baseURL: "http://localhost:3001/api",
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api` || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de solicitud para añadir el token de autorización y registrar la URL
axiosInstance.interceptors.request.use(
  (config) => {
    const { token } = useStore.getState();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    //full url
    console.log('Request URL:', config.baseURL + config.url);
    
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
    if (error.response?.status === 400) {
      const message = error.response?.data?.message || 'Bad Request';
      timerAlert('Error', message, 3000);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
