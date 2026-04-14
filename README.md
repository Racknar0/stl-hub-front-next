# STL HUB Frontend

Aplicacion web en Next.js para explorar, buscar y gestionar modelos STL con experiencia premium, panel administrativo y busqueda semantica asistida por IA.

## Resumen

El frontend de STL HUB esta orientado a dos perfiles:

- usuario final: descubrimiento de modelos, detalle de asset, descarga y suscripcion
- administrador: gestion de catalogo, carga batch, monitoreo y herramientas operativas

Integra UX moderna, estado global eficiente y un flujo de busqueda que combina modo normal y modo IA.

## Stack Tecnologico

- Framework: Next.js 15 (App Router)
- UI: React 19 + MUI + SCSS
- Estado global: Zustand
- Networking: Axios
- Virtualizacion: `@tanstack/react-virtual`
- UX complementaria: SweetAlert2, Swiper, Radix Dialog

## Arquitectura de Carpetas

- `src/app`: rutas y paginas (App Router)
- `src/components`: componentes reutilizables de UI y layout
- `src/services`: capa HTTP y clientes de API
- `src/store`: estado global con Zustand
- `src/i18n`: internacionalizacion ES/EN
- `src/styles`: estilos globales y modulares
- `public`: assets estaticos

## Funcionalidades Destacadas

### 1) Busqueda y Descubrimiento

- buscador global con modo normal y modo IA
- listado virtualizado para escalar a grandes resultados
- filtros por categorias, tags y plan (free/premium)
- pagina de resultados con paginacion incremental

### 2) Experiencia de Asset

- detalle del modelo con galeria e informacion enriquecida
- soporte multiidioma para contenido visible
- rutas amigables por slug

### 3) Dashboard Admin

- gestion de assets y metadata
- herramientas de upload batch
- sincronizacion de vectores faltantes con feedback en vivo
- monitoreo de estados y operaciones largas

### 4) Integracion con Backend

- consumo de API REST para auth, assets, pagos y metricas
- propagacion de parametros de busqueda IA
- manejo centralizado de token y errores HTTP

## Variables de Entorno Clave

Crear/configurar variables en entorno del frontend:

- `NEXT_PUBLIC_API_BASE_URL` (recomendada)
- `NEXT_PUBLIC_API_BASE` (compatibilidad)
- `NEXT_PUBLIC_UPLOADS_BASE` (opcional para resolver imagenes)

Ejemplo local:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_UPLOADS_BASE=http://localhost:3001/uploads
```

## Scripts

Desde la carpeta `front_next/`:

```bash
npm install
npm run dev
```

Scripts disponibles:

- `npm run dev`: desarrollo con Turbopack
- `npm run build`: build de produccion
- `npm run start`: servir build
- `npm run lint`: lint del proyecto

## Flujo de Desarrollo

1. Levantar backend
2. Configurar variables de entorno del frontend
3. Iniciar app en `localhost:3000`
4. Validar flujos publicos y de dashboard

## Enfoque de Producto y Portafolio

Este frontend refleja una implementacion orientada a producto real:

- UX pensada para catalogos grandes
- interfaz administrativa para operaciones complejas
- integracion de IA sin sacrificar rendimiento de UI
- codigo modular y mantenible para evolucion continua

## Capturas y Demo

Se recomienda agregar en este README:

- captura de Home
- captura de Busqueda IA
- captura del Dashboard de Assets
- enlace a demo en produccion
