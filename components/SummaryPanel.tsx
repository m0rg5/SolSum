
import React from 'react';
import { PowerItem, SystemTotals, BatteryConfig, ChargingSource } from '../types';
import { calculateAutonomy } from '../services/powerLogic';

interface SummaryPanelProps {
  items: PowerItem[];
  totals: SystemTotals;
  systemVoltage: number;
  battery: BatteryConfig;
  charging: ChargingSource[];
}

const SummaryPanel: React.FC<SummaryPanelProps> = ({ totals, systemVoltage, items, battery, charging }) => {
  const socColor = totals.finalSoC > 50 ? 'text-emerald-400' : totals.finalSoC > 20 ? 'text-amber-400' : 'text-red-400';

  const renderAutonomyRow = (label: string, scenario: 'current' | 'peak' | 'cloud' | 'zero', icon: string) => {
    const forecast = battery.forecast ? { sunny: battery.forecast.sunnyHours, cloudy: battery.forecast.cloudyHours } : undefined;
    const { days, hours } = calculateAutonomy(items, charging, battery, scenario, forecast);
    
    let text = "";
    let textColor = "text-slate-400";

    if (days === Infinity || days > 99) {
      text = "∞";
      textColor = "text-emerald-400";
    } else {
      if (days > 1) {
         text = `${days.toFixed(1)} d`;
         textColor = days > 3 ? "text-emerald-400" : "text-amber-400";
      } else {
         text = `${hours.toFixed(1)} h`;
         textColor = "text-rose-400";
      }
    }

    return (
      <div className="flex items-start gap-4 w-full group/row py-1">
        <span className="text-lg grayscale group-hover/row:grayscale-0 transition-all shrink-0 mt-0.5">{icon}</span>
        <div className="flex flex-col items-start flex-1 border-l border-slate-800/50 pl-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{label} Autonomy</span>
          <span className={`font-mono font-black text-[13px] leading-tight mt-0.5 ${textColor}`}>{text}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full text-center py-2 px-1">
      {/* Battery SoC Card */}
      <div className="w-full bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-2xl flex flex-col items-center relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
        <h3 className="app-header-font text-[10px] text-slate-600 mb-4">24H SOC</h3>
        
        <div className={`text-5xl font-black mb-6 drop-shadow-lg transition-all duration-500 ${socColor}`}>
          {totals.finalSoC.toFixed(0)}%
        </div>

        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-8 border border-slate-700/50 shadow-inner max-w-[180px]">
          <div 
            className={`h-full transition-all duration-1000 relative ${totals.finalSoC > 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
            style={{ width: `${totals.finalSoC}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent"></div>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-[140px]">
          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 shadow-md flex flex-col items-center group/box hover:border-cyan-500/30 transition-colors">
             <span className="text-[8px] text-slate-600 uppercase font-black mb-1 tracking-widest">Input</span>
             <span className="font-mono text-cyan-400 font-black text-xs tracking-tight">+{totals.dailyAhGenerated.toFixed(0)}Ah</span>
          </div>
          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 shadow-md flex flex-col items-center group/box hover:border-rose-500/30 transition-colors">
             <span className="text-[8px] text-slate-600 uppercase font-black mb-1 tracking-widest">Output</span>
             <span className="font-mono text-rose-400 font-black text-xs tracking-tight">-{totals.dailyAhConsumed.toFixed(0)}Ah</span>
          </div>
        </div>
      </div>

      {/* Battery Life Card */}
      <div className="w-full bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-2xl flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
        <h3 className="app-header-font text-[10px] text-slate-600 mb-6">Battery Life</h3>
        
        <div className="w-full space-y-4 px-1 max-w-[180px]">
          {renderAutonomyRow("Realistic", "current", "📊")}
          {renderAutonomyRow("Peak", "peak", "☀️")}
          {renderAutonomyRow("Cloud", "cloud", "⛅")}
          {renderAutonomyRow("0%", "zero", "🌑")}
        </div>
      </div>
    </div>
  );
};

export default SummaryPanel;
