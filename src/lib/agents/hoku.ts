/**
 * HOKU — Agente fusión de Claude + Groq + Gemini + Grok
 *
 * Ejecuta la tarea en paralelo en todos los agentes disponibles,
 * luego sintetiza las respuestas en una sola respuesta coherente
 * usando Groq como sintetizador (el más rápido).
 */

import { run as runGroq } from './groq';
import { run as runClaude } from './claude';
import { run as runGemini } from './gemini';
import { run as runGrok } from './grok';

interface AgentResult {
  agent: string;
  result: string;
  tokens: number;
  durationMs: number;
  status: 'success' | 'error';
}

const SUB_AGENTS = [
  { id: 'groq', name: 'Groq', run: runGroq },
  { id: 'claude', name: 'Claude', run: runClaude },
  { id: 'gemini', name: 'Gemini', run: runGemini },
  { id: 'grok', name: 'Grok', run: runGrok },
];

export async function run(
  task: string,
  config: { model?: string; systemPrompt?: string; maxTokens?: number; temperature?: number }
): Promise<AgentResult> {
  const start = Date.now();

  // Step 1: Run all agents in parallel with timeout
  const timeout = 25000; // 25s per agent
  const results = await Promise.allSettled(
    SUB_AGENTS.map(agent =>
      Promise.race([
        agent.run(task, config),
        new Promise<AgentResult>((_, reject) =>
          setTimeout(() => reject(new Error(`${agent.name} timeout`)), timeout)
        ),
      ])
    )
  );

  // Collect successful results
  const successful: { name: string; result: string }[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled' && r.value.status === 'success') {
      successful.push({ name: SUB_AGENTS[i].name, result: r.value.result });
    }
  }

  if (successful.length === 0) {
    return {
      agent: 'hoku',
      result: 'Error: Ningún agente respondió exitosamente.',
      tokens: 0,
      durationMs: Date.now() - start,
      status: 'error',
    };
  }

  // Step 2: If only one responded, return it directly
  if (successful.length === 1) {
    return {
      agent: 'hoku',
      result: `[Fuente: ${successful[0].name}]\n\n${successful[0].result}`,
      tokens: 0,
      durationMs: Date.now() - start,
      status: 'success',
    };
  }

  // Step 3: Synthesize using Groq (fastest)
  const synthesisPrompt = `Eres HOKU, un agente de síntesis. Tienes las respuestas de ${successful.length} agentes IA a la misma tarea. Tu trabajo es crear UNA respuesta final que combine lo mejor de cada una, eliminando redundancias y organizando la información de forma clara.

TAREA ORIGINAL: ${task}

${successful.map(s => `── RESPUESTA DE ${s.name.toUpperCase()} ──\n${s.result.slice(0, 2000)}`).join('\n\n')}

── TU SÍNTESIS ──
Genera una respuesta única, estructurada y completa que integre las mejores ideas de cada agente. Indica entre paréntesis qué agente aportó cada punto clave. Responde en español.`;

  try {
    const synthesis = await runGroq(synthesisPrompt, {
      ...config,
      maxTokens: config.maxTokens || 2048,
      temperature: 0.3, // Lower temp for synthesis
    });

    return {
      agent: 'hoku',
      result: synthesis.result,
      tokens: synthesis.tokens,
      durationMs: Date.now() - start,
      status: 'success',
    };
  } catch {
    // Fallback: return concatenated results
    const combined = successful
      .map(s => `## ${s.name}\n${s.result}`)
      .join('\n\n---\n\n');
    return {
      agent: 'hoku',
      result: combined,
      tokens: 0,
      durationMs: Date.now() - start,
      status: 'success',
    };
  }
}
