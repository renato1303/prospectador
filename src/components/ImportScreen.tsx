import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, Filter, Sparkles, Phone, MapPin, Trash2, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { Lead, AppSettings, SearchQuery, WebsiteStatus } from '../types';
import { classifyWebsite, WEBSITE_STATUS_LABELS, WEBSITE_STATUS_COLORS, newId, normalizePhone, isBrazilianMobile } from '../utils/status';
import * as XLSX from 'xlsx';

interface ImportScreenProps {
  settings: AppSettings;
  savedLeads: Lead[];
  onAddLeadsBatch: (leads: Partial<Lead>[]) => { addedCount: number; skippedCount: number };
  onSaveSearchQuery: (query: SearchQuery) => void;
  showToast?: (message: string, type: 'success' | 'error') => void;
}

interface MappedColumns {
  name: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  category: string;
  rating: string;
  reviews: string;
  mapsUrl: string;
}

interface ParsedRow {
  id: string;
  raw: any;
  name: string;
  phone: string;
  cleanPhone: string;
  website: string;
  address: string;
  city: string;
  category: string;
  rating: number;
  reviews: number;
  mapsUrl: string;
  webStatus: WebsiteStatus;
  existsInCRM: boolean;
  selected: boolean;
}

const MAPS_DOMAINS = ['google.com/maps', 'maps.app.goo.gl', 'goo.gl/maps', 'g.page'];

