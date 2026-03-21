'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [pin, setPin] = useState(['', '', '', '']);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const locked = useRef(false);

  useEffect(() => { inputs.current[0]?.focus(); }, []);

  const handleInput = (idx: number, val: string) => {
    const clean = val.replace(/[^0-9a-zA-Z]/g, '');
    const newPin = [...pin];
    newPin[idx] = clean ? clean[0] : '';
    setPin(newPin);

    if (clean && idx < 3) inputs.current[idx + 1]?.focus();

    const full = newPin.join('');
    if (full.length === 4 && !locked.current) {
      locked.current = true;
      setStatus('loading');
      submitPin(full);
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) {
      const newPin = [...pin];
      newPin[idx - 1] = '';
      setPin(newPin);
      inputs.current[idx - 1]?.focus();
    }
  };

  const submitPin = async (p: string) => {
    try {
      const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: p }) });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('success');
        setTimeout(() => router.push('/dashboard'), 500);
      } else {
        setStatus('error');
        setTimeout(() => { setPin(['', '', '', '']); setStatus('idle'); locked.current = false; inputs.current[0]?.focus(); }, 1500);
      }
    } catch { setStatus('error'); locked.current = false; }
  };

  const digitClass = (idx: number) => {
    let cls = 'w-14 h-16 bg-white/[0.04] border-2 rounded-[14px] text-white text-2xl font-extrabold text-center outline-none transition-all';
    if (status === 'error') cls += ' border-red-500 animate-shake';
    else if (status === 'success') cls += ' border-green-500 bg-green-500/10';
    else if (pin[idx]) cls += ' border-[#00e5b0]';
    else cls += ' border-white/[0.08] focus:border-[#00e5b0] focus:bg-[#00e5b0]/[0.06] focus:shadow-[0_0_24px_rgba(0,229,176,0.15)]';
    return cls;
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="bg-[#111827]/80 backdrop-blur-xl border border-[#00e5b0]/[0.12] rounded-[20px] p-12 max-w-[400px] w-full text-center">
        <img src="/img/logo_smart.svg" alt="Smart Connection" className="h-10 mx-auto mb-6" />
        <h1 className="text-xl font-extrabold text-white mb-1">Intranet</h1>
        <p className="text-[#94a3b8] text-sm mb-8">Ingresa tu PIN de acceso</p>
        <div className="flex justify-center gap-3 mb-6">
          {pin.map((d, i) => (
            <input key={i} ref={el => { inputs.current[i] = el; }} type="password" maxLength={1} value={d}
              className={digitClass(i)} autoComplete="off"
              onChange={e => handleInput(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)} />
          ))}
        </div>
        <div className={`text-xs ${status === 'error' ? 'text-red-400' : status === 'success' ? 'text-green-400' : 'text-[#94a3b8]'}`}>
          {status === 'loading' ? 'Verificando...' : status === 'error' ? 'PIN incorrecto' : status === 'success' ? 'Bienvenido' : '4 caracteres'}
        </div>
      </div>
    </div>
  );
}
