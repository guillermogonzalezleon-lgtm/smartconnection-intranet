import { getSession } from '@/lib/auth';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';

const GROQ_KEY = process.env.GROQ_API_KEY;

// Mapa de nombres display para agentes
const AGENT_DISPLAY_NAMES: Record<string, string> = {
  hoku: 'Hoku', groq: 'Groq', claude: 'Claude', panchita: 'Panchita',
  grok: 'Grok', deepseek: 'DeepSeek', mistral: 'Mistral', openai: 'OpenAI',
  camilita: 'Camilita', arielito: 'Arielito', sergito: 'Sergito', user: 'Usuario',
};

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

  if (!GROQ_KEY) return new Response('GROQ_API_KEY no configurada', { status: 500 });

  const contextMessages = threadMessages.map(m => ({
    role: (m.role as string) === 'user' ? 'user' as const : 'assistant' as const,
    content: m.content as string,
  }));

  const systemPrompt = `Eres un agente IA participando en un hilo de discusión sobre un punto específico de un debate.
Contexto original del mensaje que generó este hilo: "${sourceContent.slice(0, 500)}"
Responde en español. Sé conciso (máximo 2-3 párrafos).`;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemPrompt }, ...contextMessages, { role: 'user', content: content.trim() }],
      stream: true, max_tokens: 1000, temperature: 0.7,
    }),
  });

  if (!groqRes.ok || !groqRes.body) return new Response(`Groq error: ${groqRes.status}`, { status: 502 });

  let fullContent = '';

  const stream = new ReadableStream({
    async start(controller) {
      const reader = groqRes.body!.getReader();
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
              const c = parsed.choices?.[0]?.delta?.content;
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
