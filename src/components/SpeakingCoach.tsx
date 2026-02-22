
import React, { useState, useEffect, useRef } from 'react';
import { evaluateSpeakingSession, generateSpeakingAssets } from '../services/openRouterService';
import { getExaminerFollowUp } from '../data/speakingPrompts';
import MarkdownRenderer from './MarkdownRenderer';
import { UserStats, SpeakingScore } from '../types';
import { playSound } from '../services/soundService';

interface SpeakingCoachProps {
    onSessionComplete: () => void;
    onUpdateStats: (stats: UserStats) => void;
    stats: UserStats;
}

type ExamPart = 'PART1' | 'PART2' | 'PART3' | 'PART4';
type SessionState = 'MENU' | 'LOADING_ASSETS' | 'READY_TO_START' | 'EXAM_LIVE' | 'GENERATING_REPORT' | 'REPORT';

const EXAM_RUBRIC = {
    PART1: { title: "Part 1: The Interview", duration: 120, desc: "Personal info and opinions." },
    PART2: { title: "Part 2: Long Turn", duration: 60, desc: "Comparing two photos." },
    PART3: { title: "Part 3: Collaborative Task", duration: 120, desc: "Problem-solving with partner." },
    PART4: { title: "Part 4: Discussion", duration: 120, desc: "Deep questions about the topic." }
};

const PulsingOrb = ({ active, color = "indigo" }: { active: boolean, color?: string }) => {
    return (
        <div className={`relative flex items-center justify-center w-40 h-40`}>
            <div className={`absolute inset-0 rounded-full bg-${color}-500 opacity-20 blur-2xl transition-all duration-700 ${active ? 'scale-150 animate-pulse' : 'scale-100'}`}></div>
            <div className={`w-24 h-24 rounded-full bg-${color}-600 border-4 border-white/30 shadow-2xl flex items-center justify-center relative z-10 overflow-hidden`}>
                <div className={`absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent ${active ? 'animate-shimmer' : ''}`}></div>
                <span className="text-4xl">{active ? '🗣️' : '🤫'}</span>
            </div>
        </div>
    );
};

