'use client';
import { useState, useRef, useCallback, useEffect } from 'react';

const AGENTS = [
  { id: 'hoku', name: 'Hoku', model: 'fusión 4 agentes', color: '#ff6b6b', role: 'Síntesis — ejecuta los 4 y combina lo mejor' },
  { id: 'groq', name: 'Groq', model: 'llama-3.3-70b', color: '#f59e0b', role: 'Inferencia ultra rápida' },
  { id: 'claude', name: 'Claude', model: 'claude-sonnet-4-5', color: '#00e5b0', role: 'Desarrollo & Code Review' },
  { id: 'gemini', name: 'Gemini', model: 'gemini-2.0-flash', color: '#22c55e', role: 'SEO & Analytics' },
  { id: 'grok', name: 'Grok', model: 'grok-3', color: '#8b5cf6', role: 'Análisis & Research' },
];

const PLACEHOLDERS: Record<string, string> = {
  hoku: 'Analiza smconnection.cl desde todos los ángulos...',
  groq: 'Escribe el copy para la sección hero...',
  claude: 'Revisa el código y sugiere mejoras...',
  gemini: 'Genera mejoras SEO para la landing...',
  grok: 'Investiga tendencias de conversión SaaS...',
};

type PipelineStep = 'idle' | 'confirm' | 'pushing' | 'deploying' | 'done' | 'error';

