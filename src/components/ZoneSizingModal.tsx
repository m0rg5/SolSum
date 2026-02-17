import React, { useState, useMemo } from 'react';
import { PowerItem, ChargingSource } from '../types';

// Inline Icons to avoid missing dependencies
const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);
const CalculatorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /></svg>
);
const ZapIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><path d="M4 14.71 13.14 4 11 10.29h9L10.86 21 13 14.71z" /></svg>
);

interface ZoneSizingModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: PowerItem[];
    sources: ChargingSource[];
}

interface WireSizeResult {
    awg: string;
    mm2: number;
    maxAmps: number;
    voltageDrop: number;
    percentageDrop: number;
    recommended: boolean;
    color: string;
}

export const ZoneSizingModal: React.FC<ZoneSizingModalProps> = ({
    isOpen,
    onClose,
    items,
    sources
}) => {
    const [selectedTag, setSelectedTag] = useState<string>('');
    const [lengthCheck, setLengthCheck] = useState<number>(5); // meters

    // Extract all unique tags
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        const processNotes = (notes?: string) => {
            const matches = (notes || '').match(/#[\w\-\/]+/g);
            if (matches) matches.forEach(m => tags.add(m));
        };

        items.forEach(i => processNotes(i.notes));
        sources.forEach(s => processNotes(s.notes));

        return Array.from(tags).sort();
    }, [items, sources]);

    // Set initial tag if empty and tags exist
    React.useEffect(() => {
        if (!selectedTag && allTags.length > 0) {
            setSelectedTag(allTags[0]);
        }
    }, [allTags, selectedTag]);

    // Calculate zone stats
    const zoneStats = useMemo(() => {
        if (!selectedTag) return null;

        const cleanTag = (n?: string) => (n || '').includes(selectedTag);

        const zoneItems = items.filter(i => cleanTag(i.notes));
        const zoneSources = sources.filter(s => cleanTag(s.notes));

        const totalLoadCurrent = zoneItems.reduce((sum, item) => {
            const amps = (Number(item.watts) * (Number(item.quantity) || 1)) / 24;
            return sum + amps;
        }, 0);

        const totalChargeCurrent = zoneSources.reduce((sum, source) => {
            return sum + (source.type === 'solar'
                ? (Number(source.input)) / 24
                : (Number(source.input)));
        }, 0);

        const maxCurrent = Math.max(totalLoadCurrent, totalChargeCurrent);

        return {
            items: zoneItems.length,
            sources: zoneSources.length,
            loadAmps: totalLoadCurrent,
            chargeAmps: totalChargeCurrent,
            maxCurrent,
            power: maxCurrent * 24
        };
    }, [selectedTag, items, sources]);

    const calculateWireSize = (current: number, length: number): WireSizeResult[] => {
        const wires = [
            { mm: 1.5, awg: '16', amps: 25 },
            { mm: 2.5, awg: '14', amps: 35 },
            { mm: 4, awg: '12', amps: 45 },
            { mm: 6, awg: '10', amps: 55 },
            { mm: 10, awg: '8', amps: 70 },
            { mm: 16, awg: '6', amps: 95 },
            { mm: 25, awg: '4', amps: 120 },
            { mm: 35, awg: '2', amps: 160 },
            { mm: 50, awg: '1/0', amps: 210 },
            { mm: 70, awg: '2/0', amps: 270 },
            { mm: 95, awg: '3/0', amps: 330 },
            { mm: 120, awg: '4/0', amps: 390 }
        ];

        return wires.map(wire => {
            const resistance = (0.01724 * (length * 2)) / wire.mm; // Ohm
            const vDrop = current * resistance;
            const vDropPercent = (vDrop / 24) * 100;

            const isAmpacitySafe = wire.amps >= current * 1.25;
            const isDropSafe = vDropPercent <= 3;

            let color = 'text-slate-400';
            if (isAmpacitySafe && vDropPercent <= 3) color = 'text-emerald-500 font-bold';
            else if (isAmpacitySafe && vDropPercent <= 10) color = 'text-yellow-500';
            else color = 'text-red-400';

            return {
                awg: wire.awg,
                mm2: wire.mm,
                maxAmps: wire.amps,
                voltageDrop: vDrop,
                percentageDrop: vDropPercent,
                recommended: isAmpacitySafe && vDropPercent <= 3,
                color
            };
        });
    };

    const results = useMemo(() => {
        if (!zoneStats || zoneStats.maxCurrent === 0) return [];
        return calculateWireSize(zoneStats.maxCurrent, lengthCheck);
    }, [zoneStats, lengthCheck]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                            <CalculatorIcon />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Zone Sizing Calculator</h3>
                            <p className="text-xs text-slate-500">ISO 10133 / ABYC E-11 Compliant (24V)</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <XIcon />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">

                    {/* Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-slate-700">Select Zone</label>
                            <div className="flex flex-wrap gap-2">
                                {allTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setSelectedTag(tag)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedTag === tag
                                                ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-200'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                                {allTags.length === 0 && (
                                    <div className="text-sm text-slate-400 italic">No tags found in notes</div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    One-way Length (meters)
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="50"
                                    step="0.5"
                                    value={lengthCheck}
                                    onChange={(e) => setLengthCheck(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>0.5m</span>
                                    <span className="font-bold text-blue-600">{lengthCheck}m</span>
                                    <span>50m</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Summary */}
                    {zoneStats && (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-3 gap-4">
                            <div className="text-center">
                                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Load</div>
                                <div className="text-xl font-bold text-slate-800">{zoneStats.loadAmps.toFixed(1)}A</div>
                                <div className="text-xs text-slate-400">{zoneStats.items} items</div>
                            </div>
                            <div className="text-center border-l border-slate-200">
                                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Charge</div>
                                <div className="text-xl font-bold text-emerald-600">{zoneStats.chargeAmps.toFixed(1)}A</div>
                                <div className="text-xs text-slate-400">{zoneStats.sources} sources</div>
                            </div>
                            <div className="text-center border-l border-slate-200">
                                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Design Target</div>
                                <div className="text-2xl font-black text-blue-600">{zoneStats.maxCurrent.toFixed(1)}A</div>
                                <div className="text-xs text-slate-400">Max Current</div>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    {results.length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <ZapIcon />
                                Recommended Wire Sizes
                            </h4>
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500">
                                        <tr>
                                            <th className="px-4 py-2 font-medium">Size (mm²)</th>
                                            <th className="px-4 py-2 font-medium">AWG</th>
                                            <th className="px-4 py-2 font-medium">Voltage Drop</th>
                                            <th className="px-4 py-2 font-medium text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {results.map((r, i) => (
                                            <tr key={i} className={`hover:bg-slate-50 ${r.recommended ? 'bg-emerald-50/50' : ''}`}>
                                                <td className="px-4 py-2 font-mono font-medium">{r.mm2}</td>
                                                <td className="px-4 py-2 text-slate-500">{r.awg}</td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={r.percentageDrop <= 3 ? 'text-emerald-600' : r.percentageDrop <= 10 ? 'text-yellow-600' : 'text-red-600'}>
                                                            {r.percentageDrop.toFixed(1)}%
                                                        </span>
                                                        <span className="text-slate-400 text-xs">({r.voltageDrop.toFixed(2)}V)</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    {r.recommended ? (
                                                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-100 px-2 py-0.5 rounded-full">
                                                            Recommended
                                                        </span>
                                                    ) : r.maxAmps < (zoneStats?.maxCurrent || 0) * 1.25 ? (
                                                        <span className="text-red-400 text-xs">Unsafe (Ampacity)</span>
                                                    ) : (
                                                        <span className="text-yellow-500 text-xs">High Drop</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
