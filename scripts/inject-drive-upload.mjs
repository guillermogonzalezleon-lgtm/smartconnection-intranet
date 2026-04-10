/**
 * inject-drive-upload.mjs
 * Inyecta JS en Chrome (ya logueado en Drive) para subir los .md via Fetch API
 * Usa el token de sesión disponible en el contexto del navegador autenticado
 */
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const COMERCIAL_FOLDER_ID = '1oX6hRWPzU4wMceoF3DhlwXRYsFcR55B_';
const DOCS_DIR = path.join(os.homedir(), 'Claude', 'DocumentacionSMC');

const DOCS = [
  'GTM-PLAYBOOK.md',
  'CONTENT-CALENDAR-30D.md',
  'LINKEDIN-FUNNEL.md',
  'GEO-OPTIMIZATION-GUIDE.md',
  'BRAND-VOICE.md',
  'ICP-BUILD-PREMIUM.md',
  'ICP-DISCOVERY-SPRINT.md',
  'OBJECTIONS-BANK.md',
];

// Función para ejecutar JS en Chrome via AppleScript
function runInChrome(js) {
  const escaped = js.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  const script = `
tell application "Google Chrome"
  set r to execute front window's active tab javascript "${escaped}"
  return r
end tell
`;
  return execSync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`, {
    maxBuffer: 10 * 1024 * 1024
  }).toString().trim();
}

// Función alternativa - pasar JS por archivo temporal
async function runJSViaFile(js) {
  const tmpFile = `/tmp/chrome_js_${Date.now()}.js`;
  await fs.writeFile(tmpFile, js);

  const appleScript = `
tell application "Google Chrome"
  set jsCode to (do shell script "cat '${tmpFile}'")
  set r to execute front window's active tab javascript jsCode
  return r
end tell
`;
  try {
    const result = execSync(`osascript << 'APPLESCRIPT'
${appleScript}
APPLESCRIPT`, { maxBuffer: 10 * 1024 * 1024, encoding: 'utf8' });
    return result.trim();
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
}

console.log('\n🤖 Drive Upload via Chrome (sesión autenticada)');
console.log('════════════════════════════════════════════════\n');

// 1. Verificar que estamos en la carpeta /comercial
let currentUrl;
try {
  currentUrl = execSync(`osascript -e 'tell application "Google Chrome" to return URL of active tab of front window'`).toString().trim();
} catch (e) {
  console.error('Error: Chrome no está accesible');
  process.exit(1);
}

console.log(`URL actual: ${currentUrl}`);

if (!currentUrl.includes(COMERCIAL_FOLDER_ID)) {
  console.log('Navegando a /comercial...');
  execSync(`osascript -e 'tell application "Google Chrome" to execute front window'"'"'s active tab javascript "window.location.href = '"'"'https://drive.google.com/drive/folders/${COMERCIAL_FOLDER_ID}'"'"'"'`);
  await new Promise(r => setTimeout(r, 4000));
}

// 2. Obtener el token de autenticación del contexto de Chrome
// Google Drive web usa una cookie SAPISID + SHA1 hash como Bearer token para APIs
const authTokenJS = `
(function() {
  // Intentar obtener el auth token de múltiples fuentes

  // Método 1: Desde el meta tag
  const meta = document.querySelector('meta[name="token"]') ||
               document.querySelector('meta[id="docs-setup"]');
  if (meta && meta.dataset && meta.dataset.token) return JSON.stringify({method: 'meta', token: meta.dataset.token});

  // Método 2: Desde window variables de Drive
  if (window._APP_PARAMS && window._APP_PARAMS.authUser) {
    return JSON.stringify({method: 'app_params', user: window._APP_PARAMS.authUser});
  }

  // Método 3: Desde el bootstrap de Google
  const gsiMeta = document.querySelector('script[data-cfasync]');

  // Método 4: Intentar acceder a las cookies accesibles (no HttpOnly)
  const cookies = {};
  document.cookie.split(';').forEach(c => {
    const [k, v] = c.trim().split('=');
    cookies[k] = v;
  });

  return JSON.stringify({
    method: 'cookies',
    hasSAPISID: !!cookies.SAPISID,
    hasOSID: !!cookies.OSID,
    cookieKeys: Object.keys(cookies).slice(0, 5),
    docTitle: document.title,
    url: window.location.href
  });
})()
`;

console.log('\n🔍 Verificando autenticación...');
const authInfo = await runJSViaFile(authTokenJS);
console.log('Auth info:', authInfo);

let authData;
try {
  authData = JSON.parse(authInfo);
} catch {
  authData = { method: 'unknown' };
}

// 3. Subir archivos usando el API de Drive con SAPISID hash
// La API interna de Google Drive usa X-Goog-AuthUser y el SAPISID cookie para auth
// Alternativa: usar la Drive API pública con el token del usuario

// Para el upload usamos el endpoint de Drive upload multipart
// con credentials: 'include' que envía las cookies automáticamente
// Nota: esto funciona desde el contexto del tab de Drive (mismo origen permite CORS)

console.log('\n📤 Subiendo archivos...');
let uploaded = 0;
let errors = 0;

for (const docName of DOCS) {
  const filePath = path.join(DOCS_DIR, docName);
  process.stdout.write(`  ↑ ${docName.padEnd(35)}`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const docTitle = docName.replace(/\.md$/, '');

    // Inyectar el contenido y crear el archivo via fetch en el contexto del tab
    const uploadJS = `
(async function() {
  const folderId = '${COMERCIAL_FOLDER_ID}';
  const fileName = '${docTitle}';
  const content = ${JSON.stringify(content)};

  try {
    // Obtener token de sesión via Google Accounts
    // Usar SAPISID para generar el hash de autenticación
    const sapisidCookie = document.cookie.split(';').find(c => c.trim().startsWith('SAPISID='));
    if (!sapisidCookie) {
      return JSON.stringify({success: false, error: 'No SAPISID cookie - not authenticated?'});
    }

    const SAPISID = sapisidCookie.split('=')[1];
    const origin = 'https://drive.google.com';
    const timestamp = Math.floor(Date.now() / 1000);

    // Calcular SAPISIDHASH
    const msgBuffer = new TextEncoder().encode(timestamp + ' ' + SAPISID + ' ' + origin);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const sapisidHash = 'SAPISIDHASH=' + timestamp + '_' + hashHex;

    // Intentar crear un Google Doc via Drive API con auth de sesión
    const boundary = 'smc_upload_' + Date.now();
    const metadata = JSON.stringify({
      name: fileName,
      mimeType: 'application/vnd.google-apps.document',
      parents: [folderId]
    });

    const body = '--' + boundary + '\\r\\n' +
      'Content-Type: application/json; charset=UTF-8\\r\\n\\r\\n' +
      metadata + '\\r\\n' +
      '--' + boundary + '\\r\\n' +
      'Content-Type: text/plain\\r\\n\\r\\n' +
      content + '\\r\\n' +
      '--' + boundary + '--';

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'multipart/related; boundary=' + boundary,
          'X-Goog-AuthUser': '0',
          'Authorization': sapisidHash
        },
        body: body
      }
    );

    const data = await res.json();
    if (res.ok) {
      return JSON.stringify({success: true, id: data.id, name: data.name, url: data.webViewLink});
    } else {
      return JSON.stringify({success: false, status: res.status, error: JSON.stringify(data).slice(0, 200)});
    }
  } catch(e) {
    return JSON.stringify({success: false, error: e.message});
  }
})()
`;

    const result = await runJSViaFile(uploadJS);
    let parsed;
    try { parsed = JSON.parse(result); } catch { parsed = { success: false, error: result }; }

    if (parsed.success) {
      console.log(`✅ ${parsed.id?.slice(0,8)}...`);
      uploaded++;
    } else {
      console.log(`❌ ${parsed.error?.slice(0, 60)}`);
      errors++;
    }
  } catch (err) {
    console.log(`❌ ${err.message.slice(0, 60)}`);
    errors++;
  }
}

console.log(`\n${'═'.repeat(48)}`);
console.log(`📊 Subidos: ${uploaded} | Errores: ${errors}`);
console.log(`🔗 Drive: https://drive.google.com/drive/folders/${COMERCIAL_FOLDER_ID}`);

// Recargar la página de Drive para ver los archivos
if (uploaded > 0) {
  execSync(`osascript -e 'tell application "Google Chrome" to execute front window'"'"'s active tab javascript "window.location.reload()"'`);
  console.log('\n✅ Página de Drive recargada');
}
