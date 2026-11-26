import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ImportScreen } from './components/ImportScreen';
import { KanbanScreen } from './components/KanbanScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { LeadDetailModal } from './components/LeadDetailModal';
import { AiPitchModal } from './components/AiPitchModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ToastContainer, ToastMessage } from './components/Toast';
import {
  loadLeads,
  saveLeads,
  loadColumns,
  saveColumns,
  loadSearches,
  saveSearches,
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
} from './utils/storage';
import { Lead, KanbanColumn, SearchQuery, AppSettings } from './types';
import { newId, normalizePhone, WEBSITE_STATUS_LABELS } from './utils/status';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('import');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [searches, setSearches] = useState<SearchQuery[]>([]);
  const [settings, setSettings] = useState<AppSettings>(loadSettings());

  // Toast & Confirm state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Modals state
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [selectedLeadForAi, setSelectedLeadForAi] = useState<Lead | null>(null);

  useEffect(() => {
    setLeads(loadLeads());
    setColumns(loadColumns());
    setSearches(loadSearches());
    const loadedSettings = loadSettings();
    setSettings(loadedSettings);
    if (loadedSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = newId();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const askConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel = 'Excluir',
    cancelLabel = 'Cancelar',
    isDanger = true
  ) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      confirmLabel,
      cancelLabel,
      isDanger,
      onConfirm: () => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        onConfirm();
      },
    });
  };

  const handleUpdateLeads = (newLeads: Lead[]) => {
    setLeads(newLeads);
    saveLeads(newLeads);
  };

  const handleUpdateColumns = (newCols: KanbanColumn[]) => {
    setColumns(newCols);
    saveColumns(newCols);
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveSettings(updated);
    if (updated.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleAddLeadsBatch = (newLeadsBatch: Partial<Lead>[]): { addedCount: number; skippedCount: number } => {
    const now = new Date().toISOString();
    const formattedNewLeads: Lead[] = newLeadsBatch.map((lData) => {
      const st = lData.status || 'no_website';
      return {
        id: lData.placeId || newId(),
        placeId: lData.placeId,
        name: lData.name || 'Empresa',
        segment: lData.segment || 'Comércio',
        city: lData.city || 'Não informada',
        address: lData.address || '',
        phone: lData.phone || '',
        internationalPhoneNumber: lData.internationalPhoneNumber,
        rating: lData.rating || 0,
        userRatingCount: lData.userRatingCount || 0,
        googleMapsUri: lData.googleMapsUri || '',
        websiteUri: lData.websiteUri || '',
        status: st,
        columnId: 'novo_lead',
        tags: lData.tags || ['Importação', WEBSITE_STATUS_LABELS[st]],
        notes: lData.notes || '',
        dealValue: 0,
        createdAt: now,
        updatedAt: now,
        history: [
          {
            id: newId(),
            timestamp: now,
            type: 'created' as const,
            description: 'Lead importado para o CRM',
          },
        ],
      };
    });

    const existingPhones = new Set(leads.map((l) => normalizePhone(l.phone)).filter(Boolean));
    const existingNameCity = new Set(leads.map((l) => `${l.name.toLowerCase().trim()}|${l.city.toLowerCase().trim()}`));

    let addedCount = 0;
    let skippedCount = 0;
    const uniqueBatch: Lead[] = [];

    for (const nl of formattedNewLeads) {
      const normPhone = normalizePhone(nl.phone);
      const nameCityKey = `${nl.name.toLowerCase().trim()}|${nl.city.toLowerCase().trim()}`;
      const isDuplicate = (normPhone && existingPhones.has(normPhone)) || existingNameCity.has(nameCityKey);

      if (isDuplicate) {
        skippedCount++;
      } else {
        if (normPhone) existingPhones.add(normPhone);
        existingNameCity.add(nameCityKey);
        uniqueBatch.push(nl);
        addedCount++;
      }
    }

    if (uniqueBatch.length > 0) {
      const updated = [...uniqueBatch, ...leads];
      handleUpdateLeads(updated);
    }

    return { addedCount, skippedCount };
  };

  const handleSaveSearchQuery = (query: SearchQuery) => {
    const updated = [query, ...searches];
    setSearches(updated);
    saveSearches(updated);
  };

  const handleOpenWhatsApp = (lead: Lead, customText?: string) => {
    let cleanPhone = normalizePhone(lead.phone);
    if (!cleanPhone.startsWith('55') && cleanPhone.length <= 11) {
      cleanPhone = '55' + cleanPhone;
    }

    let template = settings.whatsappTemplate;
    if (lead.status === 'social_only') {
      template = settings.whatsappTemplateSocial || DEFAULT_SETTINGS.whatsappTemplateSocial;
    } else if (lead.status === 'has_website') {
      template = settings.whatsappTemplateSite || DEFAULT_SETTINGS.whatsappTemplateSite;
    }

    let text = customText || template;
    text = text
      .replace(/{nome_empresa}/g, lead.name)
      .replace(/{cidade}/g, lead.city)
      .replace(/{segmento}/g, lead.segment);

    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, '_blank');

    const now = new Date().toISOString();
    const updatedHistory = [
      {
        id: newId(),
        timestamp: now,
        type: 'whatsapp' as const,
        description: 'Contato iniciado via WhatsApp',
      },
      ...lead.history,
    ];

    const newColumnId = lead.columnId === 'novo_lead' ? 'contatado' : lead.columnId;
    if (newColumnId !== lead.columnId) {
      updatedHistory.unshift({
        id: newId(),
        timestamp: now,
        type: 'column_change' as const,
        description: 'Movido para a coluna: Contatado',
      });
    }

    const updatedLeads = leads.map((l) =>
      l.id === lead.id
        ? {
            ...l,
            columnId: newColumnId,
            updatedAt: now,
            history: updatedHistory,
          }
        : l
    );
    handleUpdateLeads(updatedLeads);

    if (selectedLeadForDetail && selectedLeadForDetail.id === lead.id) {
      setSelectedLeadForDetail({
        ...selectedLeadForDetail,
        columnId: newColumnId,
        history: updatedHistory,
      });
    }
  };

  const handleRerunSearch = (_segment: string, _city: string) => {
    setActiveTab('import');
  };

  const handleDeleteLead = (leadId: string, leadName?: string) => {
    askConfirm(
      'Excluir Lead',
      `Tem certeza que deseja excluir o lead "${leadName || 'selecionado'}" do CRM?`,
      () => {
        const updated = leads.filter((l) => l.id !== leadId);
        handleUpdateLeads(updated);
        showToast('Lead excluído.', 'success');
      }
    );
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        updateSettings={handleUpdateSettings}
        savedLeadsCount={leads.length}
      />

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'import' && (
          <ImportScreen
            settings={settings}
            savedLeads={leads}
            onAddLeadsBatch={handleAddLeadsBatch}
            onSaveSearchQuery={handleSaveSearchQuery}
            showToast={showToast}
          />
        )}

        {activeTab === 'kanban' && (
          <KanbanScreen
            leads={leads}
            columns={columns}
            onUpdateLeads={handleUpdateLeads}
            onUpdateColumns={handleUpdateColumns}
            onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
            onOpenWhatsApp={handleOpenWhatsApp}
            onOpenAiPitch={(lead) => setSelectedLeadForAi(lead)}
            onDeleteLead={(id) => {
              const l = leads.find((item) => item.id === id);
              handleDeleteLead(id, l?.name);
            }}
            askConfirm={askConfirm}
            showToast={showToast}
          />
        )}

        {activeTab === 'history' && (
          <HistoryScreen
            searches={searches}
            leads={leads}
            columns={columns}
            onRerunSearch={handleRerunSearch}
            onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
            onDeleteLead={(id) => {
              const l = leads.find((item) => item.id === id);
              handleDeleteLead(id, l?.name);
            }}
            onClearSearches={() => {
              askConfirm(
                'Limpar Histórico de Buscas',
                'Tem certeza que deseja apagar todo o histórico de buscas realizadas?',
                () => {
                  setSearches([]);
                  saveSearches([]);
                  showToast('Histórico de buscas limpo.', 'success');
                }
              );
            }}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardScreen
            leads={leads}
            columns={columns}
            onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onDataImported={() => {
              setLeads(loadLeads());
              setColumns(loadColumns());
              setSearches(loadSearches());
              setSettings(loadSettings());
            }}
            askConfirm={askConfirm}
            showToast={showToast}
          />
        )}
      </main>

      {/* Modals */}
      {selectedLeadForDetail && (
        <LeadDetailModal
          lead={selectedLeadForDetail}
          columns={columns}
          onClose={() => setSelectedLeadForDetail(null)}
          onUpdateLead={(updated) => {
            setSelectedLeadForDetail(updated);
            const updatedLeads = leads.map((l) => (l.id === updated.id ? updated : l));
            handleUpdateLeads(updatedLeads);
          }}
          onOpenWhatsApp={handleOpenWhatsApp}
          onOpenAiPitch={(lead) => setSelectedLeadForAi(lead)}
          onDeleteLead={(id) => {
            handleDeleteLead(id, selectedLeadForDetail.name);
            setSelectedLeadForDetail(null);
          }}
          askConfirm={askConfirm}
        />
      )}

      {selectedLeadForAi && (
        <AiPitchModal
          lead={selectedLeadForAi}
          settings={settings}
          onClose={() => setSelectedLeadForAi(null)}
          onOpenWhatsAppWithText={(lead, text) => {
            setSelectedLeadForAi(null);
            handleOpenWhatsApp(lead, text);
          }}
        />
      )}

      {/* Global Confirm Dialog & Toast */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        isDanger={confirmState.isDanger}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
