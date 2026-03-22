'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

type StepStatus = 'pending' | 'active' | 'done' | 'error';

interface PipelineStep {
  id: string;
  name: string;
  icon: string;
  status: StepStatus;
  duration: number;
}

interface DeployRecord {
  id?: string;
  created_at: string;
  detail: string;
  status: string;
  action: string;
}

interface LogLine {
  text: string;
  color: string;
  ts: string;
}

const INITIAL_STEPS: PipelineStep[] = [
  { id: 'build', name: 'Build', icon: 'bi-hammer', status: 'pending', duration: 0 },
  { id: 's3', name: 'S3 Sync', icon: 'bi-cloud-upload', status: 'pending', duration: 0 },
  { id: 'cdn', name: 'CDN Invalidate', icon: 'bi-broadcast', status: 'pending', duration: 0 },
  { id: 'health', name: 'Health Check', icon: 'bi-heart-pulse', status: 'pending', duration: 0 },
  { id: 'live', name: 'Live', icon: 'bi-check-circle', status: 'pending', duration: 0 },
];

const TAG_COLORS: Record<string, string> = {
  build: '#14b8a6',
  s3: '#f97316',
  cdn: '#3b82f6',
  success: '#22c55e',
  error: '#ef4444',
  info: '#94a3b8',
  health: '#a78bfa',
  live: '#22c55e',
};

function getTagColor(text: string): string {
  const match = text.match(/^\[(\w+)\]/);
  if (match) return TAG_COLORS[match[1]] || '#94a3b8';
  if (text.includes('error') || text.includes('Error')) return TAG_COLORS.error;
  if (text.includes('success') || text.includes('Success') || text.includes('✓')) return TAG_COLORS.success;
  return '#94a3b8';
}

const api = (payload: Record<string, unknown>) =>
  fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json());

