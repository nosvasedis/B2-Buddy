
import React, { useState, useRef, useEffect } from 'react';
import { generateListeningExercise } from '../services/openRouterService';
import { AudioStorage } from '../services/audioStorage';
import { ListeningExercise, ListeningType, UserStats } from '../types';
import { playSound } from '../services/soundService';
import MarkdownRenderer from './MarkdownRenderer';

interface ListeningLoungeProps {
    stats: UserStats;
    onUpdateStats: (stats: UserStats) => void;
}

type GenerationStep = 'idle' | 'checking_cache' | 'scripting' | 'recording' | 'ready' | 'error';

const sessionAudioCache: Map<string, string> = new Map();

const LISTENING_MODES = [
    {
        id: 'PART1_MULTIPLE_CHOICE',
        title: 'The Shorts',
        watermark: '1',
        desc: '8 unrelated extracts. Social & Daily Life situations.',
        color: 'cyan',
        icon: '🎧'
    },
    {
        id: 'PART2_SENTENCES',
        title: 'Sentence Completion',
        watermark: '2',
        desc: 'Monologue. Listen and complete the notes.',
        color: 'sky',
        icon: '📝'
    },
    {
        id: 'PART3_MATCHING',
        title: 'Multiple Matching',
        watermark: '3',
        desc: '5 speakers. Match what they say to the statements.',
        color: 'blue',
        icon: '🧩'
    },
    {
        id: 'PART4_INTERVIEW',
        title: 'Long Interview',
        watermark: '4',
        desc: 'In-depth conversation. Detailed opinion questions.',
        color: 'indigo',
        icon: '🎙️'
    }
];

const B2_EXAM_TOPICS = [
    "Extreme Sports", "The History of Cinema", "Space Exploration",
    "Deep Sea Mysteries", "Future Fashion", "Wildlife Conservation",
    "Robotics", "Ancient History", "Music Psychology", "Sustainable Living",
    "Famous Expeditions", "Storytelling", "Food Culture", "Digital Nomads"
];

