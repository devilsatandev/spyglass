import React, { useRef, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { AlertTriangle, Bot, CheckCircle, Download, Loader2, Info, ExternalLink, Copy } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import TrafficChart, { type TrafficData } from './TrafficChart';


interface ReportDisplayProps {
  isLoading: boolean;
  error: string | null;
  report: string | null;
}

const toolsInfo = {
  'SimilarWeb': {
    description: 'Ferramenta de inteligência de mercado que fornece estimativas de tráfego e insights sobre websites.',
    url: 'https://www.similarweb.com/'
  },
  'Ahrefs': {
    description: 'Conjunto de ferramentas de SEO para pesquisa de backlinks, análise de concorrentes e pesquisa de palavras-chave.',
    url: 'https://ahrefs.com/'
  },
  'SEMrush': {
    description: 'Plataforma de SaaS para gerenciamento de visibilidade online e marketing de conteúdo.',
    url: 'https://www.semrush.com/'
  }
};

interface TooltipIconProps {
  toolName: keyof typeof toolsInfo;
}

const TooltipIcon: React.FC<TooltipIconProps> = ({ toolName }) => {
  const tool = toolsInfo[toolName];
  if (!tool) return <>{toolName}</>;

  return (
    <span className="relative group inline-flex items-center align-middle">
      <span className="underline decoration-dotted decoration-brand-secondary cursor-help">{toolName}</span>
      <Info className="w-4 h-4 text-brand-secondary ml-1 flex-shrink-0" />
      <span
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 text-sm bg-base-300 text-text-primary rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none border border-base-100 text-left"
        role="tooltip"
      >
        <strong className="font-semibold block">{toolName}</strong>
        {tool.description}
        <a
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-brand-primary font-semibold mt-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Saber mais <ExternalLink className="w-3 h-3 ml-1" />
        </a>
      </span>
    </span>
  );
};

const addTooltipsToChildren = (children: React.ReactNode) => {
    const toolRegex = new RegExp(`(${Object.keys(toolsInfo).join('|')})`, 'g');

    return React.Children.map(children, (child) => {
        if (typeof child === 'string' && toolRegex.test(child)) {
            const parts = child.split(toolRegex);
            return parts.map((part, i) => {
                if (toolsInfo.hasOwnProperty(part)) {
                    return <TooltipIcon key={i} toolName={part as keyof typeof toolsInfo} />;
                }
                return part;
            });
        }
        return child;
    });
};

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="h-8 bg-base-300 rounded-md w-1/3 animate-pulse-fast"></div>
          <div className="h-4 bg-base-300 rounded-md w-full animate-pulse-fast"></div>
          <div className="h-4 bg-base-300 rounded-md w-5/6 animate-pulse-fast"></div>
          <div className="h-4 bg-base-300 rounded-md w-3/4 animate-pulse-fast"></div>
        </div>
      ))}
    </div>
);

const parseTrafficDataFromReport = (markdown: string): TrafficData[] | null => {
    const tableRegex = /\| Concorrente\s*\| Busca Orgânica \(%\).*?\n\|-.*\n((?:\|.*?\n)+)/s;
    const tableMatch = markdown.match(tableRegex);
    if (!tableMatch || !tableMatch[1]) return null;

    const rows = tableMatch[1].trim().split('\n');
    const headers = ['competitor', 'Busca Orgânica', 'Busca Paga', 'Social', 'Direto', 'Referência'];
    
    const data: TrafficData[] = rows.map(row => {
        const columns = row.split('|').map(c => c.trim()).slice(1, -1);
        const competitorData: TrafficData = {
            competitor: columns[0],
            sources: {
                'Busca Orgânica': parseFloat(columns[1]) || 0,
                'Busca Paga': parseFloat(columns[2]) || 0,
                'Social': parseFloat(columns[3]) || 0,
                'Direto': parseFloat(columns[4]) || 0,
                'Referência': parseFloat(columns[5]) || 0,
            }
        };
        return competitorData;
    }).filter(d => d.competitor);

    return data.length > 0 ? data : null;
};

