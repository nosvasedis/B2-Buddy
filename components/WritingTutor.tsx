
import React, { useState, useRef } from 'react';
import { generateModelEssay, gradeEssay } from '../services/geminiService';
import { UserStats, EssayType } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { playSound } from '../services/soundService';

interface WritingTutorProps {
    stats: UserStats;
    onUpdateStats: (stats: UserStats) => void;
}

// --- COMPREHENSIVE B2 WRITING GUIDES ---
const WRITING_GUIDES: Record<string, {
    icon: string;
    tagline: string;
    color: string;
    desc: string;
    content: string;
}> = {
    [EssayType.OPINION]: {
        icon: "⚖️",
        tagline: "Argue Your Point",
        color: "indigo",
        desc: "A formal essay discussing a statement or answering a specific question.",
        content: `
# The Essay

**Goal**: To present a balanced argument or a strong personal opinion on a topic, supported by reasons and examples.

## 🏗️ The Blueprint (Structure)
| Section | Content |
| :--- | :--- |
| **1. Introduction** | Paraphrase the question. State your opinion clearly. |
| **2. Body Paragraph 1** | First main point. Explain *why* (Reason) and give an *example*. |
| **3. Body Paragraph 2** | Second main point. Explain and refute/support. |
| **4. Conclusion** | Summarize your main points. Restate your opinion in different words. |

## 💬 The Toolkit (Key Phrases)
> **Linking Words**: Furthermore, Moreover, In addition, On the other hand, However, Consequently.
> **Opinion**: In my view, I strongly believe that, It seems to me that, I am convinced that.
> **Generalizing**: Generally speaking, It is often said that, Many people claim that.

## 💡 Pro Tactics
- **Tone**: **Formal**. Do not use contractions (*don't, can't*) or slang.
- **Balance**: Even if you have a strong opinion, acknowledge the other side (*"While some argue that..."*).
- **Variety**: Do not repeat "I think". Use "It is undeniable that..." or "From my perspective...".
        `
    },
    [EssayType.ARTICLE]: {
        icon: "📰",
        tagline: "Engage the Reader",
        color: "pink",
        desc: "A piece written for a magazine or newsletter. Needs to be entertaining.",
        content: `
# The Article

**Goal**: To inform and interest the reader. It should be personal, engaging, and colorful.

## 🏗️ The Blueprint
| Section | Content |
| :--- | :--- |
| **1. Catchy Title** | Use a question, alliteration, or a strong statement (*e.g., "Health: A Ticking Timebomb?"*). |
| **2. The Hook (Intro)** | Address the reader directly. Ask a rhetorical question. |
| **3. The Body** | Develop your points. Use personal anecdotes and descriptive adjectives. |
| **4. The Ending** | Give the reader something to think about. A final question or summary. |

## 💬 The Toolkit
> **Direct Address**: "Have you ever wondered...?", "Imagine if...", "You might be surprised to know..."
> **Adjectives**: Stunning, Breath-taking, Dreadful, Hilarious, Bustling, Peaceful.
> **Linking**: Surprisingly, Obviously, As a result, To be honest.

## 💡 Pro Tactics
- **Tone**: **Semi-formal to Informal**. It depends on the target audience (usually teenagers or club members).
- **Engagement**: Use *Rhetorical Questions* (*"Who doesn't love a good pizza?"*).
- **Personality**: It's okay to be funny or personal. Use exclamation marks (sparingly!).
        `
    },
    [EssayType.REVIEW]: {
        icon: "⭐",
        tagline: "Critique & Recommend",
        color: "orange",
        desc: "A review of a film, book, restaurant, or product based on personal experience.",
        content: `
# The Review

**Goal**: To describe something and offer a reasoned opinion/recommendation.

## 🏗️ The Blueprint
| Section | Content |
| :--- | :--- |
| **1. Title** | Name of the thing being reviewed (*e.g., "Titanic: A Sinking Feeling"*). |
| **2. Introduction** | What is it? Genre? Director/Author? Where is it? |
| **3. Description** | Plot summary (no spoilers!), atmosphere, acting, food quality, etc. |
| **4. Evaluation** | What was good? What was bad? (Balance is good). |
| **5. Verdict** | Who is it for? Do you recommend it? Rating? |

## 💬 The Toolkit
> **Positive**: Masterpiece, Outstanding, Gripping, Top-notch, Mouth-watering.
> **Negative**: Disappointing, Predictable, Slow-paced, Overpriced, Dull.
> **Recommendation**: "I would highly recommend...", "It is well worth seeing...", "I wouldn't bother with..."

## 💡 Pro Tactics
- **Adjectives**: This is an adjective game. Don't say "good". Say "spectacular".
- **Target**: Say *who* would like it (*"Fans of action movies will love this..."*).
- **Tense**: Use Present Simple for plots (*"The hero travels to..."*) and Past Simple for your experience (*"I went there last week..."*).
        `
    },
    [EssayType.REPORT]: {
        icon: "📊",
        tagline: "Analyze & Inform",
        color: "blue",
        desc: "A formal document for a superior (teacher, boss). Factual and organized.",
        content: `
# The Report

**Goal**: To present facts clearly and make suggestions based on them.

## 🏗️ The Blueprint
| Section | Content |
| :--- | :--- |
| **1. Title Info** | **To:** / **From:** / **Subject:** / **Date:** |
| **2. Introduction** | "The aim of this report is to..." |
| **3. Subheadings** | Break the content into clear sections (*e.g., "Current Facilities", "Student Feedback"*). |
| **4. Recommendations** | Suggest improvements based on the facts. |

## 💬 The Toolkit
> **Purpose**: "The purpose of this report is to evaluate...", "This report outlines..."
> **Reporting**: "It was found that...", "According to students...", "The majority of people..."
> **Suggesting**: "It is suggested that...", "I would recommend...", "The best course of action would be..."

## 💡 Pro Tactics
- **Tone**: **Strictly Formal**. No contractions. No emotion.
- **Headings**: You MUST use subheadings. The examiner looks for them immediately.
- **Passive Voice**: Use it to sound objective (*"It is believed that...", "Money was spent on..."*).
- **Bullets**: You can use a bulleted list for clarity (but write full sentences).
        `
    },
    [EssayType.EMAIL]: {
        icon: "✉️",
        tagline: "Communicate Effectively",
        color: "emerald",
        desc: "Can be formal (job application) or informal (writing to a friend). Context is key.",
        content: `
# The Email / Letter

**Goal**: To respond to a prompt, covering specific notes (e.g., apologize, suggest, explain).

## 🏗️ The Blueprint
| Section | Content |
| :--- | :--- |
| **1. Salutation** | Formal (*Dear Mr. Smith*) or Informal (*Hi John*). |
| **2. Opening** | Reason for writing (*"I'm writing to apply..."* or *"Great to hear from you!"*). |
| **3. Body** | Cover the bullet points in the task. One paragraph per point. |
| **4. Closing** | Call to action or signing off (*"I look forward to..."* or *"Can't wait to see you"*). |
| **5. Sign-off** | *Yours sincerely* (Formal) / *Best wishes* (Informal). |

## 💬 The Toolkit (Formal vs Informal)
> **Formal**: "I would be grateful if...", "Please find attached...", "I regret to inform you..."
> **Informal**: "Thanks a million for...", "How's it going?", "By the way...", "Drop me a line."

## 💡 Pro Tactics
- **Register**: Identify the reader immediately. Using slang with a boss is a fail. Using "Dear Sir" with a friend is a fail.
- **Functions**: Check if you need to *persuade*, *complain*, *invite*, or *apologize*.
        `
    },
    [EssayType.STORY]: {
        icon: "🐉",
        tagline: "Narrate a Tale",
        color: "purple",
        desc: "A narrative usually beginning or ending with a specific sentence.",
        content: `
# The Story

**Goal**: To entertain with a clear narrative arc (Beginning, Middle, End).

## 🏗️ The Blueprint
| Section | Content |
| :--- | :--- |
| **1. The Setup** | Set the scene. Who? Where? Weather? Atmosphere? |
| **2. The Inciting Incident** | Something happens to start the action. |
| **3. The Climax** | The point of highest tension or drama. |
| **4. The Resolution** | How it ended. Use the required ending sentence if asked. |

## 💬 The Toolkit
> **Time Phrases**: "Suddenly", "All of a sudden", "By the time", "Moments later", "In the blink of an eye".
> **Adverbs**: anxiously, breathlessly, carefully, immediately, luckily.
> **Direct Speech**: "Watch out!" he screamed. (Adds drama).

## 💡 Pro Tactics
- **Narrative Tenses**: You MUST mix them.
    - *Past Simple* (Action): "He opened the door."
    - *Past Continuous* (Background): "The sun was shining."
    - *Past Perfect* (Before the past): "He had never seen such a thing."
- **Show, Don't Tell**: Don't say "He was scared." Say "His hands were shaking and his face went pale."
        `
    }
};

