/**
 * puppeteer-drive-upload.mjs
 * Abre Chrome con el perfil de Guillermo, navega a la carpeta /governance en Drive,
 * crea subcarpeta /comercial (si no existe) y sube los 8 docs .md
 * Uso: node scripts/puppeteer-drive-upload.mjs
 */
import puppeteer from 'puppeteer-core';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

import { execSync, spawn } from 'child_process';

const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const GOVERNANCE_FOLDER_ID = '1BSUBvK0pO_o845NKPXQRWr7ChjN4Dd7l';
const DOCS_DIR = path.join(os.homedir(), 'Claude', 'DocumentacionSMC');
const DEBUG_PORT = 9222;

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

console.log('\n🤖 Puppeteer Drive Upload');
console.log('══════════════════════════════\n');
console.log(`Chrome: ${CHROME_PATH}`);

// Copiar perfil Default a un directorio temporal para no conflictar con Chrome abierto
const TEMP_PROFILE = `/tmp/chrome-smc-drive-${Date.now()}`;
const SRC_PROFILE = path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome', 'Default');
console.log(`Copiando perfil Default → ${TEMP_PROFILE}...`);
await fs.mkdir(TEMP_PROFILE, { recursive: true });
// Copiar solo los archivos de sesión esenciales (no todo el perfil para no demorar)
try {
  execSync(`cp -r "${SRC_PROFILE}/Cookies" "${TEMP_PROFILE}/" 2>/dev/null || true`);
  execSync(`cp -r "${SRC_PROFILE}/Login Data" "${TEMP_PROFILE}/" 2>/dev/null || true`);
  execSync(`cp -r "${SRC_PROFILE}/Network" "${TEMP_PROFILE}/" 2>/dev/null || true`);
  execSync(`cp -r "${SRC_PROFILE}/IndexedDB" "${TEMP_PROFILE}/" 2>/dev/null || true`);
  execSync(`cp -r "${SRC_PROFILE}/Local Storage" "${TEMP_PROFILE}/" 2>/dev/null || true`);
} catch {}
console.log(`✅ Perfil copiado`);

const USER_DATA_DIR = `/tmp/chrome-smc-root-${Date.now()}`;
await fs.mkdir(`${USER_DATA_DIR}/Default`, { recursive: true });
// Mover los archivos copiados al formato correcto
try { execSync(`cp -r "${TEMP_PROFILE}/"* "${USER_DATA_DIR}/Default/" 2>/dev/null || true`); } catch {}

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: false,
  userDataDir: USER_DATA_DIR,
  args: [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
  ],
  defaultViewport: { width: 1400, height: 900 },
});

const page = await browser.newPage();

// Navegar a carpeta governance
const govUrl = `https://drive.google.com/drive/folders/${GOVERNANCE_FOLDER_ID}`;
console.log(`\n📁 Navegando a governance: ${govUrl}`);
await page.goto(govUrl, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {
  console.log('   ⚠️  networkidle2 timeout — continuando...');
});
await new Promise(r => setTimeout(r, 3000));

// Tomar screenshot inicial
await page.screenshot({ path: '/tmp/drive_01_governance.png' });
console.log('📸 Screenshot: /tmp/drive_01_governance.png');

// Verificar si estamos en Drive (no en login)
const url = page.url();
if (url.includes('accounts.google.com')) {
  console.log('\n⚠️  Chrome no está logueado en esta cuenta. Por favor:');
  console.log('   1. En el Chrome que se abrió, inicia sesión con guillermo@smconnection.cl');
  console.log('   2. Navega a drive.google.com');
  console.log('   3. Vuelve a ejecutar este script');
  await browser.close();
  process.exit(1);
}

console.log(`✅ Drive abierto — URL: ${page.url().slice(0, 80)}`);

// Buscar si ya existe carpeta /comercial en la lista
await new Promise(r => setTimeout(r, 2000));

const comercialExists = await page.evaluate(() => {
  const items = Array.from(document.querySelectorAll('[data-id]'));
  return items.some(el => {
    const nameEl = el.querySelector('[data-tooltip]') || el;
    return (nameEl.getAttribute('data-tooltip') || nameEl.textContent || '').toLowerCase().includes('comercial');
  });
});

let comercialFolderUrl;