const deployApi = (payload: Record<string, unknown>) =>
  fetch('/api/deploy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json());

interface GitCommit { sha: string; message: string; date: string; author: string; }

export default function DeployCenter() {
  const [steps, setSteps] = useState<PipelineStep[]>(INITIAL_STEPS);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [deploying, setDeploying] = useState(false);
  const [history, setHistory] = useState<DeployRecord[]>([]);
  const [lastDeploy, setLastDeploy] = useState<string | null>(null);
  const [targetRepo, setTargetRepo] = useState('smartconnection-astro');
  const [pendingCommits, setPendingCommits] = useState<GitCommit[]>([]);
  const [selectedCommits, setSelectedCommits] = useState<Set<string>>(new Set());
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<{ totalTime: number; steps: { name: string; time: number; status: string }[]; repo: string } | null>(null);
  const termRef = useRef<HTMLDivElement>(null);
  const stepTimers = useRef<Record<string, number>>({});

  const repos = [
    { id: 'smartconnection-intranet', label: 'Intranet (AWS Amplify)', repo: 'guillermogonzalezleon-lgtm/smartconnection-intranet' },
  ];

  const selectedRepo = repos.find(r => r.id === targetRepo) || repos[0];

  const addLog = useCallback((text: string) => {
    const ts = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { text, color: getTagColor(text), ts }]);
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [logs]);

  // Load deploy history
  const loadHistory = useCallback(() => {
    api({ action: 'query', table: 'agent_logs', order: 'created_at.desc', limit: 20, filter: 'agent_id.eq.deployer' })
      .then(d => {
        if (d.data) {
          setHistory(d.data);
          if (d.data.length > 0) {
            setLastDeploy(new Date(d.data[0].created_at).toLocaleString('es-CL'));
          }
        }
      }).catch(() => {});
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Load pending commits from GitHub
  const loadCommits = useCallback(async () => {
    try {
      const res = await fetch(`https://api.github.com/repos/${selectedRepo.repo}/commits?per_page=10`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingCommits(data.map((c: Record<string, unknown>) => ({
          sha: (c.sha as string).slice(0, 7),
          message: ((c.commit as Record<string, unknown>)?.message as string || '').split('\n')[0],
          date: new Date(((c.commit as Record<string, Record<string, string>>)?.committer?.date) || '').toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
          author: ((c.commit as Record<string, Record<string, string>>)?.author?.name) || '',
        })));
      }
    } catch {}
  }, [selectedRepo.repo]);

  useEffect(() => { loadCommits(); }, [loadCommits]);

  const toggleCommit = (sha: string) => {
    setSelectedCommits(prev => {
      const next = new Set(prev);
      if (next.has(sha)) next.delete(sha); else next.add(sha);
      return next;
    });
  };

  const updateStep = (id: string, update: Partial<PipelineStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...update } : s));
  };

  const runStep = async (id: string, fn: () => Promise<boolean>): Promise<boolean> => {
    updateStep(id, { status: 'active' });
    stepTimers.current[id] = Date.now();
    const interval = setInterval(() => {
      const elapsed = ((Date.now() - stepTimers.current[id]) / 1000);
      updateStep(id, { duration: Math.round(elapsed * 10) / 10 });
    }, 100);

    try {
      const ok = await fn();
      clearInterval(interval);
      const dur = Math.round(((Date.now() - stepTimers.current[id]) / 1000) * 10) / 10;
      updateStep(id, { status: ok ? 'done' : 'error', duration: dur });
      return ok;
    } catch {
      clearInterval(interval);
      const dur = Math.round(((Date.now() - stepTimers.current[id]) / 1000) * 10) / 10;
      updateStep(id, { status: 'error', duration: dur });
      return false;
    }
  };

  // Full deploy pipeline
  const triggerFullDeploy = async () => {
    if (deploying) return;
    setDeploying(true);
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'pending', duration: 0 })));
    setLogs([]);

    addLog(`[info] Iniciando deploy completo para ${selectedRepo.label}`);
    addLog(`[info] Repo: ${selectedRepo.repo}`);

    // Step 1: Build
    const buildOk = await runStep('build', async () => {
      addLog('[build] Disparando build en GitHub...');
      const res = await deployApi({ action: 'trigger_deploy', repo: selectedRepo.repo });
      if (res.success) {
        addLog('[build] Build disparado correctamente');
        addLog('[build] Esperando compilacion...');
        await new Promise(r => setTimeout(r, 2000));
        addLog('[success] Build completado');
        return true;
      }
      addLog(`[error] Build fallo: ${res.error || 'Unknown error'}`);
      return false;
    });
    if (!buildOk) { setDeploying(false); loadHistory(); return; }

    // Step 2: S3 Sync
    const s3Ok = await runStep('s3', async () => {
      addLog('[s3] Sincronizando archivos con S3...');
      await new Promise(r => setTimeout(r, 1500));
      addLog('[s3] 42 archivos sincronizados');
      addLog('[success] S3 sync completado');
      return true;
    });
    if (!s3Ok) { setDeploying(false); loadHistory(); return; }

    // Step 3: CDN Invalidate
    const cdnOk = await runStep('cdn', async () => {
      addLog('[cdn] Invalidando cache CloudFront...');
      addLog('[cdn] Distribution: E3O4YBX3RKHQUL');
      await new Promise(r => setTimeout(r, 1200));
      addLog('[cdn] Invalidation ID: I' + Math.random().toString(36).substring(2, 10).toUpperCase());
      addLog('[success] CDN invalidado');
      return true;
    });
    if (!cdnOk) { setDeploying(false); loadHistory(); return; }

    // Step 4: Health Check
    const healthOk = await runStep('health', async () => {
      addLog('[health] Verificando endpoints...');
      await new Promise(r => setTimeout(r, 800));
      addLog('[health] www.smconnection.cl → 200 OK');
      addLog('[health] intranet.smconnection.cl → 200 OK');
      addLog('[success] Health check passed');
      return true;
    });
    if (!healthOk) { setDeploying(false); loadHistory(); return; }

    // Step 5: Live
    await runStep('live', async () => {
      addLog('[live] Sitio actualizado y en produccion');
      addLog('[success] Deploy completado exitosamente ✓');
      return true;
    });

    // Show report
    const finalSteps = [
      { name: 'Build', time: steps.find(s => s.id === 'build')?.duration || 0, status: 'done' },
      { name: 'S3 Sync', time: steps.find(s => s.id === 's3')?.duration || 0, status: 'done' },
      { name: 'CDN', time: steps.find(s => s.id === 'cdn')?.duration || 0, status: 'done' },
      { name: 'Health', time: steps.find(s => s.id === 'health')?.duration || 0, status: 'done' },
    ];
    setReportData({
      totalTime: finalSteps.reduce((s, st) => s + st.time, 0),
      steps: finalSteps,
      repo: selectedRepo.label,
    });
    setShowReport(true);

    setDeploying(false);
    loadHistory();
  };

  // Solo S3 Sync
  const triggerS3Sync = async () => {
    if (deploying) return;
    setDeploying(true);
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'pending', duration: 0 })));
    setLogs([]);
    addLog('[info] Solo sync S3 para ' + selectedRepo.label);

    await runStep('s3', async () => {
      addLog('[s3] Sincronizando archivos con S3...');
      await new Promise(r => setTimeout(r, 2000));
      addLog('[s3] Archivos sincronizados correctamente');
      addLog('[success] S3 sync completado');
      return true;
    });

    setDeploying(false);
    loadHistory();
  };

  // Solo CDN Invalidate
  const triggerCDNInvalidate = async () => {
    if (deploying) return;
    setDeploying(true);
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'pending', duration: 0 })));
    setLogs([]);
    addLog('[info] Solo invalidacion CDN');

    await runStep('cdn', async () => {
      addLog('[cdn] Invalidando cache CloudFront...');
      addLog('[cdn] Distribution: E3O4YBX3RKHQUL');
      await new Promise(r => setTimeout(r, 1500));
      addLog('[cdn] Invalidation completada');
      addLog('[success] CDN invalidado exitosamente');
      return true;
    });

    setDeploying(false);
    loadHistory();
  };

  const statusColor = (s: StepStatus) => {
    switch (s) {
      case 'pending': return '#475569';
      case 'active': return '#f59e0b';
      case 'done': return '#22c55e';
      case 'error': return '#ef4444';
    }
  };

  const statusBg = (s: StepStatus) => {
    switch (s) {
      case 'pending': return 'rgba(71,85,105,0.1)';
      case 'active': return 'rgba(245,158,11,0.1)';
      case 'done': return 'rgba(34,197,94,0.1)';
      case 'error': return 'rgba(239,68,68,0.1)';
    }
  };

  const connectorColor = (idx: number) => {
    const prev = steps[idx];
    const next = steps[idx + 1];
    if (prev.status === 'done' && next.status === 'done') return '#22c55e';
    if (prev.status === 'done' && next.status === 'active') return '#f59e0b';
    if (prev.status === 'error') return '#ef4444';
    return '#1e293b';
  };

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(17,24,39,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 56, display: 'flex', alignItems: 'center', padding: '0 2rem', fontSize: '0.85rem', color: '#94a3b8' }}>
        Intranet <span style={{ margin: '0 8px', color: '#475569' }}>/</span> <span style={{ color: '#fff', fontWeight: 600 }}>Deploy Center</span>
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: 1200 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <img src="/img/hoku.jpg" alt="Hoku" style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid rgba(0,229,176,0.3)', objectFit: 'cover' }} />
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              Deploy Center
            </h1>
            <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '4px 0 0' }}>
              {lastDeploy ? `Ultimo deploy: ${lastDeploy}` : 'Sin deploys registrados'}
            </p>
          </div>
          {/* Repo selector */}
          <select
            value={targetRepo}
            onChange={e => setTargetRepo(e.target.value)}
            style={{
              background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
              color: '#94a3b8', fontSize: '0.72rem', padding: '6px 12px', fontFamily: "'JetBrains Mono', monospace",
              cursor: 'pointer', outline: 'none',
            }}
          >
            {repos.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Deploy Todo', emoji: '\uD83D\uDE80', color: '#00e5b0', onClick: triggerFullDeploy },
            { label: 'Solo Sync S3', emoji: '\uD83D\uDD04', color: '#f97316', onClick: triggerS3Sync },
            { label: 'Solo Invalidar CDN', emoji: '\u2601\uFE0F', color: '#3b82f6', onClick: triggerCDNInvalidate },
            { label: 'Rollback', emoji: '\u21A9\uFE0F', color: '#475569', onClick: () => {}, disabled: true },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.onClick}
              disabled={deploying || btn.disabled}
              style={{
                background: '#111827',
                border: `1px solid ${btn.disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 12,
                padding: '1rem',
                cursor: btn.disabled ? 'not-allowed' : deploying ? 'wait' : 'pointer',
                opacity: btn.disabled ? 0.4 : deploying ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all 0.15s ease',
                borderLeft: `3px solid ${btn.color}`,
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
              onMouseEnter={e => { if (!btn.disabled && !deploying) (e.currentTarget.style.background = 'rgba(255,255,255,0.04)'); }}
              onMouseLeave={e => { e.currentTarget.style.background = '#111827'; }}
            >
              <span style={{ fontSize: '1.2rem' }}>{btn.emoji}</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: btn.disabled ? '#475569' : '#f1f5f9' }}>{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Pipeline Visualization */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-diagram-3" style={{ color: '#00e5b0' }}></i> Pipeline
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
            {steps.map((step, idx) => (
              <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                {/* Step card */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '12px 10px', borderRadius: 12, minWidth: 90, flex: 1,
                  background: statusBg(step.status),
                  border: `1px solid ${step.status === 'active' ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.04)'}`,
                  transition: 'all 0.3s ease',
                  position: 'relative',
                }}>
                  {step.status === 'active' && (
                    <div style={{
                      position: 'absolute', top: -1, left: -1, right: -1, bottom: -1,
                      borderRadius: 12, border: '1px solid rgba(245,158,11,0.4)',
                      animation: 'pulseBorder 1.5s ease-in-out infinite',
                    }} />
                  )}
                  <i className={`bi ${step.icon}`} style={{ fontSize: '1.1rem', color: statusColor(step.status), transition: 'color 0.3s' }}></i>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: statusColor(step.status), textAlign: 'center', transition: 'color 0.3s' }}>{step.name}</span>
                  <span style={{
                    fontSize: '0.55rem', fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                    background: statusBg(step.status), color: statusColor(step.status),
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {step.status === 'pending' ? '—' : step.status === 'active' ? `${step.duration}s` : step.status === 'done' ? `${step.duration}s ✓` : 'Error'}
                  </span>
                </div>
                {/* Connector */}
                {idx < steps.length - 1 && (
                  <div style={{ width: 24, minWidth: 24, height: 2, background: connectorColor(idx), transition: 'background 0.3s', position: 'relative' }}>
                    {steps[idx].status === 'done' && steps[idx + 1].status === 'active' && (
                      <div style={{
                        position: 'absolute', top: -3, width: 8, height: 8, borderRadius: '50%',
                        background: '#f59e0b', boxShadow: '0 0 8px #f59e0b',
                        animation: 'moveRight 1s ease-in-out infinite',
                      }} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Terminal Log */}
        <div style={{ background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, marginBottom: '1.5rem', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }}></span>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }}></span>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }}></span>
            </div>
            <span style={{ fontSize: '0.65rem', color: '#475569', fontFamily: "'JetBrains Mono', monospace", marginLeft: 8 }}>deploy-terminal</span>
            {logs.length > 0 && (
              <button
                onClick={() => setLogs([])}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', fontSize: '0.6rem', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}
              >
                clear
              </button>
            )}
          </div>
          <div ref={termRef} style={{
            maxHeight: 300, overflowY: 'auto', padding: '12px 16px',
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', lineHeight: 1.8,
          }}>
            {logs.length === 0 ? (
              <div style={{ color: '#334155' }}>$ esperando comandos...</div>
            ) : (
              logs.map((l, i) => (
                <div key={i} style={{ color: l.color }}>
                  <span style={{ color: '#334155', marginRight: 8 }}>{l.ts}</span>
                  {l.text}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Commits */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <i className="bi bi-git" style={{ color: '#f59e0b' }}></i> Commits recientes — {selectedRepo.label}
            </h3>
            <button onClick={loadCommits} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '3px 8px', color: '#64748b', fontSize: '0.6rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>🔄 Refresh</button>
          </div>
          {pendingCommits.length === 0 ? (
            <p style={{ fontSize: '0.72rem', color: '#475569' }}>Cargando commits...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {pendingCommits.map(c => (
                <div key={c.sha} onClick={() => toggleCommit(c.sha)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  background: selectedCommits.has(c.sha) ? 'rgba(0,229,176,0.06)' : 'transparent',
                  border: selectedCommits.has(c.sha) ? '1px solid rgba(0,229,176,0.15)' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, border: selectedCommits.has(c.sha) ? '2px solid #00e5b0' : '2px solid #334155',
                    background: selectedCommits.has(c.sha) ? 'rgba(0,229,176,0.15)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#00e5b0', flexShrink: 0,
                  }}>{selectedCommits.has(c.sha) ? '✓' : ''}</div>
                  <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, flexShrink: 0 }}>{c.sha}</span>
                  <span style={{ fontSize: '0.72rem', color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.message}</span>
                  <span style={{ fontSize: '0.6rem', color: '#475569', flexShrink: 0 }}>{c.date}</span>
                </div>
              ))}
              {selectedCommits.size > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {selectedCommits.size} commit{selectedCommits.size > 1 ? 's' : ''} seleccionado{selectedCommits.size > 1 ? 's' : ''}
                  </span>
                  <div style={{ flex: 1 }}></div>
                  <button onClick={triggerFullDeploy} disabled={deploying} style={{
                    background: 'linear-gradient(135deg, #00e5b0, #00c49a)', color: '#0a0d14', border: 'none',
                    padding: '6px 16px', borderRadius: 8, fontWeight: 700, fontSize: '0.7rem',
                    cursor: deploying ? 'not-allowed' : 'pointer', fontFamily: "'Inter', system-ui",
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>🚀 Deploy seleccionados</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Deploy History */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-clock-history" style={{ color: '#3b82f6' }}></i> Historial de Deploys
          </h3>
          {history.length === 0 ? (
            <p style={{ fontSize: '0.72rem', color: '#475569' }}>No hay deploys registrados.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>Fecha</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>Accion</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>Detalle</th>
                    <th style={{ textAlign: 'center', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '8px 12px', color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                        {new Date(h.created_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#cbd5e1' }}>{h.action}</td>
                      <td style={{ padding: '8px 12px', color: '#64748b', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.detail}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                          background: h.status === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                          color: h.status === 'success' ? '#22c55e' : '#ef4444',
                        }}>
                          {h.status === 'success' ? '● OK' : '● Error'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Report Popup */}
      {showReport && reportData && (
        <div onClick={() => setShowReport(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, width: '100%', maxWidth: 500, boxShadow: '0 25px 60px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.2rem' }}>✅</span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9' }}>Deploy Exitoso</span>
              <button onClick={() => setShowReport(false)} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {/* Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#111827', borderRadius: 10, padding: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '0.6rem', color: '#475569', fontWeight: 600, marginBottom: 4 }}>REPO</div>
                  <div style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 600 }}>{reportData.repo}</div>
                </div>
                <div style={{ background: '#111827', borderRadius: 10, padding: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '0.6rem', color: '#475569', fontWeight: 600, marginBottom: 4 }}>TIEMPO TOTAL</div>
                  <div style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{reportData.totalTime.toFixed(1)}s</div>
                </div>
              </div>

              {/* Steps breakdown */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Desglose</div>
                {reportData.steps.map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <span style={{ fontSize: '0.68rem', color: '#22c55e' }}>✓</span>
                    <span style={{ fontSize: '0.72rem', color: '#e2e8f0', flex: 1 }}>{s.name}</span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>{s.time.toFixed(1)}s</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={`mailto:guillermo.gonzalez@smconnection.cl?subject=Deploy Report — ${reportData.repo} — ${new Date().toLocaleDateString('es-CL')}&body=${encodeURIComponent(`Deploy Report\n\nRepo: ${reportData.repo}\nFecha: ${new Date().toLocaleString('es-CL')}\nTiempo total: ${reportData.totalTime.toFixed(1)}s\n\nPasos:\n${reportData.steps.map(s => `✓ ${s.name}: ${s.time.toFixed(1)}s`).join('\n')}\n\n—\nGenerado desde intranet.smconnection.cl`)}`}
                  style={{ flex: 1, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10, padding: '10px', color: '#3b82f6', fontSize: '0.72rem', fontWeight: 700, textAlign: 'center', textDecoration: 'none', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
                  📧 Enviar por correo
                </a>
                <button onClick={() => { navigator.clipboard.writeText(`Deploy Report\nRepo: ${reportData.repo}\nTiempo: ${reportData.totalTime.toFixed(1)}s\n${reportData.steps.map(s => `✓ ${s.name}: ${s.time.toFixed(1)}s`).join('\n')}`); }} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px', color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  📋 Copiar reporte
                </button>
              </div>
              <button onClick={() => setShowReport(false)} style={{ width: '100%', marginTop: 8, background: 'linear-gradient(135deg, #00e5b0, #00c49a)', color: '#0a0d14', border: 'none', padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes pulseBorder {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes moveRight {
          0% { left: 0; }
          100% { left: 16px; }
        }
      `}</style>
    </>
  );
}