const WritingTutor: React.FC<WritingTutorProps> = ({ stats, onUpdateStats }) => {
    const [mode, setMode] = useState<'GUIDE' | 'SCAN'>('GUIDE');
    const [selectedTask, setSelectedTask] = useState<EssayType>(EssayType.OPINION);
    const [modelEssay, setModelEssay] = useState<string>("");
    const [loading, setLoading] = useState(false);

    // Scan State
    // Now stores an array of images for multi-page support
    const [scanImages, setScanImages] = useState<{data: string, mime: string}[]>([]);
    const [scanFeedback, setScanFeedback] = useState<string>("");
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Get current guide data
    const currentGuide = WRITING_GUIDES[selectedTask];

    const handleGenerateModel = async () => {
        setLoading(true);
        if (stats.soundEnabled) playSound('click');
        try {
            const essay = await generateModelEssay(selectedTask);
            setModelEssay(essay);
            // Cache it
            const newStats = { ...stats, essayModels: { ...stats.essayModels, [selectedTask]: essay } };
            onUpdateStats(newStats);
            if (stats.soundEnabled) playSound('pop');
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleScanFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            
            const promises = files.map(file => {
                return new Promise<{data: string, mime: string}>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const result = reader.result as string;
                        const mime = result.split(';')[0].split(':')[1];
                        // Store full data url for preview, but we'll split later for API
                        resolve({ data: result, mime: mime });
                    };
                    reader.readAsDataURL(file as Blob);
                });
            });

            Promise.all(promises).then(newImages => {
                setScanImages(prev => [...prev, ...newImages]);
                setScanFeedback(""); 
            });
        }
    };

    const removePage = (index: number) => {
        setScanImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleGradeEssay = async () => {
        if (scanImages.length === 0) return;
        setIsScanning(true);
        if (stats.soundEnabled) playSound('click');
        
        try {
            // Prepare images for API (strip base64 header)
            const apiImages = scanImages.map(img => ({
                base64: img.data.split(',')[1],
                mimeType: img.mime
            }));
            
            const result = await gradeEssay(apiImages, selectedTask);
            setScanFeedback(result);
            if (stats.soundEnabled) playSound('success');
            
            // Update stats
            const newStats = { ...stats };
            newStats.xp += 50;
            onUpdateStats(newStats);
        } catch (e) {
            console.error(e);
            setScanFeedback("**Error**: Could not analyze images. Please try again.");
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto pt-2 px-2 md:px-4 pb-24">
            
            {/* HERO HEADER */}
            <div className="relative bg-gradient-to-br from-pink-500 to-rose-600 rounded-[2.5rem] p-8 md:p-10 shadow-2xl text-white overflow-hidden border-4 border-pink-400 animate-enter mb-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10 mb-3 shadow-sm">
                            <span>✍️</span> Writing Lab
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black font-game tracking-tight drop-shadow-md">Ink Station</h1>
                        <p className="text-pink-100 font-medium text-lg mt-1">Master every text type for the exam.</p>
                    </div>

                    <div className="flex flex-wrap gap-2 bg-black/20 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
                        <button onClick={() => setMode('GUIDE')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${mode === 'GUIDE' ? 'bg-white text-pink-600 shadow-lg' : 'text-white hover:bg-white/10'}`}>Guide</button>
                        <button onClick={() => setMode('SCAN')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${mode === 'SCAN' ? 'bg-white text-pink-600 shadow-lg' : 'text-white hover:bg-white/10'}`}>Scan Paper</button>
                    </div>
                </div>
            </div>

            {mode === 'GUIDE' && (
                <div className="space-y-8 animate-slide-up">
                    
                    {/* 1. TASK SELECTOR GRID */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                        {Object.entries(WRITING_GUIDES).map(([key, data]) => {
                            const isSelected = selectedTask === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => { setSelectedTask(key as EssayType); if(stats.soundEnabled) playSound('click'); }}
                                    className={`
                                        relative p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center text-center gap-2
                                        ${isSelected 
                                            ? `bg-${data.color}-50 border-${data.color}-500 shadow-lg scale-105 ring-4 ring-${data.color}-100 dark:bg-${data.color}-900/20 dark:ring-${data.color}-900/50` 
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:-translate-y-1 hover:shadow-md'}
                                    `}
                                >
                                    <div className={`text-3xl mb-1 drop-shadow-sm transition-transform duration-300 ${isSelected ? 'scale-110' : ''}`}>
                                        {data.icon}
                                    </div>
                                    <div>
                                        <h3 className={`text-xs md:text-sm font-black uppercase leading-tight ${isSelected ? `text-${data.color}-700 dark:text-${data.color}-300` : 'text-slate-600 dark:text-slate-300'}`}>
                                            {key}
                                        </h3>
                                        <p className={`text-[9px] font-medium mt-1 leading-tight ${isSelected ? `text-${data.color}-600 dark:text-${data.color}-400` : 'text-slate-400'}`}>
                                            {data.tagline}
                                        </p>
                                    </div>
                                    {isSelected && <div className={`absolute -bottom-1 w-8 h-1 rounded-full bg-${data.color}-500`}></div>}
                                </button>
                            );
                        })}
                    </div>

                    {/* 2. DETAILED GUIDE VIEW */}
                    <div className={`bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-xl border-4 border-${currentGuide.color}-100 dark:border-${currentGuide.color}-900/30 relative overflow-hidden`}>
                        {/* Header Strip */}
                        <div className={`absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-${currentGuide.color}-400 to-${currentGuide.color}-600`}></div>
                        
                        <div className="flex items-center gap-4 mb-8">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl bg-${currentGuide.color}-50 dark:bg-${currentGuide.color}-900/30 border border-${currentGuide.color}-200 dark:border-${currentGuide.color}-800`}>
                                {currentGuide.icon}
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{selectedTask}</h2>
                                <p className={`text-lg font-medium text-${currentGuide.color}-600 dark:text-${currentGuide.color}-300`}>{currentGuide.desc}</p>
                            </div>
                        </div>

                        <div className="prose prose-lg max-w-none dark:prose-invert">
                            <MarkdownRenderer content={currentGuide.content} themeColor={currentGuide.color} />
                        </div>
                    </div>

                    {/* 3. AI MODEL GENERATOR */}
                    <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden border-4 border-slate-800">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500 opacity-10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>

                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 border-b border-white/10 pb-8">
                                <div className="text-center md:text-left">
                                    <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10 mb-3">
                                        <span>🤖</span> AI Author
                                    </div>
                                    <h3 className="font-black text-3xl md:text-4xl mb-2">Model Generator</h3>
                                </div>
                                <button 
                                    onClick={handleGenerateModel} 
                                    disabled={loading}
                                    className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg disabled:opacity-50 flex-shrink-0 text-sm md:text-base active:scale-95"
                                >
                                    {loading ? 'Writing...' : (modelEssay ? 'Regenerate Answer' : 'Generate Model Answer')}
                                </button>
                            </div>
                            
                            {modelEssay ? (
                                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 animate-scale-in">
                                    <div className="prose prose-lg prose-invert max-w-none">
                                        <MarkdownRenderer content={modelEssay} />
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 opacity-30 border-2 border-dashed border-white/20 rounded-[2rem]">
                                    <div className="text-6xl mb-4">✨</div>
                                    <p className="font-bold text-xl">Model answer will appear here</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {mode === 'SCAN' && (
                <div className="animate-slide-up">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        
                        {/* Left: Upload Area */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-slate-700 h-fit">
                            <h3 className="font-black text-2xl text-slate-800 dark:text-white mb-6">Upload Paper</h3>
                            
                            {/* Input: Removed capture, added multiple */}
                            <input 
                                ref={fileInputRef} 
                                type="file" 
                                accept="image/*" 
                                multiple 
                                className="hidden" 
                                onChange={handleScanFile} 
                            />

                            {scanImages.length === 0 ? (
                                <div 
                                    className="aspect-[3/4] border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="text-center p-6">
                                        <div className="w-16 h-16 bg-pink-50 dark:bg-pink-900/30 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 text-pink-500">📸</div>
                                        <p className="font-bold text-slate-500">Tap to Upload</p>
                                        <p className="text-xs text-slate-400 mt-1">Multi-page supported</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        {scanImages.map((img, i) => (
                                            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-pink-200 dark:border-pink-800 group">
                                                <img src={img.data} className="w-full h-full object-cover" alt={`Page ${i+1}`} />
                                                <div className="absolute top-0 left-0 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded-br-lg">
                                                    Page {i+1}
                                                </div>
                                                <button 
                                                    onClick={() => removePage(i)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                        
                                        {/* Add Page Button */}
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                                        >
                                            <span className="text-2xl">+</span>
                                            <span className="text-xs font-bold">Add Page</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            <div className="mt-6">
                                <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Paper Type</label>
                                <select 
                                    value={selectedTask} 
                                    onChange={(e) => setSelectedTask(e.target.value as EssayType)}
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-white outline-none focus:border-pink-500"
                                >
                                    {Object.keys(WRITING_GUIDES).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <button 
                                onClick={handleGradeEssay}
                                disabled={scanImages.length === 0 || isScanning}
                                className="w-full mt-4 py-4 bg-pink-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-pink-200 dark:shadow-none hover:bg-pink-700 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isScanning ? (
                                    <><span>Grading...</span><span className="animate-spin">⏳</span></>
                                ) : (
                                    <><span>✓</span> Grade My Paper</>
                                )}
                            </button>
                        </div>

                        {/* Right: Results */}
                        <div className="lg:col-span-3 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] p-8 border-2 border-slate-200 dark:border-slate-700 min-h-[500px] relative">
                            {scanFeedback ? (
                                <div className="animate-scale-in">
                                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                                        <div className="bg-green-500 text-white p-2 rounded-xl text-2xl shadow-lg">🎓</div>
                                        <div>
                                            <h3 className="font-black text-2xl text-slate-800 dark:text-white">Examiner Report</h3>
                                            <p className="text-xs font-bold uppercase text-slate-400 tracking-widest">{selectedTask}</p>
                                        </div>
                                    </div>
                                    <div className="prose prose-lg max-w-none dark:prose-invert">
                                        <MarkdownRenderer content={scanFeedback} />
                                    </div>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                                    <div className="text-6xl mb-4 opacity-50">📝</div>
                                    <p className="font-black text-xl uppercase tracking-widest">Waiting for Paper</p>
                                    <p className="text-sm font-medium mt-2">Upload pages to receive a grade.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WritingTutor;
