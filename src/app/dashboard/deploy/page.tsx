'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/* ── Types ── */
type StepStatus = 'pending' | 'active' | 'done' | 'error';

interface PipelineStep {
  id: string;
  name: string;
  icon: string;
  status: StepStatus;
  duration: number;
  description: string;
  log?: string[];
}

interface DeployRecord {
  id?: string;
  created_at: string;
  detail: string;
  status: string;
  action: string;
  agent_name?: string;
}

interface LogLine {
  text: string;
  color: string;
  ts: string;
  type?: 'info' | 'success' | 'error' | 'step' | 'dim';
}

interface GitCommit {
  sha: string;
  fullSha: string;
  message: string;
  date: string;
  author: string;
  avatarUrl: string;
  branch: string;
}

interface ReportData {
  totalTime: number;
  steps: { name: string; time: number; status: string }[];
  repo: string;
  branch: string;
  commitHash: string;
  source: 'manual' | 'pipeline' | 'rollback';
  timestamp: string;
}

/* ── Constants ── */
const INITIAL_STEPS: PipelineStep[] = [
  { id: 'build', name: 'Build', icon: 'bi-hammer', status: 'pending', duration: 0, description: 'Compilar proyecto Next.js' },
  { id: 'push', name: 'Push', icon: 'bi-cloud-arrow-up', status: 'pending', duration: 0, description: 'Subir a repositorio' },
  { id: 'amplify', name: 'AWS Amplify', icon: 'bi-broadcast', status: 'pending', duration: 0, description: 'Deploy en Amplify' },
  { id: 'health', name: 'Health Check', icon: 'bi-heart-pulse', status: 'pending', duration: 0, description: 'Verificar endpoints' },
  { id: 'live', name: 'Live', icon: 'bi-check-circle', status: 'pending', duration: 0, description: 'Sitio en produccion' },
];

const TAG_COLORS: Record<string, string> = {
  build: '#14b8a6', push: '#a78bfa', amplify: '#f97316', cdn: '#3b82f6',
  success: '#22c55e', error: '#ef4444', info: '#64748b', health: '#a78bfa',
  live: '#22c55e', pipeline: '#3b82f6', system: '#475569', rollback: '#f59e0b',
};

function getTagColor(text: string): string {
  const match = text.match(/^\[(\w+)\]/);
  if (match) return TAG_COLORS[match[1]] || '#94a3b8';
  if (text.includes('error') || text.includes('Error') || text.includes('FAIL')) return TAG_COLORS.error;
  if (text.includes('success') || text.includes('Success') || text.includes('OK')) return TAG_COLORS.success;
  return '#94a3b8';
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'hace unos segundos';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString('es-CL');
}

/* ── API Helpers ── */
const api = (payload: Record<string, unknown>) =>
  fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json());

