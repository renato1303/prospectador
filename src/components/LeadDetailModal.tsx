import React, { useState } from 'react';
import { X, Phone, MapPin, Star, Tag, Calendar, DollarSign, Clock, MessageSquare, AlertCircle, Trash2, Globe } from 'lucide-react';
import { Lead, KanbanColumn } from '../types';
import { WEBSITE_STATUS_LABELS, WEBSITE_STATUS_COLORS } from '../utils/status';

interface LeadDetailModalProps {
  lead: Lead;
  columns: KanbanColumn[];
  onClose: () => void;
  onUpdateLead: (updatedLead: Lead) => void;
  onOpenWhatsApp: (lead: Lead) => void;
  onOpenAiPitch: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  askConfirm?: (title: string, message: string, onConfirm: () => void, confirmLabel?: string, cancelLabel?: string, isDanger?: boolean) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  columns,
  onClose,
  onUpdateLead,
  onOpenWhatsApp,
  onOpenAiPitch,
  onDeleteLead,
  askConfirm,
}) => {
  const [notes, setNotes] = useState(lead.notes || '');
  const [dealValue, setDealValue] = useState(lead.dealValue ? lead.dealValue.toString() : '');
  const [nextFollowUp, setNextFollowUp] = useState(lead.nextFollowUp ? lead.nextFollowUp.slice(0, 10) : '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(lead.tags || []);
  const [lossReason, setLossReason] = useState(lead.lossReason || '');
  const [columnId, setColumnId] = useState(lead.columnId);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        const newTags = [...tags, tagInput.trim()];
        setTags(newTags);
        updateLeadField({ tags: newTags });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter((t) => t !== tagToRemove);
    setTags(newTags);
    updateLeadField({ tags: newTags });
  };

  const updateLeadField = (fields: Partial<Lead>) => {
    const now = new Date().toISOString();
    const updatedHistory = [...lead.history];

    if (fields.columnId && fields.columnId !== lead.columnId) {
      const col = columns.find((c) => c.id === fields.columnId);
      updatedHistory.unshift({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: now,
        type: 'column_change',
        description: `Movido para a coluna: ${col?.title || fields.columnId}`,
      });
    }

    const updated: Lead = {
      ...lead,
      ...fields,
      updatedAt: now,
      history: updatedHistory,
    };
    onUpdateLead(updated);
  };

  const handleSaveNotes = () => {
    updateLeadField({ notes });
  };

  const handleSaveDealValue = () => {
    const val = parseFloat(dealValue) || 0;
    updateLeadField({ dealValue: val });
  };

  const handleSaveFollowUp = () => {
    updateLeadField({ nextFollowUp: nextFollowUp ? new Date(nextFollowUp).toISOString() : undefined });
  };

  const handleColumnChange = (newColId: string) => {
    setColumnId(newColId);
    if (newColId === 'perdido' && !lossReason) {
      setLossReason('Sem orçamento / Não respondeu');
    }
    updateLeadField({ columnId: newColId, lossReason: newColId === 'perdido' ? lossReason : undefined });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                {lead.segment}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {lead.city}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{lead.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (askConfirm) {
                  askConfirm(
                    'Excluir Lead',
                    `Tem certeza que deseja excluir o lead "${lead.name}"?`,
                    () => {
                      onDeleteLead(lead.id);
                    }
                  );
                } else {
                  onDeleteLead(lead.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium transition-colors"
              title="Excluir Lead"
            >
              <Trash2 className="w-4 h-4" /> Excluir
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => onOpenWhatsApp(lead)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm shadow-md shadow-emerald-600/20 transition-all"
              >
                <Phone className="w-4 h-4" /> Chamar no WhatsApp
              </button>
              <button
                onClick={() => onOpenAiPitch(lead)}
                className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl text-sm shadow-md shadow-violet-600/20 transition-all"
              >
                <MessageSquare className="w-4 h-4" /> Gerar Pitch com IA
              </button>
              {lead.googleMapsUri && (
                <a
                  href={lead.googleMapsUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-xl text-sm transition-all"
                >
                  <MapPin className="w-4 h-4 text-rose-500" /> Ver no Maps
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Telefone</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{lead.phone || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Avaliação</span>
                <div className="flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-white">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  {lead.rating ? `${lead.rating} (${lead.userRatingCount || 0})` : 'Sem nota'}
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Status Web</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold inline-block ${WEBSITE_STATUS_COLORS[lead.status]}`}>
                  {WEBSITE_STATUS_LABELS[lead.status]}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Website / Link</span>
                {lead.websiteUri ? (
                  <a
                    href={lead.websiteUri.startsWith('http') ? lead.websiteUri : `https://${lead.websiteUri}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 break-all"
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    {lead.websiteUri}
                  </a>
                ) : (
                  <span className="text-sm text-slate-400">Não informado</span>
                )}
              </div>
              <div className="col-span-2 sm:col-span-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Endereço</span>
                <span className="text-sm text-slate-900 dark:text-white">{lead.address || 'Não informado'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Observações e Anotações</span>
                <button
                  onClick={handleSaveNotes}
                  className="text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
                >
                  Salvar Notas
                </button>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione observações sobre a conversa, objeções, interesse..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" /> Histórico de Interações
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {lead.history?.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-slate-800 dark:text-slate-200 font-medium">{item.description}</p>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                        {new Date(item.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6 bg-slate-50/80 dark:bg-slate-800/30 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900 dark:text-white">Estágio no CRM</label>
              <select
                value={columnId}
                onChange={(e) => handleColumnChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            {columnId === 'perdido' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Motivo da Perda
                </label>
                <input
                  type="text"
                  value={lossReason}
                  onChange={(e) => {
                    setLossReason(e.target.value);
                    updateLeadField({ lossReason: e.target.value });
                  }}
                  placeholder="Ex: Preço alto, já tem site próprio..."
                  className="w-full rounded-xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Valor Estimado (R$)</span>
                <button
                  onClick={handleSaveDealValue}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Salvar
                </button>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="number"
                  value={dealValue}
                  onChange={(e) => setDealValue(e.target.value)}
                  placeholder="1500"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Próximo Follow-up</span>
                <button
                  onClick={handleSaveFollowUp}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Salvar
                </button>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={nextFollowUp}
                  onChange={(e) => setNextFollowUp(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Tag className="w-4 h-4" /> Tags (Pressione Enter)
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Ex: Quente, Indicação"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-rose-500 transition-colors ml-0.5"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
