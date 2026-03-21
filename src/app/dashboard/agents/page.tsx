'use client';
import { useEffect, useState } from 'react';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Record<string, unknown>[]>([]);
  const api = (p: Record<string, unknown>) => fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(r => r.json());

  useEffect(() => { api({ action: 'list' }).then(d => { if (d.agents) setAgents(d.agents); }); }, []);

  const meta: Record<string, { color: string; icon: string }> = { claude: { color: '#00e5b0', icon: 'bi-robot' }, groq: { color: '#f59e0b', icon: 'bi-cpu' }, grok: { color: '#8b5cf6', icon: 'bi-lightning-charge' }, gemini: { color: '#22c55e', icon: 'bi-gem' }, deployer: { color: '#3b82f6', icon: 'bi-gear-wide-connected' } };

  const toggle = (id: string) => { api({ action: 'toggle', agentId: id }).then(d => { if (d.success) setAgents(prev => prev.map(a => a.agent_id === id ? { ...a, active: d.active } : a)); }); };

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(17,24,39,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 56, display: 'flex', alignItems: 'center', padding: '0 2rem', fontSize: '0.85rem', color: '#94a3b8' }}>
        Intranet <span style={{ margin: '0 8px', color: '#475569' }}>/</span> <span style={{ color: '#fff', fontWeight: 600 }}>Agentes IA</span>
      </div>
      <div style={{ padding: '1.5rem 2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {agents.map((a, i) => {
            const m = meta[a.agent_id as string] || { color: '#94a3b8', icon: 'bi-cpu' };
            return (
              <div key={i} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ height: 3, background: m.color }}></div>
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${m.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: m.color }}><i className={`bi ${m.icon}`}></i></div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f1f5f9' }}>{a.name as string}</div>
                      <div style={{ fontSize: '0.6rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{a.provider as string}</div>
                    </div>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', color: '#475569', background: '#0a0d14', padding: '3px 8px', borderRadius: 4, display: 'inline-block', marginBottom: 8 }}>{a.model as string || '—'}</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 12 }}>{a.role as string}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, marginBottom: 16, minHeight: 40 }}>{a.description as string}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 600 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.active ? '#22c55e' : '#f59e0b', boxShadow: a.active ? '0 0 8px #22c55e' : 'none' }}></span>
                      <span style={{ color: a.active ? '#22c55e' : '#f59e0b' }}>{a.active ? 'Activo' : 'Standby'}</span>
                    </div>
                    <button onClick={() => toggle(a.agent_id as string)} style={{ background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.2)', color: '#00e5b0', padding: '5px 12px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>
                      <i className={`bi ${a.active ? 'bi-pause-fill' : 'bi-play-fill'}`}></i> {a.active ? 'Pausar' : 'Activar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
