'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yjjtbwfgtoepsevvkzta.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || ''
)

type Knowledge = {
  id: string
  type: string
  domain: string
  concept: string
  project: string | null
  agents_involved: string[] | null
  observation: string
  teaching_moment: string | null
  analogy: string | null
  guillermo_level: string
  confidence: number
  times_discussed: number
  was_useful: boolean | null
  last_discussed: string
  next_review: string | null
}

const LEVEL_MAP: Record<string, { pct: number; color: string; label: string }> = {
  no_expuesto: { pct: 10, color: '#ef4444', label: 'No expuesto' },
  explorando:  { pct: 30, color: '#f97316', label: 'Explorando' },
  practicando: { pct: 50, color: '#eab308', label: 'Practicando' },
  competente:  { pct: 80, color: '#22c55e', label: 'Competente' },
  enseñable:   { pct: 100, color: '#00e5b0', label: 'Enseñable' },
}

const DOMAIN_EMOJI: Record<string, string> = {
  agents: '🤖', prompts: '📝', architecture: '🏗️', integrations: '🔌',
  testing: '🧪', llmops: '📊', security: '🔒', frontend: '🎨', business: '💼',
}

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  celebration: { label: '🏆 Victoria', bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  lesson:      { label: '📚 Aprendizaje', bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
  pattern:     { label: '🔍 Patrón', bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },
  struggle:    { label: '🎯 Desafío', bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  prediction:  { label: '🔮 Predicción', bg: 'rgba(14,165,233,0.15)', text: '#0ea5e9' },
  insight:     { label: '💡 Insight', bg: 'rgba(236,72,153,0.15)', text: '#ec4899' },
  evolution:   { label: '🌀 Evolución', bg: 'rgba(16,185,129,0.15)', text: '#10b981' },
}

const PROJECT_EMOJI: Record<string, string> = {
  intranet: '🏢', marketing: '🌐', voy: '🚀', infopet: '🐾', marketplace: '🛒',
}

export default function CerebroPage() {
  const [data, setData] = useState<Knowledge[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'domain' | 'project' | 'type'>('all')
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('cerebro_knowledge')
      .select('*')
      .order('last_discussed', { ascending: false })

    if (!error && rows) setData(rows)
    setLoading(false)
  }

  async function markUseful(id: string, useful: boolean) {
    await supabase.from('cerebro_knowledge').update({ was_useful: useful }).eq('id', id)
    setData(prev => prev.map(d => d.id === id ? { ...d, was_useful: useful } : d))
  }

  // Aggregations
  const domains = useMemo(() => {
    const map = new Map<string, { count: number; levels: string[] }>()
    data.forEach(d => {
      const e = map.get(d.domain) || { count: 0, levels: [] }
      e.count++
      e.levels.push(d.guillermo_level)
      map.set(d.domain, e)
    })
    const LEVEL_ORDER = ['no_expuesto', 'explorando', 'practicando', 'competente', 'enseñable']
    return Array.from(map.entries()).map(([domain, { count, levels }]) => {
      const sorted = levels.sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b))
      return { domain, count, level: sorted[Math.floor(sorted.length / 2)] }
    }).sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level))
  }, [data])

  const projects = useMemo(() => {
    const map = new Map<string, number>()
    data.forEach(d => { if (d.project) map.set(d.project, (map.get(d.project) || 0) + 1) })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [data])

  const filtered = useMemo(() => {
    if (selectedDomain) return data.filter(d => d.domain === selectedDomain)
    if (selectedProject) return data.filter(d => d.project === selectedProject)
    if (selectedType) return data.filter(d => d.type === selectedType)
    return data
  }, [data, selectedDomain, selectedProject, selectedType])

  function clearFilters() {
    setSelectedDomain(null)
    setSelectedProject(null)
    setSelectedType(null)
    setFilter('all')
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#94a3b8' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
        <div>Cerebro está pensando...</div>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #060912, #0f1520)',
        borderRadius: 16, padding: '32px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, background: 'radial-gradient(circle, rgba(0,229,176,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />
        <h1 style={{
          fontSize: 32, fontWeight: 800, margin: '0 0 8px 0',
          background: 'linear-gradient(135deg, #00e5b0, #00b4d8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>
          🧠 Cerebro
        </h1>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: 14 }}>
          {data.length} conceptos tracked · {domains.length} dominios · {projects.length} proyectos
        </p>
      </div>

      {/* Domain Progress Bars */}
      <div style={{
        background: 'rgba(15,21,32,0.6)', borderRadius: 12, padding: 20, marginBottom: 24,
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <h2 style={{ fontSize: 16, color: '#f1f5f9', margin: '0 0 16px 0' }}>📊 Mapa de Conocimiento</h2>
        {domains.map(d => {
          const lvl = LEVEL_MAP[d.level] || LEVEL_MAP.explorando
          const emoji = DOMAIN_EMOJI[d.domain] || '📌'
          const isActive = selectedDomain === d.domain
          return (
            <div key={d.domain}
              onClick={() => { setSelectedDomain(isActive ? null : d.domain); setSelectedProject(null); setSelectedType(null) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                marginBottom: 4, background: isActive ? 'rgba(0,229,176,0.1)' : 'transparent',
                transition: 'background 0.2s'
              }}>
              <span style={{ fontSize: 14, color: '#94a3b8', minWidth: 120 }}>{emoji} {d.domain}</span>
              <div style={{ flex: 1, background: '#1e293b', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                <div style={{
                  width: `${lvl.pct}%`, background: lvl.color, height: '100%', borderRadius: 8,
                  transition: 'width 0.5s ease-out'
                }} />
              </div>
              <span style={{ fontSize: 11, color: lvl.color, fontWeight: 600, minWidth: 80 }}>{lvl.label}</span>
              <span style={{ fontSize: 11, color: '#475569', minWidth: 30 }}>{d.count}</span>
            </div>
          )
        })}
      </div>

      {/* Project Map */}
      <div style={{
        background: 'rgba(15,21,32,0.6)', borderRadius: 12, padding: 20, marginBottom: 24,
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <h2 style={{ fontSize: 16, color: '#f1f5f9', margin: '0 0 16px 0' }}>🗺️ Por Proyecto</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {projects.map(([proj, count]) => {
            const isActive = selectedProject === proj
            return (
              <button key={proj}
                onClick={() => { setSelectedProject(isActive ? null : proj); setSelectedDomain(null); setSelectedType(null) }}
                style={{
                  padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: isActive ? 'rgba(0,229,176,0.2)' : 'rgba(30,41,59,0.8)',
                  color: isActive ? '#00e5b0' : '#94a3b8', fontSize: 13, fontWeight: 600,
                  transition: 'all 0.2s'
                }}>
                {PROJECT_EMOJI[proj] || '📁'} {proj} <span style={{ opacity: 0.6, marginLeft: 4 }}>({count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Type Filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
          const count = data.filter(d => d.type === type).length
          if (count === 0) return null
          const isActive = selectedType === type
          return (
            <button key={type}
              onClick={() => { setSelectedType(isActive ? null : type); setSelectedDomain(null); setSelectedProject(null) }}
              style={{
                padding: '5px 12px', borderRadius: 16, border: 'none', cursor: 'pointer',
                background: isActive ? cfg.bg : 'rgba(30,41,59,0.5)',
                color: isActive ? cfg.text : '#64748b', fontSize: 12, fontWeight: 500,
                transition: 'all 0.2s'
              }}>
              {cfg.label} ({count})
            </button>
          )
        })}
        {(selectedDomain || selectedProject || selectedType) && (
          <button onClick={clearFilters} style={{
            padding: '5px 12px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer'
          }}>✕ Limpiar filtro</button>
        )}
      </div>

      {/* Active filter indicator */}
      {(selectedDomain || selectedProject || selectedType) && (
        <div style={{ color: '#00e5b0', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>
          Filtrando: {selectedDomain && `🔬 ${selectedDomain}`}{selectedProject && `📁 ${selectedProject}`}{selectedType && TYPE_CONFIG[selectedType]?.label}
          {' '}({filtered.length} resultados)
        </div>
      )}

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(item => {
          const typeCfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.lesson
          const lvl = LEVEL_MAP[item.guillermo_level] || LEVEL_MAP.explorando
          const isExpanded = expandedId === item.id

          return (
            <div key={item.id}
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
              style={{
                background: 'rgba(15,21,32,0.6)', borderRadius: 12, padding: '16px 20px',
                border: `1px solid ${isExpanded ? 'rgba(0,229,176,0.3)' : 'rgba(255,255,255,0.06)'}`,
                cursor: 'pointer', transition: 'all 0.2s'
              }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    background: typeCfg.bg, color: typeCfg.text, padding: '3px 10px',
                    borderRadius: 12, fontSize: 11, fontWeight: 600
                  }}>{typeCfg.label}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
                    {item.concept.replace(/-/g, ' ')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {item.project && (
                    <span style={{ fontSize: 11, color: '#64748b', background: 'rgba(30,41,59,0.8)', padding: '3px 8px', borderRadius: 8 }}>
                      {PROJECT_EMOJI[item.project] || '📁'} {item.project}
                    </span>
                  )}
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: lvl.color,
                    background: `${lvl.color}20`, padding: '3px 8px', borderRadius: 8
                  }}>{lvl.label}</span>
                </div>
              </div>

              {/* Observation (always visible) */}
              <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, margin: '10px 0 0 0' }}>
                {item.observation}
              </p>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {item.analogy && (
                    <div style={{
                      background: 'rgba(0,229,176,0.08)', borderLeft: '3px solid #00e5b0',
                      padding: '10px 14px', borderRadius: '0 8px 8px 0', marginBottom: 12, fontSize: 13, color: '#94a3b8'
                    }}>
                      🍳 <strong>Analogía:</strong> {item.analogy}
                    </div>
                  )}
                  {item.teaching_moment && (
                    <div style={{
                      background: 'rgba(59,130,246,0.08)', borderLeft: '3px solid #3b82f6',
                      padding: '10px 14px', borderRadius: '0 8px 8px 0', marginBottom: 12, fontSize: 13, color: '#94a3b8'
                    }}>
                      💡 <strong>Teaching moment:</strong> {item.teaching_moment}
                    </div>
                  )}
                  {item.agents_involved && item.agents_involved.length > 0 && (
                    <div style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>
                      🤝 Agentes: {item.agents_involved.join(', ')}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
                    <span style={{ fontSize: 12, color: '#475569' }}>¿Te sirvió?</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); markUseful(item.id, true) }}
                      style={{
                        padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12,
                        background: item.was_useful === true ? '#22c55e' : 'rgba(34,197,94,0.15)',
                        color: item.was_useful === true ? '#fff' : '#22c55e', transition: 'all 0.2s'
                      }}>👍 Sí</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); markUseful(item.id, false) }}
                      style={{
                        padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12,
                        background: item.was_useful === false ? '#ef4444' : 'rgba(239,68,68,0.15)',
                        color: item.was_useful === false ? '#fff' : '#ef4444', transition: 'all 0.2s'
                      }}>👎 No</button>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 11, color: '#334155' }}>
                      Confianza: {Math.round(item.confidence * 100)}% · Discutido {item.times_discussed}x
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Send Email Button */}
      <div style={{ textAlign: 'center', marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <a href="/api/cerebro/email" target="_blank"
          style={{
            display: 'inline-block', padding: '12px 24px', borderRadius: 10,
            background: 'linear-gradient(135deg, #00e5b0, #00b4d8)', color: '#060912',
            textDecoration: 'none', fontWeight: 700, fontSize: 14
          }}>
          📧 Ver Email HTML
        </a>
        <p style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>
          Se envía automáticamente cada 2 días a guillermo.gonzalez@smconnection.cl
        </p>
      </div>
    </div>
  )
}
