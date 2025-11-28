import React from 'react';
import { Counselor, CouncilResponse } from '../../types';

interface OrbitingInsightsProps {
  counselor: Counselor;
  data: CouncilResponse['counselors'][0];
  isActive: boolean;
}

const OrbitingInsights: React.FC<OrbitingInsightsProps> = ({ counselor, data, isActive }) => {
  if (!isActive || !data) return null;

  const getColorClasses = (color: string) => {
    const map: Record<string, { border: string, bg: string, text: string, glow: string }> = {
      blue: { border: 'border-blue-400', bg: 'bg-blue-900/40', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
      green: { border: 'border-green-400', bg: 'bg-green-900/40', text: 'text-green-400', glow: 'shadow-green-500/20' },
      yellow: { border: 'border-yellow-400', bg: 'bg-yellow-900/40', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
      purple: { border: 'border-purple-400', bg: 'bg-purple-900/40', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
      red: { border: 'border-red-400', bg: 'bg-red-900/40', text: 'text-red-400', glow: 'shadow-red-500/20' },
    };
    return map[color] || map['purple'];
  };

  const colors = getColorClasses(counselor.color);
  
  // Fixed colors for specific card types to match mockup
  const actionColors = getColorClasses('green');
  const reflectionColors = getColorClasses('yellow');

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
      
      {/* Card 1: Analysis (Top Right) - Uses Counselor Color */}
      <div 
        className={`absolute top-[-140px] left-[60px] w-60 p-4 rounded-xl backdrop-blur-md border ${colors.border} bg-slate-900/90 shadow-2xl ${colors.glow} animate-float pointer-events-auto`}
        style={{ animationDelay: '0s' }}
      >
        <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>Analysis</span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed font-light">
          "{data.impression}"
        </p>
        {/* Connector Line */}
        <div className={`absolute bottom-0 left-0 w-12 h-[1px] ${colors.bg.replace('/40', '')} origin-bottom-left rotate-45 translate-y-6 -translate-x-6 opacity-50`}></div>
      </div>

      {/* Card 2: Action Plan (Bottom Right) - Always Green/Emerald */}
      <div 
        className={`absolute top-[60px] left-[80px] w-56 p-4 rounded-xl backdrop-blur-md border ${actionColors.border} bg-slate-900/90 shadow-2xl ${actionColors.glow} animate-float pointer-events-auto`}
        style={{ animationDelay: '1s' }}
      >
        <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${actionColors.text}`}>Action Plan</span>
        </div>
        <ul className="space-y-2 text-xs text-slate-300">
          {data.action_plan.slice(0, 3).map((step, i) => (
            <li key={i} className="flex gap-2 items-start">
              <span className={`${actionColors.text} mt-0.5`}>✓</span> 
              <span className="leading-tight line-clamp-2">{step}</span>
            </li>
          ))}
        </ul>
        {/* Connector Line */}
        <div className={`absolute top-0 left-0 w-12 h-[1px] ${actionColors.bg.replace('/40', '')} origin-top-left -rotate-12 -translate-x-6 opacity-50`}></div>
      </div>

      {/* Card 3: Reflection (Left) - Always Yellow/Amber */}
      <div 
        className={`absolute top-[-20px] right-[80px] w-56 p-4 rounded-xl backdrop-blur-md border ${reflectionColors.border} bg-slate-900/90 shadow-2xl ${reflectionColors.glow} animate-float pointer-events-auto`}
        style={{ animationDelay: '2s' }}
      >
        <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${reflectionColors.text}`}>Reflection</span>
        </div>
        <p className="text-xs text-slate-200 italic font-serif leading-relaxed">
          "{data.reflection_q}"
        </p>
        {/* Connector Line */}
        <div className={`absolute top-1/2 right-0 w-16 h-[1px] ${reflectionColors.bg.replace('/40', '')} translate-x-full opacity-50`}></div>
      </div>

    </div>
  );
};

export default OrbitingInsights;
