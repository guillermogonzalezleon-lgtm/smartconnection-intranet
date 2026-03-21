export default function Sidebar({ user }: { user: string }) {
  return (
    <aside className="w-[240px] bg-[#111827] border-r border-white/[0.06] fixed top-0 left-0 bottom-0 flex flex-col z-50">
      <div className="p-5 flex items-center gap-3 border-b border-white/[0.06]">
        <img src="/img/logo_smart.svg" alt="SC" className="h-7" />
        <span className="bg-[#00e5b0] text-[#0a0d14] text-[0.55rem] font-extrabold px-2 py-0.5 rounded-full tracking-wider">INTRANET</span>
      </div>
      <nav className="p-3 flex-1">
        <div className="text-[0.6rem] font-bold text-[#475569] uppercase tracking-widest px-2 mb-2">Principal</div>
        <a href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-md text-[#94a3b8] text-sm font-medium hover:bg-[#00e5b0]/[0.12] hover:text-white transition-all mb-0.5">
          <i className="bi bi-grid-1x2"></i> Dashboard
        </a>
        <a href="/dashboard/agents" className="flex items-center gap-3 px-3 py-2 rounded-md text-[#94a3b8] text-sm font-medium hover:bg-[#00e5b0]/[0.12] hover:text-white transition-all mb-0.5">
          <i className="bi bi-robot"></i> Agentes IA
        </a>
        <a href="/dashboard/leads" className="flex items-center gap-3 px-3 py-2 rounded-md text-[#94a3b8] text-sm font-medium hover:bg-[#00e5b0]/[0.12] hover:text-white transition-all mb-0.5">
          <i className="bi bi-people"></i> Leads & CRM
        </a>
        <a href="/dashboard/analytics" className="flex items-center gap-3 px-3 py-2 rounded-md text-[#94a3b8] text-sm font-medium hover:bg-[#00e5b0]/[0.12] hover:text-white transition-all mb-0.5">
          <i className="bi bi-graph-up"></i> Analytics
        </a>
        <div className="text-[0.6rem] font-bold text-[#475569] uppercase tracking-widest px-2 mb-2 mt-4">Infraestructura</div>
        <a href="/dashboard/aws" className="flex items-center gap-3 px-3 py-2 rounded-md text-[#94a3b8] text-sm font-medium hover:bg-[#00e5b0]/[0.12] hover:text-white transition-all mb-0.5">
          <i className="bi bi-cloud" style={{color:'#f97316'}}></i> AWS Panel
        </a>
      </nav>
      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 text-[0.7rem] text-[#94a3b8] px-2 py-1"><span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]"></span> Vercel Live</div>
        <div className="flex items-center gap-2 text-[0.7rem] text-[#94a3b8] px-2 py-1"><span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]"></span> AWS Active</div>
        <div className="flex items-center gap-2 text-[0.7rem] text-[#94a3b8] px-2 py-1"><span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]"></span> Supabase Connected</div>
      </div>
      <div className="p-4 border-t border-white/[0.06] flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#00e5b0]/[0.12] flex items-center justify-center text-[#00e5b0] text-sm font-bold">{user.charAt(0).toUpperCase()}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-white truncate">{user.split('@')[0]}</div>
          <div className="text-[0.6rem] text-[#475569] truncate">{user}</div>
        </div>
      </div>
    </aside>
  );
}
