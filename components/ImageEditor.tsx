import React, { useState, useCallback } from 'react';
import { Image as ImageIcon, Sparkles, Wand2, Loader2, AlertTriangle, UploadCloud } from 'lucide-react';
import { editImage } from '../services/geminiService';

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

const ImageEditor: React.FC = () => {
    const [originalImage, setOriginalImage] = useState<{ file: File, url: string } | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setOriginalImage({ file, url: URL.createObjectURL(file) });
            setEditedImage(null);
            setError(null);
        } else {
            setError("Por favor, selecione um arquivo de imagem válido.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!originalImage || !prompt) {
            setError("Por favor, carregue uma imagem e insira um prompt de edição.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setEditedImage(null);

        try {
            const base64Data = await blobToBase64(originalImage.file);
            const resultBase64 = await editImage(base64Data, originalImage.file.type, prompt);
            setEditedImage(`data:${originalImage.file.type};base64,${resultBase64}`);
        } catch (err) {
            console.error(err);
            setError("Falha ao editar a imagem. Verifique o console para mais detalhes.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className="text-center mb-6">
                <ImageIcon className="w-10 h-10 mx-auto text-brand-primary" />
                <h2 className="text-2xl font-bold mt-2">Editor de Imagem com IA</h2>
                <p className="text-text-secondary">Descreva as alterações que você deseja fazer em sua imagem.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {!originalImage && (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-base-300 border-dashed rounded-lg cursor-pointer bg-base-100 hover:bg-base-300 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-10 h-10 mb-3 text-text-secondary"/>
                            <p className="mb-2 text-sm text-text-secondary"><span className="font-semibold">Clique para carregar</span> ou arraste e solte</p>
                            <p className="text-xs text-text-secondary">PNG, JPG, WEBP (MAX. 4MB)</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {originalImage && (
                        <div className="space-y-2">
                             <label className="font-semibold">Original</label>
                             <img src={originalImage.url} alt="Original" className="w-full rounded-lg shadow-md aspect-video object-contain bg-base-100" />
                        </div>
                    )}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full aspect-video bg-base-100 rounded-lg">
                            <Loader2 className="w-12 h-12 animate-spin text-brand-primary" />
                            <p className="mt-4 text-text-secondary">Aplicando magia...</p>
                        </div>
                    ) : editedImage && (
                        <div className="space-y-2">
                            <label className="font-semibold">Editada</label>
                            <img src={editedImage} alt="Edited" className="w-full rounded-lg shadow-md aspect-video object-contain bg-base-100" />
                        </div>
                    )}
                </div>
                 
                {originalImage && (
                    <>
                        <div className="relative">
                            <Wand2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Ex: adicione um filtro retro, remova o fundo..."
                                className="w-full pl-10 pr-4 py-3 bg-base-300 rounded-lg outline-none transition duration-200 text-text-primary placeholder-text-secondary border border-base-300 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || !prompt || !originalImage}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-semibold rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-600 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Gerando...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    Editar Imagem
                                </>
                            )}
                        </button>
                    </>
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

export default ImageEditor;