// Centralized configuration
export const CONFIG = {
  repos: {
    intranet: {
      id: 'smartconnection-intranet',
      label: 'Intranet (AWS Amplify)',
      repo: 'guillermogonzalezleon-lgtm/smartconnection-intranet',
      url: 'https://intranet.smconnection.cl',
    },
  },
  aws: {
    s3Bucket: 'smartconnetion25',
    s3Region: 'sa-east-1',
    cloudfrontId: 'E3O4YBX3RKHQUL',
    cloudfrontDomain: 'd5bva36ud3xmb.cloudfront.net',
    amplifyAppId: 'd2qam7xccab5t8',
    domain: 'smconnection.cl',
    intranetDomain: 'intranet.smconnection.cl',
  },
  supabase: {
    projectId: 'yjjtbwfgtoepsevvkzta',
    region: 'sa-east-1',
  },
  agents: {
    hoku: { id: 'hoku', name: 'Hoku', model: 'fusión 9 agentes', color: '#ff6b6b' },
    groq: { id: 'groq', name: 'Groq', model: 'llama-3.3-70b', color: '#f59e0b' },
    claude: { id: 'claude', name: 'Claude', model: 'claude-haiku-4.5', color: '#00e5b0' },
    grok: { id: 'grok', name: 'Grok', model: 'grok-3-mini', color: '#8b5cf6' },
    deepseek: { id: 'deepseek', name: 'DeepSeek', model: 'deepseek-chat', color: '#0ea5e9' },
    mistral: { id: 'mistral', name: 'Mistral', model: 'mistral-small', color: '#f97316' },
    openai: { id: 'openai', name: 'OpenAI', model: 'gpt-4o-mini', color: '#10b981' },
    cohere: { id: 'cohere', name: 'Cohere', model: 'command-a', color: '#1e3a5f' },
    openrouter: { id: 'openrouter', name: 'OpenRouter', model: 'llama-3.3-70b', color: '#6366f1' },
    bedrock: { id: 'bedrock', name: 'Bedrock', model: 'claude-3.5-haiku', color: '#f97316' },
    gemini: { id: 'gemini', name: 'Gemini', model: 'gemini-2.0-flash', color: '#22c55e' },
  },
  colors: {
    teal: '#00e5b0',
    blue: '#3b82f6',
    green: '#22c55e',
    amber: '#f59e0b',
    red: '#ef4444',
    violet: '#8b5cf6',
    orange: '#f97316',
    hoku: '#ff6b6b',
  },
} as const;

export function formatDate(d: string | Date, style: 'short' | 'long' | 'relative' = 'short'): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';

  if (style === 'relative') {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
  }

  if (style === 'long') {
    return date.toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
