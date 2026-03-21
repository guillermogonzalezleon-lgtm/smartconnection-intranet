import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.valid) return new Response('No autorizado', { status: 401 });

  const { prompt, taskType, agentId } = await request.json();
  if (!prompt) return new Response('Prompt requerido', { status: 400 });

  const systemPrompts: Record<string, string> = {
    seo: 'Eres un experto en SEO técnico y UX. Sugiere mejoras concretas de posicionamiento y experiencia. Responde en español.',
    'code-review': 'Eres un experto en code review. Analiza el código y sugiere mejoras. Responde en español.',
    content: 'Eres un copywriter experto en tecnología y SAP. Genera contenido profesional. Responde en español.',
    research: 'Eres un analista de mercado tecnológico. Investiga tendencias en SAP e IA. Responde en español.',
    general: 'Eres un asistente de Smart Connection, empresa chilena de consultoría SAP y desarrollo con IA. Responde en español.',
  };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return new Response('GROQ_API_KEY no configurada', { status: 500 });

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompts[taskType || 'general'] || systemPrompts.general },
        { role: 'user', content: prompt },
      ],
      stream: true,
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  if (!groqRes.ok || !groqRes.body) {
    return new Response(`Groq error: ${groqRes.status}`, { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

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
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            } catch {}
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
