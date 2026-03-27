// Tipos compartidos — Debate Multi-Agente con Hilos

export interface DebateMessage {
  id: string;
  debate_id: string;
  agent_id: string;
  agent_name: string;
  content: string;
  role: 'assistant' | 'user' | 'system';
  time_horizon?: string | null;
  tokens_used: number;
  tension_with?: string | null;
  created_at: string;
}

export interface Tension {
  id: string;
  agent_a: string;
  agent_b: string;
  summary: string;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
  message_id: string;
}

export interface Thread {
  id: string;
  debate_id: string;
  source_message_id: string;
  title: string;
  status: 'open' | 'approved' | 'rejected' | 'merged';
  created_at: string;
}

export interface ThreadMessage {
  id: string;
  thread_id: string;
  agent_id: string;
  agent_name: string;
  content: string;
  role: 'assistant' | 'user';
  created_at: string;
}

export interface Debate {
  id: string;
  title: string;
  topic: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  orchestration_mode: 'tutti' | 'dueto' | 'solo';
  active_agent_ids: string[];
  temporal_enabled: boolean;
  temporal_config: Record<string, string>;
  total_tokens: number;
  total_tensions: number;
  messages: DebateMessage[];
  tensions: Tension[];
  threads: Thread[];
  created_at: string;
}

// Constantes compartidas
export const AGENT_COLORS: Record<string, string> = {
  hoku: '#ff6b6b', groq: '#f59e0b', claude: '#00e5b0', grok: '#8b5cf6',
  deepseek: '#0ea5e9', mistral: '#f97316', openai: '#10b981',
  panchita: '#d97706', camilita: '#ec4899', arielito: '#3b82f6', sergito: '#a855f7',
  user: '#94a3b8', cohere: '#1e3a5f', openrouter: '#6366f1', bedrock: '#f97316',
};

export const AGENT_LIST = [
  { id: 'hoku', name: 'Hoku', desc: 'Full-stack rebelde' },
  { id: 'groq', name: 'Groq', desc: 'Ultra rapido' },
  { id: 'claude', name: 'Claude', desc: 'Analisis profundo' },
  { id: 'panchita', name: 'Panchita', desc: 'Analista funcional' },
  { id: 'grok', name: 'Grok', desc: 'Tendencias' },
  { id: 'deepseek', name: 'DeepSeek', desc: 'Arquitectura' },
  { id: 'mistral', name: 'Mistral', desc: 'SEO y estandares' },
  { id: 'openai', name: 'OpenAI', desc: 'Full-stack' },
  { id: 'camilita', name: 'Camilita', desc: 'QA y testing' },
  { id: 'arielito', name: 'Arielito', desc: 'Seguridad' },
  { id: 'sergito', name: 'Sergito', desc: 'Vision estrategica' },
];

export const HORIZON_LABELS: Record<string, string> = {
  '1_sprint': '1 Sprint', '6_meses': '6 Meses', incidente: 'Incidente',
  auditoria: 'Auditoría', '3_anos': '3 Años',
};

export const HORIZON_OPTIONS = [
  { id: '1_sprint', label: '1 Sprint' }, { id: '6_meses', label: '6 Meses' },
  { id: 'incidente', label: 'Incidente' }, { id: 'auditoria', label: 'Auditoría' },
  { id: '3_anos', label: '3 Años' },
];

export const DEFAULT_TEMPORAL: Record<string, string> = {
  hoku: '1_sprint', panchita: '6_meses', claude: '6_meses',
  camilita: 'incidente', arielito: 'auditoria', sergito: '3_anos',
  groq: '1_sprint', grok: '3_anos', deepseek: '6_meses',
  mistral: '6_meses', openai: '6_meses',
};

export const MODE_ICONS: Record<string, string> = { tutti: '🎼', dueto: '🎭', solo: '🎤' };
