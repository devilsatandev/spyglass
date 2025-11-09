import React, { useEffect, useState } from 'react';

// Fix: Made TrafficSourceData specific to match the data structure from the report parser.
export interface TrafficSourceData {
    'Busca Orgânica': number;
    'Busca Paga': number;
    'Social': number;
    'Direto': number;
    'Referência': number;
}
  
export interface TrafficData {
    competitor: string;
    sources: TrafficSourceData;
}


interface TrafficChartProps {
  data: TrafficData[];
}

const CHART_COLORS = ['#00ff41', '#008f11', '#33ff66']; // Matrix Green, Darker Green, Lighter Green

const TrafficChart: React.FC<TrafficChartProps> = ({ data }) => {
  const [isAnimated, setIsAnimated] = useState(false);
  
  useEffect(() => {
    // Trigger animation shortly after component mounts
    const timer = setTimeout(() => setIsAnimated(true), 100);
    return () => clearTimeout(timer);
  }, [data]); // Re-animate if data changes

  if (!data || data.length === 0) return null;

  const sources = Object.keys(data[0].sources);
  const maxValue = 100; // Percentages go up to 100

  return (
    <div className="bg-base-300/50 p-4 sm:p-6 rounded-lg my-6 border border-base-300 shadow-inner">
      <h3 className="text-xl font-semibold mb-6 text-text-primary text-center">Comparativo de Fontes de Tráfego</h3>
      <div className="w-full flex" style={{ height: '260px' }}> {/* 480p aspect ratio-like height */}
        <div className="flex flex-col justify-between h-full text-xs text-text-secondary pr-2">
            <span>{maxValue}%</span>
            <span>{maxValue / 2}%</span>
            <span>0%</span>
        </div>
        <div className="w-full grid grid-cols-5 gap-4 border-l border-base-300 pl-4">
            {sources.map((source, sourceIndex) => (
                <div key={sourceIndex} className="relative flex flex-col justify-end items-center h-full">
                    <div className="absolute top-0 w-full h-full border-b border-base-300/50"></div>
                    <div className="absolute top-1/2 w-full h-1/2 border-b border-base-300/50"></div>
                    
                    <div className="relative w-full h-full flex items-end justify-center gap-1">
                        {data.map((competitorData, competitorIndex) => (
                            <div
                                key={competitorIndex}
                                className="w-full rounded-t-sm transition-all duration-1000 ease-out hover:opacity-80"
                                style={{
                                    height: isAnimated ? `${(competitorData.sources[source as keyof TrafficSourceData] / maxValue) * 100}%` : '0%',
                                    backgroundColor: CHART_COLORS[competitorIndex % CHART_COLORS.length],
                                    transitionDelay: `${competitorIndex * 150}ms`
                                }}
                                title={`${competitorData.competitor} - ${source}: ${competitorData.sources[source as keyof TrafficSourceData]}%`}
                            ></div>
                        ))}
                    </div>
                    <span className="absolute -bottom-6 text-xs text-text-secondary text-center">{source.replace(/ \(\$%\)/, '')}</span>
                </div>
            ))}
        </div>
      </div>
      <div className="flex justify-center flex-wrap gap-4 sm:gap-6 mt-10">
        {data.map((item, index) => (
          <div key={item.competitor} className="flex items-center gap-2 text-sm text-text-primary">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
            ></span>
            <span>{item.competitor}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrafficChart;