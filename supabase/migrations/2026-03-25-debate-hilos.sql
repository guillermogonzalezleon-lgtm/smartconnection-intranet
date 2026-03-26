-- ============================================
-- Debate Multi-Agente con Hilos
-- SmartConnection Intranet
-- 2026-03-25
-- ============================================

-- 1. Tabla principal de debates
CREATE TABLE IF NOT EXISTS debates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  orchestration_mode TEXT NOT NULL DEFAULT 'tutti' CHECK (orchestration_mode IN ('tutti', 'dueto', 'solo')),
  active_agent_ids TEXT[] NOT NULL DEFAULT '{}',
  temporal_enabled BOOLEAN NOT NULL DEFAULT false,
  temporal_config JSONB DEFAULT '{}',
  created_by TEXT NOT NULL,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_tensions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Mensajes del debate
CREATE TABLE IF NOT EXISTS debate_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  content TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'assistant' CHECK (role IN ('assistant', 'user', 'system')),
  time_horizon TEXT,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  tension_with TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tensiones detectadas
CREATE TABLE IF NOT EXISTS debate_tensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES debate_messages(id) ON DELETE CASCADE,
  agent_a TEXT NOT NULL,
  agent_b TEXT NOT NULL,
  summary TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Hilos de discusión
CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  source_message_id UUID NOT NULL REFERENCES debate_messages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'approved', 'rejected', 'merged')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Mensajes de hilos
CREATE TABLE IF NOT EXISTS thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  content TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'assistant' CHECK (role IN ('assistant', 'user', 'system')),
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Índices
-- ============================================
CREATE INDEX IF NOT EXISTS idx_debate_messages_debate_id ON debate_messages(debate_id);
CREATE INDEX IF NOT EXISTS idx_debate_messages_agent_id ON debate_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_debate_tensions_debate_id ON debate_tensions(debate_id);
CREATE INDEX IF NOT EXISTS idx_threads_debate_id ON threads(debate_id);
CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_id ON thread_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_debates_status ON debates(status);
CREATE INDEX IF NOT EXISTS idx_debates_created_by ON debates(created_by);

-- ============================================
-- Triggers updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS debates_updated_at ON debates;
CREATE TRIGGER debates_updated_at
  BEFORE UPDATE ON debates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS threads_updated_at ON threads;
CREATE TRIGGER threads_updated_at
  BEFORE UPDATE ON threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
