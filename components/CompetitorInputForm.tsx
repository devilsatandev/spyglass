
import React, { useState, useMemo } from 'react';
import { Users, Search, Loader2, AlertCircle } from 'lucide-react';

interface CompetitorInputFormProps {
  onAnalyze: (competitors: string[]) => void;
  isLoading: boolean;
}

const CompetitorInputForm: React.FC<CompetitorInputFormProps> = ({ onAnalyze, isLoading }) => {
  const [competitors, setCompetitors] = useState<string[]>(['', '', '']);
  const [errors, setErrors] = useState<string[]>(['', '', '']);

  const validateCompetitor = (name: string): string => {
    if (name.length > 0 && name.length < 3) {
      return 'Deve ter pelo menos 3 caracteres.';
    }
    // Simple regex to allow letters, numbers, spaces, dots, and hyphens.
    if (name.length > 0 && !/^[a-zA-Z0-9\s.-]+$/.test(name)) {
      return 'Nome contém caracteres inválidos.';
    }
    return ''; // No error
  };

  const handleInputChange = (index: number, value: string) => {
    const newCompetitors = [...competitors];
    newCompetitors[index] = value;
    setCompetitors(newCompetitors);

    const newErrors = [...errors];
    newErrors[index] = validateCompetitor(value);
    setErrors(newErrors);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = competitors.map(c => validateCompetitor(c));
    setErrors(newErrors);

    const hasErrors = newErrors.some(error => error !== '');
    if (!hasErrors) {
      onAnalyze(competitors);
    }
  };

  const isFormInvalid = useMemo(() => {
    return errors.some(error => error !== '');
  }, [errors]);

  const isSubmitDisabled = isLoading || isFormInvalid;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-base-200 p-6 sm:p-8 rounded-xl border border-base-300 shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map((index) => (
          <div key={index}>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="text"
                value={competitors[index]}
                onChange={(e) => handleInputChange(index, e.target.value)}
                placeholder={`Concorrente ${index + 1}`}
                className={`w-full pl-10 pr-4 py-3 bg-base-300 rounded-lg outline-none transition duration-200 text-text-primary placeholder-text-secondary ${
                  errors[index]
                    ? 'border-red-500 focus:ring-1 focus:ring-red-500 border'
                    : 'border border-base-300 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary'
                }`}
                aria-invalid={!!errors[index]}
                aria-describedby={`error-${index}`}
              />
            </div>
            {errors[index] && (
              <p id={`error-${index}`} className="flex items-center text-red-400 text-sm mt-2" role="alert">
                <AlertCircle className="w-4 h-4 mr-1.5 flex-shrink-0" />
                {errors[index]}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="flex items-center justify-center gap-2 px-8 py-3 w-full sm:w-auto bg-brand-primary hover:bg-brand-secondary text-white font-semibold rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-600 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Gerar Relatório de Inteligência
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default CompetitorInputForm;
