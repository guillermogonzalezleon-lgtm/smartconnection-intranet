-- ============================================
-- SMC LABS: Registry central de conectores IA
-- Sprint 1 — 2026-04-09
-- ============================================

CREATE TABLE IF NOT EXISTS smc_connectors (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug         text UNIQUE NOT NULL,
  display_name text NOT NULL,
  category     text NOT NULL CHECK (category IN ('llm', 'tool', 'data', 'communication', 'mcp')),
  type         text NOT NULL CHECK (type IN ('native', 'mcp_local', 'mcp_remote')),
  status       text DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'draft')),
  env_var      text,
  mcp_server_id text,
  models       jsonb,
  priority     int DEFAULT 50,
  cost_per_1k  numeric(10,6),
  icon         text,
  color        text,
  description  text,
  metadata     jsonb,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS smc_connector_usage (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  connector_id uuid REFERENCES smc_connectors(id) ON DELETE CASCADE,
  agent_slug   text,
  feature      text,
  tokens_in    int,
  tokens_out   int,
  latency_ms   int,
  cost_usd     numeric(10,6),
  status       text CHECK (status IN ('success', 'error')),
  error_msg    text,
  created_at   timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_connectors_category ON smc_connectors(category);
CREATE INDEX IF NOT EXISTS idx_connectors_status   ON smc_connectors(status);
CREATE INDEX IF NOT EXISTS idx_usage_connector     ON smc_connector_usage(connector_id);
CREATE INDEX IF NOT EXISTS idx_usage_created       ON smc_connector_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_agent         ON smc_connector_usage(agent_slug, created_at DESC);

-- RLS
ALTER TABLE smc_connectors     ENABLE ROW LEVEL SECURITY;
ALTER TABLE smc_connector_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_connectors"
  ON smc_connectors FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_write_connectors"
  ON smc_connectors FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_all_usage"
  ON smc_connector_usage FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER smc_connectors_updated_at
  BEFORE UPDATE ON smc_connectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED — Conectores conocidos del sistema
-- ============================================

INSERT INTO smc_connectors (slug, display_name, category, type, status, env_var, models, priority, cost_per_1k, icon, color, description) VALUES

-- LLM Providers nativos
('claude',      'Anthropic Claude',    'llm', 'native', 'active',   'ANTHROPIC_API_KEY',  '["claude-sonnet-4-6","claude-opus-4-6","claude-haiku-4-5"]',  90, 0.003,   '🟣', '#7C3AED', 'Modelo principal — razonamiento complejo, agentes, código'),
('groq',        'Groq',                'llm', 'native', 'active',   'GROQ_API_KEY',       '["llama-3.3-70b-versatile","llama-4-scout"]',                  80, 0.0001,  '⚡', '#F97316', 'Inferencia ultrarrápida — Llama models. Rate limit: 12K TPM'),
('gemini',      'Google Gemini',       'llm', 'native', 'active',   'GEMINI_API_KEY',     '["gemini-2.0-flash","gemini-2.5-pro"]',                        75, 0.00015, '🔵', '#4285F4', 'Contexto 1M tokens, multimodal (visión, audio, video)'),
('openai',      'OpenAI',              'llm', 'native', 'active',   'OPENAI_API_KEY',     '["gpt-4o","gpt-4o-mini"]',                                     70, 0.002,   '🟢', '#10A37F', 'GPT-4o para tasks de razonamiento y function calling'),
('deepseek',    'DeepSeek',            'llm', 'native', 'active',   'DEEPSEEK_API_KEY',   '["deepseek-chat","deepseek-reasoner"]',                        65, 0.00014, '🔷', '#0066CC', 'Razonamiento fuerte, muy económico'),
('mistral',     'Mistral AI',          'llm', 'native', 'active',   'MISTRAL_API_KEY',    '["mistral-small","mistral-large"]',                            60, 0.0002,  '🟠', '#FF7000', 'Modelos europeos, buena relación calidad/costo'),
('grok',        'xAI Grok',            'llm', 'native', 'active',   'GROK_API_KEY',       '["grok-2","grok-3"]',                                          55, 0.002,   '🖤', '#1C1C1C', 'Grok con acceso a Twitter/X en tiempo real'),
('cohere',      'Cohere',              'llm', 'native', 'active',   'COHERE_API_KEY',     '["command-r-plus","command-r"]',                               50, 0.001,   '🟡', '#D18B1A', 'Embeddings y RAG empresarial'),
('openrouter',  'OpenRouter',          'llm', 'native', 'active',   'OPENROUTER_API_KEY', '["auto"]',                                                     85, 0.0005,  '🔀', '#6366F1', 'Router multi-modelo con fallback automático'),

-- MCP Locales
('mcp-context7',   'Context7',    'mcp', 'mcp_local',  'active', null, null, 70, 0, '📚', '#0EA5E9', 'Docs actualizadas de librerías — evita info desactualizada'),
('mcp-github',     'GitHub',      'mcp', 'mcp_local',  'active', null, null, 65, 0, '🐙', '#24292E', 'Gestión de repos, issues, PRs, code search'),
('mcp-puppeteer',  'Puppeteer',   'mcp', 'mcp_local',  'active', null, null, 60, 0, '🎭', '#40B5A4', 'Browser automation, screenshots, web scraping'),
('mcp-firecrawl',  'Firecrawl',   'mcp', 'mcp_local',  'active', null, null, 55, 0, '🔥', '#FF4500', 'Web crawling y extracción de contenido'),

-- MCP Remotos
('mcp-asana',     'Asana',           'mcp', 'mcp_remote', 'active', null, null, 70, 0, '🗂️',  '#F06A6A', 'Gestión de tareas y proyectos cross-equipo'),
('mcp-posthog',   'PostHog',         'mcp', 'mcp_remote', 'active', null, null, 65, 0, '📊', '#FF3C00', 'Analytics de producto, funnels, feature flags'),
('mcp-calendar',  'Google Calendar', 'mcp', 'mcp_remote', 'active', null, null, 60, 0, '📅', '#4285F4', 'Agendar reuniones, disponibilidad, eventos'),
('mcp-canva',     'Canva',           'mcp', 'mcp_remote', 'active', null, null, 55, 0, '🎨', '#7D2AE8', 'Diseño de assets, presentaciones, brand kit')

ON CONFLICT (slug) DO NOTHING;
