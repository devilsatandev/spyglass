import React from 'react';
import { History, Trash2 } from 'lucide-react';
import type { HistoryItem } from '../App';

interface HistorySidebarProps {
  history: HistoryItem[];
  onSelectReport: (item: HistoryItem) => void;
  onClearHistory: () => void;
  highlightedItemId: string | null;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, onSelectReport, onClearHistory, highlightedItemId }) => {
  return (
    <div className="bg-base-200 p-6 rounded-lg border border-base-300 shadow-lg h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <History className="w-6 h-6 text-brand-secondary" />
          <h2 className="text-xl font-semibold text-text-primary">Histórico de Análise</h2>
        </div>
        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="p-2 text-text-secondary hover:text-red-400 transition-colors duration-200"
            aria-label="Limpar histórico"
            title="Limpar histórico"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {history.length === 0 ? (
          <p className="text-text-secondary text-center py-8">&gt; Nenhum registro encontrado...</p>
        ) : (
          history.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectReport(item)}
              className={`w-full text-left p-4 bg-base-300 hover:bg-base-100 rounded-md transition-all duration-200 border border-transparent hover:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary ${
                item.id === highlightedItemId ? 'animate-highlight-item' : ''
              }`}
            >
              <p className="font-semibold text-text-primary truncate" title={item.competitors.join(', ')}>
                {item.competitors.join(', ')}
              </p>
              <p className="text-sm text-text-secondary mt-1">
                {new Date(item.date).toLocaleString('pt-BR')}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default HistorySidebar;