const SpeakingCoach: React.FC<SpeakingCoachProps> = ({ onSessionComplete, onUpdateStats, stats }) => {
    const [state, setState] = useState<SessionState>('MENU');
    const [activePart, setActivePart] = useState<ExamPart>('PART1');
    const [assets, setAssets] = useState<any>(null);
    const [transcript, setTranscript] = useState("");
    const [report, setReport] = useState<{ report: string, score: SpeakingScore } | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isExaminerSpeaking, setIsExaminerSpeaking] = useState(false);

    // Refs for audio and live session
    const audioContextRef = useRef<AudioContext | null>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const transcriptRef = useRef("");
    const nextStartTimeRef = useRef(0);
    const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const examinerTurnIndexRef = useRef(0);

    useEffect(() => {
        return () => stopAll();
    }, []);

    const stopAll = () => {
        /* Fix: Updated session closing logic to handle promise-based session as per guidelines */
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(s => s.close());
            sessionPromiseRef.current = null;
        }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
        activeSourcesRef.current.forEach(s => s.stop());
        activeSourcesRef.current.clear();
    };

    const handleSelectPart = async (part: ExamPart) => {
        if (stats.soundEnabled) playSound('click');
        setActivePart(part);
        setState('LOADING_ASSETS');
        try {
            const data = await generateSpeakingAssets(part);
            setAssets(data);
            setState('READY_TO_START');
        } catch (e) {
            alert("Failed to prepare exam room.");
            setState('MENU');
        }
    };

    const startTest = async () => {
        setState('EXAM_LIVE');
        setTimeLeft(EXAM_RUBRIC[activePart].duration);
        transcriptRef.current = "";
        setTranscript("");
        examinerTurnIndexRef.current = 0;

        const greeting = `Hello! I am your examiner today for the B2 First Speaking test, ${activePart}. Are you ready to begin?`;
        speakText(greeting);
    };

    const speakText = (text: string) => {
        setIsExaminerSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(text);

        // Try to find a high-quality Google voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
            voices.find(v => v.lang.startsWith('en'));

        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.rate = 0.9; // Slightly slower for clarity

        utterance.onend = () => {
            setIsExaminerSpeaking(false);
            startListening(); // Auto-start listening after examiner speaks
        };

        window.speechSynthesis.speak(utterance);

        transcriptRef.current += `\nExaminer: ${text}`;
        setTranscript(transcriptRef.current);
    };

    const startListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-GB';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
            const studentSpeech = event.results[0][0].transcript;
            transcriptRef.current += `\nCandidate: ${studentSpeech}`;
            setTranscript(transcriptRef.current);

            const response = getExaminerFollowUp(activePart, examinerTurnIndexRef.current);
            examinerTurnIndexRef.current += 1;
            speakText(response);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech Recognition Error:", event.error);
        };

        recognition.start();
    };

    const getExaminerResponse = async (input: string) => {
        // Deprecated: Logic moved to handle directly in recognition.onresult
        return "";
    };

    const finishExam = async () => {
        window.speechSynthesis.cancel();
        if (stats.soundEnabled) playSound('complete');
        setState('GENERATING_REPORT');
        try {
            const result = await evaluateSpeakingSession(transcriptRef.current, activePart);
            setReport(result);
            setState('REPORT');

            const newStats = { ...stats };
            newStats.xp += 200;
            newStats.speakingSessionsCompleted++;
            onUpdateStats(newStats);
        } catch (e) {
            alert("Report failed. Returning to menu.");
            setState('MENU');
        }
    };

    if (state === 'MENU') {
        return (
            <div className="max-w-6xl mx-auto p-4 pt-10 animate-fade-in pb-32">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-800 rounded-[3rem] p-10 shadow-2xl text-white mb-12 border-4 border-indigo-400/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="relative z-10">
                        <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">Official B2 First Training</span>
                        <h1 className="text-5xl font-black font-game mb-4">Exam Center</h1>
                        <p className="text-indigo-100 text-lg max-w-xl">Simulate the real Cambridge Speaking examination with analytical feedback.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(EXAM_RUBRIC).map(([key, item]) => (
                        <button key={key} onClick={() => handleSelectPart(key as ExamPart)} className="group relative overflow-hidden bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-700 shadow-xl hover:border-indigo-400 transition-all text-left">
                            <div className="flex justify-between mb-4">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-4xl shadow-sm group-hover:scale-110 transition-transform">
                                    {key === 'PART1' ? '👋' : key === 'PART2' ? '📸' : key === 'PART3' ? '🧠' : '💬'}
                                </div>
                                <span className="font-mono text-slate-300 text-6xl opacity-20 font-black">0{key.slice(-1)}</span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">{item.title}</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">{item.desc}</p>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (state === 'LOADING_ASSETS') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center animate-pulse pt-32">
                <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">PREPARING TEST MATERIALS...</h2>
            </div>
        );
    }

    if (state === 'READY_TO_START') {
        return (
            <div className="max-w-2xl mx-auto pt-20 animate-scale-in px-4">
                <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 text-center shadow-2xl border border-slate-100 dark:border-slate-700">
                    <div className="text-6xl mb-6">🎙️</div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-4">Ready, {stats.name}?</h2>
                    <p className="text-slate-500 mb-8 text-lg italic">"Please find a quiet place and put on your headphones. The examiner is waiting."</p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={() => setState('MENU')} className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                        <button onClick={startTest} className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-xl hover:scale-105 active:scale-95 transition-all">ENTER ROOM</button>
                    </div>
                </div>
            </div>
        );
    }

    if (state === 'EXAM_LIVE') {
        return (
            <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden">
                {/* HUD */}
                <div className="p-6 flex justify-between items-center bg-slate-900 border-b border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-white font-mono font-bold tracking-widest uppercase text-sm">Session Recording</span>
                    </div>
                    <div className="bg-white/10 px-4 py-2 rounded-full font-mono font-black text-white text-xl border border-white/20">
                        {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                    </div>
                </div>

                {/* VISUAL STAGE */}
                <div className="flex-1 relative flex flex-col items-center justify-center p-8">
                    {/* Examiner Side */}
                    <div className="mb-12 flex flex-col items-center">
                        <PulsingOrb active={isExaminerSpeaking} />
                        <p className="mt-4 text-white/50 font-black uppercase tracking-widest text-xs">Examiner</p>
                    </div>

                    {/* Task Visuals */}
                    <div className="w-full max-w-5xl bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>

                        <div className="relative z-10 h-full flex flex-col items-center">
                            {activePart === 'PART2' && assets?.images && (
                                <div className="w-full flex gap-4 md:gap-8 justify-center">
                                    {assets.images.map((img: string, i: number) => (
                                        <div key={i} className="flex-1 aspect-square rounded-2xl overflow-hidden border-4 border-white/20 shadow-xl transform transition-transform hover:scale-[1.02]">
                                            <img src={img} className="w-full h-full object-cover" alt="Task" />
                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-1 rounded-full text-white font-black text-xs">Photo {i + 1}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activePart === 'PART3' && assets?.points && (
                                <div className="w-full max-w-3xl flex flex-col items-center gap-12 py-10">
                                    <div className="bg-indigo-600 px-8 py-6 rounded-3xl border-4 border-indigo-400 text-center shadow-2xl">
                                        <h3 className="text-white font-black text-xl uppercase tracking-wide leading-tight">{assets.centralQuestion || "Collaborative Task"}</h3>
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-4">
                                        {assets.points.map((p: string, i: number) => (
                                            <div key={i} className="bg-white/10 border border-white/20 px-6 py-3 rounded-2xl text-white font-bold animate-enter" style={{ animationDelay: `${i * 0.1}s` }}>{p}</div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activePart === 'PART2' && (
                                <div className="mt-8 text-center max-w-xl">
                                    <h3 className="text-cyan-400 font-black text-2xl mb-2 drop-shadow-md">"{assets.question}"</h3>
                                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest italic">Address the question while comparing.</p>
                                </div>
                            )}

                            {(activePart === 'PART1' || activePart === 'PART4') && (
                                <div className="text-center py-20 opacity-30">
                                    <span className="text-9xl mb-8 block">💬</span>
                                    <p className="text-white font-black text-2xl uppercase tracking-widest">{activePart === 'PART1' ? 'Face-to-Face Interview' : 'Detailed Discussion'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* CANDIDATE CONTROLS */}
                <div className="p-8 bg-slate-900 border-t border-white/10 flex justify-center">
                    <button onClick={finishExam} className="bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white px-10 py-4 rounded-2xl font-black text-lg transition-all border border-red-500/30 flex items-center gap-3 active:scale-95">
                        <span className="text-2xl">🛑</span> STOP EXAM
                    </button>
                </div>
            </div>
        );
    }

    if (state === 'GENERATING_REPORT') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center pt-32">
                <div className="w-24 h-24 bg-indigo-500 rounded-full animate-ping opacity-20 absolute"></div>
                <div className="relative text-7xl mb-8">🎓</div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Examiner is Writing Report...</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Analyzing Grammar, Lexis, and Fluency</p>
            </div>
        );
    }

    if (state === 'REPORT' && report) {
        const s = report.score;
        return (
            <div className="max-w-5xl mx-auto p-4 pt-10 animate-slide-up pb-40">
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800">

                    {/* CERTIFICATE HEADER */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-12 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-5xl shadow-xl border border-slate-100 dark:border-slate-700">📜</div>
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 dark:text-white font-game">Statement of Results</h1>
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm mt-1">Cambridge English: B2 First Speaking Assessment</p>
                            </div>
                        </div>
                        <div className={`px-10 py-5 rounded-[2rem] text-white font-black text-3xl shadow-xl shadow-indigo-200 dark:shadow-none
                            ${s.status === 'DISTINCTION' ? 'bg-amber-500 shadow-amber-200' : s.status === 'FAIL' ? 'bg-red-500 shadow-red-200' : 'bg-green-600 shadow-green-200'}
                        `}>
                            {s.status}
                        </div>
                    </div>

                    <div className="p-8 md:p-12">
                        {/* SCORE GRID */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
                            {[
                                { label: 'Grammar', val: s.grammarResource, icon: '📐' },
                                { label: 'Vocabulary', val: s.lexicalResource, icon: '🧠' },
                                { label: 'Fluency', val: s.discourseManagement, icon: '⏳' },
                                { label: 'Accent', val: s.pronunciation, icon: '🗣️' },
                                { label: 'Interact', val: s.interactiveCommunication, icon: '🤝' },
                            ].map(item => (
                                <div key={item.label} className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 text-center">
                                    <span className="text-3xl mb-2 block">{item.icon}</span>
                                    <div className="text-2xl font-black text-slate-900 dark:text-white">{item.val}/5</div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 mt-1">{item.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* ANALYTICAL FEEDBACK */}
                        <div className="bg-indigo-50 dark:bg-indigo-900/10 p-8 md:p-12 rounded-[2.5rem] border-2 border-indigo-100 dark:border-indigo-800 relative overflow-hidden mb-12">
                            <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl font-black">EXAM LOG</div>
                            <div className="prose prose-lg max-w-none dark:prose-invert">
                                <MarkdownRenderer content={report.report} themeColor="indigo" />
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4">
                            <button onClick={() => setState('MENU')} className="flex-1 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xl shadow-xl hover:scale-[1.02] transition-all">EXIT CENTER</button>
                            <button onClick={() => handleSelectPart(activePart)} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-xl hover:scale-[1.02] transition-all">RE-TAKE PART</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default SpeakingCoach;
