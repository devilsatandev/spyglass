import React, { useRef, useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { AlertTriangle, Bot, CheckCircle, Loader2, PlusCircle, X, Volume2, VolumeX, AlertOctagon, DollarSign, Image, Video, Mic, Sparkles } from 'lucide-react';
import TrafficChart, { type TrafficData } from './TrafficChart';
import ImageEditor from './ImageEditor';
import VideoGenerator from './VideoGenerator';
import AudioTranscriber from './AudioTranscriber';
import TextToSpeech from './TextToSpeech';
import { 
  generateSpeech,
  generateImpactfulAudioSummary,
} from '../services/geminiService';

// --- Audio Helper Types & Functions ---
type AudioPlaybackState = {
    context: AudioContext;
    source: AudioBufferSourceNode | null;
    isPlaying: boolean;
};

const decode = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

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

const createWaveFileBlobFromPCM = (pcmData: Uint8Array, sampleRate: number, numChannels: number): Blob => {
    const buffer = new ArrayBuffer(44 + pcmData.length);
    const view = new DataView(buffer);
    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, pcmData.length, true);
    new Uint8Array(buffer, 44).set(pcmData);
    return new Blob([view], { type: 'audio/wav' });
};

interface ReportDisplayProps {
  isLoading: boolean;
  error: string | null;
  report: string | null;
  competitors: string[];
  onNewInvestigation: () => void;
}

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="h-8 bg-base-300 rounded-md w-1/3 animate-pulse-fast"></div>
          <div className="h-4 bg-base-300 rounded-md w-full animate-pulse-fast"></div>
          <div className="h-4 bg-base-300 rounded-md w-5/6 animate-pulse-fast"></div>
        </div>
      ))}
    </div>
);

const creativeToolIds = ['image', 'video', 'audio_transcriber', 'tts'] as const;
type CreativeToolId = typeof creativeToolIds[number];
type ModalContentType = 'audio' | 'mute_confirm' | CreativeToolId;

const isCreativeTool = (type: any): type is CreativeToolId => creativeToolIds.includes(type);

const allActions = [
    { id: 'image', title: 'Editor de Imagem', icon: Image, type: 'modal' },
    { id: 'video', title: 'Gerador de Vídeo', icon: Video, type: 'modal' },
    { id: 'audio_transcriber', title: 'Transcritor de Áudio', icon: Mic, type: 'modal' },
    { id: 'tts', title: 'Texto para Voz', icon: Volume2, type: 'modal' },
    { id: 'audio_summary', title: 'Gerar Resumo em Áudio', icon: Sparkles, type: 'action' },
] as const;

