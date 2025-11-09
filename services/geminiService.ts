// --- Communication Layer ---
// This layer handles communication with the Rust backend.

const BACKEND_URL = 'http://127.0.0.1:8000';

async function postToBackend<T>(endpoint: string, body: object): Promise<T> {
    try {
        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Ocorreu um erro desconhecido no backend.' }));
            console.error(`Backend error at ${endpoint}:`, errorData);
            throw new Error(errorData.error || `Falha na chamada para ${endpoint}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Network or fetch error for ${endpoint}:`, error);
        if (error instanceof TypeError) { // Network error
            throw new Error("Não foi possível conectar ao servidor backend. Verifique se ele está em execução.");
        }
        throw error;
    }
}


// --- Service Layer ---
// This layer prepares data for the communication layer. Signatures remain the same.

export const generateAnalysisPlan = async (competitors: string[]): Promise<string> => {
  const data = await postToBackend<{ report: string }>('/generate-analysis', { competitors });
  return data.report;
};

export const generateDeepAnalysis = async (competitors: string[]): Promise<string> => {
    const data = await postToBackend<{ report: string }>('/generate-deep-analysis', { competitors });
    return data.report;
};

export const editImage = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
    const data = await postToBackend<{ image_data: string }>('/edit-image', {
        image_data: base64ImageData,
        mime_type: mimeType,
        prompt: prompt,
    });
    return data.image_data;
};

export const generateVideoFromImage = async (
    base64ImageData: string,
    mimeType: string,
    prompt: string,
    aspectRatio: '16:9' | '9:16'
) => {
    return await postToBackend<any>('/generate-video', {
        image_data: base64ImageData,
        mime_type: mimeType,
        prompt: prompt,
        aspect_ratio: aspectRatio,
    });
};

export const getVideosOperation = async (operation: any) => {
    return await postToBackend<any>('/get-video-operation', { operation });
};

export const transcribeAudio = async (base64AudioData: string, mimeType: string): Promise<string> => {
    const data = await postToBackend<{ transcription: string }>('/transcribe-audio', {
        audio_data: base64AudioData,
        mime_type: mimeType,
    });
    return data.transcription;
};

export const generateSpeech = async (text: string, voiceName: string): Promise<string> => {
    const data = await postToBackend<{ audio_content: string }>('/generate-speech', {
        text,
        voice_name: voiceName,
    });
    return data.audio_content;
};

export const generateImpactfulAudioSummary = async (reportContent: string): Promise<string> => {
    const data = await postToBackend<{ summary: string }>('/generate-impactful-summary', {
        report_content: reportContent,
    });
    return data.summary;
};