const ReportDisplay: React.FC<ReportDisplayProps> = ({ isLoading, error, report }) => {
  const reportContentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const { trafficData, processedReport } = useMemo(() => {
    if (!report) return { trafficData: null, processedReport: '' };

    const parsedData = parseTrafficDataFromReport(report);

    // Hide the markdown table from the visual report, as we have a chart now
    const tableRegex = /## Resumo Comparativo das Fontes de Tráfego[\s\S]*?(\n\n|$)/;
    let reportWithoutTable = report.replace(tableRegex, '').trim();

    const placeholderRegex = /\[SCREENSHOT_PLACEHOLDER_FOR_(.*?)\]/g;
    const finalReport = reportWithoutTable.replace(placeholderRegex, (match, competitorName) => {
      const encodedName = encodeURIComponent(competitorName.trim());
      const placeholderUrl = `https://placehold.co/800x450/21262d/8b949e/png?text=Placeholder+do+Site\n${encodedName}`;
      return `\n![Placeholder para o website de ${competitorName}](${placeholderUrl})\n`;
    });

    return { trafficData: parsedData, processedReport: finalReport };
  }, [report]);

  const handleExportPDF = async () => {
    const element = reportContentRef.current;
    if (!element) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#161b22',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      const imgWidth = pdfWidth - 20;
      const imgHeight = imgWidth / ratio;
      let heightLeft = imgHeight;
      let position = 10;
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      pdf.save('relatorio-spyglass.pdf');
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Ocorreu um erro ao gerar o PDF.");
    } finally {
        setIsExporting(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!report) return;
    navigator.clipboard.writeText(report).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Falha ao copiar o relatório.');
    });
  };
  
  if (isLoading) {
    return (
      <div className="bg-base-200 p-8 rounded-xl border border-base-300 shadow-lg">
        <h2 className="text-2xl font-semibold mb-4 text-center text-brand-primary">Gerando Análise...</h2>
        <p className="text-center text-text-secondary mb-8">O espião está coletando informações. Isso pode levar um momento.</p>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 text-red-300 p-6 rounded-xl flex items-center gap-4">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <div>
          <h3 className="font-semibold text-lg">Erro na Missão</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-16 px-6 bg-base-200 rounded-xl border border-dashed border-base-300">
        <Bot className="w-16 h-16 mx-auto text-text-secondary" />
        <h3 className="mt-4 text-xl font-semibold text-text-primary">Aguardando Ordens</h3>
        <p className="mt-2 text-text-secondary">Insira seus concorrentes acima para iniciar a missão de espionagem.</p>
      </div>
    );
  }

  return (
    <div className="bg-base-200 p-6 sm:p-8 rounded-xl border border-base-300 shadow-lg">
       <div className="flex flex-wrap justify-end items-center gap-4 mb-4">
        <div className="relative flex items-center">
            <button
                onClick={handleCopyToClipboard}
                className="flex items-center gap-2 px-4 py-2 bg-base-300 hover:bg-brand-secondary/20 text-text-primary font-semibold rounded-lg shadow-sm transition-all duration-300 ease-in-out border border-base-100"
                title="Copiar para a área de transferência"
            >
                <Copy className="w-4 h-4" />
                Copiar
            </button>
            {isCopied && (
                <span className="ml-3 text-sm text-green-400 transition-opacity duration-300">
                    Copiado!
                </span>
            )}
        </div>
        <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-brand-secondary hover:bg-brand-primary/80 text-white font-semibold rounded-lg shadow-md transition-all duration-300 ease-in-out disabled:bg-gray-600 disabled:opacity-70 disabled:cursor-not-allowed"
        >
            {isExporting ? <><Loader2 className="w-5 h-5 animate-spin" />Exportando...</> : <><Download className="w-5 h-5" />Exportar como PDF</>}
        </button>
      </div>
      <div ref={reportContentRef}>
        {trafficData && <TrafficChart data={trafficData} />}
        <div className="prose prose-invert max-w-none prose-h1:text-brand-primary prose-h2:text-brand-secondary prose-h2:border-b prose-h2:border-base-300 prose-h2:pb-2 prose-a:text-brand-primary hover:prose-a:text-brand-secondary prose-strong:text-text-primary prose-ul:list-disc prose-li:marker:text-brand-primary">
            <ReactMarkdown
            components={{
                h1: ({node, ...props}) => <h1 className="text-3xl font-bold mb-4" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-2xl font-semibold mt-8 mb-4" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-xl font-semibold mt-6 mb-3" {...props} />,
                ul: ({node, ...props}) => <ul className="pl-5 space-y-2" {...props} />,
                li: ({node, ...props}) => (
                    <li className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-brand-primary mr-3 mt-1 flex-shrink-0" />
                        <span>{addTooltipsToChildren(props.children)}</span>
                    </li>
                ),
                p: ({node, ...props}) => <p className="leading-relaxed">{addTooltipsToChildren(props.children)}</p>,
                img: ({node, ...props}) => (
                <div className="my-6 border border-base-300 rounded-lg overflow-hidden shadow-md bg-base-300">
                    <img {...props} alt={props.alt || ''} className="w-full h-auto object-cover aspect-video" />
                </div>
                ),
            }}
            >
                {processedReport}
            </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default ReportDisplay;