const ReportDisplay: React.FC<ReportDisplayProps> = ({ isLoading, error, report, competitors, onNewInvestigation }) => {
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [modalContent, setModalContent] = useState<{ title: string; type: ModalContentType; content?: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  
  // States for cinematic presentation
  const [sections, setSections] = useState<string[]>([]);
  const [visibleSections, setVisibleSections] = useState<string[]>([]);
  const [isPresenting, setIsPresenting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioPlaybackRef = useRef<AudioPlaybackState>({ context: null!, source: null, isPlaying: false });

  useEffect(() => {
    // Initialize AudioContext on user interaction
    const initAudio = () => {
        if (!audioPlaybackRef.current.context) {
            audioPlaybackRef.current.context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        document.removeEventListener('click', initAudio);
    };
    document.addEventListener('click', initAudio);

    return () => {
      audioPlaybackRef.current.source?.stop();
      document.removeEventListener('click', initAudio);
    };
  }, []);
  
  useEffect(() => {
    if (report) {
      const reportSections = report.split(/(?=^##\s)/m).filter(s => s.trim().length > 0);
      setSections(reportSections);
      setVisibleSections([]);
      setIsPresenting(true);
    } else {
      setIsPresenting(false);
      setSections([]);
      setVisibleSections([]);
    }
  }, [report]);

  useEffect(() => {
    if (isPresenting && visibleSections.length < sections.length) {
      const timer = setTimeout(async () => {
          const nextSection = sections[visibleSections.length];
          setVisibleSections(prev => [...prev, nextSection]);
          if (!isMuted && nextSection) {
             try {
                const textToSpeak = nextSection.replace(/#+\s*/g, '').substring(0, 500); // Speak first 500 chars
                const base64Audio = await generateSpeech(textToSpeak, 'Kore');
                const audioData = decode(base64Audio);
                const buffer = await decodeAudioData(audioData, audioPlaybackRef.current.context, 24000, 1);
                
                if (audioPlaybackRef.current.source) {
                    audioPlaybackRef.current.source.stop();
                }
                const source = audioPlaybackRef.current.context.createBufferSource();
                source.buffer = buffer;
                source.connect(audioPlaybackRef.current.context.destination);
                source.start(0);
                audioPlaybackRef.current.source = source;

             } catch(e) {
                console.error("Failed to generate or play section audio", e);
             }
          }
      }, 2000); // 2-second delay between sections
      return () => clearTimeout(timer);
    } else if (isPresenting && visibleSections.length === sections.length) {
      setIsPresenting(false);
    }
  }, [isPresenting, visibleSections, sections, isMuted]);

  const { trafficData } = useMemo(() => {
      if (visibleSections.length === 0) return { trafficData: null };
      const combined = visibleSections.join('\n');
      const parsedData = parseTrafficDataFromReport(combined);
      return { trafficData: parsedData };
  }, [visibleSections]);

  const handleMuteToggle = () => {
    if (!isMuted) {
        setModalContent({ title: "Confirmar Mudo", type: 'mute_confirm' });
    } else {
        setIsMuted(false);
    }
  };

  const confirmMute = () => {
    setIsMuted(true);
    if (audioPlaybackRef.current.source) {
        audioPlaybackRef.current.source.stop();
    }
    setModalContent(null);
  };

  const handleAudioSummary = async () => {
    if (!report) return;
    setActionLoading(true);
    setActionError(null);
    try {
        const audioSummary = await generateImpactfulAudioSummary(report);
        const base64Audio = await generateSpeech(audioSummary, 'Kore');
        const pcmData = decode(base64Audio);
        const wavBlob = createWaveFileBlobFromPCM(pcmData, 24000, 1);
        setModalContent({ title: "Resumo de Áudio Impactante", content: URL.createObjectURL(wavBlob), type: 'audio' });
    } catch (e) {
        console.error("Failed to generate impactful audio summary", e);
        setActionError("Não foi possível gerar o resumo de áudio.");
    } finally {
        setActionLoading(false);
    }
  };
  
  if (isLoading) return <div className="bg-base-200 p-8 rounded-lg border border-base-300 shadow-lg"><h2 className="text-2xl font-semibold mb-4 text-center text-brand-primary">Gerando Análise...</h2><LoadingSkeleton /></div>;
  if (error) return <div className="bg-red-900/20 border border-red-500 text-red-300 p-6 rounded-lg flex items-center gap-4"><AlertTriangle className="w-8 h-8 text-red-400" /><div><h3 className="font-semibold text-lg">Erro na Missão</h3><p>{error}</p></div></div>;
  if (!report) return <div className="text-center py-16 px-6 bg-base-200 rounded-lg border border-dashed border-base-300"><Bot className="w-16 h-16 mx-auto text-text-secondary" /><h3 className="mt-4 text-xl font-semibold text-text-primary">Aguardando Ordens</h3><p className="mt-2 text-text-secondary">Insira seus alvos acima para iniciar a missão.</p></div>;

  return (
    <div className="bg-base-200 p-6 sm:p-8 rounded-lg border border-base-300 shadow-lg relative overflow-hidden">
        <div className="absolute top-4 right-4 z-10">
            <button onClick={handleMuteToggle} className="p-2 rounded-full bg-base-300/50 hover:bg-base-300 text-text-primary backdrop-blur-sm">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
        </div>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
            <button onClick={onNewInvestigation} className="flex items-center gap-2 px-4 py-2 bg-base-300 hover:bg-brand-secondary/20 text-text-primary font-semibold rounded-md transition-colors duration-200 border border-brand-secondary">
                <PlusCircle className="w-5 h-5" /> Nova Investigação
            </button>
        </div>

        <div className="mt-6">
            {trafficData && <TrafficChart data={trafficData} />}
            {visibleSections.map((section, index) => (
                <div key={index} className="prose prose-invert max-w-none prose-h2:border-b prose-h2:border-base-300 prose-h2:pb-2 animate-highlight-item" style={{ animationDelay: `${index * 0.1}s`}}>
                    <ReactMarkdown components={{ li: ({node, ...props}) => <li className="flex items-start"><CheckCircle className="w-5 h-5 text-brand-primary mr-3 mt-1 flex-shrink-0" /><span>{props.children}</span></li>, p: ({node, ...props}) => <p className="leading-relaxed">{props.children}</p> }}>{section}</ReactMarkdown>
                </div>
            ))}
             {isPresenting && <div className="flex justify-center items-center gap-2 text-text-secondary mt-4"><Loader2 className="w-4 h-4 animate-spin" /><span>Compilando dossiê...</span></div>}
        </div>

        {!isPresenting && report && visibleSections.length === sections.length && (
            <div className="mt-10 pt-6 border-t border-brand-secondary/30 text-center">
                 <h3 className="text-2xl font-bold text-brand-primary mb-2">Ações de IA Táticas</h3>
                 <p className="text-text-secondary mb-8">Utilize o Gemini para gerar ativos criativos a partir desta análise.</p>
                 <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                    {allActions.map(action => (
                         <button 
                            key={action.id}
                            onClick={() => {
                                if (action.type === 'modal') {
                                    setModalContent({ title: action.title, type: action.id as CreativeToolId })
                                } else if (action.id === 'audio_summary') {
                                    handleAudioSummary();
                                }
                            }} 
                            disabled={action.id === 'audio_summary' && actionLoading}
                            className="flex flex-col items-center justify-center text-center gap-3 p-4 bg-base-300 hover:bg-brand-secondary/20 text-text-primary font-semibold rounded-lg transition-all duration-300 ease-in-out border border-base-100 hover:border-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed">
                            {action.id === 'audio_summary' && actionLoading ? (
                                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                            ) : (
                                <action.icon className="w-8 h-8 text-brand-primary" />
                            )}
                            <span className="text-sm">{action.title}</span>
                         </button>
                    ))}
                 </div>
                 {actionError && <p className="text-red-400 text-center text-sm mt-4">{actionError}</p>}
            </div>
        )}

      {modalContent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setModalContent(null)}>
            <div className={`bg-base-100 rounded-lg border border-brand-secondary shadow-2xl w-full ${isCreativeTool(modalContent.type) ? 'max-w-4xl' : 'max-w-md'} max-h-[90vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-brand-secondary flex-shrink-0">
                    <h2 className="text-xl font-semibold text-brand-primary">{modalContent.title}</h2>
                    <button onClick={() => setModalContent(null)} className="p-1 rounded-full text-text-secondary hover:bg-base-300" aria-label="Fechar modal"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {modalContent.type === 'audio' && <audio controls autoPlay src={modalContent.content} className="w-full"></audio>}
                    {modalContent.type === 'mute_confirm' && (
                        <div className="text-center">
                            <AlertOctagon className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                            <h3 className="text-lg font-bold">Aviso de Protocolo</h3>
                            <p className="text-text-secondary mt-2 mb-6">A apresentação cinematográfica será silenciada. Deseja continuar?</p>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setModalContent(null)} className="px-6 py-2 bg-base-300 hover:bg-brand-secondary/20 rounded-md">Cancelar</button>
                                <button onClick={confirmMute} className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-md">Confirmar</button>
                            </div>
                        </div>
                    )}
                    {modalContent.type === 'image' && <ImageEditor />}
                    {modalContent.type === 'video' && <VideoGenerator />}
                    {modalContent.type === 'audio_transcriber' && <AudioTranscriber />}
                    {modalContent.type === 'tts' && <TextToSpeech />}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const parseTrafficDataFromReport = (markdown: string): TrafficData[] | null => {
    const tableRegex = /\| Concorrente\s*\| Busca Orgânica \(%\).*?\n\|-.*\n((?:\|.*?\n)+)/s;
    const tableMatch = markdown.match(tableRegex);
    if (!tableMatch || !tableMatch[1]) return null;
    const rows = tableMatch[1].trim().split('\n');
    const data: TrafficData[] = rows.map(row => {
        const columns = row.split('|').map(c => c.trim()).slice(1, -1);
        if (columns.length < 6) return null;
        return {
            competitor: columns[0],
            sources: { 'Busca Orgânica': parseFloat(columns[1]) || 0, 'Busca Paga': parseFloat(columns[2]) || 0, 'Social': parseFloat(columns[3]) || 0, 'Direto': parseFloat(columns[4]) || 0, 'Referência': parseFloat(columns[5]) || 0 }
        };
    }).filter((d): d is TrafficData => d !== null && d.competitor !== '');
    return data.length > 0 ? data : null;
};


export default ReportDisplay;