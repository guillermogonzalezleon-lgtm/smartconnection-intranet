import { supabaseQuery } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const connectors = await supabaseQuery(
      'smc_connectors',
      'GET',
      { order: 'priority.desc', limit: 100 }
    )
    return NextResponse.json({ connectors })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const { slug, status, priority } = await req.json() as { slug: string; status?: string; priority?: number }
    if (!slug) return NextResponse.json({ error: 'slug requerido' }, { status: 400 })

    const SUPABASE_URL = process.env.SUPABASE_URL!
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!

    const body: Record<string, unknown> = {}
    if (status !== undefined) body.status = status
    if (priority !== undefined) body.priority = priority

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/smc_connectors?slug=eq.${slug}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(body),
      }
    )

    if (!res.ok) throw new Error(`Supabase PATCH: ${res.status}`)
    const updated = await res.json()
    return NextResponse.json({ connector: updated[0] })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno' },
      { status: 500 }
    )
  }
}
