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
}
body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;overflow-x:hidden;min-height:100vh}
.wrap{max-width:720px;margin:0 auto;padding:24px 16px;position:relative;z-index:1}

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
.reveal:nth-child(2){transition-delay:.1s}.reveal:nth-child(3){transition-delay:.2s}
.reveal:nth-child(4){transition-delay:.3s}.reveal:nth-child(5){transition-delay:.4s}

/* === HEADER === */
.header{background:var(--glass);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid var(--border);border-radius:24px;padding:40px 32px;margin-bottom:24px;
  position:relative;overflow:hidden}
.header::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;
  background:linear-gradient(90deg,var(--accent),var(--blue),var(--purple));
  background-size:200% 100%;animation:shimmer 3s linear infinite}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.header h1{font-size:clamp(24px,5vw,34px);font-weight:900;
  background:linear-gradient(135deg,var(--accent),var(--blue));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px}
.header .sub{color:var(--dim);font-size:13px}

/* === STATS ROW === */
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:24px}
.stat{background:rgba(0,229,176,.06);border:1px solid rgba(0,229,176,.1);
  border-radius:14px;padding:16px 12px;text-align:center;
  transition:all .3s;cursor:default}
.stat:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(0,229,176,.12);border-color:rgba(0,229,176,.3)}
.stat-n{font-size:clamp(24px,4vw,36px);font-weight:900;
  background:linear-gradient(135deg,var(--accent),var(--blue));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent}
.stat-l{font-size:11px;color:var(--dim);margin-top:4px;text-transform:uppercase;letter-spacing:.5px}

/* === SECTIONS === */
.section{background:var(--glass);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border:1px solid var(--border);border-radius:20px;padding:28px;margin-bottom:20px;
  transition:border-color .3s,box-shadow .3s}
.section:hover{border-color:rgba(0,229,176,.15);box-shadow:0 0 30px rgba(0,229,176,.04)}
.section h2{font-size:18px;font-weight:700;margin-bottom:20px;display:flex;align-items:center;gap:8px}

/* === PROGRESS RINGS (SVG) === */
.rings{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:16px}
.ring-item{text-align:center;padding:16px 8px;border-radius:14px;background:rgba(30,41,59,.3);
  border:1px solid var(--border);transition:all .3s;cursor:default}
.ring-item:hover{transform:translateY(-4px);border-color:var(--ring-color);
  box-shadow:0 4px 20px color-mix(in srgb, var(--ring-color) 20%, transparent)}
