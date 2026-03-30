import { getSession } from '@/lib/auth';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';

interface Deal {
  id: string;
  client: string;
  stage: string;
  value_clp: number;
  probability: number;
  close_date?: string;
  win_loss_reason?: string;
  contact?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const STAGE_ORDER = ['lead', 'calificado', 'discovery', 'propuesta', 'negociacion', 'cierre'];

function computeMetrics(deals: Deal[]) {
  const totalPipeline = deals.reduce((sum, d) => sum + (d.value_clp || 0), 0);
  const weightedPipeline = deals.reduce((sum, d) => sum + (d.value_clp || 0) * (d.probability || 0) / 100, 0);

  const closed = deals.filter(d => d.stage === 'cierre');
  const winRate = deals.length > 0 ? Math.round((closed.length / deals.length) * 100) : 0;
  const avgDealSize = deals.length > 0 ? Math.round(totalPipeline / deals.length) : 0;

  // Calcular cycle days promedio usando created_at vs close_date
  const dealsWithDates = deals.filter(d => d.close_date && d.created_at);
  const avgCycleDays = dealsWithDates.length > 0
    ? Math.round(
        dealsWithDates.reduce((sum, d) => {
          const created = new Date(d.created_at).getTime();
          const close = new Date(d.close_date!).getTime();
          return sum + Math.abs(close - created) / (1000 * 60 * 60 * 24);
        }, 0) / dealsWithDates.length
      )
    : 0;

  // Agrupar por stage
  const byStage: Record<string, Deal[]> = {};
  for (const stage of STAGE_ORDER) {
    byStage[stage] = deals.filter(d => d.stage === stage);
  }

  // Conversion rates entre stages
  const conversions: Record<string, number> = {};
  for (let i = 0; i < STAGE_ORDER.length - 1; i++) {
    const from = STAGE_ORDER[i];
    const to = STAGE_ORDER[i + 1];
    const fromCount = (byStage[from]?.length || 0) + STAGE_ORDER.slice(i + 1).reduce((s, st) => s + (byStage[st]?.length || 0), 0);
    const toCount = STAGE_ORDER.slice(i + 1).reduce((s, st) => s + (byStage[st]?.length || 0), 0);
    conversions[`${from}_to_${to}`] = fromCount > 0 ? Math.round((toCount / fromCount) * 100) : 0;
  }

  return {
    totalPipeline,
    weightedPipeline: Math.round(weightedPipeline),
    winRate,
    avgDealSize,
    avgCycleDays,
    totalDeals: deals.length,
    byStage,
    conversions,
  };
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const deals = await supabaseQuery<Deal>('gov_pipeline_deals', 'GET', {
      order: 'created_at.desc',
    });

    const metrics = computeMetrics(deals);

    return Response.json({ deals, metrics });
  } catch (err) {
    console.error('[governance/pipeline] Error GET:', err);
    return Response.json({ error: 'Error al cargar pipeline' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const body = await request.json();

    // Soporte para seed bulk
    if (Array.isArray(body)) {
      const results = [];
      for (const deal of body) {
        const { client, stage, value_clp, probability, close_date, contact, notes } = deal;
        if (!client || !stage) continue;
        const result = await supabaseInsert<Deal>('gov_pipeline_deals', {
          client,
          stage: STAGE_ORDER.includes(stage) ? stage : 'lead',
          value_clp: value_clp || 0,
          probability: probability || 0,
          close_date: close_date || null,
          contact: contact || null,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        });
        if (result[0]) results.push(result[0]);
      }
      return Response.json({ created: results.length, deals: results }, { status: 201 });
    }

    const { client, stage, value_clp, probability, close_date, contact, notes } = body;

    if (!client || !stage) {
      return Response.json({ error: 'client y stage son requeridos' }, { status: 400 });
    }

    const result = await supabaseInsert<Deal>('gov_pipeline_deals', {
      client,
      stage: STAGE_ORDER.includes(stage) ? stage : 'lead',
      value_clp: value_clp || 0,
      probability: probability || 0,
      close_date: close_date || null,
      contact: contact || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    });

    return Response.json(result[0] || result, { status: 201 });
  } catch (err) {
    console.error('[governance/pipeline] Error POST:', err);
    return Response.json({ error: 'Error al crear deal' }, { status: 500 });
  }
}
