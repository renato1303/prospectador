import React from 'react';
import { Lead, KanbanColumn } from '../types';
import { Users, PhoneCall, MessageCircle, FileText, CheckCircle, XCircle, DollarSign, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, FunnelChart, Funnel, LabelList, Cell } from 'recharts';

interface DashboardScreenProps {
  leads: Lead[];
  columns: KanbanColumn[];
  onSelectLead: (lead: Lead) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ leads, columns, onSelectLead }) => {
  const totalLeads = leads.length;
  const contacted = leads.filter((l) => l.columnId === 'contatado' || l.columnId === 'respondeu' || l.columnId === 'proposta' || l.columnId === 'ganho').length;
  const responded = leads.filter((l) => l.columnId === 'respondeu' || l.columnId === 'proposta' || l.columnId === 'ganho').length;
  const proposals = leads.filter((l) => l.columnId === 'proposta' || l.columnId === 'ganho').length;
  const won = leads.filter((l) => l.columnId === 'ganho').length;
  const lost = leads.filter((l) => l.columnId === 'perdido').length;

  const contactToResponseRate = contacted > 0 ? ((responded / contacted) * 100).toFixed(1) : '0';
  const responseToProposalRate = responded > 0 ? ((proposals / responded) * 100).toFixed(1) : '0';
  const proposalToCloseRate = proposals > 0 ? ((won / proposals) * 100).toFixed(1) : '0';
  const overallConversionRate = totalLeads > 0 ? ((won / totalLeads) * 100).toFixed(1) : '0';

  const totalNegotiatingValue = leads
    .filter((l) => l.columnId !== 'ganho' && l.columnId !== 'perdido')
    .reduce((acc, l) => acc + (l.dealValue || 0), 0);

  const totalWonValue = leads
    .filter((l) => l.columnId === 'ganho')
    .reduce((acc, l) => acc + (l.dealValue || 0), 0);

  // Funnel chart data
  const funnelData = [
    { name: 'Novo Lead', value: totalLeads, fill: '#6366f1' },
    { name: 'Contatado', value: contacted, fill: '#f59e0b' },
    { name: 'Respondeu', value: responded, fill: '#a855f7' },
    { name: 'Proposta', value: proposals, fill: '#3b82f6' },
    { name: 'Fechado', value: won, fill: '#10b981' },
  ];

  // Leads per week (group by creation week)
  const weeklyMap: { [key: string]: number } = {};
  leads.forEach((l) => {
    const date = new Date(l.createdAt);
    const weekKey = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
    weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + 1;
  });

  const weeklyData = Object.keys(weeklyMap)
    .sort()
    .slice(-6)
    .map((week) => ({
      week,
      leads: weeklyMap[week],
    }));

  // Follow-ups today or overdue
  const todayStr = new Date().toISOString().slice(0, 10);
  const followUps = leads.filter((l) => {
    if (!l.nextFollowUp) return false;
    const fDate = l.nextFollowUp.slice(0, 10);
    return fDate <= todayStr && l.columnId !== 'ganho' && l.columnId !== 'perdido';
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard de Conversão</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Métricas de desempenho, valores em negociação e funil de vendas.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Leads</span>
            <Users className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalLeads}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Contatados</span>
            <PhoneCall className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{contacted}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-1">
            <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Responderam</span>
            <MessageCircle className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{responded}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Propostas</span>
            <FileText className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{proposals}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Fechados</span>
            <CheckCircle className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{won}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Perdidos</span>
            <XCircle className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{lost}</p>
        </div>
      </div>

      {/* Financial & Conversion Rates Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Financial Overview */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" /> Valores em Negociação
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Em Negociação</span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                {totalNegotiatingValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
              <span className="text-xs text-emerald-700 dark:text-emerald-300 block mb-1">Receita Fechada</span>
              <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
                {totalWonValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
        </div>

        {/* Conversion Rates */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" /> Taxas de Conversão do Funil
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Contato → Resposta</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{contactToResponseRate}%</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Resposta → Proposta</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{responseToProposalRate}%</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Proposta → Fechamento</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{proposalToCloseRate}%</span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60">
              <span className="text-xs text-indigo-700 dark:text-indigo-300 block">Conversão Geral</span>
              <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{overallConversionRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts & Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Leads Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4 lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Leads Capturados por Semana</h3>
          <div className="h-72">
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <XAxis dataKey="week" stroke="#888888" fontSize={12} />
                  <YAxis stroke="#888888" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="leads" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Sem dados suficientes</div>
            )}
          </div>
        </div>

        {/* Follow-ups Today */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-500" /> Follow-ups do Dia / Atrasados
          </h3>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {followUps.map((l) => (
              <div
                key={l.id}
                onClick={() => onSelectLead(l)}
                className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 cursor-pointer hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white text-xs">{l.name}</span>
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    {new Date(l.nextFollowUp!).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{l.segment} • {l.city}</p>
              </div>
            ))}
            {followUps.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-400">Nenhum follow-up pendente para hoje. Bom trabalho!</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
