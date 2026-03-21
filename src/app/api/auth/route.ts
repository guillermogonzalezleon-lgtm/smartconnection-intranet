import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseQuery } from '@/lib/supabase';
import { createSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pin, email, password } = body;

    let userEmail: string;
    let record: Record<string, unknown>;

    if (pin) {
      const data = await supabaseQuery('usuarios', 'GET', { filter: `pin=eq.${encodeURIComponent(pin)}&activo=eq.true`, limit: 1 });
      if (!data.length) return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 });
      record = data[0];
      userEmail = record.email as string;
    } else if (email && password) {
      const data = await supabaseQuery('usuarios', 'GET', { filter: `email=eq.${encodeURIComponent(email)}&activo=eq.true`, limit: 1 });
      if (!data.length) return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
      record = data[0];
      if (password !== record.password_hash && password !== record.password) {
        return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
      }
      userEmail = email;
    } else {
      return NextResponse.json({ error: 'PIN o credenciales requeridos' }, { status: 400 });
    }

    const token = createSession(userEmail);
    const cookieStore = await cookies();
    cookieStore.set('sc_session', token, { path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 86400 });

    return NextResponse.json({ success: true, user: { name: record.nombre || userEmail.split('@')[0], email: userEmail, role: record.rol || 'user' } });
  } catch (err) {
    console.error('Auth error:', err);
    return NextResponse.json({ error: 'Error interno', detail: String(err) }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('sc_session');
  return NextResponse.json({ success: true });
}
