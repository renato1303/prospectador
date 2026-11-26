import React, { useState, useEffect } from 'react';
import { X, Sparkles, Copy, Check, Phone, Loader2, RefreshCw } from 'lucide-react';
import { Lead, AppSettings } from '../types';

interface AiPitchModalProps {
  lead: Lead;
  settings: AppSettings;
  onClose: () => void;
  onOpenWhatsAppWithText: (lead: Lead, text: string) => void;
}

export const AiPitchModal: React.FC<AiPitchModalProps> = ({
  lead,
  settings,
  onClose,
  onOpenWhatsAppWithText,
}) => {
  const [pitch, setPitch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generatePitch = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: lead.name,
          segment: lead.segment,
          city: lead.city,
          address: lead.address,
          rating: lead.rating,
          reviewsCount: lead.userRatingCount,
          websiteStatus: lead.status,
          apiKey: settings.geminiApiKey || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar pitch com IA');
      }
      setPitch(data.pitch);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao comunicar com a API do Gemini. Verifique sua chave de API nas Configurações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generatePitch();
  }, [lead]);

  const handleCopy = () => {
    navigator.clipboard.writeText(pitch);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-violet-600/10 to-indigo-600/10 dark:from-violet-950/40 dark:to-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pitch de Vendas com IA</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Abordagem personalizada para {lead.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
              <p className="text-sm font-medium">Gerando abordagem exclusiva com Gemini AI...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
              <p className="font-semibold mb-1">Atenção</p>
              <p>{error}</p>
              <button
                onClick={generatePitch}
                className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="relative">
                <textarea
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  rows={8}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 leading-relaxed resize-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={generatePitch}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium rounded-xl text-sm transition-all"
                >
                  <RefreshCw className="w-4 h-4" /> Gerar Novo Pitch
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-xl text-sm transition-all"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado!' : 'Copiar Texto'}
                  </button>

                  <button
                    onClick={() => onOpenWhatsAppWithText(lead, pitch)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm shadow-md shadow-emerald-600/20 transition-all"
                  >
                    <Phone className="w-4 h-4" /> Enviar no WhatsApp
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
