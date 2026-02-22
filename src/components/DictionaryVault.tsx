
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { UserStats, VocabItem, Exercise } from '../types';
import { lookupWord, DictionaryResult, generateReviewQuiz, checkExerciseAnswer } from '../services/openRouterService';
import { lookupWordLocal } from '../services/dictionaryService';
import { playSound } from '../services/soundService';

interface DictionaryVaultProps {
    stats: UserStats;
    onUpdateStats: (stats: UserStats) => void;
    onAddVocabItem: (item: VocabItem, xpBonus?: number, strengthTag?: string) => void;
    onDeleteVocabItem: (word: string) => void;
    initialSearchTerm?: string | null;
    onClearInitialSearch?: () => void;
}

type LevelFilter = 'ALL' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

interface FeedbackResult {
    isCorrect: boolean;
    feedback: string;
    correction?: string;
}

const getLocalDate = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

const DictionaryVault: React.FC<DictionaryVaultProps> = ({ stats, onUpdateStats, onAddVocabItem, onDeleteVocabItem, initialSearchTerm, onClearInitialSearch }) => {
    const [activeTab, setActiveTab] = useState<'SEARCH' | 'VAULT' | 'REVIEW'>('SEARCH');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<DictionaryResult | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [collected, setCollected] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [inventoryFilter, setInventoryFilter] = useState<LevelFilter>('ALL');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [wordToDelete, setWordToDelete] = useState<string | null>(null);
    const [reviewExercises, setReviewExercises] = useState<Exercise[]>([]);
    const [reviewAnswers, setReviewAnswers] = useState<Record<number, string>>({});
    const [reviewFeedback, setReviewFeedback] = useState<Record<number, FeedbackResult>>({});
    const [checkingReviewId, setCheckingReviewId] = useState<number | null>(null);
    const [reviewLoading, setReviewLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const aiCacheRef = useRef<Map<string, DictionaryResult>>(new Map());

    const lookupWordWithFallback = async (term: string): Promise<DictionaryResult | null> => {
        const key = term.toLowerCase().trim();
        const local = lookupWordLocal(term);
        if (local) return local;
        const cached = aiCacheRef.current.get(key);
        if (cached) return cached;
        const aiResult = await lookupWord(term);
        if (aiResult) aiCacheRef.current.set(key, aiResult);
        return aiResult;
    };

    const wordsDue = useMemo(() => {
        const today = getLocalDate();
        return (stats.vocabItems || [])
            .filter(item => {
                const isDue = item.nextReview <= today;
                const isTargetLevel = ['B1', 'B2'].includes(item.cefr || '');
                return isDue && isTargetLevel;
            })
            .sort((a, b) => {
                if (a.streak !== b.streak) return a.streak - b.streak;
                return 0.5 - Math.random();
            });
    }, [stats.vocabItems]);

    useEffect(() => {
        if (initialSearchTerm) {
            setSearchTerm(initialSearchTerm);
            setActiveTab('SEARCH'); 
            const performAutoSequence = async () => {
                setLoading(true);
                setResult(null);
                setCollected(false);
                // Do not call setCollected(true) automatically for daily words.
                // We just look it up.
                const res = await lookupWordWithFallback(initialSearchTerm);
                if (res) {
                    setResult(res);
                    // Check if already in inventory
                    const existing = (stats.vocabItems || []).find(v => v.word.toLowerCase().trim() === initialSearchTerm.toLowerCase().trim());
                    if (existing) { setCollected(true); }
                }
                setLoading(false);
                if (onClearInitialSearch) onClearInitialSearch();
            };
            performAutoSequence();
        }
    }, [initialSearchTerm]);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchTerm.trim()) return;
        setLoading(true);
        setResult(null);
        setCollected(false);
        setShowConfetti(false);
        setShowToast(false);
        if (stats.soundEnabled) playSound('click');
        const cleanTerm = searchTerm.toLowerCase().trim();
        const existing = (stats.vocabItems || []).find(v => v.word.toLowerCase().trim() === cleanTerm);
        if (existing) setCollected(true);
        const res = await lookupWordWithFallback(searchTerm);
        if (res) { setResult(res); if(stats.soundEnabled) playSound('pop'); } else { alert("The spell failed. Could not find this word."); }
        setLoading(false);
    };

    const executeCollection = (wordResult: DictionaryResult) => {
        const isLegendary = ['C1', 'C2'].includes(wordResult.cefr);
        let xpGain = 0;
        if (wordResult.cefr === 'B2') xpGain = 20;
        if (isLegendary) xpGain = 50;
        if (stats.soundEnabled) { playSound(isLegendary ? 'levelUp' : 'success'); }
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        if (isLegendary) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4000); }
        const today = getLocalDate();
        const newItem: VocabItem = {
            word: wordResult.word,
            definition: wordResult.definition,
            nextReview: today,
            interval: 1,
            easeFactor: 2.5,
            streak: 0,
            cefr: wordResult.cefr,
            partOfSpeech: wordResult.partOfSpeech, // Save POS
            wordFamily: wordResult.wordFamily, // Save derivatives
            collectedAt: new Date().toISOString()
        };
        onAddVocabItem(newItem, xpGain, isLegendary ? "Advanced Vocabulary" : undefined);
        setCollected(true);
    }

    const collectWord = () => { if (!result || collected) return; executeCollection(result); };
    const confirmDelete = (e: React.MouseEvent, word: string) => { e.stopPropagation(); e.preventDefault(); if (stats.soundEnabled) playSound('click'); setWordToDelete(word); setShowDeleteModal(true); }
    const executeDelete = () => { if (wordToDelete) { onDeleteVocabItem(wordToDelete); if (stats.soundEnabled) playSound('pop'); } setShowDeleteModal(false); setWordToDelete(null); }
    const handlePlayAudio = (word: string) => { const utterance = new SpeechSynthesisUtterance(word); utterance.lang = 'en-GB'; window.speechSynthesis.speak(utterance); };
    
    const handleStartReview = async () => {
        if (wordsDue.length === 0) { alert("All gems are polished! No words due."); return; }
        setActiveTab('REVIEW');
        setReviewLoading(true);
        setReviewExercises([]);
        setReviewAnswers({});
        setReviewFeedback({});
        if(stats.soundEnabled) playSound('click');
        const BATCH_SIZE = 10;
        const sessionWords = wordsDue.slice(0, BATCH_SIZE);
        try {
            const exercises = await generateReviewQuiz(sessionWords);
            setReviewExercises(exercises);
            if(stats.soundEnabled) playSound('pop');
        } catch(e) { alert("Failed to prepare appraisal session."); setActiveTab('VAULT'); } finally { setReviewLoading(false); }
    }

    const handleCheckReviewAnswer = async (ex: Exercise) => {
        const answer = reviewAnswers[ex.id];
        if (!answer) return;
        setCheckingReviewId(ex.id);
        if(stats.soundEnabled) playSound('click');
        try {
            const resultJson = await checkExerciseAnswer(ex.question, answer, "Vocabulary Review", ex.correctAnswer, ex.options);
            const result = JSON.parse(resultJson as string) as FeedbackResult;
            setReviewFeedback(prev => ({ ...prev, [ex.id]: result }));
            if (result.isCorrect && stats.soundEnabled) playSound('success');
            if (!result.isCorrect && stats.soundEnabled) playSound('error');
            if (ex.correctAnswer) { updateSRS(ex.correctAnswer, result.isCorrect); }
        } catch (e) { console.error("Review check failed", e); } finally { setCheckingReviewId(null); }
    }

    const updateSRS = (wordStr: string, isCorrect: boolean) => {
        const newItems = [...(stats.vocabItems || [])];
        const itemIndex = newItems.findIndex(i => i.word.toLowerCase().trim() === wordStr.toLowerCase().trim());
        if (itemIndex > -1) {
            const item = { ...newItems[itemIndex] };
            if (isCorrect) { item.interval = Math.max(1, item.interval * 2); item.streak += 1; } else { item.interval = 1; item.streak = 0; }
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + item.interval);
            item.nextReview = nextDate.toISOString().split('T')[0];
            newItems[itemIndex] = item;
            const newStats = { ...stats, vocabItems: newItems };
            onUpdateStats(newStats);
        }
    }

    const getRarityConfig = (cefr: string) => {
        switch(cefr) {
            case 'C2': return { bg: 'from-amber-400 to-yellow-600', border: 'border-amber-400', text: 'Legendary', icon: '👑', shadow: 'shadow-amber-500/50' };
            case 'C1': return { bg: 'from-purple-500 to-fuchsia-600', border: 'border-purple-400', text: 'Epic', icon: '🔮', shadow: 'shadow-purple-500/50' };
            case 'B2': return { bg: 'from-cyan-400 to-blue-600', border: 'border-cyan-400', text: 'Rare', icon: '💎', shadow: 'shadow-cyan-500/50' };
            case 'B1': return { bg: 'from-emerald-400 to-green-600', border: 'border-emerald-400', text: 'Uncommon', icon: '🍀', shadow: 'shadow-emerald-500/50' };
            default: return { bg: 'from-slate-400 to-slate-600', border: 'border-slate-400', text: 'Common', icon: '⚒️', shadow: 'shadow-slate-500/50' };
        }
    };

    const filteredInventory = useMemo(() => {
        const items = [...(stats.vocabItems || [])].reverse(); 
        if (inventoryFilter === 'ALL') return items;
        if (inventoryFilter === 'BEGINNER') return items.filter(i => ['A1', 'A2'].includes(i.cefr || ''));
        if (inventoryFilter === 'INTERMEDIATE') return items.filter(i => ['B1', 'B2'].includes(i.cefr || ''));
        if (inventoryFilter === 'ADVANCED') return items.filter(i => ['C1', 'C2'].includes(i.cefr || ''));
        return items;
    }, [stats.vocabItems, inventoryFilter]);

    return (
        <div className="max-w-5xl mx-auto h-full flex flex-col pt-2 pb-24 md:pb-0 px-2 md:px-4 relative animate-fade-in overflow-hidden">
            
            {showDeleteModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-slate-900 border-2 border-red-500/30 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl relative overflow-hidden animate-scale-in">
                        <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-3xl mx-auto mb-4 border border-red-500/50">🗑️</div>
                            <h3 className="text-2xl font-black text-white mb-2">Discard Item?</h3>
                            <p className="text-slate-400 text-sm font-bold">Are you sure you want to delete <span className="text-white">"{wordToDelete}"</span>?</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 font-bold hover:bg-slate-700 transition-colors">Cancel</button>
                            <button onClick={executeDelete} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-black hover:bg-red-500 transition-colors shadow-lg">Confirm</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <div className="relative bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-fuchsia-200 dark:shadow-none text-white overflow-hidden border-4 border-fuchsia-400 animate-enter shrink-0 mb-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-500 opacity-20 rounded-full blur-3xl -ml-10 -mb-10"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10 mb-3 shadow-sm">
                            <span>📖</span> Vocabulary Engine
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black font-game tracking-tight drop-shadow-md flex gap-3">
                            <span>Word</span><span>Vault</span>
                        </h1>
                        <p className="text-fuchsia-100 font-medium text-lg mt-1 max-w-xl">Search definitions and manage your collection.</p>
                    </div>
                    
                    <div className="flex bg-black/20 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-white/10">
                        <button onClick={() => setActiveTab('SEARCH')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${activeTab === 'SEARCH' ? 'bg-white text-fuchsia-600 shadow-lg' : 'text-fuchsia-100 hover:bg-white/10'}`}>Search</button>
                        <button onClick={() => setActiveTab('VAULT')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${activeTab === 'VAULT' || activeTab === 'REVIEW' ? 'bg-white text-fuchsia-600 shadow-lg' : 'text-fuchsia-100 hover:bg-white/10'}`}>Inventory ({stats.vocabItems?.length || 0})</button>
                    </div>
                </div>
            </div>

            {activeTab === 'SEARCH' && (
                <div className="flex flex-col gap-6 animate-slide-up pb-24 w-full">
                    <form onSubmit={handleSearch} className="relative w-full max-w-2xl mx-auto group">
                        <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-400 to-purple-500 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                        <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border-4 border-fuchsia-100 dark:border-fuchsia-900 flex items-center p-2 transition-transform group-hover:scale-[1.01]">
                            <div className="pl-4 pr-2 md:pl-6 md:pr-4 text-2xl md:text-3xl animate-pulse">🔮</div>
                            <input ref={inputRef} type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Enter word to analyze..." className="flex-1 bg-transparent text-lg md:text-2xl font-bold text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 outline-none h-14 md:h-16 min-w-0" />
                            <button type="submit" disabled={loading} className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white rounded-2xl px-6 md:px-8 py-3 md:py-4 font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 text-xs md:text-sm shrink-0">{loading ? '...' : 'Go'}</button>
                        </div>
                    </form>
                    
                    {result && !loading && (
                        <div className="w-full max-w-4xl mx-auto animate-enter relative mt-4 px-1">
                            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative">
                                <div className={`w-full h-2 bg-gradient-to-r ${getRarityConfig(result.cefr).bg}`}></div>
                                
                                {/* HEAD: Definition & Audio */}
                                <div className="p-6 md:p-10 border-b border-slate-100 dark:border-slate-800 relative z-10 flex flex-col items-center text-center">
                                    <div className={`absolute top-6 right-6 inline-flex px-4 py-1.5 rounded-full shadow-sm border text-white font-black text-[10px] uppercase tracking-widest items-center gap-2 bg-gradient-to-r ${getRarityConfig(result.cefr).bg} ${getRarityConfig(result.cefr).border}`}>
                                        <span>{getRarityConfig(result.cefr).icon} {getRarityConfig(result.cefr).text}</span>
                                        <span className="bg-black/20 px-2 py-0.5 rounded text-[9px]">{result.cefr}</span>
                                    </div>
                                    <h1 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white mb-2 capitalize tracking-tight drop-shadow-sm mt-8 md:mt-4 break-words w-full leading-tight">
                                        {result.word} 
                                        <span className="text-lg md:text-2xl text-slate-400 font-serif font-medium ml-3 lowercase">({result.partOfSpeech || '?'})</span>
                                    </h1>
                                    <div className="flex flex-wrap justify-center items-center gap-4 mb-6">
                                        <span className="font-mono text-slate-400 text-sm md:text-lg bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-700">{result.phonetic || `/${result.word.toLowerCase()}/`}</span>
                                        <button onClick={() => handlePlayAudio(result.word)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 p-2 hover:bg-fuchsia-100 hover:text-fuchsia-600 transition-all shadow-sm text-slate-400">🔊</button>
                                    </div>
                                    <p className="text-lg md:text-2xl text-slate-600 dark:text-slate-300 font-serif italic leading-relaxed max-w-xl border-l-4 border-fuchsia-400 pl-4 md:pl-6 text-left md:text-center">"{result.definition}"</p>
                                    
                                    <button onClick={collectWord} disabled={collected} className={`mt-8 px-8 md:px-10 py-4 rounded-2xl font-black text-sm md:text-lg shadow-xl transition-all flex items-center gap-3 transform hover:-translate-y-1 active:translate-y-0 w-full md:w-auto justify-center ${collected ? 'bg-green-100 text-green-700 border-2 border-green-200 cursor-default' : `bg-gradient-to-b ${getRarityConfig(result.cefr).bg} text-white border-b-4 border-white/20 active:border-b-0`}`}>{collected ? (<><span>✓</span> In Inventory</>) : (<><span className="text-2xl">🎒</span> Collect Loot</>)}</button>
                                </div>

                                {/* BODY: Grid Layout for Detailed Data */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 bg-slate-50 dark:bg-slate-950/50">
                                    
                                    {/* LEFT: Morphology, Synonyms, Antonyms */}
                                    <div className="p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col gap-8">
                                        {/* Morphology / Word Family */}
                                        <div>
                                            <h3 className="text-xs font-black text-sky-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <span>🌱</span> Morphology (Family)
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {result.wordFamily?.length > 0 ? result.wordFamily.map((w, i) => (
                                                    <span key={i} className="bg-sky-100 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">
                                                        {w}
                                                    </span>
                                                )) : <span className="text-slate-400 text-sm italic">No derivatives found</span>}
                                            </div>
                                        </div>

                                        {/* Synonyms */}
                                        <div>
                                            <h3 className="text-xs font-black text-fuchsia-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <span>🔗</span> Synonyms
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {result.synonyms?.length > 0 ? result.synonyms.slice(0,6).map((s, i) => (
                                                    <span key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">
                                                        {s}
                                                    </span>
                                                )) : <span className="text-slate-400 text-sm italic">None found</span>}
                                            </div>
                                        </div>

                                        {/* Antonyms (Only if exist) */}
                                        {result.antonyms?.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <span>↔️</span> Antonyms
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {result.antonyms.slice(0,5).map((a, i) => (
                                                        <span key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm line-through decoration-orange-300">
                                                            {a}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* RIGHT: In Context */}
                                    <div className="p-6 md:p-8 bg-white/50 dark:bg-slate-900/30">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <span>💬</span> In Context
                                        </h3>
                                        <div className="space-y-4">
                                            {result.examples.length > 0 ? result.examples.slice(0,4).map((ex, i) => (
                                                <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-l-4 border-slate-300 dark:border-slate-600 shadow-sm text-base font-medium text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                                    "{ex}"
                                                </div>
                                            )) : <span className="text-slate-400 text-sm italic">No examples available.</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'VAULT' && (
                <div className="animate-slide-up pb-24 flex flex-col h-full w-full">
                    {wordsDue.length > 0 && (
                        <button onClick={handleStartReview} className="mb-6 w-full bg-gradient-to-br from-amber-500 to-yellow-600 rounded-[2.5rem] p-6 text-white shadow-xl shadow-amber-200 dark:shadow-none flex items-center justify-between hover:scale-[1.01] active:scale-95 transition-all border-4 border-amber-400 group relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
                            <div className="relative z-10 text-left">
                                <div className="flex items-center gap-2 mb-1"><span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">Weekend Warrior</span></div>
                                <h3 className="text-xl md:text-2xl font-black font-game">Polish Your Collection</h3>
                                <p className="text-amber-100 text-sm font-medium mt-1">{wordsDue.length} gems ready for appraisal.</p>
                            </div>
                            <div className="relative z-10 bg-white/20 p-3 rounded-2xl text-3xl group-hover:rotate-12 transition-transform backdrop-blur-sm border border-white/20">✨</div>
                        </button>
                    )}
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide w-full">
                        {[{ id: 'ALL', label: 'All Loot' }, { id: 'BEGINNER', label: 'Common (A1-A2)' }, { id: 'INTERMEDIATE', label: 'Uncommon (B1-B2)' }, { id: 'ADVANCED', label: 'Legendary (C1-C2)' }].map(f => (
                            <button key={f.id} onClick={() => setInventoryFilter(f.id as LevelFilter)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border-2 ${inventoryFilter === f.id ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-slate-800 dark:border-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>{f.label}</button>
                        ))}
                    </div>
                    {filteredInventory.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-50 min-h-[300px]">
                            <div className="text-6xl mb-4">🕸️</div>
                            <p className="font-black text-slate-400 uppercase tracking-widest">Empty Section</p>
                            <p className="text-sm text-slate-400 mt-2">Collect more words to fill this shelf.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar pr-2 pb-24 w-full">
                            {filteredInventory.map((item, i) => {
                                const rarity = getRarityConfig(item.cefr || 'B1');
                                const needsWater = item.nextReview <= getLocalDate() && ['B1', 'B2'].includes(item.cefr || '');
                                return (
                                    <div key={i} className={`bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border-2 hover:shadow-md transition-all group relative overflow-hidden flex flex-col ${needsWater ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-200 dark:ring-amber-900/50' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                                        <div className={`h-1.5 w-full bg-gradient-to-r ${rarity.bg}`}></div>
                                        <div className="p-5 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide text-white bg-gradient-to-r ${rarity.bg}`}>{item.cefr || '?'}</div>
                                                {needsWater && <span className="animate-pulse text-amber-500 text-xs" title="Needs Polishing">✨</span>}
                                                <button onClick={(e) => confirmDelete(e, item.word)} className="text-slate-300 hover:text-red-500 transition-colors z-20 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-90 ml-auto" title="Delete Word"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </div>
                                            <h3 className="font-black text-xl text-slate-800 dark:text-white mb-1 capitalize truncate break-words w-full">
                                                {item.word} <span className="text-xs text-slate-400 font-normal ml-1">({item.partOfSpeech || '?'})</span>
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed italic mb-4 flex-1 break-words">"{item.definition}"</p>
                                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                                <button onClick={() => handlePlayAudio(item.word)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full hover:bg-fuchsia-100 hover:text-fuchsia-600 transition-colors text-slate-400">🔊</button>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${rarity.text === 'Legendary' ? 'text-amber-500' : 'text-slate-300'}`}>{rarity.text}</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'REVIEW' && (
                <div className="animate-slide-up pb-24 h-full flex flex-col">
                    <button onClick={() => setActiveTab('VAULT')} className="mb-4 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600">← Exit Review</button>
                    {reviewLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-4"></div>
                            <p className="font-bold text-slate-500">Preparing Appraisal...</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {reviewExercises.length > 0 ? reviewExercises.map((ex, i) => {
                                const feedback = reviewFeedback[ex.id];
                                const isChecking = checkingReviewId === ex.id;
                                return (
                                    <div key={ex.id} className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-lg border-2 border-slate-100 dark:border-slate-800 mb-6 animate-scale-in" style={{animationDelay: `${i * 0.1}s`}}>
                                        <div className="flex justify-between mb-4"><span className="text-xs font-black uppercase tracking-wide text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-lg">Recall Task</span></div>
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">{ex.question}</h3>
                                        <div className="space-y-4">
                                            {ex.type === 'multiple_choice' ? (
                                                <div className="grid gap-2">
                                                    {ex.options?.map(opt => (
                                                        <button key={opt} onClick={() => { if (!feedback) { setReviewAnswers(prev => ({...prev, [ex.id]: opt})); } }} disabled={!!feedback} className={`p-4 rounded-xl border-2 text-left font-bold transition-all ${reviewAnswers[ex.id] === opt ? (feedback ? (feedback.isCorrect ? 'bg-green-100 border-green-400 text-green-800' : 'bg-red-100 border-red-400 text-red-800') : 'bg-amber-50 border-amber-400 text-amber-800') : 'bg-slate-50 border-transparent hover:bg-slate-100 text-slate-600'}`}>{opt}</button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <input type="text" value={reviewAnswers[ex.id] || ''} onChange={(e) => !feedback && setReviewAnswers(prev => ({...prev, [ex.id]: e.target.value}))} placeholder="Type your answer..." disabled={!!feedback} className={`w-full p-4 rounded-xl border-2 font-bold outline-none ${feedback ? (feedback.isCorrect ? 'border-green-400 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-800') : 'border-slate-200 focus:border-amber-400 bg-slate-50'}`} />
                                            )}
                                            {feedback && <div className={`p-4 rounded-xl text-sm font-medium ${feedback.isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{feedback.isCorrect ? 'Correct!' : feedback.feedback}</div>}
                                            {!feedback && <button onClick={() => handleCheckReviewAnswer(ex)} disabled={!reviewAnswers[ex.id] || isChecking} className="w-full py-3 rounded-xl bg-slate-900 text-white font-black shadow-lg active:scale-95 disabled:opacity-50 transition-all">{isChecking ? 'Checking...' : 'Check Memory'}</button>}
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-20 opacity-50"><p>All caught up! Come back tomorrow.</p></div>
                            )}
                            {reviewExercises.length > 0 && Object.keys(reviewFeedback).length === reviewExercises.length && (
                                <div className="text-center py-8 animate-bounce-in">
                                    <h3 className="text-2xl font-black text-amber-600 mb-2">Session Complete!</h3>
                                    <p className="text-slate-500 mb-6">Your items are now polished and secure.</p>
                                    <button onClick={() => setActiveTab('VAULT')} className="bg-amber-500 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-transform">Return to Vault</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DictionaryVault;
