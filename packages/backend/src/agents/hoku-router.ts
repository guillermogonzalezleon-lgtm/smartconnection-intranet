import { PROMPTS } from './prompts';

export type Provider = 'groq' | 'claude' | 'grok' | 'deepseek' | 'mistral' | 'openai' | 'cohere' | 'openrouter' | 'bedrock';

export interface RouteDecision {
  provider: Provider;
  model: string;
  systemPrompt: string;
  reason: string;
  estimatedCost: string;
}

export function routeTask(task: string, mode?: string): RouteDecision {
  const t = task.toLowerCase();

  // Code mode or code-related keywords
  if (mode === 'code' || /código|code|typescript|component|función|bug|implementa|refactor|\.tsx|\.ts|archivo/i.test(t))
    return { provider: 'claude', model: 'claude-haiku-4-5-20251001', systemPrompt: PROMPTS.dev, reason: 'Mejor generación de código funcional', estimatedCost: '~$0.002' };

  // Deploy/AWS related
  if (mode === 'deploy' || /deploy|aws|s3|cloudfront|cdn|build|pipeline|github actions|amplify/i.test(t))
    return { provider: 'openai', model: 'gpt-4o-mini', systemPrompt: PROMPTS.devops, reason: 'Comandos técnicos precisos', estimatedCost: '~$0.001' };

  // Deep analysis
  if (/analiza|investiga|compara|evalúa|estrategia|mercado|competencia|tendencia/i.test(t))
    return { provider: 'deepseek', model: 'deepseek-chat', systemPrompt: PROMPTS.analyst, reason: 'Análisis profundo y razonamiento', estimatedCost: '~$0.0003' };

  // Content/SEO
  if (/seo|meta description|structured data|copy|redacta|contenido|blog|marketing/i.test(t))
    return { provider: 'mistral', model: 'mistral-small-latest', systemPrompt: PROMPTS.content, reason: 'Excelente en español', estimatedCost: '~$0.001' };

  // Sales/commercial
  if (/lead|cliente|venta|propuesta|cotiza|crm|precio|comercial|uf/i.test(t))
    return { provider: 'grok', model: 'grok-3-mini', systemPrompt: PROMPTS.sales, reason: 'Contexto mercado real time', estimatedCost: '~$0.0002' };

  // Documents/RAG
  if (/documento|pdf|busca en|encuentra|base de conocimiento|rag/i.test(t))
    return { provider: 'cohere', model: 'command-a-03-2025', systemPrompt: PROMPTS.hoku, reason: 'Especialista en RAG', estimatedCost: '~$0.001' };

  // SAP specific
  if (/sap fi|sap co|contabilidad|asiento|t-code|bkpf|factura sap/i.test(t))
    return { provider: 'claude', model: 'claude-haiku-4-5-20251001', systemPrompt: PROMPTS.sap_fi, reason: 'SAP FI/CO specialist', estimatedCost: '~$0.002' };

  if (/sap mm|sap sd|compras|ventas sap|inventario|me21n|va01/i.test(t))
    return { provider: 'groq', model: 'llama-3.3-70b-versatile', systemPrompt: PROMPTS.sap_mm, reason: 'SAP MM/SD fast', estimatedCost: '$0.00' };

  if (/sap btp|cloud platform|cpi|integration suite|abap cloud/i.test(t))
    return { provider: 'openai', model: 'gpt-4o-mini', systemPrompt: PROMPTS.sap_btp, reason: 'SAP BTP architect', estimatedCost: '~$0.001' };

  if (/proyecto|plan|timeline|asap|scrum|sprint|milestone/i.test(t))
    return { provider: 'deepseek', model: 'deepseek-chat', systemPrompt: PROMPTS.pm, reason: 'PM SAP specialist', estimatedCost: '~$0.0003' };

  // Default: Groq (free, fast)
  return { provider: 'groq', model: 'llama-3.3-70b-versatile', systemPrompt: PROMPTS.hoku, reason: 'Respuesta rápida, free tier', estimatedCost: '$0.00' };
}

export function getProviderConfig(provider: Provider): { url: string; keyEnv: string; model: string } | null {
  const configs: Record<string, { url: string; keyEnv: string; model: string }> = {
    groq: { url: 'https://api.groq.com/openai/v1/chat/completions', keyEnv: 'GROQ_API_KEY', model: 'llama-3.3-70b-versatile' },
    grok: { url: 'https://api.x.ai/v1/chat/completions', keyEnv: 'GROK_API_KEY', model: 'grok-3-mini' },
    deepseek: { url: 'https://api.deepseek.com/v1/chat/completions', keyEnv: 'DEEPSEEK_API_KEY', model: 'deepseek-chat' },
    mistral: { url: 'https://api.mistral.ai/v1/chat/completions', keyEnv: 'MISTRAL_API_KEY', model: 'mistral-small-latest' },
    openai: { url: 'https://api.openai.com/v1/chat/completions', keyEnv: 'OPENAI_API_KEY', model: 'gpt-4o-mini' },
    openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', keyEnv: 'OPENROUTER_API_KEY', model: 'meta-llama/llama-3.3-70b-instruct' },
  };
  return configs[provider] || null;
}
