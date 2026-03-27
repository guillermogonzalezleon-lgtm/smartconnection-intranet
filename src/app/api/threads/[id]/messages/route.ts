import { getSession } from '@/lib/auth';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';

// Mapa de nombres display para agentes
const AGENT_DISPLAY_NAMES: Record<string, string> = {
  hoku: 'Hoku', groq: 'Groq', claude: 'Claude', panchita: 'Panchita',
  grok: 'Grok', deepseek: 'DeepSeek', mistral: 'Mistral', openai: 'OpenAI',
  camilita: 'Camilita', arielito: 'Arielito', sergito: 'Sergito', user: 'Usuario',
};

// Provider configs — mapea agent_id al provider real
const PROVIDER_CONFIGS: Record<string, { url: string; keyEnv: string; model: string }> = {
  groq: { url: 'https://api.groq.com/openai/v1/chat/completions', keyEnv: 'GROQ_API_KEY', model: 'llama-3.3-70b-versatile' },
  claude: { url: 'https://api.anthropic.com/v1/messages', keyEnv: 'ANTHROPIC_API_KEY', model: 'claude-haiku-4-5-20251001' },
  grok: { url: 'https://api.x.ai/v1/chat/completions', keyEnv: 'GROK_API_KEY', model: 'grok-3-mini' },
  deepseek: { url: 'https://api.deepseek.com/v1/chat/completions', keyEnv: 'DEEPSEEK_API_KEY', model: 'deepseek-chat' },
  mistral: { url: 'https://api.mistral.ai/v1/chat/completions', keyEnv: 'MISTRAL_API_KEY', model: 'mistral-small-latest' },
  openai: { url: 'https://api.openai.com/v1/chat/completions', keyEnv: 'OPENAI_API_KEY', model: 'gpt-4o-mini' },
};

// Mapea agentes-persona a su provider real
const AGENT_TO_PROVIDER: Record<string, string> = {
  hoku: 'groq', panchita: 'claude', camilita: 'groq', arielito: 'groq', sergito: 'groq',
};

function getProviderConfig(agentId: string) {
  const providerId = AGENT_TO_PROVIDER[agentId] || agentId;
  const config = PROVIDER_CONFIGS[providerId] || PROVIDER_CONFIGS.groq;
  const apiKey = process.env[config.keyEnv];
  return { ...config, apiKey, providerId };
}

// GET — Listar mensajes de un hilo
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const { id } = await params;

    const messages = await supabaseQuery('thread_messages', 'GET', {
      filter: `thread_id=eq.${id}`,
      order: 'created_at.asc',
      limit: 200,
    }) as Record<string, unknown>[];

    // Enriquecer agent_name con nombres display
    const enriched = messages.map(m => ({
      ...m,
      agent_name: AGENT_DISPLAY_NAMES[m.agent_id as string] || (m.agent_name as string) || (m.agent_id as string),
    }));

    return Response.json(enriched);
  } catch (err) {
    console.error('Error al listar mensajes del hilo:', err);
    return Response.json({ error: 'Error al obtener mensajes del hilo' }, { status: 500 });
  }
}

// POST — Enviar mensaje en hilo con respuesta SSE del agente
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const session = await getSession();
  if (!session.valid) return new Response('No autorizado', { status: 401 });

  const { id } = await params;
  const { content, agent_id } = await request.json();

  if (!content?.trim()) {
    return new Response('Contenido requerido', { status: 400 });
  }

  if (content.trim().length > 2000) {
    return Response.json({ error: 'El contenido no puede superar los 2000 caracteres' }, { status: 400 });
  }

  // Save user message
  await supabaseInsert('thread_messages', {
    thread_id: id,
    agent_id: 'user',
    agent_name: session.user || 'Usuario',
    content: content.trim(),
    role: 'user',
    tokens_used: 0,
  });

  // If no agent_id, just save user message
  if (!agent_id) {
    return Response.json({ success: true });
  }

  // Load thread messages for context
  const threadMessages = await supabaseQuery('thread_messages', 'GET', {
    filter: `thread_id=eq.${id}`,
    order: 'created_at.asc',
    limit: 50,
  }) as Record<string, unknown>[];

  // Load thread to get source message
  const threads = await supabaseQuery('threads', 'GET', { filter: `id=eq.${id}` }) as Record<string, unknown>[];
  const thread = threads[0];
  let sourceContent = '';
  if (thread?.source_message_id) {
    const sourceMessages = await supabaseQuery('debate_messages', 'GET', {
      filter: `id=eq.${thread.source_message_id}`,
    }) as Record<string, unknown>[];
    sourceContent = (sourceMessages[0]?.content as string) || '';
  }

  const provider = getProviderConfig(agent_id);
  if (!provider.apiKey) return new Response(`API key no configurada para ${agent_id} (${provider.keyEnv})`, { status: 500 });

  const contextMessages = threadMessages.map(m => ({
    role: (m.role as string) === 'user' ? 'user' as const : 'assistant' as const,
    content: m.content as string,
  }));

  const agentName = AGENT_DISPLAY_NAMES[agent_id] || agent_id;
  const systemPrompt = `Eres ${agentName}, un agente IA participando en un hilo de discusión sobre un punto específico de un debate.
Contexto original del mensaje que generó este hilo: "${sourceContent.slice(0, 500)}"
Responde en español. Sé conciso (máximo 2-3 párrafos).`;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  console.info(`[threads] Streaming respuesta hilo=${id} agente=${agent_id} provider=${provider.providerId}`);

  const isClaude = provider.providerId === 'claude';

  const providerHeaders: Record<string, string> = isClaude
    ? { 'x-api-key': provider.apiKey!, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }
    : { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' };

  const providerBody = isClaude
    ? { model: provider.model, max_tokens: 1000, system: systemPrompt, messages: [...contextMessages, { role: 'user', content: content.trim() }], stream: true }
    : { model: provider.model, messages: [{ role: 'system', content: systemPrompt }, ...contextMessages, { role: 'user', content: content.trim() }], stream: true, max_tokens: 1000, temperature: 0.7 };

  const providerRes = await fetch(provider.url, {
    method: 'POST',
    headers: providerHeaders,
    body: JSON.stringify(providerBody),
  });

  if (!providerRes.ok || !providerRes.body) return new Response(`Error ${provider.providerId}: ${providerRes.status}`, { status: 502 });

  let fullContent = '';

  const stream = new ReadableStream({
    async start(controller) {
      const reader = providerRes.body!.getReader();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              // Claude streaming usa content_block_delta, OpenAI usa choices[0].delta.content
              const c = isClaude
                ? (parsed.type === 'content_block_delta' ? parsed.delta?.text : null)
                : parsed.choices?.[0]?.delta?.content;
              if (c) {
                fullContent += c;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: c })}\n\n`));
              }
            } catch { /* skip parse errors */ }
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
      }

      // Save agent response to DB
      if (fullContent) {
        await supabaseInsert('thread_messages', {
          thread_id: id,
          agent_id: agent_id,
          agent_name: AGENT_DISPLAY_NAMES[agent_id] || agent_id,
          content: fullContent,
          role: 'assistant',
          tokens_used: Math.round(fullContent.split(/\s+/).length * 1.3),
        }).catch((err) => { console.error('Error guardando respuesta del agente en hilo:', err); });
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
  } catch (err) {
    console.error('Error en POST thread messages:', err);
    return Response.json({ error: 'Error al procesar mensaje del hilo' }, { status: 500 });
  }
}
