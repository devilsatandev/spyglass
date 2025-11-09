import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import CompetitorInputForm from './components/CompetitorInputForm';
import ReportDisplay from './components/ReportDisplay';
import HistorySidebar from './components/HistorySidebar';
import { generateAnalysisPlan, generateDeepAnalysis } from './services/geminiService';

export interface HistoryItem {
  id: string;
  competitors: string[];
  report: string;
  date: string;
}

const App: React.FC = () => {
  const [analysisReport, setAnalysisReport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<HistoryItem[]>([]);
  const [formKey, setFormKey] = useState<number>(0);
  const [highlightedHistoryId, setHighlightedHistoryId] = useState<string | null>(null);
  const [currentCompetitors, setCurrentCompetitors] = useState<string[]>([]);

  // Load history from localStorage on initial render
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('spyglass-history');
      if (storedHistory) {
        setAnalysisHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load history from localStorage", error);
      setAnalysisHistory([]);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('spyglass-history', JSON.stringify(analysisHistory));
    } catch (error) {
      console.error("Failed to save history to localStorage", error);
    }
  }, [analysisHistory]);

  const handleAnalyze = useCallback(async (competitors: string[], type: 'regular' | 'deep') => {
    const validCompetitors = competitors.filter(c => c.trim() !== '');
    if (validCompetitors.length === 0) {
      setError("Por favor, insira pelo menos um concorrente.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisReport(null);
    setCurrentCompetitors(validCompetitors);

    try {
      const report = type === 'deep'
        ? await generateDeepAnalysis(validCompetitors)
        : await generateAnalysisPlan(validCompetitors);
      
      setAnalysisReport(report);
      
      const newHistoryItem: HistoryItem = {
        id: new Date().toISOString() + Math.random(), // simple unique id
        competitors: validCompetitors,
        report,
        date: new Date().toISOString(),
      };
      setAnalysisHistory(prevHistory => [newHistoryItem, ...prevHistory]);

    } catch (e) {
      console.error(e);
      setError("Ocorreu um erro ao gerar o relatório. Por favor, verifique sua chave de API e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleSelectHistoryItem = useCallback((item: HistoryItem) => {
    setAnalysisReport(item.report);
    setCurrentCompetitors(item.competitors);
  }, []);

  const handleClearHistory = useCallback(() => {
    if (window.confirm("Tem certeza de que deseja limpar todo o histórico de análises? Esta ação não pode ser desfeita.")) {
      setAnalysisHistory([]);
      setAnalysisReport(null); 
      setCurrentCompetitors([]);
    }
  }, []);

  const handleNewInvestigation = useCallback(() => {
    if (analysisReport && analysisHistory.length > 0) {
      const currentItem = analysisHistory.find(item => item.report === analysisReport);
      if (currentItem) {
          setHighlightedHistoryId(currentItem.id);
          setTimeout(() => setHighlightedHistoryId(null), 2500);
      }
    }
    setAnalysisReport(null);
    setCurrentCompetitors([]);
    setFormKey(prevKey => prevKey + 1);
  }, [analysisReport, analysisHistory]);


  return (
    <div className="bg-base-100 min-h-screen font-sans text-text-primary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Header />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
            <aside className="lg:col-span-4 xl:col-span-3">
                <HistorySidebar 
                    history={analysisHistory}
                    onSelectReport={handleSelectHistoryItem}
                    onClearHistory={handleClearHistory}
                    highlightedItemId={highlightedHistoryId}
                />
            </aside>
            <main className="lg:col-span-8 xl:col-span-9">
              <section id="input-section">
                <CompetitorInputForm key={formKey} onAnalyze={handleAnalyze} isLoading={isLoading} />
              </section>
              <section id="report-section" className="mt-12">
                <ReportDisplay 
                  isLoading={isLoading} 
                  error={error} 
                  report={analysisReport} 
                  competitors={currentCompetitors}
                  onNewInvestigation={handleNewInvestigation}
                />
              </section>
            </main>
        </div>
        
        <footer className="text-center mt-16 text-text-secondary text-sm">
            <p>&gt; Connection to Gemini API secure</p>
            <p>&gt; Spyglass v2.1 cinematic briefing enabled</p>
        </footer>
      </div>
    </div>
  );
};

export default App;