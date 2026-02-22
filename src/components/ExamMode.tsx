
import React, { useState, useEffect, useCallback } from 'react';
import { UserStats } from '../types';
import { playSound } from '../services/soundService';
import { Timer, Trophy, ChevronRight, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface ExamModeProps {
    stats: UserStats;
    onUpdateStats: (stats: UserStats) => void;
    onExit: () => void;
}

const ExamMode: React.FC<ExamModeProps> = ({ stats, onUpdateStats, onExit }) => {
    const [phase, setPhase] = useState<'INTRO' | 'TEST' | 'RESULTS'>('INTRO');
    const [timeLeft, setTimeLeft] = useState(100 * 60); // 100 minutes
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [isPaused, setIsPaused] = useState(false);

    // Mock Questions for ECCE GVR (Grammar, Vocabulary, Reading)
    const MOCK_QUESTIONS = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        question: `Sample ECCE B2 Question ${i + 1}: Which of the following best completes the sentence? "If I ________ more time, I would have finished the project."`,
        options: ['had', 'had had', 'have', 'would have'],
        correct: 'had had'
    }));

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (phase === 'TEST' && timeLeft > 0 && !isPaused) {
            interval = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setPhase('RESULTS');
        }
        return () => clearInterval(interval);
    }, [phase, timeLeft, isPaused]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnswer = (option: string) => {
        setAnswers({ ...answers, [currentQuestion]: option });
        if (stats.soundEnabled) playSound('click');
        if (currentQuestion < MOCK_QUESTIONS.length - 1) {
            setCurrentQuestion(prev => prev + 1);
        } else {
            setPhase('RESULTS');
        }
    };

    const calculateScore = () => {
        let score = 0;
        MOCK_QUESTIONS.forEach((q, i) => {
            if (answers[i] === q.correct) score++;
        });
        return score;
    };

    if (phase === 'INTRO') {
        return (
            <div className="fixed inset-0 z-50 bg-slate-900 text-white flex items-center justify-center p-6 animate-enter">
                <div className="max-w-2xl w-full text-center space-y-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl rotate-3">
                        <Trophy size={48} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black font-game tracking-tight mb-4">Michigan ECCE Exam</h1>
                        <p className="text-slate-400 text-lg">Full-length B2 Mock Exam (GVR + Writing Simulation)</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-left">
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                            <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Duration</p>
                            <p className="font-bold">100 Minutes</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                            <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Section</p>
                            <p className="font-bold">GVR (100 Items)</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={onExit} className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 transition-all border border-white/10">Quit</button>
                        <button onClick={() => { setPhase('TEST'); if (stats.soundEnabled) playSound('click'); }} className="flex-1 py-4 bg-yellow-500 text-black rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-yellow-500/20">Start Exam</button>
                    </div>
                </div>
            </div>
        );
    }

    if (phase === 'RESULTS') {
        const score = calculateScore();
        const passed = score >= 65;
        return (
            <div className="fixed inset-0 z-50 bg-slate-900 text-white flex items-center justify-center p-6 animate-scale-in">
                <div className="max-w-2xl w-full bg-white/5 border border-white/10 p-12 rounded-[3rem] text-center space-y-8 relative overflow-hidden backdrop-blur-3xl">
                    <div className={`absolute top-0 left-0 w-full h-4 bg-gradient-to-r ${passed ? 'from-emerald-400 to-green-600' : 'from-red-400 to-rose-600'}`}></div>

                    <div>
                        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${passed ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                            {passed ? <CheckCircle2 size={40} /> : <XCircle size={40} />}
                        </div>
                        <h2 className="text-4xl font-black mb-2">{passed ? 'Congratulations!' : 'Keep Practicing!'}</h2>
                        <p className="text-slate-400 font-medium">You've completed the Michigan ECCE Mock Exam.</p>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="text-7xl font-black mb-1">{score}/100</div>
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Official Score</div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                            <p className="text-[10px] font-black text-slate-500 uppercase">Grammar</p>
                            <p className="font-bold text-yellow-500">B2 High</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                            <p className="text-[10px] font-black text-slate-500 uppercase">Vocab</p>
                            <p className="font-bold text-indigo-400">B2 Pass</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                            <p className="text-[10px] font-black text-slate-500 uppercase">Reading</p>
                            <p className="font-bold text-pink-400">B1+</p>
                        </div>
                    </div>

                    <button onClick={onExit} className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all">Back to Lounge</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col animate-enter">
            {/* Exam Header */}
            <div className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Trophy size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Michigan ECCE Mock</p>
                        <p className="font-bold text-slate-800 dark:text-white">GVR Section</p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2 text-rose-500 font-bold font-mono text-xl">
                            <Timer size={18} />
                            {formatTime(timeLeft)}
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Time remaining</p>
                    </div>
                    <button onClick={() => setIsPaused(!isPaused)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
                        {isPaused ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                    </button>
                </div>
            </div>

            {/* Test Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 md:p-12">
                <div className="max-w-3xl mx-auto space-y-12">
                    <div className="space-y-4">
                        <div className="inline-block px-3 py-1 rounded-lg bg-indigo-100 text-indigo-600 text-xs font-black uppercase tracking-widest">Question {currentQuestion + 1} of 100</div>
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-white leading-tight">
                            {MOCK_QUESTIONS[currentQuestion].question}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {MOCK_QUESTIONS[currentQuestion].options.map((opt, i) => (
                            <button
                                key={i}
                                onClick={() => handleAnswer(opt)}
                                className="group relative p-6 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl text-left hover:border-indigo-500 hover:shadow-xl transition-all active:scale-[0.98] overflow-hidden"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        {String.fromCharCode(65 + i)}
                                    </div>
                                    <span className="font-bold text-lg text-slate-700 dark:text-slate-300">{opt}</span>
                                </div>
                                <div className="absolute right-0 bottom-0 p-2 opacity-0 group-hover:opacity-10 transition-opacity">
                                    <ChevronRight size={48} className="text-indigo-500" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-slate-200 dark:bg-slate-800">
                <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${((currentQuestion + 1) / 100) * 100}%` }}
                ></div>
            </div>

            {/* Pause Overlay */}
            {isPaused && (
                <div className="fixed inset-0 z-[60] bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="text-center space-y-8">
                        <div className="text-8xl">☕</div>
                        <h3 className="text-4xl font-black dark:text-white leading-tight">Exam highlights are hidden while paused.<br />Relax, take a breath.</h3>
                        <button onClick={() => setIsPaused(false)} className="px-12 py-5 bg-indigo-500 text-white rounded-[2rem] font-black text-xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">Continue Exam</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamMode;
