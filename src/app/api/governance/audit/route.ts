import { getSession } from '@/lib/auth';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';

const SCORE_ORDER: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, F: 4 };

function globalScore(scores: string[]): string {
  if (!scores.length) return 'F';
  const worst = scores.reduce((acc, s) => (SCORE_ORDER[s] > SCORE_ORDER[acc] ? s : acc), 'A');
  return worst;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const rows = await supabaseQuery('gov_audit_scores', 'GET', {
      order: 'audit_date.desc',
    });

    if (!rows || rows.length === 0) {
      return Response.json({ projects: [], empty: true });
    }

    // Agrupar por proyecto (más reciente por proyecto+area)
    const latest: Record<string, Record<string, typeof rows[0]>> = {};
    for (const row of rows) {
      const p = row.project as string;
      const a = row.area as string;
      if (!latest[p]) latest[p] = {};
      if (!latest[p][a]) latest[p][a] = row;
    }

    const projects = Object.entries(latest).map(([project, areas]) => {
      const areaList = Object.values(areas);
      const scores = areaList.map(r => r.score as string);
      return {
        project,
        global_score: globalScore(scores),
        areas: areaList.map(r => ({
          area: r.area,
          score: r.score,
          priority: r.priority,
          debt_hours: r.debt_hours,
          risk: r.risk,
          consequence: r.consequence,
          audit_date: r.audit_date,
        })),
      };
    });

    return Response.json({ projects, empty: false });
  } catch (err) {
    console.error('[governance/audit] Error GET:', err);
    return Response.json({ error: 'Error al cargar audit scores' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const body = await request.json();
    const { project, area, score, priority, debt_hours, risk, consequence, audit_date } = body;

    if (!project || !area || !score) {
      return Response.json({ error: 'project, area y score son requeridos' }, { status: 400 });
    }

    const result = await supabaseInsert('gov_audit_scores', {
      project,
      area,
      score,
      priority: priority || null,
      debt_hours: debt_hours || null,
      risk: risk || null,
      consequence: consequence || null,
      audit_date: audit_date || new Date().toISOString().split('T')[0],
    });

    return Response.json(result[0] || result, { status: 201 });
  } catch (err) {
    console.error('[governance/audit] Error POST:', err);
    return Response.json({ error: 'Error al crear audit score' }, { status: 500 });
  }
}
