import React, { useState } from 'react';
import { AppSettings } from '../types';
import { Key, MessageSquare, Download, Upload, CheckCircle2, ShieldAlert, Trash2, RefreshCw } from 'lucide-react';
import { exportBackupJSON, importBackupJSON, saveLeads, saveColumns, DEFAULT_COLUMNS } from '../utils/storage';

interface SettingsScreenProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onDataImported: () => void;
  askConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel?: string,
    cancelLabel?: string,
    isDanger?: boolean
  ) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onDataImported,
  askConfirm,
  showToast,
}) => {
  const [googlePlacesApiKey, setGooglePlacesApiKey] = useState(settings.googlePlacesApiKey);
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey);
  const [whatsappTemplate, setWhatsappTemplate] = useState(settings.whatsappTemplate);
  const [whatsappTemplateSocial, setWhatsappTemplateSocial] = useState(settings.whatsappTemplateSocial || '');
  const [whatsappTemplateSite, setWhatsappTemplateSite] = useState(settings.whatsappTemplateSite || '');
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      googlePlacesApiKey,
      geminiApiKey,
      whatsappTemplate,
      whatsappTemplateSocial,
      whatsappTemplateSite,
    });
    setSavedMessage(true);
    showToast('Configurações salvas com sucesso!', 'success');
    setTimeout(() => setSavedMessage(false), 2500);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && importBackupJSON(content)) {
        showToast('Backup importado com sucesso!', 'success');
        onDataImported();
      } else {
        showToast('Erro ao importar arquivo de backup. Verifique se o formato JSON é válido.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações do LeadSite</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie suas chaves de API, templates de WhatsApp por tipo de lead e backup de dados.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* API Keys Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-500" /> Chaves de API
          </h2>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Google Places API Key (Opcional)</label>
              <input
                type="password"
                value={googlePlacesApiKey}
                onChange={(e) => setGooglePlacesApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-xs text-slate-400">Usada para busca online opcional via Google Places.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Gemini API Key (Para análises de planilhas e pitches com IA)</label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-xs text-slate-400">Necessária para a análise inteligente de planilhas e pitches de vendas.</p>
            </div>
          </div>
        </div>

        {/* WhatsApp Templates Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-500" /> Templates de WhatsApp por Tipo de Lead
          </h2>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Variáveis disponíveis: <code className="text-indigo-600 dark:text-indigo-400 font-bold">{'{nome_empresa}'}</code>,{' '}
            <code className="text-indigo-600 dark:text-indigo-400 font-bold">{'{cidade}'}</code>,{' '}
            <code className="text-indigo-600 dark:text-indigo-400 font-bold">{'{segmento}'}</code>
          </p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-rose-600 dark:text-rose-400">Template para Leads "Sem Site"</label>
              <textarea
                value={whatsappTemplate}
                onChange={(e) => setWhatsappTemplate(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-amber-600 dark:text-amber-400">Template para Leads "Só Rede Social"</label>
              <textarea
                value={whatsappTemplateSocial}
                onChange={(e) => setWhatsappTemplateSocial(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Template para Leads "Tem Site"</label>
              <textarea
                value={whatsappTemplateSite}
                onChange={(e) => setWhatsappTemplateSite(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between">
          {savedMessage && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> Configurações salvas com sucesso!
            </span>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm shadow-lg shadow-indigo-600/25 transition-all"
            >
              Salvar Configurações
            </button>
          </div>
        </div>
      </form>

      {/* Backup & Restore Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-500" /> Backup, Restauração e Limpeza de Dados
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Seus dados (leads, histórico, colunas e configurações) são salvos no navegador. Você pode exportar um backup, restaurar ou limpar todos os leads do CRM.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            type="button"
            onClick={exportBackupJSON}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-xl text-sm transition-all"
          >
            <Download className="w-4 h-4" /> Exportar Backup JSON
          </button>

          <label className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium rounded-xl text-sm transition-all cursor-pointer">
            <Upload className="w-4 h-4" /> Restaurar Backup JSON
            <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
          </label>

          <button
            type="button"
            onClick={() => {
              saveColumns(DEFAULT_COLUMNS);
              onDataImported();
              showToast('Colunas padrão do CRM restauradas com sucesso!', 'success');
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium rounded-xl text-sm transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Restaurar Colunas Padrão
          </button>

          <button
            type="button"
            onClick={() => {
              askConfirm(
                'Apagar Todos os Leads',
                'ATENÇÃO: Deseja apagar TODOS os leads salvos no CRM? Esta ação não pode ser desfeita.',
                () => {
                  saveLeads([]);
                  onDataImported();
                  showToast('Todos os leads do CRM foram apagados.', 'success');
                },
                'Apagar tudo',
                'Cancelar',
                true
              );
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-medium rounded-xl text-sm transition-all"
          >
            <Trash2 className="w-4 h-4" /> Apagar Todos os Leads do CRM
          </button>
        </div>
      </div>
    </div>
  );
};
