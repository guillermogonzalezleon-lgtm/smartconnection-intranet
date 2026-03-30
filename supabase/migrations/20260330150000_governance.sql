-- ============================================================
-- GOVERNANCE MODULE — Migration 20260330150000
-- Tablas, índices y seed data para el módulo Governance
-- ============================================================

-- 1. governance_documents: registro de los 31 docs
CREATE TABLE IF NOT EXISTS governance_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  format TEXT NOT NULL,
  owner_agent TEXT NOT NULL,
  drive_file_id TEXT,
  drive_url TEXT,
  status TEXT DEFAULT 'draft',
  version TEXT DEFAULT '1.0',
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gov_docs_category ON governance_documents(category);
CREATE INDEX idx_gov_docs_owner ON governance_documents(owner_agent);
CREATE INDEX idx_gov_docs_status ON governance_documents(status);

-- 2. governance_access: OWNS/READS por agente
CREATE TABLE IF NOT EXISTS governance_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_slug TEXT REFERENCES governance_documents(slug) ON DELETE CASCADE,
  agent TEXT NOT NULL,
  access_type TEXT NOT NULL,
  UNIQUE(document_slug, agent)
);

CREATE INDEX idx_gov_access_agent ON governance_access(agent);
CREATE INDEX idx_gov_access_type ON governance_access(access_type);

-- 3. Sprint tracking
CREATE TABLE IF NOT EXISTS gov_sprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  number INT NOT NULL,
  project TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  north_star TEXT,
  north_star_value TEXT,
  status TEXT DEFAULT 'active'
);

CREATE INDEX idx_gov_sprints_project ON gov_sprints(project);
CREATE INDEX idx_gov_sprints_status ON gov_sprints(status);

