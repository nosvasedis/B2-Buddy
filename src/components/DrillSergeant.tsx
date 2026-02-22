
import React, { useState, useEffect } from 'react';
import { UserStats, DrillQuestion } from '../types';
import { generateDrillExercises, validateDrillAnswer, analyzeStudentPerformance } from '../services/openRouterService';
import { playSound } from '../services/soundService';

interface DrillSergeantProps {
    stats: UserStats;
    onUpdateStats: (stats: UserStats) => void;
}

type DrillType = 'WORD_FORMATION' | 'KEY_WORD_TRANSFORMATION' | 'OPEN_CLOZE' | 'MULTIPLE_CHOICE_CLOZE';

const FRIENDLY_DRILL_NAMES: Record<DrillType, string> = {
    'WORD_FORMATION': 'Word Formation',
    'KEY_WORD_TRANSFORMATION': 'Key Word Transformations',
    'OPEN_CLOZE': 'Open Cloze',
    'MULTIPLE_CHOICE_CLOZE': 'Multiple Choice Cloze'
};

// Reusable Cloud Status Component
const StatusBadge = ({ isCached, onPurge }: { isCached: boolean, onPurge: () => void }) => {
    if (isCached) {
        return (
            <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 px-3 py-1 rounded-full">
                <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-green-200 shadow-sm">
                    <span>☁️</span> Synced
                </span>
                <button onClick={(e) => { e.stopPropagation(); onPurge(); }} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Purge & Regenerate">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        );
    }
    return null;
};

const DrillSergeant: React.FC<DrillSergeantProps> = ({ stats, onUpdateStats }) => {
    const [mode, setMode] = useState<'MENU' | 'GAME'>('MENU');
    const [drillType, setDrillType] = useState<DrillType>('WORD_FORMATION');
    const [questions, setQuestions] = useState<DrillQuestion[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [feedback, setFeedback] = useState<{isCorrect: boolean, message: string} | null>(null);
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const [score, setScore] = useState(0);
    const [drillMistakes, setDrillMistakes] = useState<string[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);

    const handleStart = async (type: DrillType, forceNew: boolean = false) => {
        if (stats.soundEnabled) playSound('click');
        setLoadError(null);
        setDrillType(type);
        setMode('GAME');
        setScore(0);
        setCurrentQIndex(0);
        setQuestions([]);
        setDrillMistakes([]);
        setFeedback(null);
        setUserAnswer('');

        // 1. Check Cache
        if (!forceNew && stats.drillCache && stats.drillCache[type] && stats.drillCache[type].length > 0) {
            setQuestions(stats.drillCache[type]);
            if (stats.soundEnabled) playSound('pop');
            return;
        }

        // 2. Generate Fresh
        setLoading(true);
        try {
            const qs = await generateDrillExercises(type);
            if (qs.length > 0) {
                setQuestions(qs);
                const newStats = { ...stats };
                if (!newStats.drillCache) newStats.drillCache = {};
                newStats.drillCache[type] = qs;
                onUpdateStats(newStats);
            } else {
                setLoadError("Drill Sergeant is on break. Try again.");
                setMode('MENU');
            }
        } catch (e) {
            console.error(e);
            const msg = e instanceof Error ? e.message : "Could not load drills. Try again.";
            setLoadError(msg);
            setMode('MENU');
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = () => {
        // Clear current type from cache
        const newStats = { ...stats };
        if (newStats.drillCache) {
            delete newStats.drillCache[drillType];
            onUpdateStats(newStats);
        }
        handleStart(drillType, true);
    }

    const checkAnswer = async (providedAnswer?: string) => {
        const answerToCheck = providedAnswer || userAnswer;
        if (!answerToCheck) return;
        
        setChecking(true);
        const currentQ = questions[currentQIndex];
        
        try {
            const result = await validateDrillAnswer(currentQ, answerToCheck);
            
            if (result.isCorrect) {
                setFeedback({ isCorrect: true, message: result.feedback });
                setScore(prev => prev + 1);
                if (stats.soundEnabled) playSound('success');
            } else {
                setFeedback({ isCorrect: false, message: result.feedback });
                setDrillMistakes(prev => [...prev, `Type: ${FRIENDLY_DRILL_NAMES[drillType]}. Question: ${currentQ.prompt}. Student Answer: ${answerToCheck}. Correct: ${currentQ.correctAnswer}`]);
                if (stats.soundEnabled) playSound('error');
            }
        } catch (e) {
            setFeedback({ isCorrect: false, message: "Error checking answer." });
        } finally {
            setChecking(false);
        }
    };

    const nextQuestion = () => {
        if (currentQIndex < questions.length - 1) {
            setCurrentQIndex(prev => prev + 1);
            setUserAnswer('');
            setFeedback(null);
        } else {
            // End Game
            finishDrill();
        }
    };

    const finishDrill = async () => {
        if (stats.soundEnabled) playSound('levelUp');
        
        const newStats = { ...stats };
        newStats.xp += (score * 10);
        if (score === questions.length) newStats.streak = Math.max(newStats.streak, 1);

        // AI INTEGRATION: Analyze Mistakes
        if (drillMistakes.length > 0) {
             const errorSummary = `Drill Session Mistakes: ${drillMistakes.join(' | ')}`;
             try {
                 // Basic analysis to update weaknesses
                 const analysis = await analyzeStudentPerformance('Grammar', errorSummary);
                 const fetchedWeaknesses = Array.isArray(analysis?.weaknesses) ? analysis.weaknesses : [];
                 newStats.learningProfile.weaknesses = [...new Set([...newStats.learningProfile.weaknesses, ...fetchedWeaknesses])];
                 // Add exact mistakes to recent history
                 newStats.learningProfile.recentMistakes = [...drillMistakes, ...newStats.learningProfile.recentMistakes].slice(0, 10);
             } catch (e) {
                 console.warn("Analysis failed", e);
             }
        } else {
            // Perfect score - Add Friendly Name
             const friendlyName = FRIENDLY_DRILL_NAMES[drillType];
             if (!newStats.learningProfile.strengths.includes(friendlyName)) {
                 newStats.learningProfile.strengths.push(friendlyName);
             }
        }

        onUpdateStats(newStats);
        setMode('MENU');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (feedback) nextQuestion();
            else checkAnswer();
        }
    };

    // Helper to render prompt with nice gap
    const renderPrompt = (prompt: string) => {
        // Split by multiple underscores (standardized from new prompts)
        const parts = prompt.split(/_+/);
        
        return (
            <span className="leading-relaxed">
                {parts.map((part, i, arr) => (
                    <React.Fragment key={i}>
                        {part}
                        {i < arr.length - 1 && (
                            <span className="inline-block w-24 border-b-4 border-slate-300 dark:border-slate-600 mx-2 h-6 align-middle bg-slate-50/50 dark:bg-slate-800/50 rounded-sm"></span>
                        )}
                    </React.Fragment>
                ))}
            </span>
        );
    };

    if (mode === 'MENU') {
        return (
            <div className="max-w-4xl mx-auto p-4 pt-8 animate-enter">
                <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-[2.5rem] p-10 shadow-2xl text-white border-4 border-orange-400 mb-8 relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse"></div>
                     <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10 mb-3">
                            <span>🪖</span> Hardcore Practice
                        </div>
                        <h1 className="text-5xl font-black font-game tracking-tight">Drill Sergeant</h1>
                        <p className="text-orange-100 font-medium text-lg mt-2 max-w-xl">
                            Fast-paced Use of English practice. No mercy.
                        </p>
                     </div>
                </div>

                {loadError && (
                    <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-2xl text-amber-800 dark:text-amber-200">
                        <p className="font-medium text-sm">{loadError}</p>
                        {loadError.includes('API key') && (
                            <p className="text-xs mt-2 opacity-80">Set VITE_OPENROUTER_API_KEY in your build environment (e.g. .env) and rebuild.</p>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                        { id: 'WORD_FORMATION', icon: '🏗️', label: 'Word Formation', desc: "Turn 'HAPPY' into 'HAPPINESS'." },
                        { id: 'KEY_WORD_TRANSFORMATION', icon: '🔑', label: 'Transformations', desc: "Rewrite sentences using a keyword." },
                        { id: 'OPEN_CLOZE', icon: '🧩', label: 'Open Cloze', desc: "Fill the gap with ONE word." },
                        { id: 'MULTIPLE_CHOICE_CLOZE', icon: '🔡', label: 'MC Cloze', desc: "Choose the best option." }
                    ].map((drill) => {
                        const isCached = stats.drillCache && !!stats.drillCache[drill.id];
                        return (
                            <button 
                                key={drill.id}
                                onClick={() => handleStart(drill.id as DrillType)}
                                className="group relative overflow-hidden bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border-2 border-slate-100 dark:border-slate-700 shadow-xl hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-2xl transition-all text-left"
                            >
                                <div className="absolute top-0 right-0 bg-orange-100 dark:bg-orange-900 w-32 h-32 rounded-full -mr-10 -mt-10 opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="text-4xl bg-orange-50 dark:bg-orange-900/30 w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm">{drill.icon}</div>
                                        {isCached && (
                                            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-green-200">
                                                <span>☁️</span> Synced
                                            </div>
                                        )}
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">{drill.label}</h2>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">{drill.desc}</p>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4 pt-8 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                 <div className="flex items-center gap-4 w-full md:w-auto">
                     <button onClick={() => setMode('MENU')} className="text-slate-400 font-bold hover:text-slate-600 dark:hover:text-slate-200">✕ QUIT</button>
                     <StatusBadge 
                        isCached={!!(stats.drillCache && stats.drillCache[drillType])} 
                        onPurge={handleRegenerate}
                     />
                 </div>
                 <div className="flex items-center gap-4 w-full md:w-auto">
                     <div className="bg-slate-200 dark:bg-slate-700 rounded-full h-3 w-full md:w-32">
                         <div className="bg-orange-500 h-3 rounded-full transition-all duration-500" style={{ width: `${((currentQIndex) / questions.length) * 100}%` }}></div>
                     </div>
                     <span className="font-black text-slate-800 dark:text-white">{currentQIndex + 1}/{questions.length}</span>
                 </div>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-20 h-20 border-4 border-orange-200 dark:border-orange-900 border-t-orange-500 rounded-full animate-spin mb-6"></div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white">PREPARING DRILL...</h2>
                </div>
            ) : questions.length > 0 ? (
                <div className="flex-1 flex flex-col animate-slide-up pb-40 overflow-y-auto custom-scrollbar px-1">
                    
                    {/* Drill Card - Main Container */}
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border-4 border-slate-100 dark:border-slate-700 p-8 md:p-12 relative flex flex-col transition-colors mb-8 min-h-[300px]">
                        
                        <div className="relative z-10 flex-1 flex flex-col">
                            {drillType === 'WORD_FORMATION' ? (
                                <div className="text-center">
                                    <p className="text-2xl md:text-3xl font-medium text-slate-700 dark:text-slate-200 mb-8 leading-relaxed">
                                        {renderPrompt(questions[currentQIndex].prompt)}
                                    </p>
                                    <div className="inline-block bg-slate-800 dark:bg-slate-950 text-white px-6 py-3 rounded-xl font-black text-xl tracking-widest shadow-lg mb-8 uppercase">
                                        {questions[currentQIndex].rootWord}
                                    </div>
                                </div>
                            ) : drillType === 'KEY_WORD_TRANSFORMATION' ? (
                                <div className="text-center space-y-6">
                                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-lg text-slate-600 dark:text-slate-300 font-medium">
                                        {questions[currentQIndex].prompt}
                                    </div>
                                    <div className="flex justify-center">
                                        <span className="bg-slate-800 dark:bg-white dark:text-slate-900 text-white px-6 py-2 rounded-xl font-black tracking-widest text-lg shadow-lg uppercase transform rotate-[-2deg]">
                                            {questions[currentQIndex].keyword}
                                        </span>
                                    </div>
                                    
                                    <div className="flex flex-col md:flex-row items-center justify-center gap-3 text-lg md:text-xl text-slate-700 dark:text-slate-200 font-medium bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-inner flex-wrap">
                                        <span className="text-right whitespace-nowrap">{questions[currentQIndex].startText || ''}</span>
                                        
                                        <input 
                                            type="text" 
                                            autoFocus
                                            value={userAnswer}
                                            onChange={(e) => !feedback && setUserAnswer(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                            placeholder="type answer..."
                                            disabled={!!feedback || checking}
                                            className={`min-w-[150px] p-2 text-center font-black bg-transparent border-b-4 outline-none transition-all flex-1
                                                ${feedback 
                                                    ? (feedback.isCorrect ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600') 
                                                    : 'border-orange-300 focus:border-orange-500 text-slate-800 dark:text-white'}
                                            `}
                                        />
                                        
                                        <span className="text-left whitespace-nowrap">{questions[currentQIndex].endText || ''}</span>
                                    </div>
                                </div>
                            ) : drillType === 'OPEN_CLOZE' ? (
                                <div className="text-center">
                                    <p className="text-2xl md:text-3xl font-medium text-slate-700 dark:text-slate-200 mb-8 leading-relaxed">
                                        {renderPrompt(questions[currentQIndex].prompt)}
                                    </p>
                                    <input 
                                        type="text" 
                                        autoFocus
                                        value={userAnswer}
                                        onChange={(e) => !feedback && setUserAnswer(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        placeholder="Type the missing word"
                                        disabled={!!feedback || checking}
                                        className={`w-full p-4 text-center text-2xl font-bold rounded-2xl border-2 outline-none transition-all
                                            ${feedback
                                                ? (feedback.isCorrect ? 'border-green-500 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'border-red-500 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100')
                                                : 'border-slate-200 dark:border-slate-600 focus:border-orange-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-white'}
                                        `}
                                    />
                                </div>
                            ) : (
                                <div className="text-center">
                                    <p className="text-2xl md:text-3xl font-medium text-slate-700 dark:text-slate-200 mb-8 leading-relaxed">
                                        {renderPrompt(questions[currentQIndex].prompt)}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {questions[currentQIndex].options?.map(opt => (
                                            <button
                                                key={opt}
                                                onClick={() => !feedback && !checking && checkAnswer(opt)}
                                                disabled={!!feedback || checking}
                                                className={`p-5 rounded-2xl border-2 font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-95 shadow-sm hover:shadow-md
                                                    ${feedback 
                                                        ? (opt === questions[currentQIndex].correctAnswer ? 'bg-green-500 text-white border-green-600' : userAnswer === opt ? 'bg-red-500 text-white border-red-600' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-50')
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-slate-700 dark:text-white'}
                                                `}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(drillType === 'WORD_FORMATION') && (
                                <input 
                                    type="text" 
                                    autoFocus
                                    value={userAnswer}
                                    onChange={(e) => !feedback && setUserAnswer(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder="Type answer..."
                                    disabled={!!feedback || checking}
                                    className={`w-full mt-8 p-4 text-center text-2xl font-bold rounded-2xl border-2 outline-none transition-all
                                        ${feedback
                                            ? (feedback.isCorrect ? 'border-green-500 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'border-red-500 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100')
                                            : 'border-slate-200 dark:border-slate-600 focus:border-orange-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-white'}
                                    `}
                                />
                            )}

                            {/* FEEDBACK BLOCK - NOW PART OF FLOW */}
                            {feedback && (
                                <div className="mt-8 animate-scale-in">
                                    <div className={`p-6 rounded-2xl border-2 shadow-lg ${feedback.isCorrect ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                                        <div className="text-center">
                                            <h3 className={`text-2xl font-black uppercase mb-2 ${feedback.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {feedback.isCorrect ? 'Spot On!' : 'Missed It!'}
                                            </h3>
                                            
                                            {!feedback.isCorrect && (
                                                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 inline-block mb-4 shadow-sm">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Correct Answer</p>
                                                    <p className="text-xl font-black text-slate-800 dark:text-white">{questions[currentQIndex].correctAnswer}</p>
                                                </div>
                                            )}

                                            <p className="text-slate-600 dark:text-slate-300 font-medium text-sm leading-relaxed max-w-md mx-auto">
                                                {feedback.message}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ACTION BUTTONS - ALWAYS VISIBLE AT BOTTOM OF FLOW */}
                    {drillType !== 'MULTIPLE_CHOICE_CLOZE' && (
                        <button 
                            onClick={feedback ? nextQuestion : () => checkAnswer()}
                            disabled={checking}
                            className={`w-full py-5 rounded-2xl font-black text-xl text-white shadow-xl transition-all active:scale-95 border-b-4 active:border-b-0 active:translate-y-1 flex items-center justify-center gap-2
                                ${feedback 
                                    ? 'bg-slate-800 border-slate-950 dark:bg-slate-700 dark:border-slate-900' 
                                    : 'bg-orange-500 border-orange-700 hover:bg-orange-600'}
                            `}
                        >
                            {checking ? (
                                <><span>checking...</span><span className="animate-spin">⏳</span></>
                            ) : feedback ? (currentQIndex < questions.length - 1 ? 'NEXT QUESTION' : 'FINISH DRILL') : 'CHECK'}
                        </button>
                    )}
                    {drillType === 'MULTIPLE_CHOICE_CLOZE' && feedback && (
                         <button 
                            onClick={nextQuestion}
                            className="w-full py-5 rounded-2xl font-black text-xl text-white shadow-xl transition-all active:scale-95 border-b-4 active:border-b-0 active:translate-y-1 bg-slate-800 border-slate-950 dark:bg-slate-700 dark:border-slate-900"
                        >
                            {currentQIndex < questions.length - 1 ? 'NEXT QUESTION' : 'FINISH DRILL'}
                        </button>
                    )}
                </div>
            ) : null}
        </div>
    );
};

export default DrillSergeant;
