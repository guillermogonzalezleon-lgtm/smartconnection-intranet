import { NextResponse } from 'next/server';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { runAgentsParallel } from '@/lib/agents/orchestrator';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.valid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const { action, agentId, task, agents: agentIds, prompt, taskType, context, table, order, limit, filter, offset } = body;

    // Track API usage
    supabaseInsert('analytics', { page: '/api/agents', event: action || 'unknown', source: 'api', created_at: new Date().toISOString() }).catch(() => {});

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
      const allowed = ['leads', 'reuniones', 'analytics', 'agent_logs', 'agent_config', 'ux_insights', 'projects', 'project_tasks', 'sprints', 'hoku_chat', 'hoku_knowledge'];
      if (!allowed.includes(table)) return NextResponse.json({ error: 'Tabla no permitida' }, { status: 400 });
      const data = await supabaseQuery(table, 'GET', { order: order || 'created_at.desc', limit: limit || 50, filter, offset });
      return NextResponse.json({ data });
    }

    // Update lead
    if (action === 'update_lead' && body.leadId && body.updates) {
      await supabaseQuery('leads', 'PATCH', { filter: `id=eq.${body.leadId}`, body: { ...body.updates, updated_at: new Date().toISOString() } });
      return NextResponse.json({ success: true });
    }

    // Delete lead
    if (action === 'delete_lead' && body.leadId) {
      await supabaseQuery('leads', 'DELETE', { filter: `id=eq.${body.leadId}` });
      return NextResponse.json({ success: true });
    }

    // Insert chat message
    if (action === 'insert_chat' && body.session_id && body.role && body.content) {
      await supabaseInsert('hoku_chat', {
        session_id: body.session_id,
        role: body.role,
        content: String(body.content).slice(0, 5000),
        created_at: new Date().toISOString(),
      });
      return NextResponse.json({ success: true });
    }

    // ── Panchita → Hoku handoff: save analysis as knowledge ──
    if (action === 'save_handoff' && body.topic && body.analysis) {
      await supabaseInsert('hoku_knowledge', {
        topic: String(body.topic).slice(0, 200),
        content: String(body.analysis).slice(0, 5000),
        source: 'panchita_handoff',
        quality_score: 0.8,
      });
      await supabaseInsert('agent_logs', {
        agent_id: 'panchita',
        agent_name: 'Panchita',
        action: 'handoff',
        detail: `Handoff: ${String(body.topic).slice(0, 200)}`,
        status: 'success',
      }).catch(() => {});
      return NextResponse.json({ success: true });
    }

    // ── Hoku ML: Search knowledge base (full-text search) ──
    if (action === 'hoku_search' && body.query) {
      const words = String(body.query).split(/\s+/).filter(w => w.length > 2).slice(0, 5);
      if (words.length === 0) return NextResponse.json({ results: [] });
      const tsQuery = words.join(' | ');
      const data = await supabaseQuery('hoku_knowledge', 'GET', {
        filter: `search_vector=fts.${encodeURIComponent(tsQuery)}`,
        order: 'quality_score.desc',
        limit: 5,
      }).catch(() => []);
      return NextResponse.json({ results: data });
    }

    // ── Hoku ML: Save knowledge ──
    if (action === 'hoku_learn' && body.topic && body.content) {
      await supabaseInsert('hoku_knowledge', {
        topic: String(body.topic).slice(0, 200),
        content: String(body.content).slice(0, 3000),
        source: body.source || 'conversation',
        quality_score: body.quality_score || 0.5,
      });
      return NextResponse.json({ success: true });
    }

    // ── Hoku ML: Feedback on message ──
    if (action === 'hoku_feedback' && body.messageId && body.feedback) {
      await supabaseQuery('hoku_chat', 'PATCH', {
        filter: `id=eq.${body.messageId}`,
        body: { feedback: body.feedback },
      });
      // If positive feedback, boost related knowledge
      if (body.feedback === 'positive' && body.knowledgeIds?.length) {
        for (const kid of body.knowledgeIds) {
          const existing = await supabaseQuery('hoku_knowledge', 'GET', { filter: `id=eq.${kid}`, limit: 1 });
          if (existing[0]) {
            const current = existing[0] as Record<string, unknown>;
            await supabaseQuery('hoku_knowledge', 'PATCH', {
              filter: `id=eq.${kid}`,
              body: {
                feedback_positive: ((current.feedback_positive as number) || 0) + 1,
                quality_score: Math.min(1, ((current.quality_score as number) || 0.5) + 0.05),
                use_count: ((current.use_count as number) || 0) + 1,
              },
            });
          }
        }
      }
      if (body.feedback === 'negative' && body.knowledgeIds?.length) {
        for (const kid of body.knowledgeIds) {
          const existing = await supabaseQuery('hoku_knowledge', 'GET', { filter: `id=eq.${kid}`, limit: 1 });
          if (existing[0]) {
            const current = existing[0] as Record<string, unknown>;
            await supabaseQuery('hoku_knowledge', 'PATCH', {
              filter: `id=eq.${kid}`,
              body: {
                feedback_negative: ((current.feedback_negative as number) || 0) + 1,
                quality_score: Math.max(0, ((current.quality_score as number) || 0.5) - 0.1),
              },
            });
          }
        }
      }
      return NextResponse.json({ success: true });
    }

    // Update insight estado
    if (action === 'update_insight' && body.insightId) {
      await supabaseQuery('ux_insights', 'PATCH', { filter: `id=eq.${body.insightId}`, body: { estado: body.estado, updated_at: new Date().toISOString() } });
      return NextResponse.json({ success: true });
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

    // ── Sprints CRUD ──
    if (action === 'create_sprint' && body.name) {
      const data = await supabaseInsert('sprints', {
        name: body.name,
        goal: body.goal || '',
        start_date: body.start_date,
        end_date: body.end_date,
        status: body.status || 'planning',
      });
      return NextResponse.json({ success: true, data });
    }

    if (action === 'update_sprint' && body.sprintId) {
      await supabaseQuery('sprints', 'PATCH', {
        filter: `id=eq.${body.sprintId}`,
        body: { ...body.updates }
      });
      return NextResponse.json({ success: true });
    }

    // ── Sub-tareas CRUD ──
    if (action === 'create_task' && body.project_id && body.title) {
      const data = await supabaseInsert('project_tasks', {
        project_id: body.project_id,
        title: body.title,
        status: body.status || 'todo',
        assignee: body.assignee || '',
        story_points: body.story_points || 0,
        sprint_id: body.sprint_id || null,
      });
      return NextResponse.json({ success: true, data });
    }

    if (action === 'update_task' && body.taskId) {
      await supabaseQuery('project_tasks', 'PATCH', {
        filter: `id=eq.${body.taskId}`,
        body: { status: body.status, ...(body.updates || {}) },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_task' && body.taskId) {
      await supabaseQuery('project_tasks', 'DELETE', { filter: `id=eq.${body.taskId}` });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no válida: ' + (action || 'undefined') }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
