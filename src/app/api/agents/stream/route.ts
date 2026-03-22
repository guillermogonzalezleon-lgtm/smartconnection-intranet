import { getSession } from '@/lib/auth';
import { routeTask } from '@/lib/agents/hoku-router';
import { PROMPTS } from '@/lib/agents/prompts';

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

  // Use router for smart routing when taskType matches a prompt key
  const routerPrompt = PROMPTS[taskType as keyof typeof PROMPTS];
  const sysPrompt = routerPrompt || SYSTEM_PROMPTS[taskType || 'general'] || SYSTEM_PROMPTS.general;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;

  // ═══ CLAUDE: real streaming with Haiku ═══
  if (agentId === 'claude' && CLAUDE_KEY) {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': CLAUDE_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: sysPrompt,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeRes.ok || !claudeRes.body) return new Response(`Claude error: ${claudeRes.status}`, { status: 502 });

    const stream = new ReadableStream({
      async start(controller) {
        const reader = claudeRes.body!.getReader();
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
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: parsed.delta.text })}\n\n`));
                }
              } catch {}
            }
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } });
  }

  // ═══ GROK: real streaming with xAI ═══
  const GROK_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  if (agentId === 'grok' && GROK_KEY) {
    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROK_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: prompt }],
        stream: true, max_tokens: 2048, temperature: 0.7,
      }),
    });

    if (!grokRes.ok || !grokRes.body) return new Response(`Grok error: ${grokRes.status}`, { status: 502 });

    const stream = new ReadableStream({
      async start(controller) {
        const reader = grokRes.body!.getReader();
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n'); buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6);
              if (data === '[DONE]') { controller.enqueue(encoder.encode('data: [DONE]\n\n')); continue; }
              try { const p = JSON.parse(data); const c = p.choices?.[0]?.delta?.content; if (c) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: c })}\n\n`)); } catch {}
            }
          }
        } catch (err) { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)); }
        controller.close();
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } });
  }

  // ═══ DEEPSEEK / MISTRAL / OPENAI: OpenAI-compatible streaming ═══
  const openaiCompatible: Record<string, { url: string; keyEnv: string; model: string }> = {
    deepseek: { url: 'https://api.deepseek.com/v1/chat/completions', keyEnv: 'DEEPSEEK_API_KEY', model: 'deepseek-chat' },
    mistral: { url: 'https://api.mistral.ai/v1/chat/completions', keyEnv: 'MISTRAL_API_KEY', model: 'mistral-small-latest' },
    openai: { url: 'https://api.openai.com/v1/chat/completions', keyEnv: 'OPENAI_API_KEY', model: 'gpt-4o-mini' },
  };
  const oaiConfig = openaiCompatible[agentId];
  if (oaiConfig) {
    const apiKey = process.env[oaiConfig.keyEnv];
    if (!apiKey) return new Response(`${oaiConfig.keyEnv} no configurada`, { status: 500 });
    const oaiRes = await fetch(oaiConfig.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: oaiConfig.model, messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: prompt }], stream: true, max_tokens: 2048, temperature: 0.7 }),
    });
    if (!oaiRes.ok || !oaiRes.body) return new Response(`${agentId} error: ${oaiRes.status}`, { status: 502 });
    const stream = new ReadableStream({
      async start(controller) {
        const reader = oaiRes.body!.getReader(); let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read(); if (done) break;
            buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || '';
            for (const line of lines) {
              const t = line.trim(); if (!t.startsWith('data: ')) continue; const data = t.slice(6);
              if (data === '[DONE]') { controller.enqueue(encoder.encode('data: [DONE]\n\n')); continue; }
              try { const p = JSON.parse(data); const c = p.choices?.[0]?.delta?.content; if (c) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: c })}\n\n`)); } catch {}
            }
          }
        } catch (err) { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)); }
        controller.close();
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } });
  }

  // ═══ HOKU: parallel execution + synthesis ═══
  if (agentId === 'hoku') {
    const stream = new ReadableStream({
      async start(controller) {
        const send = (content: string) => controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));

        // Helper: call OpenAI-compatible API
        const callOpenAI = async (url: string, key: string, model: string, p: string, sys: string, name: string): Promise<string> => {
          if (!key) return `(${name} sin API key)`;
          try {
            const r = await fetch(url, {
              method: 'POST',
              headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ model, messages: [{ role: 'system', content: sys }, { role: 'user', content: p }], max_tokens: 1500, temperature: 0.7 }),
            });
            if (!r.ok) return `(${name} error ${r.status})`;
            const d = await r.json();
            return d.choices?.[0]?.message?.content || '(sin respuesta)';
          } catch (e) { return `(${name} error: ${String(e).slice(0, 80)})`; }
        };

        // Helper: call Claude API
        const callClaude = async (p: string, sys: string): Promise<string> => {
          const k = process.env.ANTHROPIC_API_KEY;
          if (!k) return '(Claude sin API key)';
          try {
            const r = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: { 'x-api-key': k, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1500, system: sys, messages: [{ role: 'user', content: p }] }),
            });
            if (!r.ok) return `(Claude error ${r.status})`;
            const d = await r.json();
            return d.content?.[0]?.text || '(sin respuesta)';
          } catch (e) { return `(Claude error: ${String(e).slice(0, 80)})`; }
        };

        const codeSys = 'SIEMPRE genera código funcional completo. Usa formato: ```tsx filename="src/ruta/archivo.tsx"\n código \n```. Responde en español.';

        // Build agent list dynamically based on available keys
        const agentList: { name: string; fn: () => Promise<string> }[] = [
          { name: 'Groq', fn: () => groqNonStream(prompt, `Eres un asistente técnico ultra rápido. ${codeSys}`) },
          { name: 'Claude', fn: () => callClaude(prompt, `Eres un experto en desarrollo de software. ${codeSys}`) },
        ];

        const grokKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
        if (grokKey) agentList.push({ name: 'Grok', fn: () => callOpenAI('https://api.x.ai/v1/chat/completions', grokKey, 'grok-3-mini', prompt, `Eres un analista de mercado. ${codeSys}`, 'Grok') });

        const deepseekKey = process.env.DEEPSEEK_API_KEY;
        if (deepseekKey) agentList.push({ name: 'DeepSeek', fn: () => callOpenAI('https://api.deepseek.com/v1/chat/completions', deepseekKey, 'deepseek-chat', prompt, `Eres un programador experto. ${codeSys}`, 'DeepSeek') });

        const mistralKey = process.env.MISTRAL_API_KEY;
        if (mistralKey) agentList.push({ name: 'Mistral', fn: () => callOpenAI('https://api.mistral.ai/v1/chat/completions', mistralKey, 'mistral-small-latest', prompt, `Eres un ingeniero de software. ${codeSys}`, 'Mistral') });

        const openaiKey = process.env.OPENAI_API_KEY;
        if (openaiKey) agentList.push({ name: 'OpenAI', fn: () => callOpenAI('https://api.openai.com/v1/chat/completions', openaiKey, 'gpt-4o-mini', prompt, `Eres un desarrollador full-stack. ${codeSys}`, 'OpenAI') });

        const cohereKey = process.env.COHERE_API_KEY;
        if (cohereKey) agentList.push({ name: 'Cohere', fn: () => callOpenAI('https://api.cohere.com/v2/chat', cohereKey, 'command-a-03-2025', prompt, `Eres un experto en NLP y datos. ${codeSys}`, 'Cohere') });

        const openrouterKey = process.env.OPENROUTER_API_KEY;
        if (openrouterKey) agentList.push({ name: 'OpenRouter', fn: () => callOpenAI('https://openrouter.ai/api/v1/chat/completions', openrouterKey, 'meta-llama/llama-3.3-70b-instruct', prompt, `Eres un asistente técnico avanzado. ${codeSys}`, 'OpenRouter') });

        // Bedrock uses AWS credentials from the Amplify runtime environment (no API key needed)
        agentList.push({ name: 'Bedrock', fn: async () => {
          try {
            // In Amplify, AWS credentials are injected automatically
            // Use the Bedrock converse API via fetch with AWS Sig V4 is complex
            // Simpler: call our own API endpoint that uses the runtime credentials
            const r = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://intranet.smconnection.cl'}/api/bedrock`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: prompt, system: `Eres un experto cloud AWS. ${codeSys}` }),
            });
            if (!r.ok) return `(Bedrock error ${r.status})`;
            const d = await r.json();
            return d.result || '(sin respuesta)';
          } catch (e) { return `(Bedrock: ${String(e).slice(0, 80)})`; }
        } });

        send(`🐾 HOKU — Ejecutando ${agentList.length} agentes REALES en paralelo...\n\n`);

        const results: { name: string; result: string }[] = [];
        const timeout = 30000;

        const promises = agentList.map(async (agent) => {
          try {
            const result = await Promise.race([
              agent.fn(),
              new Promise<string>((_, rej) => setTimeout(() => rej(new Error('timeout')), timeout)),
            ]);
            return { name: agent.name, result };
          } catch {
            return { name: agent.name, result: `(${agent.name} no respondió)` };
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
