import { NextResponse } from 'next/server';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.valid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { action, agentId, table, order, limit, filter } = body;

  try {
    if (action === 'list') {
      const agents = await supabaseQuery('agent_config', 'GET', { order: 'agent_id' });
      return NextResponse.json({ agents });
    }
    if (action === 'logs' && agentId) {
      const logs = await supabaseQuery('agent_logs', 'GET', { filter: `agent_id=eq.${agentId}`, order: 'created_at.desc', limit: 20 });
      return NextResponse.json({ logs });
    }
    if (action === 'toggle' && agentId) {
      const agents = await supabaseQuery<{ active: boolean }>('agent_config', 'GET', { filter: `agent_id=eq.${agentId}`, limit: 1 });
      if (!agents.length) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      await supabaseQuery('agent_config', 'PATCH', { filter: `agent_id=eq.${agentId}`, body: { active: !agents[0].active, updated_at: new Date().toISOString() } });
      await supabaseInsert('agent_logs', { agent_id: agentId, agent_name: agentId, action: 'toggle', detail: agents[0].active ? 'Desactivado' : 'Activado', status: 'success' });
      return NextResponse.json({ success: true, active: !agents[0].active });
    }
    if (action === 'query' && table) {
      const allowed = ['leads', 'reuniones', 'analytics', 'agent_logs', 'agent_config', 'ux_insights'];
      if (!allowed.includes(table)) return NextResponse.json({ error: 'Tabla no permitida' }, { status: 400 });
      const data = await supabaseQuery(table, 'GET', { order: order || 'created_at.desc', limit: limit || 50, filter });
      return NextResponse.json({ data });
    }
    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
