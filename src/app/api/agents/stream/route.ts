import { getSession } from '@/lib/auth';

const GROQ_KEY = process.env.GROQ_API_KEY;

const SYSTEM_PROMPTS: Record<string, string> = {
  seo: 'Eres un experto en SEO. Cuando sugieras mejoras, genera el código HTML/JSX completo que implementa la mejora. Usa formato: ```html filename="ruta/archivo.html"\n código \n```. Responde en español.',
  'code-review': 'Eres un experto en code review. Genera código corregido completo, no solo sugerencias. Usa formato: ```tsx filename="src/ruta/archivo.tsx"\n código \n```. Responde en español.',
  content: 'Eres un copywriter. Genera el contenido como código HTML listo para usar. Usa formato: ```html filename="src/content/archivo.html"\n código \n```. Responde en español.',
  research: 'Eres un analista de mercado. Genera reportes como HTML profesional con datos y gráficos. Usa formato: ```html filename="docs/reporte.html"\n código \n```. Responde en español.',
  general: 'Eres un desarrollador full-stack de Smart Connection. SIEMPRE genera código funcional completo. Para cada archivo usa: ```tsx filename="src/ruta/archivo.tsx"\n código completo \n```. Si no es código, genera HTML con estilos inline. Responde en español.',
};

async function groqStream(prompt: string, systemPrompt: string): Promise<Response> {
  return fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
      stream: true, max_tokens: 2048, temperature: 0.7,
    }),
  });
}

async function groqNonStream(prompt: string, systemPrompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
      max_tokens: 2048, temperature: 0.7,
    }),
  });
  if (!res.ok) return `Error: ${res.status}`;
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'Sin respuesta';
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.valid) return new Response('No autorizado', { status: 401 });

  const { prompt, taskType, agentId } = await request.json();
  if (!prompt) return new Response('Prompt requerido', { status: 400 });
  if (!GROQ_KEY) return new Response('GROQ_API_KEY no configurada', { status: 500 });

  const sysPrompt = SYSTEM_PROMPTS[taskType || 'general'] || SYSTEM_PROMPTS.general;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // ═══ HOKU: parallel execution + synthesis ═══
  if (agentId === 'hoku') {
    const stream = new ReadableStream({
      async start(controller) {
        const send = (content: string) => controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));

        send('🐾 HOKU — Ejecutando 3 agentes en paralelo...\n\n');

        // Run all agents in parallel (using Groq with different system prompts)
        const agentPrompts = [
          { name: 'Groq', sys: 'Eres un asistente técnico ultra rápido. Responde en español de forma concisa.' },
          { name: 'Claude', sys: 'Eres un experto en desarrollo de software y code review. Responde en español con detalle técnico.' },
          { name: 'Gemini', sys: 'Eres un experto en SEO, analytics y datos. Responde en español con métricas y datos.' },
        ];

        const results: { name: string; result: string }[] = [];

        // Execute all in parallel with 20s timeout
        const promises = agentPrompts.map(async (ap) => {
          try {
            const result = await Promise.race([
              groqNonStream(prompt, ap.sys),
              new Promise<string>((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000)),
            ]);
            return { name: ap.name, result };
          } catch {
            return { name: ap.name, result: `(${ap.name} no respondió)` };
          }
        });

        const allResults = await Promise.allSettled(promises);
        for (const r of allResults) {
          if (r.status === 'fulfilled') {
            results.push(r.value);
            send(`✅ ${r.value.name} respondió\n`);
          }
        }

        send('\n📊 Sintetizando respuestas...\n\n');

        // Wait 2s to avoid Groq rate limit (3 parallel calls just finished)
        await new Promise(r => setTimeout(r, 2000));

        // Synthesize via streaming
        const synthPrompt = `Eres HOKU, un agente de síntesis de Smart Connection. Combina las respuestas de ${results.length} agentes en UNA respuesta final coherente y estructurada.

TAREA: ${prompt}

${results.map(r => `── ${r.name.toUpperCase()} ──\n${r.result.slice(0, 1500)}`).join('\n\n')}

Genera una síntesis que integre lo mejor de cada agente. Indica entre paréntesis (Agente) quién aportó cada punto clave. Responde en español, estructurado con headers y bullets.
IMPORTANTE: La síntesis debe incluir código funcional. Si los agentes generaron código, combina el mejor código en bloques con filename=.

IMPORTANTE: Cuando generes código, usa este formato:
\`\`\`tsx filename="src/components/NombreArchivo.tsx"
// código aquí
\`\`\``;

        let synthRes: Response;
        try {
          synthRes = await groqStream(synthPrompt, 'Eres HOKU, sintetizador de múltiples agentes IA. Responde en español.');
        } catch {
          // Retry after 3s if rate limited
          await new Promise(r => setTimeout(r, 3000));
          synthRes = await groqStream(synthPrompt, 'Eres HOKU, sintetizador de múltiples agentes IA. Responde en español.');
        }
        if (!synthRes.ok || !synthRes.body) {
          // Fallback: concatenate results directly
          send('⚠️ Síntesis no disponible (rate limit). Mostrando respuestas individuales:\n\n');
          for (const r of results) {
            send(`\n── ${r.name.toUpperCase()} ──\n${r.result}\n`);
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }

        const reader = synthRes.body.getReader();
        let buffer = '';
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
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) send(content);
            } catch {}
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    });
  }

  // ═══ Standard single-agent streaming ═══
  const groqRes = await groqStream(prompt, sysPrompt);
  if (!groqRes.ok || !groqRes.body) return new Response(`Groq error: ${groqRes.status}`, { status: 502 });

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
            if (data === '[DONE]') { controller.enqueue(encoder.encode('data: [DONE]\n\n')); continue; }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
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
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
