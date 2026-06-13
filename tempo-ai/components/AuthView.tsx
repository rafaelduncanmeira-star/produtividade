import React, { useState } from 'react';
import { LogIn, UserPlus, LoaderCircle, Mail } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

type Mode = 'login' | 'signup';

const traduzErro = (msg: string): string => {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Este e-mail já tem conta. Use "Entrar".';
  if (m.includes('password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('valid email')) return 'Digite um e-mail válido.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Muitas tentativas. Aguarde um minuto e tente de novo.';
  return 'Algo deu errado. Tente novamente.';
};

export const AuthView: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (err) throw err;
        // E-mails são confirmados automaticamente neste projeto; se o signUp
        // não devolver sessão, entra em seguida com as mesmas credenciais.
        if (!data.session) {
          const { error: err2 } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
          if (err2) throw err2;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
      }
    } catch (err) {
      setError(traduzErro((err as Error).message ?? ''));
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async () => {
    if (!email.trim()) {
      setError('Digite seu e-mail no campo acima e clique de novo em "Esqueci a senha".');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.href });
      setInfo('Enviamos um link de recuperação para o seu e-mail.');
    } catch {
      setError('Não foi possível enviar o e-mail agora. Tente mais tarde.');
    } finally {
      setBusy(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 outline-none text-sm';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">Tempo AI</h1>
          <p className="text-sm text-slate-400 mt-1">Gestão de tempo e produtividade</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          {/* Alternância entrar/criar conta */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-5">
            <button
              onClick={() => { setMode('login'); setError(null); setInfo(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'login' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); setInfo(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Seu nome"
                className={inputClass}
              />
            )}
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="E-mail"
              className={inputClass}
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Crie uma senha (mín. 6 caracteres)' : 'Senha'}
              className={inputClass}
            />

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs text-rose-600">{error}</div>
            )}
            {info && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-700 flex items-center gap-2">
                <Mail size={14} /> {info}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform"
            >
              {busy
                ? <LoaderCircle size={18} className="animate-spin" />
                : mode === 'signup' ? <UserPlus size={18} /> : <LogIn size={18} />}
              {mode === 'signup' ? 'Criar minha conta' : 'Entrar'}
            </button>
          </form>

          {mode === 'login' && (
            <button
              onClick={handleForgot}
              disabled={busy}
              className="w-full mt-3 text-xs text-slate-400 hover:text-indigo-600 font-medium"
            >
              Esqueci a senha
            </button>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-300 mt-6">
          Seus dados são privados: cada conta vê apenas o que é seu.
        </p>
      </div>
    </div>
  );
};
