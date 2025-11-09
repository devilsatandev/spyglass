
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const createPrompt = (competitors: string[]): string => {
  const competitorList = competitors.map(c => `- ${c}`).join('\n');

  return `
    Aja como um espião mestre em marketing digital. Minha missão é conduzir uma 'Análise de Inteligência Competitiva' sobre meus principais concorrentes:
    ${competitorList}

    O relatório deve começar com um título geral.

    Imediatamente após o título, crie uma seção de resumo chamada '## Resumo Comparativo das Fontes de Tráfego'.
    Nesta seção, inclua uma tabela markdown comparando as estimativas de fontes de tráfego para todos os concorrentes. Use dados realistas e plausíveis para a comparação. A tabela DEVE ter a seguinte estrutura exata:
    | Concorrente | Busca Orgânica (%) | Busca Paga (%) | Social (%) | Direto (%) | Referência (%) |
    |---|---|---|---|---|---|
    ${competitors.map(c => `| ${c} | [valor] | [valor] | [valor] | [valor] | [valor] |`).join('\n')}
    (Substitua os [valor] pelos dados percentuais estimados e realistas para cada concorrente.)

    Após a tabela de resumo, crie um plano de investigação detalhado e passo a passo para eu seguir. O plano deve ser estruturado em CINCO seções principais para cada concorrente.

    Para cada concorrente, a estrutura deve ser:
    1. O título principal usando o nome do concorrente (ex: # Análise de Inteligência: Exemplo Corp).
    2. Imediatamente após o título, insira um placeholder no seguinte formato exato, substituindo o nome do exemplo pelo nome real do concorrente: [SCREENSHOT_PLACEHOLDER_FOR_Exemplo Corp]
    3. Em seguida, as cinco seções de análise detalhadas abaixo.

    As CINCO seções de análise são:

    1.  **Investigação das Principais Fontes de Tráfego:** Detalhe como usar ferramentas como SimilarWeb, Ahrefs ou SEMrush para identificar seus principais canais de tráfego (Busca Orgânica, Busca Paga, Social, Direto, Referência). Forneça métricas específicas a serem observadas (ex: % de tráfego por canal, principais palavras-chave orgânicas e pagas, principais sites de referência).

    2.  **Análise da Estratégia de Mídia Social:** Descreva um plano detalhado para analisar a presença deles nas redes sociais. Especifique:
        *   **Plataformas Ativas:** Quais plataformas eles usam (Instagram, Facebook, LinkedIn, TikTok, X, etc.) e qual parece ser a principal?
        *   **Frequência de Postagem:** Com que frequência eles postam em cada plataforma?
        *   **Tipos de Conteúdo:** Que formatos de conteúdo eles priorizam (vídeos curtos/Reels, imagens, carrosséis, Stories, artigos, etc.)?
        *   **Análise de Engajamento:** Como é o engajamento do público (média de curtidas, comentários, compartilhamentos)? O engajamento parece autêntico?
        *   **Estratégia de Anúncios:** Sugira como investigar seus anúncios pagos (ex: usando a Biblioteca de Anúncios do Facebook/Meta).

    3.  **Análise da Estratégia de Conteúdo (Blog e SEO):** Descreva um plano para analisar o blog, canal do YouTube e outras plataformas de conteúdo de formato mais longo. O que devo procurar?
        *   **Tópicos Principais:** Quais são os pilares de conteúdo que eles abordam?
        *   **Estratégia de SEO:** Quais palavras-chave eles parecem estar alvejando? Como é a otimização on-page de seus artigos?
        *   **Formatos:** Eles usam guias, tutoriais, estudos de caso, infográficos?
        *   **Chamadas para Ação (CTAs):** Como eles convertem leitores em leads dentro do conteúdo?

    4.  **Desconstrução dos Funis de Venda:** Forneça um guia sobre como mapear seus funis de venda. Isso deve incluir a identificação de suas iscas digitais (lead magnets), ofertas de entrada (tripwires), produtos principais (core offers) e produtos de alto valor (high-ticket). Sugira como se inscrever em suas newsletters e passar pelo processo de checkout (sem comprar, se possível) para entender o fluxo e as ofertas de upsell/downsell.

    5.  **Identificação de Fraquezas Exploráveis:** Com base na análise acima, sugira fraquezas potenciais a serem procuradas. Os exemplos podem ser SEO fraco em certas palavras-chave, baixo engajamento nas redes sociais, falta de presença em uma plataforma de vídeo relevante (como TikTok ou YouTube Shorts), um site desatualizado, um processo de checkout complicado, falta de uma isca digital clara, ou avaliações negativas de clientes.

    Apresente o resultado final em um formato claro, acionável e bem-estruturado. Use markdown para formatação, incluindo títulos, texto em negrito e listas de marcadores para facilitar a leitura e a ação.
  `;
};

export const generateAnalysisPlan = async (competitors: string[]): Promise<string> => {
  const prompt = createPrompt(competitors);
  
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw new Error("Failed to generate analysis from Gemini API.");
  }
};
