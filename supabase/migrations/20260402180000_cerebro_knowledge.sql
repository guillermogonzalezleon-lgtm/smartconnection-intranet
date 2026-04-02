-- ============================================
-- CEREBRO: Sistema de aprendizaje adaptativo
-- Tabla principal de conocimiento persistente
-- ============================================

CREATE TABLE IF NOT EXISTS cerebro_knowledge (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),

  -- Qué observó
  type text NOT NULL CHECK (type IN (
    'pattern',
    'insight',
    'lesson',
    'struggle',
    'evolution',
    'prediction',
    'celebration'
  )),

  -- Contexto
  domain text NOT NULL,
  concept text NOT NULL,
  project text,
  agents_involved text[],

  -- Conocimiento
  observation text NOT NULL,
  teaching_moment text,
  analogy text,

  -- Nivel y evolución
  guillermo_level text DEFAULT 'explorando' CHECK (guillermo_level IN (
    'no_expuesto',
    'explorando',
    'practicando',
    'competente',
    'enseñable'
  )),
  confidence float DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  times_discussed int DEFAULT 1,

  -- Feedback loop
  was_useful boolean,
  evolved_from uuid REFERENCES cerebro_knowledge(id),

  -- Meta
  last_discussed timestamptz DEFAULT now(),
  next_review timestamptz
);

-- Índices para consultas rápidas de Cerebro
CREATE INDEX IF NOT EXISTS idx_cerebro_domain ON cerebro_knowledge(domain);
CREATE INDEX IF NOT EXISTS idx_cerebro_level ON cerebro_knowledge(guillermo_level);
CREATE INDEX IF NOT EXISTS idx_cerebro_review ON cerebro_knowledge(next_review) WHERE next_review IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cerebro_useful ON cerebro_knowledge(was_useful) WHERE was_useful = true;
CREATE INDEX IF NOT EXISTS idx_cerebro_concept ON cerebro_knowledge(concept);
CREATE INDEX IF NOT EXISTS idx_cerebro_type ON cerebro_knowledge(type);

-- RLS: service_role puede todo (Cerebro opera server-side)
ALTER TABLE cerebro_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON cerebro_knowledge
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed: conocimiento inicial basado en el Kaizen del sistema
INSERT INTO cerebro_knowledge (type, domain, concept, project, agents_involved, observation, guillermo_level, confidence) VALUES

-- Agentes (competente — ya orquesta 12 agentes)
('lesson', 'agents', 'multi-agent-orchestration', NULL, ARRAY['PM','Arielito'],
 'Guillermo diseñó un sistema de 13 agentes especializados con roles claros, flujo definido y governance. Esto es multi-agent orchestration avanzada.',
 'competente', 0.9),

('lesson', 'agents', 'agent-memory-pattern', NULL, ARRAY['Arielito','Panchita'],
 'Consolidó 3 memorias de Panchita en 1 (346L→170L, -51%). Entiende que los agentes deben ser livianos con conocimiento en memorias externas.',
 'competente', 0.85),

-- Prompts (explorando — usa pero no versiona)
('struggle', 'prompts', 'prompt-versioning', 'intranet', ARRAY['Hoku'],
 'Prompts de IA en intranet están inline como strings, sin versionar. Score D+ en IA/LLMOps.',
 'explorando', 0.4),

('pattern', 'prompts', 'system-prompt-design', NULL, ARRAY['Hoku','Panchita'],
 'Los 13 agentes .md SON system prompts sofisticados. Guillermo hace prompt engineering sin llamarlo así.',
 'practicando', 0.7),

-- Arquitectura (practicando)
('lesson', 'architecture', 'api-contracts', 'intranet', ARRAY['Arielito','ABAP','Fiori'],
 'Define contratos API entre agentes. Arielito como arquitecto cross define, ABAP y Fiori implementan contra el contrato.',
 'practicando', 0.7),

('pattern', 'architecture', 'feature-colocation', 'intranet', ARRAY['Fiori'],
 'Estructura Next.js con _components/, _hooks/, _actions/ junto a cada página. Entiende colocation.',
 'practicando', 0.65),

-- Integraciones (practicando)
('lesson', 'integrations', 'circuit-breaker', 'intranet', ARRAY['Integrador'],
 'Integrador tiene documentado circuit breaker pero NO está implementado en código. Groq único provider = app muerta si cae.',
 'explorando', 0.4),

('pattern', 'integrations', 'fallback-chain', NULL, ARRAY['Integrador','Hoku'],
 'Sabe que necesita Groq→Claude→cache pero aún no lo ha implementado. Concepto entendido, ejecución pendiente.',
 'explorando', 0.5),

-- Testing (no_expuesto — 0 tests)
('struggle', 'testing', 'automated-testing', NULL, ARRAY['Camilita','Pipeline'],
 'CERO tests automatizados en todos los repos. Score F. Es el gap más grande del sistema.',
 'no_expuesto', 0.2),

('prediction', 'testing', 'vitest-setup', 'intranet', ARRAY['Pipeline','ABAP'],
 'Primer paso para subir de F a C: vitest + GitHub Actions en intranet. Alto impacto, bajo esfuerzo.',
 'no_expuesto', 0.3),

-- LLMOps (no_expuesto)
('struggle', 'llmops', 'llm-logging', 'intranet', ARRAY['Hoku'],
 'Sin logging de llamadas IA. No sabe cuánto gasta por feature ni cuántas veces falla Groq.',
 'no_expuesto', 0.2),

('prediction', 'llmops', 'cost-tracking', NULL, ARRAY['Integrador'],
 'Con 10 providers configurados en Amplify, el tracking de costos va a ser crítico cuando escale.',
 'no_expuesto', 0.3),

-- Seguridad (explorando)
('struggle', 'security', 'client-side-tokens', 'voy', ARRAY['ABAP'],
 'Airtable token expuesto en client-side JS de VOY. Riesgo de seguridad activo.',
 'explorando', 0.4),

('lesson', 'security', 'env-vars', NULL, ARRAY['Pipeline'],
 'Usa env vars en Amplify/Vercel (18 vars configuradas). Entiende el principio de no poner secrets en código.',
 'practicando', 0.75),

-- Frontend (practicando)
('lesson', 'frontend', 'design-system', NULL, ARRAY['Fiori','Panchita'],
 'Tiene un design system federado: Radix + Tailwind Variants + @smc/ui. Panchita define tokens, Fiori implementa.',
 'practicando', 0.7),

('lesson', 'frontend', 'mobile-first', 'marketing', ARRAY['Panchita','Fiori'],
 'Acaba de rediseñar smconnection.cl mobile con scroll-snap, glassmorphism, responsive. Lo hizo bien.',
 'practicando', 0.75),

-- Negocio + IA (practicando)
('pattern', 'business', 'ai-first-product', NULL, ARRAY['Comercial','PM'],
 'Vende IA como diferenciador pero no mide ROI de features IA. Sabe el discurso, falta la métrica.',
 'practicando', 0.5),

('lesson', 'business', 'kaizen-continuous-improvement', NULL, ARRAY['Arielito'],
 'Implementó Kaizen como auditoría cada 3 días con scoring A-F por área. Framework maduro.',
 'competente', 0.85),

-- Meta: el propio sistema de agentes como innovación
('celebration', 'agents', 'ai-team-design', NULL, NULL,
 'Guillermo construyó un equipo de 13 agentes IA especializados con governance, memorias persistentes y scoring. Esto es state-of-the-art en AI-augmented workflows.',
 'competente', 0.95);
