import { getSession } from '@/lib/auth';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';

const GROQ_KEY = process.env.GROQ_API_KEY;

// Agent configs: API endpoints + models
const AGENT_CONFIGS: Record<string, { url: string; keyEnv: string; model: string; type: 'openai' | 'claude' }> = {
  groq: { url: 'https://api.groq.com/openai/v1/chat/completions', keyEnv: 'GROQ_API_KEY', model: 'llama-3.3-70b-versatile', type: 'openai' },
  claude: { url: 'https://api.anthropic.com/v1/messages', keyEnv: 'ANTHROPIC_API_KEY', model: 'claude-haiku-4-5-20251001', type: 'claude' },
  grok: { url: 'https://api.x.ai/v1/chat/completions', keyEnv: 'GROK_API_KEY', model: 'grok-3-mini', type: 'openai' },
  deepseek: { url: 'https://api.deepseek.com/v1/chat/completions', keyEnv: 'DEEPSEEK_API_KEY', model: 'deepseek-chat', type: 'openai' },
  mistral: { url: 'https://api.mistral.ai/v1/chat/completions', keyEnv: 'MISTRAL_API_KEY', model: 'mistral-small-latest', type: 'openai' },
  openai: { url: 'https://api.openai.com/v1/chat/completions', keyEnv: 'OPENAI_API_KEY', model: 'gpt-4o-mini', type: 'openai' },
  cohere: { url: 'https://api.cohere.com/v2/chat', keyEnv: 'COHERE_API_KEY', model: 'command-a-03-2025', type: 'openai' },
  openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', keyEnv: 'OPENROUTER_API_KEY', model: 'meta-llama/llama-3.3-70b-instruct', type: 'openai' },
};

// Agent display names + personas (equipo Smart Connection)
const AGENT_PERSONAS: Record<string, { name: string; persona: string }> = {
  hoku: { name: 'Hoku', persona: 'Eres Hoku, Westie blanco, desarrollador senior full-stack rebelde de Smart Connection. Vas al grano, ejecutas sin preguntar. Aplicas Poka-Yoke (a prueba de errores), Jidoka (parar la línea si algo falla) y Canary Deploy. Priorizas código simple, build antes de commit, performance >90 Lighthouse. Si encuentras un blocker técnico, lo dices directo.' },
  panchita: { name: 'Panchita', persona: 'Eres Panchita, Kiltro café claro, arquitecta y analista funcional senior de Smart Connection. NUNCA implementas código de producción. Investigas primero (benchmark competitivo obligatorio), diseñas con Design Thinking, Jobs to Be Done y Wardley Mapping. Piensas en el usuario real, UX, modelo de datos, contratos API. Entregas maquetas HTML con copy real, nunca Lorem ipsum.' },
  camilita: { name: 'Camilita', persona: 'Eres Camilita, policía QA que simula ser un usuario humano real que NO sabe programar. Testeas como personas concretas: El Novato, El Impaciente, El Desconfiado. Aplicas Shift Left (testear antes), Chaos Engineering (romper intencionalmente), y Exploratory Testing. Reportas bugs con severidad, pasos, esperado vs actual, y siempre preguntas: ¿puede el usuario recuperarse?' },
  arielito: { name: 'Arielito', persona: 'Eres Arielito, auditor técnico Principal Engineer de Smart Connection. Miras por debajo del capó: código, arquitectura, seguridad, rendimiento, dependencias. Aplicas Kaizen (mejora continua), Andon (semáforo de estado), OODA (Observe-Orient-Decide-Act), Gemba (ir al lugar real, no solo leer código) y Six Sigma. Siempre cuantificas deuda técnica en horas, riesgo 1-5, y consecuencia a 3-6 meses.' },
  sergito: { name: 'Sergito', persona: 'Eres Sergito, pensador divergente y provocador creativo de Smart Connection. Tu mente no piensa en línea recta. Aplicas TRIZ (resolver contradicciones), SCAMPER (7 operaciones creativas), First Principles (descomponer hasta los fundamentos) y Blue Ocean (crear espacio sin competencia). NUNCA das la solución obvia primero. Siempre cuestionas el brief, siempre conectas con algo fuera del dominio, siempre entregas un primer paso accionable.' },
  groq: { name: 'Groq', persona: 'Eres un analista técnico ultra rápido. Priorizas velocidad y pragmatismo.' },
  claude: { name: 'Claude', persona: 'Eres Claude, un experto en desarrollo de software. Analizas con profundidad y cuidado.' },
  grok: { name: 'Grok', persona: 'Eres Grok, analista de mercado con humor. Piensas en tendencias y disrupciones.' },
  deepseek: { name: 'DeepSeek', persona: 'Eres DeepSeek, programador experto. Te enfocas en arquitectura y código limpio.' },
  mistral: { name: 'Mistral', persona: 'Eres Mistral, experto en SEO y mercados europeos. Piensas en regulaciones y estándares.' },
  openai: { name: 'OpenAI', persona: 'Eres un desarrollador full-stack pragmático. Balanceas calidad y velocidad.' },
};

