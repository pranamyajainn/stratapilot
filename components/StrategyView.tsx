import React, { useState } from 'react';
import { CampaignStrategy } from '../types';
import { Target, Megaphone, Calendar, DollarSign, BarChart2, Layers, Pencil, Check, X, Edit2 } from 'lucide-react';

// Helper for consistency
const EditorialBadge: React.FC = () => (
  <span className="text-[8px] font-black text-amber-500 uppercase tracking-[0.2em] bg-amber-50 px-2 py-0.5 rounded border border-amber-100 flex items-center gap-1 w-fit">
    <Edit2 size={8} /> Human Edit
  </span>
);

interface StrategyViewProps {
  strategy: CampaignStrategy;
  onUpdate?: (strategy: CampaignStrategy) => void;
}

export const StrategyView: React.FC<StrategyViewProps> = ({ strategy, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editStrategy, setEditStrategy] = useState<CampaignStrategy>(strategy);

  // Synchronize local state with props when not editing
  React.useEffect(() => {
    if (!isEditing) {
      setEditStrategy(strategy);
    }
  }, [strategy, isEditing]);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({ ...editStrategy, isHumanEdited: true });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditStrategy(strategy);
    setIsEditing(false);
  };

  const updateField = (field: keyof CampaignStrategy, value: any) => {
    setEditStrategy(prev => ({ ...prev, [field]: value }));
  };

  const updateArrayField = (field: 'keyPillars' | 'channelSelection' | 'successMetrics', index: number, value: string) => {
    const newArray = [...(editStrategy[field] || [])];
    newArray[index] = value;
    updateField(field, newArray);
  };

  const updateMessageField = (index: number, key: 'headline' | 'subMessage', value: string) => {
    const newMessages = [...editStrategy.keyMessages];
    newMessages[index] = { ...newMessages[index], [key]: value };
    updateField('keyMessages', newMessages);
  };

  return (
    <div className="bg-slate-900 text-white rounded-[32px] p-8 lg:p-12 shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-8 duration-700 relative group">

      {/* HEADER & CONTROLS */}
      <div className="flex flex-col items-center mb-10 text-center relative">
        {strategy.isHumanEdited && <div className="absolute top-0 right-0"><EditorialBadge /></div>}

        {/* EDIT TOGGLE */}
        {onUpdate && (
          <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="p-2 bg-slate-800 rounded-full hover:bg-indigo-600 transition-colors text-slate-400 hover:text-white">
                <Pencil size={16} />
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleCancel} className="p-2 bg-slate-800 rounded-full hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition-colors">
                  <X size={16} />
                </button>
                <button onClick={handleSave} className="p-2 bg-indigo-600 rounded-full hover:bg-emerald-600 text-white transition-colors">
                  <Check size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold tracking-widest uppercase rounded-full mb-3 border border-indigo-500/30">
          Campaign Strategy Mode
        </span>
        <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400 tracking-tight">
          Strategic Execution Plan
        </h2>
        <p className="text-slate-400 mt-2 max-w-xl text-sm leading-relaxed">
          A targeted roadmap to activate the identified persona effectively using data-driven creative vectors.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

        {/* Key Pillars */}
        <div className="space-y-5">
          <div className="flex items-center gap-2.5 text-indigo-400 mb-3">
            <Layers className="w-5 h-5" />
            <h3 className="text-lg font-bold uppercase tracking-wider">Strategic Pillars</h3>
          </div>
          <div className="space-y-2.5">
            {editStrategy.keyPillars.map((pillar, i) => (
              <div key={i} className="flex items-start gap-3.5 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-indigo-500 text-white font-bold text-xs">
                  {i + 1}
                </span>
                {isEditing ? (
                  <input
                    value={pillar}
                    onChange={(e) => updateArrayField('keyPillars', i, e.target.value)}
                    className="w-full bg-transparent border-b border-indigo-500/30 text-white text-[13px] focus:outline-none focus:border-indigo-500"
                  />
                ) : (
                  <p className="text-slate-200 font-medium text-[13px] leading-relaxed">{pillar}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Messaging */}
        <div className="space-y-5">
          <div className="flex items-center gap-2.5 text-pink-400 mb-3">
            <Megaphone className="w-5 h-5" />
            <h3 className="text-lg font-bold uppercase tracking-wider">Core Messaging</h3>
          </div>
          <div className="space-y-3.5">
            {editStrategy.keyMessages.map((msg, i) => (
              <div key={i} className="bg-gradient-to-br from-white/10 to-transparent p-5 rounded-xl border-l-4 border-pink-500">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      value={msg.headline}
                      onChange={(e) => updateMessageField(i, 'headline', e.target.value)}
                      className="w-full bg-transparent border-b border-pink-500/50 text-base font-bold text-white mb-1 focus:outline-none"
                    />
                    <textarea
                      value={msg.subMessage}
                      onChange={(e) => updateMessageField(i, 'subMessage', e.target.value)}
                      className="w-full bg-transparent border border-white/10 rounded p-1 text-[12px] text-slate-300 focus:outline-none focus:border-pink-500/50"
                      rows={2}
                    />
                  </div>
                ) : (
                  <>
                    <h4 className="font-bold text-base text-white mb-1 tracking-tight italic">"{msg.headline}"</h4>
                    <p className="text-[12px] text-slate-400 leading-relaxed">{msg.subMessage}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 pt-10 border-t border-white/10">

        {/* Timeline */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 mb-1.5">
            <Calendar className="w-4 h-4" />
            <h4 className="font-bold uppercase tracking-wider text-[11px]">Timeline</h4>
          </div>
          {isEditing ? (
            <textarea
              value={editStrategy.timeline}
              onChange={(e) => updateField('timeline', e.target.value)}
              className="w-full bg-transparent border border-emerald-500/30 rounded p-2 text-slate-300 text-[12px] h-20 focus:outline-none focus:border-emerald-500"
            />
          ) : (
            <p className="text-slate-300 text-[12px] leading-relaxed">{editStrategy.timeline}</p>
          )}
        </div>

        {/* Budget */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 mb-1.5">
            <DollarSign className="w-4 h-4" />
            <h4 className="font-bold uppercase tracking-wider text-[11px]">Budget Allocation</h4>
          </div>
          {isEditing ? (
            <textarea
              value={editStrategy.budgetAllocation}
              onChange={(e) => updateField('budgetAllocation', e.target.value)}
              className="w-full bg-transparent border border-amber-500/30 rounded p-2 text-slate-300 text-[12px] h-20 focus:outline-none focus:border-amber-500"
            />
          ) : (
            <p className="text-slate-300 text-[12px] leading-relaxed">{editStrategy.budgetAllocation}</p>
          )}
        </div>

        {/* Channels */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-blue-400 mb-1.5">
            <Target className="w-4 h-4" />
            <h4 className="font-bold uppercase tracking-wider text-[11px]">Channels</h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {editStrategy.channelSelection.map((ch, i) => (
              isEditing ? (
                <input
                  key={i}
                  value={ch}
                  onChange={(e) => updateArrayField('channelSelection', i, e.target.value)}
                  className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px] border border-blue-500/30 font-bold w-24 text-center focus:outline-none focus:border-blue-400"
                />
              ) : (
                <span key={i} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px] border border-blue-500/30 font-bold">
                  {ch}
                </span>
              )
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-10">
        <div className="flex items-center gap-2.5 text-violet-400 mb-5 justify-center">
          <BarChart2 className="w-5 h-5" />
          <h3 className="text-base font-bold uppercase tracking-wider">Success Metrics (KPIs)</h3>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {editStrategy.successMetrics.map((kpi, i) => (
            isEditing ? (
              <input
                key={i}
                value={kpi}
                onChange={(e) => updateArrayField('successMetrics', i, e.target.value)}
                className="px-5 py-2.5 bg-violet-600/20 text-violet-200 rounded-full border border-violet-500/30 text-[13px] font-semibold shadow-[0_0_15px_rgba(139,92,246,0.1)] text-center w-40 focus:outline-none focus:border-violet-400"
              />
            ) : (
              <div key={i} className="px-5 py-2.5 bg-violet-600/20 text-violet-200 rounded-full border border-violet-500/30 text-[13px] font-semibold shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                {kpi}
              </div>
            )
          ))}
        </div>
      </div>

    </div>
  );
};
