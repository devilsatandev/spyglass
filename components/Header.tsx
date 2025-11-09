
import React from 'react';
import { Target } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="text-center">
      <div className="flex items-center justify-center gap-4">
        <Target className="w-10 h-10 text-brand-primary" />
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-secondary">
          Spyglass
        </h1>
      </div>
      <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
        Sua missão: conduzir uma 'Análise de Inteligência Competitiva' sobre seus principais concorrentes.
      </p>
    </header>
  );
};

export default Header;
