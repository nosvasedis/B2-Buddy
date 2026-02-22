
import React, { useState, useEffect, useMemo } from 'react';
import { AppSection, DailyWord, UserStats, Quest, StrategyTip } from '../types';
import { generateCoachingBrief, CoachingBrief } from '../services/geminiService';
import { playSound } from '../services/soundService';

interface DashboardProps {
    onChangeSection: (s: AppSection) => void;
    dailyWord: DailyWord | null;
    stats: UserStats;
    coachBrief: CoachingBrief | null;
    setCoachBrief: (brief: CoachingBrief | null) => void;
    onCollectDailyWord: (word: string) => void;
}

const STRATEGY_TIPS: StrategyTip[] = [
    { id: '1', pillar: 'Speaking', tip: 'Use "In my opinion" or "From my perspective" to start.', hack: 'Avoid long silences! Say "That is an interesting question" while you think.' },
    { id: '2', pillar: 'Writing', tip: 'Always include a catchy title for Articles.', hack: 'Check your word count. FCE essays must be 140-190 words.' },
    { id: '3', pillar: 'Grammar', tip: 'Use "In spite of" + -ing for B2 bonus points.', hack: 'Unless means "if not". It is a classic exam trick!' },
    { id: '4', pillar: 'Listening', tip: 'Read the questions BEFORE the audio starts.', hack: 'Listen for synonyms. If the text says "cheap", the answer might say "inexpensive".' }
];

const QUEST_POOL: Omit<Quest, 'completed' | 'id'>[] = [
    { title: 'The Orator', description: 'Complete 1 Speaking session.', xp: 100, type: AppSection.SPEAKING },
    { title: 'The Decoder', description: 'Read 1 article in the Library.', xp: 80, type: AppSection.READING },
    { title: 'The Architect', description: 'Finish a Grammar blueprint.', xp: 100, type: AppSection.GRAMMAR },
    { title: 'The Vault Keeper', description: 'Collect a Legendary word.', xp: 120, type: AppSection.DICTIONARY },
    { title: 'The Scribe', description: 'Generate 1 model essay.', xp: 90, type: AppSection.ESSAY_TUTOR }
];

