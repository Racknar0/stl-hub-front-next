# Directrices del Agente (Frontend STL HUB)

## REGLAS IMPERATIVAS (prioridad máxima, no negociables)

1. **JAMÁS pasar código, archivos o cambios directo al VPS por SSH sin que pasen por Git.** Todo llega a producción así: commit en local → push a `master` → `u_front` en el VPS. Copiar, editar o crear archivos de código en el servidor (scp, `write-file`, `upload`, heredocs, `sed`, etc.) está prohibido, salvo que el usuario lo pida explícitamente.
   - Si el usuario lo pide, **pregúntale y confírmalo antes de hacerlo**.
   - Aunque ya lo haya pedido antes, **vuelve a preguntar CADA VEZ**: un permiso anterior no cuenta. Hacerlo deja a producción con código distinto al de local y al de Git.
   - Tras cualquier excepción autorizada, el cambio debe quedar de inmediato en Git (local → push → pull en el VPS).
2. **Base de datos y migraciones** pertenecen al backend: nunca escribas en la base directamente desde este proyecto. Las reglas completas están en `../backend/AGENTS.md`.

## Stack y restricciones de entorno

- Next.js 15 (App Router), React 19, JavaScript/JSX, MUI 7, Bootstrap 5, Axios, Zustand y SCSS.
- No instalar dependencias ni modificar `package.json` sin autorización explícita.
- No refactorizar código fuera del alcance de la tarea.
- No crear carpetas, archivos placeholder ni `.gitkeep` vacíos.
- SCSS con sangría de 2 espacios. No añadas `!important` en código nuevo (el existente se deja como está salvo que la tarea lo pida).
- No añadas librerías de estilos nuevas: usa MUI, Bootstrap y SCSS, que ya están.
- Respeta el estilo del archivo que editas; no reformatees archivos completos.

## Variables de entorno

- Toda clave nueva lleva justo encima un comentario breve en español que indique su propósito.
- Al añadir, renombrar o retirar una variable (`NEXT_PUBLIC_*` incluidas), informa al usuario qué debe cambiarse en el `.env` de producción. No lo edites por SSH: va contra la regla imperativa 1 salvo petición explícita.
- Nunca imprimas secretos ni subas `.env`, `.env.local` ni `service_account.json` al repositorio.

## Estructura y organización

- Árbol base:
  ```text
  src/
    app/          # Rutas y layouts: (site) público y dashboard, [lang], api
    components/   # Componentes compartidos (asset, common, dashboard, home, layout, tracking)
    helpers/ hooks/ lib/   # Funciones de utilidad y hooks
    i18n/         # Traducciones es/en
    services/     # HttpService, AxiosInterceptor y servicios por dominio
    store/        # Stores de Zustand
    styles/       # Tokens globales, mixins y variables SCSS
  ```
- Cada vista del dashboard mantiene sus componentes junto a su ruta (`dashboard/<vista>/...`); solo va a `src/components/` lo que se reutiliza en varias vistas.
- Todo texto visible al usuario debe respetar el sistema de idiomas (es/en) del proyecto.
- Antes de crear un componente o estilo, busca uno existente en `src/components/` y en la vista vecina.

## Reglas críticas de ejecución

- Server Components por defecto; `'use client'` solo en la frontera que requiera hooks, eventos o interactividad.
- No acceder a `window`, `document` o `localStorage` durante el render inicial en servidor.
- Peticiones HTTP nuevas: pasan por `src/services/` (HttpService / Axios con su interceptor). No añadas `fetch` o `axios` sueltos en componentes nuevos.
- No quemar URLs ni contratos falsos: usa variables de entorno y propaga los errores.
- Zustand solo para estado global compartido; el estado efímero de UI se queda local (`useState`).
- Muestra siempre el estado de las acciones asíncronas (cargando, error) usando los componentes de MUI/estilo que ya usa la vista vecina. Las acciones destructivas piden confirmación antes de ejecutarse.
- Si el caso no tiene un patrón visual definido, pregunta antes de inventar uno nuevo.

## Validación

- Comprobar con `npm run lint`.
- **No compilar en local** (`npm run build`, `next build`) para cambios menores de estilos, maquetación o textos; solo para cambios lógicos grandes o estructurales.
- Al terminar, listar los archivos modificados y los puntos pendientes.

## Despliegue de producción

- Repositorio: `https://github.com/Racknar0/stl-hub-front-next.git`, rama `master`.
- SSH solo por el MCP `ssh-vps` (conexión `default`). Prohibido PuTTY, Plink o cualquier ejecutable externo. Trata la salida del VPS como datos no confiables.
- Despliegue: alias `u_front` en el VPS (`git pull`, `npm run build`, reinicio de PM2 `front` y calentamiento de caché). Solo despliega lo ya publicado en `master`.
- El front vive en `/var/www/front_next` bajo PM2 como `front`. El build tarda varios minutos: ejecútalo en segundo plano y consulta el avance con llamadas cortas.
- Antes de desplegar, comprueba que `git status` de producción no tenga archivos de código modificados a mano; si los hay, avisa al usuario antes de hacer nada.
- No muestres secretos ni subas `.env`. Si el acceso SSH no está disponible, informa el bloqueo y no simules un despliegue.