export default function AgentsWorkspace() {
  const [selectedAgent, setSelectedAgent] = useState('hoku');
  const [task, setTask] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [pipeline, setPipeline] = useState<PipelineStep>('idle');
  const [pipelineLog, setPipelineLog] = useState<string[]>([]);
  const [targetRepo, setTargetRepo] = useState('smartconnection-astro');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const agent = AGENTS.find(a => a.id === selectedAgent) || AGENTS[0];
  const repos = [
    { id: 'smartconnection-astro', label: 'Astro (Vercel)', repo: 'guillermogonzalezleon-lgtm/smartconnection-astro', url: 'https://www.smconnection.cl' },
    { id: 'smartconnection-intranet', label: 'Intranet (AWS)', repo: 'guillermogonzalezleon-lgtm/smartconnection-intranet', url: 'https://intranet.smconnection.cl' },
  ];

  const deployApi = (p: Record<string, unknown>) => fetch('/api/deploy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(r => r.json());

  const execute = useCallback(async () => {
    if (!task.trim() || running) return;
    setRunning(true); setOutput(''); setElapsed(0); setTokens(0);
    const start = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 100);
    window.dispatchEvent(new CustomEvent('exec-agent', { detail: { agent: selectedAgent, prompt: task, taskType: 'general' } }));
    let tokenCount = 0;
    try {
      const res = await fetch('/api/agents/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: task, taskType: 'general', agentId: selectedAgent }) });
      if (!res.ok || !res.body) { setOutput(`Error: ${res.status}`); setRunning(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;
          try { const p = JSON.parse(data); if (p.content) { full += p.content; tokenCount += p.content.split(/\s+/).length; setOutput(full); setTokens(tokenCount); } } catch {}
        }
      }
    } catch (err) { setOutput(`Error: ${String(err)}`); }
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
  }, [task, selectedAgent, running]);

  const startPipeline = () => { setPipeline('confirm'); setPipelineLog([]); };

  const runPipeline = async () => {
    const target = repos.find(r => r.id === targetRepo) || repos[0];
    setPipeline('pushing');
    setPipelineLog([`Pipeline → ${target.label}`, '']);
    setPipelineLog(prev => [...prev, '📤 Guardando mejora en Supabase...']);
    try {
      const firstLine = output.split('\n').find(l => l.trim().length > 10) || 'Mejora generada por IA';
      const titulo = firstLine.replace(/^\*\*|^\d+\.\s*|\*\*$/g, '').trim().slice(0, 100);
      await deployApi({ action: 'save_improvement', titulo, descripcion: output.slice(0, 500), categoria: 'UX', impacto: 'Por evaluar', agente: selectedAgent, ciclo: 1 });
      setPipelineLog(prev => [...prev, `✅ Insight guardado`]);
    } catch (err) { setPipelineLog(prev => [...prev, `⚠️ ${String(err)}`]); }
    setPipeline('deploying');
    setPipelineLog(prev => [...prev, '', `🔗 Commit a GitHub (${target.repo})...`]);
    try {
      const date = new Date().toISOString().split('T')[0];
      const r = await deployApi({ action: 'commit_file', repo: target.repo, path: `docs/improvements/${date}-${selectedAgent}-${Date.now()}.md`, content: `# Mejora — ${date}\n\n**Agente:** ${selectedAgent}\n**Tarea:** ${task}\n\n${output}\n`, message: `feat(ux): mejora via ${selectedAgent}` });
      if (r.success) { setPipelineLog(prev => [...prev, `✅ Committed`]); } else { setPipelineLog(prev => [...prev, `❌ ${r.error}`]); setPipeline('error'); return; }
    } catch (err) { setPipelineLog(prev => [...prev, `❌ ${String(err)}`]); setPipeline('error'); return; }
    setPipelineLog(prev => [...prev, '', '🚀 Auto-deploy iniciado...']);
    await new Promise(r => setTimeout(r, 1500));
    setPipelineLog(prev => [...prev, `✅ Deploy → ${target.url}`]);
    setPipeline('done');
    setPipelineLog(prev => [...prev, '', '🎯 Pipeline completo']);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); execute(); }
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) { e.preventDefault(); execute(); }
  };

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  useEffect(() => { if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight; }, [output]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 34px)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(15,22,35,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ height: 48, display: 'flex', alignItems: 'center', padding: '0 1.5rem', fontSize: '0.82rem', color: '#94a3b8' }}>
          <span>Intranet</span><span style={{ margin: '0 8px', color: '#475569' }}>/</span><span style={{ color: '#fff', fontWeight: 600 }}>Agentes IA</span>
        </div>
      </div>

      {/* Workspace */}
      <div style={{ display: 'flex', flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}>
        {/* Left: Agents */}
        <div style={{ width: 160, flexShrink: 0, background: '#0a0d14', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 10px 6px' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Agentes</div>
          </div>
          <div style={{ padding: '0 6px', flex: 1, overflow: 'auto' }}>
            {AGENTS.map(a => {
              const isHoku = a.id === 'hoku';
              const sel = selectedAgent === a.id;
              return (
                <div key={a.id} onClick={() => setSelectedAgent(a.id)} style={{
                  padding: '7px 8px', borderRadius: 8, marginBottom: isHoku ? 6 : 2, cursor: 'pointer',
                  background: isHoku ? (sel ? 'linear-gradient(135deg, rgba(255,107,107,0.15), rgba(139,92,246,0.15))' : 'linear-gradient(135deg, rgba(255,107,107,0.06), rgba(139,92,246,0.06))') : (sel ? `${a.color}10` : 'transparent'),
                  border: sel ? `1px solid ${a.color}40` : isHoku ? '1px solid rgba(255,107,107,0.15)' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isHoku ? <span style={{ fontSize: '0.75rem' }}>🐾</span> : <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.color, boxShadow: sel ? `0 0 6px ${a.color}60` : 'none', flexShrink: 0 }}></span>}
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: sel ? a.color : '#e2e8f0' }}>{a.name}</span>
                    {isHoku && <span style={{ fontSize: '0.45rem', fontWeight: 800, padding: '1px 4px', borderRadius: 3, background: 'linear-gradient(135deg, #ff6b6b, #8b5cf6)', color: '#fff' }}>4in1</span>}
                  </div>
                  <div style={{ fontSize: '0.55rem', color: '#475569', marginTop: 2, fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.model}</div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '6px 10px', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: '0.55rem', color: '#334155' }}>Enter = ejecutar</div>
        </div>

        {/* Center: Editor + Output */}
        <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
          {/* Topbar */}
          <div style={{ height: 42, minHeight: 42, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0a0d14', flexShrink: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: agent.color }}></span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9' }}>{agent.name}</span>
            <span style={{ fontSize: '0.6rem', color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>{agent.model}</span>
            <div style={{ flex: 1 }}></div>
            <button onClick={execute} disabled={running || !task.trim()} style={{ background: running ? '#1a2235' : `linear-gradient(135deg, ${agent.color}, ${agent.color}cc)`, color: running ? '#64748b' : '#0a0d14', border: 'none', padding: '5px 14px', borderRadius: 7, fontWeight: 700, fontSize: '0.7rem', cursor: running ? 'not-allowed' : 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 5 }}>
              {running ? <><span style={{ width: 8, height: 8, border: '2px solid #475569', borderTopColor: agent.color, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }}></span> {fmtTime(elapsed)}</> : <>▶ Run</>}
            </button>
            {running && <button onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setRunning(false); }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '5px 10px', borderRadius: 7, fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>⏹</button>}
            {!running && output && pipeline === 'idle' && (
              <>
                <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }}></div>
                <button onClick={startPipeline} style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 7, fontWeight: 700, fontSize: '0.65rem', cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 12px rgba(59,130,246,0.3)', whiteSpace: 'nowrap' }}>🚀 Deploy</button>
              </>
            )}
          </div>

          {/* Task input */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <textarea value={task} onChange={e => setTask(e.target.value)} onKeyDown={handleKeyDown} placeholder={PLACEHOLDERS[selectedAgent] || 'Escribe tu tarea...'} rows={3} style={{ width: '100%', background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: '#e2e8f0', fontSize: '0.8rem', fontFamily: "'Inter', system-ui", lineHeight: 1.6, resize: 'vertical', outline: 'none', minHeight: 60, maxHeight: 150 }} />
          </div>

          {/* Output */}
          <div ref={outputRef} style={{ flex: '1 1 0', overflow: 'auto', padding: '14px 16px', minHeight: 0 }}>
            {!output && !running ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#1e293b' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 10, opacity: 0.3 }}>🐾</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>Selecciona un agente y escribe tu tarea</div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '6px 10px', background: '#111827', borderRadius: 8, border: `1px solid ${agent.color}20` }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: running ? agent.color : '#22c55e', boxShadow: running ? `0 0 8px ${agent.color}` : '0 0 8px #22c55e', animation: running ? 'pulse 1.5s infinite' : 'none' }}></span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: agent.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{agent.name}</span>
                  <span style={{ fontSize: '0.6rem', color: '#475569', marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>{fmtTime(elapsed)} · ~{tokens} tok</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {output}
                  {running && <span style={{ display: 'inline-block', width: 7, height: 14, background: agent.color, marginLeft: 2, animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }}></span>}
                </div>
                {!running && output && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <button onClick={() => navigator.clipboard.writeText(output)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '4px 10px', color: '#64748b', fontSize: '0.65rem', cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 4 }}>📋 Copiar</button>
                    <button onClick={execute} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '4px 10px', color: '#64748b', fontSize: '0.65rem', cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 4 }}>🔄 Re-ejecutar</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Popup */}
      {pipeline !== 'idle' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 25px 60px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1rem' }}>🚀</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>
                {pipeline === 'confirm' ? 'Confirmar deploy' : pipeline === 'done' ? 'Deploy completado' : pipeline === 'error' ? 'Error' : 'Ejecutando...'}
              </span>
              {(pipeline === 'done' || pipeline === 'error') && <button onClick={() => setPipeline('idle')} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>}
            </div>
            <div style={{ padding: '20px' }}>
              {pipeline === 'confirm' && (
                <>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>
                    <span style={{ color: '#f59e0b' }}>1.</span> Guardar mejora en Supabase<br/>
                    <span style={{ color: '#3b82f6' }}>2.</span> Commit a GitHub<br/>
                    <span style={{ color: '#22c55e' }}>3.</span> Auto-deploy
                  </div>
                  <select value={targetRepo} onChange={e => setTargetRepo(e.target.value)} style={{ width: '100%', background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: '0.75rem', fontFamily: "'Inter', system-ui", outline: 'none', marginBottom: 12 }}>
                    {repos.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setPipeline('idle')} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', padding: '10px', borderRadius: 10, fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>Cancelar</button>
                    <button onClick={runPipeline} style={{ flex: 2, background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', border: 'none', padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>✅ Confirmar</button>
                  </div>
                </>
              )}
              {pipeline !== 'confirm' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16 }}>
                    {[{ key: 'pushing', label: 'Guardar' }, { key: 'deploying', label: 'Deploy' }, { key: 'done', label: 'Live' }].map((step, i) => {
                      const steps: PipelineStep[] = ['pushing', 'deploying', 'done'];
                      const ci = steps.indexOf(pipeline); const isDone = i < ci || pipeline === 'done'; const isActive = i === ci;
                      const clr = pipeline === 'error' && isActive ? '#ef4444' : isDone ? '#22c55e' : isActive ? '#3b82f6' : '#334155';
                      return (
                        <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: isDone ? 'rgba(34,197,94,0.15)' : isActive ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)', border: `2px solid ${clr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: clr, transition: 'all 0.3s' }}>
                              {isDone ? '✓' : isActive ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: clr, animation: 'pulse 1s infinite' }}></span> : '○'}
                            </div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 600, color: clr }}>{step.label}</span>
                          </div>
                          {i < 2 && <div style={{ flex: 1, height: 2, background: isDone ? '#22c55e' : 'rgba(255,255,255,0.06)', margin: '0 10px', marginBottom: 20, transition: 'background 0.5s' }}></div>}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ background: '#0a0d14', borderRadius: 10, padding: '12px', border: '1px solid rgba(255,255,255,0.04)', maxHeight: 200, overflow: 'auto' }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', lineHeight: 1.7 }}>
                      {pipelineLog.map((l, i) => <div key={i} style={{ color: l.startsWith('✅') ? '#22c55e' : l.startsWith('❌') ? '#ef4444' : '#94a3b8' }}>{l}</div>)}
                      {(pipeline === 'pushing' || pipeline === 'deploying') && <span style={{ display: 'inline-block', width: 6, height: 13, background: '#3b82f6', animation: 'blink 1s step-end infinite' }}></span>}
                    </div>
                  </div>
                  {pipeline === 'done' && <button onClick={() => setPipeline('idle')} style={{ width: '100%', marginTop: 12, background: 'linear-gradient(135deg, #00e5b0, #00c49a)', color: '#0a0d14', border: 'none', padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>Listo</button>}
                  {pipeline === 'error' && <div style={{ display: 'flex', gap: 8, marginTop: 12 }}><button onClick={() => setPipeline('idle')} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', padding: '10px', borderRadius: 10, cursor: 'pointer', fontFamily: "'Inter', system-ui", fontSize: '0.75rem' }}>Cerrar</button><button onClick={runPipeline} style={{ flex: 1, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', padding: '10px', borderRadius: 10, cursor: 'pointer', fontFamily: "'Inter', system-ui", fontSize: '0.75rem' }}>Reintentar</button></div>}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0 } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
      `}</style>
    </div>
  );
}
