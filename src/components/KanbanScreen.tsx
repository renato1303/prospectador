import React, { useState } from 'react';
import { KanbanColumn, Lead, WebsiteStatus } from '../types';
import { WEBSITE_STATUS_LABELS, WEBSITE_STATUS_COLORS, isBrazilianMobile } from '../utils/status';
import { Plus, Search, Phone, Star, Trash2, DollarSign, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  pointerWithin,
  closestCorners,
  CollisionDetection,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface KanbanScreenProps {
  leads: Lead[];
  columns: KanbanColumn[];
  onUpdateLeads: (leads: Lead[]) => void;
  onUpdateColumns: (columns: KanbanColumn[]) => void;
  onSelectLead: (lead: Lead) => void;
  onOpenWhatsApp: (lead: Lead) => void;
  onOpenAiPitch: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
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

interface SortableCardProps {
  lead: Lead;
  onSelect: () => void;
  onWhatsApp: () => void;
  onAiPitch: () => void;
  onDelete: () => void;
  isJustDragged: boolean;
}

const SortableCard: React.FC<SortableCardProps> = ({ lead, onSelect, onWhatsApp, onAiPitch, onDelete, isJustDragged }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isBrazilianMobile = (phoneStr?: string): boolean => {
    if (!phoneStr) return false;
    const digits = phoneStr.replace(/\D/g, '');
    if (digits.length === 11 && digits[2] === '9') return true;
    if (digits.length === 13 && digits.startsWith('55') && digits[4] === '9') return true;
    return false;
  };

  const canWhatsApp = isBrazilianMobile(lead.phone);

  const getStatusBadge = (status?: string) => {
    const st = (status as WebsiteStatus) || 'no_website';
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${WEBSITE_STATUS_COLORS[st] || WEBSITE_STATUS_COLORS.no_website}`}>
        {WEBSITE_STATUS_LABELS[st] || 'Sem site'}
      </span>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (isJustDragged) return;
        onSelect();
      }}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3 relative group"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              {lead.segment}
            </span>
            {getStatusBadge(lead.status)}
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1 leading-snug">{lead.name}</h4>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          {lead.rating ? lead.rating : 'N/A'}
        </span>
        {lead.dealValue > 0 && (
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
            <DollarSign className="w-3.5 h-3.5" />
            {lead.dealValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        )}
      </div>

      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {lead.tags.map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-400">
        <span>{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</span>
        <div
          className="flex items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onWhatsApp();
            }}
            disabled={!canWhatsApp}
            className={`p-1.5 rounded-lg text-white transition-all ${
              canWhatsApp ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
            }`}
            title={canWhatsApp ? 'Chamar no WhatsApp' : 'Telefone fixo'}
          >
            <Phone className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAiPitch();
            }}
            className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-all"
            title="Pitch com IA"
          >
            <Sparkles className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-all"
            title="Excluir Lead"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface DroppableColumnProps {
  column: KanbanColumn;
  leads: Lead[];
  onDeleteColumn: (id: string) => void;
  renderCard: (lead: Lead) => React.ReactNode;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ column, leads, onDeleteColumn, renderCard }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const [visibleCount, setVisibleCount] = useState(40);
  const visibleLeads = leads.slice(0, visibleCount);

  return (
    <div
      ref={setNodeRef}
      className={`w-80 shrink-0 bg-slate-50 dark:bg-slate-900/60 border rounded-2xl flex flex-col max-h-full overflow-hidden transition-colors ${
        isOver
          ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-lg'
          : 'border-slate-200 dark:border-slate-800/80'
      }`}
    >
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${column.color}`}>
            {column.title}
          </span>
          <span className="text-xs text-slate-400 font-semibold">({leads.length})</span>
        </div>
        <button
          onClick={() => onDeleteColumn(column.id)}
          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
          title="Excluir coluna"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[140px]">
        <SortableContext items={visibleLeads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {visibleLeads.map((lead) => renderCard(lead))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="h-28 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            Arraste leads para cá
          </div>
        )}
        {visibleLeads.length < leads.length && (
          <button
            onClick={() => setVisibleCount((prev) => prev + 40)}
            className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium transition-all"
          >
            Carregar mais ({leads.length - visibleLeads.length} restantes)
          </button>
        )}
      </div>
    </div>
  );
};

export const KanbanScreen: React.FC<KanbanScreenProps> = ({
  leads,
  columns,
  onUpdateLeads,
  onUpdateColumns,
  onSelectLead,
  onOpenWhatsApp,
  onOpenAiPitch,
  onDeleteLead,
  askConfirm,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [websiteFilter, setWebsiteFilter] = useState('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isJustDragged, setIsJustDragged] = useState(false);

  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 8,
      },
    })
  );

  const customCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      const cardCollisions = pointerCollisions.filter((c) => !columns.some((col) => col.id === c.id));
      if (cardCollisions.length > 0) {
        return cardCollisions;
      }
      return pointerCollisions;
    }
    return closestCorners(args);
  };

  const segments = Array.from(new Set(leads.map((l) => l.segment)));
  const cities = Array.from(new Set(leads.map((l) => l.city)));
  const allTags = Array.from(new Set(leads.flatMap((l) => l.tags || [])));

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      lead.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSegment = selectedSegment === 'all' || lead.segment === selectedSegment;
    const matchesCity = selectedCity === 'all' || lead.city === selectedCity;
    const matchesTag = selectedTag === 'all' || (lead.tags && lead.tags.includes(selectedTag));
    const matchesWebsite = websiteFilter === 'all' || lead.status === websiteFilter;
    return matchesSearch && matchesSegment && matchesCity && matchesTag && matchesWebsite;
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsJustDragged(true);
    setTimeout(() => setIsJustDragged(false), 250);

    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeLeadId = active.id as string;
    const overId = over.id as string;

    const leadToMove = leads.find((l) => l.id === activeLeadId);
    if (!leadToMove) return;

    let targetColumnId = overId;
    const isOverColumn = columns.some((c) => c.id === overId);

    if (!isOverColumn) {
      const overLead = leads.find((l) => l.id === overId);
      if (overLead) {
        targetColumnId = overLead.columnId;
      }
    }

    if (leadToMove.columnId !== targetColumnId) {
      if (targetColumnId === 'ganho') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      const now = new Date().toISOString();
      const colTitle = columns.find((c) => c.id === targetColumnId)?.title || targetColumnId;
      const updatedHistory = [
        {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: now,
          type: 'column_change' as const,
          description: `Movido para a coluna: ${colTitle}`,
        },
        ...leadToMove.history,
      ];

      const updatedLeads = leads.map((l) =>
        l.id === leadToMove.id ? { ...l, columnId: targetColumnId, updatedAt: now, history: updatedHistory } : l
      );
      onUpdateLeads(updatedLeads);
    }
  };

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    const newColId = newColumnTitle.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substring(2, 5);
    const newColumns: KanbanColumn[] = [
      ...columns,
      {
        id: newColId,
        title: newColumnTitle.trim(),
        color: 'bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-800',
        order: columns.length,
      },
    ];
    onUpdateColumns(newColumns);
    setNewColumnTitle('');
    setIsAddingColumn(false);
    showToast('Nova coluna adicionada ao Kanban.', 'success');
  };

  const handleDeleteColumn = (colId: string) => {
    if (columns.length <= 2) {
      showToast('O CRM precisa ter pelo menos 2 colunas.', 'error');
      return;
    }
    const col = columns.find((c) => c.id === colId);
    const colLeadsCount = leads.filter((l) => l.columnId === colId).length;
    const firstCol = columns.find((c) => c.id !== colId) || columns[0];

    askConfirm(
      'Excluir Coluna',
      `Tem certeza que deseja excluir esta coluna ("${col?.title}")? Os ${colLeadsCount} leads nela serão movidos para a coluna "${firstCol.title}".`,
      () => {
        const updatedLeads = leads.map((l) => (l.columnId === colId ? { ...l, columnId: firstCol.id } : l));
        const updatedColumns = columns.filter((c) => c.id !== colId);
        onUpdateLeads(updatedLeads);
        onUpdateColumns(updatedColumns);
        showToast('Coluna excluída com sucesso.', 'success');
      }
    );
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 h-screen flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">CRM Kanban</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie seu pipeline de prospecção e fechamento de vendas.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar no Kanban..."
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-60"
            />
          </div>

          <select
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todos Segmentos</option>
            {segments.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todas Cidades</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={websiteFilter}
            onChange={(e) => setWebsiteFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todos os Sites</option>
            <option value="no_website">Sem site</option>
            <option value="social_only">Só rede social</option>
            <option value="has_website">Tem site</option>
          </select>

          {allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todas Tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => setIsAddingColumn(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Nova Coluna
          </button>
        </div>
      </div>

      {isAddingColumn && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddColumn} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Adicionar Coluna ao Kanban</h3>
            <input
              type="text"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              placeholder="Nome da Coluna (ex: Reunião Agendada)"
              required
              autoFocus
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingColumn(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition-all"
              >
                Adicionar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-x-auto pb-6">
        <DndContext
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 h-full min-h-[500px]">
            {columns.map((col) => {
              const colLeads = filteredLeads.filter((l) => l.columnId === col.id);
              return (
                <DroppableColumn
                  key={col.id}
                  column={col}
                  leads={colLeads}
                  onDeleteColumn={handleDeleteColumn}
                  renderCard={(lead) => (
                    <SortableCard
                      key={lead.id}
                      lead={lead}
                      onSelect={() => onSelectLead(lead)}
                      onWhatsApp={() => onOpenWhatsApp(lead)}
                      onAiPitch={() => onOpenAiPitch(lead)}
                      onDelete={() => {
                        askConfirm(
                          'Excluir Lead',
                          `Tem certeza que deseja excluir o lead "${lead.name}"?`,
                          () => {
                            onDeleteLead(lead.id);
                            showToast('Lead excluído.', 'success');
                          }
                        );
                      }}
                      isJustDragged={isJustDragged}
                    />
                  )}
                />
              );
            })}
          </div>
        </DndContext>
      </div>
    </div>
  );
};
