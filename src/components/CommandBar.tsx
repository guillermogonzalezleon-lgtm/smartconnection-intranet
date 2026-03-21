'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Command {
  id: string;
  icon: string;
  label: string;
  group: string;
  action: () => void;
  shortcut?: string;
  color?: string;
}

export default function CommandBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const commands: Command[] = [
    // Quick actions
    { id: 'run-agent', icon: '⚡', label: 'Ejecutar agente...', group: 'Acciones', action: () => { setOpen(false); router.push('/dashboard/labs'); }, shortcut: '⌘E' },
    { id: 'new-project', icon: '📋', label: 'Nuevo proyecto', group: 'Acciones', action: () => { setOpen(false); router.push('/dashboard/projects'); }, color: '#8b5cf6' },
    { id: 'new-lead', icon: '👤', label: 'Nuevo lead', group: 'Acciones', action: () => { setOpen(false); router.push('/dashboard/leads'); }, color: '#3b82f6' },
    // Navigate
    { id: 'nav-dash', icon: '⬡', label: 'Dashboard', group: 'Navegar', action: () => { setOpen(false); router.push('/dashboard'); }, shortcut: '⌘1' },
    { id: 'nav-agents', icon: '🤖', label: 'Agentes IA', group: 'Navegar', action: () => { setOpen(false); router.push('/dashboard/agents'); }, shortcut: '⌘2' },
    { id: 'nav-leads', icon: '👥', label: 'Leads & CRM', group: 'Navegar', action: () => { setOpen(false); router.push('/dashboard/leads'); }, shortcut: '⌘3' },
    { id: 'nav-analytics', icon: '📊', label: 'Analytics', group: 'Navegar', action: () => { setOpen(false); router.push('/dashboard/analytics'); }, shortcut: '⌘4' },
    { id: 'nav-projects', icon: '📋', label: 'Proyectos', group: 'Navegar', action: () => { setOpen(false); router.push('/dashboard/projects'); }, shortcut: '⌘5' },
    { id: 'nav-ux', icon: '⚡', label: 'Agente UX', group: 'Navegar', action: () => { setOpen(false); router.push('/dashboard/ux-agent'); }, shortcut: '⌘6' },
    { id: 'nav-labs', icon: '🧪', label: 'Labs', group: 'Navegar', action: () => { setOpen(false); router.push('/dashboard/labs'); }, shortcut: '⌘7' },
    { id: 'nav-aws', icon: '☁', label: 'AWS Panel', group: 'Navegar', action: () => { setOpen(false); router.push('/dashboard/aws'); } },
    // Agents
    { id: 'agent-hoku', icon: '🔥', label: 'Hoku — Fusión de 4 agentes', group: 'Agentes', action: () => { setOpen(false); router.push('/dashboard/ux-agent?tab=workspace'); }, color: '#ff6b6b' },
    { id: 'agent-claude', icon: '●', label: 'Claude — Code Review & Dev', group: 'Agentes', action: () => { setOpen(false); router.push('/dashboard/ux-agent?tab=workspace'); }, color: '#00e5b0' },
    { id: 'agent-groq', icon: '●', label: 'Groq — Inferencia rápida', group: 'Agentes', action: () => { setOpen(false); router.push('/dashboard/ux-agent?tab=workspace'); }, color: '#f59e0b' },
    { id: 'agent-gemini', icon: '●', label: 'Gemini — SEO & Analytics', group: 'Agentes', action: () => { setOpen(false); router.push('/dashboard/ux-agent?tab=workspace'); }, color: '#22c55e' },
  ];

  const filtered = query.trim()
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()) || c.group.toLowerCase().includes(query.toLowerCase()))
    : commands;

  const groups = Array.from(new Set(filtered.map(c => c.group)));

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen(o => !o);
      setQuery('');
      setSelected(0);
    }
    if (e.key === '/' && !open && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      setOpen(true);
      setQuery('');
      setSelected(0);
    }
    // Global nav shortcuts
    if ((e.metaKey || e.ctrlKey) && !open) {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 7) {
        e.preventDefault();
        const paths = ['/dashboard', '/dashboard/agents', '/dashboard/leads', '/dashboard/analytics', '/dashboard/projects', '/dashboard/ux-agent', '/dashboard/labs'];
        router.push(paths[num - 1]);
      }
      if (e.key === '`') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('toggle-terminal'));
      }
    }
  }, [open, router]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleItemKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && filtered[selected]) { filtered[selected].action(); }
    if (e.key === 'Escape') { setOpen(false); }
  };

  if (!open) return null;

  let itemIdx = -1;

  return (
    <div onClick={() => setOpen(false)} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '15vh',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 580, maxHeight: 480,
        background: '#111827', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <i className="bi bi-search" style={{ color: '#475569', fontSize: '0.9rem' }}></i>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleItemKey}
            placeholder="Buscar o ejecutar..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#f1f5f9', fontSize: '0.9rem', fontFamily: "'Inter', system-ui",
            }}
          />
          <kbd style={{
            fontSize: '0.6rem', padding: '2px 6px', borderRadius: 4,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#475569', fontFamily: "'Inter', system-ui",
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ overflow: 'auto', maxHeight: 400, padding: '6px 0' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#475569', fontSize: '0.8rem' }}>
              Sin resultados para &quot;{query}&quot;
            </div>
          )}
          {groups.map(group => (
            <div key={group}>
              <div style={{
                padding: '8px 16px 4px', fontSize: '0.6rem', fontWeight: 700,
                color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>{group}</div>
              {filtered.filter(c => c.group === group).map(cmd => {
                itemIdx++;
                const isSelected = itemIdx === selected;
                const idx = itemIdx;
                return (
                  <div
                    key={cmd.id}
                    onClick={cmd.action}
                    onMouseEnter={() => setSelected(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 16px', margin: '0 6px', borderRadius: 8,
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(0,229,176,0.08)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', width: 20, textAlign: 'center', color: cmd.color || '#94a3b8' }}>{cmd.icon}</span>
                    <span style={{ flex: 1, fontSize: '0.8rem', color: isSelected ? '#f1f5f9' : '#94a3b8', fontWeight: isSelected ? 600 : 400 }}>{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd style={{
                        fontSize: '0.55rem', padding: '1px 5px', borderRadius: 3,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                        color: '#475569', fontFamily: "'Inter', system-ui",
                      }}>{cmd.shortcut}</kbd>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: 12, fontSize: '0.6rem', color: '#334155',
        }}>
          <span><kbd style={{ background: 'rgba(255,255,255,0.04)', padding: '1px 4px', borderRadius: 3, fontSize: '0.55rem' }}>↑↓</kbd> navegar</span>
          <span><kbd style={{ background: 'rgba(255,255,255,0.04)', padding: '1px 4px', borderRadius: 3, fontSize: '0.55rem' }}>↵</kbd> seleccionar</span>
          <span><kbd style={{ background: 'rgba(255,255,255,0.04)', padding: '1px 4px', borderRadius: 3, fontSize: '0.55rem' }}>esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  );
}
