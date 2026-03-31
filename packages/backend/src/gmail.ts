// Gmail API via Google Service Account (JWT RS256)
// Requiere: GOOGLE_SERVICE_ACCOUNT_JSON env var
// Requiere: domain-wide delegation con scope gmail.send
// Sub: guillermo.gonzalez@smconnection.cl

const GOOGLE_SA = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const GMAIL_SENDER = 'guillermo.gonzalez@smconnection.cl';

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\n/g, '');
  const binary = atob(b64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
  return buffer.buffer;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getGmailToken(): Promise<string> {
  const sa = JSON.parse(GOOGLE_SA || '{}');
  const now = Math.floor(Date.now() / 1000);

  const header = arrayBufferToBase64Url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).buffer as ArrayBuffer);
  const claim = arrayBufferToBase64Url(new TextEncoder().encode(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/gmail.send',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
    sub: GMAIL_SENDER,
  })).buffer as ArrayBuffer);

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${header}.${claim}`).buffer as ArrayBuffer
  );

  const jwt = `${header}.${claim}.${arrayBufferToBase64Url(signature)}`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    console.error('[gmail] Error obteniendo token:', tokenData);
    throw new Error('No se pudo obtener token de Gmail');
  }
  return tokenData.access_token;
}

function buildRawEmail({ to, subject, html }: { to: string; subject: string; html: string }): string {
  const boundary = '----=_boundary_' + Date.now();
  const raw = [
    `From: Ops Center SmartConnection <${GMAIL_SENDER}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(html))),
    `--${boundary}--`,
  ].join('\r\n');

  return btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sendGmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!GOOGLE_SA) return { success: false, error: 'GOOGLE_SERVICE_ACCOUNT_JSON no configurada' };

    const token = await getGmailToken();
    const raw = buildRawEmail({ to, subject, html });

    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${GMAIL_SENDER}/messages/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[gmail] Error enviando:', res.status, err);
      return { success: false, error: `Gmail API error: ${res.status}` };
    }

    const data = await res.json();
    console.info('[gmail] Email enviado:', { to, subject, messageId: data.id });
    return { success: true, messageId: data.id };
  } catch (err) {
    console.error('[gmail] Error:', err);
    return { success: false, error: String(err) };
  }
}
