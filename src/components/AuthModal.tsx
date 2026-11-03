import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { authService } from '../services/auth';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: UserProfile) => void;
  initialMode?: 'login' | 'register';
  customMessage?: string;
  reason?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'register',
  customMessage,
  reason,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim()) {
          setError('Por favor insira o seu nome completo.');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('A palavra-passe deve ter pelo menos 6 caracteres.');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('As palavras-passe não coincidem.');
          setIsLoading(false);
          return;
        }

        const res = authService.register(name, email, password);
        if (res.success && res.user) {
          onSuccess?.(res.user);
          onClose();
        } else {
          setError(res.error || 'Erro ao criar conta.');
        }
      } else {
        const res = authService.login(email, password);
        if (res.success && res.user) {
          onSuccess?.(res.user);
          onClose();
        } else {
          setError(res.error || 'Credenciais inválidas.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-[#0c0c10] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="relative p-6 pb-4 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white select-none">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-sm">
              IM
            </div>
            <span className="text-xs font-mono uppercase tracking-wider font-semibold opacity-90">
              IMCH AI Developer
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight">
            {mode === 'register' ? 'Criar Conta de Acesso' : 'Entrar na Plataforma'}
          </h2>
          <p className="text-xs text-blue-100 mt-1">
            {customMessage || reason || (mode === 'register' 
              ? 'Recebe 3 créditos gratuitos de boas-vindas para criar sites com IA.' 
              : 'Acede aos teus projetos, histórico de chat e créditos.')}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#08080a] text-xs">
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-3 font-semibold text-center transition-colors cursor-pointer ${
              mode === 'register'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-[#0c0c10]'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Criar Conta (Cadastro)
          </button>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-3 font-semibold text-center transition-colors cursor-pointer ${
              mode === 'login'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-[#0c0c10]'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Iniciar Sessão (Login)
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Nome Completo
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: João Manuel Baptista"
                  className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-[#141418] border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Endereço de E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@empresa.com"
                className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-[#141418] border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Palavra-passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-[#141418] border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Confirmar Palavra-passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a palavra-passe"
                  className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-[#141418] border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{mode === 'register' ? 'Criar Conta Gratuita' : 'Iniciar Sessão'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Perks Footer */}
        <div className="px-6 py-3 bg-neutral-50 dark:bg-[#07070a] border-t border-neutral-200 dark:border-neutral-800/80 text-[11px] text-neutral-500 flex items-center justify-around">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>3 Créditos Grátis</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>100% Seguro</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>IA Local</span>
          </div>
        </div>
      </div>
    </div>
  );
};
