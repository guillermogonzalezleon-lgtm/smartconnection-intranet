/**
 * /api/labs/route — SMC Registry Router
 *
 * Endpoint central de enrutamiento IA que lee el SMC Registry (Supabase)
 * para resolver qué provider usar, ejecuta la llamada y loguea usage.
 *
 * POST body:
 *   slug        — conector destino (ej: "groq", "claude", "openrouter")
 *   messages    — array OpenAI-compatible [{role, content}]
 *   system?     — system prompt (string)
 *   max_tokens? — default 2048
 *   stream?     — default false
 *   agent_slug? — para logging LLMOps (ej: "hoku", "abap")
 *   feature?    — para logging LLMOps (ej: "intranet-chat")
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!

// ── Provider URL map (slug → completion URL) ──────────────────────────────────
const PROVIDER_URLS: Record<string, string> = {
  claude:      'https://api.anthropic.com/v1/messages',
  groq:        'https://api.groq.com/openai/v1/chat/completions',
  openai:      'https://api.openai.com/v1/chat/completions',
  openrouter:  'https://openrouter.ai/api/v1/chat/completions',
  deepseek:    'https://api.deepseek.com/v1/chat/completions',
  mistral:     'https://api.mistral.ai/v1/chat/completions',
  grok:        'https://api.x.ai/v1/chat/completions',
  cohere:      'https://api.cohere.ai/v2/chat',
  gemini:      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
}

// Default models per slug
const DEFAULT_MODELS: Record<string, string> = {
  claude:     'claude-haiku-4-5-20251001',
  groq:       'llama-3.3-70b-versatile',
  openai:     'gpt-4o-mini',
  openrouter: 'auto',
  deepseek:   'deepseek-chat',
  mistral:    'mistral-small-latest',
  grok:       'grok-3-mini',
  cohere:     'command-a-03-2025',
  gemini:     'gemini-2.0-flash',
}

function sbHeaders() {
  return {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function resolveConnector(slug: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/smc_connectors?slug=eq.${slug}&select=id,slug,status,env_var,models,cost_per_1k`,
    { headers: sbHeaders() }
  )
  const rows = await res.json() as { id: string; slug: string; status: string; env_var: string; models: string[]; cost_per_1k: number }[]
  return rows[0] ?? null
}

async function logUsage(opts: {
  connector_id: string; agent_slug?: string; feature?: string;
  tokens_in?: number; tokens_out?: number; latency_ms?: number;
  cost_usd?: number; status: 'success' | 'error'; error_msg?: string;
}) {
  await fetch(`${SUPABASE_URL}/rest/v1/smc_connector_usage`, {
    method: 'POST',
    headers: { ...sbHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify(opts),
  }).catch(() => { /* non-blocking */ })
}

function estimateCost(tokens: number, costPer1k: number) {
  return Math.round((tokens / 1000) * costPer1k * 1_000_000) / 1_000_000
}

