'use client';
import { useState, useRef, useCallback, useEffect } from 'react';

const AGENTS = [
  // Fusion
  { id: 'hoku', name: 'Hoku', model: 'fusión 9 agentes', color: '#ff6b6b', role: 'Síntesis multi-agente inteligente' },
  // Core providers
  { id: 'groq', name: 'Groq', model: 'llama-3.3-70b', color: '#f59e0b', role: 'Ultra rápido · Gratis' },
  { id: 'claude', name: 'Claude', model: 'claude-haiku-4.5', color: '#00e5b0', role: 'Código funcional premium' },
  { id: 'grok', name: 'Grok', model: 'grok-3-mini', color: '#8b5cf6', role: 'Análisis · xAI' },
  { id: 'deepseek', name: 'DeepSeek', model: 'deepseek-chat', color: '#0ea5e9', role: 'Programación avanzada' },
  { id: 'mistral', name: 'Mistral', model: 'mistral-small', color: '#f97316', role: 'Español · SEO · GDPR' },
  { id: 'openai', name: 'OpenAI', model: 'gpt-4o-mini', color: '#10b981', role: 'Full-stack dev' },
  { id: 'cohere', name: 'Cohere', model: 'command-a', color: '#1e3a5f', role: 'NLP · RAG · Documentos' },
  { id: 'openrouter', name: 'OpenRouter', model: 'llama-3.3-70b', color: '#6366f1', role: '100+ modelos · Fallback' },
  { id: 'bedrock', name: 'Bedrock', model: 'claude-3.5-haiku', color: '#f97316', role: 'AWS nativo · Enterprise' },
  { id: 'gemini', name: 'Gemini', model: 'gemini-2.0-flash', color: '#22c55e', role: 'Multimodal · Google AI' },
];

const PLACEHOLDERS: Record<string, string> = {
  hoku: 'Analiza smconnection.cl desde todos los ángulos...',
  groq: 'Escribe el copy para la sección hero...',
  claude: 'Revisa el código y sugiere mejoras...',
  grok: 'Investiga tendencias SaaS B2B...',
  deepseek: 'Genera un componente React optimizado...',
  mistral: 'Escribe meta descriptions SEO...',
  openai: 'Crea una API REST completa...',
  cohere: 'Busca en la documentación SAP...',
  openrouter: 'Compara respuestas de múltiples modelos...',
  bedrock: 'Diseña arquitectura cloud AWS...',
};

type PipelineStep = 'idle' | 'confirm' | 'preview' | 'pushing' | 'deploying' | 'done' | 'error';

function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{
        width: 16, height: 16, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.06)', color: '#64748b', fontSize: '0.55rem', fontWeight: 700, cursor: 'help',
        marginLeft: 4, flexShrink: 0,
      }} role="img" aria-label={text}>ⓘ</span>
      {show && (
        <span style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          padding: '6px 10px', borderRadius: 6, background: '#1e293b', color: '#e2e8f0',
          fontSize: '0.65rem', lineHeight: 1.4, whiteSpace: 'normal', width: 220,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
          zIndex: 100, marginBottom: 4, textAlign: 'left', fontWeight: 400,
        }}>{text}</span>
      )}
    </span>
  );
}

// Extract code blocks with file paths from output
function extractCodeFiles(text: string): { path: string; content: string; lang: string }[] {
  const codeBlockRegex = /```(\w+)?(?:\s+(?:filename=)?["']?([^"'\n]+)["']?)?\n([\s\S]*?)```/g;
  const files: { path: string; content: string; lang: string }[] = [];
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const lang = match[1] || 'txt';
    const explicitPath = match[2];
    const content = match[3].trim();
    if (content.length > 50) {
      const path = explicitPath || `src/improvements/${Date.now()}-${lang}.${lang === 'tsx' || lang === 'typescript' ? 'tsx' : lang === 'css' ? 'css' : lang === 'json' ? 'json' : 'txt'}`;
      files.push({ path, content, lang });
    }
  }
  return files;
}

