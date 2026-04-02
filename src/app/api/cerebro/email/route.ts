import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const LEVEL_MAP: Record<string, { pct: number; color: string; label: string; ring: number }> = {
  no_expuesto: { pct: 10, color: '#ef4444', label: 'No expuesto', ring: 36 },
  explorando:  { pct: 30, color: '#f97316', label: 'Explorando', ring: 108 },
  practicando: { pct: 50, color: '#eab308', label: 'Practicando', ring: 180 },
  competente:  { pct: 80, color: '#22c55e', label: 'Competente', ring: 288 },
  enseñable:   { pct: 100, color: '#00e5b0', label: 'Enseñable', ring: 360 },
}
const LEVEL_ORDER = ['no_expuesto', 'explorando', 'practicando', 'competente', 'enseñable']

const DOMAIN_EMOJI: Record<string, string> = {
  agents: '🤖', prompts: '📝', architecture: '🏗️', integrations: '🔌',
  testing: '🧪', llmops: '📊', security: '🔒', frontend: '🎨', business: '💼',
}
const PROJECT_EMOJI: Record<string, string> = {
  intranet: '🏢', marketing: '🌐', voy: '🚀', infopet: '🐾', marketplace: '🛒',
}
const TYPE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  celebration: { label: 'Victoria', emoji: '🏆', color: '#22c55e' },
  lesson:      { label: 'Aprendizaje', emoji: '📚', color: '#3b82f6' },
  pattern:     { label: 'Patrón', emoji: '🔍', color: '#a855f7' },
  struggle:    { label: 'Desafío', emoji: '🎯', color: '#f59e0b' },
  prediction:  { label: 'Predicción', emoji: '🔮', color: '#0ea5e9' },
  insight:     { label: 'Insight', emoji: '💡', color: '#ec4899' },
  evolution:   { label: 'Evolución', emoji: '🌀', color: '#10b981' },
}

export async function GET() {
  try {
    const { data: allData, error } = await supabase
      .from('cerebro_knowledge')
      .select('*')
      .order('last_discussed', { ascending: false })

    if (error) throw error
    if (!allData?.length) return NextResponse.json({ error: 'No data' }, { status: 404 })

    // Aggregate domains
    const domainMap = new Map<string, { levels: string[]; count: number }>()
    allData.forEach(r => {
      const e = domainMap.get(r.domain) || { levels: [], count: 0 }
      e.levels.push(r.guillermo_level); e.count++
      domainMap.set(r.domain, e)
    })
    const domains = Array.from(domainMap.entries()).map(([domain, { levels, count }]) => {
      const sorted = levels.sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b))
      return { domain, count, level: sorted[Math.floor(sorted.length / 2)] }
    }).sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level))

    // Aggregate projects
    const projMap = new Map<string, any[]>()
    allData.forEach(r => { if (r.project) { const l = projMap.get(r.project) || []; l.push(r); projMap.set(r.project, l) } })
    const projects = Array.from(projMap.entries()).sort((a, b) => b[1].length - a[1].length)

    // Categorize
    const celebrations = allData.filter(d => d.type === 'celebration').slice(0, 3)
    const struggles = allData.filter(d => d.type === 'struggle').slice(0, 5)
    const predictions = allData.filter(d => d.type === 'prediction').slice(0, 3)
    const insights = allData.filter(d => d.type === 'insight' || d.type === 'pattern').slice(0, 5)

    const date = new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const lowestDomain = domains[0]

    // Generate JSON payload for the HTML template
    const payload = JSON.stringify({
      date, total: allData.length, domainCount: domains.length, projectCount: projects.length,
      celebrationCount: celebrations.length,
      domains: domains.map(d => ({ ...d, ...LEVEL_MAP[d.level], emoji: DOMAIN_EMOJI[d.domain] || '📌' })),
      projects: projects.map(([name, items]) => ({
        name, emoji: PROJECT_EMOJI[name] || '📁', count: items.length,
        items: items.slice(0, 6).map(i => ({
          concept: i.concept, level: i.guillermo_level,
          color: LEVEL_MAP[i.guillermo_level]?.color || '#64748b',
          type: i.type
        }))
      })),
      celebrations: celebrations.map(c => ({ ...c, typeConfig: TYPE_CONFIG[c.type] })),
      struggles: struggles.map(c => ({ ...c, typeConfig: TYPE_CONFIG[c.type], levelConfig: LEVEL_MAP[c.guillermo_level] })),
      predictions: predictions.map(c => ({ ...c, typeConfig: TYPE_CONFIG[c.type] })),
      insights: insights.map(c => ({ ...c, typeConfig: TYPE_CONFIG[c.type], levelConfig: LEVEL_MAP[c.guillermo_level] })),
      nextUnlock: lowestDomain ? `${DOMAIN_EMOJI[lowestDomain.domain] || '📌'} ${lowestDomain.domain} — ${LEVEL_MAP[lowestDomain.level]?.label}` : 'En progreso',
    })

    const html = buildInteractiveHTML(payload)
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function buildInteractiveHTML(payloadJSON: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>🧠 Cerebro — Reporte de Evolución</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#060912;--surface:#0a0d14;--elevated:#0f1520;
  --glass:rgba(15,22,35,0.85);--border:rgba(255,255,255,0.06);
  --text:#f1f5f9;--muted:#94a3b8;--dim:#475569;
  --accent:#00e5b0;--blue:#00b4d8;--purple:#a855f7;
  --radius:16px;
}
body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;overflow-x:hidden;min-height:100vh}
.wrap{max-width:800px;margin:0 auto;padding:24px 16px;position:relative;z-index:1}

