import React, { useState, useEffect, useRef } from 'react';
import { Video, Sparkles, Wand2, Loader2, AlertTriangle, UploadCloud, CheckCircle, ExternalLink } from 'lucide-react';
import { generateVideoFromImage, getVideosOperation } from '../services/geminiService';

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

const VideoGenerator: React.FC = () => {
    const [image, setImage] = useState<{ file: File, url: string } | null>(null);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [apiKeySelected, setApiKeySelected] = useState<boolean>(false);

    const pollIntervalRef = useRef<number | null>(null);

    const checkApiKey = async () => {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setApiKeySelected(hasKey);
        return hasKey;
    };

    useEffect(() => {
        checkApiKey();
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    const handleSelectKey = async () => {
        await window.aistudio.openSelectKey();
        // Assume success and update UI immediately to avoid race condition
        setApiKeySelected(true);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setImage({ file, url: URL.createObjectURL(file) });
            setGeneratedVideoUrl(null);
            setError(null);
        } else {
            setError("Por favor, selecione um arquivo de imagem válido.");
        }
    };

    const pollForVideo = (operation: any) => {
        pollIntervalRef.current = window.setInterval(async () => {
            try {
                const updatedOperation = await getVideosOperation(operation);
                if (updatedOperation.done) {
                    clearInterval(pollIntervalRef.current!);
                    const videoUri = updatedOperation.response?.generatedVideos?.[0]?.video?.uri;
                    if (videoUri) {
                        const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
                        const videoBlob = await response.blob();
                        setGeneratedVideoUrl(URL.createObjectURL(videoBlob));
                    } else {
                        setError("A geração de vídeo foi concluída, mas nenhum vídeo foi retornado.");
                    }
                    setIsLoading(false);
                }
            } catch (err) {
                 if(err.message.includes('not found')) {
                    setError("Chave de API inválida. Por favor, selecione uma chave de API válida.");
                    setApiKeySelected(false); // Reset key state
                 } else {
                    setError("Erro ao verificar o status da geração de vídeo.");
                 }
                setIsLoading(false);
                clearInterval(pollIntervalRef.current!);
            }
        }, 10000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!image || !prompt) {
            setError("Por favor, carregue uma imagem e insira um prompt.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedVideoUrl(null);
        setLoadingMessage("Iniciando a geração do vídeo... Isso pode levar alguns minutos.");

        try {
            const base64Data = await blobToBase64(image.file);
            const initialOperation = await generateVideoFromImage(base64Data, image.file.type, prompt, aspectRatio);
            setLoadingMessage("Operação iniciada. Aguardando a conclusão do vídeo...");
            pollForVideo(initialOperation);
        } catch (err) {
            console.error(err);
            if (err.message.includes('not found')) {
                 setError("A chave de API pode ser inválida. Por favor, selecione uma chave de API válida e tente novamente.");
                 setApiKeySelected(false); // Reset key state
            } else {
                setError("Falha ao iniciar a geração do vídeo. Verifique o console.");
            }
            setIsLoading(false);
        }
    };
    
    if (!apiKeySelected) {
        return (
            <div className="text-center">
                 <Video className="w-10 h-10 mx-auto text-brand-primary" />
                <h2 className="text-2xl font-bold mt-2">Gerador de Vídeo com IA</h2>
                <p className="text-text-secondary mt-2 mb-4">A geração de vídeo requer uma chave de API para cobrança.</p>
                <div className="bg-base-100 p-4 rounded-lg">
                    <button onClick={handleSelectKey} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-semibold rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105">
                        Selecionar Chave de API
                    </button>
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-secondary hover:underline">
                        Saiba mais sobre cobrança <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="text-center mb-6">
                <Video className="w-10 h-10 mx-auto text-brand-primary" />
                <h2 className="text-2xl font-bold mt-2">Gerador de Vídeo com IA</h2>
                <p className="text-text-secondary">Crie um vídeo a partir de uma imagem e um prompt de texto.</p>
            </div>

             <form onSubmit={handleSubmit} className="space-y-6">
                 {!image && (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-base-300 border-dashed rounded-lg cursor-pointer bg-base-100 hover:bg-base-300 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-10 h-10 mb-3 text-text-secondary"/>
                            <p className="mb-2 text-sm text-text-secondary"><span className="font-semibold">Clique para carregar</span> ou arraste e solte</p>
                            <p className="text-xs text-text-secondary">PNG, JPG, WEBP (MAX. 4MB)</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                )}

                 {image && (
                     <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="font-semibold block mb-2">Imagem Inicial</label>
                                <img src={image.url} alt="Initial" className="w-full rounded-lg shadow-md aspect-video object-contain bg-base-100" />
                            </div>
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full aspect-video bg-base-100 rounded-lg p-4">
                                    <Loader2 className="w-12 h-12 animate-spin text-brand-primary" />
                                    <p className="mt-4 text-text-secondary text-center">{loadingMessage}</p>
                                </div>
                            ) : generatedVideoUrl && (
                                <div>
                                    <label className="font-semibold block mb-2">Vídeo Gerado</label>
                                    <video src={generatedVideoUrl} controls autoPlay loop className="w-full rounded-lg shadow-md aspect-video object-contain bg-base-100"></video>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <Wand2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Ex: um close-up cinematográfico, voando pela cidade..."
                                className="w-full pl-10 pr-4 py-3 bg-base-300 rounded-lg outline-none transition duration-200 text-text-primary placeholder-text-secondary border border-base-300 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                                required
                            />
                        </div>

                        <div>
                            <label className="font-semibold block mb-2">Proporção do Vídeo</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 p-3 bg-base-300 rounded-lg cursor-pointer border-2 border-transparent has-[:checked]:border-brand-primary">
                                    <input type="radio" name="aspectRatio" value="16:9" checked={aspectRatio === '16:9'} onChange={() => setAspectRatio('16:9')} className="form-radio text-brand-primary bg-base-100" />
                                    Paisagem (16:9)
                                </label>
                                <label className="flex items-center gap-2 p-3 bg-base-300 rounded-lg cursor-pointer border-2 border-transparent has-[:checked]:border-brand-primary">
                                    <input type="radio" name="aspectRatio" value="9:16" checked={aspectRatio === '9:16'} onChange={() => setAspectRatio('9:16')} className="form-radio text-brand-primary bg-base-100" />
                                    Retrato (9:16)
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !prompt || !image}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-semibold rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-600 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Gerando...</> : <><Sparkles className="w-5 h-5" />Gerar Vídeo</>}
                        </button>
                    </div>
                 )}

                 {error && (
                    <div className="bg-red-900/20 border border-red-500 text-red-300 p-4 rounded-lg flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6" />
                        <p>{error}</p>
                    </div>
                )}
            </form>
        </div>
    );
};

export default VideoGenerator;
