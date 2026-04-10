import crypto from 'crypto';

// Soporta env vars individuales O JSON completo (GOOGLE_SERVICE_ACCOUNT_JSON en Amplify)
function getCredentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    return { email: sa.client_email, key: sa.private_key };
  }
  return {
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };
}

const { email: SERVICE_ACCOUNT_EMAIL, key: PRIVATE_KEY } = getCredentials();
const GOVERNANCE_FOLDER_ID = process.env.GOOGLE_DRIVE_GOVERNANCE_FOLDER_ID;

const SCOPES = 'https://www.googleapis.com/auth/drive';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';

// Cache del access token (expira en 1h, renovamos a los 55min)
let cachedToken: { token: string; expiresAt: number } | null = null;

function base64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64url');
}

function createJWT(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: SERVICE_ACCOUNT_EMAIL,
    scope: SCOPES,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const segments = [
    base64url(JSON.stringify(header)),
    base64url(JSON.stringify(payload)),
  ];
  const signingInput = segments.join('.');

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(PRIVATE_KEY);

  return `${signingInput}.${base64url(signature)}`;
}

export async function getAccessToken(): Promise<string> {
  // Reutilizar token cacheado si aún es válido (55 min margen)
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const jwt = createJWT();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google OAuth error ${res.status}: ${err}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + 55 * 60 * 1000, // 55 minutos
  };

  return data.access_token;
}

async function driveRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const url = path.startsWith('http') ? path : `${DRIVE_API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Drive API ${res.status}: ${err}`);
  }
  return res;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
  createdTime?: string;
  size?: string;
}

export async function listFiles(folderId?: string): Promise<DriveFile[]> {
  const folder = folderId || GOVERNANCE_FOLDER_ID;
  if (!folder) throw new Error('No folder ID provided');

  const q = encodeURIComponent(`'${folder}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id,name,mimeType,webViewLink,modifiedTime,createdTime,size)');
  const res = await driveRequest(`/files?q=${q}&fields=${fields}&orderBy=name`);
  const data = await res.json();
  return data.files || [];
}

export async function getFileContent(fileId: string): Promise<string> {
  const res = await driveRequest(`/files/${fileId}/export?mimeType=text/html`);
  return res.text();
}

export async function getFileMetadata(fileId: string): Promise<DriveFile> {
  const fields = encodeURIComponent('id,name,mimeType,webViewLink,modifiedTime,createdTime,size');
  const res = await driveRequest(`/files/${fileId}?fields=${fields}`);
  return res.json();
}

export async function createFolder(name: string, parentId?: string): Promise<DriveFile> {
  const parent = parentId || GOVERNANCE_FOLDER_ID;
  const res = await driveRequest('/files', {
    method: 'POST',
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parent ? [parent] : undefined,
    }),
  });
  return res.json();
}

export async function createDocument(name: string, folderId?: string): Promise<DriveFile> {
  const parent = folderId || GOVERNANCE_FOLDER_ID;
  const res = await driveRequest('/files', {
    method: 'POST',
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.document',
      parents: parent ? [parent] : undefined,
    }),
  });
  return res.json();
}

export async function createSpreadsheet(name: string, folderId?: string): Promise<DriveFile> {
  const parent = folderId || GOVERNANCE_FOLDER_ID;
  const res = await driveRequest('/files', {
    method: 'POST',
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: parent ? [parent] : undefined,
    }),
  });
  return res.json();
}

export async function createPresentation(name: string, folderId?: string): Promise<DriveFile> {
  const parent = folderId || GOVERNANCE_FOLDER_ID;
  const res = await driveRequest('/files', {
    method: 'POST',
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.presentation',
      parents: parent ? [parent] : undefined,
    }),
  });
  return res.json();
}

/**
 * Sube un archivo con contenido usando multipart upload.
 * Útil para subir .md, .txt, o cualquier blob a Drive.
 */
export async function uploadFile(
  name: string,
  content: string | Buffer,
  mimeType: string,
  folderId?: string,
): Promise<DriveFile> {
  const parent = folderId || GOVERNANCE_FOLDER_ID;
  const token = await getAccessToken();

  const boundary = `smc_boundary_${Date.now()}`;
  const metadata = JSON.stringify({
    name,
    mimeType,
    parents: parent ? [parent] : undefined,
  });

  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    '',
    typeof content === 'string' ? content : content.toString('utf8'),
    `--${boundary}--`,
  ].join('\r\n');

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`uploadFile error ${res.status}: ${err}`);
  }

  return res.json();
}