.ring-svg{width:80px;height:80px;transform:rotate(-90deg)}
.ring-bg{fill:none;stroke:#1e293b;stroke-width:6}
.ring-fill{fill:none;stroke-width:6;stroke-linecap:round;
  stroke-dasharray:var(--dash);stroke-dashoffset:var(--dash);
  transition:stroke-dashoffset 1.5s ease-out}
.ring-item.visible .ring-fill{stroke-dashoffset:var(--offset)}
.ring-label{font-size:12px;color:var(--muted);margin-top:8px}
.ring-level{font-size:11px;font-weight:700;margin-top:2px}
.ring-count{font-size:10px;color:var(--dim)}

/* === UNLOCK === */
.unlock{background:linear-gradient(135deg,rgba(0,229,176,.08),rgba(0,180,216,.08));
  border:1px solid rgba(0,229,176,.2);border-radius:16px;padding:24px;margin-bottom:20px;
  position:relative;overflow:hidden}
.unlock::after{content:'⚡';position:absolute;right:20px;top:50%;transform:translateY(-50%);
  font-size:40px;opacity:.15;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{transform:translateY(-50%) scale(1)}50%{transform:translateY(-50%) scale(1.15)}}
.unlock-tag{font-size:11px;color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px}
.unlock-text{font-size:16px;font-weight:600}

/* === CARDS === */
.card{background:rgba(30,41,59,.4);border:1px solid var(--border);
  border-radius:16px;padding:20px;margin-bottom:14px;
  transition:all .4s cubic-bezier(.175,.885,.32,1.275);cursor:pointer;position:relative;overflow:hidden}
.card::before{content:'';position:absolute;inset:0;border-radius:16px;
  background:linear-gradient(135deg,transparent 40%,rgba(0,229,176,.03));opacity:0;transition:opacity .3s}
.card:hover{transform:translateY(-3px);border-color:rgba(0,229,176,.25);
  box-shadow:0 8px 30px rgba(0,229,176,.08)}
.card:hover::before{opacity:1}
.card-top{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;position:relative;z-index:1}
.badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;display:inline-block}
.card-title{font-size:15px;font-weight:700;margin:0 4px;text-transform:capitalize}
.card-obs{color:var(--muted);font-size:13px;line-height:1.7;margin-top:12px;position:relative;z-index:1}
.card-expand{max-height:0;overflow:hidden;transition:max-height .5s ease,opacity .3s;opacity:0}
.card.open .card-expand{max-height:400px;opacity:1}
.card-detail{margin-top:14px;padding:12px 16px;border-radius:0 12px 12px 0;font-size:13px;line-height:1.6}
.analogy{background:rgba(0,229,176,.06);border-left:3px solid var(--accent);color:var(--muted)}
.teaching{background:rgba(59,130,246,.06);border-left:3px solid #3b82f6;color:var(--muted)}
.click-hint{font-size:11px;color:var(--dim);margin-top:10px;text-align:right;position:relative;z-index:1;transition:opacity .3s}
.card.open .click-hint{opacity:0}

/* === PROJECT CARDS === */
.proj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.proj{background:rgba(30,41,59,.3);border:1px solid var(--border);border-radius:14px;
  padding:18px;transition:all .3s;cursor:default}
.proj:hover{border-color:rgba(0,180,216,.3);box-shadow:0 4px 20px rgba(0,180,216,.06);transform:translateY(-2px)}
.proj-name{font-size:16px;font-weight:700;margin-bottom:10px}
.proj-count{font-size:12px;color:var(--dim);font-weight:500}
.pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.pill{padding:4px 10px;border-radius:16px;font-size:11px;font-weight:500;
  background:color-mix(in srgb, var(--c) 12%, transparent);
  color:var(--c);border:1px solid color-mix(in srgb, var(--c) 20%, transparent);
  transition:all .2s}
.pill:hover{background:color-mix(in srgb, var(--c) 25%, transparent);transform:scale(1.05)}

/* === CONFETTI (celebrations) === */
.confetti-container{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999}
.confetti-piece{position:absolute;width:8px;height:8px;border-radius:2px;animation:fall linear forwards}
@keyframes fall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}

/* === TOOLTIP === */
.tooltip{position:relative}
.tooltip::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 8px);left:50%;
  transform:translateX(-50%) scale(.8);background:var(--elevated);color:var(--text);
  padding:6px 12px;border-radius:8px;font-size:11px;white-space:nowrap;
  opacity:0;pointer-events:none;transition:all .2s;border:1px solid var(--border);z-index:10}
.tooltip:hover::after{opacity:1;transform:translateX(-50%) scale(1)}

/* === FOOTER === */
.footer{text-align:center;padding:32px 0 16px;color:var(--dim);font-size:12px}
.footer a{color:var(--accent);text-decoration:none;font-weight:600}
.footer a:hover{text-decoration:underline}
.footer-glow{display:inline-block;padding:10px 24px;border-radius:12px;margin-top:12px;
  background:linear-gradient(135deg,var(--accent),var(--blue));color:var(--bg);
  font-weight:700;font-size:13px;text-decoration:none;transition:all .3s;cursor:pointer}
.footer-glow:hover{transform:translateY(-2px);box-shadow:0 4px 20px rgba(0,229,176,.3)}