export const ImportScreen: React.FC<ImportScreenProps> = ({
  settings,
  savedLeads,
  onAddLeadsBatch,
  showToast,
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'success'>('upload');
  const [fileName, setFileName] = useState('');
  const [rawSheetRows, setRawSheetRows] = useState<any[][]>([]);
  const [headerRowIdx, setHeaderRowIdx] = useState<number>(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [pastedText, setPastedText] = useState('');

  // Mapping
  const [mapping, setMapping] = useState<MappedColumns>({
    name: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    category: '',
    rating: '',
    reviews: '',
    mapsUrl: '',
  });

  const [defaultSegment, setDefaultSegment] = useState('');
  const [defaultCity, setDefaultCity] = useState('');

  // Preview & Results
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(150);
  const [statusFilter, setStatusFilter] = useState<'all' | 'no_website' | 'social_only' | 'has_website'>('all');
  const [importStats, setImportStats] = useState({ added: 0, skipped: 0 });
  const [errorMessage, setErrorMessage] = useState('');

  // AI Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSummary, setAiSummary] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        processLoadedRows(json);
      } catch (err) {
        showToast?.('Erro ao ler a planilha. Verifique se o arquivo é válido.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleTextPaste = () => {
    if (!pastedText.trim()) {
      setErrorMessage('Cole os dados ou insira texto válido.');
      return;
    }
    setFileName('Texto Colado');
    const lines = pastedText
      .trim()
      .split('\n')
      .map((l) => l.split('\t').map((c) => c.trim()));
    processLoadedRows(lines);
  };

  const processLoadedRows = (rows: any[][]) => {
    if (!rows || rows.length === 0) {
      setErrorMessage('A planilha está vazia.');
      return;
    }
    setRawSheetRows(rows);
    detectHeaderAndAutoMap(rows);
  };

  const detectHeaderAndAutoMap = (rows: any[][]) => {
    // Find best header row among first 15 rows
    const keywords = ['nome', 'name', 'title', 'telefone', 'phone', 'tel', 'site', 'website', 'url', 'link', 'endereço', 'address', 'cidade', 'city', 'categoria', 'category', 'nota', 'rating', 'avaliações', 'reviews'];
    let bestRowIdx = 0;
    let maxScore = -1;

    const limit = Math.min(rows.length, 15);
    for (let i = 0; i < limit; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      let score = 0;
      row.forEach((cell) => {
        if (!cell) return;
        const text = String(cell).toLowerCase().trim();
        if (keywords.some((kw) => text.includes(kw))) {
          score++;
        }
      });
      if (score > maxScore) {
        maxScore = score;
        bestRowIdx = i;
      }
    }

    setHeaderRowIdx(bestRowIdx);
    applyMappingForHeaderRow(rows, bestRowIdx);
  };

  const applyMappingForHeaderRow = (rows: any[][], hIdx: number) => {
    const rawHeaders = (rows[hIdx] || []).map((h, idx) => (h ? String(h).trim() : `Coluna ${idx + 1}`));
    setHeaders(rawHeaders);

    const findBestMatch = (candidates: string[]) => {
      for (const cand of candidates) {
        const exact = rawHeaders.find((h) => h.toLowerCase() === cand.toLowerCase());
        if (exact) return exact;
      }
      for (const cand of candidates) {
        const partial = rawHeaders.find((h) => h.toLowerCase().includes(cand.toLowerCase()));
        if (partial) return partial;
      }
      return '';
    };

    const nameCol = findBestMatch(['nome da empresa', 'empresa', 'name', 'title', 'nome', 'estabelecimento', 'cliente']);
    const phoneCol = findBestMatch(['telefone', 'phone', 'celular', 'whatsapp', 'tel', 'phone number', 'whatsapp number']);
    const websiteCol = findBestMatch(['website', 'site', 'web', 'domain', 'url do site']);
    const addressCol = findBestMatch(['endereço', 'address', 'full address', 'logradouro', 'rua']);
    const cityCol = findBestMatch(['cidade', 'city', 'município']);
    const categoryCol = findBestMatch(['categoria', 'segmento', 'category', 'type', 'nicho', 'segment']);
    const ratingCol = findBestMatch(['nota', 'rating', 'estrelas', 'stars']);
    const reviewsCol = findBestMatch(['avaliações', 'reviews', 'reviews count', 'user ratings total']);
    const mapsUrlCol = findBestMatch(['google maps url', 'maps url', 'link do maps', 'place url']);

    setMapping({
      name: nameCol || rawHeaders[0] || '',
      phone: phoneCol || '',
      website: websiteCol || '',
      address: addressCol || '',
      city: cityCol || '',
      category: categoryCol || '',
      rating: ratingCol || '',
      reviews: reviewsCol || '',
      mapsUrl: mapsUrlCol || '',
    });

    setStep('mapping');
  };

  const handleHeaderRowChange = (newIdx: number) => {
    setHeaderRowIdx(newIdx);
    applyMappingForHeaderRow(rawSheetRows, newIdx);
  };

  const handleAnalyzeWithAI = async () => {
    setAnalyzing(true);
    setAiError('');
    try {
      const sampleRows = rawSheetRows.slice(headerRowIdx + 1, headerRowIdx + 6);
      const res = await fetch('/api/analyze-spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headers,
          sampleRows,
          apiKey: settings.geminiApiKey,
        }),
      });

      const data = await res.json();
      if (res.status === 429) {
        setAiError(data.error || 'Limite gratuito do Gemini atingido. Aguarde cerca de 1 minuto e tente de novo.');
        setAnalyzing(false);
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao analisar com IA');
      }

      if (data.summary) setAiSummary(data.summary);
      if (data.detectedSegment && !defaultSegment) setDefaultSegment(data.detectedSegment);
      if (data.detectedCity && !defaultCity) setDefaultCity(data.detectedCity);

      if (data.suggestedMapping) {
        setMapping((prev) => ({
          ...prev,
          name: data.suggestedMapping.name || prev.name,
          phone: data.suggestedMapping.phone || prev.phone,
          website: data.suggestedMapping.website || prev.website,
          address: data.suggestedMapping.address || prev.address,
          city: data.suggestedMapping.city || prev.city,
          category: data.suggestedMapping.category || prev.category,
        }));
      }
    } catch (err: any) {
      if (err.message?.includes('429') || err.message?.includes('Limite')) {
        setAiError('Limite gratuito do Gemini atingido. Aguarde cerca de 1 minuto e tente de novo.');
      } else {
        setAiError(err.message || 'Erro ao conectar com a IA');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleProceedToPreview = () => {
    if (!mapping.name) {
      setErrorMessage('O campo "Nome da Empresa" é obrigatório.');
      return;
    }

    const nameIdx = headers.indexOf(mapping.name);
    const phoneIdx = headers.indexOf(mapping.phone);
    const websiteIdx = headers.indexOf(mapping.website);
    const addressIdx = headers.indexOf(mapping.address);
    const cityIdx = headers.indexOf(mapping.city);
    const categoryIdx = headers.indexOf(mapping.category);
    const ratingIdx = headers.indexOf(mapping.rating);
    const reviewsIdx = headers.indexOf(mapping.reviews);
    const mapsUrlIdx = headers.indexOf(mapping.mapsUrl);

    const existingPhones = new Set(savedLeads.map((l) => normalizePhone(l.phone)).filter(Boolean));
    const existingNameCity = new Set(savedLeads.map((l) => `${l.name.toLowerCase().trim()}|${l.city.toLowerCase().trim()}`));

    const dataRows = rawSheetRows.slice(headerRowIdx + 1);
    const parsed: ParsedRow[] = [];

    dataRows.forEach((row, idx) => {
      if (!row || row.length === 0) return;
      const getName = (i: number) => (i >= 0 && row[i] !== undefined ? String(row[i]).trim() : '');
      const name = getName(nameIdx);
      if (!name) return; // ignore empty name rows

      const phone = getName(phoneIdx);
      const cleanPhone = normalizePhone(phone);
      let website = getName(websiteIdx);
      const address = getName(addressIdx);
      const city = getName(cityIdx) || defaultCity || 'Não informada';
      const category = getName(categoryIdx) || defaultSegment || 'Comércio';
      const rating = parseFloat(getName(ratingIdx)) || 0;
      const reviews = parseInt(getName(reviewsIdx), 10) || 0;
      let mapsUrl = getName(mapsUrlIdx);

      // Handle ambiguous url/link column
      if (!mapsUrl && (mapping.website.toLowerCase().includes('url') || mapping.website.toLowerCase().includes('link'))) {
        if (MAPS_DOMAINS.some((d) => website.toLowerCase().includes(d))) {
          mapsUrl = website;
          website = '';
        }
      }

      const webStatus = classifyWebsite(website);

      const nameCityKey = `${name.toLowerCase().trim()}|${city.toLowerCase().trim()}`;
      const existsInCRM = (cleanPhone && existingPhones.has(cleanPhone)) || existingNameCity.has(nameCityKey);

      parsed.push({
        id: newId(),
        raw: row,
        name,
        phone,
        cleanPhone,
        website,
        address,
        city,
        category,
        rating,
        reviews,
        mapsUrl,
        webStatus,
        existsInCRM,
        selected: !existsInCRM, // default selected if not in CRM
      });
    });

    setParsedRows(parsed);
    setStep('preview');
  };

  const handleToggleRow = (id: string) => {
    setParsedRows((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)));
  };

  const handleToggleSelectAllVisible = (checked: boolean) => {
    setParsedRows((prev) =>
      prev.map((r) => {
        const matchesFilter =
          statusFilter === 'all' ||
          (statusFilter === 'no_website' && r.webStatus === 'no_website') ||
          (statusFilter === 'social_only' && r.webStatus === 'social_only') ||
          (statusFilter === 'has_website' && r.webStatus === 'has_website');
        if (matchesFilter && !r.existsInCRM) {
          return { ...r, selected: checked };
        }
        return r;
      })
    );
  };

  const handleRemoveRow = (id: string) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleImportSelected = () => {
    const selectedRows = parsedRows.filter((r) => r.selected && !r.existsInCRM);
    if (selectedRows.length === 0) {
      setErrorMessage('Nenhum lead válido selecionado para importação.');
      return;
    }

    const batch = selectedRows.map((r) => ({
      placeId: `import_${newId()}`,
      name: r.name,
      segment: r.category || defaultSegment || 'Comércio',
      city: r.city || defaultCity || 'Não informada',
      address: r.address,
      phone: r.cleanPhone || r.phone,
      rating: r.rating,
      userRatingCount: r.reviews,
      googleMapsUri: r.mapsUrl,
      websiteUri: r.website,
      status: r.webStatus,
      tags: ['Importação', WEBSITE_STATUS_LABELS[r.webStatus]],
      notes: `Importado de planilha: ${fileName}`,
    }));

    const result = onAddLeadsBatch(batch);
    setImportStats({
      added: result.addedCount,
      skipped: result.skippedCount,
    });
    setStep('success');
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        Nome: '',
        Telefone: '',
        Site: '',
        Endereço: '',
        Cidade: '',
        Categoria: '',
        Nota: '',
        Avaliações: '',
        'Link do Maps': '',
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'modelo_importacao_leads.xlsx');
  };

  const filteredPreviewRows = parsedRows.filter((r) => {
    if (statusFilter === 'no_website') return r.webStatus === 'no_website';
    if (statusFilter === 'social_only') return r.webStatus === 'social_only';
    if (statusFilter === 'has_website') return r.webStatus === 'has_website';
    return true;
  });

  const countNoWebsite = parsedRows.filter((r) => r.webStatus === 'no_website').length;
  const countSocialOnly = parsedRows.filter((r) => r.webStatus === 'social_only').length;
  const countHasWebsite = parsedRows.filter((r) => r.webStatus === 'has_website').length;
  const selectedCount = parsedRows.filter((r) => r.selected && !r.existsInCRM).length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Importar Leads por Planilha</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Importe arquivos .xlsx, .xls ou .csv e organize seus leads no CRM.</p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="text-xs font-bold underline">Fechar</button>
        </div>
      )}

      {step === 'upload' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload Box */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-white">Arraste ou selecione sua planilha</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Suporta arquivos .xlsx, .xls ou .csv</p>
              </div>
              <label className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm shadow-lg shadow-indigo-600/25 transition-all cursor-pointer">
                Selecionar Arquivo
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
              </label>
              <button
                onClick={downloadTemplate}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-2"
              >
                <Download className="w-3.5 h-3.5" /> Baixar planilha modelo
              </button>
            </div>

            {/* Paste Box */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col space-y-4">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Ou cole dados copiados do Excel / Google Sheets</h3>
              </div>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Cole as células copiadas aqui..."
                rows={6}
                className="w-full flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleTextPaste}
                className="w-full py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium rounded-xl text-sm transition-all"
              >
                Processar Texto Colado
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'mapping' && (
        <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Mapeamento de Colunas ({fileName})</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Confirme ou ajuste a correspondência das colunas detectadas automaticamente.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAnalyzeWithAI}
                disabled={analyzing}
                className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium rounded-xl text-xs shadow-md shadow-violet-600/20 transition-all"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Analisar com IA (opcional)
              </button>
              <button
                onClick={handleProceedToPreview}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-xs shadow-md shadow-indigo-600/20 transition-all"
              >
                Avançar para Prévia <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {aiError && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          {aiSummary && (
            <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900 text-violet-900 dark:text-violet-200 text-xs">
              <strong>Análise da IA:</strong> {aiSummary}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Linha do Cabeçalho</label>
              <select
                value={headerRowIdx}
                onChange={(e) => handleHeaderRowChange(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                {rawSheetRows.slice(0, Math.min(rawSheetRows.length, 15)).map((row, idx) => (
                  <option key={idx} value={idx}>
                    Linha {idx + 1}: {(row || []).slice(0, 3).join(' | ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Segmento Padrão (Opcional)</label>
              <input
                type="text"
                value={defaultSegment}
                onChange={(e) => setDefaultSegment(e.target.value)}
                placeholder="Ex: Pizzaria, Colchões..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cidade Padrão (Opcional)</label>
              <input
                type="text"
                value={defaultCity}
                onChange={(e) => setDefaultCity(e.target.value)}
                placeholder="Ex: Sorocaba, SP"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            {/* Required */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900 dark:text-white">Nome da Empresa (Obrigatório)</label>
              <select
                value={mapping.name}
                onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="">Selecione a coluna...</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900 dark:text-white">Telefone (Obrigatório)</label>
              <select
                value={mapping.phone}
                onChange={(e) => setMapping({ ...mapping, phone: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="">Selecione a coluna...</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Site / URL</label>
              <select
                value={mapping.website}
                onChange={(e) => setMapping({ ...mapping, website: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="">Nenhum</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Optionals */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Endereço</label>
              <select
                value={mapping.address}
                onChange={(e) => setMapping({ ...mapping, address: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="">Nenhum</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cidade</label>
              <select
                value={mapping.city}
                onChange={(e) => setMapping({ ...mapping, city: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="">Nenhum</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Categoria / Segmento</label>
              <select
                value={mapping.category}
                onChange={(e) => setMapping({ ...mapping, category: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="">Nenhum</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nota (Avaliação)</label>
              <select
                value={mapping.rating}
                onChange={(e) => setMapping({ ...mapping, rating: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="">Nenhum</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nº de Avaliações</label>
              <select
                value={mapping.reviews}
                onChange={(e) => setMapping({ ...mapping, reviews: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="">Nenhum</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Link do Google Maps</label>
              <select
                value={mapping.mapsUrl}
                onChange={(e) => setMapping({ ...mapping, mapsUrl: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="">Nenhum</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  statusFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Todos ({parsedRows.length})
              </button>
              <button
                onClick={() => setStatusFilter('no_website')}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  statusFilter === 'no_website'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                }`}
              >
                Sem site ({countNoWebsite})
              </button>
              <button
                onClick={() => setStatusFilter('social_only')}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  statusFilter === 'social_only'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                }`}
              >
                Só rede social ({countSocialOnly})
              </button>
              <button
                onClick={() => setStatusFilter('has_website')}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  statusFilter === 'has_website'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                Tem site ({countHasWebsite})
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep('mapping')}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium"
              >
                Voltar ao Mapeamento
              </button>
              <button
                onClick={handleImportSelected}
                disabled={selectedCount === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl text-xs shadow-lg shadow-indigo-600/25 transition-all"
              >
                Importar {selectedCount} selecionados para o CRM
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={filteredPreviewRows.length > 0 && filteredPreviewRows.every((r) => r.selected || r.existsInCRM)}
                        onChange={(e) => handleToggleSelectAllVisible(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="p-4">Empresa</th>
                    <th className="p-4">Segmento / Cidade</th>
                    <th className="p-4">Telefone</th>
                    <th className="p-4">Status Web</th>
                    <th className="p-4">Situação CRM</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  {filteredPreviewRows.slice(0, visibleLimit).map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                        row.existsInCRM ? 'opacity-60 bg-slate-50/40 dark:bg-slate-900/40' : ''
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={row.existsInCRM}
                          onChange={() => handleToggleRow(row.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-slate-900 dark:text-white">{row.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{row.address || 'Sem endereço'}</p>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{row.category}</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{row.city}</p>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{row.phone || 'Não informado'}</span>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${WEBSITE_STATUS_COLORS[row.webStatus]}`}>
                          {WEBSITE_STATUS_LABELS[row.webStatus]}
                        </span>
                      </td>
                      <td className="p-4">
                        {row.existsInCRM ? (
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            Já no CRM
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Novo
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleRemoveRow(row.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Remover linha"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredPreviewRows.length > visibleLimit && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-center bg-slate-50 dark:bg-slate-800/40">
                <button
                  onClick={() => setVisibleLimit((prev) => prev + 150)}
                  className="px-6 py-2.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-medium rounded-xl text-xs transition-all"
                >
                  Mostrar mais ({filteredPreviewRows.length - visibleLimit} restantes)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 rounded-2xl shadow-sm text-center space-y-6 max-w-xl mx-auto">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Importação Concluída!</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <strong className="text-indigo-600 dark:text-indigo-400">{importStats.added} leads</strong> importados com sucesso para o CRM.
              {importStats.skipped > 0 && (
                <span className="block text-xs text-slate-400 mt-1">({importStats.skipped} ignorados por já existirem no CRM).</span>
              )}
            </p>
          </div>
          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              onClick={() => {
                setStep('upload');
                setParsedRows([]);
                setPastedText('');
              }}
              className="px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-sm transition-all"
            >
              Importar Outra Planilha
            </button>
            <button
              onClick={() => {
                // Navigate to Kanban or reload
                window.location.reload();
              }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm shadow-lg shadow-indigo-600/25 transition-all"
            >
              Ver no Kanban
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