/* === PARTICLES === */
.bg-particles{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.orb{position:absolute;border-radius:50%;filter:blur(80px);opacity:.12;animation:drift 25s infinite ease-in-out}
.orb:nth-child(1){width:400px;height:400px;background:var(--accent);top:-100px;right:-150px}
.orb:nth-child(2){width:300px;height:300px;background:var(--blue);bottom:20%;left:-120px;animation-delay:-8s}
.orb:nth-child(3){width:200px;height:200px;background:var(--purple);top:40%;right:-80px;animation-delay:-16s}
@keyframes drift{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,-40px) scale(1.1)}66%{transform:translate(-30px,30px) scale(.9)}}

/* === SCROLL REVEAL === */
.reveal{opacity:0;transform:translateY(30px);transition:opacity .6s ease,transform .6s ease}
.reveal.visible{opacity:1;transform:translateY(0)}

/* === HEADER === */
.header{background:var(--glass);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid var(--border);border-radius:24px;padding:32px;margin-bottom:20px;
  position:relative;overflow:hidden}
.header::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;
  background:linear-gradient(90deg,var(--accent),var(--blue),var(--purple));
  background-size:200% 100%;animation:shimmer 3s linear infinite}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.header h1{font-size:clamp(22px,4.5vw,30px);font-weight:900;
  background:linear-gradient(135deg,var(--accent),var(--blue));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px}
.header .sub{color:var(--dim);font-size:12px}

/* === INFO TIP === */
.info-tip{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;
  border-radius:50%;background:rgba(0,229,176,.12);color:var(--accent);font-size:10px;font-weight:800;
  cursor:pointer;position:relative;flex-shrink:0;border:1px solid rgba(0,229,176,.2);
  transition:all .2s;margin-left:6px;vertical-align:middle}
.info-tip:hover{background:rgba(0,229,176,.25);transform:scale(1.15)}
.info-tip .tip-popup{position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%) scale(.9);
  background:var(--elevated);color:var(--muted);padding:12px 16px;border-radius:12px;
  font-size:12px;line-height:1.5;width:260px;white-space:normal;font-weight:400;
  opacity:0;pointer-events:none;transition:all .25s cubic-bezier(.175,.885,.32,1.275);
  border:1px solid var(--border);box-shadow:0 12px 40px rgba(0,0,0,.4);z-index:100}
.info-tip .tip-popup::after{content:'';position:absolute;top:100%;left:50%;
  transform:translateX(-50%);border:6px solid transparent;border-top-color:var(--elevated)}
.info-tip:hover .tip-popup,.info-tip.active .tip-popup{opacity:1;pointer-events:auto;transform:translateX(-50%) scale(1)}
.tip-title{color:var(--accent);font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}