// Temporal horizons
const TEMPORAL_HORIZONS: Record<string, { label: string; instruction: string }> = {
  '1_sprint': { label: '1 Sprint', instruction: 'Responde pensando SOLO en lo que se puede hacer en las próximas 2 semanas (1 sprint). Sé práctico y concreto.' },
  '6_meses': { label: '6 Meses', instruction: 'Responde pensando en un horizonte de 6 meses. Balancea lo inmediato con mejoras a mediano plazo.' },
  incidente: { label: 'Incidente', instruction: 'Responde como si estuvieras manejando un incidente crítico. Prioriza estabilidad y resolución rápida.' },
  auditoria: { label: 'Auditoría', instruction: 'Responde desde la perspectiva de una auditoría. Evalúa riesgos, compliance y mejores prácticas.' },
  '3_anos': { label: '3 Años', instruction: 'Responde pensando a 3 años. Evalúa visión estratégica, escalabilidad y evolución del mercado.' },
};

// Default temporal config per agent
const DEFAULT_TEMPORAL: Record<string, string> = {
  hoku: '1_sprint',
  panchita: '6_meses',
  claude: '6_meses',
  camilita: 'incidente',
  arielito: 'auditoria',
  sergito: '3_anos',
  groq: '1_sprint',
  grok: '3_anos',
  deepseek: '6_meses',
  mistral: '6_meses',
  openai: '6_meses',
};

async function streamAgent(
  agentId: string,
  systemPrompt: string,
  userPrompt: string,
  previousMessages: { agent: string; content: string }[],
): Promise<{ content: string; tokens: number }> {
  // Map persona-only agents to a provider
  const providerMap: Record<string, string> = {
    hoku: 'groq', panchita: 'claude', camilita: 'groq', arielito: 'groq', sergito: 'groq',
  };
  const providerId = providerMap[agentId] || agentId;
  const config = AGENT_CONFIGS[providerId];
  if (!config) return { content: `(${agentId} sin configuración de provider)`, tokens: 0 };

  const apiKey = providerId === 'grok'
    ? (process.env.GROK_API_KEY || process.env.XAI_API_KEY)
    : process.env[config.keyEnv];
  if (!apiKey) return { content: `(${agentId} sin API key)`, tokens: 0 };

  // Build context from previous messages
  const context = previousMessages.length > 0
    ? '\n\nMENSAJES PREVIOS DEL DEBATE:\n' + previousMessages.map(m => `[${m.agent}]: ${m.content.slice(0, 500)}`).join('\n') + '\n'
    : '';

  const fullPrompt = userPrompt + context;

  if (config.type === 'claude') {
    const res = await fetch(config.url, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model, max_tokens: 1500, system: systemPrompt,
        messages: [{ role: 'user', content: fullPrompt }],
      }),
    });
    if (!res.ok) return { content: `(${agentId} error ${res.status})`, tokens: 0 };
    const data = await res.json();
    const text = data.content?.[0]?.text || '(sin respuesta)';
    return { content: text, tokens: data.usage?.output_tokens || Math.round(text.split(/\s+/).length * 1.3) };
  }

  // OpenAI-compatible
  const res = await fetch(config.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: fullPrompt }],
      max_tokens: 1500, temperature: 0.7,
    }),
  });
  if (!res.ok) return { content: `(${agentId} error ${res.status})`, tokens: 0 };
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '(sin respuesta)';
  return { content: text, tokens: data.usage?.completion_tokens || Math.round(text.split(/\s+/).length * 1.3) };
}

