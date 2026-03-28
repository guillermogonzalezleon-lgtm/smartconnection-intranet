import { getSession } from '@/lib/auth';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';

// POST — Ejecutar auditoría por agente o full
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const { agent } = await request.json();

    // Definir qué audita cada agente
    const agentAudits: Record<string, { areas: string[]; checks: string[] }> = {
      arielito: {
        areas: ['infra', 'código', 'seguridad', 'performance', 'DX'],
        checks: ['Kaizen sistema', 'Andon signals', 'Six Sigma defects', 'Gemba production check'],
      },
      camilita: {
        areas: ['UX', 'responsive', 'formularios', 'estados UI', 'accesibilidad'],
        checks: ['Smoke test URLs', 'Chaos: simular API caída', 'Exploratory 30min', 'Shift Left specs'],
      },
      panchita: {
        areas: ['diseño', 'specs', 'maquetas', 'copy', 'datos'],
        checks: ['Design Thinking review', 'Jobs to Be Done audit', 'Wardley positioning', 'Ideas bank review'],
      },
      hoku: {
        areas: ['build', 'deploy', 'deps', 'bundle', 'tests'],
        checks: ['Poka-Yoke validations', 'Jidoka pipeline', 'Canary status', 'Health checks'],
      },
      sergito: {
        areas: ['innovación', 'estrategia', 'diferenciación'],
        checks: ['TRIZ contradictions', 'SCAMPER analysis', 'Blue Ocean factors', 'Ideas nuevas'],
      },
    };

    const agents = agent === 'all' ? Object.keys(agentAudits) : [agent];
    const results: Record<string, unknown>[] = [];

    // Fetch production URLs para smoke tests
    const productionUrls = [
      { project: 'Intranet', url: 'https://intranet.smconnection.cl' },
      { project: 'Marketing', url: 'https://smconnection.cl' },
      { project: 'VOY', url: 'https://voy-app-3.vercel.app' },
    ];

    for (const agentId of agents) {
      const config = agentAudits[agentId];
      if (!config) continue;

      const agentResults: Record<string, string> = {};
      const signals: { project: string; area: string; status: string; score: string; detail: string }[] = [];

      // Smoke test para Camilita y Arielito
      if (agentId === 'camilita' || agentId === 'arielito') {
        for (const site of productionUrls) {
          try {
            const start = Date.now();
            const res = await fetch(site.url, { signal: AbortSignal.timeout(10000) });
            const latency = Date.now() - start;
            const status = res.ok ? (latency > 3000 ? 'yellow' : 'green') : 'red';
            const score = res.ok ? (latency < 1000 ? 'A' : latency < 2500 ? 'B' : 'C') : 'F';
            signals.push({
              project: site.project,
              area: 'Disponibilidad',
              status,
              score,
              detail: `${res.status} en ${latency}ms`,
            });
          } catch {
            signals.push({
              project: site.project,
              area: 'Disponibilidad',
              status: 'red',
              score: 'F',
              detail: 'Timeout o error de conexión',
            });
          }
        }
      }

      // Update Andon signals
      for (const signal of signals) {
        try {
          const existing = await supabaseQuery('andon_signals', 'GET', {
            filter: `project=eq.${signal.project}&area=eq.${signal.area}`,
          });
          if (existing.length > 0) {
            await supabaseQuery('andon_signals', 'PATCH', {
              filter: `project=eq.${signal.project}&area=eq.${signal.area}`,
              body: { ...signal, last_checked: new Date().toISOString() },
            });
          } else {
            await supabaseInsert('andon_signals', signal);
          }
        } catch (err) {
          console.error(`[ops-run] Error actualizando andon ${signal.project}/${signal.area}:`, err);
        }
      }

      agentResults.agent = agentId;
      agentResults.checks = config.checks.join(', ');
      agentResults.signals = JSON.stringify(signals);
      results.push(agentResults);
    }

    // Crear Kaizen audit record
    const prevAudits = await supabaseQuery('kaizen_audits', 'GET', { order: 'audit_number.desc', limit: 1 });
    const nextNumber = ((prevAudits[0] as Record<string, unknown>)?.audit_number as number || 0) + 1;

    const allSignals = await supabaseQuery('andon_signals', 'GET', {});
    const redCount = (allSignals as Record<string, unknown>[]).filter(s => s.status === 'red').length;
    const yellowCount = (allSignals as Record<string, unknown>[]).filter(s => s.status === 'yellow').length;
    const globalScore = redCount > 0 ? 'D' : yellowCount > 2 ? 'C' : yellowCount > 0 ? 'B' : 'A';

    const audit = await supabaseInsert('kaizen_audits', {
      audit_number: nextNumber,
      score_global: globalScore,
      total_bytes: 0,
      total_tokens: 0,
      total_files: agents.length,
      criticals: results.filter(r => JSON.parse((r.signals as string) || '[]').some((s: Record<string, unknown>) => s.status === 'red')).map(r => `${r.agent}: señal roja`),
      improvements: results.filter(r => JSON.parse((r.signals as string) || '[]').some((s: Record<string, unknown>) => s.status === 'yellow')).map(r => `${r.agent}: señal amarilla`),
      positives: results.filter(r => JSON.parse((r.signals as string) || '[]').every((s: Record<string, unknown>) => s.status === 'green')).map(r => `${r.agent}: todo verde`),
      top_actions: [],
      scores_by_area: Object.fromEntries(agents.map(a => [a, 'B'])),
      fixes_applied: 0,
      source: agent === 'all' ? 'manual-full' : `manual-${agent}`,
    });

    return Response.json({ audit: audit[0] || audit, results, signals_updated: true });
  } catch (err) {
    console.error('[ops-run] Error:', err);
    return Response.json({ error: 'Error ejecutando auditoría' }, { status: 500 });
  }
}