export default function AgentsWorkspace() {
  const [selectedAgent, setSelectedAgent] = useState('hoku');
  const [mode, setMode] = useState<'chat' | 'code' | 'sap' | 'deploy'>('chat');
  const [task, setTask] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [pipeline, setPipeline] = useState<PipelineStep>('idle');
  const [pipelineLog, setPipelineLog] = useState<string[]>([]);
  const [targetRepo, setTargetRepo] = useState('smartconnection-intranet');
  const [committedFiles, setCommittedFiles] = useState<string[]>([]);
  const [commitUrl, setCommitUrl] = useState('');
  const [detectedFiles, setDetectedFiles] = useState<{ path: string; content: string; lang: string }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const agent = AGENTS.find(a => a.id === selectedAgent) || AGENTS[0];
  const repos = [
    { id: 'smartconnection-intranet', label: 'Intranet (AWS Amplify)', repo: 'guillermogonzalezleon-lgtm/smartconnection-intranet', url: 'https://intranet.smconnection.cl' },
  ];

  const deployApi = (p: Record<string, unknown>) => fetch('/api/deploy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(r => r.json());

  // Load prompt from Labs/flows
  useEffect(() => {
    try {
      const p = sessionStorage.getItem('agent-prompt');
      if (p) { setTask(p); sessionStorage.removeItem('agent-prompt'); }
    } catch {}
  }, []);

  const execute = useCallback(async () => {
    if (!task.trim() || running) return;
    setRunning(true); setOutput(''); setElapsed(0); setTokens(0);
    const start = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 100);
    window.dispatchEvent(new CustomEvent('exec-agent', { detail: { agent: selectedAgent, prompt: task, taskType: mode === 'sap' ? 'sap_fi' : mode === 'deploy' ? 'devops' : mode === 'code' ? 'dev' : 'general' } }));
    let tokenCount = 0;
    try {
      const codeSystemPrompt = `\n\nIMPORTANTE: Cuando generes código, SIEMPRE usa este formato:\n\n\`\`\`tsx filename="src/components/NombreComponente.tsx"\n// código aquí\n\`\`\`\n\nIncluye el path completo del archivo en el atributo filename. Solo genera código que se pueda commitear directamente. NO generes markdown de documentación — genera archivos .tsx, .css, .ts reales.`;
      const res = await fetch('/api/agents/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: task + codeSystemPrompt, taskType: mode === 'sap' ? 'sap_fi' : mode === 'deploy' ? 'devops' : mode === 'code' ? 'dev' : 'general', agentId: selectedAgent }) });
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

  const startPipeline = () => {
    const files = extractCodeFiles(output);
    setDetectedFiles(files);
    setCommittedFiles([]);
    setCommitUrl('');
    setPipeline('preview');
    setPipelineLog([]);
  };

  const approvePipeline = () => {
    setPipeline('confirm');
  };

  const [stepTimes, setStepTimes] = useState<Record<string, number>>({});
  const amplifyApi = (p: Record<string, unknown>) => fetch('/api/amplify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(r => r.json());

  const runPipeline = async () => {
    if (output.length < 100) { setPipelineLog(['⚠️ Output muy corto para commitear']); setPipeline('error'); return; }
    const target = repos.find(r => r.id === targetRepo) || repos[0];
    const pipelineStart = Date.now();
    setStepTimes({});
    setPipeline('pushing');
    setPipelineLog([`Pipeline → ${target.label}`, '']);

    // Step 1: Save to Supabase (real)
    const s1 = Date.now();
    setPipelineLog(prev => [...prev, '📤 Guardando mejora en Supabase...']);
    try {
      const firstLine = output.split('\n').find(l => l.trim().length > 10) || 'Mejora generada por IA';
      const titulo = firstLine.replace(/^\*\*|^\d+\.\s*|\*\*$/g, '').trim().slice(0, 100);
      await deployApi({ action: 'save_improvement', titulo, descripcion: output.slice(0, 500), categoria: 'UX', impacto: 'Por evaluar', agente: selectedAgent, ciclo: 1 });
      const t1 = ((Date.now() - s1) / 1000).toFixed(1);
      setStepTimes(prev => ({ ...prev, save: Date.now() - s1 }));
      setPipelineLog(prev => [...prev, `✅ Insight guardado (${t1}s)`]);
    } catch (err) { setPipelineLog(prev => [...prev, `⚠️ ${String(err)}`]); }

    // Step 2: Commit code files to GitHub (real)
    setPipeline('deploying');
    const s2 = Date.now();
    const codeFiles = detectedFiles;

    // DIFF PREVIEW
    setPipelineLog(prev => [...prev, '', '━━━ DIFF PREVIEW ━━━']);
    if (codeFiles.length > 0) {
      for (const file of codeFiles) {
        const preview = file.content.split('\n').slice(0, 5).join('\n');
        setPipelineLog(prev => [...prev, `📄 ${file.path} (${file.lang})`, ...preview.split('\n').map(l => `  ${l}`), '']);
      }
    } else {
      setPipelineLog(prev => [...prev, '⚠️ No se detectaron bloques de código con filename']);
    }
    setPipelineLog(prev => [...prev, '━━━━━━━━━━━━━━━━━━━']);

    const date = new Date().toISOString().split('T')[0];
    const committed: string[] = [];
    let lastCommitUrl = '';
    try {
      if (codeFiles.length > 0) {
        setPipelineLog(prev => [...prev, '', `📁 Commiteando ${codeFiles.length} archivo(s) de código...`]);
        for (const file of codeFiles) {
          setPipelineLog(prev => [...prev, `  📄 ${file.path} (${file.lang})`]);
          const r = await deployApi({
            action: 'commit_file', repo: target.repo,
            path: file.path, content: file.content,
            message: `feat(agent): ${file.path} via ${selectedAgent}`,
          });
          if (!r.success) {
            setPipelineLog(prev => [...prev, `  ⚠️ Error: ${r.error}`]);
          } else {
            committed.push(file.path);
            if (r.commit_url) lastCommitUrl = r.commit_url;
            else if (r.sha) lastCommitUrl = `https://github.com/${target.repo}/commit/${r.sha}`;
            setPipelineLog(prev => [...prev, `  ✅ Committed → ${file.path}`]);
          }
        }
      }

      // Also commit improvement doc as reference
      const r = await deployApi({
        action: 'commit_file', repo: target.repo,
        path: `docs/improvements/${date}-${selectedAgent}-${Date.now()}.md`,
        content: `# Mejora — ${date}\n\n**Agente:** ${selectedAgent}\n**Tarea:** ${task}\n\n## Archivos generados\n${committed.map(f => `- \`${f}\``).join('\n')}\n\n${output}\n`,
        message: `feat(ux): mejora via ${selectedAgent} — ${task.slice(0, 50)}`,
      });

      const t2 = ((Date.now() - s2) / 1000).toFixed(1);
      setStepTimes(prev => ({ ...prev, commit: Date.now() - s2 }));
      if (r.success) {
        if (r.commit_url) lastCommitUrl = r.commit_url;
        else if (r.sha) lastCommitUrl = `https://github.com/${target.repo}/commit/${r.sha}`;
        committed.push(`docs/improvements/${date}-${selectedAgent}-....md`);
        setPipelineLog(prev => [...prev, `✅ ${committed.length} archivos committed (${t2}s)`]);
      } else {
        setPipelineLog(prev => [...prev, `❌ Error commit: ${r.error}`]);
        setPipeline('error');
        return;
      }
    } catch (err) { setPipelineLog(prev => [...prev, `❌ ${String(err)}`]); setPipeline('error'); return; }

    setCommittedFiles(committed);
    setCommitUrl(lastCommitUrl);

    // Step 3: Wait for Amplify build (real polling)
    const s3 = Date.now();
    setPipelineLog(prev => [...prev, '', '🚀 AWS Amplify build disparado por push a main...']);
    setPipelineLog(prev => [...prev, '⏳ Esperando build de Amplify (polling cada 10s)...']);

    let buildDone = false;
    let attempts = 0;
    const maxAttempts = 6; // 60 seconds max

    while (!buildDone && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 10000)); // Poll every 10s
      attempts++;
      try {
        const status = await amplifyApi({ action: 'build_status' });
        const elapsed = ((Date.now() - s3) / 1000).toFixed(0);
        if (status.amplify) {
          const amp = status.amplify;
          if (amp.status === 'completed') {
            buildDone = true;
            const t3 = ((Date.now() - s3) / 1000).toFixed(1);
            setStepTimes(prev => ({ ...prev, build: Date.now() - s3 }));
            if (amp.conclusion === 'success') {
              setPipelineLog(prev => [...prev, `✅ Amplify build completado (${t3}s)`]);
            } else {
              setPipelineLog(prev => [...prev, `❌ Amplify build falló: ${amp.conclusion}`]);
              setPipeline('error');
              return;
            }
          } else {
            setPipelineLog(prev => [...prev, `⟳ Build ${amp.status}... (${elapsed}s)`]);
          }
        } else if (status.status === 'success') {
          buildDone = true;
          const t3 = ((Date.now() - s3) / 1000).toFixed(1);
          setStepTimes(prev => ({ ...prev, build: Date.now() - s3 }));
          setPipelineLog(prev => [...prev, `✅ Build verificado via GitHub status (${t3}s)`]);
        } else {
          setPipelineLog(prev => [...prev, `⟳ Status: ${status.status || 'pending'}... (${elapsed}s)`]);
        }
      } catch {
        setPipelineLog(prev => [...prev, `⟳ Polling... (intento ${attempts}/${maxAttempts})`]);
      }
    }

    if (!buildDone) {
      setPipelineLog(prev => [...prev, `⚠️ Timeout esperando build (${maxAttempts * 10}s)`, '🔄 Build continúa en background — verificar en AWS Amplify Console']);
    }

    // Step 4: Health check (real)
    const s4 = Date.now();
    setPipelineLog(prev => [...prev, '', `🏥 Health check → ${target.url}...`]);
    try {
      const hc = await amplifyApi({ action: 'health_check' });
      const t4 = ((Date.now() - s4) / 1000).toFixed(1);
      setStepTimes(prev => ({ ...prev, health: Date.now() - s4 }));
      if (hc.results) {
        for (const r of hc.results) {
          setPipelineLog(prev => [...prev, `${r.ok ? '✅' : '❌'} ${r.url} → ${r.status} (${r.latency}ms)`]);
        }
      }
    } catch {
      setPipelineLog(prev => [...prev, '⚠️ Health check no disponible']);
    }

    // Done
    const totalTime = ((Date.now() - pipelineStart) / 1000).toFixed(1);
    setStepTimes(prev => ({ ...prev, total: Date.now() - pipelineStart }));
    setPipeline('done');
    setPipelineLog(prev => [
      ...prev, '',
      `🎯 Pipeline completo — Total: ${totalTime}s`,
      '',
      `📦 Archivos committed:`,
      ...committed.map(f => `  → ${f}`),
      ...(lastCommitUrl ? [``, `🔗 ${lastCommitUrl}`] : []),
    ]);
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
          <a href="/dashboard/agents/debates" style={{
            marginLeft: 'auto', padding: '5px 14px', borderRadius: 8, textDecoration: 'none',
            background: 'linear-gradient(135deg, #00e5b0, #0ea5e9)',
            color: '#fff', fontWeight: 700, fontSize: '0.72rem',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>🎼 Debates</a>
        </div>
      </div>

      {/* Workspace */}
      <div style={{ display: 'flex', flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}>
        {/* Left: Agents */}
        <div style={{ width: 160, flexShrink: 0, background: '#0a0d14', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 10px 6px' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center' }}>Agentes<InfoTip text="Selecciona un agente IA para ejecutar tareas. Hoku fusiona 9 modelos, los demás usan su modelo específico." /></div>
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
                    {isHoku ? <img src="/img/hoku.jpg" alt="Hoku" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.color, boxShadow: sel ? `0 0 6px ${a.color}60` : 'none', flexShrink: 0 }}></span>}
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
            <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: 2, alignItems: 'center' }}>
              {(['chat', 'code', 'sap', 'deploy'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: '3px 8px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 600,
                  background: mode === m ? 'rgba(0,229,176,0.1)' : 'transparent',
                  color: mode === m ? '#00e5b0' : '#475569',
                  border: 'none', cursor: 'pointer', fontFamily: "'Inter', system-ui",
                }}>
                  {m === 'chat' ? '\u{1F4AC}' : m === 'code' ? '</>' : m === 'sap' ? '\u{1F3E2}' : '\u{1F680}'} {m.toUpperCase()}
                </button>
              ))}
              <InfoTip text="Chat: conversación general. Code: genera código commiteable. SAP: consultas SAP FI. Deploy: tareas DevOps y deploy." />
            </div>
            <div style={{ flex: 1 }}></div>
            <button onClick={execute} disabled={running || !task.trim()} style={{ background: running ? '#1a2235' : `linear-gradient(135deg, ${agent.color}, ${agent.color}cc)`, color: running ? '#64748b' : '#0a0d14', border: 'none', padding: '5px 14px', borderRadius: 7, fontWeight: 700, fontSize: '0.7rem', cursor: running ? 'not-allowed' : 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 5 }}>
              {running ? <><span style={{ width: 8, height: 8, border: '2px solid #475569', borderTopColor: agent.color, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }}></span> {fmtTime(elapsed)}</> : <>▶ Run</>}
            </button>
            {!running && <InfoTip text="Ejecuta la tarea con el agente seleccionado. También puedes presionar Enter en el campo de texto." />}
            {running && <button onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setRunning(false); }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '5px 10px', borderRadius: 7, fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>⏹</button>}
            {!running && output && pipeline === 'idle' && (
              <>
                <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }}></div>
                <button onClick={startPipeline} style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 7, fontWeight: 700, fontSize: '0.65rem', cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 12px rgba(59,130,246,0.3)', whiteSpace: 'nowrap' }}>🚀 Deploy</button>
                <InfoTip text="Inicia el pipeline de deploy: guarda en Supabase, commitea código a GitHub y espera el build de Amplify." />
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
                  <img src="/img/hoku.jpg" alt="Hoku" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', marginBottom: 10, opacity: 0.6 }} />
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
                {pipeline === 'preview' ? '👁 Preview — POC Demo' : pipeline === 'confirm' ? 'Confirmar deploy' : pipeline === 'done' ? 'Deploy completado' : pipeline === 'error' ? 'Error' : 'Ejecutando...'}
              </span>
              {(pipeline === 'done' || pipeline === 'error' || pipeline === 'preview') && <button onClick={() => setPipeline('idle')} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>}
            </div>
            <div style={{ padding: '20px' }}>
              {/* PREVIEW STEP — Sandbox before deploy */}
              {pipeline === 'preview' && (
                <>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: 12 }}>
                    Revisa la demo antes de deployar. {detectedFiles.length > 0 ? `${detectedFiles.length} archivo(s) generado(s).` : 'Solo documentación generada.'}
                  </div>
                  {/* Sandbox iframe for HTML/TSX preview */}
                  {detectedFiles.some(f => ['html', 'htm', 'tsx', 'jsx', 'css'].includes(f.lang)) ? (
                    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(139,92,246,0.2)', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(139,92,246,0.04)', borderBottom: '1px solid rgba(139,92,246,0.1)' }}>
                        <div style={{ display: 'flex', gap: 3 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
                        </div>
                        <span style={{ fontSize: '0.62rem', color: '#a78bfa', fontWeight: 700 }}>Preview — POC Demo</span>
                        <span style={{ fontSize: '0.55rem', color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>{detectedFiles[0]?.path || 'preview'}</span>
                      </div>
                      <iframe
                        srcDoc={(() => {
                          const htmlFile = detectedFiles.find(f => ['html', 'htm'].includes(f.lang));
                          if (htmlFile) return htmlFile.content;
                          const tsxFile = detectedFiles.find(f => ['tsx', 'jsx', 'css'].includes(f.lang));
                          if (tsxFile) return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{background:#0a0d14;color:#e2e8f0;font-family:'JetBrains Mono',monospace;font-size:13px;padding:24px;margin:0;line-height:1.7;white-space:pre-wrap}</style></head><body>${tsxFile.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body></html>`;
                          return '<html><body style="background:#0a0d14;color:#64748b;font-family:sans-serif;padding:40px;text-align:center"><h2>Sin preview disponible</h2></body></html>';
                        })()}
                        style={{ width: '100%', height: 350, border: 'none', background: '#fff' }}
                        sandbox="allow-scripts"
                        title="POC Preview"
                      />
                    </div>
                  ) : (
                    <div style={{ background: '#0a0d14', borderRadius: 10, padding: '16px', marginBottom: 14, border: '1px solid rgba(255,255,255,0.06)', maxHeight: 250, overflow: 'auto' }}>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: 8, fontWeight: 700 }}>OUTPUT DEL AGENTE</div>
                      <pre style={{ fontSize: '0.68rem', color: '#d1d5db', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', fontFamily: "'JetBrains Mono', monospace" }}>{output.slice(0, 2000)}</pre>
                    </div>
                  )}
                  {/* Files detected */}
                  {detectedFiles.length > 0 && (
                    <div style={{ background: '#0a0d14', borderRadius: 8, padding: '8px 12px', marginBottom: 14, border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: '0.58rem', color: '#475569', fontWeight: 700, marginBottom: 4 }}>ARCHIVOS ({detectedFiles.length})</div>
                      {detectedFiles.map((f, i) => (
                        <div key={i} style={{ fontSize: '0.62rem', fontFamily: "'JetBrains Mono', monospace", color: '#22c55e', lineHeight: 1.8 }}>
                          {f.path} <span style={{ color: '#475569' }}>({f.lang}, {Math.round(f.content.length / 1024 * 10) / 10}KB)</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setPipeline('idle')} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', padding: '10px', borderRadius: 10, fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>Descartar</button>
                    <button onClick={approvePipeline} style={{ flex: 2, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', border: 'none', padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>✓ Aprobar → Deploy</button>
                  </div>
                </>
              )}

              {pipeline === 'confirm' && (
                <>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.7, marginBottom: 12 }}>
                    Se van a commitear <strong style={{ color: '#f1f5f9' }}>{detectedFiles.length + 1} archivos</strong> de codigo:
                  </div>
                  {detectedFiles.length > 0 ? (
                    <div style={{ background: '#0a0d14', borderRadius: 8, padding: '10px 12px', marginBottom: 12, border: '1px solid rgba(255,255,255,0.04)', maxHeight: 120, overflow: 'auto' }}>
                      {detectedFiles.map((f, i) => (
                        <div key={i} style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", color: '#22c55e', lineHeight: 1.8 }}>
                          {f.path} <span style={{ color: '#475569' }}>({f.lang})</span>
                        </div>
                      ))}
                      <div style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", color: '#64748b', lineHeight: 1.8 }}>
                        docs/improvements/...md <span style={{ color: '#475569' }}>(referencia)</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(245,158,11,0.08)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.7rem', color: '#f59e0b' }}>
                      No se detectaron bloques de codigo con filename. Solo se commiteara el doc .md de referencia.
                    </div>
                  )}
                  <div style={{ background: 'rgba(239,68,68,0.06)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, border: '1px solid rgba(239,68,68,0.15)', fontSize: '0.7rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.9rem' }}>&#9888;&#65039;</span> Esto modificara codigo real del proyecto
                  </div>
                  <select value={targetRepo} onChange={e => setTargetRepo(e.target.value)} style={{ width: '100%', background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: '0.75rem', fontFamily: "'Inter', system-ui", outline: 'none', marginBottom: 12 }}>
                    {repos.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setPipeline('idle')} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', padding: '10px', borderRadius: 10, fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>Cancelar</button>
                    <button onClick={runPipeline} style={{ flex: 2, background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', border: 'none', padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>Confirmar Deploy</button>
                  </div>
                </>
              )}
              {pipeline !== 'confirm' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16 }}>
                    {[
                      { key: 'pushing', label: 'Guardar', timeKey: 'save' },
                      { key: 'deploying', label: 'Commit', timeKey: 'commit' },
                      { key: 'deploying', label: 'Build', timeKey: 'build' },
                      { key: 'done', label: 'Live', timeKey: 'health' },
                    ].map((step, i) => {
                      const steps: PipelineStep[] = ['pushing', 'pushing', 'deploying', 'done'];
                      const ci = pipeline === 'pushing' ? (stepTimes.save ? 1 : 0) : pipeline === 'deploying' ? (stepTimes.commit ? 2 : 1) : pipeline === 'done' ? 4 : 0;
                      const isDone = i < ci || pipeline === 'done'; const isActive = i === ci;
                      const timeMs = stepTimes[step.timeKey]; const timeFmt = timeMs ? `${(timeMs / 1000).toFixed(1)}s` : '';
                      const clr = pipeline === 'error' && isActive ? '#ef4444' : isDone ? '#22c55e' : isActive ? '#3b82f6' : '#334155';
                      return (
                        <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: isDone ? 'rgba(34,197,94,0.15)' : isActive ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)', border: `2px solid ${clr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: clr, transition: 'all 0.3s' }}>
                              {isDone ? '✓' : isActive ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: clr, animation: 'pulse 1s infinite' }}></span> : '○'}
                            </div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 600, color: clr }}>{step.label}</span>
                            {timeFmt && <span style={{ fontSize: '0.5rem', color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>{timeFmt}</span>}
                          </div>
                          {i < 3 && <div style={{ flex: 1, height: 2, background: isDone ? '#22c55e' : 'rgba(255,255,255,0.06)', margin: '0 6px', marginBottom: 24, transition: 'background 0.5s' }}></div>}
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
                  {pipeline === 'done' && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {committedFiles.length > 0 && (
                        <div style={{ background: 'rgba(34,197,94,0.06)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(34,197,94,0.15)' }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#22c55e', marginBottom: 6 }}>Archivos committed:</div>
                          {committedFiles.map((f, i) => (
                            <div key={i} style={{ fontSize: '0.6rem', fontFamily: "'JetBrains Mono', monospace", color: '#94a3b8', lineHeight: 1.6 }}>{f}</div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <a href="/dashboard/improvements" style={{ flex: 1, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#3b82f6', padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer', fontFamily: "'Inter', system-ui", textAlign: 'center', textDecoration: 'none', display: 'block' }}>Ver en Improvements</a>
                        {commitUrl && (
                          <a href={commitUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', padding: '10px', borderRadius: 10, fontWeight: 600, fontSize: '0.7rem', cursor: 'pointer', fontFamily: "'Inter', system-ui", textAlign: 'center', textDecoration: 'none', display: 'block' }}>Ver commit en GitHub</a>
                        )}
                      </div>
                      <button onClick={() => setPipeline('idle')} style={{ width: '100%', background: 'linear-gradient(135deg, #00e5b0, #00c49a)', color: '#0a0d14', border: 'none', padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>Cerrar</button>
                    </div>
                  )}
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
