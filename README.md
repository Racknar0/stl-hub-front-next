yarn dev
# STL HUB — Frontend

Frontend moderno y robusto para la plataforma STL HUB, desarrollado en **Next.js**. Permite la gestión, visualización y descarga de assets digitales premium y gratuitos, con flujos avanzados de autenticación, administración y experiencia de usuario.

---

## 🚀 Características principales

- **Next.js 14+** con App Router y estructura modular
- **Autenticación y registro** con activación por email y recuperación de contraseña
- **Gestión de assets**: subida, edición, categorías, tags, control de descargas y links MEGA
- **Panel de administración** con tablas avanzadas (Material React Table)
- **Sistema de notificaciones** y reportes de links caídos
- **Integración con pagos** (PayPal, Stripe, etc.)
- **Soporte para cuentas premium y suscripciones**
- **Internacionalización (i18n)**: Español e Inglés
- **UI moderna y responsiva** (SCSS modular, componentes propios)
- **Alertas y modales personalizados** (SweetAlert2, SimplyModal)
- **Integración con MEGA.nz** para descargas seguras y chequeo de links

---

## 📁 Estructura del proyecto

```
front_next/
│
├── public/                # Imágenes, logos y archivos estáticos
├── src/
│   ├── app/               # Rutas y páginas principales (Next.js App Router)
│   │   ├── (site)/        # Rutas del sitio (login, register, dashboard, etc.)
│   │   ├── layout.js      # Layout global
│   │   └── globals.css    # Estilos globales
│   ├── components/        # Componentes reutilizables (modales, tablas, botones, etc.)
│   ├── helpers/           # Utilidades y helpers (alertas, manejo de errores, etc.)
│   ├── services/          # Servicios para llamadas HTTP y lógica de negocio
│   ├── store/             # Estado global (Zustand)
│   ├── i18n/              # Archivos de traducción y configuración de idiomas
│   └── styles/            # SCSS modular y estilos base
├── .env                   # Variables de entorno (API URLs, claves, etc.)
├── package.json           # Dependencias y scripts
└── README.md              # Este archivo
```

---

## ⚙️ Instalación y ejecución

1. **Clona el repositorio:**
	```bash
	git clone https://github.com/tuusuario/stlhub-front.git
	cd stlhub-front
	```

2. **Instala las dependencias:**
	```bash
	npm install
	# o
	yarn install
	```

3. **Configura las variables de entorno:**
	- Crea un archivo `.env.local` basado en `.env.example` (si existe).
	- Ejemplo de variables:
	  ```env
	  NEXT_PUBLIC_API_URL=http://localhost:3001/api
	  NEXT_PUBLIC_FRONT_URL=http://localhost:3000
	  ```

4. **Ejecuta el servidor de desarrollo:**
	```bash
	npm run dev
	# o
	yarn dev
	```

5. **Abre la app en tu navegador:**
	[http://localhost:3000](http://localhost:3000)

---

## 🧩 Principales módulos y rutas

- `/login` — Inicio de sesión de usuario
- `/register` — Registro y activación de cuenta
- `/forgot-password` — Recuperación de contraseña
- `/dashboard/assets` — Gestión de assets (admin)
- `/dashboard/users` — Gestión de usuarios (admin)
- `/premium` — Página de suscripción premium
- `/` — Home pública

---

## 🛠️ Tecnologías y librerías clave

- **Next.js** — Framework React para SSR y SSG
- **Material UI** — Componentes visuales y tablas avanzadas
- **SweetAlert2** — Alertas y diálogos modernos
- **Zustand** — Estado global simple y eficiente
- **SCSS** — Estilos modulares y personalizables
- **Axios** — Llamadas HTTP centralizadas
- **MEGA.nz** — Integración para descargas seguras

---

## 🌐 Internacionalización

- Español e Inglés
- Cambia el idioma desde el menú o automáticamente según preferencia del usuario

---

## 💡 Consejos de desarrollo

- **Componentiza**: Usa los componentes de `/src/components/common` para mantener consistencia visual.
- **Centraliza llamadas HTTP**: Usa `HttpService` para todas las peticiones al backend.
- **Traduce textos**: Usa los helpers de `/src/i18n` para soportar ambos idiomas.
- **Personaliza estilos**: Modifica los archivos SCSS en `/src/styles` para adaptar la UI a tu marca.

---

## 📝 Contribuciones

¡Las contribuciones son bienvenidas!  
Abre un issue o un pull request con tu mejora o corrección.

---

## 🛡️ Seguridad

- Nunca subas tus archivos `.env` ni claves privadas al repositorio.
- Usa HTTPS en producción.
- Revisa los permisos de usuario y la protección de rutas en el backend.

---

## 📦 Despliegue

Puedes desplegar fácilmente en [Vercel](https://vercel.com/) o cualquier plataforma compatible con Next.js.

---

## 📚 Recursos útiles

- [Documentación Next.js](https://nextjs.org/docs)
- [Material UI](https://mui.com/)
- [SweetAlert2](https://sweetalert2.github.io/)
- [MEGAcmd](https://mega.nz/cmd)

---

**STL HUB** — Tu plataforma para assets digitales premium, segura y escalable.

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
