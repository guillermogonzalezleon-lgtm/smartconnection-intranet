/**
 * sync-comercial-drive.mjs
 * Sube los docs de ~/Claude/DocumentacionSMC/ a Google Drive en /governance/comercial
 * Uso: node scripts/sync-comercial-drive.mjs
 */
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';

// Cargar .env.production — maneja valores multilínea con comillas dobles
const envFile = path.join(process.cwd(), '.env.production');
const envContent = await fs.readFile(envFile, 'utf-8').catch(() => '');

// Parser que soporta valores multilínea entre comillas dobles
let remaining = envContent;
while (remaining.length > 0) {
  // Saltar líneas vacías y comentarios
  const lineMatch = remaining.match(/^([^\n]*)\n?/);
  const line = lineMatch ? lineMatch[0] : remaining;
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith('#')) {
    remaining = remaining.slice(line.length);
    continue;
  }

  const eqIdx = trimmed.indexOf('=');
  if (eqIdx < 0) {
    remaining = remaining.slice(line.length);
    continue;
  }

  const key = trimmed.slice(0, eqIdx).trim();
  const rest = remaining.slice(remaining.indexOf('=') + 1);

  let val;
  if (rest.startsWith('"')) {
    // Valor multilínea — buscar comilla de cierre que no esté escapada
    const closeIdx = rest.indexOf('"', 1);
    // Buscar cierre real (puede ser multilínea)
    let endIdx = 1;
    while (endIdx < rest.length) {
      if (rest[endIdx] === '"' && rest[endIdx - 1] !== '\\') break;
      endIdx++;
    }
    val = rest.slice(1, endIdx);
    remaining = rest.slice(endIdx + 1).replace(/^\n/, '');
  } else {
    const nlIdx = rest.indexOf('\n');
    val = nlIdx >= 0 ? rest.slice(0, nlIdx).trim() : rest.trim();
    remaining = nlIdx >= 0 ? rest.slice(nlIdx + 1) : '';
  }

  if (!process.env[key]) process.env[key] = val;
}

// ─── Drive auth (misma lógica que google-drive.ts) ────────────────────────────
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const GOVERNANCE_FOLDER_ID = process.env.GOOGLE_DRIVE_GOVERNANCE_FOLDER_ID;
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';

function base64url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64url');
}

function createJWT() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: SERVICE_ACCOUNT_EMAIL,
    sub: process.env.GOOGLE_IMPERSONATE_EMAIL || SERVICE_ACCOUNT_EMAIL, // DWD: impersonar usuario real
    scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents',
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const segments = [base64url(JSON.stringify(header)), base64url(JSON.stringify(payload))];
  const signingInput = segments.join('.');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(PRIVATE_KEY);
  return `${signingInput}.${base64url(signature)}`;
}

let cachedToken = null;
async function getToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;
  const jwt = createJWT();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!res.ok) throw new Error(`OAuth error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + 55 * 60 * 1000 };
  return data.access_token;
}

async function driveReq(endpoint, options = {}) {
  const token = await getToken();
  const url = endpoint.startsWith('http') ? endpoint : `${DRIVE_API}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) throw new Error(`Drive ${res.status}: ${await res.text()}`);
  return res.json();
}

async function listFiles(folderId) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id,name,mimeType,webViewLink)');
  const data = await driveReq(`/files?q=${q}&fields=${fields}&orderBy=name`);
  return data.files || [];
}

async function createFolder(name, parentId) {
  return driveReq('/files', {
    method: 'POST',
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
  });
}

/**
 * Crea un Google Doc (nativo) con el contenido de un .md
 * Los Google Docs nativos no consumen cuota del Service Account
 */
