import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold } from '@google/genai';

dotenv.config();

const app = express();
const port = 8000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for base64 data

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something broke!' });
});

// Initialize Gemini
if (!process.env.API_KEY) {
  throw new Error("API_KEY is not defined in the .env file");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Safety settings for generative models
const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
];

// --- ROUTES ---

// Endpoint to generate a standard analysis plan
app.post('/generate-analysis', async (req, res) => {
  try {
    const { competitors } = req.body;
    if (!competitors || !Array.isArray(competitors) || competitors.length === 0) {
      return res.status(400).json({ error: 'Competitors list is required.' });
    }

    const prompt = `Você é SPYGLASS, uma IA especialista em inteligência competitiva de marketing. Sua missão é gerar um plano de análise detalhado e acionável.

    **Alvos:** ${competitors.join(', ')}

    **Formato do Relatório (Obrigatório, use Markdown):**

    ## Análise Competitiva: Dossiê de Inteligência

    ### 1. Resumo Executivo
    *   Uma visão geral concisa dos concorrentes e as principais descobertas.

    ### 2. Comparativo de Fontes de Tráfego (Tabela)
    *   Crie uma tabela Markdown comparando as fontes de tráfego estimadas (em %).
    *   Colunas: Concorrente, Busca Orgânica (%), Busca Paga (%), Social (%), Direto (%), Referência (%).
    *   **Exemplo de Tabela:**
        | Concorrente | Busca Orgânica (%) | Busca Paga (%) | Social (%) | Direto (%) | Referência (%) |
        |---|---|---|---|---|---|
        | ${competitors[0] || 'Empresa A'} | 45 | 15 | 20 | 15 | 5 |
        | ${competitors[1] || 'Empresa B'} | 55 | 5 | 15 | 20 | 5 |

    ### 3. Análise de Palavras-chave e SEO
    *   Identifique as principais palavras-chave de cada concorrente.
    *   Avalie a autoridade de domínio e a estratégia de backlinking deles.

    ### 4. Estratégia de Conteúdo e Marketing
    *   Que tipo de conteúdo eles produzem (blogs, vídeos, etc.)?
    *   Quais são suas principais campanhas de marketing recentes?

    ### 5. Presença nas Redes Sociais
    *   Quais plataformas eles dominam?
    *   Analise o engajamento e a estratégia de postagem.

    ### 6. Ameaças e Oportunidades (Análise SWOT)
    *   **Forças:** Destaque os pontos fortes de cada um.
    *   **Fraquezas:** Identifique onde eles estão falhando.
    *   **Oportunidades:** Onde você pode superá-los?
    *   **Ameaças:** Que movimentos deles podem impactar seu negócio?

    ### 7. Plano de Ação Recomendado
    *   Liste 3-5 ações concretas e de alto impacto que a empresa deve tomar.

    **Instrução:** Seja direto, analítico e use uma linguagem que um estrategista de marketing entenderia.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        safetySettings,
    });

    res.json({ report: response.text });
  } catch (error) {
    console.error('Error in /generate-analysis:', error);
    res.status(500).json({ error: 'Failed to generate analysis.' });
  }
});

// Endpoint to generate a deep analysis using web search
app.post('/generate-deep-analysis', async (req, res) => {
    try {
        const { competitors } = req.body;
        if (!competitors || !Array.isArray(competitors) || competitors.length === 0) {
            return res.status(400).json({ error: 'Competitors list is required.' });
        }

        const prompt = `Como SPYGLASS, uma IA de inteligência de marketing, realize uma **investigação profunda e atualizada** sobre os seguintes concorrentes: ${competitors.join(', ')}. Utilize a pesquisa na web para obter os dados mais recentes.

        **Siga estritamente o formato de relatório Markdown abaixo:**

        ## Investigação Profunda: Dossiê de Inteligência Aprimorado

        ### 1. Resumo Executivo Estratégico
        *   Análise concisa baseada nos dados mais recentes, destacando movimentos estratégicos e mudanças de mercado.

        ### 2. Comparativo de Fontes de Tráfego (Tabela)
        *   Crie uma tabela Markdown comparando as fontes de tráfego estimadas (em %).
        *   Colunas: Concorrente, Busca Orgânica (%), Busca Paga (%), Social (%), Direto (%), Referência (%).
        *   **Exemplo de Tabela:**
            | Concorrente | Busca Orgânica (%) | Busca Paga (%) | Social (%) | Direto (%) | Referência (%) |
            |---|---|---|---|---|---|
            | ${competitors[0] || 'Empresa A'} | 45 | 15 | 20 | 15 | 5 |
            | ${competitors[1] || 'Empresa B'} | 55 | 5 | 15 | 20 | 5 |

        ### 3. Análise de SEO e Táticas de Conteúdo Recentes
        *   Identifique palavras-chave em ascensão e estratégias de conteúdo lançadas nos últimos 6 meses.
        *   Destaque qualquer campanha de marketing viral ou de alto impacto recente.

        ### 4. Desempenho e Estratégia em Mídias Sociais
        *   Analise o sentimento do público (positivo, negativo, neutro) com base em menções recentes.
        *   Identifique parcerias com influenciadores e campanhas pagas.

        ### 5. Análise SWOT Tática (Baseada em Eventos Recentes)
        *   **Forças:** Destaque sucessos recentes.
        *   **Fraquezas:** Exponha falhas ou controvérsias recentes.
        *   **Oportunidades:** Identifique tendências de mercado que eles não estão aproveitando.
        *   **Ameaças:** Aponte novos concorrentes ou mudanças no mercado que os afetam.

        ### 6. Recomendações de Ação Imediata
        *   Liste de 3 a 5 ações urgentes e táticas para contra-atacar ou explorar uma fraqueza descoberta.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] },
            safetySettings,
        });
        
        res.json({ report: response.text });
    } catch (error) {
        console.error('Error in /generate-deep-analysis:', error);
        res.status(500).json({ error: 'Failed to generate deep analysis.' });
    }
});

