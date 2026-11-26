import React, { useState } from 'react';
import { SearchQuery, Lead, KanbanColumn } from '../types';
import { Search, History, Building2, Download, Calendar, ExternalLink, Phone, Star, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface HistoryScreenProps {
  searches: SearchQuery[];
  leads: Lead[];
  columns: KanbanColumn[];
  onRerunSearch: (segment: string, city: string) => void;
  onSelectLead: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  onClearSearches: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  searches,
  leads,
  columns,
  onRerunSearch,
  onSelectLead,
  onDeleteLead,
  onClearSearches,
}) => {
  const [activeTab, setActiveTab] = useState<'searches' | 'leads'>('leads');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredLeads = leads.filter((lead) => {
    const matchesQuery =
      lead.name.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      lead.segment.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      lead.city.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      lead.phone.includes(leadSearchQuery);
    const matchesStatus = statusFilter === 'all' || lead.columnId === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const handleExportSavedLeads = () => {
    const dataToExport = filteredLeads.map((l) => {
      const colTitle = columns.find((c) => c.id === l.columnId)?.title || l.columnId;
      return {
        Nome: l.name,
        Segmento: l.segment,
        Telefone: l.phone,
        Endereço: l.address,
        Cidade: l.city,
        Nota: l.rating,
        Avaliações: l.userRatingCount,
        'Link Maps': l.googleMapsUri,
        Status: colTitle,
        'Valor Acordado/Negócio': l.dealValue || 0,
        'Data de Entrada': new Date(l.createdAt).toLocaleDateString('pt-BR'),
        Observações: l.notes || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads CRM');
    XLSX.writeFile(workbook, `leads_crm_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Histórico e Registros</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Visualize seu histórico de buscas e todos os leads salvos no CRM.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'leads' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Leads Salvos ({leads.length})
          </button>
          <button
            onClick={() => setActiveTab('searches')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'searches' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Buscas Realizadas ({searches.length})
          </button>
        </div>
      </div>

      {activeTab === 'leads' && (
        <div className="space-y-6">
          {/* Filters & Export */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={leadSearchQuery}
                  onChange={(e) => setLeadSearchQuery(e.target.value)}
                  placeholder="Filtrar por nome, segmento, cidade..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Todas as Etapas</option>
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportSavedLeads}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-xs shadow-sm transition-all"
            >
              <Download className="w-4 h-4" /> Exportar Leads (.xlsx)
            </button>
          </div>

          {/* Leads Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <th className="p-4">Empresa</th>
                    <th className="p-4">Segmento / Cidade</th>
                    <th className="p-4">Telefone</th>
                    <th className="p-4">Etapa CRM</th>
                    <th className="p-4">Valor</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  {filteredLeads.map((lead) => {
                    const col = columns.find((c) => c.id === lead.columnId);
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => onSelectLead(lead)}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      >
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{lead.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{lead.address}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{lead.segment}</span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{lead.city}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-slate-700 dark:text-slate-300 text-xs font-medium">{lead.phone || 'Não informado'}</span>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${col?.color || 'bg-slate-100 text-slate-700'}`}>
                            {col?.title || lead.columnId}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {lead.dealValue ? lead.dealValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                          </span>
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onDeleteLead(lead.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                            title="Excluir lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredLeads.length === 0 && (
              <div className="p-12 text-center text-slate-400 text-sm">Nenhum lead encontrado com os filtros atuais.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'searches' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
            <span className="text-xs text-slate-500 dark:text-slate-400">Total de consultas realizadas: {searches.length}</span>
            {searches.length > 0 && (
              <button
                onClick={onClearSearches}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium"
              >
                Limpar Histórico de Buscas
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searches.map((s) => (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                      {s.segment}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {new Date(s.timestamp).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{s.city}</h3>
                  {s.neighborhoods && s.neighborhoods.length > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Bairros: {s.neighborhoods.join(', ')}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Encontrados: <strong className="text-slate-900 dark:text-white">{s.totalFound}</strong> | Sem site:{' '}
                    <strong className="text-indigo-600 dark:text-indigo-400">{s.totalNoWebsite}</strong>
                  </div>
                  <button
                    onClick={() => onRerunSearch(s.segment, s.city)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium shadow-sm transition-all"
                  >
                    <Search className="w-3.5 h-3.5" /> Refazer Busca
                  </button>
                </div>
              </div>
            ))}
          </div>

          {searches.length === 0 && (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-sm">
              Nenhuma busca realizada ainda.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