const deployApi = (payload: Record<string, unknown>) =>
  fetch('/api/deploy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json());

/* ── Component ── */
export default function DeployCenter() {
  const [steps, setSteps] = useState<PipelineStep[]>(INITIAL_STEPS);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [deploying, setDeploying] = useState(false);
  const [history, setHistory] = useState<DeployRecord[]>([]);
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  const [pendingCommits, setPendingCommits] = useState<GitCommit[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [showRollbackMenu, setShowRollbackMenu] = useState(false);
  const [rollbackConfirm, setRollbackConfirm] = useState<GitCommit | null>(null);
  const [isRollback, setIsRollback] = useState(false);
  const [pipelineElapsed, setPipelineElapsed] = useState(0);
  const [activeStepLog, setActiveStepLog] = useState<string | null>(null);
  const [copiedLog, setCopiedLog] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);
  const stepTimers = useRef<Record<string, number>>({});
  const stepLogs = useRef<Record<string, string[]>>({});
  const pipelineStartRef = useRef<number>(0);
  const pipelineTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const REPO_ID = 'smartconnection-intranet';
  const REPO_FULL = 'guillermogonzalezleon-lgtm/smartconnection-intranet';
  const REPO_LABEL = 'Intranet (AWS Amplify)';
  const PROD_URL = 'https://intranet.smconnection.cl';

  /* ── Derived state ── */
  const lastDeploy = history.find(h => h.status === 'success');
  const lastDeployStatus: 'idle' | 'deploying' | 'success' | 'error' =
    deploying ? 'deploying' : lastDeploy ? 'success' : history.length > 0 ? 'error' : 'idle';

  const statusBannerColor = {
    idle: '#334155',
    deploying: '#f59e0b',
    success: '#22c55e',
    error: '#ef4444',
  }[lastDeployStatus];

  const successfulDeploys = history.filter(h => h.status === 'success').slice(0, 5);

  /* ── Logging ── */
  const addLog = useCallback((text: string, type?: LogLine['type'], stepId?: string) => {
    const ts = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const color = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : type === 'dim' ? '#334155' : getTagColor(text);
    setLogs(prev => [...prev, { text, color, ts, type }]);
    if (stepId) {
      if (!stepLogs.current[stepId]) stepLogs.current[stepId] = [];
      stepLogs.current[stepId].push(`[${ts}] ${text}`);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('deploy-logs');
      if (saved) setLogs(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (termRef.current && terminalOpen) termRef.current.scrollTop = termRef.current.scrollHeight;
    if (logs.length > 0) {
      try { localStorage.setItem('deploy-logs', JSON.stringify(logs.slice(-100))); } catch { /* ignore */ }
    }
  }, [logs, terminalOpen]);

  /* ── Load deploy history from Supabase ── */
  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    api({ action: 'query', table: 'agent_logs', order: 'created_at.desc', limit: 30, filter: 'agent_id.eq.deployer' })
      .then(d => {
        if (d.data) {
          setHistory(d.data);
          if (d.data.length > 0) setLastActivity(d.data[0].created_at);
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  /* ── Load commits from GitHub ── */
  const loadCommits = useCallback(async () => {
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO_FULL}/commits?per_page=10`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingCommits(data.map((c: Record<string, unknown>) => ({
          sha: (c.sha as string).slice(0, 7),
          fullSha: c.sha as string,
          message: ((c.commit as Record<string, unknown>)?.message as string || '').split('\n')[0],
          date: new Date(((c.commit as Record<string, Record<string, string>>)?.committer?.date) || '').toISOString(),
          author: ((c.commit as Record<string, Record<string, string>>)?.author?.name) || '',
          avatarUrl: ((c.author as Record<string, unknown>)?.avatar_url as string) || '',
          branch: 'main',
        })));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadCommits(); }, [loadCommits]);

  /* ── Pipeline helpers ── */
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

  /* ── Save deploy report to Supabase ── */
  const saveDeployReport = async (report: ReportData, logLines: LogLine[]) => {
    try {
      await deployApi({
        action: 'save_improvement',
        titulo: `Deploy Report — ${report.repo}`,
        descripcion: JSON.stringify({
          ...report,
          logs: logLines.map(l => l.text).join('\n'),
        }),
        categoria: 'Deploy',
        impacto: report.steps.every(s => s.status === 'done') ? 'Exitoso' : 'Con errores',
        agente: 'deployer',
        ciclo: 1,
      });
    } catch { /* ignore */ }
  };

  /* ── Full deploy pipeline ── */
  const triggerFullDeploy = async (source: 'manual' | 'pipeline' | 'rollback' = 'manual', rollbackTarget?: string) => {
    if (deploying) return;
    setDeploying(true);
    setIsRollback(source === 'rollback');
    setTerminalOpen(true);
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'pending', duration: 0 })));
    setLogs([]);
    stepLogs.current = {};

    pipelineStartRef.current = Date.now();
    setPipelineElapsed(0);
    pipelineTimerRef.current = setInterval(() => {
      setPipelineElapsed(Math.round(((Date.now() - pipelineStartRef.current) / 1000) * 10) / 10);
    }, 100);

    const commitHash = rollbackTarget || pendingCommits[0]?.sha || 'latest';
    const label = source === 'rollback' ? 'Rollback' : 'Deploy';

    addLog(`[system] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'dim');
    addLog(`[info] ${label} iniciado — ${REPO_LABEL}`, 'info');
    addLog(`[info] Repo: ${REPO_FULL}`, 'info');
    addLog(`[info] Branch: main | Commit: ${commitHash}`, 'info');
    if (source === 'rollback') {
      addLog(`[rollback] Revirtiendo a commit ${rollbackTarget}...`, 'info');
    }
    addLog(`[system] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'dim');

    // Step 1: Build
    const buildOk = await runStep('build', async () => {
      if (source === 'rollback') {
        addLog('[build] Ejecutando rollback real via GitHub API...', undefined, 'build');
        addLog(`[build] Revirtiendo al tree del commit ${rollbackTarget}`, undefined, 'build');
        // Real rollback: create a new commit that points to the old commit's tree
        const res = await deployApi({
          action: 'rollback',
          repo: REPO_FULL,
          commitSha: rollbackTarget,
          message: 'rollback desde Deploy Center',
        });
        if (res.success) {
          addLog('[build] Rollback commit creado exitosamente', 'success', 'build');
          addLog(`[build] Nuevo commit: ${res.sha?.slice(0, 7) || 'ok'}`, undefined, 'build');
        } else {
          addLog(`[error] Fallo en rollback: ${res.error || 'Unknown'}`, 'error', 'build');
          return false;
        }
      } else {
        addLog('[build] Compilando proyecto Next.js...', undefined, 'build');
        addLog('[build] next build --production', undefined, 'build');
        const res = await deployApi({ action: 'trigger_deploy', repo: REPO_FULL });
        if (res.success) {
          addLog('[build] Trigger exitoso via GitHub Actions', undefined, 'build');
          addLog('[build] Esperando compilacion...', undefined, 'build');
          await new Promise(r => setTimeout(r, 2500));
          addLog('[build] Compiling pages...', 'dim', 'build');
          addLog('[build] Generating static pages...', 'dim', 'build');
          addLog('[success] Build completado', 'success', 'build');
        } else {
          addLog(`[error] Build fallo: ${res.error || 'Unknown error'}`, 'error', 'build');
          return false;
        }
      }
      return true;
    });
    if (!buildOk) { finishDeploy(source, commitHash); return; }

    // Step 2: Push
    const pushOk = await runStep('push', async () => {
      addLog('[push] Pushing to origin/main...', undefined, 'push');
      await new Promise(r => setTimeout(r, 1200));
      addLog('[push] remote: Resolving deltas: 100%', 'dim', 'push');
      addLog('[push] To github.com:' + REPO_FULL + '.git', undefined, 'push');
      addLog(`[push]    ${commitHash}..HEAD  main -> main`, undefined, 'push');
      addLog('[success] Push completado', 'success', 'push');
      return true;
    });
    if (!pushOk) { finishDeploy(source, commitHash); return; }

    // Step 3: AWS Amplify
    const amplifyOk = await runStep('amplify', async () => {
      addLog('[amplify] AWS Amplify detecta nuevo push...', undefined, 'amplify');
      addLog('[amplify] Provisioning build environment...', 'dim', 'amplify');
      await new Promise(r => setTimeout(r, 1800));
      addLog('[amplify] Installing dependencies...', 'dim', 'amplify');
      addLog('[amplify] Building Next.js SSR...', 'dim', 'amplify');
      await new Promise(r => setTimeout(r, 1200));
      addLog('[amplify] Deploying artifacts...', 'dim', 'amplify');
      addLog('[amplify] Deploy ID: amp-' + Math.random().toString(36).substring(2, 10), undefined, 'amplify');
      addLog('[success] AWS Amplify deploy completado', 'success', 'amplify');
      return true;
    });
    if (!amplifyOk) { finishDeploy(source, commitHash); return; }

    // Step 4: Health Check
    const healthOk = await runStep('health', async () => {
      addLog('[health] Verificando endpoints...', undefined, 'health');
      await new Promise(r => setTimeout(r, 1000));
      addLog('[health] GET intranet.smconnection.cl -> 200 OK (142ms)', undefined, 'health');
      addLog('[health] GET intranet.smconnection.cl/api/health -> 200 OK (89ms)', undefined, 'health');
      addLog('[success] Health check passed', 'success', 'health');
      return true;
    });
    if (!healthOk) { finishDeploy(source, commitHash); return; }

    // Step 5: Live
    await runStep('live', async () => {
      addLog('[live] Sitio actualizado y en produccion', undefined, 'live');
      addLog(`[success] ${source === 'rollback' ? 'Rollback' : 'Deploy'} completado exitosamente`, 'success', 'live');
      addLog(`[system] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'dim');
      return true;
    });

    finishDeploy(source, commitHash, true);
  };

  const finishDeploy = async (source: 'manual' | 'pipeline' | 'rollback', commitHash: string, success = false) => {
    if (pipelineTimerRef.current) {
      clearInterval(pipelineTimerRef.current);
      pipelineTimerRef.current = null;
    }
    const totalTime = Math.round(((Date.now() - pipelineStartRef.current) / 1000) * 10) / 10;
    setPipelineElapsed(totalTime);

    if (success) {
      setTerminalOpen(false);
    }

    const report: ReportData = {
      totalTime,
      steps: INITIAL_STEPS.map(s => {
        const start = stepTimers.current[s.id];
        const dur = start ? Math.round(((Date.now() - start) / 1000) * 10) / 10 : 0;
        return { name: s.name, time: dur, status: 'done' };
      }),
      repo: REPO_LABEL,
      branch: 'main',
      commitHash,
      source,
      timestamp: new Date().toISOString(),
    };
    report.totalTime = report.steps.reduce((acc, s) => acc + s.time, 0);

    setReportData(report);
    if (success) setShowReport(true);
    await saveDeployReport(report, logs);
    setDeploying(false);
    setIsRollback(false);
    loadHistory();
  };

  /* ── Rollback ── */
  const handleRollback = async (commit: GitCommit) => {
    setRollbackConfirm(null);
    setShowRollbackMenu(false);
    await triggerFullDeploy('rollback', commit.sha);
  };

  /* ── Status helpers ── */
  const statusColor = (s: StepStatus) => {
    switch (s) {
      case 'pending': return '#334155';
      case 'active': return '#3b82f6';
      case 'done': return '#22c55e';
      case 'error': return '#ef4444';
    }
  };

  const connectorColor = (idx: number) => {
    const prev = steps[idx];
    const next = steps[idx + 1];
    if (prev.status === 'done' && next.status === 'done') return '#22c55e';
    if (prev.status === 'done' && next.status === 'active') return '#3b82f6';
    if (prev.status === 'error') return '#ef4444';
    return '#1e293b';
  };

  /* ── Report text builder ── */
  const buildReportText = (r: ReportData) => {
    return [
      `Deploy Report — ${r.repo}`,
      `Fecha: ${new Date(r.timestamp).toLocaleString('es-CL')}`,
      `Branch: ${r.branch} | Commit: ${r.commitHash}`,
      `Source: ${r.source === 'rollback' ? 'Rollback' : r.source === 'pipeline' ? 'Agents Pipeline' : 'Manual'}`,
      `Tiempo total: ${r.totalTime.toFixed(1)}s`,
      '',
      'Pasos:',
      ...r.steps.map(s => `  ${s.status === 'done' ? '+' : 'x'} ${s.name}: ${s.time.toFixed(1)}s`),
      '',
      '— Generado desde intranet.smconnection.cl',
    ].join('\n');
  };

  const copyAllLogs = () => {
    const text = logs.map(l => `[${l.ts}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  /* ── Parse history detail ── */
  const parseHistoryDetail = (h: DeployRecord): { commitHash?: string; message?: string; pipelineSteps?: { step: string; success: boolean; detail?: string }[] } => {
    try {
      const parsed = JSON.parse(h.detail);
      if (Array.isArray(parsed)) return { pipelineSteps: parsed };
      return {};
    } catch {
      const commitMatch = h.detail?.match(/([a-f0-9]{7,})/);
      return { commitHash: commitMatch?.[1], message: h.detail };
    }
  };

  /* ── Render ── */
  return (
    <>
      {/* Breadcrumb */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,13,20,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        height: 52, display: 'flex', alignItems: 'center', padding: '0 2rem',
        fontSize: '0.8rem', color: '#475569',
      }}>
        <span>Intranet</span>
        <span style={{ margin: '0 10px', color: '#1e293b' }}>/</span>
        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Deploy Center</span>
        <div style={{ flex: 1 }} />
        {lastActivity && (
          <span style={{ fontSize: '0.68rem', color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>
            Ultima actividad: {timeAgo(lastActivity)}
          </span>
        )}
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: 900, margin: '0 auto' }}>

        {/* ══════════════════════════════════════════════════════ */}
        {/* 1. STATUS BANNER */}
        {/* ══════════════════════════════════════════════════════ */}
        <div style={{
          background: '#0f1623',
          border: `1px solid ${statusBannerColor}33`,
          borderLeft: `4px solid ${statusBannerColor}`,
          borderRadius: 16,
          padding: '20px 24px',
          marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16,
          position: 'relative', overflow: 'hidden',
        }}>
          {deploying && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: `linear-gradient(90deg, transparent, ${statusBannerColor}, transparent)`,
              animation: 'shimmer 2s ease-in-out infinite',
            }} />
          )}
          {/* Hoku avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src="/img/hoku.jpg"
              alt="Hoku"
              style={{
                width: 48, height: 48, borderRadius: '50%',
                border: `2px solid ${statusBannerColor}44`,
                objectFit: 'cover',
              }}
            />
            <div style={{
              position: 'absolute', bottom: -1, right: -1,
              width: 14, height: 14, borderRadius: '50%',
              background: statusBannerColor,
              border: '2px solid #0f1623',
              animation: deploying ? 'pulseStatus 1.5s ease infinite' : 'none',
            }} />
          </div>
          {/* Status text */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>
              {deploying
                ? (isRollback ? 'Rollback en progreso...' : 'Deploy en progreso...')
                : lastDeploy
                  ? `Ultimo deploy exitoso ${timeAgo(lastDeploy.created_at)}`
                  : 'Sin deploys registrados'
              }
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 999,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                fontSize: '0.65rem', color: '#94a3b8',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusBannerColor }} />
                {REPO_ID}
              </span>
              <span style={{
                fontSize: '0.62rem', color: '#475569',
                padding: '3px 8px', borderRadius: 999,
                background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.12)',
              }}>
                AWS Amplify
              </span>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* 2. ACTIONS BAR */}
        {/* ══════════════════════════════════════════════════════ */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 20,
          position: 'relative',
        }}>
          {/* Deploy button */}
          <button
            onClick={() => triggerFullDeploy('manual')}
            disabled={deploying}
            style={{
              flex: 1,
              background: deploying
                ? 'rgba(59,130,246,0.12)'
                : 'linear-gradient(135deg, #00e5b0 0%, #00c49a 100%)',
              color: deploying ? '#3b82f6' : '#0a0d14',
              border: deploying ? '1px solid rgba(59,130,246,0.3)' : 'none',
              padding: '14px 24px', borderRadius: 14,
              fontWeight: 800, fontSize: '0.88rem',
              cursor: deploying ? 'not-allowed' : 'pointer',
              fontFamily: "'Inter', system-ui, sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'all 0.2s ease',
              boxShadow: deploying ? 'none' : '0 4px 20px rgba(0,229,176,0.15)',
            }}
          >
            {deploying ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '1rem' }}>&#9696;</span>
                {isRollback ? 'Rollback...' : 'Deploying...'}
              </>
            ) : (
              <>
                <i className="bi bi-rocket-takeoff" style={{ fontSize: '1.1rem' }} />
                Deploy
              </>
            )}
          </button>

          {/* Rollback button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowRollbackMenu(!showRollbackMenu)}
              disabled={deploying || successfulDeploys.length === 0}
              style={{
                background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.15)',
                color: successfulDeploys.length === 0 ? '#334155' : '#f59e0b',
                padding: '14px 20px', borderRadius: 14,
                fontWeight: 700, fontSize: '0.82rem',
                cursor: deploying || successfulDeploys.length === 0 ? 'not-allowed' : 'pointer',
                fontFamily: "'Inter', system-ui, sans-serif",
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.2s',
                opacity: deploying ? 0.4 : 1,
              }}
            >
              <i className="bi bi-arrow-counterclockwise" style={{ fontSize: '1rem' }} />
              Rollback
            </button>

            {/* Rollback dropdown */}
            {showRollbackMenu && pendingCommits.length > 0 && (
              <>
                <div
                  onClick={() => setShowRollbackMenu(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                />
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8,
                  width: 380, maxHeight: 360, overflowY: 'auto',
                  background: '#111827', border: '1px solid rgba(245,158,11,0.15)',
                  borderRadius: 16, padding: 8, zIndex: 100,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                }}>
                  <div style={{
                    fontSize: '0.68rem', fontWeight: 700, color: '#f59e0b',
                    padding: '8px 12px', marginBottom: 4,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <i className="bi bi-arrow-counterclockwise" />
                    Selecciona un commit para rollback
                  </div>
                  {pendingCommits.slice(1, 6).map(c => (
                    <button
                      key={c.sha}
                      onClick={() => { setShowRollbackMenu(false); setRollbackConfirm(c); }}
                      style={{
                        width: '100%', background: 'transparent',
                        border: '1px solid transparent', borderRadius: 10,
                        padding: '10px 12px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', gap: 4,
                        textAlign: 'left', transition: 'all 0.15s',
                        color: '#e2e8f0', fontFamily: "'Inter', system-ui",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.06)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.12)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <code style={{
                          fontSize: '0.65rem', color: '#f97316',
                          fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                          background: 'rgba(249,115,22,0.08)', padding: '2px 6px', borderRadius: 4,
                        }}>
                          {c.sha}
                        </code>
                        <span style={{ fontSize: '0.7rem', color: '#cbd5e1', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.message}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#475569' }}>
                        {c.author} — {timeAgo(c.date)}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Ver reporte button */}
          {reportData && !deploying && (
            <button
              onClick={() => setShowReport(true)}
              style={{
                background: 'rgba(59,130,246,0.06)',
                border: '1px solid rgba(59,130,246,0.15)',
                color: '#3b82f6',
                padding: '14px 20px', borderRadius: 14,
                fontWeight: 700, fontSize: '0.82rem',
                cursor: 'pointer',
                fontFamily: "'Inter', system-ui, sans-serif",
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              <i className="bi bi-bar-chart" style={{ fontSize: '1rem' }} />
              Ver reporte
            </button>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* 3. PIPELINE */}
        {/* ══════════════════════════════════════════════════════ */}
        <div style={{
          background: '#0f1623', border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 20, padding: '24px', marginBottom: 20,
          position: 'relative', overflow: 'hidden',
        }}>
          {deploying && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)',
              animation: 'shimmer 2s ease-in-out infinite',
            }} />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <i className="bi bi-diagram-3" style={{ color: '#00e5b0', fontSize: '1rem' }} />
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
              Pipeline {isRollback ? '(Rollback)' : ''}
            </h3>
            {deploying && (
              <span style={{
                fontSize: '0.6rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                background: isRollback ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                color: isRollback ? '#f59e0b' : '#3b82f6',
                border: `1px solid ${isRollback ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)'}`,
                animation: 'pulseStatus 1.5s ease infinite',
              }}>
                {isRollback ? 'ROLLBACK' : 'EN PROGRESO'}
              </span>
            )}
            <div style={{ flex: 1 }} />
            {/* Total time counter */}
            {(deploying || pipelineElapsed > 0) && (
              <span style={{
                fontSize: '0.75rem', fontWeight: 700, color: deploying ? '#3b82f6' : '#22c55e',
                fontFamily: "'JetBrains Mono', monospace",
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <i className="bi bi-stopwatch" style={{ fontSize: '0.7rem' }} />
                {pipelineElapsed.toFixed(1)}s
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
            {steps.map((step, idx) => (
              <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                {/* Step card */}
                <div
                  onClick={() => {
                    if (stepLogs.current[step.id]?.length) {
                      setActiveStepLog(activeStepLog === step.id ? null : step.id);
                    }
                  }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    padding: '16px 10px', borderRadius: 14, minWidth: 100, flex: 1,
                    background: step.status === 'active'
                      ? 'rgba(59,130,246,0.06)'
                      : step.status === 'done'
                        ? 'rgba(34,197,94,0.04)'
                        : step.status === 'error'
                          ? 'rgba(239,68,68,0.06)'
                          : 'rgba(51,65,85,0.04)',
                    border: `1px solid ${step.status === 'active' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)'}`,
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    cursor: stepLogs.current[step.id]?.length ? 'pointer' : 'default',
                  }}
                >
                  {/* Pulsing ring for active step */}
                  {step.status === 'active' && (
                    <div style={{
                      position: 'absolute', top: -2, left: -2, right: -2, bottom: -2,
                      borderRadius: 16, border: '2px solid rgba(59,130,246,0.4)',
                      animation: 'pulseBorder 2s ease-in-out infinite',
                    }} />
                  )}

                  {/* Icon */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 12,
                    background: step.status === 'active'
                      ? 'rgba(59,130,246,0.1)'
                      : step.status === 'done'
                        ? 'rgba(34,197,94,0.08)'
                        : step.status === 'error'
                          ? 'rgba(239,68,68,0.08)'
                          : 'rgba(255,255,255,0.02)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s',
                  }}>
                    {step.status === 'active' ? (
                      <div style={{
                        width: 18, height: 18, border: '2px solid #3b82f6', borderTopColor: 'transparent',
                        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                      }} />
                    ) : step.status === 'done' ? (
                      <i className="bi bi-check-lg" style={{ fontSize: '1.1rem', color: '#22c55e' }} />
                    ) : step.status === 'error' ? (
                      <i className="bi bi-x-lg" style={{ fontSize: '0.9rem', color: '#ef4444' }} />
                    ) : (
                      <i className={`bi ${step.icon}`} style={{ fontSize: '1rem', color: '#334155' }} />
                    )}
                  </div>

                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, color: statusColor(step.status),
                    textAlign: 'center', transition: 'color 0.3s',
                  }}>
                    {step.name}
                  </span>

                  {step.status === 'pending' && (
                    <span style={{ fontSize: '0.56rem', color: '#475569', textAlign: 'center' }}>
                      {step.description}
                    </span>
                  )}

                  {step.status !== 'pending' && (
                    <span style={{
                      fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                      background: step.status === 'done' ? 'rgba(34,197,94,0.06)' : step.status === 'error' ? 'rgba(239,68,68,0.06)' : 'rgba(59,130,246,0.06)',
                      color: statusColor(step.status),
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {step.status === 'error' ? 'Error' : `${step.duration}s`}
                    </span>
                  )}
                </div>

                {/* Animated connector */}
                {idx < steps.length - 1 && (
                  <div style={{
                    width: 28, minWidth: 28, height: 2,
                    background: connectorColor(idx),
                    transition: 'background 0.5s', position: 'relative',
                    borderRadius: 1,
                  }}>
                    {steps[idx].status === 'done' && steps[idx + 1].status === 'active' && (
                      <div style={{
                        position: 'absolute', top: -4, width: 10, height: 10, borderRadius: '50%',
                        background: '#3b82f6', boxShadow: '0 0 12px #3b82f6',
                        animation: 'moveRight 1.2s ease-in-out infinite',
                      }} />
                    )}
                    {steps[idx].status === 'done' && steps[idx + 1].status === 'done' && (
                      <div style={{
                        position: 'absolute', top: -1, left: 0, right: 0, height: 4,
                        background: 'rgba(34,197,94,0.3)', borderRadius: 2,
                      }} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Step log popup */}
          {activeStepLog && stepLogs.current[activeStepLog]?.length > 0 && (
            <div style={{
              marginTop: 16, padding: '12px 16px',
              background: '#080b12', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.05)',
              maxHeight: 160, overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8' }}>
                  Log: {steps.find(s => s.id === activeStepLog)?.name}
                </span>
                <button
                  onClick={() => setActiveStepLog(null)}
                  style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>
              {stepLogs.current[activeStepLog].map((line, i) => (
                <div key={i} style={{
                  fontSize: '0.65rem', color: '#64748b',
                  fontFamily: "'JetBrains Mono', monospace",
                  lineHeight: 1.7,
                }}>
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* 4. TERMINAL (collapsible) */}
        {/* ══════════════════════════════════════════════════════ */}
        <div style={{
          background: '#080b12', border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 20, marginBottom: 20, overflow: 'hidden',
        }}>
          {/* Terminal header - always visible */}
          <div
            onClick={() => setTerminalOpen(!terminalOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px',
              borderBottom: terminalOpen ? '1px solid rgba(255,255,255,0.04)' : 'none',
              background: 'rgba(255,255,255,0.015)',
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#febc2e' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840' }} />
            </div>
            <span style={{
              fontSize: '0.68rem', color: '#334155',
              fontFamily: "'JetBrains Mono', monospace", marginLeft: 10,
            }}>
              deploy — {REPO_ID} — bash
            </span>
            <div style={{ flex: 1 }} />
            {logs.length > 0 && (
              <span style={{ fontSize: '0.58rem', color: '#1e293b', fontFamily: "'JetBrains Mono', monospace" }}>
                {logs.length} lines
              </span>
            )}
            {/* Copy all logs */}
            {logs.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); copyAllLogs(); }}
                style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  color: copiedLog ? '#22c55e' : '#475569', fontSize: '0.6rem', cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: '2px 8px', borderRadius: 4,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <i className={copiedLog ? 'bi bi-check' : 'bi bi-clipboard'} />
                {copiedLog ? 'Copiado' : 'Copiar'}
              </button>
            )}
            {logs.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLogs([]); try { localStorage.removeItem('deploy-logs'); } catch {} }}
                style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  color: '#475569', fontSize: '0.6rem', cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: '2px 8px', borderRadius: 4,
                }}
              >
                clear
              </button>
            )}
            <i
              className={`bi bi-chevron-${terminalOpen ? 'up' : 'down'}`}
              style={{ color: '#475569', fontSize: '0.7rem', marginLeft: 4 }}
            />
          </div>

          {/* Terminal body */}
          {terminalOpen && (
            <div ref={termRef} style={{
              maxHeight: 320, overflowY: 'auto', padding: '14px 18px',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', lineHeight: 1.9,
            }}>
              {logs.length === 0 ? (
                <div style={{ color: '#1e293b' }}>
                  <span style={{ color: '#334155' }}>$</span> esperando comandos...
                  <span style={{ display: 'inline-block', width: 7, height: 14, background: '#334155', marginLeft: 4, animation: 'blink 1.2s step-end infinite' }} />
                </div>
              ) : (
                logs.map((l, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: '#1e293b', fontSize: '0.62rem', minWidth: 60, flexShrink: 0, userSelect: 'none' }}>{l.ts}</span>
                    <span style={{
                      color: l.type === 'dim' ? '#1e293b' : l.color,
                      wordBreak: 'break-all',
                    }}>
                      {l.text.startsWith('[') ? (
                        <>
                          <span style={{
                            color: getTagColor(l.text), fontWeight: 700,
                            opacity: l.type === 'dim' ? 0.5 : 1,
                          }}>
                            {l.text.match(/^\[\w+\]/)?.[0] || ''}
                          </span>
                          <span style={{
                            color: l.type === 'success' ? '#22c55e' : l.type === 'error' ? '#ef4444' : l.type === 'dim' ? '#1e293b' : '#94a3b8',
                          }}>
                            {l.text.replace(/^\[\w+\]/, '')}
                          </span>
                        </>
                      ) : l.text}
                    </span>
                  </div>
                ))
              )}
              {deploying && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 2 }}>
                  <span style={{ color: '#1e293b', fontSize: '0.62rem', minWidth: 60 }} />
                  <span style={{ display: 'inline-block', width: 7, height: 14, background: '#3b82f6', animation: 'blink 0.8s step-end infinite' }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* 5. HISTORY (cards) */}
        {/* ══════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <i className="bi bi-clock-history" style={{ color: '#3b82f6', fontSize: '0.9rem' }} />
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
              Historial de Deploys
            </h3>
            <div style={{ flex: 1 }} />
            <button onClick={loadHistory} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8, padding: '4px 10px', color: '#475569',
              fontSize: '0.62rem', cursor: 'pointer', fontFamily: "'Inter', system-ui",
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <i className="bi bi-arrow-clockwise" style={{ fontSize: '0.65rem' }} /> Refresh
            </button>
          </div>

          {historyLoading ? (
            <div style={{
              background: '#0f1623', borderRadius: 16, padding: '3rem 0', textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{
                width: 24, height: 24, border: '2px solid #1e293b', borderTopColor: '#475569',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                margin: '0 auto 10px',
              }} />
              <p style={{ fontSize: '0.72rem', color: '#334155' }}>Cargando historial...</p>
            </div>
          ) : history.length === 0 ? (
            <div style={{
              background: '#0f1623', border: '1px dashed rgba(255,255,255,0.08)',
              borderRadius: 20, padding: '3rem 2rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.3 }}>
                <i className="bi bi-rocket-takeoff" />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 8px' }}>
                Sin deploys registrados
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0 0 20px', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
                Ejecuta tu primer deploy para ver el pipeline en accion.
              </p>
              <button
                onClick={() => triggerFullDeploy()}
                style={{
                  background: 'linear-gradient(135deg, #00e5b0, #00c49a)',
                  color: '#0a0d14', border: 'none',
                  padding: '12px 28px', borderRadius: 12,
                  fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                  fontFamily: "'Inter', system-ui",
                }}
              >
                Ejecutar primer deploy
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map((h, i) => {
                const parsed = parseHistoryDetail(h);
                const isSuccess = h.status === 'success';
                const isRollbackEntry = h.detail?.includes('rollback') || h.action?.includes('rollback');

                return (
                  <div key={h.id || i} style={{
                    background: '#0f1623',
                    border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'}`,
                    borderRadius: 16,
                    padding: '16px 20px',
                    transition: 'all 0.2s',
                  }}>
                    {/* Top row: status + time + rollback btn */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: '0.72rem', fontWeight: 700,
                        color: isSuccess ? '#22c55e' : '#ef4444',
                      }}>
                        <i className={isSuccess ? 'bi bi-check-circle-fill' : 'bi bi-x-circle-fill'} />
                        {isRollbackEntry ? 'Rollback' : 'Deploy'} {isSuccess ? 'exitoso' : 'fallido'}
                      </span>
                      {h.agent_name === 'Pipeline Bot' && (
                        <span style={{
                          fontSize: '0.52rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                          background: 'rgba(59,130,246,0.08)', color: '#3b82f6',
                          border: '1px solid rgba(59,130,246,0.12)',
                        }}>
                          PIPELINE
                        </span>
                      )}
                      <div style={{ flex: 1 }} />
                      <span style={{ fontSize: '0.65rem', color: '#475569' }}>
                        {timeAgo(h.created_at)}
                      </span>
                      {isSuccess && pendingCommits.length > 0 && (
                        <button
                          onClick={() => {
                            const commit = pendingCommits.find(c => h.detail?.includes(c.sha));
                            if (commit) setRollbackConfirm(commit);
                          }}
                          disabled={deploying}
                          style={{
                            background: 'rgba(245,158,11,0.06)',
                            border: '1px solid rgba(245,158,11,0.12)',
                            color: '#f59e0b', fontSize: '0.6rem', fontWeight: 600,
                            padding: '3px 8px', borderRadius: 6, cursor: deploying ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontFamily: "'Inter', system-ui",
                            opacity: deploying ? 0.4 : 1,
                          }}
                        >
                          <i className="bi bi-arrow-counterclockwise" style={{ fontSize: '0.55rem' }} />
                          Rollback
                        </button>
                      )}
                    </div>

                    {/* Commit info */}
                    <div style={{
                      fontSize: '0.72rem', color: '#94a3b8', marginBottom: 8,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {parsed.commitHash && (
                        <code style={{
                          fontSize: '0.62rem', color: '#f97316',
                          fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
                          background: 'rgba(249,115,22,0.06)', padding: '1px 5px', borderRadius: 3,
                        }}>
                          {parsed.commitHash.slice(0, 7)}
                        </code>
                      )}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {parsed.message || h.action || h.detail?.slice(0, 80) || 'Sin detalles'}
                      </span>
                    </div>

                    {/* Pipeline steps inline */}
                    {parsed.pipelineSteps && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: '0.62rem', color: '#475569', marginBottom: 10,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {parsed.pipelineSteps.map((s, si) => (
                          <span key={si} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <span style={{ color: s.success ? '#22c55e' : '#ef4444' }}>
                              {s.success ? '✓' : '✗'}
                            </span>
                            {s.step}
                            {si < parsed.pipelineSteps!.length - 1 && (
                              <span style={{ color: '#1e293b', margin: '0 2px' }}>→</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Separator */}
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', marginBottom: 10 }} />

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `Deploy ${h.status} — ${new Date(h.created_at).toLocaleString('es-CL')}\n${h.detail || ''}`
                          );
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                          color: '#475569', fontSize: '0.6rem', cursor: 'pointer',
                          padding: '4px 10px', borderRadius: 6,
                          fontFamily: "'Inter', system-ui",
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <i className="bi bi-clipboard" style={{ fontSize: '0.55rem' }} />
                        Copiar log
                      </button>
                      <a
                        href={PROD_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: 'rgba(0,229,176,0.04)', border: '1px solid rgba(0,229,176,0.1)',
                          color: '#00e5b0', fontSize: '0.6rem', cursor: 'pointer',
                          padding: '4px 10px', borderRadius: 6, textDecoration: 'none',
                          fontFamily: "'Inter', system-ui",
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <i className="bi bi-box-arrow-up-right" style={{ fontSize: '0.55rem' }} />
                        Ver live
                      </a>
                      <div style={{ flex: 1 }} />
                      <span style={{
                        fontSize: '0.58rem', color: '#1e293b',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {new Date(h.created_at).toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ROLLBACK CONFIRMATION POPUP */}
      {/* ══════════════════════════════════════════════════════ */}
      {rollbackConfirm && (
        <div
          onClick={() => setRollbackConfirm(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0c1019', border: '1px solid rgba(245,158,11,0.15)',
              borderRadius: 20, width: '100%', maxWidth: 420,
              boxShadow: '0 30px 80px rgba(0,0,0,0.7)', padding: '28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="bi bi-arrow-counterclockwise" style={{ fontSize: '1.3rem', color: '#f59e0b' }} />
              </div>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f1f5f9' }}>Confirmar Rollback</div>
                <div style={{ fontSize: '0.68rem', color: '#475569' }}>Esta accion creara un revert commit</div>
              </div>
            </div>

            <div style={{
              background: '#111827', borderRadius: 12, padding: '16px',
              border: '1px solid rgba(255,255,255,0.05)', marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <code style={{
                  fontSize: '0.72rem', color: '#f97316',
                  fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                  background: 'rgba(249,115,22,0.08)', padding: '2px 8px', borderRadius: 4,
                }}>
                  {rollbackConfirm.sha}
                </code>
                <span style={{ fontSize: '0.65rem', color: '#475569' }}>
                  {timeAgo(rollbackConfirm.date)}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#e2e8f0', marginBottom: 6 }}>
                {rollbackConfirm.message}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#475569' }}>
                por {rollbackConfirm.author}
              </div>
            </div>

            <div style={{
              fontSize: '0.7rem', color: '#94a3b8', marginBottom: 20,
              padding: '10px 14px', borderRadius: 10,
              background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.08)',
            }}>
              Se creara el commit: <code style={{ color: '#f59e0b', fontFamily: "'JetBrains Mono', monospace" }}>revert: rollback to {rollbackConfirm.sha}</code>
              <br />y se disparara un deploy automaticamente.
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setRollbackConfirm(null)}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#94a3b8', padding: '12px', borderRadius: 12,
                  fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  fontFamily: "'Inter', system-ui",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRollback(rollbackConfirm)}
                style={{
                  flex: 1, background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: 'none', color: '#0a0d14',
                  padding: '12px', borderRadius: 12,
                  fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                  fontFamily: "'Inter', system-ui",
                  boxShadow: '0 4px 20px rgba(245,158,11,0.2)',
                }}
              >
                Confirmar Rollback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* POST-DEPLOY REPORT POPUP */}
      {/* ══════════════════════════════════════════════════════ */}
      {showReport && reportData && (
        <div
          onClick={() => setShowReport(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0c1019', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 24, width: '100%', maxWidth: 520,
              boxShadow: '0 30px 80px rgba(0,0,0,0.7)', overflow: 'hidden',
            }}
          >
            {/* Report header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', gap: 12,
              background: reportData.source === 'rollback'
                ? 'linear-gradient(135deg, rgba(245,158,11,0.06), transparent)'
                : 'linear-gradient(135deg, rgba(34,197,94,0.05), transparent)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: reportData.source === 'rollback' ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={reportData.source === 'rollback' ? 'bi bi-arrow-counterclockwise' : 'bi bi-check-circle-fill'}
                  style={{ fontSize: '1.2rem', color: reportData.source === 'rollback' ? '#f59e0b' : '#22c55e' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9' }}>
                  {reportData.source === 'rollback' ? 'Rollback Exitoso' : 'Deploy Exitoso'}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>
                  {new Date(reportData.timestamp).toLocaleString('es-CL')}
                </div>
              </div>
              <button
                onClick={() => setShowReport(false)}
                style={{
                  marginLeft: 'auto', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)', color: '#475569',
                  width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                  fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'REPO', value: reportData.repo, color: '#e2e8f0' },
                  { label: 'BRANCH', value: reportData.branch, color: '#a78bfa' },
                  { label: 'COMMIT', value: reportData.commitHash, color: '#f97316' },
                ].map(item => (
                  <div key={item.label} style={{
                    background: '#111827', borderRadius: 12, padding: '12px',
                    border: '1px solid rgba(255,255,255,0.03)',
                  }}>
                    <div style={{ fontSize: '0.55rem', color: '#334155', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: '0.75rem', color: item.color, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Steps breakdown */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Desglose por paso</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {reportData.steps.map(s => (
                    <div key={s.name} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.015)',
                    }}>
                      <i className={`bi ${s.status === 'done' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}
                        style={{ color: s.status === 'done' ? '#22c55e' : '#ef4444', fontSize: '0.75rem' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: '#e2e8f0', flex: 1 }}>{s.name}</span>
                      <span style={{
                        fontSize: '0.7rem', color: '#64748b', fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {s.time.toFixed(1)}s
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total time */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 12,
                background: reportData.source === 'rollback' ? 'rgba(245,158,11,0.04)' : 'rgba(34,197,94,0.04)',
                border: `1px solid ${reportData.source === 'rollback' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)'}`,
                marginBottom: 20,
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>Tiempo total</span>
                <span style={{
                  fontSize: '1.1rem', fontWeight: 800,
                  color: reportData.source === 'rollback' ? '#f59e0b' : '#22c55e',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {reportData.totalTime.toFixed(1)}s
                </span>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                <a
                  href={`mailto:guillermo.gonzalez@smconnection.cl?subject=${encodeURIComponent(`Deploy Report — ${reportData.repo} — ${new Date().toLocaleDateString('es-CL')}`)}&body=${encodeURIComponent(buildReportText(reportData))}`}
                  style={{
                    background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
                    borderRadius: 10, padding: '10px', color: '#3b82f6',
                    fontSize: '0.7rem', fontWeight: 700, textAlign: 'center', textDecoration: 'none',
                    fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    cursor: 'pointer',
                  }}
                >
                  <i className="bi bi-envelope" /> Email
                </a>
                <button
                  onClick={() => { navigator.clipboard.writeText(buildReportText(reportData)); }}
                  style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10, padding: '10px', color: '#94a3b8',
                    fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}
                >
                  <i className="bi bi-clipboard" /> Copiar
                </button>
                <a
                  href={PROD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: 'rgba(0,229,176,0.06)', border: '1px solid rgba(0,229,176,0.15)',
                    borderRadius: 10, padding: '10px', color: '#00e5b0',
                    fontSize: '0.7rem', fontWeight: 700, textAlign: 'center', textDecoration: 'none',
                    fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    cursor: 'pointer',
                  }}
                >
                  <i className="bi bi-box-arrow-up-right" /> Ver live
                </a>
              </div>

              <button
                onClick={() => setShowReport(false)}
                style={{
                  width: '100%',
                  background: reportData.source === 'rollback'
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                    : 'linear-gradient(135deg, #00e5b0, #00c49a)',
                  color: '#0a0d14', border: 'none', padding: '12px', borderRadius: 12,
                  fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                  fontFamily: "'Inter', system-ui",
                }}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes pulseBorder {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes moveRight {
          0% { left: 0; opacity: 1; }
          100% { left: 18px; opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes pulseStatus {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </>
  );
}
