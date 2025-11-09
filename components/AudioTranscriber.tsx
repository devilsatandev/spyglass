import React, { useState, useRef, useCallback } from 'react';
import { Mic, Square, Loader2, AlertTriangle, FileText } from 'lucide-react';
import { transcribeAudio } from '../services/geminiService';

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Failed to read blob as base64 string."));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const AudioTranscriber: React.FC = () => {
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [transcribedText, setTranscribedText] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const handleStartRecording = async () => {
        setError(null);
        setTranscribedText('');
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorderRef.current = new MediaRecorder(stream);
                audioChunksRef.current = [];

                mediaRecorderRef.current.ondataavailable = (event) => {
                    audioChunksRef.current.push(event.data);
                };

                mediaRecorderRef.current.onstop = async () => {
                    setIsLoading(true);
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    try {
                        const base64Audio = await blobToBase64(audioBlob);
                        const transcription = await transcribeAudio(base64Audio, 'audio/webm');
                        setTranscribedText(transcription);
                    } catch (err) {
                        console.error(err);
                        setError("Falha ao transcrever o áudio. Verifique o console.");
                    } finally {
                        setIsLoading(false);
                    }
                     // Stop all tracks to release the microphone
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorderRef.current.start();
                setIsRecording(true);
            } catch (err) {
                console.error("Error accessing microphone:", err);
                setError("Não foi possível acessar o microfone. Por favor, verifique as permissões do seu navegador.");
            }
        } else {
            setError("A gravação de áudio não é suportada neste navegador.");
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    return (
        <div>
            <div className="text-center mb-6">
                <Mic className="w-10 h-10 mx-auto text-brand-primary" />
                <h2 className="text-2xl font-bold mt-2">Transcritor de Áudio</h2>
                <p className="text-text-secondary">Grave áudio do seu microfone e obtenha uma transcrição.</p>
            </div>

            <div className="flex justify-center mb-6">
                {!isRecording ? (
                    <button
                        onClick={handleStartRecording}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        <Mic className="w-6 h-6" />
                        Iniciar Gravação
                    </button>
                ) : (
                    <button
                        onClick={handleStopRecording}
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-lg transition-all duration-300 ease-in-out animate-pulse"
                    >
                        <Square className="w-6 h-6" />
                        Parar Gravação
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-500 text-red-300 p-4 rounded-lg flex items-center gap-3 mb-6">
                    <AlertTriangle className="w-6 h-6" />
                    <p>{error}</p>
                </div>
            )}
            
            <div className="w-full p-4 bg-base-100 rounded-lg border border-base-300 min-h-[200px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                        <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
                        <p className="mt-4 text-text-secondary">Transcrevendo áudio...</p>
                    </div>
                ) : transcribedText ? (
                    <div className="prose prose-invert max-w-none">
                        <p>{transcribedText}</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-text-secondary">
                         <FileText className="w-10 h-10 mb-3" />
                        <p>Sua transcrição aparecerá aqui.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AudioTranscriber;
