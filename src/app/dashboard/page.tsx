'use client';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [agents, setAgents] = useState<Record<string, unknown>[]>([]);
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [leads, setLeads] = useState(0);
  const [meetings, setMeetings] = useState(0);

  const api = (payload: Record<string, unknown>) =>
    fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json());

  const refresh = () => {
    api({ action: 'list' }).then(d => { if (d.agents) setAgents(d.agents); });
    api({ action: 'query', table: 'leads', limit: 1000 }).then(d => { if (d.data) setLeads(d.data.length); });
    api({ action: 'query', table: 'reuniones', limit: 1000 }).then(d => { if (d.data) setMeetings(d.data.length); });
    Promise.all(['claude','groq','grok','gemini','deployer'].map(id => api({ action: 'logs', agentId: id })))
      .then(results => {
        const all = results.flatMap(r => r.logs || []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());
        setLogs(all.slice(0, 10));
      });
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    const onVis = () => { document.hidden ? clearInterval(interval) : refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  const active = agents.filter(a => a.active).length;
  const tasks = agents.reduce((s, a) => s + ((a.tasks_count as number) || 0), 0);
  const colors: Record<string, string> = { claude: '#00e5b0', groq: '#f59e0b', grok: '#8b5cf6', gemini: '#22c55e', deployer: '#3b82f6' };
  const icons: Record<string, string> = { claude: 'bi-robot', groq: 'bi-cpu', grok: 'bi-lightning-charge', gemini: 'bi-gem', deployer: 'bi-gear-wide-connected' };

  return (
    <>
      <div className="sticky top-0 z-50 bg-[#111827]/85 backdrop-blur-xl border-b border-white/[0.06] h-14 flex items-center px-8 text-sm text-[#94a3b8]">
        <span>Intranet</span><span className="mx-2 text-[#475569]">/</span><span className="text-white font-semibold">Dashboard</span>
      </div>
      <div className="p-6 flex-1">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {[
            { icon: 'bi-robot', value: active, label: 'Agentes Activos', color: '#00e5b0' },
            { icon: 'bi-lightning-charge', value: tasks, label: 'Tareas Hoy', color: '#8b5cf6' },
            { icon: 'bi-people', value: leads, label: 'Leads', color: '#3b82f6' },
            { icon: 'bi-calendar-check', value: meetings, label: 'Reuniones', color: '#f59e0b' },
            { icon: 'bi-rocket-takeoff', value: new Date().toLocaleDateString('es-CL'), label: 'Ultimo Deploy', color: '#22c55e', small: true },
            { icon: 'bi-coin', value: 0, label: 'Tokens IA', color: '#f97316' },
          ].map((kpi, i) => (
            <div key={i} className="bg-[#111827] border border-white/[0.06] rounded-[10px] p-5 relative overflow-hidden hover:border-white/[0.1] transition-all">
              <div className="text-base mb-3" style={{ color: kpi.color }}><i className={`bi ${kpi.icon}`}></i></div>
              <div className={`font-black tracking-tight leading-none ${kpi.small ? 'text-sm' : 'text-2xl'}`} style={{ color: '#f1f5f9' }}>{kpi.value}</div>
              <div className="text-[0.7rem] text-[#94a3b8] mt-1.5 font-medium">{kpi.label}</div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: kpi.color }}></div>
            </div>
          ))}
        </div>

        {/* Agents + Live Feed */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          <div className="xl:col-span-3 bg-[#111827] border border-white/[0.06] rounded-[16px] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-[0.85rem] font-bold flex items-center gap-2"><i className="bi bi-robot text-[#00e5b0]"></i> Agentes IA</h3>
              <a href="/dashboard/agents" className="text-[0.7rem] text-[#94a3b8] hover:text-[#00e5b0] transition-colors">Ver todos &rarr;</a>
            </div>
            <table className="w-full">
              <thead><tr className="text-left text-[0.65rem] text-[#475569] uppercase tracking-wider">
                <th className="px-5 py-2.5">Agente</th><th className="px-3 py-2.5">Modelo</th><th className="px-3 py-2.5">Estado</th><th className="px-3 py-2.5">Tareas</th>
              </tr></thead>
              <tbody>
                {agents.map((a, i) => (
                  <tr key={i} className="border-t border-white/[0.04] hover:bg-[#00e5b0]/[0.03] transition-colors">
                    <td className="px-5 py-2.5 text-[0.78rem]">
                      <span style={{ color: colors[a.agent_id as string] || '#94a3b8' }}><i className={`bi ${icons[a.agent_id as string] || 'bi-cpu'}`}></i></span>
                      {' '}{a.name as string}
                    </td>
                    <td className="px-3 py-2.5 text-[0.7rem] font-mono text-[#475569]">{(a.model as string) || '\u2014'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[0.6rem] font-semibold px-2 py-0.5 rounded-full ${a.active ? 'bg-[#22c55e]/[0.12] text-[#22c55e]' : 'bg-[#f59e0b]/[0.12] text-[#f59e0b]'}`}>
                        {a.active ? 'Activo' : 'Standby'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[0.78rem] text-[#94a3b8]">{(a.tasks_count as number) || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="xl:col-span-2 bg-[#111827] border border-white/[0.06] rounded-[16px] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.06]">
              <h3 className="text-[0.85rem] font-bold flex items-center gap-2"><i className="bi bi-terminal text-[#00e5b0]"></i> Live Feed</h3>
            </div>
            <div className="p-4 font-mono text-[0.72rem] leading-[1.7] max-h-[300px] overflow-y-auto" style={{ background: '#0a0d14' }}>
              {logs.length === 0 ? (
                <div className="text-[#475569]">Esperando actividad...</div>
              ) : logs.map((l, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-[#475569] min-w-[60px]">{l.created_at ? new Date(l.created_at as string).toLocaleTimeString('es-CL', {hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '--:--:--'}</span>
                  <span className={`font-semibold min-w-[48px] ${l.status === 'error' ? 'text-[#ef4444]' : 'text-[#00e5b0]'}`}>{((l.agent_name || l.agent_id) as string || '').toUpperCase().substring(0, 6)}</span>
                  <span className="text-[#94a3b8]">{((l.detail || l.action) as string || '').substring(0, 80)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
