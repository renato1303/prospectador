import React, { useState } from 'react';
import { Search, MapPin, Phone, Star, Building2, CheckCircle2, Plus, Sparkles, Download, Filter, AlertCircle, ExternalLink } from 'lucide-react';
import { Lead, AppSettings, SearchQuery, WebsiteStatus } from '../types';
import * as XLSX from 'xlsx';

interface LeadSearchScreenProps {
  settings: AppSettings;
  savedLeads: Lead[];
  onAddLeadToCRM: (lead: Omit<Lead, 'id' | 'columnId' | 'createdAt' | 'updatedAt' | 'history' | 'tags' | 'notes' | 'dealValue'>) => void;
  onOpenWhatsApp: (lead: Lead, customText?: string) => void;
  onOpenAiPitch: (lead: Lead) => void;
  onSaveSearchQuery: (query: SearchQuery) => void;
}

interface PlaceResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  businessStatus?: string;
  primaryTypeDisplayName?: { text: string };
}

export const LeadSearchScreen: React.FC<LeadSearchScreenProps> = ({
  settings,
  savedLeads,
  onAddLeadToCRM,
  onOpenWhatsApp,
  onOpenAiPitch,
  onSaveSearchQuery,
}) => {
  const [segment, setSegment] = useState('');
  const [city, setCity] = useState('');
  const [neighborhoodsInput, setNeighborhoodsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [websiteFilter, setWebsiteFilter] = useState<'all' | 'no_website' | 'social_only'>('no_website');
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([]);
  const [searchStats, setSearchStats] = useState<{ total: number; noWebsite: number } | null>(null);

  const isSocialMediaUrl = (url?: string): boolean => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.includes('instagram.com') ||
      lower.includes('facebook.com') ||
      lower.includes('linktr.ee') ||
      lower.includes('wa.me') ||
      lower.includes('whatsapp.com') ||
      lower.includes('tiktok.com') ||
      lower.includes('linkedin.com')
    );
  };

  const classifyWebsite = (url?: string): WebsiteStatus => {
    if (!url || url.trim() === '') return 'no_website';
    if (isSocialMediaUrl(url)) return 'social_only';
    return 'no_website'; // If website exists and is not social media, wait, if website exists, we filter it out if we only want businesses without site or social only!
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!segment.trim() || !city.trim()) {
      setError('Por favor, informe o segmento e a cidade.');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);
    setSelectedPlaceIds([]);
    setSearchStats(null);

    const neighborhoods = neighborhoodsInput
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);

    const queriesToRun: string[] = [];
    if (neighborhoods.length > 0) {
      neighborhoods.forEach((nh) => {
        queriesToRun.push(`${segment} em ${nh}, ${city}`);
      });
    } else {
      queriesToRun.push(`${segment} em ${city}`);
    }

    try {
      const allFetchedPlaces: PlaceResult[] = [];
      const seenIds = new Set<string>();

      for (const q of queriesToRun) {
        let pageToken: string | undefined = undefined;
        let fetchedCount = 0;

        // Fetch up to 60 results (2 pages of 20) per query
        while (fetchedCount < 60) {
          const res: Response = await fetch('/api/places-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: q,
              apiKey: settings.googlePlacesApiKey || undefined,
              pageToken,
            }),
          });

          const data: any = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Erro ao buscar no Google Places');
          }

          const places: PlaceResult[] = data.places || [];
          for (const place of places) {
            if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') continue;
            if (place.id && !seenIds.has(place.id)) {
              seenIds.add(place.id);
              allFetchedPlaces.push(place);
            }
          }

          pageToken = data.nextPageToken;
          fetchedCount += places.length;

          if (!pageToken || places.length === 0) break;
          // Small pause for pagination token validity
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      // Filter: Keep only businesses with NO website OR website is social media
      const targetPlaces = allFetchedPlaces.filter((p) => {
        const uri = p.websiteUri || '';
        const isSocial = isSocialMediaUrl(uri);
        const hasNoWebsite = !uri || uri.trim() === '';
        return hasNoWebsite || isSocial;
      });

      setResults(targetPlaces);
      setSearchStats({
        total: allFetchedPlaces.length,
        noWebsite: targetPlaces.length,
      });

      // Save search history
      onSaveSearchQuery({
        id: Math.random().toString(36).substring(2, 9),
        segment,
        city,
        neighborhoods,
        timestamp: new Date().toISOString(),
        totalFound: allFetchedPlaces.length,
        totalNoWebsite: targetPlaces.length,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao realizar busca. Verifique sua chave da API do Google Places nas Configurações.');
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter((p) => {
    const uri = p.websiteUri || '';
    const isSocial = isSocialMediaUrl(uri);
    if (websiteFilter === 'no_website') return !uri || uri.trim() === '';
    if (websiteFilter === 'social_only') return isSocial;
    return true;
  });

  const isAlreadyInCRM = (placeId?: string) => {
    if (!placeId) return false;
    return savedLeads.some((l) => l.placeId === placeId);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const ids = filteredResults.filter((p) => !isAlreadyInCRM(p.id)).map((p) => p.id);
      setSelectedPlaceIds(ids);
    } else {
      setSelectedPlaceIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedPlaceIds.includes(id)) {
      setSelectedPlaceIds(selectedPlaceIds.filter((i) => i !== id));
    } else {
      setSelectedPlaceIds([...selectedPlaceIds, id]);
    }
  };

  const handleAddSingle = (place: PlaceResult) => {
    if (isAlreadyInCRM(place.id)) return;
    const uri = place.websiteUri || '';
    const status: WebsiteStatus = isSocialMediaUrl(uri) ? 'social_only' : 'no_website';

    onAddLeadToCRM({
      placeId: place.id,
      name: place.displayName?.text || 'Empresa sem nome',
      segment: segment || place.primaryTypeDisplayName?.text || 'Comércio',
      city,
      address: place.formattedAddress || '',
      phone: place.nationalPhoneNumber || place.internationalPhoneNumber || '',
      rating: place.rating || 0,
      userRatingCount: place.userRatingCount || 0,
      googleMapsUri: place.googleMapsUri || '',
      websiteUri: uri,
      status,
    });
  };

  const handleAddBatch = () => {
    selectedPlaceIds.forEach((id) => {
      const place = results.find((p) => p.id === id);
      if (place && !isAlreadyInCRM(place.id)) {
        const uri = place.websiteUri || '';
        const status: WebsiteStatus = isSocialMediaUrl(uri) ? 'social_only' : 'no_website';
        onAddLeadToCRM({
          placeId: place.id,
          name: place.displayName?.text || 'Empresa sem nome',
          segment: segment || place.primaryTypeDisplayName?.text || 'Comércio',
          city,
          address: place.formattedAddress || '',
          phone: place.nationalPhoneNumber || place.internationalPhoneNumber || '',
          rating: place.rating || 0,
          userRatingCount: place.userRatingCount || 0,
          googleMapsUri: place.googleMapsUri || '',
          websiteUri: uri,
          status,
        });
      }
    });
    setSelectedPlaceIds([]);
  };

  const handleExportExcel = () => {
    const dataToExport = filteredResults.map((p) => {
      const uri = p.websiteUri || '';
      const status = isSocialMediaUrl(uri) ? 'Só rede social' : 'Sem nenhum site';
      return {
        Nome: p.displayName?.text || '',
        Segmento: segment,
        Telefone: p.nationalPhoneNumber || p.internationalPhoneNumber || 'Não informado',
        Endereço: p.formattedAddress || '',
        Cidade: city,
        Nota: p.rating || 0,
        Avaliações: p.userRatingCount || 0,
        'Link Maps': p.googleMapsUri || '',
        Status: status,
        'Data de Captura': new Date().toLocaleDateString('pt-BR'),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads Prospectados');
    XLSX.writeFile(workbook, `leads_${segment}_${city}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Helper to check if phone is Brazilian mobile (DDD + 9 digits)
  const isBrazilianMobile = (phoneStr?: string): boolean => {
    if (!phoneStr) return false;
    const digits = phoneStr.replace(/\D/g, '');
    // Expecting 11 digits (2 for DDD + 9 followed by 8 digits) or 13 with 55
    if (digits.length === 11 && digits[2] === '9') return true;
    if (digits.length === 13 && digits.startsWith('55') && digits[4] === '9') return true;
    return false;
  };

  const createLeadObjectFromPlace = (p: PlaceResult): Lead => {
    const uri = p.websiteUri || '';
    const status: WebsiteStatus = isSocialMediaUrl(uri) ? 'social_only' : 'no_website';
    return {
      id: p.id,
      placeId: p.id,
      name: placeName(p),
      segment: segment || p.primaryTypeDisplayName?.text || 'Comércio',
      city,
      address: p.formattedAddress || '',
      phone: p.nationalPhoneNumber || p.internationalPhoneNumber || '',
      rating: p.rating || 0,
      userRatingCount: p.userRatingCount || 0,
      googleMapsUri: p.googleMapsUri || '',
      websiteUri: uri,
      status,
      columnId: 'novo_lead',
      tags: [],
      notes: '',
      dealValue: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [],
    };
  };

  const placeName = (p: PlaceResult) => p.displayName?.text || 'Empresa sem nome';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Prospecção de Leads Locais</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Encontre empresas locais sem site ou com presença apenas em redes sociais usando a Google Places API.
        </p>
      </div>

      {/* Search Form Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Segmento / Nicho *</label>
            <input
              type="text"
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              placeholder="Ex: Loja de colchões, Restaurante, Oficina"
              required
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cidade e Estado *</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex: Sorocaba, SP"
              required
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Bairros (Opcional, separados por vírgula)</label>
            <input
              type="text"
              value={neighborhoodsInput}
              onChange={(e) => setNeighborhoodsInput(e.target.value)}
              placeholder="Ex: Centro, Campolim, Iguatemi"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-3 flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {!settings.googlePlacesApiKey && (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Dica: Configure sua chave da Google Places API nas Configurações para melhores resultados.
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>Buscando empresas...</>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Buscar Leads Sem Site
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      {(results.length > 0 || searchStats) && (
        <div className="space-y-6">
          {/* Stats & Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Encontrado</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{searchStats?.total || 0}</p>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Alvos (Sem site / Rede Social)</p>
                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{searchStats?.noWebsite || 0}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
                <button
                  onClick={() => setWebsiteFilter('no_website')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    websiteFilter === 'no_website' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Sem Nenhum Site
                </button>
                <button
                  onClick={() => setWebsiteFilter('social_only')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    websiteFilter === 'social_only' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Só Rede Social
                </button>
                <button
                  onClick={() => setWebsiteFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    websiteFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Todos ({results.length})
                </button>
              </div>

              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-xs shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Excel
              </button>
            </div>
          </div>

          {/* Batch Actions & Table / Cards */}
          {filteredResults.length > 0 && (
            <div className="space-y-4">
              {selectedPlaceIds.length > 0 && (
                <div className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 p-3 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                    {selectedPlaceIds.length} lead(s) selecionado(s)
                  </span>
                  <button
                    onClick={handleAddBatch}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Selecionados ao CRM
                  </button>
                </div>
              )}

              {/* Table / Grid */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <th className="p-4 w-10">
                          <input
                            type="checkbox"
                            onChange={handleSelectAll}
                            checked={selectedPlaceIds.length > 0 && selectedPlaceIds.length === filteredResults.filter((p) => !isAlreadyInCRM(p.id)).length}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </th>
                        <th className="p-4">Empresa</th>
                        <th className="p-4">Telefone</th>
                        <th className="p-4">Avaliação</th>
                        <th className="p-4">Status Web</th>
                        <th className="p-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                      {filteredResults.map((place) => {
                        const inCRM = isAlreadyInCRM(place.id);
                        const isSelected = selectedPlaceIds.includes(place.id);
                        const uri = place.websiteUri || '';
                        const isSocial = isSocialMediaUrl(uri);
                        const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || '';
                        const canWhatsApp = isBrazilianMobile(phone);
                        const leadObj = createLeadObjectFromPlace(place);

                        return (
                          <tr key={place.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-4">
                              {!inCRM && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelect(place.id)}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              )}
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white">{placeName(place)}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{place.formattedAddress}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">
                                {phone || 'Sem telefone'}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                {place.rating ? `${place.rating} (${place.userRatingCount || 0})` : 'Novo'}
                              </div>
                            </td>
                            <td className="p-4">
                              <span
                                className={`text-[11px] px-2.5 py-1 rounded-full font-medium inline-block ${
                                  isSocial
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                }`}
                              >
                                {isSocial ? `Rede Social: ${uri.slice(0, 25)}...` : 'Sem nenhum site'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {inCRM ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> No CRM
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleAddSingle(place)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-sm transition-all"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> CRM
                                  </button>
                                )}

                                <button
                                  onClick={() => onOpenWhatsApp(leadObj)}
                                  disabled={!canWhatsApp}
                                  title={canWhatsApp ? 'Chamar no WhatsApp' : 'Telefone fixo ou inválido para WhatsApp direto'}
                                  className={`p-2 rounded-lg text-xs font-medium transition-all ${
                                    canWhatsApp
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                  }`}
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => onOpenAiPitch(leadObj)}
                                  className="p-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium shadow-sm transition-all"
                                  title="Gerar Pitch com IA"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                </button>

                                {place.googleMapsUri && (
                                  <a
                                    href={place.googleMapsUri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs transition-all"
                                    title="Ver no Google Maps"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {filteredResults.length === 0 && results.length > 0 && (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhum lead encontrado com o filtro selecionado.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
