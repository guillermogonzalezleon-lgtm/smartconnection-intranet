import { cookies } from 'next/headers';

const SESSION_SECRET = process.env.SESSION_SECRET || 'sm-connection-2026';

function hashSession(user: string): string {
  const data = `${user}:${SESSION_SECRET}:${Math.floor(Date.now() / 86400000)}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36) + '-' + Buffer.from(user).toString('base64url');
}

export function verifySession(cookie: string | undefined): { valid: boolean; user?: string } {
  if (!cookie) return { valid: false };
  try {
    const parts = cookie.split('-');
    if (parts.length < 2) return { valid: false };
    const user = Buffer.from(parts.slice(1).join('-'), 'base64url').toString();
    return { valid: cookie === hashSession(user), user };
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
