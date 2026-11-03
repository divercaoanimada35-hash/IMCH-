import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Sparkles, 
  Zap, 
  Crown, 
  CreditCard, 
  Smartphone, 
  Receipt, 
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { authService } from '../services/auth';
import { UserProfile } from '../types';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUpgradeSuccess: (user: UserProfile) => void;
  initialSelectedTier?: 'pro' | 'pack_50';
  promptReason?: string;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpgradeSuccess,
  initialSelectedTier = 'pro',
  promptReason,
}) => {
  const [selectedTier, setSelectedTier] = useState<'pro' | 'pack_50'>(initialSelectedTier);
  const [paymentMethod, setPaymentMethod] = useState<'express' | 'reference' | 'card'>('express');
  const [phoneNumber, setPhoneNumber] = useState('923 000 000');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successCelebration, setSuccessCelebration] = useState(false);

  if (!isOpen) return null;

  const handleProcessPayment = () => {
    setIsProcessing(true);

    setTimeout(() => {
      try {
        let updatedUser: UserProfile;
        if (selectedTier === 'pro') {
          updatedUser = authService.upgradeToPro(
            paymentMethod === 'express' ? 'Multicaixa Express' : (paymentMethod === 'reference' ? 'Referência Multicaixa' : 'Cartão'),
            'MCX-' + Math.floor(100000 + Math.random() * 900000)
          );
        } else {
          updatedUser = authService.addCredits(50);
        }

        setIsProcessing(false);
        setSuccessCelebration(true);

        setTimeout(() => {
          onUpgradeSuccess(updatedUser);
          onClose();
          setSuccessCelebration(false);
        }, 1800);
      } catch (err: any) {
        setIsProcessing(false);
        alert(err.message || 'Erro ao processar pagamento.');
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="w-full max-w-3xl bg-white dark:bg-[#0c0c10] border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white select-none">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-3">
            <Crown className="w-3.5 h-3.5" />
            <span>Monetização & Planos de Acesso</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Desbloqueie todo o poder da IA sem limites
          </h2>
          <p className="text-xs sm:text-sm text-amber-100 mt-1 max-w-xl">
            {promptReason || 'Gere websites, portais corporativos e aplicações completas sem restrições. Escolha a opção ideal para si ou para a sua empresa.'}
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: Free Tier */}
            <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#121216] flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-neutral-500">
                  Gratuito
                </span>
                <div className="mt-2 mb-4">
                  <span className="text-2xl font-bold text-neutral-900 dark:text-white">0 Kz</span>
                  <span className="text-xs text-neutral-500"> / para sempre</span>
                </div>
                <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>3 créditos de boas-vindas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Editor de código completo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Pré-visualização ao vivo</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-center">
                <span className="text-[11px] font-semibold text-neutral-400">
                  {currentUser?.plan === 'free' ? 'Plano Atual' : 'Plano Básico'}
                </span>
              </div>
            </div>

            {/* Card 2: PRO UNLIMITED (Featured ⭐) */}
            <div 
              onClick={() => setSelectedTier('pro')}
              className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                selectedTier === 'pro'
                  ? 'border-amber-500 bg-amber-50/40 dark:bg-[#19150f] shadow-lg shadow-amber-500/10'
                  : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#15151a]'
              }`}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-[10px] uppercase tracking-wider shadow-sm">
                ⭐ Mais Popular
              </div>

              <div>
                <span className="text-xs font-mono font-bold uppercase text-amber-600 dark:text-amber-400">
                  Plano PRO Ilimitado
                </span>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">9.500 Kz</span>
                  <span className="text-xs text-neutral-500"> / mês (~$12)</span>
                </div>
                <ul className="space-y-2.5 text-xs text-neutral-700 dark:text-neutral-200">
                  <li className="flex items-center gap-2 font-medium">
                    <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span><strong>Gerações ilimitadas</strong> de código</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Estrutura de pastas automáticas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Download em ZIP sem limites</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Suporte prioritário a modelos OpenRouter</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                className={`mt-6 w-full py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedTier === 'pro'
                    ? 'bg-amber-600 text-white shadow-md hover:bg-amber-700'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                }`}
              >
                {selectedTier === 'pro' ? '✓ Selecionado' : 'Selecionar'}
              </button>
            </div>

            {/* Card 3: 50 Credits Pack */}
            <div 
              onClick={() => setSelectedTier('pack_50')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                selectedTier === 'pack_50'
                  ? 'border-blue-500 bg-blue-50/40 dark:bg-[#0f1422] shadow-lg shadow-blue-500/10'
                  : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#15151a]'
              }`}
            >
              <div>
                <span className="text-xs font-mono font-bold uppercase text-blue-600 dark:text-blue-400">
                  Pacote 50 Créditos
                </span>
                <div className="mt-2 mb-4">
                  <span className="text-2xl font-bold text-neutral-900 dark:text-white">3.500 Kz</span>
                  <span className="text-xs text-neutral-500"> / pagamento único</span>
                </div>
                <ul className="space-y-2.5 text-xs text-neutral-700 dark:text-neutral-200">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>50 gerações de sites e apps</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Créditos nunca expiram</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Ideal para uso ocasional</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                className={`mt-6 w-full py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedTier === 'pack_50'
                    ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                }`}
              >
                {selectedTier === 'pack_50' ? '✓ Selecionado' : 'Selecionar'}
              </button>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-[#09090d]">
            <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-500" />
              <span>Forma de Pagamento</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('express')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  paymentMethod === 'express'
                    ? 'border-amber-500 bg-white dark:bg-[#18181f] text-neutral-900 dark:text-white font-semibold ring-1 ring-amber-500/30'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-white dark:hover:bg-[#141418]'
                }`}
              >
                <Smartphone className="w-4 h-4 text-amber-500" />
                <div>
                  <div className="text-xs">Multicaixa Express</div>
                  <div className="text-[10px] text-neutral-400">Telemóvel (Angola)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('reference')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  paymentMethod === 'reference'
                    ? 'border-amber-500 bg-white dark:bg-[#18181f] text-neutral-900 dark:text-white font-semibold ring-1 ring-amber-500/30'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-white dark:hover:bg-[#141418]'
                }`}
              >
                <Receipt className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-xs">Referência Bancária</div>
                  <div className="text-[10px] text-neutral-400">Entidade / Referência</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  paymentMethod === 'card'
                    ? 'border-amber-500 bg-white dark:bg-[#18181f] text-neutral-900 dark:text-white font-semibold ring-1 ring-amber-500/30'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-white dark:hover:bg-[#141418]'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-500" />
                <div>
                  <div className="text-xs">Cartão Visa / Master</div>
                  <div className="text-[10px] text-neutral-400">Internacional / Kz</div>
                </div>
              </button>
            </div>

            {/* Method Specific Fields */}
            {paymentMethod === 'express' && (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] text-neutral-500 mb-1 font-medium">
                    Número de Telemóvel associado ao Multicaixa Express:
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="923 000 000"
                    className="w-full px-3 py-2 bg-white dark:bg-[#141418] border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs font-mono text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'reference' && (
              <div className="p-3 rounded-xl bg-white dark:bg-[#141418] border border-neutral-200 dark:border-neutral-800 text-xs font-mono space-y-1">
                <div>Entidade: <strong className="text-neutral-900 dark:text-white">00123 (IMCH Soluções)</strong></div>
                <div>Referência: <strong className="text-amber-500">928 349 102</strong></div>
                <div>Montante: <strong className="text-neutral-900 dark:text-white">{selectedTier === 'pro' ? '9.500 Kz' : '3.500 Kz'}</strong></div>
              </div>
            )}
          </div>

          {/* Checkout Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Garantia de ativação imediata e cancelamento a qualquer momento.</span>
            </div>

            <button
              type="button"
              disabled={isProcessing || successCelebration}
              onClick={handleProcessPayment}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-800 text-white font-bold text-xs shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>A processar transação...</span>
                </>
              ) : successCelebration ? (
                <>
                  <Sparkles className="w-4 h-4 text-yellow-300 animate-bounce" />
                  <span>Plano Ativado com Sucesso! 🎉</span>
                </>
              ) : (
                <>
                  <span>
                    {selectedTier === 'pro' ? 'Ativar Plano PRO (9.500 Kz)' : 'Comprar 50 Créditos (3.500 Kz)'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
