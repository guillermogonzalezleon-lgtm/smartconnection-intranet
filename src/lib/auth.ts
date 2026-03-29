import { cookies } from 'next/headers';

const SESSION_SECRET = process.env.SESSION_SECRET || 'sm-connection-2026';

function hashSessionForDay(user: string, dayNumber: number): string {
  const data = `${user}:${SESSION_SECRET}:${dayNumber}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36) + '-' + Buffer.from(user).toString('base64url');
}

function hashSession(user: string): string {
  return hashSessionForDay(user, Math.floor(Date.now() / 86400000));
}

export function verifySession(cookie: string | undefined): { valid: boolean; user?: string } {
  if (!cookie) return { valid: false };
  try {
    const parts = cookie.split('-');
    if (parts.length < 2) return { valid: false };
    const user = Buffer.from(parts.slice(1).join('-'), 'base64url').toString();
    // Sesión válida por 7 días (verifica día actual y 6 anteriores)
    const today = Math.floor(Date.now() / 86400000);
    for (let d = 0; d < 7; d++) {
      if (cookie === hashSessionForDay(user, today - d)) return { valid: true, user };
    }
    return { valid: false };
  } catch { return { valid: false }; }
}

export function createSession(email: string): string {
  return hashSession(email);
}

export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('sc_session');
  return verifySession(sessionCookie?.value);
}