const BentoItem = React.memo(({ section, colorTheme, icon, title, subtitle, progress, className = "", delay = "0s", onClick }: any) => {
    const styles: any = {
        indigo: { bg: 'bg-gradient-to-br from-indigo-500 to-indigo-700', border: 'border-indigo-400', shadow: 'shadow-indigo-200' },
        rose:   { bg: 'bg-gradient-to-br from-rose-500 to-rose-700', border: 'border-rose-400', shadow: 'shadow-rose-200' },
        emerald:{ bg: 'bg-gradient-to-br from-emerald-500 to-emerald-700', border: 'border-emerald-400', shadow: 'shadow-emerald-200' },
        amber:  { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', border: 'border-orange-400', shadow: 'shadow-orange-200' },
        teal:   { bg: 'bg-gradient-to-br from-teal-500 to-cyan-700', border: 'border-cyan-400', shadow: 'shadow-teal-200' },
        pink:   { bg: 'bg-gradient-to-br from-pink-500 to-fuchsia-700', border: 'border-pink-400', shadow: 'shadow-pink-200' },
        blue:   { bg: 'bg-gradient-to-br from-blue-500 to-blue-700', border: 'border-blue-400', shadow: 'shadow-blue-200' },
        cyan:   { bg: 'bg-gradient-to-br from-cyan-500 to-sky-600', border: 'border-cyan-400', shadow: 'shadow-cyan-200' },
        fuchsia:{ bg: 'bg-gradient-to-br from-fuchsia-500 to-purple-600', border: 'border-fuchsia-400', shadow: 'shadow-fuchsia-200' },
    };
    const s = styles[colorTheme] || styles['indigo'];
    return (
        <button onClick={() => onClick(section)} style={{ animationDelay: delay }} className={`relative group rounded-[2.5rem] border-t-2 border-l-2 ${s.border} ${s.bg} shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex flex-col justify-between p-6 overflow-hidden opacity-0 animate-slide-up fill-mode-forwards ${className}`}>
            <div className="absolute -bottom-6 -right-6 text-9xl opacity-10 transform rotate-12 group-hover:rotate-0 transition-all duration-500 pointer-events-none">{icon}</div>
            <div className="relative z-10 flex justify-between items-start w-full">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl border border-white/20">{icon}</div>
                {progress !== undefined && <div className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center bg-black/20 text-[10px] font-black text-white">{progress}%</div>}
            </div>
            <div className="relative z-10 text-left mt-auto">
                <h3 className="font-black text-xl md:text-2xl text-white leading-tight font-game">{title}</h3>
                <p className="text-[10px] uppercase font-bold opacity-80 text-white">{subtitle}</p>
            </div>
        </button>
    );
});

const StrategyCorner = () => {
    const [tipIndex, setTipIndex] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setTipIndex(prev => (prev + 1) % STRATEGY_TIPS.length), 10000);
        return () => clearInterval(interval);
    }, []);
    const current = STRATEGY_TIPS[tipIndex];
    return (
        <div className="col-span-1 md:col-span-2 bg-slate-900 text-white rounded-[2.5rem] p-6 border-4 border-slate-800 relative overflow-hidden animate-slide-up" style={{animationDelay: '0.4s'}}>
            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">💡</div>
            <div className="relative z-10">
                <span className="bg-indigo-500 text-white px-2 py-1 rounded text-[9px] font-black uppercase mb-3 inline-block">Strategy Corner • {current.pillar}</span>
                <h4 className="text-lg font-black font-game mb-2 text-indigo-300">"{current.tip}"</h4>
                <p className="text-xs font-medium text-slate-400 italic">EXAM HACK: {current.hack}</p>
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ onChangeSection, dailyWord, stats, coachBrief, setCoachBrief, onCollectDailyWord }) => {
  const [showCoachPopup, setShowCoachPopup] = useState(false);
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);

  useEffect(() => {
    if (!coachBrief) {
        generateCoachingBrief(stats).then(setCoachBrief).catch(console.error);
    }
    // Simulate daily quest refresh if not in stats
    if (!stats.currentQuests || stats.currentQuests.length === 0) {
        const shuffled = [...QUEST_POOL].sort(() => 0.5 - Math.random());
        const picked = shuffled.slice(0, 3).map((q, i) => ({ ...q, id: `q-${i}`, completed: false }));
        setActiveQuests(picked);
    } else {
        setActiveQuests(stats.currentQuests);
    }
  }, [coachBrief, stats]);

  return (
    <div className="max-w-7xl mx-auto pb-20 pt-4 px-2 md:px-4 animate-app-fade-in">
        <div className="relative z-50 bg-gradient-to-br from-indigo-600 to-purple-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl text-white border-4 border-indigo-400 mb-8">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="bg-white/10 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10">Personal Dashboard</div>
                        <button onClick={() => setShowCoachPopup(!showCoachPopup)} className="relative w-12 h-12 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg border-2 border-white/30 transition-transform hover:scale-110">
                            <span className="text-2xl">{stats.avatar}</span>
                            {showCoachPopup && coachBrief && (
                                <div className="absolute top-14 left-0 w-[280px] bg-slate-900 rounded-3xl p-6 shadow-2xl border border-white/20 animate-scale-in z-[100]">
                                    <h4 className="font-black text-fuchsia-400 mb-2">Coach Intel:</h4>
                                    <p className="text-sm font-medium leading-relaxed italic text-white">"{coachBrief.insight}"</p>
                                    <button onClick={(e) => {e.stopPropagation(); setShowCoachPopup(false);}} className="mt-4 w-full bg-fuchsia-500 py-2 rounded-xl text-[10px] font-black uppercase">Close</button>
                                </div>
                            )}
                        </button>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black font-game tracking-tight">Study Hub</h1>
                    <p className="text-indigo-200 font-bold text-lg mt-2">Quest Log: {activeQuests.filter(q => q.completed).length}/3 Cleared</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-black/20 px-6 py-4 rounded-2xl flex flex-col items-center">
                        <span className="text-2xl mb-1">🔥</span><span className="font-black text-xl">{stats.streak}</span>
                    </div>
                    <div className="bg-black/20 px-6 py-4 rounded-2xl flex flex-col items-center">
                        <span className="text-2xl mb-1">⚡</span><span className="font-black text-xl">{stats.xp}</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 auto-rows-[minmax(180px,auto)] mb-6">
            <div className="col-span-1 md:col-span-2 row-span-2 min-h-[380px] bg-gradient-to-br from-violet-600 to-indigo-800 rounded-[2.5rem] p-8 relative overflow-hidden text-left flex flex-col justify-between animate-slide-up shadow-2xl border-t-2 border-l-2 border-violet-400">
                {dailyWord && (
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8"><span className="bg-black/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase text-white">Daily Loot</span><span className="text-5xl animate-bounce">💎</span></div>
                        <h2 className="text-5xl md:text-7xl font-black text-white font-game tracking-tight leading-none mb-4">{dailyWord.word}</h2>
                        <p className="text-indigo-100 font-medium text-lg leading-relaxed border-l-4 border-fuchsia-400 pl-4 italic">"{dailyWord.definition}"</p>
                        <button onClick={() => onCollectDailyWord(dailyWord.word)} className="mt-8 bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95">Collect Loot →</button>
                    </div>
                )}
            </div>
            
            <div className="col-span-1 md:col-span-2 row-span-1 bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 shadow-xl border border-slate-100 dark:border-slate-700 animate-slide-up" style={{animationDelay: '0.1s'}}>
                 <h3 className="font-black text-slate-400 text-xs uppercase tracking-widest mb-4 flex items-center gap-2"><span>🛡️</span> Daily Quests</h3>
                 <div className="space-y-3">
                    {activeQuests.map((q, i) => (
                        <div key={q.id} onClick={() => onChangeSection(q.type)} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all border border-transparent hover:border-indigo-200">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${q.completed ? 'bg-green-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>{q.completed ? '✓' : i+1}</div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-black text-sm text-slate-800 dark:text-white truncate">{q.title}</h4>
                                <p className="text-[10px] font-medium text-slate-500 truncate">{q.description}</p>
                            </div>
                            <span className="text-[10px] font-black text-indigo-500">+{q.xp} XP</span>
                        </div>
                    ))}
                 </div>
            </div>

            <BentoItem onClick={onChangeSection} section={AppSection.SPEAKING} colorTheme="rose" icon="🎙️" title="Speaking" subtitle="Voice Dojo" className="col-span-1" delay="0.2s" />
            <BentoItem onClick={onChangeSection} section={AppSection.DRILL} colorTheme="amber" icon="🪖" title="Drills" subtitle="Exam Muscle" className="col-span-1" delay="0.2s" />
            <StrategyCorner />
            <BentoItem onClick={onChangeSection} section={AppSection.GRAMMAR} colorTheme="blue" icon="🧩" title="Grammar" subtitle="Mechanics" progress={Math.round(((stats.grammarProgress?.length || 0) / 60) * 100)} className="col-span-1" delay="0.3s" />
            <BentoItem onClick={onChangeSection} section={AppSection.VOCABULARY} colorTheme="emerald" icon="🧠" title="Vocab" subtitle="Word Bank" progress={Math.round(((stats.vocabProgress?.length || 0) / 60) * 100)} className="col-span-1" delay="0.3s" />
            <BentoItem onClick={onChangeSection} section={AppSection.LISTENING} colorTheme="cyan" icon="📻" title="Listening" subtitle="Exam Ears" className="col-span-1" delay="0.4s" />
            <BentoItem onClick={onChangeSection} section={AppSection.ESSAY_TUTOR} colorTheme="pink" icon="📝" title="Writing" subtitle="Ink Station" className="col-span-1" delay="0.4s" />
        </div>
    </div>
  );
};

export default Dashboard;