async function detectTension(
  agentA: string, contentA: string,
  agentB: string, contentB: string,
): Promise<{ hasTension: boolean; summary: string; severity: string }> {
  if (!GROQ_KEY) return { hasTension: false, summary: '', severity: 'low' };

  const prompt = `Analiza si hay TENSIÓN o CONTRADICCIÓN entre estas dos respuestas de agentes IA en un debate.

[${agentA}]: ${contentA.slice(0, 600)}

[${agentB}]: ${contentB.slice(0, 600)}

Responde SOLO en formato JSON:
{"tension": true/false, "summary": "resumen de la tensión en 1 oración", "severity": "low|medium|high"}

Si NO hay contradicción clara, responde: {"tension": false, "summary": "", "severity": "low"}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Eres un detector de tensiones en debates. Solo responde JSON válido.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 200, temperature: 0.3,
      }),
    });
    if (!res.ok) return { hasTension: false, summary: '', severity: 'low' };
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { hasTension: false, summary: '', severity: 'low' };
    const parsed = JSON.parse(jsonMatch[0]);
    return { hasTension: !!parsed.tension, summary: parsed.summary || '', severity: parsed.severity || 'medium' };
  } catch (err) {
    console.error('Error detectando tensión:', err);
    return { hasTension: false, summary: '', severity: 'low' };
  }
}

// POST — Stream debate: ejecuta agentes secuencialmente con SSE
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const session = await getSession();
  if (!session.valid) return new Response('No autorizado', { status: 401 });

  const { id } = await params;

  // Load debate
  const debates = await supabaseQuery('debates', 'GET', { filter: `id=eq.${id}` });
  if (!debates.length) return new Response('Debate no encontrado', { status: 404 });
  const debate = debates[0] as Record<string, unknown>;

  // Load existing messages for context
  const existingMessages = await supabaseQuery('debate_messages', 'GET', {
    filter: `debate_id=eq.${id}`,
    order: 'created_at.asc',
    limit: 50,
  }) as Record<string, unknown>[];

  const agentIds = (debate.active_agent_ids as string[]) || [];
  const temporalEnabled = debate.temporal_enabled as boolean;
  const temporalConfig = (debate.temporal_config as Record<string, string>) || {};
  const topic = debate.topic as string;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch (err) { console.error('Stream controller cerrado:', err); }
      };

      const previousMessages: { agent: string; content: string }[] = existingMessages.map(m => ({
        agent: m.agent_name as string,
        content: m.content as string,
      }));

      const newMessages: { agentId: string; agentName: string; content: string; messageId?: string; tokens: number }[] = [];

      try {
        // Filtrar agentes según orchestration_mode
        const orchestrationMode = (debate.orchestration_mode as string) || 'tutti';
        let filteredAgentIds = agentIds;
        if (orchestrationMode === 'dueto') {
          filteredAgentIds = agentIds.slice(0, 2);
        } else if (orchestrationMode === 'solo') {
          filteredAgentIds = agentIds.slice(0, 1);
        }

        console.info(`[stream] Iniciando ronda debate=${id} modo=${orchestrationMode} agentes=${filteredAgentIds.length}`, filteredAgentIds);

        // Track provider usage to avoid rate limits
        const providerMap: Record<string, string> = {
          hoku: 'groq', panchita: 'claude', camilita: 'groq', arielito: 'groq', sergito: 'groq',
        };
        let lastProvider = '';

        for (const agentId of filteredAgentIds) {
          // Delay between same-provider calls to avoid rate limits
          const currentProvider = providerMap[agentId] || agentId;
          if (currentProvider === lastProvider) {
            await new Promise(r => setTimeout(r, 2000));
          }
          lastProvider = currentProvider;

          const persona = AGENT_PERSONAS[agentId] || { name: agentId, persona: 'Eres un asistente experto.' };
          const horizon = temporalConfig[agentId] || DEFAULT_TEMPORAL[agentId] || '6_meses';
          const temporalInstruction = temporalEnabled && TEMPORAL_HORIZONS[horizon]
            ? `\n\nPERSPECTIVA TEMPORAL: ${TEMPORAL_HORIZONS[horizon].instruction}`
            : '';

          const systemPrompt = `${persona.persona}${temporalInstruction}\n\nResponde en español. Sé conciso (máximo 3-4 párrafos).`;

          send('agent_start', { agent_id: agentId, agent_name: persona.name, time_horizon: temporalEnabled ? horizon : null });

          // Stream tokens (simulate with non-streaming call, emit chunks)
          const result = await streamAgent(agentId, systemPrompt, topic, previousMessages);

          // Emit content in chunks for streaming effect
          const words = result.content.split(' ');
          const chunkSize = 5;
          for (let i = 0; i < words.length; i += chunkSize) {
            const chunk = words.slice(i, i + chunkSize).join(' ') + (i + chunkSize < words.length ? ' ' : '');
            send('token', { agent_id: agentId, content: chunk });
            // Small delay between chunks for streaming effect
          }

          // Save message to DB
          const saved = await supabaseInsert('debate_messages', {
            debate_id: id,
            agent_id: agentId,
            agent_name: persona.name,
            content: result.content,
            role: 'assistant',
            time_horizon: temporalEnabled ? horizon : null,
            tokens_used: result.tokens,
          }) as Record<string, unknown>[];

          const messageId = saved[0]?.id as string;

          newMessages.push({ agentId, agentName: persona.name, content: result.content, messageId, tokens: result.tokens });
          previousMessages.push({ agent: persona.name, content: result.content });

          send('agent_done', {
            agent_id: agentId, agent_name: persona.name,
            content: result.content, tokens: result.tokens,
            time_horizon: temporalEnabled ? horizon : null,
            message_id: messageId,
          });

          // Detect tensions with previous messages (skip errors, delay for Groq rate limit)
          for (const prev of newMessages.slice(0, -1)) {
            if (prev.content.startsWith('(') || result.content.startsWith('(')) continue;
            await new Promise(r => setTimeout(r, 1500));
            const tension = await detectTension(
              prev.agentName, prev.content,
              persona.name, result.content,
            );

            if (tension.hasTension) {
              // Save tension to DB
              await supabaseInsert('debate_tensions', {
                debate_id: id,
                message_id: messageId,
                agent_a: prev.agentId,
                agent_b: agentId,
                summary: tension.summary,
                severity: tension.severity,
              });

              // Update message with tension_with
              await supabaseQuery('debate_messages', 'PATCH', {
                filter: `id=eq.${messageId}`,
                body: { tension_with: prev.agentId },
              });

              send('tension_detected', {
                agent_a: prev.agentId, agent_a_name: prev.agentName,
                agent_b: agentId, agent_b_name: persona.name,
                summary: tension.summary, severity: tension.severity,
                message_id: messageId,
              });
            }
          }
        }

        // Update debate totals
        const totalTokens = newMessages.reduce((sum, m) => sum + (m.tokens || 0), 0);
        await supabaseQuery('debates', 'PATCH', {
          filter: `id=eq.${id}`,
          body: {
            total_tokens: ((debate.total_tokens as number) || 0) + totalTokens,
          },
        });

        console.info(`[stream] Ronda completada debate=${id} mensajes=${newMessages.length} tokens=${totalTokens}`);
        send('debate_done', { agents_count: filteredAgentIds.length, messages: newMessages.length });
      } catch (err) {
        console.error(`[stream] Error en ronda debate=${id}:`, err);
        send('error', { message: String(err).slice(0, 300) });
      }

      try { controller.close(); } catch (err) { console.error('Error cerrando controller:', err); }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
  } catch (err) {
    console.error('Error en POST stream debate:', err);
    return Response.json({ error: 'Error al iniciar streaming del debate' }, { status: 500 });
  }
}
