import { getSession } from '@/lib/auth';
import { supabaseQuery } from '@/lib/supabase';
import { sendGmail } from '@/lib/gmail';

// POST — Enviar reporte semanal por email
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    // Cargar datos
    const [kaizen, andon, ooda] = await Promise.all([
      supabaseQuery('kaizen_audits', 'GET', { order: 'created_at.desc', limit: 5 }),
      supabaseQuery('andon_signals', 'GET', { order: 'project.asc' }),
      supabaseQuery('ooda_decisions', 'GET', { order: 'created_at.desc', limit: 10 }),
    ]) as [Record<string, unknown>[], Record<string, unknown>[], Record<string, unknown>[]];

    const latest = kaizen[0];
    const score = (latest?.score_global as string) || '—';
    const scoreColor = { A: '#22c55e', B: '#00e5b0', C: '#f59e0b', D: '#f97316', F: '#ef4444' }[score] || '#64748b';

    // Agrupar andon por proyecto
    const andonByProject: Record<string, Record<string, unknown>[]> = {};
    andon.forEach(s => {
      const p = s.project as string;
      if (!andonByProject[p]) andonByProject[p] = [];
      andonByProject[p].push(s);
    });

    const statusIcon = (s: string) => s === 'green' ? '🟢' : s === 'yellow' ? '🟡' : '🔴';
    const now = new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Construir HTML del email
    const html = `
    <div style="font-family:'Inter',system-ui,sans-serif;max-width:680px;margin:0 auto;background:#0a0d14;color:#f1f5f9;border-radius:16px;overflow:hidden;">
      <div style="padding:32px 28px;background:linear-gradient(135deg,${scoreColor}15,rgba(10,13,20,0.95));border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="display:flex;align-items:center;gap:16px;">
          <span style="font-size:3rem;font-weight:900;color:${scoreColor};text-shadow:0 0 40px ${scoreColor}40;">${score}</span>
          <div>
            <div style="font-size:1.3rem;font-weight:800;color:#fff;">Reporte Semanal Ops Center</div>
            <div style="font-size:0.85rem;color:#94a3b8;">${now} · Smart Connection</div>
          </div>
        </div>
      </div>

      <!-- Andon Board -->
      <div style="padding:24px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="font-size:0.9rem;font-weight:700;color:#00e5b0;margin-bottom:14px;">🚦 Andon Board — Estado de Proyectos</div>
        ${Object.entries(andonByProject).map(([project, signals]) => `
          <div style="margin-bottom:12px;">
            <div style="font-size:0.85rem;font-weight:700;color:#e2e8f0;margin-bottom:6px;">${project}</div>
            ${signals.map(s => `
              <div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:0.8rem;color:#cbd5e1;">
                ${statusIcon(s.status as string)} ${s.area} — <span style="color:${scoreColor};font-weight:700;">${s.score}</span>
                <span style="color:#64748b;font-size:0.7rem;">${s.detail || ''}</span>
              </div>
            `).join('')}
          </div>
        `).join('')}
        ${Object.keys(andonByProject).length === 0 ? '<div style="color:#64748b;font-size:0.8rem;">Sin señales aún. Ejecuta un audit desde el Ops Center.</div>' : ''}
      </div>

      <!-- Kaizen -->
      <div style="padding:24px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="font-size:0.9rem;font-weight:700;color:#f59e0b;margin-bottom:14px;">📊 Último Kaizen (#${latest?.audit_number || '—'})</div>
        ${latest ? `
          <div style="font-size:0.8rem;color:#cbd5e1;line-height:1.6;">
            ${((latest.criticals as string[]) || []).length > 0 ? `<div style="margin-bottom:8px;"><strong style="color:#ef4444;">Críticos:</strong> ${(latest.criticals as string[]).join(', ')}</div>` : ''}
            ${((latest.improvements as string[]) || []).length > 0 ? `<div style="margin-bottom:8px;"><strong style="color:#f59e0b;">Mejoras:</strong> ${(latest.improvements as string[]).join(', ')}</div>` : ''}
            ${((latest.positives as string[]) || []).length > 0 ? `<div style="margin-bottom:8px;"><strong style="color:#22c55e;">Positivo:</strong> ${(latest.positives as string[]).join(', ')}</div>` : ''}
            ${((latest.top_actions as string[]) || []).length > 0 ? `<div><strong style="color:#00e5b0;">Acciones:</strong><br/>${(latest.top_actions as string[]).map((a, i) => `${i + 1}. ${a}`).join('<br/>')}</div>` : ''}
          </div>
        ` : '<div style="color:#64748b;font-size:0.8rem;">Sin auditorías aún.</div>'}
      </div>

      <!-- OODA Decisions -->
      ${ooda.length > 0 ? `
      <div style="padding:24px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="font-size:0.9rem;font-weight:700;color:#8b5cf6;margin-bottom:14px;">🔄 Últimas Decisiones OODA</div>
        ${ooda.slice(0, 5).map(d => `
          <div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.03);font-size:0.8rem;">
            <div style="font-weight:700;color:#e2e8f0;">${d.title}</div>
            <div style="color:#64748b;font-size:0.7rem;margin-top:2px;">${d.project || ''} ${d.agent ? `· ${d.agent}` : ''} · ${new Date(d.created_at as string).toLocaleDateString('es-CL')}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <!-- Footer -->
      <div style="padding:20px 28px;text-align:center;">
        <a href="https://intranet.smconnection.cl/dashboard/ops-center" style="display:inline-block;padding:10px 28px;border-radius:10px;background:linear-gradient(135deg,#00e5b0,#0ea5e9);color:#fff;font-weight:700;font-size:0.85rem;text-decoration:none;">
          Abrir Ops Center
        </a>
        <div style="font-size:0.65rem;color:#475569;margin-top:12px;">
          🔍 Arielito — Reporte automático semanal · Smart Connection
        </div>
      </div>
    </div>`;

    // Enviar con Gmail API (Google Workspace SmartConnection)
    const result = await sendGmail({
      to: 'guillermo.gonzalez@smconnection.cl',
      subject: `📊 Ops Center Semanal — Score ${score} — ${now}`,
      html,
    });

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json({ sent: true, messageId: result.messageId });
  } catch (err) {
    console.error('[ops-email] Error:', err);
    return Response.json({ error: 'Error enviando reporte' }, { status: 500 });
  }
}
