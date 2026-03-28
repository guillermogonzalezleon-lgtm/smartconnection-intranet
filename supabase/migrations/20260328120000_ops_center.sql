-- Ops Center: Kaizen audits + Andon status board

-- 1. Kaizen audits history
CREATE TABLE IF NOT EXISTS kaizen_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_number INTEGER NOT NULL,
  score_global TEXT NOT NULL DEFAULT 'C',
  total_bytes INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_files INTEGER NOT NULL DEFAULT 0,
  criticals JSONB DEFAULT '[]',
  improvements JSONB DEFAULT '[]',
  positives JSONB DEFAULT '[]',
  top_actions JSONB DEFAULT '[]',
  scores_by_area JSONB DEFAULT '{}',
  fixes_applied INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Andon board — project health signals
CREATE TABLE IF NOT EXISTS andon_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project TEXT NOT NULL,
  area TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'green',
  score TEXT DEFAULT 'A',
  detail TEXT,
  last_checked TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project, area)
);

-- 3. OODA decisions log
CREATE TABLE IF NOT EXISTS ooda_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  observe TEXT,
  orient TEXT,
  decide TEXT,
  act TEXT,
  result TEXT,
  project TEXT,
  agent TEXT,
  status TEXT NOT NULL DEFAULT 'decided',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_kaizen_created ON kaizen_audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_andon_project ON andon_signals(project, area);
CREATE INDEX IF NOT EXISTS idx_ooda_created ON ooda_decisions(created_at DESC);
