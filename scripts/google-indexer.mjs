#!/usr/bin/env node
/**
 * google-indexer.mjs
 * Script para notificar e indexar de forma masiva tus assets en Google.
 *
 * Uso:
 *   node scripts/google-indexer.mjs             → Envía real de 200 URLs
 *   node scripts/google-indexer.mjs --dry-run   → Solo muestra la simulación
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('-d');
const LIMIT = Number(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || 200); // Límite diario estándar o personalizado
const DELAY_MS = 200; // Retraso entre peticiones para evitar saturar rate limits

// 1. Cargar .env manualmente si existe en la raíz
try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        if (key && !key.startsWith('#') && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (err) {
  console.warn(`[WARNING] No se pudo cargar el archivo .env: ${err.message}`);
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://stl-hub.com').replace(/\/$/, '');
const API_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || SITE_URL).replace(/\/$/, '');

// Helper to send email alerts on failure
async function sendEmailAlert(subject, htmlContent) {
  if (DRY_RUN) return;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const fromEmail = process.env.SMTP_EMAIL || '"STL Hub Indexer" <noreply@stl-hub.com>';
  const toEmail = process.env.NEXT_PUBLIC_OFFICIAL_EMAIL || 'stlhubmega@gmail.com';

  if (!host || !user || !pass) {
    console.warn(`[WARNING] No se puede enviar alerta de correo. Faltan variables SMTP en el .env.`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });

    await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject,
      html: htmlContent
    });
    console.log(`   ✉️ Alerta de correo enviada con éxito a: ${toEmail}`);
  } catch (err) {
    console.error(`❌ Error al enviar alerta de correo: ${err.message}`);
  }
}

// 2. Cargar archivo service_account.json
const serviceAccountPath = path.join(process.cwd(), 'service_account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`❌ ERROR: No se encontró el archivo de credenciales 'service_account.json' en la raíz.`);
  console.error(`   Por favor, colócalo en: ${serviceAccountPath}`);
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} catch (err) {
  console.error(`❌ ERROR: El archivo 'service_account.json' no es un JSON válido: ${err.message}`);
  process.exit(1);
}

// Helper para codificación base64url
function base64url(str, encoding = 'utf8') {
  return Buffer.from(str, encoding).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Obtener Access Token mediante firma JWT nativa (RS256)
async function getAccessToken(sa) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    exp,
    iat
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaimSet = base64url(JSON.stringify(claimSet));
  const payload = `${encodedHeader}.${encodedClaimSet}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(payload);
  const signature = base64url(sign.sign(sa.private_key));

  const jwt = `${payload}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error de autenticación con Google OAuth (Status ${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log(`\n🚀 INICIANDO INDEXADOR DE GOOGLE`);
  console.log(`   Sitio Web:    ${SITE_URL}`);
  console.log(`   Backend API:  ${API_URL}`);
  console.log(`   Modo:         ${DRY_RUN ? 'SIMULACIÓN (Dry-run) 🧪' : 'PRODUCCIÓN (Envío Real) ⚡'}\n`);

  // 1. Obtener slugs aprobados/seguros del backend (limitado a los 50 assets iniciales fijos)
  const SITEMAP_ASSET_LIMIT = 50;
  let slugs = [];
  try {
    const slugsEndpoint = `${API_URL}/api/assets/slugs?limit=${SITEMAP_ASSET_LIMIT}&sortBy=id&order=asc`;
    console.log(`🔍 Obteniendo lista de assets desde: ${slugsEndpoint}...`);
    const res = await fetch(slugsEndpoint);
    if (!res.ok) throw new Error(`El backend respondió con código ${res.status}`);
    const rows = await res.json();
    slugs = rows.map(r => r.slug).filter(Boolean);
    console.log(`📋 Se obtuvieron ${slugs.length} assets prioritarios del backend.`);
  } catch (err) {
    console.error(`❌ Error al conectar con el backend: ${err.message}`);
    await sendEmailAlert(
      '⚠️ ERROR: Falló conexión de Indexador Google con el Backend',
      `<h3>Fallo al conectar con el backend</h3>
       <p>El indexador automático de Google en producción no pudo obtener la lista de assets.</p>
       <p><strong>Detalle del error:</strong> ${err.message}</p>
       <p>Por favor verifica que la API en <code>${API_URL}</code> esté funcionando correctamente.</p>`
    );
    process.exit(1);
  }

  // 2. Construir lista de URLs prioritarias (Estáticas + Assets ES y EN)
  const targetUrls = [
    `${SITE_URL}/`,
    `${SITE_URL}/en`,
    `${SITE_URL}/modelos-3d-gratis`,
    `${SITE_URL}/en/free-3d-models`,
    `${SITE_URL}/suscripcion`
  ];

  slugs.forEach(slug => {
    targetUrls.push(`${SITE_URL}/asset/${slug}`);
    targetUrls.push(`${SITE_URL}/en/asset/${slug}`);
  });

  // 3. Cargar el historial de indexación local
  const historyPath = path.join(process.cwd(), 'scripts', 'indexed_history.json');
  let history = {};
  if (fs.existsSync(historyPath)) {
    try {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch {
      // Ignorar error si está corrupto
    }
  }

  // 4. Lote prioritario diario (envía el bloque completo del sitemap)
  const batch = targetUrls.slice(0, LIMIT);
  console.log(`📊 URLs prioritarias en la lista: ${targetUrls.length} | Lote seleccionado hoy: ${batch.length} URLs.\n`);


  if (DRY_RUN) {
    console.log(`🧪 --- MODO SIMULACIÓN: Listando las URLs seleccionadas para hoy ---`);
    batch.forEach((url, i) => console.log(`   ${i + 1}. ${url}`));
    console.log(`\n🧪 --- Fín de la simulación. No se envió nada a Google ---`);
    process.exit(0);
  }

  // 6. Obtener Token de Google
  let token;
  try {
    console.log(`🔐 Autenticando cuenta de servicio con Google...`);
    token = await getAccessToken(serviceAccount);
    console.log(`🔑 Token de acceso obtenido con éxito.`);
  } catch (err) {
    console.error(`❌ Error al obtener token: ${err.message}`);
    await sendEmailAlert(
      '⚠️ ERROR: Falló autenticación de Indexador Google',
      `<h3>Fallo de credenciales con Google Indexing API</h3>
       <p>El indexador automático no pudo obtener el token de acceso de Google OAuth.</p>
       <p><strong>Detalle del error:</strong> ${err.message}</p>
       <p>Verifica que el archivo <code>service_account.json</code> en la raíz sea válido y tenga permisos en la Google Search Console.</p>`
    );
    process.exit(1);
  }

  // 7. Enviar URLs a la Google Indexing API
  console.log(`\n📡 Enviando lote a Google Indexing API...`);
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < batch.length; i++) {
    const url = batch[i];
    try {
      const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          url,
          type: 'URL_UPDATED'
        })
      });

      const data = await res.json();

      if (res.status === 200) {
        successCount++;
        // Guardar en el historial
        history[url] = new Date().toISOString();
        console.log(`   [${i + 1}/${batch.length}] ✓ Enviado: ${url}`);
      } else {
        failCount++;
        console.warn(`   [${i + 1}/${batch.length}] ❌ Error (${res.status}): ${url} - ${data.error?.message || 'Error desconocido'}`);
      }
    } catch (err) {
      failCount++;
      console.warn(`   [${i + 1}/${batch.length}] ❌ Excepción: ${url} - ${err.message}`);
    }

    if (i < batch.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  // 8. Guardar historial actualizado en el disco
  try {
    // Asegurar que la carpeta scripts exista
    const scriptsDir = path.dirname(historyPath);
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');
  } catch (err) {
    console.error(`❌ Error al guardar archivo de historial: ${err.message}`);
  }

  console.log(`\n🏁 RESULTADOS:`);
  console.log(`   Exitosos:   ${successCount}`);
  console.log(`   Fallidos:   ${failCount}`);
  console.log(`   Historial guardado en: ${historyPath}\n`);

  if (failCount > 0) {
    await sendEmailAlert(
      `⚠️ ALERTA: Fallas en envío de indexación Google (${failCount} fallidos)`,
      `<h3>Fallo parcial al enviar URLs a Google Indexing API</h3>
       <p>Durante la indexación diaria, algunas URLs reportaron error.</p>
       <p><strong>Resultados del lote:</strong></p>
       <ul>
         <li>URLs exitosas: ${successCount}</li>
         <li>URLs fallidas: ${failCount}</li>
       </ul>
       <p>Revisa el archivo de log en el servidor para ver el detalle de las URLs con error.</p>`
    );
  }
}

run().catch(async err => {
  console.error(`❌ Error general: ${err.message}`);
  await sendEmailAlert(
    '⚠️ ERROR: Fallo general en el Indexador Google',
    `<h3>Fallo crítico general</h3>
     <p>El script de indexación de Google terminó con un error no controlado.</p>
     <p><strong>Detalle del error:</strong> ${err.message}</p>`
  );
  process.exit(1);
});