export async function POST(req: Request) {
  const t0 = Date.now()
  let connectorId: string | undefined

  try {
    const body = await req.json() as {
      slug: string
      messages: { role: string; content: string }[]
      system?: string
      max_tokens?: number
      stream?: boolean
      model?: string
      agent_slug?: string
      feature?: string
    }

    const { slug, messages, system, max_tokens = 2048, stream = false, agent_slug, feature } = body
    if (!slug) return NextResponse.json({ error: 'slug requerido' }, { status: 400 })
    if (!messages?.length) return NextResponse.json({ error: 'messages requerido' }, { status: 400 })

    // 1. Resolver conector desde registry
    const connector = await resolveConnector(slug)
    if (!connector) return NextResponse.json({ error: `Conector '${slug}' no encontrado en el registry` }, { status: 404 })
    if (connector.status !== 'active') return NextResponse.json({ error: `Conector '${slug}' está ${connector.status}` }, { status: 403 })

    connectorId = connector.id
    const apiKey = process.env[connector.env_var]
    if (!apiKey) return NextResponse.json({ error: `${connector.env_var} no configurada en env` }, { status: 500 })

    const providerUrl = PROVIDER_URLS[slug]
    if (!providerUrl) return NextResponse.json({ error: `Provider '${slug}' no tiene URL configurada` }, { status: 400 })

    const model = body.model ?? (connector.models?.[0]) ?? DEFAULT_MODELS[slug] ?? 'default'

    // 2. Claude usa formato propio
    if (slug === 'claude') {
      const claudeBody: Record<string, unknown> = {
        model,
        max_tokens,
        messages,
        stream,
      }
      if (system) claudeBody.system = system

      const upstream = await fetch(providerUrl, {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify(claudeBody),
      })

      const latency = Date.now() - t0

      if (stream) {
        await logUsage({ connector_id: connectorId, agent_slug, feature, latency_ms: latency, status: 'success' })
        return new Response(upstream.body, {
          headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        })
      }

      if (!upstream.ok) {
        const err = await upstream.text()
        await logUsage({ connector_id: connectorId, agent_slug, feature, latency_ms: latency, status: 'error', error_msg: `${upstream.status}` })
        return NextResponse.json({ error: err }, { status: upstream.status })
      }

      const data = await upstream.json() as { content: { text: string }[]; usage?: { input_tokens: number; output_tokens: number } }
      const tokensIn = data.usage?.input_tokens ?? 0
      const tokensOut = data.usage?.output_tokens ?? 0
      const cost = estimateCost(tokensIn + tokensOut, connector.cost_per_1k)

      await logUsage({ connector_id: connectorId, agent_slug, feature, tokens_in: tokensIn, tokens_out: tokensOut, latency_ms: latency, cost_usd: cost, status: 'success' })

      return NextResponse.json({
        content: data.content?.[0]?.text ?? '',
        tokens: { in: tokensIn, out: tokensOut },
        cost_usd: cost,
        latency_ms: latency,
        model,
        provider: slug,
      })
    }

    // 3. OpenAI-compatible (groq, openai, openrouter, deepseek, mistral, grok, gemini)
    const openaiBody: Record<string, unknown> = {
      model,
      max_tokens,
      stream,
      messages: system
        ? [{ role: 'system', content: system }, ...messages]
        : messages,
    }

    const upstreamHeaders: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }

    // OpenRouter necesita headers extras
    if (slug === 'openrouter') {
      upstreamHeaders['HTTP-Referer'] = 'https://intranet.smconnection.cl'
      upstreamHeaders['X-Title'] = 'SMC Labs'
    }

    const upstream = await fetch(providerUrl, {
      method: 'POST',
      headers: upstreamHeaders,
      body: JSON.stringify(openaiBody),
    })

    const latency = Date.now() - t0

    if (stream) {
      await logUsage({ connector_id: connectorId, agent_slug, feature, latency_ms: latency, status: 'success' })
      return new Response(upstream.body, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      })
    }

    if (!upstream.ok) {
      const err = await upstream.text()
      await logUsage({ connector_id: connectorId, agent_slug, feature, latency_ms: latency, status: 'error', error_msg: `${upstream.status}` })
      return NextResponse.json({ error: err }, { status: upstream.status })
    }

    const data = await upstream.json() as {
      choices: { message: { content: string } }[]
      usage?: { prompt_tokens: number; completion_tokens: number }
    }

    const tokensIn = data.usage?.prompt_tokens ?? 0
    const tokensOut = data.usage?.completion_tokens ?? 0
    const cost = estimateCost(tokensIn + tokensOut, connector.cost_per_1k)

    await logUsage({ connector_id: connectorId, agent_slug, feature, tokens_in: tokensIn, tokens_out: tokensOut, latency_ms: latency, cost_usd: cost, status: 'success' })

    return NextResponse.json({
      content: data.choices?.[0]?.message?.content ?? '',
      tokens: { in: tokensIn, out: tokensOut },
      cost_usd: cost,
      latency_ms: latency,
      model,
      provider: slug,
    })

  } catch (e) {
    const latency = Date.now() - t0
    if (connectorId) {
      await logUsage({ connector_id: connectorId, latency_ms: latency, status: 'error', error_msg: String(e) })
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno' },
      { status: 500 }
    )
  }
}