/* === RESPONSIVE === */
@media(max-width:600px){
  .stats{grid-template-columns:repeat(2,1fr)}
  .rings{grid-template-columns:repeat(2,1fr)}
  .proj-grid{grid-template-columns:1fr}
  .header{padding:28px 20px}
  .section{padding:20px}
}

/* === REDUCED MOTION === */
@media(prefers-reduced-motion:reduce){
  .reveal{opacity:1;transform:none;transition:none}
  .orb,.confetti-piece{animation:none}
  .ring-fill{transition:none}
  .card,.stat,.ring-item,.proj,.pill{transition:none}
  .header::before{animation:none}
}
</style>
</head>
<body>

<div class="bg-particles"><div class="orb"></div><div class="orb"></div><div class="orb"></div></div>

<div class="wrap" id="app"></div>

<script>
const D = ${payloadJSON};

const app = document.getElementById('app');

// === CONFETTI ON LOAD (if celebrations exist) ===
if (D.celebrationCount > 0) {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  const colors = ['#00e5b0','#00b4d8','#a855f7','#f59e0b','#ec4899','#3b82f6'];
  for (let i = 0; i < 50; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = (2 + Math.random() * 3) + 's';
    piece.style.animationDelay = Math.random() * 2 + 's';
    piece.style.width = (6 + Math.random() * 6) + 'px';
    piece.style.height = (6 + Math.random() * 6) + 'px';
    container.appendChild(piece);
  }
  setTimeout(() => container.remove(), 6000);
}

// === SCROLL REVEAL ===
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target) }});
}, { threshold: 0.1 });

function reveal(el) { el.classList.add('reveal'); observer.observe(el); return el; }

