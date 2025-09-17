import axios from 'axios';
// import { getState } from '../store/useStore';

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
    // console.log(`📡 [Request] -> ${config.method.toUpperCase()} ${config.baseURL}/${config.url}`);
    // console.log('⚠️ Config------------------------:');
    // console.log(JSON.stringify(config, null, 2));

    // let token = null; 
    // const token = getState().token; 
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    
    return config;
  },
  (error) => Promise.reject(error)
);

 
// Interceptor de respuesta para manejar errores de autenticación y otros
axiosInstance.interceptors.response.use(
  (response) => {
    // console.log(`✅ [Response] <- ${response.config.method.toUpperCase()} ${response.config.baseURL}/${response.config.url}`);
    // console.log(JSON.stringify(response.data, null, 2));
    return response;
  },
  (error) => {
    // console.error(`❌ [Request Error] -> ${error.config?.method?.toUpperCase()} ${error.config?.baseURL}${error.config?.url}`);
    
    if (error.response) {
      // Si el servidor respondió con un estado diferente de 2xx
    //  console.error(`⚠️ [Response Error] -> ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // Si la solicitud fue hecha pero no hubo respuesta
     console.error("⚠️ [No Response]:", error.request);
    } else {
      // Error en la configuración de la solicitud
      console.error("❌ [Request Setup Error]:", error.message);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
