import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { createFolder, listFiles, uploadFile } from '@smc/backend/google-drive';

// Docs comerciales a sincronizar con Drive
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

const DOCS_DIR = path.join(os.homedir(), 'Claude', 'DocumentacionSMC');

export async function POST() {
  try {
    // 1. Verificar que la carpeta governance folder ID exista
    const governanceFolderId = process.env.GOOGLE_DRIVE_GOVERNANCE_FOLDER_ID;
    if (!governanceFolderId) {
      return NextResponse.json({ error: 'GOOGLE_DRIVE_GOVERNANCE_FOLDER_ID no configurado' }, { status: 500 });
    }

    // 2. Verificar si ya existe subcarpeta /comercial en governance
    const existing = await listFiles(governanceFolderId);
    let comercialFolder = existing.find(
      (f) => f.name === 'comercial' && f.mimeType === 'application/vnd.google-apps.folder',
    );

    if (!comercialFolder) {
      comercialFolder = await createFolder('comercial', governanceFolderId);
      console.log(`[sync] Carpeta /comercial creada: ${comercialFolder.id}`);
    } else {
      console.log(`[sync] Carpeta /comercial ya existe: ${comercialFolder.id}`);
    }

    const results: Array<{ name: string; status: string; id?: string; url?: string; error?: string }> = [];

    // 3. Subir cada .md
    for (const docName of COMERCIAL_DOCS) {
      const filePath = path.join(DOCS_DIR, docName);
      try {
        const content = await fs.readFile(filePath, 'utf-8');

        // Verificar si ya existe en la carpeta /comercial
        const existingFiles = await listFiles(comercialFolder.id);
        const already = existingFiles.find((f) => f.name === docName);

        if (already) {
          results.push({ name: docName, status: 'already_exists', id: already.id, url: already.webViewLink });
          console.log(`[sync] ${docName} ya existe — skip`);
          continue;
        }

        const uploaded = await uploadFile(docName, content, 'text/plain', comercialFolder.id);
        results.push({ name: docName, status: 'uploaded', id: uploaded.id, url: uploaded.webViewLink });
        console.log(`[sync] ${docName} subido: ${uploaded.id}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ name: docName, status: 'error', error: msg });
        console.error(`[sync] Error con ${docName}: ${msg}`);
      }
    }

    const uploaded = results.filter((r) => r.status === 'uploaded').length;
    const skipped = results.filter((r) => r.status === 'already_exists').length;
    const errors = results.filter((r) => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      folder: { id: comercialFolder.id, url: `https://drive.google.com/drive/folders/${comercialFolder.id}` },
      summary: { uploaded, skipped, errors },
      files: results,
    });
  } catch (err) {
    console.error('[sync] Error general:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// GET: estado de la carpeta /comercial en Drive
export async function GET() {
  try {
    const governanceFolderId = process.env.GOOGLE_DRIVE_GOVERNANCE_FOLDER_ID;
    if (!governanceFolderId) {
      return NextResponse.json({ error: 'GOOGLE_DRIVE_GOVERNANCE_FOLDER_ID no configurado' }, { status: 500 });
    }

    const existing = await listFiles(governanceFolderId);
    const comercialFolder = existing.find(
      (f) => f.name === 'comercial' && f.mimeType === 'application/vnd.google-apps.folder',
    );

    if (!comercialFolder) {
      return NextResponse.json({ exists: false, files: [] });
    }

    const files = await listFiles(comercialFolder.id);
    return NextResponse.json({
      exists: true,
      folder: { id: comercialFolder.id, url: `https://drive.google.com/drive/folders/${comercialFolder.id}` },
      files,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