// Endpoint to edit an image
app.post('/edit-image', async (req, res) => {
    try {
        const { image_data, mime_type, prompt } = req.body;
        if (!image_data || !mime_type || !prompt) {
            return res.status(400).json({ error: 'Image data, mime type, and prompt are required.' });
        }

        const imagePart = { inlineData: { data: image_data, mimeType: mime_type } };
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: { responseModalities: [Modality.IMAGE] },
            safetySettings,
        });

        const editedImagePart = response.candidates[0].content.parts.find(part => part.inlineData);
        if (!editedImagePart) {
            throw new Error("No image was returned from the API.");
        }
        
        res.json({ image_data: editedImagePart.inlineData.data });
    } catch (error) {
        console.error('Error in /edit-image:', error);
        res.status(500).json({ error: 'Failed to edit image.' });
    }
});

// Endpoint to start video generation
app.post('/generate-video', async (req, res) => {
    try {
        const { image_data, mime_type, prompt, aspect_ratio } = req.body;
        if (!image_data || !mime_type || !prompt || !aspect_ratio) {
            return res.status(400).json({ error: 'Image data, mime type, prompt, and aspect ratio are required.' });
        }

        const operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt,
            image: {
                imageBytes: image_data,
                mimeType: mime_type,
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspect_ratio,
            }
        });

        res.json(operation);
    } catch (error) {
        console.error('Error in /generate-video:', error);
        res.status(500).json({ error: error.message || 'Failed to start video generation.' });
    }
});

// Endpoint to poll video operation status
app.post('/get-video-operation', async (req, res) => {
    try {
        const { operation } = req.body;
        if (!operation) {
            return res.status(400).json({ error: 'Operation object is required.' });
        }
        
        const updatedOperation = await ai.operations.getVideosOperation({ operation });
        res.json(updatedOperation);
    } catch (error) {
        console.error('Error in /get-video-operation:', error);
        res.status(500).json({ error: error.message || 'Failed to get video operation status.' });
    }
});


// Endpoint to transcribe audio
app.post('/transcribe-audio', async (req, res) => {
    try {
        const { audio_data, mime_type } = req.body;
        if (!audio_data || !mime_type) {
            return res.status(400).json({ error: 'Audio data and mime type are required.' });
        }

        const audioPart = { inlineData: { data: audio_data, mimeType: mime_type } };
        const prompt = "Transcreva este áudio em português.";

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, { text: prompt }] },
            safetySettings,
        });

        res.json({ transcription: response.text });
    } catch (error) {
        console.error('Error in /transcribe-audio:', error);
        res.status(500).json({ error: 'Failed to transcribe audio.' });
    }
});


// Endpoint for text-to-speech
app.post('/generate-speech', async (req, res) => {
    try {
        const { text, voice_name } = req.body;
        if (!text || !voice_name) {
            return res.status(400).json({ error: 'Text and voice name are required.' });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice_name },
                    },
                },
            },
            safetySettings,
        });

        const audioPart = response.candidates[0].content.parts[0];
        if (!audioPart || !audioPart.inlineData) {
            throw new Error("No audio content was returned from the API.");
        }

        res.json({ audio_content: audioPart.inlineData.data });
    } catch (error) {
        console.error('Error in /generate-speech:', error);
        res.status(500).json({ error: 'Failed to generate speech.' });
    }
});


// Endpoint for impactful audio summary
app.post('/generate-impactful-summary', async (req, res) => {
    try {
        const { report_content } = req.body;
        if (!report_content) {
            return res.status(400).json({ error: 'Report content is required.' });
        }
        
        const prompt = `Você é um diretor de cinema criando um trailer para um filme de espionagem. Transforme o seguinte relatório de inteligência em um roteiro de áudio curto, dramático e impactante (máximo de 3-4 frases curtas). Use uma linguagem de suspense e foque nas descobertas mais críticas.

        Relatório:
        """
        ${report_content}
        """

        Exemplo de Saída: "Enquanto os alvos dormem, suas fraquezas foram expostas. Uma nova estratégia emerge das sombras. É hora de atacar."

        Roteiro do Trailer:`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            safetySettings
        });
        
        res.json({ summary: response.text });

    } catch (error) {
        console.error('Error in /generate-impactful-summary:', error);
        res.status(500).json({ error: 'Failed to generate summary.' });
    }
});


// Start server
app.listen(port, () => {
  console.log(`> Spyglass backend online at http://127.0.0.1:${port}`);
});