CREATE TABLE IF NOT EXISTS gov_sprint_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id UUID REFERENCES gov_sprints(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  rice_score NUMERIC,
  agent TEXT,
  status TEXT DEFAULT 'todo',
  metric_impacted TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gov_sprint_items_sprint ON gov_sprint_items(sprint_id);
CREATE INDEX idx_gov_sprint_items_status ON gov_sprint_items(status);

-- 4. Pipeline comercial
CREATE TABLE IF NOT EXISTS gov_pipeline_deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client TEXT NOT NULL,
  stage TEXT NOT NULL,
  value_clp NUMERIC,
  probability INT,
  close_date DATE,
  win_loss_reason TEXT,
  contact TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gov_deals_stage ON gov_pipeline_deals(stage);
CREATE INDEX idx_gov_deals_client ON gov_pipeline_deals(client);

-- 5. Audit scoring
CREATE TABLE IF NOT EXISTS gov_audit_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project TEXT NOT NULL,
  area TEXT NOT NULL,
  score CHAR(1) NOT NULL,
  priority TEXT,
  debt_hours NUMERIC,
  risk INT,
  consequence TEXT,
  audit_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gov_audit_project ON gov_audit_scores(project);
CREATE INDEX idx_gov_audit_area ON gov_audit_scores(area);

-- 6. Tech Radar
CREATE TABLE IF NOT EXISTS gov_tech_radar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ring TEXT NOT NULL,
  quadrant TEXT NOT NULL,
  description TEXT,
  moved TEXT DEFAULT 'none',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gov_radar_ring ON gov_tech_radar(ring);
CREATE INDEX idx_gov_radar_quadrant ON gov_tech_radar(quadrant);

-- 7. Integration catalog
CREATE TABLE IF NOT EXISTS gov_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service TEXT NOT NULL,
  type TEXT NOT NULL,
  projects TEXT[],
  status TEXT DEFAULT 'ok',
  version TEXT,
  rate_limit TEXT,
  cost_monthly NUMERIC,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gov_integrations_type ON gov_integrations(type);
CREATE INDEX idx_gov_integrations_status ON gov_integrations(status);

-- 8. IA Providers
CREATE TABLE IF NOT EXISTS gov_providers_ia (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  use_case TEXT,
  latency_ms INT,
  cost_per_1m_tokens NUMERIC,
  quality_score TEXT,
  is_fallback BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gov_providers_provider ON gov_providers_ia(provider);

-- 9. Bug tracker
CREATE TABLE IF NOT EXISTS gov_bugs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project TEXT NOT NULL,
  severity TEXT NOT NULL,
  persona TEXT,
  device TEXT,
  steps TEXT,
  expected TEXT,
  actual TEXT,
  recovery TEXT,
  status TEXT DEFAULT 'open',
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gov_bugs_project ON gov_bugs(project);
CREATE INDEX idx_gov_bugs_severity ON gov_bugs(severity);
CREATE INDEX idx_gov_bugs_status ON gov_bugs(status);

-- 10. Customer tickets
CREATE TABLE IF NOT EXISTS gov_customer_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client TEXT NOT NULL,
  category TEXT,
  severity TEXT,
  channel TEXT,
  status TEXT DEFAULT 'open',
  sla_hours INT,
  resolution_hours NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gov_tickets_client ON gov_customer_tickets(client);
CREATE INDEX idx_gov_tickets_status ON gov_customer_tickets(status);
CREATE INDEX idx_gov_tickets_severity ON gov_customer_tickets(severity);

-- 11. Infra costs
CREATE TABLE IF NOT EXISTS gov_infra_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service TEXT NOT NULL,
  project TEXT,
  cost_usd NUMERIC NOT NULL,
  month TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gov_costs_month ON gov_infra_costs(month);
CREATE INDEX idx_gov_costs_service ON gov_infra_costs(service);

-- 12. Design tokens
CREATE TABLE IF NOT EXISTS gov_design_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  css_var TEXT,
  description TEXT,
  UNIQUE(category, name)
);

CREATE INDEX idx_gov_tokens_category ON gov_design_tokens(category);

-- ============================================================
-- SEED DATA
-- ============================================================

-- governance_documents: 31 documentos
-- Templates (16)
INSERT INTO governance_documents (slug, title, category, format, owner_agent, icon, description) VALUES
  ('project-charter', 'Project Charter', 'template', 'slides', 'PM', '📋', 'Carta de proyecto con alcance, objetivos, stakeholders y timeline'),
  ('sprint-report', 'Sprint Report', 'template', 'slides', 'PM', '📊', 'Reporte semanal de sprint con métricas AARRR y estado del equipo'),
  ('propuesta-comercial', 'Propuesta Comercial', 'template', 'slides', 'Comercial', '💼', 'Template de propuesta con diagnóstico, solución, inversión y timeline'),
  ('pipeline-winloss', 'Pipeline & Win/Loss', 'template', 'dashboard', 'Comercial', '📈', 'Dashboard de pipeline comercial con análisis win/loss'),
  ('bbp-funcional', 'BBP Funcional', 'template', 'doc', 'Panchita', '🐕', 'Business Blueprint funcional con BPMN, user stories y modelo de datos'),
  ('maqueta', 'Maqueta HTML', 'template', 'doc', 'Panchita', '🎨', 'Template de maqueta HTML autocontenida con tokens CSS'),
  ('bbp-tecnico', 'BBP Técnico', 'template', 'doc', 'Arielito', '🔍', 'Business Blueprint técnico con arquitectura, ADRs y contratos API'),
  ('audit-report', 'Audit Report', 'template', 'dashboard', 'Arielito', '🔎', 'Reporte de auditoría con scoring A-F y deuda técnica'),
  ('ai-spec', 'AI Feature Spec', 'template', 'doc', 'Hoku', '🐾', 'Especificación de feature IA con prompts, guardrails y evals'),
  ('backend-spec', 'Backend Spec', 'template', 'doc', 'ABAP', '🔧', 'Especificación backend con endpoints, DB schema y reglas de negocio'),
  ('frontend-spec', 'Frontend Spec', 'template', 'doc', 'Fiori', '🎨', 'Especificación frontend con componentes, estados y breakpoints'),
  ('integration-map', 'Integration Map', 'template', 'dashboard', 'Integrador', '🔌', 'Mapa de integraciones con conectores, status y data mapping'),
  ('infra-deploy', 'Infra & Deploy', 'template', 'dashboard', 'Pipeline', '🛠️', 'Dashboard de infraestructura, deploys y costos'),
  ('test-report', 'Test Report', 'template', 'dashboard', 'Camilita', '👩', 'Reporte de testing con bugs, cobertura y regresión'),
  ('ideas-lab', 'Ideas Lab', 'template', 'slides', 'Sergito', '⚡', 'Laboratorio de ideas con TRIZ, SCAMPER y síntesis creativa'),
  ('customer-ops', 'Customer Ops', 'template', 'dashboard', 'ClienteX', '🎧', 'Dashboard de customer success con tickets, NPS y churn')
ON CONFLICT (slug) DO NOTHING;

-- Guidelines (10)
INSERT INTO governance_documents (slug, title, category, format, owner_agent, icon, description) VALUES
  ('arq-desarrollo', 'Arquitectura de Desarrollo', 'guideline', 'doc', 'Arielito', '🏗️', 'Estándares de código, repos, branch strategy y deployment'),
  ('arq-funcional', 'Arquitectura Funcional', 'guideline', 'doc', 'Panchita', '📐', 'Guía de análisis funcional, BPMN, user stories y handoff'),
  ('seguridad', 'Seguridad', 'guideline', 'doc', 'Arielito', '🔒', 'Políticas de seguridad: auth, CORS, headers, secrets, RLS'),
  ('ia-dev-guide', 'IA Development Guide', 'guideline', 'doc', 'Hoku', '🤖', 'Guía de desarrollo IA: prompts, guardrails, evals, LLMOps'),
  ('frontend-standards', 'Frontend Standards', 'guideline', 'doc', 'Fiori', '🖥️', 'Estándares frontend: mobile-first, accesibilidad, performance'),
  ('api-design-guide', 'API Design Guide', 'guideline', 'doc', 'Arielito', '📡', 'Guía de diseño de APIs: REST, paginación, errores, versionado'),
  ('git-workflow', 'Git Workflow', 'guideline', 'slides', 'Pipeline', '🔀', 'Flujo de Git: branches, commits, PRs, deploys automáticos'),
  ('qa-standards', 'QA Standards', 'guideline', 'doc', 'Camilita', '✅', 'Estándares de QA: personas, smoke test, regresión, bugs'),
  ('proceso-comercial', 'Proceso Comercial', 'guideline', 'slides', 'Comercial', '💰', 'Proceso de ventas: SPIN, BANT, propuestas, pipeline'),
  ('gestion-proyecto', 'Gestión de Proyecto', 'guideline', 'slides', 'PM', '📅', 'Guía de gestión: RICE, sprints, métricas, reporting')
ON CONFLICT (slug) DO NOTHING;

-- Standards (5)
INSERT INTO governance_documents (slug, title, category, format, owner_agent, icon, description) VALUES
  ('tech-radar', 'Tech Radar', 'standard', 'dashboard', 'Arielito', '📡', 'Radar tecnológico: adopt, trial, assess, hold'),
  ('design-tokens', 'Design Tokens', 'standard', 'dashboard', 'Fiori', '🎨', 'Tokens de diseño: colores, tipografía, spacing, shadows'),
  ('api-contracts', 'API Contracts', 'standard', 'dashboard', 'Arielito', '📝', 'Contratos API cross-proyecto con tipos TypeScript'),
  ('catalogo-integraciones', 'Catálogo de Integraciones', 'standard', 'dashboard', 'Integrador', '🔌', 'Inventario de todas las integraciones externas'),
  ('providers-ia', 'Providers IA', 'standard', 'dashboard', 'Integrador', '🤖', 'Catálogo de providers IA con benchmarks y costos')
ON CONFLICT (slug) DO NOTHING;

-- governance_access: owner entries
INSERT INTO governance_access (document_slug, agent, access_type)
SELECT slug, owner_agent, 'owns' FROM governance_documents
ON CONFLICT (document_slug, agent) DO NOTHING;

-- governance_access: cross-agent reads
-- PM lee reportes de todos
INSERT INTO governance_access (document_slug, agent, access_type) VALUES
  ('audit-report', 'PM', 'reads'),
  ('pipeline-winloss', 'PM', 'reads'),
  ('test-report', 'PM', 'reads'),
  ('infra-deploy', 'PM', 'reads'),
  ('customer-ops', 'PM', 'reads'),
  ('integration-map', 'PM', 'reads'),
  ('tech-radar', 'PM', 'reads')
ON CONFLICT (document_slug, agent) DO NOTHING;

-- Arielito lee specs de todos para auditar
INSERT INTO governance_access (document_slug, agent, access_type) VALUES
  ('ai-spec', 'Arielito', 'reads'),
  ('backend-spec', 'Arielito', 'reads'),
  ('frontend-spec', 'Arielito', 'reads'),
  ('bbp-funcional', 'Arielito', 'reads'),
  ('integration-map', 'Arielito', 'reads'),
  ('design-tokens', 'Arielito', 'reads'),
  ('providers-ia', 'Arielito', 'reads')
ON CONFLICT (document_slug, agent) DO NOTHING;

-- Panchita lee specs técnicas
INSERT INTO governance_access (document_slug, agent, access_type) VALUES
  ('bbp-tecnico', 'Panchita', 'reads'),
  ('frontend-standards', 'Panchita', 'reads'),
  ('design-tokens', 'Panchita', 'reads'),
  ('test-report', 'Panchita', 'reads')
ON CONFLICT (document_slug, agent) DO NOTHING;

-- Hoku lee specs funcionales y técnicas
INSERT INTO governance_access (document_slug, agent, access_type) VALUES
  ('bbp-funcional', 'Hoku', 'reads'),
  ('bbp-tecnico', 'Hoku', 'reads'),
  ('providers-ia', 'Hoku', 'reads'),
  ('catalogo-integraciones', 'Hoku', 'reads')
ON CONFLICT (document_slug, agent) DO NOTHING;

-- ABAP lee specs y contratos
INSERT INTO governance_access (document_slug, agent, access_type) VALUES
  ('bbp-funcional', 'ABAP', 'reads'),
  ('bbp-tecnico', 'ABAP', 'reads'),
  ('api-contracts', 'ABAP', 'reads'),
  ('api-design-guide', 'ABAP', 'reads'),
  ('arq-desarrollo', 'ABAP', 'reads')
ON CONFLICT (document_slug, agent) DO NOTHING;

-- Fiori lee maquetas y specs
INSERT INTO governance_access (document_slug, agent, access_type) VALUES
  ('maqueta', 'Fiori', 'reads'),
  ('bbp-funcional', 'Fiori', 'reads'),
  ('bbp-tecnico', 'Fiori', 'reads'),
  ('api-contracts', 'Fiori', 'reads'),
  ('arq-desarrollo', 'Fiori', 'reads')
ON CONFLICT (document_slug, agent) DO NOTHING;

-- Camilita lee specs para validar
INSERT INTO governance_access (document_slug, agent, access_type) VALUES
  ('bbp-funcional', 'Camilita', 'reads'),
  ('maqueta', 'Camilita', 'reads'),
  ('frontend-spec', 'Camilita', 'reads'),
  ('backend-spec', 'Camilita', 'reads')
ON CONFLICT (document_slug, agent) DO NOTHING;

-- Comercial lee customer ops
INSERT INTO governance_access (document_slug, agent, access_type) VALUES
  ('customer-ops', 'Comercial', 'reads'),
  ('project-charter', 'Comercial', 'reads')
ON CONFLICT (document_slug, agent) DO NOTHING;

-- Integrador lee specs de IA y técnicas
INSERT INTO governance_access (document_slug, agent, access_type) VALUES
  ('ai-spec', 'Integrador', 'reads'),
  ('bbp-tecnico', 'Integrador', 'reads'),
  ('api-contracts', 'Integrador', 'reads'),
  ('tech-radar', 'Integrador', 'reads')
ON CONFLICT (document_slug, agent) DO NOTHING;

-- Pipeline lee infra y deploys
INSERT INTO governance_access (document_slug, agent, access_type) VALUES
  ('arq-desarrollo', 'Pipeline', 'reads'),
  ('tech-radar', 'Pipeline', 'reads'),
  ('seguridad', 'Pipeline', 'reads')
ON CONFLICT (document_slug, agent) DO NOTHING;

-- ClienteX lee test reports y customer ops
INSERT INTO governance_access (document_slug, agent, access_type) VALUES
  ('test-report', 'ClienteX', 'reads'),
  ('pipeline-winloss', 'ClienteX', 'reads')
ON CONFLICT (document_slug, agent) DO NOTHING;

-- gov_tech_radar seed
INSERT INTO gov_tech_radar (name, ring, quadrant, description) VALUES
  ('Next.js 16', 'adopt', 'frameworks', 'Framework principal para aplicaciones web'),
  ('Tailwind v4', 'adopt', 'frameworks', 'Utility-first CSS framework'),
  ('Supabase', 'adopt', 'platforms', 'Backend as a Service con PostgreSQL y Auth'),
  ('TypeScript', 'adopt', 'languages', 'Tipado estricto en todo el stack'),
  ('Astro', 'adopt', 'frameworks', 'Framework para sitios estáticos (Marketing)'),
  ('Vanilla JS', 'maintain', 'languages', 'JavaScript vanilla para proyectos ligeros (VOY)'),
  ('Puppeteer', 'trial', 'tools', 'Browser automation para testing y scraping');

-- gov_integrations seed
INSERT INTO gov_integrations (service, type, projects, status, version, rate_limit, notes) VALUES
  ('Bsale', 'business', ARRAY['InfoPet'], 'ok', 'v1', '100/min', 'POS e inventario'),
  ('Jumpseller', 'business', ARRAY['InfoPet'], 'ok', 'v1', '60/min', 'E-commerce'),
  ('Airtable', 'business', ARRAY['VOY'], 'ok', 'v0', '5/sec', 'Base de datos de cotizaciones'),
  ('MeLi API', 'business', ARRAY['Marketplace'], 'ok', 'v2', '50/min', 'Mercado Libre marketplace'),
  ('Groq', 'ia', ARRAY['Intranet'], 'ok', 'v1', '30/min', 'LLM rápido para chat'),
  ('Claude/Anthropic', 'ia', ARRAY['Intranet'], 'ok', 'v1', NULL, 'LLM principal para análisis'),
  ('OpenAI', 'ia', ARRAY['Intranet'], 'ok', 'v1', NULL, 'LLM general y embeddings'),
  ('AWS S3', 'infra', ARRAY['Marketing'], 'ok', NULL, NULL, 'Almacenamiento estático'),
  ('CloudFront', 'infra', ARRAY['Marketing'], 'ok', NULL, NULL, 'CDN para smconnection.cl'),
  ('Supabase', 'platform', ARRAY['Intranet', 'Marketing', 'InfoPet', 'Marketplace', 'VOY'], 'ok', NULL, NULL, 'BaaS para todos los proyectos');

-- gov_providers_ia seed
INSERT INTO gov_providers_ia (provider, model, use_case, latency_ms, cost_per_1m_tokens, quality_score, is_fallback) VALUES
  ('Groq', 'Llama-4-Scout', 'chat', 200, 0.10, 'B+', false),
  ('Anthropic', 'Claude-Opus-4.6', 'analysis', 2000, 75.00, 'A+', false),
  ('Anthropic', 'Claude-Sonnet', 'code', 1000, 15.00, 'A+', false),
  ('OpenAI', 'GPT-4o', 'general', 800, 10.00, 'A', true),
  ('Cohere', 'Embed-v4', 'embeddings', 100, 0.10, 'A', false),
  ('Mistral', 'Large', 'classification', 300, 2.00, 'A-', true),
  ('DeepSeek', 'V3', 'code', 500, 1.00, 'A-', true);
