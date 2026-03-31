import * as claude from './claude';
import * as groq from './groq';
import * as grok from './grok';
import * as gemini from './gemini';
import * as hoku from './hoku';
import * as deployBot from './deployBot';
import { createRunner } from './openai-compat';
import { supabaseInsert, supabaseQuery } from '../supabase';

export interface AgentResult {
  agent: string;
  result: string;
  tokens: number;
  durationMs: number;
  status: 'success' | 'error';
}

interface AgentConfig {
  agent_id: string;
  name: string;
  model: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  enabled: boolean;
}

const AGENT_MODULES: Record<string, { run: (task: string, config: { model?: string; systemPrompt?: string; maxTokens?: number; temperature?: number }) => Promise<AgentResult> }> = {
  hoku,
  claude,
  groq,
  grok,
  gemini,
  deployer: deployBot,
  deepseek: createRunner('deepseek'),
  mistral: createRunner('mistral'),
  openai: createRunner('openai'),
  cohere: createRunner('cohere'),
  openrouter: createRunner('openrouter'),
};

const AGENT_TIMEOUT = 30_000;
const MAX_RETRIES = 2;

async function runWithRetry(
  agentId: string,
  task: string,
  config: { model?: string; systemPrompt?: string; maxTokens?: number; temperature?: number },
  retries = MAX_RETRIES
): Promise<AgentResult> {
  const mod = AGENT_MODULES[agentId];
  if (!mod) {
    return { agent: agentId, result: `Módulo ${agentId} no encontrado`, tokens: 0, durationMs: 0, status: 'error' };
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await Promise.race([
        mod.run(task, config),
        new Promise<AgentResult>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), AGENT_TIMEOUT)
        ),
      ]);
      if (result.status === 'success' || attempt === retries) return result;
    } catch (err) {
      if (attempt === retries) {
        return {
          agent: agentId,
          result: `Error después de ${retries + 1} intentos: ${err instanceof Error ? err.message : String(err)}`,
          tokens: 0,
          durationMs: 0,
          status: 'error',
        };
      }
    }
  }

  return { agent: agentId, result: 'Error inesperado', tokens: 0, durationMs: 0, status: 'error' };
}

export async function runAgentsParallel(
  task: string,
  agentIds: string[],
  context?: Record<string, unknown>
): Promise<{ results: AgentResult[]; totalMs: number }> {
  const start = Date.now();

  // Load configs from Supabase
  const configs = await supabaseQuery<AgentConfig>('agent_config', 'GET', {
    filter: `agent_id=in.(${agentIds.join(',')})`,
  }).catch(() => [] as AgentConfig[]);

  const configMap = new Map(configs.map(c => [c.agent_id, c]));

  const contextStr = context ? `\n\nContexto: ${JSON.stringify(context)}` : '';

  // ML: Search knowledge base for relevant context
  let knowledgeStr = '';
  try {
    const words = task.split(/\s+/).filter(w => w.length > 2).slice(0, 5);
    if (words.length > 0) {
      const tsQuery = words.join(' | ');
      const knowledge = await supabaseQuery<Record<string, unknown>>('hoku_knowledge', 'GET', {
        filter: `search_vector=fts.${encodeURIComponent(tsQuery)}`,
        order: 'quality_score.desc',
        limit: 3,
      }).catch(() => []);
      if (knowledge.length > 0) {
        knowledgeStr = '\n\nCONOCIMIENTO PREVIO:\n' +
          knowledge.map(k => `[${k.topic}]: ${(k.content as string).slice(0, 400)}`).join('\n');
      }
    }
  } catch { /* optional */ }

  const fullTask = task + contextStr + knowledgeStr;

  const promises = agentIds.map(agentId => {
    const cfg = configMap.get(agentId);
    return runWithRetry(agentId, fullTask, {
      model: cfg?.model,
      systemPrompt: cfg?.system_prompt,
      maxTokens: cfg?.max_tokens,
      temperature: cfg?.temperature,
    });
  });

  const settled = await Promise.allSettled(promises);
  const results = settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value;
    return {
      agent: agentIds[i],
      result: `Error: ${s.reason}`,
      tokens: 0,
      durationMs: 0,
      status: 'error' as const,
    };
  });

  // Log all results to Supabase (fire-and-forget)
  for (const r of results) {
    supabaseInsert('agent_logs', {
      agent_id: r.agent,
      agent_name: r.agent,
      action: 'parallel_execute',
      detail: r.result.substring(0, 500),
      status: r.status,
    }).catch(() => {});
  }

  // ML: Learn from successful results
  const successful = results.filter(r => r.status === 'success' && r.result.length > 50);
  if (successful.length > 0) {
    const topic = task.slice(0, 150).replace(/[^\w\sáéíóúñ]/gi, '').trim();
    const content = successful.map(r => `[${r.agent}]: ${r.result.slice(0, 500)}`).join('\n');
    supabaseInsert('hoku_knowledge', {
      topic,
      content: content.slice(0, 3000),
      source: `orchestrator_${successful.length}_agents`,
      quality_score: 0.5,
    }).catch(() => {});
  }

  return { results, totalMs: Date.now() - start };
}
