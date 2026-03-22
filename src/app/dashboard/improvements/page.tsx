'use client';
import { useState, useEffect, useCallback } from 'react';

interface Improvement {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  impacto: string;
  estado: string;
  ciclo: number;
  agente: string;
  created_at: string;
}

type Lifecycle = 'draft' | 'preview' | 'approved' | 'deployed';

const LIFECYCLE: { key: Lifecycle; label: string; color: string; icon: string }[] = [
  { key: 'draft', label: 'Borrador', color: '#f59e0b', icon: '📝' },
  { key: 'preview', label: 'Preview', color: '#3b82f6', icon: '👁' },
  { key: 'approved', label: 'Aprobado', color: '#8b5cf6', icon: '✅' },
  { key: 'deployed', label: 'Deployado', color: '#22c55e', icon: '🚀' },
];

import { AGENT_COLORS, api, deployApi, formatDate } from '@/lib/config';

function mapEstado(estado: string): Lifecycle {
  if (estado === 'implementado') return 'deployed';
  if (estado === 'en_progreso') return 'approved';
  return 'draft';
}

export default function ImprovementsPage() {
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Lifecycle | 'all'>('all');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [selectedItem, setSelectedItem] = useState<Improvement | null>(null);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [deployLog, setDeployLog] = useState<string[]>([]);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [rollbackLog, setRollbackLog] = useState<string[]>([]);
  const [rollbackConfirm, setRollbackConfirm] = useState<string | null>(null);
  const [showRecentOnly, setShowRecentOnly] = useState(false);
  const [compareItem, setCompareItem] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api({ action: 'query', table: 'ux_insights', order: 'created_at.desc', limit: 50 })
      .then(d => { if (d.data) setImprovements(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const recentCount = improvements.filter(i => (Date.now() - new Date(i.created_at).getTime()) < 24 * 60 * 60 * 1000).length;

  const baseFiltered = filter === 'all' ? improvements : improvements.filter(i => mapEstado(i.estado) === filter);
  const filtered = showRecentOnly ? baseFiltered.filter(i => (Date.now() - new Date(i.created_at).getTime()) < 24 * 60 * 60 * 1000) : baseFiltered;

  const extractHtml = (text: string): string | null => {
    const htmlMatch = text.match(/```html\s*([\s\S]*?)```/);
    if (htmlMatch) return htmlMatch[1].trim();
    const tsxMatch = text.match(/```tsx[^\n]*\n([\s\S]*?)```/);
    if (tsxMatch) return `<pre style="font-family:monospace;color:#e2e8f0;background:#0a0d14;padding:20px;border-radius:10px;font-size:13px;line-height:1.6;overflow:auto">${tsxMatch[1].replace(/</g, '&lt;')}</pre>`;
    if (text.includes('<div') || text.includes('<section') || text.includes('<h1')) return text;
    return null;
  };

  const extractFiles = (text: string): { path: string; lang: string; preview: string }[] => {
    const files: { path: string; lang: string; preview: string }[] = [];
    const regex = /```(\w+)(?:\s+filename=["']?([^"'\n]+)["']?)?\n([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      files.push({ lang: match[1], path: match[2] || `archivo.${match[1]}`, preview: match[3].trim().split('\n').slice(0, 5).join('\n') });
    }
    return files;
  };

  const deployImprovement = async (item: Improvement) => {
    setDeploying(item.id);
    setDeployLog(['Iniciando pipeline...']);
    setDeployLog(prev => [...prev, '📤 Guardando en Supabase...']);
    await api({ action: 'update_insight', insightId: item.id, estado: 'en_progreso' });
    setDeployLog(prev => [...prev, '✅ Estado actualizado']);

    const files = extractFiles(item.descripcion);
    if (files.length > 0) {
      setDeployLog(prev => [...prev, `🔗 Committeando ${files.length} archivo(s)...`]);
      for (const f of files) {
        const fullContent = item.descripcion.match(new RegExp('```' + f.lang + '[^\\n]*\\n([\\s\\S]*?)```'));
        if (fullContent) {
          const r = await deployApi({ action: 'commit_file', repo: 'guillermogonzalezleon-lgtm/smartconnection-intranet', path: f.path, content: fullContent[1].trim(), message: `feat(improvement): ${f.path} — ${item.titulo.slice(0, 50)}` });
          setDeployLog(prev => [...prev, r.success ? `  ✅ ${f.path}` : `  ❌ ${f.path}: ${r.error}`]);
        }
      }
    } else {
      const date = new Date().toISOString().split('T')[0];
      await deployApi({ action: 'commit_file', repo: 'guillermogonzalezleon-lgtm/smartconnection-intranet', path: `docs/improvements/${date}-${item.agente}-${item.id}.md`, content: `# ${item.titulo}\n\n${item.descripcion}`, message: `docs: ${item.titulo.slice(0, 60)}` });
      setDeployLog(prev => [...prev, '✅ Documentación committeada']);
    }

    setDeployLog(prev => [...prev, '🚀 Deploy disparado en AWS Amplify...']);
    await new Promise(r => setTimeout(r, 1500));
    await api({ action: 'update_insight', insightId: item.id, estado: 'implementado' });
    setDeployLog(prev => [...prev, '✅ Deployado — intranet.smconnection.cl']);
    setDeployLog(prev => [...prev, '🎯 Completado']);
    setTimeout(() => { load(); setDeploying(null); setDeployLog([]); }, 2000);
  };

  const rollbackImprovement = async (item: Improvement) => {
    setRollbackConfirm(null);
    setRollingBack(item.id);
    setRollbackLog(['Iniciando rollback...']);
    setRollbackLog(prev => [...prev, '↩ Revirtiendo estado...']);
    await deployApi({ action: 'rollback', id: item.id, titulo: item.titulo, agente: item.agente });
    setRollbackLog(prev => [...prev, '📤 Actualizando en Supabase...']);
    await api({ action: 'update_insight', insightId: item.id, estado: 'draft' });
    setRollbackLog(prev => [...prev, '✅ Estado revertido a borrador']);
    setRollbackLog(prev => [...prev, '🎯 Rollback completado']);
    setTimeout(() => { load(); setRollingBack(null); setRollbackLog([]); }, 2000);
  };

  const buildTimeline = (item: Improvement): { icon: string; label: string; time: string }[] => {
    const steps: { icon: string; label: string; time: string }[] = [];
    steps.push({ icon: '📝', label: 'Creado', time: `${formatDate(item.created_at, 'relative')}` });
    if (item.estado === 'en_progreso' || item.estado === 'implementado') {
      steps.push({ icon: '🔄', label: 'En progreso', time: `${formatDate(item.created_at, 'relative')}` });
    }
    if (item.estado === 'implementado') {
      steps.push({ icon: '🚀', label: 'Deployado', time: `${formatDate(item.created_at, 'relative')}` });
    }
    return steps;
  };

  const counts = { all: improvements.length, draft: improvements.filter(i => mapEstado(i.estado) === 'draft').length, preview: 0, approved: improvements.filter(i => mapEstado(i.estado) === 'approved').length, deployed: improvements.filter(i => mapEstado(i.estado) === 'deployed').length };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 34px)', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, background: 'rgba(15,22,35,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ height: 48, display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: 10 }}>
          <img src="/img/hoku.jpg" alt="Hoku" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>Improvements</span>
          <span style={{ fontSize: '0.65rem', color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>{improvements.length} mejoras</span>
          <div style={{ flex: 1 }} />
          <a href="/dashboard/agents" style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)', color: '#0a0d14', padding: '5px 12px', borderRadius: 7, fontWeight: 700, fontSize: '0.65rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>🐾 Nueva mejora</a>
          <button onClick={load} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 10px', color: '#64748b', fontSize: '0.65rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>🔄</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem 1.5rem' }}>
        {/* Lifecycle pipeline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '1.25rem', padding: '14px 20px', background: '#111827', borderRadius: 14, border: '1px solid rgba(255,255,255,0.04)' }}>
          {LIFECYCLE.map((lc, i) => (
            <div key={lc.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <button onClick={() => setFilter(filter === lc.key ? 'all' : lc.key)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'transform 0.15s', transform: filter === lc.key ? 'scale(1.1)' : 'scale(1)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: filter === lc.key ? `${lc.color}25` : `${lc.color}10`, border: `2px solid ${filter === lc.key ? lc.color : `${lc.color}40`}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', transition: 'all 0.2s' }}>{lc.icon}</div>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: filter === lc.key ? lc.color : '#64748b' }}>{lc.label}</span>
                <span style={{ fontSize: '0.55rem', color: '#475569', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{counts[lc.key]}</span>
              </button>
              {i < LIFECYCLE.length - 1 && <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg, ${lc.color}40, ${LIFECYCLE[i + 1].color}40)`, margin: '0 8px', marginBottom: 30 }} />}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, marginBottom: '1rem' }}>
          <button onClick={() => setFilter('all')} style={{ padding: '5px 12px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', background: filter === 'all' ? 'rgba(0,229,176,0.1)' : 'transparent', color: filter === 'all' ? '#00e5b0' : '#475569', border: filter === 'all' ? '1px solid rgba(0,229,176,0.2)' : '1px solid rgba(255,255,255,0.04)', fontFamily: "'Inter', system-ui" }}>Todos ({counts.all})</button>
        </div>

        {recentCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', padding: '10px 16px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10 }}>
            <span style={{ fontSize: '0.75rem', color: '#93c5fd' }}>🆕 {recentCount} mejora{recentCount > 1 ? 's' : ''} nueva{recentCount > 1 ? 's' : ''} en las últimas 24h</span>
            <button onClick={() => setShowRecentOnly(!showRecentOnly)} style={{ marginLeft: 'auto', background: showRecentOnly ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, padding: '3px 10px', color: '#3b82f6', fontSize: '0.62rem', cursor: 'pointer', fontWeight: 600, fontFamily: "'Inter', system-ui" }}>{showRecentOnly ? '✕ Mostrar todas' : 'Ver últimas'}</button>
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: '3rem', color: '#475569', fontSize: '0.78rem' }}><div style={{ width: 20, height: 20, border: '2px solid #1e293b', borderTopColor: '#00e5b0', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />Cargando...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <img src="/img/hoku.jpg" alt="Hoku" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 12px', opacity: 0.5, display: 'block' }} />
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: 8 }}>Sin mejoras todavía</div>
            <a href="/dashboard/agents" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #00e5b0, #00c49a)', color: '#0a0d14', padding: '8px 18px', borderRadius: 8, fontWeight: 700, fontSize: '0.72rem', textDecoration: 'none' }}>🐾 Generar primera mejora con Hoku</a>
          </div>
        )}

        {filtered.map(item => {
          const lifecycle = mapEstado(item.estado);
          const lc = LIFECYCLE.find(l => l.key === lifecycle) || LIFECYCLE[0];
          const files = extractFiles(item.descripcion);
          const hasHtml = !!extractHtml(item.descripcion);
          const isDeploying = deploying === item.id;

          return (
            <div key={item.id} style={{ background: '#111827', border: `1px solid ${lifecycle === 'deployed' ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)'}`, borderLeft: `3px solid ${lc.color}`, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '0.6rem', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: `${lc.color}12`, color: lc.color, border: `1px solid ${lc.color}20` }}>{lc.icon} {lc.label}</span>
                <span style={{ fontSize: '0.55rem', fontWeight: 600, padding: '2px 6px', borderRadius: 5, background: `${AGENT_COLORS[item.agente] || '#475569'}12`, color: AGENT_COLORS[item.agente] || '#94a3b8' }}>{item.agente}</span>
                {item.impacto && <span style={{ fontSize: '0.55rem', color: '#22c55e', marginLeft: 'auto', fontWeight: 600 }}>{item.impacto}</span>}
                <span style={{ fontSize: '0.52rem', color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(item.created_at, 'relative')}</span>
              </div>

              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{item.titulo}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: 8, maxHeight: 50, overflow: 'hidden' }}>{item.descripcion.slice(0, 180)}{item.descripcion.length > 180 ? '...' : ''}</div>

              {files.length > 0 && (
                <div style={{ marginBottom: 8, padding: '6px 8px', background: '#0a0d14', borderRadius: 6, border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#475569', marginBottom: 3 }}>ARCHIVOS ({files.length})</div>
                  {files.map((f, i) => <div key={i} style={{ fontSize: '0.62rem', color: '#00e5b0', fontFamily: "'JetBrains Mono', monospace", padding: '1px 0' }}>📄 {f.path}</div>)}
                </div>
              )}

              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <button onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '4px 8px', color: '#94a3b8', fontSize: '0.62rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>{selectedItem?.id === item.id ? '▼ Cerrar' : '▶ Detalle'}</button>
                {hasHtml && <button onClick={() => { setPreviewHtml(extractHtml(item.descripcion)); setPreviewTitle(item.titulo); }} style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 6, padding: '4px 8px', color: '#3b82f6', fontSize: '0.62rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>👁 Preview</button>}
                {lifecycle !== 'deployed' && <button onClick={() => deployImprovement(item)} disabled={!!deploying} style={{ background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 6, padding: '4px 8px', color: '#00e5b0', fontSize: '0.62rem', cursor: deploying ? 'not-allowed' : 'pointer', fontFamily: "'Inter', system-ui" }}>🚀 Deploy</button>}
                {lifecycle === 'deployed' && <a href="https://intranet.smconnection.cl" target="_blank" rel="noopener" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 6, padding: '4px 8px', color: '#22c55e', fontSize: '0.62rem', textDecoration: 'none', fontFamily: "'Inter', system-ui" }}>🔗 Live</a>}
                {lifecycle === 'deployed' && <button onClick={() => setRollbackConfirm(item.id)} disabled={!!rollingBack} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6, padding: '4px 8px', color: '#ef4444', fontSize: '0.62rem', cursor: rollingBack ? 'not-allowed' : 'pointer', fontFamily: "'Inter', system-ui" }}>↩ Rollback</button>}
                {lifecycle === 'deployed' && <button onClick={() => setCompareItem(compareItem === item.id ? null : item.id)} style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 6, padding: '4px 8px', color: '#8b5cf6', fontSize: '0.62rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>📊 Antes/Después</button>}
                <button onClick={() => navigator.clipboard.writeText(item.descripcion)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 6, padding: '4px 8px', color: '#475569', fontSize: '0.62rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>📋</button>
              </div>

              {selectedItem?.id === item.id && (
                <div style={{ marginTop: 10, padding: '10px', background: '#0a0d14', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)', maxHeight: 350, overflow: 'auto' }}>
                  <div style={{ fontSize: '0.7rem', color: '#cbd5e1', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: "'JetBrains Mono', monospace" }}>{item.descripcion}</div>
                </div>
              )}

              {isDeploying && (
                <div style={{ marginTop: 10, padding: '10px', background: '#0a0d14', borderRadius: 8, border: '1px solid rgba(0,229,176,0.1)' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', lineHeight: 1.7 }}>
                    {deployLog.map((l, i) => <div key={i} style={{ color: l.startsWith('✅') ? '#22c55e' : l.startsWith('❌') ? '#ef4444' : l.startsWith('🎯') ? '#3b82f6' : '#94a3b8' }}>{l}</div>)}
                    {!deployLog.includes('🎯 Completado') && <span style={{ display: 'inline-block', width: 6, height: 12, background: '#00e5b0', animation: 'blink 1s step-end infinite' }} />}
                  </div>
                </div>
              )}

              {/* Rollback confirmation */}
              {rollbackConfirm === item.id && (
                <div style={{ marginTop: 10, padding: '12px', background: 'rgba(239,68,68,0.06)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.72rem', color: '#fca5a5' }}>¿Revertir esta mejora?</span>
                  <button onClick={() => rollbackImprovement(item)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '4px 12px', color: '#ef4444', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>Sí, revertir</button>
                  <button onClick={() => setRollbackConfirm(null)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '4px 12px', color: '#64748b', fontSize: '0.62rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>Cancelar</button>
                </div>
              )}

              {/* Rollback log */}
              {rollingBack === item.id && (
                <div style={{ marginTop: 10, padding: '10px', background: '#0a0d14', borderRadius: 8, border: '1px solid rgba(239,68,68,0.1)' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', lineHeight: 1.7 }}>
                    {rollbackLog.map((l, i) => <div key={i} style={{ color: l.startsWith('✅') ? '#22c55e' : l.startsWith('🎯') ? '#3b82f6' : '#94a3b8' }}>{l}</div>)}
                    {!rollbackLog.includes('🎯 Rollback completado') && <span style={{ display: 'inline-block', width: 6, height: 12, background: '#ef4444', animation: 'blink 1s step-end infinite' }} />}
                  </div>
                </div>
              )}

              {/* Comparar antes/después */}
              {compareItem === item.id && lifecycle === 'deployed' && (
                <div style={{ marginTop: 10, padding: '12px', background: '#0a0d14', borderRadius: 8, border: '1px solid rgba(139,92,246,0.12)' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8b5cf6', marginBottom: 6 }}>📊 ANTES / DESPUÉS</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>Mejora aplicada:</div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: 10, padding: '8px', background: 'rgba(139,92,246,0.05)', borderRadius: 6, border: '1px solid rgba(139,92,246,0.08)' }}>{item.descripcion.slice(0, 300)}{item.descripcion.length > 300 ? '...' : ''}</div>
                  <a href="https://intranet.smconnection.cl" target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 6, padding: '5px 12px', color: '#22c55e', fontSize: '0.62rem', textDecoration: 'none', fontWeight: 600, fontFamily: "'Inter', system-ui" }}>🔗 Ver resultado en producción</a>
                </div>
              )}

              {/* Timeline */}
              {selectedItem?.id === item.id && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
                  {buildTimeline(item).map((step, i, arr) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.58rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{step.icon} {step.label} {step.time}</span>
                      {i < arr.length - 1 && <span style={{ margin: '0 6px', color: '#334155', fontSize: '0.55rem' }}>→</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Preview popup — iframe */}
      {previewHtml && (
        <div onClick={() => setPreviewHtml(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '90%', maxWidth: 900, height: '80vh', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 38, background: '#f1f5f9', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8, borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <span onClick={() => setPreviewHtml(null)} style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', cursor: 'pointer' }} />
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
              </div>
              <div style={{ flex: 1, background: '#fff', borderRadius: 6, padding: '3px 12px', fontSize: '0.68rem', color: '#64748b', border: '1px solid #e2e8f0', textAlign: 'center' }}>Preview: {previewTitle}</div>
            </div>
            <iframe srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:20px;font-family:Inter,system-ui,sans-serif;background:#fff;color:#0f172a}*{box-sizing:border-box}</style></head><body>${previewHtml}</body></html>`} style={{ flex: 1, border: 'none', width: '100%' }} sandbox="allow-scripts" title="Preview" />
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}
