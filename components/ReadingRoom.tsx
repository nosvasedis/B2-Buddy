
import React, { useState, useMemo, useRef } from 'react';
import { generateReadingExercise, analyzeStudentPerformance, analyzeMistakePattern } from '../services/geminiService';
import { ReadingExercise, UserStats } from '../types';
import { playSound } from '../services/soundService';
import MarkdownRenderer from './MarkdownRenderer';

interface ReadingRoomProps {
    stats: UserStats;
    onUpdateStats: (stats: UserStats) => void;
}

// Reusable Cloud Status Component
const StatusBadge = ({ isCached, onPurge }: { isCached: boolean, onPurge: () => void }) => {
    if (isCached) {
        return (
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/20">
                <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-green-200 shadow-sm">
                    <span>☁️</span> Synced
                </span>
                <button onClick={(e) => { e.stopPropagation(); onPurge(); }} className="text-white hover:text-red-200 transition-colors p-1" title="Purge & Regenerate">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        );
    }
    return null;
};

const ReadingRoom: React.FC<ReadingRoomProps> = ({ stats, onUpdateStats }) => {
    const [topic, setTopic] = useState('');
    const [exercise, setExercise] = useState<ReadingExercise | null>(null);
    const [loading, setLoading] = useState(false);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0);
    const [activeEvidence, setActiveEvidence] = useState<string | null>(null);
    const [isFocusMode, setIsFocusMode] = useState(false);
    
    const carouselRef = useRef<HTMLDivElement>(null);

    const topics = [
        "Future of Travel", "Teenage Hobbies", "Eco Heroes", "School Mystery", "Tech in Class",
        "Space Tourism", "Extreme Sports", "Digital Privacy", "Urban Farming", "The 4-Day Week",
        "Music Festivals", "Mental Health", "AI in Art", "Ocean Cleanup", "Smart Homes",
        "Fashion Trends", "Career Skills", "Gaming Culture", "Volunteer Work", "Global Food"
    ];

    const handleGenerate = async (selectedTopic: string, forceNew: boolean = false) => {
        setTopic(selectedTopic);
        setExercise(null);
        setAnswers({});
        setShowResults(false);
        setActiveEvidence(null);
        
        if (stats.soundEnabled) playSound('click');

        // 1. Check Cache
        if (!forceNew && stats.readingCache && stats.readingCache[selectedTopic]) {
            setExercise(stats.readingCache[selectedTopic]);
            if (stats.soundEnabled) playSound('pop');
            return;
        }

        setLoading(true);
        try {
            const ex = await generateReadingExercise(selectedTopic);
            // VALIDATION: Ensure structure is correct
            if (ex && ex.text && Array.isArray(ex.questions) && ex.questions.length > 0) {
                setExercise(ex);
                
                // Save to Cache
                const newStats = { ...stats };
                if (!newStats.readingCache) newStats.readingCache = {};
                newStats.readingCache[selectedTopic] = ex;
                onUpdateStats(newStats);

                if (stats.soundEnabled) playSound('pop');
            } else {
                throw new Error("Invalid structure");
            }
        } catch (e) {
            console.error(e);
            alert("Reading generation failed. The book was lost in transit! Try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = () => {
        if (!topic) return;
        
        // Clear Cache for this topic
        const newStats = { ...stats };
        if (newStats.readingCache) {
            delete newStats.readingCache[topic];
            onUpdateStats(newStats);
        }
        
        handleGenerate(topic, true);
    }

    const checkAnswers = async () => {
        if (!exercise || !exercise.questions) return;
        
        let correct = 0;
        const mistakes: string[] = [];
        exercise.questions.forEach(q => {
            if (answers[q.id] === q.correctAnswer) {
                correct++;
            } else {
                mistakes.push(`Question: ${q.question}. Correct: ${q.correctAnswer}. Student: ${answers[q.id]}`);
            }
        });
        setScore(correct);
        setShowResults(true);

        if (stats.soundEnabled) playSound(correct === exercise.questions.length ? 'levelUp' : 'complete');

        const newStats = { ...stats };
        newStats.xp += (correct * 15);
        
        if (correct === exercise.questions.length) {
            newStats.learningProfile.strengths.push(`Reading: ${exercise.title}`);
        } else {
            const errorSummary = `Reading Task: ${exercise.title}. Score: ${correct}/${exercise.questions.length}. Mistakes: ${mistakes.join(' | ')}`;
            
            try {
                // Fix: Await analysis to prevent race conditions during updates
                const analysis = await analyzeStudentPerformance('Reading', errorSummary);
                const fetchedWeaknesses = Array.isArray(analysis?.weaknesses) ? analysis.weaknesses : [];
                newStats.learningProfile.weaknesses = [...new Set([...newStats.learningProfile.weaknesses, ...fetchedWeaknesses])];
            } catch (e) {
                console.warn("Performance analysis failed, proceeding with basic stats update", e);
            }
        }
        onUpdateStats(newStats);
    };

    const handleQuestionClick = (questionId: number) => {
        if (!showResults || !exercise || !exercise.questions) return;
        const q = exercise.questions.find(q => q.id === questionId);
        if (q && q.evidence) {
            setActiveEvidence(q.evidence);
            // On mobile, focus back to text
            if (window.innerWidth < 1024) setIsFocusMode(true);
        }
    };

    // Transform the text to highlight evidence
    const renderedText = useMemo(() => {
        if (!exercise) return "";
        if (!activeEvidence) return exercise.text;
        
        // Safe robust highlight logic (escapes regex chars and does case-insensitive match)
        try {
            const escapedEvidence = activeEvidence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escapedEvidence})`, 'gi');
            return exercise.text.replace(regex, (match) => `_${match}_`);
        } catch (e) {
            return exercise.text;
        }
    }, [exercise, activeEvidence]);

    return (
        <div className="max-w-7xl mx-auto min-h-full flex flex-col pt-2 pb-32 px-2 md:px-4">
             {/* HERO HEADER - TEAL THEME */}
             <div className="relative bg-gradient-to-br from-teal-500 to-cyan-600 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-teal-200 dark:shadow-none text-white overflow-hidden border-4 border-teal-400 animate-enter shrink-0 mb-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-500 opacity-20 rounded-full blur-3xl -ml-10 -mb-10"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10 mb-3 shadow-sm">
                            <span>📖</span> Comprehension
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black font-game tracking-tight drop-shadow-md">Reading Realm</h1>
                        <p className="text-teal-100 font-medium text-lg mt-1 max-w-xl">
                            Explore articles, stories, and reports.
                        </p>
                    </div>
                    
                    {exercise && (
                         <div className="flex gap-3 flex-wrap">
                             <StatusBadge 
                                isCached={!!(stats.readingCache && stats.readingCache[topic])}
                                onPurge={handleRegenerate}
                             />
                             <button 
                                onClick={() => setIsFocusMode(!isFocusMode)}
                                className="md:hidden bg-white/20 hover:bg-white/30 w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border border-white/20 text-white active:scale-90 transition-transform"
                             >
                                 {isFocusMode ? '🔽' : '🔍'}
                             </button>
                             
                             <button 
                                onClick={handleRegenerate}
                                className="bg-white/10 hover:bg-red-500/80 text-white border border-white/20 hover:border-red-400 px-4 py-2 rounded-xl font-bold shadow-sm active:scale-95 transition-all text-xs md:text-sm flex items-center gap-2"
                             >
                                 <span>↻</span> New Story
                             </button>

                             <button 
                                onClick={() => setExercise(null)}
                                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-xl font-bold shadow-sm active:scale-95 transition-all text-xs md:text-sm"
                             >
                                 Exit Library
                             </button>
                         </div>
                    )}
                </div>
             </div>

             {!exercise && !loading && (
                 <div className="flex flex-col items-center w-full max-w-5xl mx-auto animate-slide-up opacity-0" style={{animationFillMode: 'forwards'}}>
                     <div className="w-full bg-teal-50/50 dark:bg-teal-900/20 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] shadow-xl border-4 border-teal-100 dark:border-teal-800 text-center mb-8 relative overflow-hidden group">
                         <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/paper.png')] opacity-50 dark:opacity-10"></div>
                         <div className="relative z-10">
                            <h2 className="text-3xl md:text-4xl font-black text-teal-900 dark:text-teal-100 mb-6 font-serif italic">"What story shall we uncover today?"</h2>
                            
                            <div className="flex flex-col md:flex-row gap-2 max-w-lg mx-auto bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-lg border-2 border-teal-200 dark:border-teal-700 focus-within:border-cyan-400 dark:focus-within:border-cyan-600 transition-colors">
                                <input 
                                    type="text" 
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="Type a topic..."
                                    className="flex-1 p-3 bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-none placeholder-slate-300 dark:placeholder-slate-500 text-center md:text-left"
                                />
                                <button 
                                    onClick={() => handleGenerate(topic)}
                                    disabled={!topic}
                                    className="bg-cyan-500 text-white px-6 py-3 rounded-xl font-black hover:bg-cyan-600 transition-all shadow-md disabled:opacity-50 w-full md:w-auto"
                                >
                                    READ
                                </button>
                            </div>
                         </div>
                     </div>

                     <div className="w-full relative group/carousel">
                        <div ref={carouselRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 px-2 scroll-smooth touch-pan-x">
                            {topics.map((t, i) => {
                                const isCached = stats.readingCache && !!stats.readingCache[t];
                                return (
                                    <button 
                                        key={t}
                                        onClick={() => handleGenerate(t)}
                                        className={`
                                            bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-md hover:shadow-xl transition-all text-left group h-48 w-40 flex-shrink-0 flex flex-col justify-between active:scale-95 relative overflow-hidden snap-start border-b-4
                                            ${isCached ? 'border-green-400' : 'border-teal-200 dark:border-slate-700'}
                                        `}
                                    >
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-teal-100 to-transparent rounded-bl-full opacity-50 dark:from-slate-700"></div>
                                        <div className="flex justify-between items-start w-full relative z-10">
                                            <div className="bg-teal-50 dark:bg-teal-900/30 w-10 h-10 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform shadow-sm">📖</div>
                                            {isCached && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-md font-bold border border-green-200">SYNCED</span>}
                                        </div>
                                        <div className="relative z-10">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Book #{i+1}</span>
                                            <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-snug line-clamp-3">{t}</h3>
                                        </div>
                                        <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                                            <div className="h-full bg-teal-400 w-0 group-hover:w-full transition-all duration-500"></div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                     </div>
                 </div>
             )}

             {loading && (
                 <div className="flex flex-col items-center justify-center h-[60vh]">
                     <div className="relative w-32 h-32 mb-6">
                        <div className="absolute inset-0 bg-teal-100 rounded-full animate-ping opacity-20"></div>
                        <div className="relative bg-white dark:bg-slate-800 p-6 rounded-full shadow-xl border-4 border-teal-100 dark:border-slate-700 z-10">
                             <span className="text-5xl animate-bounce block">📜</span>
                        </div>
                     </div>
                     <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Printing Press...</h2>
                     <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Generating Text</p>
                 </div>
             )}

             {exercise && exercise.questions && (
                 <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-140px)] lg:overflow-hidden relative animate-slide-up opacity-0" style={{animationFillMode: 'forwards'}}>
                     
                     <div className={`
                        flex-1 bg-[#fdfbf7] dark:bg-[#1c1917] rounded-[2rem] shadow-2xl border border-stone-200 dark:border-stone-800 relative overflow-hidden flex flex-col transition-all duration-500
                        ${isFocusMode ? 'fixed inset-0 z-50 m-0 rounded-none pt-safe' : ''}
                        lg:h-full
                        ${isFocusMode ? 'h-[100vh]' : 'min-h-[500px]'}
                     `}>
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] opacity-30 pointer-events-none dark:opacity-10"></div>

                        <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar font-serif text-lg md:text-xl leading-loose text-slate-800 dark:text-slate-200 relative z-10 h-full">
                             <h2 className="font-black text-2xl md:text-3xl mb-6 text-stone-800 dark:text-stone-200 font-sans">{exercise.title}</h2>
                             <div className="prose prose-lg max-w-none dark:prose-invert">
                                <MarkdownRenderer content={renderedText} themeColor="teal" />
                             </div>
                        </div>
                        
                        {isFocusMode && (
                            <button 
                                onClick={() => setIsFocusMode(false)}
                                className="absolute top-4 right-4 bg-black/10 hover:bg-black/20 p-2 rounded-full z-50 backdrop-blur-md dark:bg-white/10 dark:hover:bg-white/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                     </div>

                     <div className="lg:w-1/3 flex flex-col gap-4 lg:overflow-hidden h-auto lg:h-full">
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center sticky top-0 z-20">
                            <h3 className="font-black text-lg text-slate-700 dark:text-white flex items-center gap-2">
                                <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-xs">TASK</span>
                                Questions
                            </h3>
                            <div className="text-xs font-bold text-slate-400">
                                {Object.keys(answers).length}/{exercise.questions.length} Answered
                            </div>
                        </div>

                        <div className="flex-1 lg:overflow-y-auto custom-scrollbar space-y-4 pr-2 pb-4">
                            {exercise.questions.map((q, i) => (
                                <div 
                                    key={q.id} 
                                    className={`bg-white dark:bg-slate-800 p-5 rounded-[1.5rem] border-2 transition-all cursor-pointer
                                        ${activeEvidence === q.evidence ? 'border-teal-400 ring-4 ring-teal-50 dark:ring-teal-900/20' : 'border-slate-100 dark:border-slate-700'}
                                        ${showResults ? (answers[q.id] === q.correctAnswer ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800' : 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800') : 'hover:border-teal-200 dark:hover:border-teal-800'}
                                    `}
                                    onClick={() => handleQuestionClick(q.id)}
                                >
                                    <div className="flex gap-3 mb-3">
                                        <span className="text-xs font-black text-slate-300 mt-1">0{i+1}</span>
                                        <p className="font-bold text-sm leading-snug text-slate-700 dark:text-slate-200">{q.question}</p>
                                    </div>

                                    <div className="space-y-2 pl-6">
                                        {q.options.map(opt => {
                                            const isSelected = answers[q.id] === opt;
                                            let style = "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 border-transparent";
                                            
                                            if (showResults) {
                                                if (opt === q.correctAnswer) style = "bg-green-500 text-white shadow-md";
                                                else if (isSelected) style = "bg-red-500 text-white shadow-md opacity-70";
                                            } else if (isSelected) {
                                                style = "bg-teal-500 text-white shadow-md scale-[1.02]";
                                            }

                                            return (
                                                <button
                                                    key={opt}
                                                    disabled={showResults}
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        if(stats.soundEnabled) playSound('click'); 
                                                        setAnswers(prev => ({...prev, [q.id]: opt})); 
                                                    }}
                                                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all border ${style}`}
                                                >
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {showResults && q.evidence && (
                                        <p className="mt-4 text-[10px] font-black uppercase text-teal-600 dark:text-teal-400 flex items-center gap-1">
                                            <span>🔍</span> Click to show proof
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-4 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-700">
                            {!showResults ? (
                                <button 
                                    onClick={checkAnswers}
                                    disabled={Object.keys(answers).length < exercise.questions.length}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all disabled:opacity-50 active:scale-95 dark:bg-white dark:text-slate-900"
                                >
                                    Check Answers
                                </button>
                            ) : (
                                <div className="text-center">
                                    <p className="font-black text-slate-400 text-xs uppercase tracking-widest mb-2">Result</p>
                                    <div className="text-4xl font-black text-slate-800 dark:text-white mb-4">
                                        {score} / {exercise.questions.length}
                                    </div>
                                    <button 
                                        onClick={() => setExercise(null)}
                                        className="w-full py-4 bg-teal-500 text-white rounded-2xl font-black shadow-xl hover:bg-teal-600 transition-all active:scale-95"
                                    >
                                        Pick Another Book
                                    </button>
                                </div>
                            )}
                        </div>
                     </div>
                 </div>
             )}
        </div>
    );
};

export default ReadingRoom;
