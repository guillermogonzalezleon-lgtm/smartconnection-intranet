interface AgentResult {
  agent: string;
  result: string;
  tokens: number;
  durationMs: number;
  status: 'success' | 'error';
}

const PROVIDERS: Record<string, { url: string; keyEnv: string; model: string }> = {
  deepseek: { url: 'https://api.deepseek.com/v1/chat/completions', keyEnv: 'DEEPSEEK_API_KEY', model: 'deepseek-chat' },
  mistral: { url: 'https://api.mistral.ai/v1/chat/completions', keyEnv: 'MISTRAL_API_KEY', model: 'mistral-small-latest' },
  openai: { url: 'https://api.openai.com/v1/chat/completions', keyEnv: 'OPENAI_API_KEY', model: 'gpt-4o-mini' },
  cohere: { url: 'https://api.cohere.com/v2/chat', keyEnv: 'COHERE_API_KEY', model: 'command-a-03-2025' },
  openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', keyEnv: 'OPENROUTER_API_KEY', model: 'meta-llama/llama-3.3-70b-instruct' },
};

export function createRunner(providerId: string) {
  return {
    run: async (task: string, config: { systemPrompt?: string; maxTokens?: number; temperature?: number }): Promise<AgentResult> => {
      const p = PROVIDERS[providerId];
      if (!p) return { agent: providerId, result: 'Provider no configurado', tokens: 0, durationMs: 0, status: 'error' };

      const key = process.env[p.keyEnv];
      if (!key) return { agent: providerId, result: `${p.keyEnv} no configurada`, tokens: 0, durationMs: 0, status: 'error' };

      const start = Date.now();

      try {
        const messages: Array<{ role: string; content: string }> = [];
        if (config.systemPrompt) messages.push({ role: 'system', content: config.systemPrompt });
        messages.push({ role: 'user', content: task });

        const res = await fetch(p.url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: p.model,
            messages,
            max_tokens: config.maxTokens || 2048,
            temperature: config.temperature ?? 0.7,
          }),
        });

        const durationMs = Date.now() - start;

        if (!res.ok) {
          const err = await res.text();
          return { agent: providerId, result: `Error ${res.status}: ${err.slice(0, 200)}`, tokens: 0, durationMs, status: 'error' };
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || 'Sin respuesta';
        const tokens = data.usage?.total_tokens || 0;

        return { agent: providerId, result: text, tokens, durationMs, status: 'success' };
      } catch (e) {
        return { agent: providerId, result: String(e).slice(0, 200), tokens: 0, durationMs: Date.now() - start, status: 'error' };
      }
    },
  };
}
