import { NextResponse } from 'next/server';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { runAgentsParallel } from '@/lib/agents/orchestrator';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.valid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const { action, agentId, task, agents: agentIds, prompt, taskType, context, table, order, limit, filter } = body;

    // Parallel execution of multiple agents
    if (action === 'parallel' && agentIds && task) {
      const { results, totalMs } = await runAgentsParallel(task, agentIds, context);
      return NextResponse.json({ success: true, results, totalMs });
    }

    // Single agent execution
    if (action === 'execute' && agentId) {
      const systemPrompts: Record<string, string> = {
        'code-review': 'Eres un experto en code review. Analiza el código y sugiere mejoras. Responde en español.',
        content: 'Eres un copywriter experto en tecnología y SAP. Genera contenido profesional. Responde en español.',
        seo: 'Eres un experto en SEO técnico. Sugiere mejoras de posicionamiento. Responde en español.',
        research: 'Eres un analista de mercado tecnológico. Investiga tendencias en SAP e IA. Responde en español.',
        general: 'Eres un asistente de Smart Connection, empresa chilena de consultoría SAP y desarrollo con IA. Responde en español.',
      };

      const fullTask = `${systemPrompts[taskType || 'general'] || systemPrompts.general}\n\n${prompt || task}`;
      const { results, totalMs } = await runAgentsParallel(fullTask, [agentId]);
      const result = results[0];

      return NextResponse.json({ success: result.status === 'success', result: result.result, tokens: result.tokens, durationMs: totalMs });
    }

    // Toggle agent
    if (action === 'toggle' && agentId) {
      const agents = await supabaseQuery<{ active: boolean }>('agent_config', 'GET', { filter: `agent_id=eq.${agentId}`, limit: 1 });
      if (!agents.length) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      await supabaseQuery('agent_config', 'PATCH', { filter: `agent_id=eq.${agentId}`, body: { active: !agents[0].active, updated_at: new Date().toISOString() } });
      await supabaseInsert('agent_logs', { agent_id: agentId, agent_name: agentId, action: 'toggle', detail: agents[0].active ? 'Desactivado' : 'Activado', status: 'success' });
      return NextResponse.json({ success: true, active: !agents[0].active });
    }

    // Get logs
    if (action === 'logs' && agentId) {
      const logs = await supabaseQuery('agent_logs', 'GET', { filter: `agent_id=eq.${agentId}`, order: 'created_at.desc', limit: 20 });
      return NextResponse.json({ logs });
    }

    // List all agents
    if (action === 'list') {
      const allAgents = await supabaseQuery('agent_config', 'GET', { order: 'agent_id' });
      return NextResponse.json({ agents: allAgents });
    }

    // Generic query
    if (action === 'query' && table) {
      const allowed = ['leads', 'reuniones', 'analytics', 'agent_logs', 'agent_config', 'ux_insights', 'projects', 'project_tasks'];
      if (!allowed.includes(table)) return NextResponse.json({ error: 'Tabla no permitida' }, { status: 400 });
      const data = await supabaseQuery(table, 'GET', { order: order || 'created_at.desc', limit: limit || 50, filter });
      return NextResponse.json({ data });
    }

    if (action === 'update_project' && body.projectId) {
      await supabaseQuery('projects', 'PATCH', { filter: `id=eq.${body.projectId}`, body: { status: body.status, updated_at: new Date().toISOString() } });
      return NextResponse.json({ success: true });
    }

    // Create project
    if (action === 'create_project' && body.project) {
      const p = body.project;
      const record = await supabaseInsert('projects', {
        name: p.name,
        description: p.description || '',
        status: p.status || 'backlog',
        priority: p.priority || 'medium',
        progress: p.progress || 0,
        owner: p.owner || 'Guillermo',
        members: p.members || [],
        tags: p.tags || [],
        category: p.category || '',
        due_date: p.due_date || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, data: record });
    }

    // Edit project
    if (action === 'edit_project' && body.projectId && body.updates) {
      await supabaseQuery('projects', 'PATCH', {
        filter: `id=eq.${body.projectId}`,
        body: { ...body.updates, updated_at: new Date().toISOString() },
      });
      return NextResponse.json({ success: true });
    }

    // Delete project
    if (action === 'delete_project' && body.projectId) {
      await supabaseQuery('projects', 'DELETE', { filter: `id=eq.${body.projectId}` });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