/* === STATS — HORIZONTAL SCROLL === */
.stats-scroll{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;
  padding:20px 0 8px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.stats-scroll::-webkit-scrollbar{display:none}
.stat{flex:0 0 auto;min-width:140px;scroll-snap-align:start;
  background:rgba(0,229,176,.06);border:1px solid rgba(0,229,176,.1);
  border-radius:14px;padding:16px 20px;text-align:center;
  transition:all .3s;cursor:pointer;position:relative}
.stat:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(0,229,176,.12);border-color:rgba(0,229,176,.3)}
.stat-n{font-size:clamp(28px,5vw,40px);font-weight:900;
  background:linear-gradient(135deg,var(--accent),var(--blue));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent}
.stat-l{font-size:11px;color:var(--dim);margin-top:4px;text-transform:uppercase;letter-spacing:.5px}
.scroll-hint{text-align:center;font-size:11px;color:var(--dim);margin-top:4px;animation:fadeHint 3s forwards}
@keyframes fadeHint{0%,80%{opacity:1}100%{opacity:0}}

/* === SECTION === */
.section{background:var(--glass);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border:1px solid var(--border);border-radius:20px;padding:24px;margin-bottom:20px;
  transition:border-color .3s,box-shadow .3s}
.section:hover{border-color:rgba(0,229,176,.12);box-shadow:0 0 30px rgba(0,229,176,.03)}
.section-header{display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.section-header h2{font-size:17px;font-weight:700;margin:0}

/* === RINGS — HORIZONTAL CAROUSEL === */
.rings-track{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;
  padding:4px 0 12px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.rings-track::-webkit-scrollbar{display:none}
.ring-item{flex:0 0 130px;scroll-snap-align:start;text-align:center;padding:16px 10px;
  border-radius:14px;background:rgba(30,41,59,.3);border:1px solid var(--border);
  transition:all .3s;cursor:pointer}
.ring-item:hover{transform:translateY(-4px);border-color:var(--ring-color);
  box-shadow:0 4px 20px color-mix(in srgb, var(--ring-color) 20%, transparent)}
.ring-svg{width:72px;height:72px;transform:rotate(-90deg)}
.ring-bg{fill:none;stroke:#1e293b;stroke-width:6}
.ring-fill{fill:none;stroke-width:6;stroke-linecap:round;
  stroke-dasharray:var(--dash);stroke-dashoffset:var(--dash);
  transition:stroke-dashoffset 1.5s ease-out}
.ring-item.visible .ring-fill{stroke-dashoffset:var(--offset)}
.ring-label{font-size:11px;color:var(--muted);margin-top:6px}
.ring-level{font-size:10px;font-weight:700;margin-top:2px}
.ring-count{font-size:9px;color:var(--dim)}

/* === TWO-COLUMN LAYOUT === */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
@media(max-width:640px){.two-col{grid-template-columns:1fr}}

/* === CEREBRO TEACHES — MICRO LESSON === */
.lesson-box{background:linear-gradient(135deg,rgba(0,229,176,.06),rgba(168,85,247,.06));
  border:1px solid rgba(0,229,176,.15);border-radius:var(--radius);padding:20px;
  position:relative;overflow:hidden}
.lesson-box::before{content:'🧠';position:absolute;right:12px;top:12px;font-size:24px;opacity:.15}
.lesson-tag{font-size:10px;color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px}
.lesson-q{font-size:15px;font-weight:700;line-height:1.4;margin-bottom:10px}
.lesson-answer{max-height:0;overflow:hidden;transition:max-height .4s ease,opacity .3s;opacity:0;
  color:var(--muted);font-size:13px;line-height:1.6}
.lesson-box.open .lesson-answer{max-height:300px;opacity:1}
.lesson-btn{display:inline-block;margin-top:10px;padding:6px 16px;border-radius:20px;
  background:rgba(0,229,176,.1);color:var(--accent);font-size:12px;font-weight:600;
  cursor:pointer;border:1px solid rgba(0,229,176,.2);transition:all .2s}
.lesson-btn:hover{background:rgba(0,229,176,.2);transform:translateY(-1px)}
.lesson-box.open .lesson-btn{display:none}

/* === MODAL/POPUP === */
.modal-overlay{position:fixed;inset:0;background:rgba(6,9,18,.85);backdrop-filter:blur(8px);
  z-index:1000;display:none;align-items:center;justify-content:center;padding:20px;
  animation:fadeIn .2s ease}
.modal-overlay.active{display:flex}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.modal{background:var(--elevated);border:1px solid var(--border);border-radius:20px;
  padding:28px;max-width:500px;width:100%;max-height:80vh;overflow-y:auto;
  position:relative;animation:popIn .3s cubic-bezier(.175,.885,.32,1.275)}
@keyframes popIn{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}
.modal-close{position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:50%;
  background:rgba(255,255,255,.06);border:1px solid var(--border);color:var(--muted);
  font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:all .2s}
.modal-close:hover{background:rgba(239,68,68,.15);color:#ef4444;border-color:rgba(239,68,68,.3)}
.modal h3{font-size:18px;font-weight:800;margin-bottom:12px;padding-right:40px}
.modal-bar{height:8px;border-radius:4px;background:#1e293b;margin:8px 0;overflow:hidden}
.modal-bar-fill{height:100%;border-radius:4px;transition:width 1s ease-out}
.modal-stat{display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px}
.modal-stat .label{color:var(--muted)}.modal-stat .val{font-weight:700}
.modal-concepts{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}
.modal-chip{padding:5px 12px;border-radius:12px;font-size:11px;font-weight:500;
  border:1px solid var(--border);background:rgba(30,41,59,.4)}

/* === CARDS — HORIZONTAL SCROLL PER SECTION === */
.cards-track{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;
  padding:4px 0 12px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.cards-track::-webkit-scrollbar{display:none}
.hcard{flex:0 0 280px;scroll-snap-align:start;background:rgba(30,41,59,.4);
  border:1px solid var(--border);border-radius:var(--radius);padding:18px;
  transition:all .3s;cursor:pointer;position:relative;overflow:hidden}
.hcard:hover{transform:translateY(-3px);border-color:rgba(0,229,176,.25);
  box-shadow:0 8px 24px rgba(0,229,176,.06)}
.badge{padding:4px 10px;border-radius:20px;font-size:10px;font-weight:600;display:inline-block}
.hcard-title{font-size:14px;font-weight:700;margin:8px 0 6px;text-transform:capitalize}
.hcard-obs{color:var(--muted);font-size:12px;line-height:1.5;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.hcard-foot{display:flex;justify-content:space-between;align-items:center;margin-top:12px;
  padding-top:10px;border-top:1px solid var(--border)}
.hcard-foot .see-more{font-size:11px;color:var(--accent);font-weight:600}

/* === PROJECT PILLS — HORIZONTAL === */
.proj-track{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;
  padding:4px 0 8px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.proj-track::-webkit-scrollbar{display:none}
.proj{flex:0 0 260px;scroll-snap-align:start;background:rgba(30,41,59,.3);
  border:1px solid var(--border);border-radius:14px;padding:16px;transition:all .3s;cursor:pointer}
.proj:hover{border-color:rgba(0,180,216,.3);box-shadow:0 4px 20px rgba(0,180,216,.06);transform:translateY(-2px)}
.proj-name{font-size:15px;font-weight:700}
.proj-count{font-size:11px;color:var(--dim);font-weight:500;margin-top:2px}
.pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
.pill{padding:3px 9px;border-radius:12px;font-size:10px;font-weight:500;
  background:color-mix(in srgb, var(--c) 12%, transparent);
  color:var(--c);border:1px solid color-mix(in srgb, var(--c) 20%, transparent)}

/* === UNLOCK === */
.unlock{background:linear-gradient(135deg,rgba(0,229,176,.08),rgba(0,180,216,.08));
  border:1px solid rgba(0,229,176,.2);border-radius:var(--radius);padding:20px;
  position:relative;overflow:hidden}
.unlock::after{content:'⚡';position:absolute;right:16px;top:50%;transform:translateY(-50%);
  font-size:32px;opacity:.15;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{transform:translateY(-50%) scale(1)}50%{transform:translateY(-50%) scale(1.15)}}
.unlock-tag{font-size:10px;color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px}
.unlock-text{font-size:15px;font-weight:600}

/* === CONFETTI === */
.confetti-container{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999}
.confetti-piece{position:absolute;width:8px;height:8px;border-radius:2px;animation:fall linear forwards}
@keyframes fall{0%{transform:translateY(-20px) rotate(0);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}

/* === FOOTER === */
.footer{text-align:center;padding:28px 0 16px;color:var(--dim);font-size:12px}
.footer a{color:var(--accent);text-decoration:none;font-weight:600}
.footer a:hover{text-decoration:underline}

/* === RESPONSIVE === */
@media(max-width:600px){
  .header{padding:24px 18px}
  .section{padding:18px}
  .hcard{flex:0 0 240px}
  .two-col{gap:14px}
}
@media(prefers-reduced-motion:reduce){
  .reveal{opacity:1;transform:none;transition:none}
  .orb,.confetti-piece{animation:none}
  .ring-fill{transition:none}
  *{transition:none!important;animation:none!important}
}
</style>
</head>
<body>

<div class="bg-particles"><div class="orb"></div><div class="orb"></div><div class="orb"></div></div>
<div class="modal-overlay" id="modal"><div class="modal" id="modal-content"></div></div>

<div class="wrap" id="app"></div>

<script>
const D = ${payloadJSON};
const app = document.getElementById('app');
const modalOverlay = document.getElementById('modal');
const modalContent = document.getElementById('modal-content');

// === HELPERS ===
const LEVEL_EXPLAIN = {
  'No expuesto':'Aún no has trabajado con este tema en tus proyectos.',
  'Explorando':'Has visto este concepto pero no lo has aplicado de forma autónoma.',
  'Practicando':'Lo estás usando en proyectos reales — cada vez con más confianza.',
  'Competente':'Lo dominas. Puedes tomar decisiones con este concepto sin ayuda.',
  'Enseñable':'Podrías explicarlo a otro. El conocimiento es tuyo.'
};
const DOMAIN_EXPLAIN = {
  agents:'Cómo orquestar múltiples agentes IA que colaboran entre sí.',
  prompts:'Técnicas para escribir instrucciones que la IA entienda mejor.',
  architecture:'Diseño de sistemas: cómo las piezas encajan y escalan.',
  integrations:'Conectar servicios externos: APIs, webhooks, data mapping.',
  testing:'Verificar que lo construido funciona — antes y después de deploy.',
  llmops:'Observabilidad de IA: costos, latencia, calidad en producción.',
  security:'Proteger datos, prevenir ataques, cumplir regulaciones.',
  frontend:'Lo que el usuario ve y toca: UI, responsive, performance.',
  business:'Usar IA para resolver problemas de negocio, no solo técnicos.'
};

// === MODAL ===
function openModal(html) {
  modalContent.innerHTML = '<button class="modal-close" onclick="closeModal()">✕</button>' + html;
  modalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  modalOverlay.classList.remove('active');
  document.body.style.overflow = '';
}
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// === INFO TIP (toggle on mobile) ===
function setupTips() {
  document.querySelectorAll('.info-tip').forEach(tip => {
    tip.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.info-tip.active').forEach(t => { if(t!==tip) t.classList.remove('active'); });
      tip.classList.toggle('active');
    });
  });
}

// === CONFETTI ===
if (D.celebrationCount > 0) {
  const c = document.createElement('div'); c.className = 'confetti-container'; document.body.appendChild(c);
  const colors = ['#00e5b0','#00b4d8','#a855f7','#f59e0b','#ec4899','#3b82f6'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div'); p.className = 'confetti-piece';
    p.style.cssText = 'left:'+Math.random()*100+'%;background:'+colors[i%6]+';animation-duration:'+(2+Math.random()*3)+'s;animation-delay:'+Math.random()*2+'s;width:'+(5+Math.random()*5)+'px;height:'+(5+Math.random()*5)+'px';
    c.appendChild(p);
  }
  setTimeout(() => c.remove(), 6000);
}

// === SCROLL REVEAL ===
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target)}});
}, { threshold: 0.1 });
function reveal(el) { el.classList.add('reveal'); obs.observe(el); return el; }

// ============== BUILD LAYOUT ==============

// === HEADER ===
const header = document.createElement('div'); header.className = 'header';
header.innerHTML = \`
  <h1>🧠 Cerebro — Reporte de Evolución</h1>
  <div class="sub">\${D.date}</div>
  <div class="stats-scroll">
    <div class="stat" onclick="openModal(buildStatsModal('concepts'))">
      <div class="stat-n">\${D.total}</div><div class="stat-l">Conceptos</div>
    </div>
    <div class="stat" onclick="openModal(buildStatsModal('domains'))">
      <div class="stat-n">\${D.domainCount}</div><div class="stat-l">Dominios</div>
    </div>
    <div class="stat" onclick="openModal(buildStatsModal('projects'))">
      <div class="stat-n">\${D.projectCount}</div><div class="stat-l">Proyectos</div>
    </div>
    <div class="stat" onclick="openModal(buildStatsModal('victories'))">
      <div class="stat-n">\${D.celebrationCount}</div><div class="stat-l">Victorias</div>
    </div>
  </div>
  <div class="scroll-hint">← desliza para ver más →</div>
\`;
app.appendChild(reveal(header));

// Stats modal builder
window.buildStatsModal = function(type) {
  const m = {
    concepts: '<h3>📚 Conceptos de IA</h3><p style="color:var(--muted);font-size:13px;line-height:1.6;margin-bottom:14px">Cada concepto es un tema de IA que Cerebro ha detectado en tu trabajo. Van desde prompts básicos hasta arquitectura de agentes multi-modelo. <br><br><strong style="color:var(--accent)">¿Cómo suben?</strong> Cuando usas un concepto en un proyecto real, Cerebro detecta tu nivel y lo registra.</p>',
    domains: '<h3>🗂️ Dominios de Conocimiento</h3><p style="color:var(--muted);font-size:13px;line-height:1.6;margin-bottom:14px">Los dominios son las 9 áreas grandes de IA que Cerebro mapea. Cada dominio tiene conceptos ordenados de básico a avanzado. <br><br><strong style="color:var(--accent)">Tu progresión:</strong> No necesitas dominar todos — algunos son más relevantes para lo que construyes.</p>',
    projects: '<h3>🗺️ Proyectos Activos</h3><p style="color:var(--muted);font-size:13px;line-height:1.6;margin-bottom:14px">Cerebro conecta cada concepto con el proyecto donde lo aplicaste. Así aprendes en contexto, no en abstracto. <br><br><strong style="color:var(--accent)">Lo importante:</strong> No es cuántos proyectos, sino qué tan profundo llegas en cada uno.</p>',
    victories: '<h3>🏆 Victorias Reconocidas</h3><p style="color:var(--muted);font-size:13px;line-height:1.6;margin-bottom:14px">Momentos donde hiciste algo notable — a veces sin darte cuenta. Cerebro los detecta y celebra. <br><br><strong style="color:var(--accent)">¿Por qué importa?</strong> Reconocer progreso evita el síndrome del impostor. Construiste un sistema de 10 agentes — eso no es trivial.</p>'
  };
  return m[type] || '';
};

// === TWO-COLUMN: RINGS + LESSON ===
const twoCol = document.createElement('div'); twoCol.className = 'two-col';

// Left: Rings carousel
const ringCol = document.createElement('div'); ringCol.className = 'section';
const circ = 2 * Math.PI * 28;
ringCol.innerHTML = \`
  <div class="section-header">
    <h2>📊 Mapa de Conocimiento</h2>
    <span class="info-tip">i<div class="tip-popup"><div class="tip-title">¿Qué es esto?</div>Cada anillo muestra tu nivel en un área de IA. El color y el % indican qué tan avanzado estás. <strong>Click en un anillo</strong> para ver detalle.</div></span>
  </div>
  <div class="rings-track">
    \${D.domains.map((d,i) => {
      const off = circ - (circ * d.pct / 100);
      return \`<div class="ring-item reveal" style="--ring-color:\${d.color}" onclick="openDomainModal(\${i})">
        <svg class="ring-svg" viewBox="0 0 64 64">
          <circle class="ring-bg" cx="32" cy="32" r="28"/>
          <circle class="ring-fill" cx="32" cy="32" r="28" stroke="\${d.color}" style="--dash:\${circ};--offset:\${off}"/>
        </svg>
        <div class="ring-label">\${d.emoji} \${d.domain}</div>
        <div class="ring-level" style="color:\${d.color}">\${d.label}</div>
      </div>\`
    }).join('')}
  </div>
\`;
twoCol.appendChild(ringCol);

// Right: Micro-lesson from Cerebro
const lessonCol = document.createElement('div'); lessonCol.style.display='flex';lessonCol.style.flexDirection='column';lessonCol.style.gap='14px';
// Unlock
const unlock = document.createElement('div'); unlock.className = 'unlock';
unlock.innerHTML = \`<div class="unlock-tag">⚡ Próximo Unlock</div><div class="unlock-text">\${D.nextUnlock}</div>\`;
lessonCol.appendChild(unlock);
// Lesson
const topStruggle = D.struggles[0];
if (topStruggle) {
  const lesson = document.createElement('div'); lesson.className = 'lesson-box';
  lesson.innerHTML = \`
    <div class="lesson-tag">🧠 Cerebro te enseña</div>
    <div class="lesson-q">¿Sabes qué es <em>\${(topStruggle.concept||'').replace(/-/g,' ')}</em>?</div>
    <div class="lesson-answer">
      \${topStruggle.teaching_moment ? '<p>'+topStruggle.teaching_moment+'</p>' : ''}
      \${topStruggle.analogy ? '<p style="margin-top:8px;padding:8px 12px;background:rgba(0,229,176,.06);border-left:3px solid var(--accent);border-radius:0 8px 8px 0">🍳 '+topStruggle.analogy+'</p>' : ''}
    </div>
    <div class="lesson-btn" onclick="this.parentElement.classList.add('open')">Ver respuesta →</div>
  \`;
  lessonCol.appendChild(lesson);
}
twoCol.appendChild(lessonCol);
app.appendChild(reveal(twoCol));

// Domain modal builder
window.openDomainModal = function(i) {
  const d = D.domains[i]; if(!d) return;
  const explain = DOMAIN_EXPLAIN[d.domain] || 'Área de conocimiento en IA.';
  const levelExplain = LEVEL_EXPLAIN[d.label] || '';
  openModal(\`
    <h3>\${d.emoji} \${d.domain.charAt(0).toUpperCase()+d.domain.slice(1)}</h3>
    <p style="color:var(--muted);font-size:13px;line-height:1.5;margin-bottom:16px">\${explain}</p>
    <div class="modal-stat"><span class="label">Nivel actual</span><span class="val" style="color:\${d.color}">\${d.label}</span></div>
    <div class="modal-bar"><div class="modal-bar-fill" style="width:\${d.pct}%;background:\${d.color}"></div></div>
    <p style="color:var(--dim);font-size:12px;margin:8px 0 16px">\${levelExplain}</p>
    <div class="modal-stat"><span class="label">Conceptos</span><span class="val">\${d.count}</span></div>
    <div style="margin-top:16px;padding:14px;background:rgba(0,229,176,.05);border-radius:12px;border:1px solid rgba(0,229,176,.1)">
      <div style="font-size:11px;color:var(--accent);font-weight:700;margin-bottom:6px">¿CÓMO SUBIR DE NIVEL?</div>
      <p style="color:var(--muted);font-size:12px;line-height:1.5">Usa conceptos de <strong>\${d.domain}</strong> en tus proyectos reales. Cerebro detecta cuándo los aplicas y ajusta tu nivel automáticamente con spaced repetition.</p>
    </div>
  \`);
};

// === CARDS SECTIONS (HORIZONTAL) ===
function renderHCards(title, tip, items) {
  if (!items.length) return;
  const sec = document.createElement('div'); sec.className = 'section';
  sec.innerHTML = \`<div class="section-header"><h2>\${title}</h2>
    <span class="info-tip">i<div class="tip-popup"><div class="tip-title">¿Qué es esto?</div>\${tip}</div></span>
  </div>\`;
  const track = document.createElement('div'); track.className = 'cards-track';
  items.forEach((item, idx) => {
    const tc = item.typeConfig || {};
    const lc = item.levelConfig || {};
    const card = document.createElement('div'); card.className = 'hcard';
    card.innerHTML = \`
      <span class="badge" style="background:\${tc.color||'#64748b'}20;color:\${tc.color||'#64748b'}">\${tc.emoji||''} \${tc.label||item.type}</span>
      <div class="hcard-title">\${(item.concept||'').replace(/-/g,' ')}</div>
      <div class="hcard-obs">\${item.observation||''}</div>
      <div class="hcard-foot">
        \${item.project ? '<span class="badge" style="background:rgba(30,41,59,.8);color:#64748b">'+item.project+'</span>' : '<span></span>'}
        <span class="see-more">ver más →</span>
      </div>
    \`;
    card.addEventListener('click', () => openCardModal(item));
    track.appendChild(card);
  });
  sec.appendChild(track);
  app.appendChild(reveal(sec));
}

window.openCardModal = function(item) {
  const tc = item.typeConfig || {};
  const lc = item.levelConfig || {};
  openModal(\`
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <span class="badge" style="background:\${tc.color||'#64748b'}20;color:\${tc.color||'#64748b'}">\${tc.emoji||''} \${tc.label||item.type}</span>
      \${item.project ? '<span class="badge" style="background:rgba(30,41,59,.8);color:#64748b">'+item.project+'</span>' : ''}
      \${lc.color ? '<span class="badge" style="background:'+lc.color+'20;color:'+lc.color+'">'+lc.label+'</span>' : ''}
    </div>
    <h3>\${(item.concept||'').replace(/-/g,' ')}</h3>
    <p style="color:var(--muted);font-size:13px;line-height:1.6;margin:12px 0">\${item.observation||''}</p>
    \${item.analogy ? '<div style="padding:12px 16px;background:rgba(0,229,176,.06);border-left:3px solid var(--accent);border-radius:0 12px 12px 0;margin:12px 0"><strong style="color:var(--accent)">🍳 Analogía:</strong><br><span style="color:var(--muted);font-size:13px">'+item.analogy+'</span></div>' : ''}
    \${item.teaching_moment ? '<div style="padding:12px 16px;background:rgba(59,130,246,.06);border-left:3px solid #3b82f6;border-radius:0 12px 12px 0;margin:12px 0"><strong style="color:#3b82f6">💡 Momento de enseñanza:</strong><br><span style="color:var(--muted);font-size:13px">'+item.teaching_moment+'</span></div>' : ''}
    \${item.agents_involved?.length ? '<div style="margin-top:12px;font-size:12px;color:var(--dim)">🤝 Agentes: '+item.agents_involved.join(', ')+'</div>' : ''}
  \`);
};

renderHCards('🏆 Victorias', 'Momentos donde hiciste algo notable — Cerebro los detecta y celebra para que reconozcas tu progreso.', D.celebrations);

// === PROJECTS — HORIZONTAL ===
if (D.projects.length) {
  const projSec = document.createElement('div'); projSec.className = 'section';
  projSec.innerHTML = \`<div class="section-header"><h2>🗺️ Por Proyecto</h2>
    <span class="info-tip">i<div class="tip-popup"><div class="tip-title">¿Qué es esto?</div>Cada proyecto es tu laboratorio real. Los conceptos que aplicas aquí son los que realmente aprendes — no solo los que lees.</div></span>
  </div>\`;
  const ptrack = document.createElement('div'); ptrack.className = 'proj-track';
  D.projects.forEach(p => {
    const d = document.createElement('div'); d.className = 'proj';
    d.innerHTML = \`<div class="proj-name">\${p.emoji} \${p.name.charAt(0).toUpperCase()+p.name.slice(1)}</div>
      <div class="proj-count">\${p.count} conceptos</div>
      <div class="pills">\${p.items.map(i=>'<span class="pill" style="--c:'+i.color+'">'+i.concept.replace(/-/g,' ')+'</span>').join('')}</div>\`;
    ptrack.appendChild(d);
  });
  projSec.appendChild(ptrack);
  app.appendChild(reveal(projSec));
}

renderHCards('🎯 Desafíos', 'Conceptos donde aún estás creciendo. No son debilidades — son oportunidades de nivel-up.', D.struggles);
renderHCards('🔮 Predicciones', 'Basado en lo que estás construyendo, Cerebro predice qué conceptos vas a necesitar pronto.', D.predictions);
renderHCards('💡 Insights', 'Patrones que Cerebro detectó en tu forma de trabajar — conexiones que quizás no notaste.', D.insights);

// === FOOTER ===
const footer = document.createElement('div'); footer.className = 'footer';
footer.innerHTML = \`
  <div>Generado por 🧠 Cerebro · <a href="https://intranet.smconnection.cl/dashboard/cerebro">Abrir dashboard →</a></div>
  <div style="margin-top:4px;color:var(--dim)">Smart Connection · \${D.date}</div>
\`;
app.appendChild(footer);

// === INIT ===
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
document.querySelectorAll('.ring-item').forEach(el => obs.observe(el));
setupTips();
document.addEventListener('click', () => document.querySelectorAll('.info-tip.active').forEach(t => t.classList.remove('active')));
</script>
</body>
</html>`
}