async function createDocWithContent(name, content, folderId) {
  const token = await getToken();

  // 1. Crear el documento vacío en la carpeta
  const docNameNoExt = name.replace(/\.md$/, '');
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: docNameNoExt,
      mimeType: 'application/vnd.google-apps.document',
      parents: [folderId],
    }),
  });
  if (!createRes.ok) throw new Error(`Create doc ${createRes.status}: ${await createRes.text()}`);
  const doc = await createRes.json();

  // 2. Insertar contenido usando Docs API batchUpdate
  // Los docs nuevos empiezan con un \n en índice 1, insertamos antes del final
  const docsRes = await fetch(`https://docs.googleapis.com/v1/documents/${doc.id}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: content,
          },
        },
      ],
    }),
  });
  if (!docsRes.ok) {
    const err = await docsRes.text();
    // Si falla el contenido, el doc ya está creado — retornamos igual con advertencia
    console.warn(`   ⚠️  Contenido no insertado (${docsRes.status}): ${err.slice(0, 80)}`);
  }

  return doc;
}

// ─── Sync ─────────────────────────────────────────────────────────────────────
const DOCS_DIR = path.join(os.homedir(), 'Claude', 'DocumentacionSMC');
const COMERCIAL_DOCS = [
  'GTM-PLAYBOOK.md',
  'CONTENT-CALENDAR-30D.md',
  'LINKEDIN-FUNNEL.md',
  'GEO-OPTIMIZATION-GUIDE.md',
  'BRAND-VOICE.md',
  'ICP-BUILD-PREMIUM.md',
  'ICP-DISCOVERY-SPRINT.md',
  'OBJECTIONS-BANK.md',
];

console.log('\n🚀 SMC Drive Sync — /governance/comercial');
console.log('═══════════════════════════════════════════\n');

if (!GOVERNANCE_FOLDER_ID) throw new Error('GOOGLE_DRIVE_GOVERNANCE_FOLDER_ID no encontrado');
if (!SERVICE_ACCOUNT_EMAIL) throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL no encontrado');

// 1. Buscar o crear carpeta /comercial
const govFiles = await listFiles(GOVERNANCE_FOLDER_ID);
let folder = govFiles.find((f) => f.name === 'comercial' && f.mimeType === 'application/vnd.google-apps.folder');

if (!folder) {
  folder = await createFolder('comercial', GOVERNANCE_FOLDER_ID);
  console.log(`📁 Carpeta /comercial creada: ${folder.id}`);
} else {
  console.log(`📁 Carpeta /comercial existente: ${folder.id}`);
}
console.log(`   URL: https://drive.google.com/drive/folders/${folder.id}\n`);

// 2. Subir docs
const existingInFolder = await listFiles(folder.id);
const results = [];

for (const docName of COMERCIAL_DOCS) {
  const filePath = path.join(DOCS_DIR, docName);
  process.stdout.write(`  ↑ ${docName.padEnd(35)}`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const already = existingInFolder.find((f) => f.name === docName);

    if (already) {
      console.log(`⏭  ya existe (${already.id.slice(0,8)}...)`);
      results.push({ name: docName, status: 'skip', url: already.webViewLink });
    } else {
      const uploaded = await createDocWithContent(docName, content, folder.id);
      console.log(`✅ subido (${uploaded.id.slice(0,8)}...)`);
      results.push({ name: docName, status: 'ok', url: uploaded.webViewLink });
    }
  } catch (err) {
    console.log(`❌ ${err.message}`);
    results.push({ name: docName, status: 'error', error: err.message });
  }
}

const uploaded = results.filter(r => r.status === 'ok').length;
const skipped = results.filter(r => r.status === 'skip').length;
const errors = results.filter(r => r.status === 'error').length;

console.log(`\n═══════════════════════════════════════════`);
console.log(`📊 Subidos: ${uploaded} | Ya existían: ${skipped} | Errores: ${errors}`);
console.log(`🔗 Ver en Drive: https://drive.google.com/drive/folders/${folder.id}`);

// Guardar folder ID para el script de verificación Puppeteer
await fs.writeFile('/tmp/comercial_folder_id.txt', folder.id);
console.log(`\n✓ Folder ID guardado en /tmp/comercial_folder_id.txt`);
