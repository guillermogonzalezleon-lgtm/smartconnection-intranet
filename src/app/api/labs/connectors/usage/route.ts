import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!

function headers() {
  return {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  }
}

// GET /api/labs/connectors/usage — stats agregados por conector
export async function GET() {
  try {
    // Joins: usage con connector para tener slug + nombre
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/smc_connector_usage?select=connector_id,tokens_in,tokens_out,cost_usd,latency_ms,status,created_at,smc_connectors(slug,display_name,icon,color)&order=created_at.desc&limit=500`,
      { headers: headers() }
    )
    if (!res.ok) throw new Error(`Supabase GET usage: ${res.status}`)
    const rows = await res.json() as {
      connector_id: string
      tokens_in: number
      tokens_out: number
      cost_usd: number
      latency_ms: number
      status: string
      created_at: string
      smc_connectors: { slug: string; display_name: string; icon: string; color: string }
    }[]

    // Agregar por slug
    const map: Record<string, {
      slug: string; display_name: string; icon: string; color: string;
      calls: number; errors: number; tokens: number; cost: number; avg_latency: number;
      last_used: string | null;
    }> = {}

    for (const r of rows) {
      const s = r.smc_connectors?.slug ?? r.connector_id
      if (!map[s]) {
        map[s] = {
          slug: s,
          display_name: r.smc_connectors?.display_name ?? s,
          icon: r.smc_connectors?.icon ?? '🔌',
          color: r.smc_connectors?.color ?? '#666',
          calls: 0, errors: 0, tokens: 0, cost: 0, avg_latency: 0, last_used: null,
        }
      }
      map[s].calls++
      if (r.status === 'error') map[s].errors++
      map[s].tokens += (r.tokens_in ?? 0) + (r.tokens_out ?? 0)
      map[s].cost += Number(r.cost_usd ?? 0)
      map[s].avg_latency += r.latency_ms ?? 0
      if (!map[s].last_used || r.created_at > map[s].last_used!) map[s].last_used = r.created_at
    }

    const stats = Object.values(map).map(v => ({
      ...v,
      avg_latency: v.calls > 0 ? Math.round(v.avg_latency / v.calls) : 0,
      cost: Math.round(v.cost * 1_000_000) / 1_000_000,
    })).sort((a, b) => b.calls - a.calls)

    return NextResponse.json({ stats, total_calls: rows.length })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno' },
      { status: 500 }
    )
  }
}

// POST /api/labs/connectors/usage — loguear una llamada
export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      slug: string
      agent_slug?: string
      feature?: string
      tokens_in?: number
      tokens_out?: number
      latency_ms?: number
      cost_usd?: number
      status?: 'success' | 'error'
      error_msg?: string
    }

    if (!body.slug) return NextResponse.json({ error: 'slug requerido' }, { status: 400 })

    // Resolver slug → connector_id
    const connRes = await fetch(
      `${SUPABASE_URL}/rest/v1/smc_connectors?slug=eq.${body.slug}&select=id`,
      { headers: headers() }
    )
    const conns = await connRes.json() as { id: string }[]
    if (!conns.length) return NextResponse.json({ error: `conector '${body.slug}' no encontrado` }, { status: 404 })

    const row = {
      connector_id: conns[0].id,
      agent_slug: body.agent_slug ?? null,
      feature: body.feature ?? null,
      tokens_in: body.tokens_in ?? null,
      tokens_out: body.tokens_out ?? null,
      latency_ms: body.latency_ms ?? null,
      cost_usd: body.cost_usd ?? null,
      status: body.status ?? 'success',
      error_msg: body.error_msg ?? null,
    }

    const insRes = await fetch(
      `${SUPABASE_URL}/rest/v1/smc_connector_usage`,
      {
        method: 'POST',
        headers: { ...headers(), Prefer: 'return=representation' },
        body: JSON.stringify(row),
      }
    )
    if (!insRes.ok) throw new Error(`Supabase INSERT usage: ${insRes.status}`)
    const inserted = await insRes.json()
    return NextResponse.json({ logged: inserted[0] }, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno' },
      { status: 500 }
    )
  }
}
