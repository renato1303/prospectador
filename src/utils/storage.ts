import { Lead, KanbanColumn, SearchQuery, AppSettings } from '../types';

export const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'novo_lead', title: 'Novo Lead', color: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800', order: 0 },
  { id: 'contatado', title: 'Contatado', color: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800', order: 1 },
  { id: 'respondeu', title: 'Respondeu', color: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800', order: 2 },
  { id: 'proposta', title: 'Proposta Enviada', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-800', order: 3 },
  { id: 'ganho', title: 'Fechado (Ganho)', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800', order: 4 },
  { id: 'perdido', title: 'Perdido', color: 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800', order: 5 },
];

export const DEFAULT_SETTINGS: AppSettings = {
  googlePlacesApiKey: '',
  geminiApiKey: '',
  whatsappTemplate: 'Olá {nome_empresa}! Sou especialista em desenvolvimento web. Pesquisando empresas de {segmento} em {cidade}, notei que vocês ainda não possuem um site profissional próprio. Ter um site aumenta muito a credibilidade e traz novos clientes pelo Google. Podemos conversar 5 minutinhos sobre isso?',
  whatsappTemplateSocial: 'Olá {nome_empresa}! Sou especialista em desenvolvimento web. Vi o perfil de vocês na internet e notei que o contato hoje é só por rede social. Um site próprio, que aparece no Google quando alguém busca por {segmento} em {cidade}, traz mais clientes e credibilidade. Posso te mostrar uma ideia em 5 minutinhos?',
  whatsappTemplateSite: 'Olá {nome_empresa}! Sou especialista em desenvolvimento web. Dei uma olhada no site de vocês e vi algumas oportunidades de melhorar velocidade, visual no celular e aparecer melhor no Google em {cidade}. Posso te enviar uma análise rápida, sem compromisso?',
  theme: 'light',
};

const STORAGE_KEYS = {
  LEADS: 'leadsite_leads_v1',
  COLUMNS: 'leadsite_columns_v1',
  SEARCHES: 'leadsite_searches_v1',
  SETTINGS: 'leadsite_settings_v1',
};

export function loadColumns(): KanbanColumn[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.COLUMNS);
    let cols: KanbanColumn[] = data ? JSON.parse(data) : DEFAULT_COLUMNS;
    if (!cols.some((c) => c.id === 'novo_lead')) {
      const novoLeadCol: KanbanColumn = {
        id: 'novo_lead',
        title: 'Novo Lead',
        color: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
        order: 0,
      };
      cols = [novoLeadCol, ...cols.map((c, i) => ({ ...c, order: i + 1 }))];
      localStorage.setItem(STORAGE_KEYS.COLUMNS, JSON.stringify(cols));
    }
    return cols;
  } catch (e) {
    console.error('Error loading columns:', e);
    return DEFAULT_COLUMNS;
  }
}

export function saveColumns(columns: KanbanColumn[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COLUMNS, JSON.stringify(columns));
  } catch (e) {
    console.error('Error saving columns:', e);
  }
}

export function loadLeads(): Lead[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LEADS);
    const leads: Lead[] = data ? JSON.parse(data) : [];
    const cols = loadColumns();
    const colIds = new Set(cols.map((c) => c.id));
    const firstColId = cols[0]?.id || 'novo_lead';
    let needsSave = false;
    const repaired = leads.map((l) => {
      if (!l.columnId || !colIds.has(l.columnId)) {
        needsSave = true;
        return { ...l, columnId: firstColId };
      }
      return l;
    });
    if (needsSave) {
      localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(repaired));
    }
    return repaired;
  } catch (e) {
    console.error('Error loading leads:', e);
    return [];
  }
}

export function saveLeads(leads: Lead[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
  } catch (e) {
    console.error('Error saving leads:', e);
  }
}

export function loadSearches(): SearchQuery[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SEARCHES);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error loading searches:', e);
    return [];
  }
}

export function saveSearches(searches: SearchQuery[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SEARCHES, JSON.stringify(searches));
  } catch (e) {
    console.error('Error saving searches:', e);
  }
}

export function loadSettings(): AppSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch (e) {
    console.error('Error loading settings:', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings:', e);
  }
}

export function exportBackupJSON(): void {
  const backup = {
    leads: loadLeads(),
    columns: loadColumns(),
    searches: loadSearches(),
    settings: loadSettings(),
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leadsite_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackupJSON(jsonStr: string): boolean {
  try {
    const backup = JSON.parse(jsonStr);
    if (backup && Array.isArray(backup.leads)) {
      localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(backup.leads));
      if (Array.isArray(backup.columns)) {
        localStorage.setItem(STORAGE_KEYS.COLUMNS, JSON.stringify(backup.columns));
      }
      if (Array.isArray(backup.searches)) {
        localStorage.setItem(STORAGE_KEYS.SEARCHES, JSON.stringify(backup.searches));
      }
      if (backup.settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(backup.settings));
      }
      return true;
    }
    return false;
  } catch (e) {
    console.error('Error importing backup:', e);
    return false;
  }
}
