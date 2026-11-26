import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Ensure all /api/* routes return JSON
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

const RATE_LIMIT_MSG = 'Limite gratuito do Gemini atingido. Aguarde cerca de 1 minuto e tente de novo.';

function is429(error: any): boolean {
  const msg = error?.message || error?.toString() || '';
  return (
    error?.status === 429 ||
    error?.statusCode === 429 ||
    msg.includes('429') ||
    msg.toLowerCase().includes('resource_exhausted') ||
    msg.toLowerCase().includes('quota')
  );
}

// API route to analyze spreadsheet headers and sample data using Gemini
app.post('/api/analyze-spreadsheet', async (req, res) => {
  try {
    const { headers, sampleRows, apiKey } = req.body;
    const key = apiKey || process.env.GEMINI_API_KEY;

    if (!key) {
      return res.status(400).json({ error: 'Chave da API do Gemini não configurada.' });
    }

    const ai = new GoogleGenAI({ apiKey: key });
    const prompt = `Você é um analista de dados especialista em prospecção B2B e planilhas de leads.
Analise os cabeçalhos e as primeiras linhas de uma planilha enviada pelo usuário para entender o conteúdo, nicho/segmento das empresas, cidade/região e qualidade dos dados.

Cabeçalhos da planilha:
${JSON.stringify(headers)}

Amostra de dados (primeiras linhas):
${JSON.stringify(sampleRows)}

Responda estritamente em formato JSON válido, sem markdown e sem blocos de código, contendo exatamente estas chaves:
{
  "summary": "Resumo breve de 2 frases sobre o que a planilha contém (nicho, região, tipo de dados)",
  "detectedSegment": "Segmento ou nicho provável das empresas",
  "detectedCity": "Cidade ou região provável",
  "dataQuality": "Avaliação curta da qualidade dos dados",
  "suggestedMapping": {
    "name": "nome exato do cabeçalho na planilha para Nome da Empresa (ou string vazia)",
    "phone": "nome exato do cabeçalho para Telefone (ou string vazia)",
    "website": "nome exato do cabeçalho para Site (ou string vazia)",
    "address": "nome exato do cabeçalho para Endereço (ou string vazia)",
    "city": "nome exato do cabeçalho para Cidade (ou string vazia)",
    "category": "nome exato do cabeçalho para Categoria (ou string vazia)"
  }
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const rawText = (response.text || '{}').trim();
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const analysis = JSON.parse(cleanedText);
    return res.json(analysis);
  } catch (error: any) {
    console.error('Spreadsheet analysis error:', error);
    if (is429(error)) {
      return res.status(429).json({ error: RATE_LIMIT_MSG });
    }
    return res.status(500).json({ error: error.message || 'Erro ao analisar planilha com IA' });
  }
});

// API route for AI Sales Pitch generation
app.post('/api/ai-pitch', async (req, res) => {
  try {
    const { businessName, segment, city, address, rating, reviewsCount, websiteStatus, apiKey } = req.body;
    const key = apiKey || process.env.GEMINI_API_KEY;

    if (!key) {
      return res.status(400).json({ error: 'Chave da API do Gemini não configurada.' });
    }

    const ai = new GoogleGenAI({ apiKey: key });

    const statusDesc =
      websiteStatus === 'no_website'
        ? 'Não possui nenhum site'
        : websiteStatus === 'social_only'
        ? 'Possui apenas redes sociais (Instagram/Facebook/etc)'
        : 'Já possui um site próprio na internet';

    const prompt = `Você é um especialista em vendas B2B e desenvolvimento web de alta conversão.
Crie uma mensagem de abordagem persuasiva, amigável e profissional para o WhatsApp oferecendo serviços web para a seguinte empresa local:

- Nome da Empresa: ${businessName}
- Segmento: ${segment}
- Cidade: ${city}
- Endereço: ${address}
- Nota no Google: ${rating || 'N/A'} (${reviewsCount || 0} avaliações)
- Situação atual na internet: ${statusDesc}

Instruções para a mensagem:
1. Comece cumprimentando pelo nome da empresa de forma cordial.
2. Destaque um elogio genuíno baseado na relevância local.
3. Se a empresa NÃO tem site ou usa SÓ rede social: aponte a oportunidade de ter um site profissional próprio que aparece no Google quando buscam por ${segment} em ${city}.
4. Se a empresa JÁ POSSUI site: a abordagem deve ser focada em melhorias (ex: velocidade de carregamento, design mobile mais moderno, otimização de SEO local para atrair mais clientes). NUNCA diga que eles não têm site.
5. Finalize com uma chamada para ação leve e de baixa fricção (perguntando se pode conversar 5 minutos).
6. Escreva em Português do Brasil natural, com espaçamento adequado para leitura no WhatsApp e emojis moderados. Não inclua placeholders, escreva a mensagem pronta para uso.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.json({ pitch: response.text });
  } catch (error: any) {
    console.error('AI Pitch generation error:', error);
    if (is429(error)) {
      return res.status(429).json({ error: RATE_LIMIT_MSG });
    }
    return res.status(500).json({ error: error.message || 'Erro ao gerar pitch com IA' });
  }
});

// Catch-all API error handler to always return JSON
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint da API não encontrado.' });
});

// Vite middleware integration for development
async function setupVite() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }
}

setupVite().then(() => {
  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
});