// === BUILD HEADER ===
const header = document.createElement('div');
header.className = 'header';
header.innerHTML = \`
  <h1>🧠 Cerebro — Reporte de Evolución</h1>
  <div class="sub">\${D.date}</div>
  <div class="stats">
    <div class="stat tooltip" data-tip="Conceptos en tu base de conocimiento">
      <div class="stat-n">\${D.total}</div><div class="stat-l">Conceptos</div>
    </div>
    <div class="stat tooltip" data-tip="Áreas de conocimiento IA">
      <div class="stat-n">\${D.domainCount}</div><div class="stat-l">Dominios</div>
    </div>
    <div class="stat tooltip" data-tip="Proyectos con conceptos aplicados">
      <div class="stat-n">\${D.projectCount}</div><div class="stat-l">Proyectos</div>
    </div>
    <div class="stat tooltip" data-tip="Logros reconocidos">
      <div class="stat-n">\${D.celebrationCount}</div><div class="stat-l">Victorias</div>
    </div>
  </div>
\`;
app.appendChild(reveal(header));

// === PROGRESS RINGS ===
const ringSection = document.createElement('div');
ringSection.className = 'section';
const circumference = 2 * Math.PI * 28; // r=28
ringSection.innerHTML = \`<h2>📊 Tu Mapa de Conocimiento</h2>
<div class="rings">
\${D.domains.map(d => {
  const offset = circumference - (circumference * d.pct / 100);
  return \`<div class="ring-item reveal" style="--ring-color:\${d.color}">
    <svg class="ring-svg" viewBox="0 0 64 64">
      <circle class="ring-bg" cx="32" cy="32" r="28"/>
      <circle class="ring-fill" cx="32" cy="32" r="28"
        stroke="\${d.color}" style="--dash:\${circumference};--offset:\${offset}"/>
    </svg>
    <div class="ring-label">\${d.emoji} \${d.domain}</div>
    <div class="ring-level" style="color:\${d.color}">\${d.label}</div>
    <div class="ring-count">\${d.count} conceptos</div>
  </div>\`
}).join('')}
</div>\`;
app.appendChild(reveal(ringSection));
// Observe rings individually
ringSection.querySelectorAll('.ring-item').forEach(el => observer.observe(el));

// === NEXT UNLOCK ===
const unlock = document.createElement('div');
unlock.className = 'unlock';
unlock.innerHTML = \`<div class="unlock-tag">⚡ Próximo Unlock</div><div class="unlock-text">\${D.nextUnlock}</div>\`;
app.appendChild(reveal(unlock));

// === CARD RENDERER ===
function renderCards(title, items, showAnalogy = true) {
  if (!items.length) return;
  const sec = document.createElement('div');
  sec.className = 'section';
  sec.innerHTML = \`<h2>\${title}</h2>\`;
  items.forEach((item, i) => {
    const tc = item.typeConfig || {};
    const lc = item.levelConfig || {};
    const card = document.createElement('div');
    card.className = 'card';
    card.style.transitionDelay = (i * 0.08) + 's';
    card.innerHTML = \`
      <div class="card-top">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span class="badge" style="background:\${tc.color}20;color:\${tc.color}">\${tc.emoji || ''} \${tc.label || item.type}</span>
          <span class="card-title">\${(item.concept||'').replace(/-/g,' ')}</span>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          \${item.project ? \`<span class="badge" style="background:rgba(30,41,59,.8);color:#64748b">\${item.project}</span>\` : ''}
          \${lc.color ? \`<span class="badge" style="background:\${lc.color}20;color:\${lc.color}">\${lc.label}</span>\` : ''}
        </div>
      </div>
      <div class="card-obs">\${item.observation || ''}</div>
      <div class="card-expand">
        \${item.analogy && showAnalogy ? \`<div class="card-detail analogy">🍳 <strong>Analogía:</strong> \${item.analogy}</div>\` : ''}
        \${item.teaching_moment ? \`<div class="card-detail teaching">💡 \${item.teaching_moment}</div>\` : ''}
        \${item.agents_involved?.length ? \`<div style="font-size:12px;color:#475569;margin-top:10px">🤝 Agentes: \${item.agents_involved.join(', ')}</div>\` : ''}
      </div>
      <div class="click-hint">click para expandir ↓</div>
    \`;
    card.addEventListener('click', () => card.classList.toggle('open'));
    sec.appendChild(card);
  });
  app.appendChild(reveal(sec));
}

// === CELEBRATIONS ===
renderCards('🏆 Victorias', D.celebrations);

// === PROJECT MAP ===
if (D.projects.length) {
  const projSec = document.createElement('div');
  projSec.className = 'section';
  projSec.innerHTML = \`<h2>🗺️ Mapa por Proyecto</h2><div class="proj-grid">
    \${D.projects.map(p => \`
      <div class="proj">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="proj-name">\${p.emoji} \${p.name.charAt(0).toUpperCase() + p.name.slice(1)}</div>
          <div class="proj-count">\${p.count} conceptos</div>
        </div>
        <div class="pills">
          \${p.items.map(i => \`<span class="pill" style="--c:\${i.color}">\${i.concept.replace(/-/g,' ')}</span>\`).join('')}
        </div>
      </div>
    \`).join('')}
  </div>\`;
  app.appendChild(reveal(projSec));
}

// === STRUGGLES, PREDICTIONS, INSIGHTS ===
renderCards('🎯 Próximos Desafíos', D.struggles);
renderCards('🔮 Predicciones', D.predictions);
renderCards('💡 Insights & Patrones', D.insights);

// === FOOTER ===
const footer = document.createElement('div');
footer.className = 'footer';
footer.innerHTML = \`
  <div>Generado por 🧠 Cerebro desde <code style="background:rgba(30,41,59,.8);padding:3px 8px;border-radius:6px;font-size:11px">cerebro_knowledge</code></div>
  <div style="margin-top:8px"><a href="https://intranet.smconnection.cl/dashboard/cerebro">Abrir dashboard interactivo →</a></div>
  <div style="margin-top:4px;color:#1e293b">Smart Connection · \${D.date}</div>
\`;
app.appendChild(footer);

// === TRIGGER INITIAL REVEALS ===
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
</script>
</body>
</html>`
}