if (!comercialExists) {
  console.log('\n📁 Creando carpeta /comercial...');

  // Hacer click en "New" button para crear carpeta
  const newButton = await page.$('[data-tooltip="New"], [aria-label="New"], button[class*="new"]');
  if (newButton) {
    await newButton.click();
    await new Promise(r => setTimeout(r, 1500));
  } else {
    // Intentar con keyboard shortcut Shift+F para nueva carpeta
    console.log('   Intentando con atajo de teclado...');
    await page.keyboard.press('F'); // En Drive, F = nueva carpeta (con cursor en lista)
    await new Promise(r => setTimeout(r, 1000));
  }

  // Si hay un dialog de nueva carpeta
  const folderDialog = await page.$('[aria-label="New folder"]');
  if (!folderDialog) {
    // Buscar el botón de carpeta en el menú desplegable
    const folderOption = await page.$x('//span[contains(text(), "Folder") or contains(text(), "Carpeta")]');
    if (folderOption.length > 0) {
      await folderOption[0].click();
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Escribir nombre de la carpeta
  const nameInput = await page.$('[aria-label="Folder name"], input[type="text"][value="Untitled folder"]');
  if (nameInput) {
    await nameInput.click({ clickCount: 3 });
    await nameInput.type('comercial');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 2000));
    console.log('   ✅ Carpeta /comercial creada');
  } else {
    console.log('   ⚠️  No se pudo crear la carpeta automáticamente');
    console.log('   Por favor créala manualmente y presiona Enter...');
    await new Promise(r => setTimeout(r, 5000));
  }

  await page.screenshot({ path: '/tmp/drive_02_after_create.png' });
} else {
  console.log('📁 Carpeta /comercial ya existe en governance');
}

// Navegar a /comercial
// Buscar el elemento de la carpeta y hacer doble click
await new Promise(r => setTimeout(r, 1500));
const comercialItem = await page.$x('//div[@data-tooltip="comercial" or contains(.,"comercial")]');

if (comercialItem.length > 0) {
  await comercialItem[0].dblclick();
  await new Promise(r => setTimeout(r, 2000));
  comercialFolderUrl = page.url();
  console.log(`\n📁 Dentro de /comercial: ${comercialFolderUrl.slice(0, 80)}`);
} else {
  console.log('\n⚠️  No pude navegar automáticamente. Intentando buscar el folder ID...');
  // Buscar el ID de la carpeta en el DOM
  const folderLinks = await page.$$eval('a[href*="folders"]', els =>
    els.map(el => ({ href: el.href, text: el.textContent?.trim() }))
  );
  const comercialLink = folderLinks.find(l => l.text.toLowerCase().includes('comercial'));
  if (comercialLink) {
    await page.goto(comercialLink.href, { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    comercialFolderUrl = page.url();
    console.log(`✅ Navegado a /comercial via link`);
  }
}

await page.screenshot({ path: '/tmp/drive_03_comercial_folder.png' });
console.log('📸 Screenshot: /tmp/drive_03_comercial_folder.png');

// Subir archivos usando input file oculto que Drive expone
console.log('\n📤 Subiendo archivos .md...');

let uploaded = 0;
for (const docName of COMERCIAL_DOCS) {
  const filePath = path.join(DOCS_DIR, docName);

  // Verificar que el archivo existe
  try {
    await fs.access(filePath);
  } catch {
    console.log(`  ⏭  ${docName} — no encontrado en ${DOCS_DIR}`);
    continue;
  }

  process.stdout.write(`  ↑ ${docName.padEnd(35)}`);

  try {
    // Drive tiene un input oculto de tipo file para subir
    const fileInput = await page.$('input[type=file]');
    if (fileInput) {
      await fileInput.uploadFile(filePath);
      await new Promise(r => setTimeout(r, 3000));

      // Esperar confirmación de carga (Drive muestra una notificación)
      await page.waitForSelector('[aria-label*="upload" i], [data-id][class*="progress"]', { timeout: 15000 })
        .catch(() => {}); // No fallar si no aparece

      await new Promise(r => setTimeout(r, 1500));
      console.log(`✅`);
      uploaded++;
    } else {
      console.log(`⚠️  No hay input[type=file] disponible`);
    }
  } catch (err) {
    console.log(`❌ ${err.message.slice(0, 60)}`);
  }
}

await page.screenshot({ path: '/tmp/drive_04_after_upload.png' });
console.log('\n📸 Screenshot final: /tmp/drive_04_after_upload.png');

// Recargar y verificar archivos
await page.reload({ waitUntil: 'networkidle2' }).catch(() => {});
await new Promise(r => setTimeout(r, 3000));

const filesInFolder = await page.evaluate(() => {
  const items = document.querySelectorAll('[data-id]');
  return Array.from(items)
    .map(el => el.getAttribute('data-tooltip') || el.querySelector('[aria-label]')?.getAttribute('aria-label') || '')
    .filter(n => n.length > 0);
});

await page.screenshot({ path: '/tmp/drive_05_verify.png' });

console.log('\n═══════════════════════════════');
console.log(`📊 Archivos subidos: ${uploaded}/${COMERCIAL_DOCS.length}`);
console.log(`📁 URL final: ${page.url().slice(0, 80)}`);
console.log('📸 Screenshots: /tmp/drive_0*.png');
console.log('\n✅ Listo. Chrome permanece abierto para verificación manual.');

// NO cerrar el browser — Guillermo lo verifica visualmente
