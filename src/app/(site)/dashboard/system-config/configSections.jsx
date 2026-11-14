import React from 'react';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import RedeemOutlined from '@mui/icons-material/RedeemOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import CampaignOutlined from '@mui/icons-material/CampaignOutlined';
import CableOutlined from '@mui/icons-material/CableOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import HelpOutline from '@mui/icons-material/HelpOutline';

export const CONFIG_SECTIONS = [
  { id: 'access', label: 'Acceso y descargas', icon: DownloadOutlined, description: 'Acceso gratuito al catálogo premium y límites de descarga por tipo de usuario.' },
  { id: 'freebies', label: 'Freebies', icon: RedeemOutlined, description: 'Selección diaria de modelos gratuitos y tiradas disponibles en el minijuego.' },
  { id: 'prices', label: 'Suscripciones', icon: PaymentsOutlined, description: 'Precios de los planes y duración de cada suscripción.' },
  { id: 'publishing', label: 'Publicaciones', icon: CampaignOutlined, description: 'Comportamiento del piloto de Pinterest y opciones de publicación de reels.' },
  { id: 'connections', label: 'Conexiones y correo', icon: CableOutlined, description: 'Cuentas vinculadas, credenciales de plataformas y prueba de correo.' },
  { id: 'advanced', label: 'Avanzado', icon: TuneOutlined, description: 'Estado de las automatizaciones y otros parámetros del sistema.' },
];

const labels = {
  pinterest_autopilot: ['Piloto automático de Pinterest', 'Define la programación y el comportamiento de las publicaciones automáticas de Pinterest.'],
  pinterest_autopilot_season: ['Temporadas de Pinterest', 'Palabras y temas de temporada que utiliza el piloto automático.'],
  pinterest_autopilot_state: ['Estado del piloto de Pinterest', 'Registro técnico de las últimas ejecuciones del piloto automático.'],
  REELS_DEFAULT_TIME: ['Hora de publicación de reels', 'Hora predeterminada que utiliza el programador de reels.'],
  REELS_LANGUAGE: ['Idioma de los reels', 'Idioma utilizado para generar los textos de los reels.'],
  REELS_PUBLISH_MODE: ['Modo de publicación de reels', 'Determina si se publica realmente o si se ejecuta una simulación.'],
  REELS_YOUTUBE_PRIVACY: ['Privacidad de YouTube Shorts', 'Visibilidad de los Shorts: público, no listado o privado.'],
  THREADS_ACCOUNT: ['Cuenta de Threads', 'Identificación de la cuenta de Threads vinculada.'],
  TIKTOK_ACCOUNT: ['Cuenta de TikTok', 'Identificación de la cuenta de TikTok vinculada.'],
  YOUTUBE_CHANNEL: ['Canal de YouTube', 'Identificación del canal de YouTube conectado.'],
  THREADS_TOKEN: ['Token de Threads', 'Credencial utilizada para publicar en Threads.'],
  THREADS_TOKEN_EXPIRES_AT: ['Caducidad del token de Threads', 'Fecha de vencimiento de la credencial de Threads.'],
  TIKTOK_REFRESH_TOKEN: ['Renovación de TikTok', 'Credencial utilizada para renovar el acceso a TikTok.'],
  YOUTUBE_REFRESH_TOKEN: ['Renovación de YouTube', 'Credencial utilizada para renovar el acceso a YouTube.'],
  PINTEREST_ACCESS_TOKEN: ['Acceso a Pinterest', 'Credencial utilizada para conectarse a Pinterest.'],
  PINTEREST_REFRESH_TOKEN: ['Renovación de Pinterest', 'Credencial utilizada para renovar el acceso a Pinterest.'],
  PINTEREST_TOKEN_EXPIRES_AT: ['Caducidad del acceso a Pinterest', 'Fecha de vencimiento de la credencial de acceso.'],
  PINTEREST_REFRESH_EXPIRES_AT: ['Caducidad de renovación de Pinterest', 'Fecha de vencimiento de la credencial de renovación.'],
};

export function configSection(key) {
  const normalized = String(key).toUpperCase();
  if (normalized.endsWith('_STATE')) return 'advanced';
  if (/TOKEN|ACCOUNT|CHANNEL|SMTP|PASSWORD|SECRET|CREDENTIAL/.test(normalized)) return 'connections';
  if (/^PINTEREST_|^REELS_/.test(normalized)) return 'publishing';
  return 'advanced';
}

export const configLabel = key => labels[key]?.[0] || String(key).replaceAll('_', ' ').toLowerCase().replace(/^./, value => value.toUpperCase());
export const configDescription = (key, description) => labels[key]?.[1] || description || 'Parámetro adicional del sistema. La clave técnica identifica el ajuste que se guardará.';

export function ConfigHelp({ children, compact = false }) {
  return <details className={`config-help ${compact ? 'inline-help' : ''}`}><summary aria-label="¿Para qué sirve?" title="¿Para qué sirve?"><HelpOutline aria-hidden="true" />{!compact && '¿Para qué sirve?'}</summary><div>{children}</div></details>;
}
