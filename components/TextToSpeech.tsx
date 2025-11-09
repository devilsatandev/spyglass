import React, { useState } from 'react';
import { Volume2, Sparkles, Loader2, AlertTriangle, Download } from 'lucide-react';
import { generateSpeech } from '../services/geminiService';

const voices = [
    { id: 'Zephyr', name: 'Zephyr (Masculino, Calmo)' },
    { id: 'Kore', name: 'Kore (Feminino, Neutro)' },
    { id: 'Puck', name: 'Puck (Masculino, Energético)' },
    { id: 'Charon', name: 'Charon (Masculino, Profundo)' },
    { id: 'Fenrir', name: 'Fenrir (Feminino, Sério)' },
];

// --- Audio Helper Functions ---

// Decodes a base64 string into a Uint8Array.
const decode = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

// Decodes raw PCM audio data into an AudioBuffer.
const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
};

// Writes a string to a DataView.
const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

// Creates a WAV file Blob from an AudioBuffer.
const createWaveFileBlob = (audioBuffer: AudioBuffer): Blob => {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const buffer = new ArrayBuffer(44 + length * numChannels * 2);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length * numChannels * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true); // byteRate
    view.setUint16(32, numChannels * 2, true); // blockAlign
    view.setUint16(34, 16, true); // bitsPerSample
    writeString(view, 36, 'data');
    view.setUint32(40, length * numChannels * 2, true);

    let offset = 44;
    for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            const sample = audioBuffer.getChannelData(channel)[i];
            let s = Math.max(-1, Math.min(1, sample));
            s = s < 0 ? s * 0x8000 : s * 0x7FFF;
            view.setInt16(offset, s, true);
            offset += 2;
        }
    }

    return new Blob([view], { type: 'audio/wav' });
};


const TextToSpeech: React.FC = () => {
    const [text, setText] = useState<string>('');
    const [selectedVoice, setSelectedVoice] = useState<string>(voices[0].id);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) {
            setError("Por favor, insira algum texto para gerar o áudio.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setAudioUrl(null);

        try {
            const base64Audio = await generateSpeech(text, selectedVoice);
            
            // FIX: Cast window to `any` to allow for vendor-prefixed webkitAudioContext.
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                outputAudioContext,
                24000,
                1,
            );
            const wavBlob = createWaveFileBlob(audioBuffer);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);

        } catch (err) {
            console.error(err);
            setError("Falha ao gerar o áudio. Verifique o console para mais detalhes.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className="text-center mb-6">
                <Volume2 className="w-10 h-10 mx-auto text-brand-primary" />
                <h2 className="text-2xl font-bold mt-2">Texto para Voz (TTS)</h2>
                <p className="text-text-secondary">Converta texto em áudio falado com vozes de IA.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Digite ou cole seu texto aqui..."
                    className="w-full h-40 p-4 bg-base-300 rounded-lg outline-none transition duration-200 text-text-primary placeholder-text-secondary border border-base-300 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary resize-y"
                    required
                    maxLength={1000}
                />
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div>
                        <label htmlFor="voice-select" className="block text-sm font-medium text-text-secondary mb-2">Selecione uma Voz</label>
                        <select
                            id="voice-select"
                            value={selectedVoice}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                            className="w-full pl-3 pr-8 py-3 bg-base-300 rounded-lg outline-none transition duration-200 text-text-primary border border-base-300 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                        >
                            {voices.map(voice => (
                                <option key={voice.id} value={voice.id}>{voice.name}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !text.trim()}
                        className="w-full flex sm:self-end items-center justify-center gap-2 px-6 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-semibold rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-600 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Gerando...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                Gerar Áudio
                            </>
                        )}
                    </button>
                </div>
            </form>

            {error && (
                <div className="mt-6 bg-red-900/20 border border-red-500 text-red-300 p-4 rounded-lg flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6" />
                    <p>{error}</p>
                </div>
            )}
            
            {audioUrl && (
                <div className="mt-8 p-4 bg-base-100 rounded-lg border border-base-300">
                     <h3 className="text-lg font-semibold mb-3 text-text-primary">Áudio Gerado</h3>
                    <audio controls src={audioUrl} className="w-full">
                        Seu navegador não suporta o elemento de áudio.
                    </audio>
                    <a
                        href={audioUrl}
                        download="spyglass-audio.wav"
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-secondary/20 hover:bg-brand-secondary/40 text-brand-primary font-semibold rounded-lg transition-colors duration-200"
                    >
                        <Download className="w-4 h-4" />
                        Baixar Áudio (.wav)
                    </a>
                </div>
            )}
        </div>
    );
};

export default TextToSpeech;