// --- SMART TRANSCRIPT VIEWER (ROBUST) ---
const TranscriptModal = ({
    isOpen,
    onClose,
    exercise,
    userAnswers
}: {
    isOpen: boolean,
    onClose: () => void,
    exercise: ListeningExercise | null,
    userAnswers: Record<number, string>
}) => {
    if (!isOpen || !exercise) return null;

    const renderHighlightedText = (text: string, evidence?: string) => {
        if (!text) return <span className="text-slate-400 italic block p-4 text-center">Script unavailable for this specific section.</span>;

        if (!evidence) return <span className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap text-base leading-relaxed">{text}</span>;

        try {
            const safeEvidence = evidence.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const flexiblePattern = safeEvidence.replace(/\s+/g, '[\\s\\n\\r]+');

            const parts = text.split(new RegExp(`(${flexiblePattern})`, 'gi'));

            if (parts.length === 1) {
                return <span className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap text-base leading-relaxed">{text}</span>;
            }

            return (
                <span className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap text-base leading-relaxed">
                    {parts.map((part, i) => {
                        const isMatch = new RegExp(`^${flexiblePattern}$`, 'i').test(part);
                        return isMatch
                            ? (
                                <span key={i} className="bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 px-1.5 rounded font-bold shadow-sm border-b-2 border-amber-400/50">
                                    {part}
                                </span>
                            )
                            : part
                    })}
                </span>
            );
        } catch (e) {
            return <span className="whitespace-pre-wrap text-base leading-relaxed">{text}</span>;
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 md:p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl border-4 border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-scale-in">

                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-2xl text-2xl border border-amber-200 dark:border-amber-700">
                            🕵️
                        </div>
                        <div>
                            <h3 className="font-black text-2xl text-slate-800 dark:text-white tracking-tight">
                                Evidence Board
                            </h3>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Review scripts & find proof</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors text-xl font-bold shadow-sm border border-slate-200 dark:border-slate-700">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-10 bg-slate-100/50 dark:bg-black/20">
                    {exercise.questions.map((q, i) => {
                        const isCorrect = userAnswers[q.id] === q.correctAnswer;
                        const userAnswer = userAnswers[q.id] || "No Answer";

                        let relevantScript = "";
                        let sourceLabel = "Full Transcript";

                        if (exercise.audioScriptParts && exercise.audioScriptParts[i]) {
                            relevantScript = exercise.audioScriptParts[i];
                            sourceLabel = "Clip Transcript";
                        } else if (exercise.script) {
                            relevantScript = exercise.script;
                        } else if (exercise.audioScriptParts && exercise.audioScriptParts.length > 0) {
                            relevantScript = exercise.audioScriptParts.join('\n\n');
                        }

                        return (
                            <div key={q.id} className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 md:p-8 shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden relative group">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b-2 border-slate-100 dark:border-slate-700 pb-6">
                                    <div className="flex-1">
                                        <span className="inline-block bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-2">Question {i + 1}</span>
                                        <h4 className="font-black text-slate-800 dark:text-white text-xl md:text-2xl leading-tight">{q.question}</h4>
                                    </div>
                                    <div className={`shrink-0 px-4 py-2 rounded-xl text-sm font-black uppercase border-2 shadow-sm ${isCorrect ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                        {isCorrect ? 'Correct' : 'Missed'}
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4 mb-8 text-sm">
                                    <div className={`flex-1 p-4 rounded-2xl border-l-8 shadow-sm ${isCorrect ? 'bg-green-50 border-green-400 dark:bg-green-900/10' : 'bg-red-50 border-red-400 dark:bg-red-900/10'}`}>
                                        <span className="block text-[10px] font-bold uppercase opacity-60 mb-1">You Answered</span>
                                        <span className="font-black text-slate-800 dark:text-white text-xl">{userAnswer}</span>
                                    </div>
                                    {!isCorrect && (
                                        <div className="flex-1 p-4 rounded-2xl border-l-8 border-green-400 bg-green-50 dark:bg-green-900/10 shadow-sm">
                                            <span className="block text-[10px] font-bold uppercase opacity-60 mb-1">Correct Answer</span>
                                            <span className="font-black text-slate-800 dark:text-white text-xl">{q.correctAnswer}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-950 p-6 md:p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-800 relative">
                                    <div className="absolute -top-3 left-6 bg-white dark:bg-slate-700 text-slate-800 dark:text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-md border border-slate-200 dark:border-slate-600 flex items-center gap-2">
                                        <span>📜</span> {sourceLabel}
                                    </div>
                                    <div className="font-serif text-lg leading-loose text-slate-600 dark:text-slate-400 mt-2">
                                        {renderHighlightedText(relevantScript, q.evidence)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- SUBTLE MATTE BUTTON (FOR PART 3) ---
const MiniPulseButton = ({
    isPlaying,
    onClick,
    audioRef
}: {
    isPlaying: boolean,
    onClick: () => void,
    audioRef: React.RefObject<HTMLAudioElement>
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const animationRef = useRef<number>(0);

    useEffect(() => {
        if (isPlaying && audioRef.current && canvasRef.current) {
            if (!audioCtxRef.current) {
                const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
                audioCtxRef.current = new AudioContextClass();
                analyserRef.current = audioCtxRef.current.createAnalyser();
                analyserRef.current.fftSize = 128;
                analyserRef.current.smoothingTimeConstant = 0.85;

                try {
                    sourceRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current);
                    sourceRef.current.connect(analyserRef.current);
                    analyserRef.current.connect(audioCtxRef.current.destination);
                } catch (e) {
                    // Already connected
                }
            }

            if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const analyser = analyserRef.current;
            const bufferLength = analyser!.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const draw = () => {
                animationRef.current = requestAnimationFrame(draw);
                analyser!.getByteFrequencyData(dataArray);

                ctx!.clearRect(0, 0, canvas.width, canvas.height);
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;

                const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
                const scale = 0.7 + (avg / 255) * 0.5; // Subtler scale

                const gradient = ctx!.createRadialGradient(centerX, centerY, 5, centerX, centerY, 35);
                gradient.addColorStop(0, 'rgba(14, 165, 233, 0.8)'); // Sky blue core
                gradient.addColorStop(0.6, 'rgba(14, 165, 233, 0.3)');
                gradient.addColorStop(1, 'rgba(14, 165, 233, 0)');

                ctx!.fillStyle = gradient;
                ctx!.beginPath();
                ctx!.arc(centerX, centerY, 30 * scale, 0, Math.PI * 2);
                ctx!.fill();

                // Simple Inner Ring
                ctx!.beginPath();
                ctx!.arc(centerX, centerY, 18 * scale, 0, Math.PI * 2);
                ctx!.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx!.lineWidth = 1.5;
                ctx!.stroke();
            };
            draw();
        } else {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        }
    }, [isPlaying]);

    return (
        <button
            onClick={onClick}
            className={`
                relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 overflow-visible group z-10
                ${isPlaying
                    ? 'scale-105'
                    : 'hover:scale-105'
                }
            `}
        >
            {/* Subtle Matte Container */}
            <div className={`
                absolute inset-0 rounded-full border
                backdrop-blur-sm transition-colors duration-300
                ${isPlaying
                    ? 'bg-sky-500/10 border-sky-500/30'
                    : 'bg-slate-200/50 dark:bg-slate-700/50 border-white/10'
                }
                shadow-sm
            `}></div>

            {/* Subtle Highlight (Reduced Opacity) */}
            <div className="absolute top-2 left-4 w-6 h-3 bg-white/20 rounded-full transform -rotate-45 pointer-events-none"></div>

            {/* Canvas Layer */}
            {isPlaying ? (
                <canvas ref={canvasRef} width={100} height={100} className="absolute inset-0 w-full h-full rounded-full" />
            ) : (
                <div className="relative z-10 w-10 h-10 rounded-full bg-slate-100/50 dark:bg-black/20 flex items-center justify-center backdrop-blur-md text-sky-500 dark:text-sky-400">
                    <span className="text-xl ml-0.5">▶</span>
                </div>
            )}

            {/* Stop Icon */}
            {isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="w-8 h-8 bg-sky-500/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-sky-500/30 transition-colors">
                        <div className="w-2.5 h-2.5 bg-sky-200 rounded-sm"></div>
                    </div>
                </div>
            )}
        </button>
    );
};

// --- SMART PLAYER (MIRRORED AURORA DOCK) ---
const SmartAudioPlayer = ({
    src,
    isPlaying,
    onPlayPause,
    transcript
}: {
    src: string | null,
    isPlaying: boolean,
    onPlayPause: () => void,
    transcript?: string
}) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [progress, setProgress] = useState(0);

    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const analyzerRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number>(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        const handleEnded = () => {
            onPlayPause();
            setProgress(100);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const useBrowserTTS = src === "browser-tts";

    // #region agent log
    useEffect(() => {
        fetch('http://127.0.0.1:7794/ingest/17e55a50-b873-46d7-b51c-70cd6b24c684',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a63de1'},body:JSON.stringify({sessionId:'a63de1',location:'ListeningLounge.tsx:SmartAudioPlayer-props',message:'Dock render',data:{src:src??'null',useBrowserTTS,transcriptLen:transcript?.length??0,isPlaying},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    }, [src, useBrowserTTS, transcript, isPlaying]);
    // #endregion

    useEffect(() => {
        const audio = audioRef.current;
        // #region agent log
        if (useBrowserTTS) {
            fetch('http://127.0.0.1:7794/ingest/17e55a50-b873-46d7-b51c-70cd6b24c684',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a63de1'},body:JSON.stringify({sessionId:'a63de1',location:'ListeningLounge.tsx:effect-branch',message:'Effect branch',data:{branch:'browser-tts',isPlaying,hasTranscript:!!(transcript?.trim())},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        } else if (!audio || !src) {
            fetch('http://127.0.0.1:7794/ingest/17e55a50-b873-46d7-b51c-70cd6b24c684',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a63de1'},body:JSON.stringify({sessionId:'a63de1',location:'ListeningLounge.tsx:effect-early-return',message:'Effect early return',data:{hasAudio:!!audio,src:src??'null'},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
        }
        // #endregion
        if (useBrowserTTS) {
            if (isPlaying) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(transcript || "No transcript available.");
                utterance.lang = "en-GB";
                const voices = window.speechSynthesis.getVoices();
                const en = voices.find(v => v.lang.startsWith("en"));
                if (en) utterance.voice = en;
                utterance.onend = () => onPlayPause();
                // #region agent log
                fetch('http://127.0.0.1:7794/ingest/17e55a50-b873-46d7-b51c-70cd6b24c684',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a63de1'},body:JSON.stringify({sessionId:'a63de1',location:'ListeningLounge.tsx:tts-speak',message:'TTS speak called',data:{voicesCount:voices.length},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
                // #endregion
                window.speechSynthesis.speak(utterance);
            } else {
                window.speechSynthesis.cancel();
            }
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            return;
        }
        if (!audio || !src) return;
        if (isPlaying) {
            const playPromise = audio.play();
            // #region agent log
            if (playPromise !== undefined) {
                playPromise.then(() => { fetch('http://127.0.0.1:7794/ingest/17e55a50-b873-46d7-b51c-70cd6b24c684',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a63de1'},body:JSON.stringify({sessionId:'a63de1',location:'ListeningLounge.tsx:audio-play-ok',message:'audio.play() resolved',data:{},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{}); initVisualizer(); }).catch(e => { fetch('http://127.0.0.1:7794/ingest/17e55a50-b873-46d7-b51c-70cd6b24c684',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a63de1'},body:JSON.stringify({sessionId:'a63de1',location:'ListeningLounge.tsx:audio-play-reject',message:'audio.play() rejected',data:{err:String(e?.message??e)},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{}); console.error("Auto-play prevented:", e); });
            }
            // #endregion
        } else {
            audio.pause();
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }
    }, [isPlaying, src, useBrowserTTS, transcript]);

    const handleRewind = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
        }
    };

    const initVisualizer = () => {
        if (!audioRef.current || !canvasRef.current) return;

        if (!audioContextRef.current) {
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            audioContextRef.current = new AudioContextClass();
            analyzerRef.current = audioContextRef.current.createAnalyser();
            analyzerRef.current.fftSize = 256;
            analyzerRef.current.smoothingTimeConstant = 0.8;

            sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
            sourceRef.current.connect(analyzerRef.current);
            analyzerRef.current.connect(audioContextRef.current.destination);
        }

        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        drawVisualizer();
    };

    const drawVisualizer = () => {
        if (!canvasRef.current || !analyzerRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyzerRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const render = () => {
            if (!isPlaying) return;
            animationFrameRef.current = requestAnimationFrame(render);
            analyzerRef.current!.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const centerY = canvas.height / 2;
            const usableLength = bufferLength * 0.6;
            const barWidth = (canvas.width / usableLength) * 2.5;
            let x = 0;

            const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            gradient.addColorStop(0, '#22d3ee');
            gradient.addColorStop(0.5, '#a78bfa');
            gradient.addColorStop(1, '#22d3ee');
            ctx.fillStyle = gradient;

            ctx.shadowBlur = 20;
            ctx.shadowColor = "rgba(34, 211, 238, 0.6)";

            ctx.beginPath();
            for (let i = 0; i < usableLength; i++) {
                const value = dataArray[i];
                const percent = value / 255;
                const height = (canvas.height * 0.8) * percent;

                const yTop = centerY - (height / 2);

                if (height > 2) {
                    ctx.roundRect(x, yTop, barWidth - 2, height, 10);
                } else {
                    ctx.fillRect(x, centerY - 1, barWidth - 2, 2);
                }

                x += barWidth;
            }
            ctx.fill();
        };
        render();
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        if (audioRef.current && audioRef.current.duration) {
            const time = (val / 100) * audioRef.current.duration;
            audioRef.current.currentTime = time;
            setProgress(val);
        }
    };

    return (
        <div className="fixed bottom-0 left-0 w-full z-[100] px-2 md:px-4 pb-4 pt-2 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-slate-950 dark:via-slate-950/90 pointer-events-none transition-all duration-300">
            <div className="max-w-3xl mx-auto pointer-events-auto">
                <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/90 border border-cyan-200 dark:border-cyan-900 shadow-[0_8px_32px_rgba(6,182,212,0.3)] rounded-3xl p-3 md:p-4 flex items-center gap-3 md:gap-4 relative overflow-hidden transition-all hover:scale-[1.01]">

                    <button
                        onClick={() => {
                            // #region agent log
                            fetch('http://127.0.0.1:7794/ingest/17e55a50-b873-46d7-b51c-70cd6b24c684',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a63de1'},body:JSON.stringify({sessionId:'a63de1',location:'ListeningLounge.tsx:play-click',message:'Play button clicked',data:{wasPlaying:isPlaying},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
                            // #endregion
                            onPlayPause();
                        }}
                        className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg transition-all transform active:scale-90 shrink-0 border-2 ${isPlaying ? 'bg-cyan-500 border-cyan-400 text-white shadow-cyan-500/40' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white'}`}
                    >
                        {isPlaying ? '⏸' : '▶'}
                    </button>

                    <div className="flex-1 h-10 md:h-12 relative flex items-center justify-center rounded-xl overflow-hidden bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/5">
                        <canvas ref={canvasRef} width={400} height={80} className="w-full h-full" />
                        {!isPlaying && <div className="absolute inset-0 flex items-center justify-center text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400/50">Audio Dock Ready</div>}
                    </div>

                    <button
                        onClick={handleRewind}
                        className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-2xl transition-colors active:scale-90 border border-transparent hover:border-cyan-200 dark:hover:border-cyan-800"
                        title="Rewind 10s"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg>
                    </button>

                    <div className="absolute bottom-0 left-0 h-1.5 bg-cyan-500 transition-all shadow-[0_0_10px_rgba(34,211,238,0.8)]" style={{ width: `${progress}%` }}></div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress}
                        onChange={handleSeek}
                        className="absolute bottom-0 left-0 w-full h-4 opacity-0 cursor-pointer z-20"
                    />
                </div>
            </div>
            <audio ref={audioRef} src={src && src !== "browser-tts" ? src : undefined} preload="auto" onError={(e) => console.error("Audio Error", e)} />
        </div>
    );
};

const ListeningLounge: React.FC<ListeningLoungeProps> = ({ stats, onUpdateStats }) => {
    const [type, setType] = useState<ListeningType | null>(null);
    const [exercise, setExercise] = useState<ListeningExercise | null>(null);
    const [generationStep, setGenerationStep] = useState<GenerationStep>('idle');
    const generationSessionRef = useRef<string>("");

    // Audio State
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Step State (Part 1 & 3)
    const [currentStep, setCurrentStep] = useState(0);
    const [stepAudioUrls, setStepAudioUrls] = useState<Record<number, string>>({});

    // Answers & Results
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0);
    const [showTranscript, setShowTranscript] = useState(false);

    // Part 3 specific refs
    const part3AudioRef = useRef<HTMLAudioElement>(null);

    // --- HELPERS ---
    const getSafeKey = (str: string) => str.replace(/[^a-zA-Z0-9-_]/g, '_');

    const getVoiceForText = (text: string) => {
        const lower = text.toLowerCase();
        if (lower.startsWith('man:') || lower.startsWith('speaker a:') || lower.includes('male voice')) return 'Zephyr';
        if (lower.startsWith('woman:') || lower.startsWith('speaker b:') || lower.includes('female voice')) return 'Kore';
        const femaleMarkers = (lower.match(/\b(she|her|hers|woman|lady|girl|mother|sister)\b/g) || []).length;
        const maleMarkers = (lower.match(/\b(he|his|him|man|guy|boy|father|brother)\b/g) || []).length;
        if (femaleMarkers > maleMarkers) return Math.random() > 0.5 ? 'Kore' : 'Puck';
        if (maleMarkers > femaleMarkers) return Math.random() > 0.5 ? 'Zephyr' : 'Fenrir';
        return Math.random() > 0.5 ? 'Puck' : 'Zephyr';
    }

    const handleStartSession = async (partType: ListeningType) => {
        const sessionId = Date.now().toString();
        generationSessionRef.current = sessionId;
        setType(partType);
        setGenerationStep('checking_cache');
        setExercise(null);
        setAudioUrl(null);
        setStepAudioUrls({});
        setCurrentStep(0);
        setShowResults(false);
        setUserAnswers({});
        setIsPlaying(false);

        if (stats.soundEnabled) playSound('click');

        const cached = stats.listeningCache ? stats.listeningCache[partType] : null;
        if (cached) {
            setExercise(cached);
            prepareAudio(cached, partType, sessionId);
        } else {
            const randomTopic = B2_EXAM_TOPICS[Math.floor(Math.random() * B2_EXAM_TOPICS.length)];
            generateFresh(partType, randomTopic, sessionId);
        }
    };

    const handleClearCache = () => {
        if (!type) return;
        if (stats.soundEnabled) playSound('pop');
        const newStats = { ...stats };
        if (newStats.listeningCache) {
            delete newStats.listeningCache[type];
        }
        onUpdateStats(newStats);
        setType(null);
        setExercise(null);
        setGenerationStep('idle');
        setIsPlaying(false);
    };

    const generateFresh = async (partType: ListeningType, currentTopic: string, sessionId: string) => {
        setGenerationStep('scripting');
        try {
            const ex = await generateListeningExercise(currentTopic, partType);
            if (generationSessionRef.current !== sessionId) return;
            if (!ex.weekId) ex.weekId = `${partType}_${Date.now()}`;

            const newStats = { ...stats };
            if (!newStats.listeningCache) newStats.listeningCache = {};
            newStats.listeningCache[partType] = ex;
            onUpdateStats(newStats);

            setExercise(ex);
            prepareAudio(ex, partType, sessionId);
        } catch (e) {
            if (generationSessionRef.current !== sessionId) return;
            setGenerationStep('error');
        }
    };

    const prepareAudio = async (ex: ListeningExercise, mode: ListeningType, sessionId: string) => {
        if (mode === 'PART1_MULTIPLE_CHOICE' || mode === 'PART3_MATCHING') {
            setGenerationStep('ready');
            const parts = ex.audioScriptParts ?? (ex.script ? [ex.script] : []);
            for (let i = 0; i < parts.length; i++) {
                await generateStepAudio(i, ex, sessionId);
            }
            if (parts.length === 0) {
                setStepAudioUrls(prev => ({ ...prev, 0: "browser-tts" }));
            }
            if (mode === 'PART3_MATCHING') {
                setAudioUrl("browser-tts");
            }
        } else {
            setGenerationStep('recording');
            generateFullAudio(ex, sessionId);
        }
    };

    const generateFullAudio = async (ex: ListeningExercise, sessionId: string) => {
        if (generationSessionRef.current !== sessionId) return;
        setAudioUrl("browser-tts");
        setGenerationStep('ready');
        if (stats.soundEnabled) playSound('success');
    };

    const generateStepAudio = async (index: number, ex: ListeningExercise, _sessionId: string) => {
        if (!ex.audioScriptParts || !ex.audioScriptParts[index]) return;
        setStepAudioUrls(prev => ({ ...prev, [index]: "browser-tts" }));
    };

    const handleCheckAnswers = () => {
        if (!exercise) return;
        let correct = 0;
        exercise.questions.forEach(q => {
            const userVal = userAnswers[q.id]?.trim().toLowerCase();
            const correctVal = q.correctAnswer.trim().toLowerCase();
            if (userVal === correctVal || (type === 'PART2_SENTENCES' && correctVal.includes(userVal) && userVal.length > 2)) {
                correct++;
            }
        });
        setScore(correct);
        setShowResults(true);
        if (stats.soundEnabled) playSound(correct === exercise.questions.length ? 'levelUp' : 'complete');

        const newStats = { ...stats };
        newStats.xp += (correct * 10);
        onUpdateStats(newStats);
    };

    const handleAudioEnded = () => {
        setIsPlaying(false);
    };

    const renderPart1 = () => {
        if (!exercise) return null;
        const q = exercise.questions[currentStep];
        const currentAudio = stepAudioUrls[currentStep];

        return (
            <div className="flex flex-col items-center w-full max-w-3xl mx-auto pb-48">
                <div className="flex items-center justify-between mb-8 mt-4 w-full px-2">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setGenerationStep('idle')} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl hover:bg-slate-200 transition-colors active:scale-90">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h2 className="font-black text-2xl text-slate-800 dark:text-white leading-none">The Shorts</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold border border-green-200">SYNCED</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 mb-8">
                    {exercise.questions.map((_, i) => (
                        <div
                            key={i}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentStep ? 'bg-cyan-500 scale-125' : i < currentStep ? 'bg-cyan-200' : 'bg-slate-200 dark:bg-slate-700'}`}
                        />
                    ))}
                </div>

                <div className="w-full bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 md:p-12 shadow-2xl border-2 border-white dark:border-slate-700 relative overflow-hidden animate-scale-in">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-100 dark:bg-cyan-900/30 rounded-bl-[3rem] -mr-4 -mt-4 opacity-50"></div>
                    <div className="relative z-10">
                        <span className="text-cyan-500 font-black uppercase tracking-widest text-xs mb-2 block">Question {currentStep + 1}</span>
                        <h3 className="font-serif text-2xl md:text-3xl text-slate-900 dark:text-white leading-tight mb-8">
                            {q.question}
                        </h3>

                        <div className="grid gap-3 md:gap-4">
                            {q.options?.map((opt, i) => {
                                const isSelected = userAnswers[q.id] === opt;
                                let style = "border-slate-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50 dark:hover:bg-slate-700";

                                if (showResults) {
                                    if (opt === q.correctAnswer) style = "bg-green-100 border-green-500 text-green-900 font-bold shadow-[0_0_15px_rgba(34,197,94,0.4)]";
                                    else if (isSelected) style = "bg-red-100 border-red-500 text-red-900 opacity-70";
                                } else if (isSelected) {
                                    style = "bg-cyan-600 border-cyan-600 text-white shadow-lg scale-[1.02]";
                                }

                                return (
                                    <button
                                        key={i}
                                        disabled={showResults}
                                        onClick={() => { if (stats.soundEnabled) playSound('click'); setUserAnswers(prev => ({ ...prev, [q.id]: opt })); }}
                                        className={`w-full text-left p-4 md:p-5 border-2 rounded-2xl transition-all flex items-center gap-4 group ${style}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-colors ${isSelected ? 'border-white text-white' : 'border-slate-300 text-slate-400'}`}>
                                            {String.fromCharCode(65 + i)}
                                        </div>
                                        <span className="font-medium text-lg leading-snug">{opt}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex justify-between w-full mt-8">
                    <button
                        onClick={() => { setCurrentStep(Math.max(0, currentStep - 1)); setIsPlaying(false); }}
                        disabled={currentStep === 0}
                        className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-slate-600 disabled:opacity-0 transition-all active:scale-95"
                    >
                        ← Previous
                    </button>

                    {currentStep < exercise.questions.length - 1 ? (
                        <button
                            onClick={() => {
                                const next = currentStep + 1;
                                setCurrentStep(next);
                                setIsPlaying(false);
                                if (stats.soundEnabled) playSound('click');
                                generateStepAudio(next, exercise, generationSessionRef.current);
                            }}
                            className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black hover:scale-105 transition-transform shadow-lg active:scale-95"
                        >
                            Next →
                        </button>
                    ) : !showResults && (
                        <button onClick={handleCheckAnswers} className="px-8 py-3 bg-cyan-500 text-white rounded-xl font-black hover:scale-105 transition-transform shadow-lg shadow-cyan-200 active:scale-95">
                            Finish & Check
                        </button>
                    )}
                </div>

                <TranscriptModal
                    isOpen={showTranscript}
                    onClose={() => setShowTranscript(false)}
                    exercise={exercise}
                    userAnswers={userAnswers}
                />
                <SmartAudioPlayer
                    src={currentAudio}
                    transcript={exercise?.audioScriptParts?.[currentStep] ?? exercise?.script ?? undefined}
                    isPlaying={isPlaying}
                    onPlayPause={() => setIsPlaying(!isPlaying)}
                />
            </div>
        );
    };

    const renderPart2 = () => {
        if (!exercise) return null;
        return (
            <div className="w-full max-w-4xl mx-auto pb-48">
                <div className="flex items-center justify-between mb-8 mt-4 px-2">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setGenerationStep('idle')} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl hover:bg-slate-200 transition-colors active:scale-90">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h2 className="font-black text-2xl text-slate-800 dark:text-white leading-none">Sentence Completion</h2>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-6 md:p-12 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sky-400 to-cyan-500"></div>
                    <div className="space-y-8">
                        {exercise.questions.map((q, i) => (
                            <div key={q.id} className="flex flex-col md:flex-row items-start gap-2 md:gap-4">
                                <span className="text-slate-300 font-black text-lg mt-1 min-w-[24px]">{String(i + 1).padStart(2, '0')}</span>
                                <div className="text-lg md:text-xl font-medium leading-relaxed text-slate-700 dark:text-slate-300 w-full">
                                    {q.question.split('[_______]').map((part, idx, arr) => (
                                        <React.Fragment key={idx}>
                                            {part}
                                            {idx < arr.length - 1 && (
                                                <span className="inline-block mx-2 relative">
                                                    <input
                                                        type="text"
                                                        disabled={showResults}
                                                        value={userAnswers[q.id] || ''}
                                                        onChange={(e) => setUserAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                        className={`w-40 md:w-48 bg-transparent border-b-2 outline-none text-center font-bold transition-all px-2 py-0.5
                                                            ${showResults
                                                                ? (userAnswers[q.id]?.toLowerCase().trim() === q.correctAnswer.toLowerCase() ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600 line-through')
                                                                : 'border-slate-300 focus:border-cyan-500 text-slate-900 dark:text-white'
                                                            }
                                                        `}
                                                    />
                                                    {showResults && userAnswers[q.id]?.toLowerCase().trim() !== q.correctAnswer.toLowerCase() && (
                                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-max text-center text-xs font-black text-white bg-green-500 px-2 py-1 rounded shadow-lg animate-bounce-in z-10">
                                                            {q.correctAnswer}
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-green-500"></div>
                                                        </div>
                                                    )}
                                                </span>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {!showResults && (
                    <button onClick={handleCheckAnswers} className="fixed bottom-32 right-6 md:right-10 px-8 py-4 bg-cyan-600 text-white rounded-full font-black shadow-xl hover:scale-105 transition-transform z-[50] flex items-center gap-2 active:scale-95">
                        <span>✓</span> Submit Answers
                    </button>
                )}
                <TranscriptModal
                    isOpen={showTranscript}
                    onClose={() => setShowTranscript(false)}
                    exercise={exercise}
                    userAnswers={userAnswers}
                />
                <SmartAudioPlayer src={audioUrl} transcript={exercise?.script ?? undefined} isPlaying={isPlaying} onPlayPause={() => setIsPlaying(!isPlaying)} />
            </div>
        );
    };

    const renderPart3 = () => {
        if (!exercise) return null;
        const options = exercise.questions[0].options || [];

        // Get list of currently selected values
        const getUsedOptions = (currentQId: number) => {
            return Object.entries(userAnswers)
                .filter(([qId, val]) => Number(qId) !== currentQId && val)
                .map(([, val]) => val);
        };

        return (
            <div className="w-full max-w-6xl mx-auto pb-32">
                <div className="flex items-center justify-between mb-8 mt-4 px-2">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setGenerationStep('idle')} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl hover:bg-slate-200 transition-colors active:scale-90">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h2 className="font-black text-2xl text-slate-800 dark:text-white leading-none">Multiple Matching</h2>
                            <div className="flex items-center gap-2 mt-1">
                                {stats.listeningCache?.[type!] && <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold border border-green-200">SYNCED</span>}
                            </div>
                        </div>
                    </div>
                    {stats.listeningCache?.[type!] && (
                        <button onClick={handleClearCache} className="group flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-all border border-red-100 dark:border-red-800 active:scale-95">
                            <span className="text-xs font-bold">Reset</span>
                        </button>
                    )}
                </div>

                <audio
                    ref={part3AudioRef}
                    src={stepAudioUrls[currentStep]}
                    onEnded={handleAudioEnded}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="flex flex-col gap-6 flex-1">
                        {exercise.questions.map((q, i) => {
                            const isActive = currentStep === i;
                            const usedOptions = getUsedOptions(q.id);

                            return (
                                <div key={q.id} className={`relative bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-lg border-4 transition-all duration-500 flex flex-col md:flex-row items-center gap-6 ${isActive ? 'border-sky-400 shadow-sky-200 dark:shadow-sky-900/20 scale-[1.02] z-10' : 'border-slate-100 dark:border-slate-700 opacity-90 hover:opacity-100'}`}>
                                    <div className="shrink-0">
                                        <MiniPulseButton
                                            isPlaying={isActive && isPlaying}
                                            audioRef={part3AudioRef}
                                            onClick={() => {
                                                if (isActive && isPlaying) {
                                                    part3AudioRef.current?.pause();
                                                } else if (isActive && !isPlaying) {
                                                    part3AudioRef.current?.play();
                                                } else {
                                                    setIsPlaying(false);
                                                    setCurrentStep(i);
                                                    if (stepAudioUrls[i]) {
                                                        setTimeout(() => part3AudioRef.current?.play(), 50);
                                                    } else {
                                                        generateStepAudio(i, exercise, generationSessionRef.current).then(() => {
                                                            setTimeout(() => part3AudioRef.current?.play(), 50);
                                                        });
                                                    }
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="flex-1 w-full text-center md:text-left">
                                        <h3 className="font-black text-2xl text-slate-800 dark:text-white mb-2">Speaker {i + 1}</h3>

                                        <div className="relative inline-block w-full md:w-auto">
                                            <select
                                                disabled={showResults}
                                                value={userAnswers[q.id] || ''}
                                                onChange={(e) => { if (stats.soundEnabled) playSound('click'); setUserAnswers(prev => ({ ...prev, [q.id]: e.target.value })) }}
                                                className={`appearance-none w-full md:w-48 py-3 pl-4 pr-10 rounded-2xl font-black text-xl outline-none cursor-pointer bg-slate-50 dark:bg-slate-900 border-2 transition-all shadow-inner
                                                    ${showResults
                                                        ? (userAnswers[q.id] === q.correctAnswer ? 'border-green-500 text-green-600 bg-green-50' : 'border-red-500 text-red-600 bg-red-50')
                                                        : 'border-slate-200 focus:border-sky-500 text-slate-700 dark:text-white'}
                                                `}
                                            >
                                                <option value="">Select...</option>
                                                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(opt => (
                                                    <option
                                                        key={opt}
                                                        value={opt}
                                                        disabled={usedOptions.includes(opt)}
                                                        className={usedOptions.includes(opt) ? "text-slate-300 bg-slate-100 dark:text-slate-600 dark:bg-slate-800" : ""}
                                                    >
                                                        Statement {opt} {usedOptions.includes(opt) ? '(Selected)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-sm">▼</div>
                                        </div>
                                    </div>

                                    {showResults && userAnswers[q.id] !== q.correctAnswer && (
                                        <div className="absolute top-4 right-4 text-[10px] font-black text-white bg-green-500 px-2 py-1 rounded shadow-sm animate-bounce-in pointer-events-none">
                                            Ans: {q.correctAnswer}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 flex-1 h-full backdrop-blur-sm">
                        <h3 className="font-black text-slate-400 uppercase tracking-widest mb-6 text-center text-sm">Statement Options</h3>
                        <div className="space-y-4">
                            {options.map((text, i) => {
                                const letter = String.fromCharCode(65 + i);
                                const isUsed = Object.values(userAnswers).includes(letter);

                                const cleanText = text.replace(/^[A-H][\.\)]\s*/i, '');

                                return (
                                    <div key={i} className={`flex gap-5 p-5 rounded-2xl border-2 transition-all bg-white dark:bg-slate-900 ${isUsed ? 'border-sky-200 dark:border-sky-900 opacity-50' : 'border-transparent shadow-sm hover:border-slate-200 dark:hover:border-slate-700 hover:scale-[1.01]'}`}>
                                        <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 flex items-center justify-center font-black text-2xl shrink-0 shadow-sm border border-sky-200 dark:border-sky-800">
                                            {letter}
                                        </div>
                                        <p className="font-bold text-lg text-slate-700 dark:text-slate-200 leading-snug pt-2">{cleanText}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {!showResults && (
                    <button onClick={handleCheckAnswers} className="fixed bottom-8 right-6 md:right-10 px-8 py-4 bg-sky-600 text-white rounded-full font-black shadow-2xl hover:scale-105 transition-transform z-[50] active:scale-95 text-lg flex items-center gap-2">
                        <span>✓</span> Check Matches
                    </button>
                )}

                <TranscriptModal
                    isOpen={showTranscript}
                    onClose={() => setShowTranscript(false)}
                    exercise={exercise}
                    userAnswers={userAnswers}
                />
            </div>
        );
    };

    const renderPart4 = () => {
        if (!exercise) return null;
        return (
            <div className="w-full max-w-3xl mx-auto pb-48">
                <div className="flex items-center justify-between mb-8 mt-4 px-2">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setGenerationStep('idle')} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl hover:bg-slate-200 transition-colors active:scale-90">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h2 className="font-black text-2xl text-slate-800 dark:text-white leading-none">Long Interview</h2>
                    </div>
                </div>

                <div className="space-y-8">
                    {exercise.questions.map((q, i) => (
                        <div key={q.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border-2 border-transparent hover:border-blue-100 dark:hover:border-blue-900 transition-colors">
                            <div className="flex gap-4 mb-6">
                                <span className="text-blue-200 font-black text-4xl leading-none">{i + 1}</span>
                                <p className="font-serif text-lg md:text-xl font-bold text-slate-800 dark:text-white leading-snug pt-2">{q.question}</p>
                            </div>
                            <div className="space-y-3 pl-0 md:pl-12">
                                {q.options?.map((opt, idx) => {
                                    const isSelected = userAnswers[q.id] === opt;
                                    let style = "bg-slate-50 dark:bg-slate-900 border-transparent text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-700";

                                    if (showResults) {
                                        if (opt === q.correctAnswer) style = "bg-green-100 border-green-500 text-green-900 font-bold shadow-[0_0_15px_rgba(34,197,94,0.4)]";
                                        else if (isSelected) style = "bg-red-100 border-red-500 text-red-900 opacity-70";
                                    } else if (isSelected) {
                                        style = "bg-blue-500 text-white shadow-md scale-[1.01]";
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            disabled={showResults}
                                            onClick={() => { if (stats.soundEnabled) playSound('click'); setUserAnswers(prev => ({ ...prev, [q.id]: opt })); }}
                                            className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium text-base ${style}`}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {!showResults && (
                    <button onClick={handleCheckAnswers} className="fixed bottom-32 right-6 px-8 py-4 bg-blue-500 text-white rounded-full font-black shadow-xl hover:scale-105 transition-transform z-[50] active:scale-95">
                        Finish Interview
                    </button>
                )}
                <TranscriptModal
                    isOpen={showTranscript}
                    onClose={() => setShowTranscript(false)}
                    exercise={exercise}
                    userAnswers={userAnswers}
                />
                <SmartAudioPlayer src={audioUrl} transcript={exercise?.script ?? undefined} isPlaying={isPlaying} onPlayPause={() => setIsPlaying(!isPlaying)} />
            </div>
        );
    };

    if (generationStep !== 'idle' && generationStep !== 'ready') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <div className="relative w-64 h-64 mb-12">
                    {/* Pulsing Rings */}
                    <div className="absolute inset-0 bg-cyan-500 rounded-full opacity-20 animate-ping"></div>
                    <div className="absolute inset-4 bg-sky-500 rounded-full opacity-20 animate-ping" style={{ animationDelay: '0.2s' }}></div>
                    <div className="absolute inset-8 bg-blue-500 rounded-full opacity-20 animate-ping" style={{ animationDelay: '0.4s' }}></div>

                    {/* Center Content */}
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="w-32 h-32 bg-white dark:bg-slate-800 rounded-full shadow-2xl flex items-center justify-center text-6xl border-4 border-slate-100 dark:border-slate-700 animate-bounce">
                            {generationStep === 'scripting' ? '📝' : '🎙️'}
                        </div>
                    </div>

                    {/* Orbiting Emojis */}
                    <div className="absolute inset-0 animate-[spin_8s_linear_infinite]">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 text-4xl">⚡</div>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6 text-4xl">🎧</div>
                    </div>
                    <div className="absolute inset-0 animate-[spin_12s_linear_infinite_reverse]">
                        <div className="absolute left-0 top-1/2 -translate-x-6 -translate-y-1/2 text-4xl">📡</div>
                        <div className="absolute right-0 top-1/2 translate-x-6 -translate-y-1/2 text-4xl">🤖</div>
                    </div>
                </div>

                <h2 className="text-4xl font-black text-slate-800 dark:text-white mb-4 animate-pulse text-center">
                    {generationStep === 'scripting' ? 'Writing Exam Paper...' : 'Recording Studio Active...'}
                </h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">
                    {generationStep === 'scripting' ? 'Crafting Questions & Distractors' : 'Synthesizing HD Audio'}
                </p>
            </div>
        );
    }

    if (generationStep === 'idle') {
        return (
            <div className="max-w-7xl mx-auto pt-2 px-2 md:px-4 mb-24 relative min-h-screen flex flex-col">

                <div className="relative bg-gradient-to-br from-cyan-500 to-blue-600 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-cyan-200 dark:shadow-none text-white overflow-hidden border-4 border-cyan-400 animate-enter shrink-0 mb-12">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10 mb-3 shadow-sm">
                            <span>🎧</span> Exam Simulation
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black font-game tracking-tight drop-shadow-md">Listening Lounge</h1>
                        <p className="text-cyan-100 font-medium text-lg mt-1 max-w-xl">Master the Cambridge FCE & Michigan ECCE listening papers.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full pb-20">
                    {LISTENING_MODES.map((mode, index) => {
                        const isCached = !!stats.listeningCache?.[mode.id as ListeningType];
                        return (
                            <button
                                key={mode.id}
                                onClick={() => handleStartSession(mode.id as ListeningType)}
                                className="group relative overflow-hidden bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-xl border-2 border-white dark:border-slate-700 hover:border-cyan-200 dark:hover:border-cyan-500 hover:shadow-2xl transition-all text-left flex flex-col h-full min-h-[200px] active:scale-95 animate-slide-up opacity-0 fill-mode-forwards"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className={`absolute top-0 right-0 w-32 h-32 bg-${mode.color}-100 dark:bg-${mode.color}-900/20 rounded-full blur-2xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

                                <div className={`absolute right-4 bottom-0 text-8xl font-black font-game opacity-5 select-none transition-colors duration-300 group-hover:text-${mode.color}-500 text-slate-300 dark:text-slate-600 group-hover:opacity-20 scale-150 origin-bottom-right`}>{mode.watermark}</div>

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex justify-between items-start w-full mb-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-${mode.color}-100 dark:border-${mode.color}-900/30 bg-${mode.color}-50 dark:bg-${mode.color}-900/20`}>
                                            {mode.icon}
                                        </div>
                                        {isCached && (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-[10px] font-black uppercase border border-green-200 shadow-sm flex items-center gap-1">
                                                <span>💾</span> Saved
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">{mode.title}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed max-w-[80%]">{mode.desc}</p>

                                    <div className="mt-auto pt-6 flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-cyan-500 uppercase tracking-widest transition-colors">
                                        Start Paper <span>→</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto pt-2 px-2 md:px-4 mb-24 relative min-h-screen animate-slide-up">
            {/* Result Header - Only show if results are displayed - MOVED TO BOTTOM-28 TO FLOAT ABOVE PLAYER */}
            {showResults && (
                <div className="fixed bottom-28 left-4 right-4 z-[110] animate-slide-up">
                    <div className="bg-slate-900 text-white rounded-3xl p-4 shadow-2xl flex justify-between items-center max-w-3xl mx-auto border-2 border-slate-800">
                        <div className="flex items-center gap-4 px-2">
                            <div className="text-3xl hidden md:block">📊</div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score</p>
                                <p className="text-2xl font-black leading-none">{score} <span className="text-slate-500 text-lg">/ {exercise?.questions.length}</span></p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowTranscript(true)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 md:px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] md:text-xs transition-all shadow-lg shadow-cyan-500/20 active:scale-95">
                                🕵️ Review
                            </button>
                            <button onClick={() => setGenerationStep('idle')} className="bg-white text-slate-900 px-4 md:px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] md:text-xs hover:scale-105 transition-transform active:scale-95">
                                Exit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {type === 'PART1_MULTIPLE_CHOICE' && renderPart1()}
            {type === 'PART2_SENTENCES' && renderPart2()}
            {type === 'PART3_MATCHING' && renderPart3()}
            {type === 'PART4_INTERVIEW' && renderPart4()}
        </div>
    );
};

export default ListeningLounge;
