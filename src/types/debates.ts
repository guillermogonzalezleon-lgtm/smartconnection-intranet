// Tipos — Compare LLMs (simplificado de debates)

export interface CompareResult {
  agentId: string;
  agentName: string;
  content: string;
  status: 'idle' | 'streaming' | 'done' | 'error';
  tokens: number;
  latencyMs: number;
}

// Constantes compartidas
export const AGENT_COLORS: Record<string, string> = {
  hoku: '#ff6b6b', groq: '#f59e0b', claude: '#00e5b0', grok: '#8b5cf6',
  deepseek: '#0ea5e9', mistral: '#f97316', openai: '#10b981',
  panchita: '#d97706', camilita: '#ec4899', arielito: '#3b82f6', sergito: '#a855f7',
};

export const COMPARE_MODELS = [
  { id: 'groq', name: 'Groq', desc: 'LLaMA 70B · Ultra rápido', model: 'llama-3.3-70b-versatile' },
  { id: 'claude', name: 'Claude', desc: 'Haiku 4.5 · Análisis profundo', model: 'claude-haiku-4-5-20251001' },
  { id: 'grok', name: 'Grok', desc: 'Grok 3 Mini · x.ai', model: 'grok-3-mini' },
  { id: 'deepseek', name: 'DeepSeek', desc: 'DeepSeek Chat', model: 'deepseek-chat' },
  { id: 'mistral', name: 'Mistral', desc: 'Mistral Small', model: 'mistral-small-latest' },
  { id: 'openai', name: 'OpenAI', desc: 'GPT-4o Mini', model: 'gpt-4o-mini' },
];
