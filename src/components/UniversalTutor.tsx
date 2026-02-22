
// ... existing imports ...
import React, { useState, useEffect } from 'react';
import { generateLessonContent, checkExerciseAnswer, analyzeMistakePattern } from '../services/openRouterService';
import MarkdownRenderer from './MarkdownRenderer';
import { LessonContent, Exercise, LearningProfile } from '../types';
import { playSound } from '../services/soundService';

// ... (Keep types and CURRICULUM constant exactly as they are) ...
interface UniversalTutorProps {
    type: 'GRAMMAR' | 'VOCABULARY';
    completedTopics: string[];
    onCompleteTopic: (topicId: string) => void;
    profile: LearningProfile;
    onUpdateProfile: (newProfile: LearningProfile) => void;
    soundEnabled: boolean;
    lessonCache: Record<string, LessonContent>;
    onSaveLesson: (topicId: string, content: LessonContent | null) => void;
}

interface FeedbackResult {
    isCorrect: boolean;
    feedback: string;
    correction?: string;
}

// DEFINITIVE B2 CURRICULUM (FCE / ECCE) - RESTRUCTURED
const CURRICULUM = {
    GRAMMAR: [
        // LEVEL 1: FOUNDATION (Eliminating Fossilized Errors)
        { id: 'g1', title: 'Present Tenses: Simple vs Continuous', level: 'Basic' },
        { id: 'g2', title: 'State Verbs vs Action Verbs', level: 'Basic' },
        { id: 'g3', title: 'Past Tenses: Simple vs Continuous', level: 'Basic' },
        { id: 'g4', title: 'Used to vs Would vs Be Used to', level: 'Basic' },
        { id: 'g5', title: 'Present Perfect Simple vs Continuous', level: 'Basic' },
        { id: 'g6', title: 'For, Since, Just, Yet, Already', level: 'Basic' },
        { id: 'g7', title: 'Past Perfect: Simple vs Continuous', level: 'Basic' },
        { id: 'g8', title: 'Future Forms: Will, Going to, Present', level: 'Basic' },
        { id: 'g9', title: 'Future Continuous & Future Perfect', level: 'Basic' },
        { id: 'g10', title: 'Articles: A/An, The, Zero Article', level: 'Basic' },
        { id: 'g11', title: 'Quantifiers: Some, Any, Much, Many, A lot', level: 'Basic' },
        { id: 'g12', title: 'Adjectives: -ed vs -ing Endings', level: 'Basic' },
        { id: 'g13', title: 'Comparatives & Superlatives', level: 'Basic' },
        { id: 'g14', title: 'Adverbs of Manner, Place, Time', level: 'Basic' },
        { id: 'g15', title: 'Prepositions of Time (At, In, On)', level: 'Basic' },

        // LEVEL 2: CORE STRUCTURES (The B2 Engine)
        { id: 'g16', title: 'Modals 1: Ability & Permission', level: 'Intermediate' },
        { id: 'g17', title: 'Modals 2: Obligation, Prohibition, Necessity', level: 'Intermediate' },
        { id: 'g18', title: 'Modals 3: Speculation & Deduction (Present)', level: 'Intermediate' },
        { id: 'g19', title: 'Modals 4: Past Speculation (Must have done)', level: 'Intermediate' },
        { id: 'g20', title: 'The Passive Voice: Present & Past', level: 'Intermediate' },
        { id: 'g21', title: 'The Passive Voice: Future & Modals', level: 'Intermediate' },
        { id: 'g22', title: 'The Impersonal Passive (It is said that...)', level: 'Intermediate' },
        { id: 'g23', title: 'Conditionals: Zero & First', level: 'Intermediate' },
        { id: 'g24', title: 'Conditionals: Second (Hypothetical)', level: 'Intermediate' },
        { id: 'g25', title: 'Conditionals: Third (Past Regrets)', level: 'Intermediate' },
        { id: 'g26', title: 'Conditionals: Mixed Types', level: 'Intermediate' },
        { id: 'g27', title: 'Alternatives to If (Unless, Provided, As long as)', level: 'Intermediate' },
        { id: 'g28', title: 'Wishes & Regrets (I wish, If only)', level: 'Intermediate' },
        { id: 'g29', title: 'Question Tags & Echo Questions', level: 'Intermediate' },
        { id: 'g30', title: 'So do I / Neither do I (Agreement)', level: 'Intermediate' },

        // LEVEL 3: ADVANCED SYNTAX (Complex Sentences)
        { id: 'g31', title: 'Reported Speech: Statements (Tense Shift)', level: 'Advanced' },
        { id: 'g32', title: 'Reported Speech: Questions & Commands', level: 'Advanced' },
        { id: 'g33', title: 'Reporting Verbs (Accuse, Deny, Suggest)', level: 'Advanced' },
        { id: 'g34', title: 'The Causative (Have/Get something done)', level: 'Advanced' },
        { id: 'g35', title: 'Relative Clauses: Defining', level: 'Advanced' },
        { id: 'g36', title: 'Relative Clauses: Non-defining', level: 'Advanced' },
        { id: 'g37', title: 'Gerunds vs Infinitives 1: Basic Patterns', level: 'Advanced' },
        { id: 'g38', title: 'Gerunds vs Infinitives 2: Meaning Change', level: 'Advanced' },
        { id: 'g39', title: 'Connectors: Contrast (Although, Despite)', level: 'Advanced' },
        { id: 'g40', title: 'Connectors: Purpose & Result (So that, In order to)', level: 'Advanced' },
        { id: 'g41', title: 'Countable vs Uncountable Nouns (Tricky cases)', level: 'Advanced' },
        { id: 'g42', title: 'Subject-Verb Agreement', level: 'Advanced' },
        { id: 'g43', title: 'Prepositions of Place & Movement', level: 'Advanced' },
        { id: 'g44', title: 'Dependent Prepositions (Adj/Verb + Prep)', level: 'Advanced' },
        { id: 'g45', title: 'Phrasal Verbs: Separable vs Inseparable', level: 'Advanced' },

        // LEVEL 4: EXAM MASTERY (Transformation & Style)
        { id: 'g46', title: 'Inversion: Negative Adverbials (Never have I...)', level: 'Pro' },
        { id: 'g47', title: 'Cleft Sentences (It was John who...)', level: 'Pro' },
        { id: 'g48', title: 'Participle Clauses (Having finished, he left)', level: 'Pro' },
        { id: 'g49', title: 'The Subjunctive (I suggest he go)', level: 'Pro' },
        { id: 'g50', title: 'Unreal Past (It\'s time we went, I\'d rather)', level: 'Pro' },
        { id: 'g51', title: 'Ellipsis & Substitution', level: 'Pro' },
        { id: 'g52', title: 'Advanced Comparisons (The more, the merrier)', level: 'Pro' },
        { id: 'g53', title: 'Whatever, Whoever, Whenever', level: 'Pro' },
        { id: 'g54', title: 'Key Word Transformation Strategy 1', level: 'Pro' },
        { id: 'g55', title: 'Key Word Transformation Strategy 2', level: 'Pro' },
        { id: 'g56', title: 'Grammar in Writing: Formal Style', level: 'Pro' },
        { id: 'g57', title: 'Grammar in Writing: Cohesion', level: 'Pro' },
        { id: 'g58', title: 'Common B2 Exam Pitfalls', level: 'Pro' },
        { id: 'g59', title: 'Exam Review: Part 2 Open Cloze', level: 'Pro' },
        { id: 'g60', title: 'Exam Review: Part 4 Corrections', level: 'Pro' },
    ],
    VOCABULARY: [
        // LEVEL 1: TOPIC FOUNDATIONS (The World Around Us)
        { id: 'v1', title: 'Identity & Personality Adjectives', level: 'Basic' },
        { id: 'v2', title: 'Family, Friends & Relationships', level: 'Basic' },
        { id: 'v3', title: 'House, Home & Accommodation', level: 'Basic' },
        { id: 'v4', title: 'Daily Routine & Lifestyle', level: 'Basic' },
        { id: 'v5', title: 'Food, Cooking & Restaurants', level: 'Basic' },
        { id: 'v6', title: 'Shopping, Fashion & Clothing', level: 'Basic' },
        { id: 'v7', title: 'Travel, Transport & Holidays', level: 'Basic' },
        { id: 'v8', title: 'Weather, Climate & Seasons', level: 'Basic' },
        { id: 'v9', title: 'The Natural World & Environment', level: 'Basic' },
        { id: 'v10', title: 'Animals & Wildlife', level: 'Basic' },
        { id: 'v11', title: 'School, Education & Learning', level: 'Basic' },
        { id: 'v12', title: 'Work, Jobs & Careers', level: 'Basic' },
        { id: 'v13', title: 'Money & Personal Finance', level: 'Basic' },
        { id: 'v14', title: 'Health, Fitness & The Body', level: 'Basic' },
        { id: 'v15', title: 'Sport, Hobbies & Leisure', level: 'Basic' },

        // LEVEL 2: SOCIETY & ABSTRACT (Intermediate Themes)
        { id: 'v16', title: 'Entertainment: Film, Music, TV', level: 'Intermediate' },
        { id: 'v17', title: 'The Media, News & Internet', level: 'Intermediate' },
        { id: 'v18', title: 'Technology, Computers & Gadgets', level: 'Intermediate' },
        { id: 'v19', title: 'Crime, Law & Punishment', level: 'Intermediate' },
        { id: 'v20', title: 'Politics & Society', level: 'Intermediate' },
        { id: 'v21', title: 'Art, Culture & Literature', level: 'Intermediate' },
        { id: 'v22', title: 'Science & Innovation', level: 'Intermediate' },
        { id: 'v23', title: 'Feelings, Emotions & Moods', level: 'Intermediate' },
        { id: 'v24', title: 'Opinion & Agreement Words', level: 'Intermediate' },
        { id: 'v25', title: 'Communication & Speaking Verbs', level: 'Intermediate' },
        { id: 'v26', title: 'Describing Places & Buildings', level: 'Intermediate' },
        { id: 'v27', title: 'Describing Objects & Materials', level: 'Intermediate' },
        { id: 'v28', title: 'Global Issues & Problems', level: 'Intermediate' },
        { id: 'v29', title: 'Celebrations & Festivals', level: 'Intermediate' },
        { id: 'v30', title: 'History & Time', level: 'Intermediate' },

        // LEVEL 3: MECHANICS & CHUNKS (Exam Part 3 Focus)
        { id: 'v31', title: 'Word Formation: Noun Suffixes (-tion, -ment)', level: 'Advanced' },
        { id: 'v32', title: 'Word Formation: Adjective Suffixes (-ful, -ous)', level: 'Advanced' },
        { id: 'v33', title: 'Word Formation: Negative Prefixes (un-, dis-)', level: 'Advanced' },
        { id: 'v34', title: 'Word Formation: Verb Prefixes (en-, re-)', level: 'Advanced' },
        { id: 'v35', title: 'Word Formation: Adverbs & Irregular forms', level: 'Advanced' },
        { id: 'v36', title: 'Collocations: Do vs Make', level: 'Advanced' },
        { id: 'v37', title: 'Collocations: Take, Have, Get, Go', level: 'Advanced' },
        { id: 'v38', title: 'Phrasal Verbs: Travel & Movement', level: 'Advanced' },
        { id: 'v39', title: 'Phrasal Verbs: Relationships & Feelings', level: 'Advanced' },
        { id: 'v40', title: 'Phrasal Verbs: Work & School', level: 'Advanced' },
        { id: 'v41', title: 'Phrasal Verbs: Health & Daily Life', level: 'Advanced' },
        { id: 'v42', title: 'Phrasal Verbs: Money & Crime', level: 'Advanced' },
        { id: 'v43', title: 'Dependent Prepositions: Adjectives', level: 'Advanced' },
        { id: 'v44', title: 'Dependent Prepositions: Verbs', level: 'Advanced' },
        { id: 'v45', title: 'Compound Nouns & Adjectives', level: 'Advanced' },

        // LEVEL 4: EXAM MASTERY (Precision)
        { id: 'v46', title: 'Confusing Words: Say/Tell, Speak/Talk', level: 'Pro' },
        { id: 'v47', title: 'Confusing Words: Rob/Steal, Lend/Borrow', level: 'Pro' },
        { id: 'v48', title: 'Confusing Words: Job/Work, Trip/Journey', level: 'Pro' },
        { id: 'v49', title: 'Idioms: Body Parts', level: 'Pro' },
        { id: 'v50', title: 'Idioms: Animals & Nature', level: 'Pro' },
        { id: 'v51', title: 'Idioms: Time & Numbers', level: 'Pro' },
        { id: 'v52', title: 'Idioms: Colours & Clothes', level: 'Pro' },
        { id: 'v53', title: 'Fixed Phrases (Prepositional Phrases)', level: 'Pro' },
        { id: 'v54', title: 'Formal vs Informal Vocabulary', level: 'Pro' },
        { id: 'v55', title: 'Extreme Adjectives', level: 'Pro' },
        { id: 'v56', title: 'Linking Words for Writing', level: 'Pro' },
        { id: 'v57', title: 'Expressing Probability & Certainty', level: 'Pro' },
        { id: 'v58', title: 'Homophones & Homonyms', level: 'Pro' },
        { id: 'v59', title: 'British vs American English', level: 'Pro' },
        { id: 'v60', title: 'The Ultimate B2 Review Quiz', level: 'Pro' },
    ]
};

const UniversalTutor: React.FC<UniversalTutorProps> = ({ 
    type, 
    completedTopics, 
    onCompleteTopic, 
    profile, 
    onUpdateProfile, 
    soundEnabled,
    lessonCache,
    onSaveLesson
}) => {
    const [selectedTopic, setSelectedTopic] = useState<{id: string, title: string, level: string} | null>(null);
    const [lessonData, setLessonData] = useState<LessonContent | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'LEARN' | 'PRACTICE'>('LEARN');
    
    const [exerciseAnswers, setExerciseAnswers] = useState<Record<number, string>>({});
    const [exerciseFeedback, setExerciseFeedback] = useState<Record<number, FeedbackResult>>({});
    const [checkingId, setCheckingId] = useState<number | null>(null);

    const topics = type === 'GRAMMAR' ? CURRICULUM.GRAMMAR : CURRICULUM.VOCABULARY;
    const isGrammar = type === 'GRAMMAR';
    
    // Visual Theme: Indigo for Grammar, Emerald/Teal for Vocab
    const activeThemeColor = isGrammar ? 'indigo' : 'emerald';

    const handleSelectTopic = async (topic: {id: string, title: string, level: string}, forceRegenerate: boolean = false) => {
        if(soundEnabled) playSound('click');
        setSelectedTopic(topic);
        setExerciseAnswers({});
        setExerciseFeedback({});
        setActiveTab('LEARN');
        
        if (!forceRegenerate && lessonCache[topic.id]) {
            setLessonData(lessonCache[topic.id]);
            if(soundEnabled) playSound('pop');
            return;
        }

        setLessonData(null);
        setLoading(true);
        
        try {
            const jsonString = await generateLessonContent(topic.title, type, profile);
            if (jsonString) {
                const parsed = JSON.parse(jsonString) as LessonContent;
                setLessonData(parsed);
                onSaveLesson(topic.id, parsed);
                if(soundEnabled) playSound('pop');
            } else {
                throw new Error("Empty response");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = () => {
        if (!selectedTopic) return;
        onSaveLesson(selectedTopic.id, null);
        handleSelectTopic(selectedTopic, true);
    };

    const handleCheckAnswer = async (exercise: Exercise) => {
        const answer = exerciseAnswers[exercise.id];
        if (!answer) return;

        setCheckingId(exercise.id);
        if(soundEnabled) playSound('click');
        
        try {
            const resultJson = await checkExerciseAnswer(
                exercise.question, 
                answer, 
                lessonData?.title || "",
                exercise.correctAnswer,
                exercise.options
            );
            const result = JSON.parse(resultJson as string) as FeedbackResult;
            setExerciseFeedback(prev => ({ ...prev, [exercise.id]: result }));

            const newProfile = { ...profile };
            
            if (result.isCorrect) {
                if(soundEnabled) playSound('success');
                if (selectedTopic) {
                    const totalEx = lessonData?.exercises.length || 1;
                    const completedCount = Object.values(exerciseFeedback).filter((f) => (f as FeedbackResult).isCorrect).length + 1;
                    const percentage = Math.round((completedCount / totalEx) * 100);
                    newProfile.topicMastery[selectedTopic.id] = Math.max(newProfile.topicMastery[selectedTopic.id] || 0, percentage);
                }
            } else {
                if(soundEnabled) playSound('error');
                newProfile.recentMistakes.unshift(exercise.question);
                newProfile.recentMistakes = newProfile.recentMistakes.slice(0, 10); 

                if (newProfile.recentMistakes.length % 3 === 0) {
                    analyzeMistakePattern(selectedTopic?.title || "General", newProfile.recentMistakes.slice(0, 5))
                        .then(weaknesses => {
                            if (weaknesses.length > 0) {
                                newProfile.weaknesses = [...new Set([...newProfile.weaknesses, ...weaknesses])];
                                onUpdateProfile({ ...newProfile });
                            }
                        });
                }
            }
            

            if (result.isCorrect) {
                const currentCompleted = Object.values(exerciseFeedback).filter((f) => (f as FeedbackResult).isCorrect).length + 1; 
                if (lessonData?.exercises && currentCompleted >= lessonData.exercises.length) {
                    if (selectedTopic) {
                        // Add friendly strength here
                        const strengthName = `${isGrammar ? 'Grammar' : 'Vocabulary'}: ${selectedTopic.title}`;
                        if (!newProfile.strengths.includes(strengthName)) {
                            newProfile.strengths.push(strengthName);
                        }
                        
                        onCompleteTopic(selectedTopic.id);
                    } else {
                        if(soundEnabled) playSound('levelUp');
                    }
                }
            }
            onUpdateProfile(newProfile);
        } catch (e) {
            console.error(e);
        } finally {
            setCheckingId(null);
        }
    };

    // --- RENDER EXAMPLE HELPER ---
    const renderFancyExample = (exString: string, themeColor: string) => {
        const cleanEx = exString.replace(/^"|"$/g, '').trim();
        const regex = /^\*\*(.*?)(?:\s*\((.*?)\))?\*\*:(.*)/;
        const match = cleanEx.match(regex);

        if (match) {
            const label = match[1].trim();
            const context = match[2]?.trim();
            const sentence = match[3].trim();

            return (
                <div className="flex flex-col gap-3 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-black text-lg uppercase tracking-wide text-${themeColor}-600 dark:text-${themeColor}-300 bg-${themeColor}-50 dark:bg-${themeColor}-900/30 px-2 py-1 rounded-lg border border-${themeColor}-100 dark:border-${themeColor}-800`}>
                            {label}
                        </span>
                        {context && (
                            <span className="bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-200 px-2 py-1 rounded-lg text-xs font-black uppercase tracking-wider border border-pink-200 dark:border-pink-800">
                                {context}
                            </span>
                        )}
                    </div>
                    <div className="text-lg font-medium text-slate-700 dark:text-slate-200 leading-relaxed pl-1">
                        <MarkdownRenderer content={sentence} themeColor={themeColor} />
                    </div>
                </div>
            );
        }
        return <MarkdownRenderer content={cleanEx} themeColor={themeColor} />;
    };

    const renderExercise = (ex: Exercise, index: number) => {
        const feedback = exerciseFeedback[ex.id];
        const isChecking = checkingId === ex.id;
        const themeColor = activeThemeColor;

        return (
            <div key={ex.id} className={`bg-white dark:bg-slate-800 rounded-[2rem] p-6 md:p-8 shadow-lg border-2 mb-8 relative transition-all duration-500 transform ${feedback && !feedback.isCorrect ? 'border-red-200 bg-red-50/30 dark:bg-red-900/20 dark:border-red-800' : 'border-white dark:border-slate-700'}`}>
                <div className={`absolute top-0 left-0 px-4 py-2 rounded-br-2xl text-xs font-black uppercase tracking-wide shadow-sm
                    ${feedback?.isCorrect ? 'bg-green-500 text-white' : feedback ? 'bg-red-500 text-white' : `bg-${themeColor}-500 text-white`}
                `}>
                    {ex.type === 'key_word_transformation' ? 'Part 4: Transformation' : `Task #${index + 1}`}
                </div>

                {ex.type === 'key_word_transformation' ? (
                     <div className="mt-10 mb-6">
                        <p className="text-slate-400 dark:text-slate-400 font-bold text-xs uppercase mb-3 tracking-widest">Complete the second sentence so it means the same as the first.</p>
                        <div className="bg-slate-50 dark:bg-slate-700/50 p-5 rounded-xl border border-slate-200 dark:border-slate-600 mb-6 relative overflow-hidden">
                            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-${themeColor}-400`}></div>
                            <p className="font-medium text-lg text-slate-800 dark:text-slate-200 leading-relaxed">{ex.question}</p>
                        </div>
                        <div className="flex justify-center mb-6">
                             <span className="bg-slate-800 dark:bg-white dark:text-slate-900 text-white px-6 py-2 rounded-xl font-black tracking-widest text-lg shadow-lg uppercase transform rotate-[-2deg]">{ex.transformationKeyword || ex.hint}</span>
                        </div>
                        <div className="flex flex-col md:flex-row items-center justify-center gap-3 text-lg text-slate-800 dark:text-slate-200 font-medium bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 p-6 rounded-3xl shadow-inner flex-wrap">
                            <span className="text-right">{ex.transformationStart || ""}</span>
                            <input 
                                type="text"
                                value={exerciseAnswers[ex.id] || ''}
                                onChange={(e) => !feedback?.isCorrect && setExerciseAnswers(prev => ({...prev, [ex.id]: e.target.value}))}
                                placeholder="type answer..."
                                disabled={!!feedback?.isCorrect}
                                className={`p-3 rounded-xl border-b-4 outline-none focus:border-${themeColor}-500 bg-slate-50 dark:bg-slate-800 font-bold text-center w-full md:w-auto min-w-[200px] shadow-sm transition-colors ${feedback?.isCorrect ? 'border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white'}`}
                            />
                            <span className="text-left">{ex.transformationEnd || ""}</span>
                        </div>
                     </div>
                ) : (
                    <>
                        <h3 className="font-bold text-xl text-slate-800 dark:text-white mt-8 mb-6 leading-snug">{ex.question}</h3>
                        <div className="mb-6">
                            {ex.type === 'multiple_choice' && ex.options && (
                                <div className="grid grid-cols-1 gap-3">
                                    {ex.options.map((opt, i) => (
                                        <label key={i} className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all group
                                            ${exerciseAnswers[ex.id] === opt 
                                                ? `border-${themeColor}-500 bg-${themeColor}-50 dark:bg-${themeColor}-900/20 shadow-md` 
                                                : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}
                                        `}>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors ${exerciseAnswers[ex.id] === opt ? `border-${themeColor}-500 bg-white dark:bg-slate-700` : 'border-slate-200 dark:border-slate-600 group-hover:border-slate-400'}`}>
                                                {exerciseAnswers[ex.id] === opt && <div className={`w-3 h-3 rounded-full bg-${themeColor}-500`}></div>}
                                            </div>
                                            <input 
                                                type="radio" 
                                                name={`ex-${ex.id}`} 
                                                value={opt} 
                                                onChange={(e) => { if(!feedback?.isCorrect) { if(soundEnabled) playSound('click'); setExerciseAnswers(prev => ({...prev, [ex.id]: e.target.value}))}}}
                                                checked={exerciseAnswers[ex.id] === opt}
                                                disabled={!!feedback?.isCorrect}
                                                className="hidden"
                                            />
                                            <span className="text-slate-700 dark:text-slate-200 font-bold text-lg">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {(ex.type === 'fill_in_the_blank' || ex.type === 'rewrite') && (
                                <input 
                                    type="text"
                                    value={exerciseAnswers[ex.id] || ''}
                                    onChange={(e) => !feedback?.isCorrect && setExerciseAnswers(prev => ({...prev, [ex.id]: e.target.value}))}
                                    placeholder="Type your answer here..."
                                    disabled={!!feedback?.isCorrect}
                                    className={`w-full p-5 rounded-2xl border-2 outline-none focus:ring-4 focus:ring-${themeColor}-100 dark:focus:ring-${themeColor}-900 bg-white dark:bg-slate-900 transition-all font-bold text-xl text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 ${feedback?.isCorrect ? 'border-green-500' : `focus:border-${themeColor}-500 border-slate-200 dark:border-slate-600`}`}
                                />
                            )}
                        </div>
                    </>
                )}
                
                <div className="flex flex-col mt-6">
                     {feedback ? (
                         <div className={`w-full p-6 rounded-2xl animate-scale-in mb-4 ${feedback.isCorrect ? 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-300 border border-red-200 dark:border-red-800'}`}>
                             <div className="flex items-start gap-4">
                                <div className="text-3xl flex-shrink-0">{feedback.isCorrect ? '🎉' : '🤔'}</div>
                                <div>
                                    <p className="font-black text-lg">{feedback.isCorrect ? 'Brilliant!' : 'Not quite right.'}</p>
                                    <p className="font-medium opacity-90 leading-relaxed mt-2 text-base">{feedback.feedback}</p>
                                    {!feedback.isCorrect && feedback.correction && (
                                        <div className="mt-4 bg-white/60 dark:bg-black/20 p-4 rounded-xl border border-black/5 dark:border-white/5 inline-block">
                                            <p className="text-xs font-bold uppercase opacity-70 mb-1">Correct Answer:</p>
                                            <p className="font-mono text-lg font-bold text-red-700 dark:text-red-400">{feedback.correction}</p>
                                        </div>
                                    )}
                                </div>
                             </div>
                         </div>
                     ) : null}

                     {!feedback?.isCorrect && (
                        <button 
                            onClick={() => handleCheckAnswer(ex)}
                            disabled={!exerciseAnswers[ex.id] || isChecking}
                            className={`w-full px-8 py-4 rounded-2xl font-black text-white shadow-lg shadow-${themeColor}-200 dark:shadow-none transition-all transform active:scale-95 border-b-4 border-${themeColor}-800 active:border-b-0 active:translate-y-1
                                ${isChecking ? 'bg-slate-400 cursor-wait' : `bg-${themeColor}-600 hover:bg-${themeColor}-700 hover:-translate-y-1`}
                            `}
                        >
                            {isChecking ? 'Checking...' : 'CHECK ANSWER'}
                        </button>
                     )}
                </div>
            </div>
        );
    }

    if (!selectedTopic) {
        return (
            <div className="max-w-7xl mx-auto h-full pt-2 px-2 flex flex-col">
                {/* Hero Banner */}
                <div className={`relative overflow-hidden rounded-[2.5rem] mb-10 p-8 md:p-10 shadow-2xl ${isGrammar ? 'bg-gradient-to-br from-indigo-600 to-purple-700 border-4 border-indigo-400' : 'bg-gradient-to-br from-emerald-500 to-teal-600 border-4 border-emerald-400'} animate-enter flex-shrink-0`}>
                     <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-30 bg-white -mr-20 -mt-20 animate-pulse"></div>
                     <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl opacity-30 bg-white -ml-20 -mb-20"></div>
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

                     <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-black uppercase tracking-widest mb-4 shadow-lg">
                                <span className="text-xl">{isGrammar ? '📐' : '🌱'}</span>
                                {isGrammar ? 'Architectural Design' : 'Language Growth'}
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black text-white font-game drop-shadow-sm mb-4">
                                {isGrammar ? 'Grammar Blueprints' : 'Vocab Greenhouse'}
                            </h1>
                            <p className="text-white/80 font-medium text-lg md:text-xl max-w-2xl leading-relaxed">
                                {isGrammar 
                                    ? "Construct your language skills from the ground up. Lay the foundation, build the structure, and reach the sky." 
                                    : "Cultivate your word garden. Plant seeds, water them with practice, and watch your vocabulary bloom."}
                            </p>
                        </div>
                     </div>
                </div>

                <div className="space-y-16 pb-24">
                    {['Basic', 'Intermediate', 'Advanced', 'Pro'].map((level) => {
                        const levelTopics = topics.filter(t => t.level === level);
                        if (levelTopics.length === 0) return null;

                        const grammarPhases: any = {
                            Basic: { name: 'Foundation Phase', icon: '🧱', from: 'from-stone-400', to: 'to-stone-600', text: 'text-stone-800 dark:text-stone-200' },
                            Intermediate: { name: 'Structure Phase', icon: '🏗️', from: 'from-blue-400', to: 'to-blue-600', text: 'text-blue-800 dark:text-blue-200' },
                            Advanced: { name: 'Interior Phase', icon: '🏠', from: 'from-indigo-400', to: 'to-indigo-600', text: 'text-indigo-800 dark:text-indigo-200' },
                            Pro: { name: 'Skyscraper Phase', icon: '🏙️', from: 'from-violet-400', to: 'to-violet-600', text: 'text-violet-800 dark:text-violet-200' },
                        };

                        const vocabPhases: any = {
                            Basic: { name: 'Seedling Phase', icon: '🌱', from: 'from-green-400', to: 'to-green-600', text: 'text-green-800 dark:text-green-200' },
                            Intermediate: { name: 'Sapling Phase', icon: '🌿', from: 'from-teal-400', to: 'to-teal-600', text: 'text-teal-800 dark:text-teal-200' },
                            Advanced: { name: 'Timber Phase', icon: '🌳', from: 'from-emerald-400', to: 'to-emerald-600', text: 'text-emerald-800 dark:text-emerald-200' },
                            Pro: { name: 'Canopy Phase', icon: '🍎', from: 'from-lime-400', to: 'to-lime-600', text: 'text-lime-800 dark:text-lime-200' },
                        };

                        const levelConfig = isGrammar ? grammarPhases[level] : vocabPhases[level];

                        return (
                            <div key={level} className="relative">
                                <div className="flex items-center gap-4 mb-8 px-2">
                                     <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg bg-gradient-to-br ${levelConfig.from} ${levelConfig.to} text-white border-2 border-white dark:border-slate-700`}>
                                        {levelConfig.icon}
                                     </div>
                                     <h2 className={`text-3xl md:text-4xl font-black tracking-tight font-game flex-1 ${levelConfig.text}`}>{levelConfig.name}</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 px-2">
                                    {levelTopics.map((topic, index) => {
                                        const isCompleted = completedTopics.includes(topic.id);
                                        const mastery = profile.topicMastery[topic.id] || 0;
                                        const isCached = !!lessonCache[topic.id];
                                        const globalIndex = topics.findIndex(t => t.id === topic.id) + 1;
                                        const topicNumber = globalIndex.toString().padStart(2, '0');

                                        return (
                                            <button 
                                                key={topic.id}
                                                onClick={() => handleSelectTopic(topic)}
                                                style={{ animationDelay: `${index * 0.05}s` }}
                                                className={`
                                                    relative p-6 rounded-[2.5rem] text-left group overflow-hidden flex flex-col justify-between min-h-[160px]
                                                    transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 active:scale-95
                                                    border-2 shadow-sm hover:shadow-xl animate-slide-up opacity-0 fill-mode-forwards
                                                    ${isCompleted ? 'bg-slate-800 border-slate-700' : `bg-white dark:bg-slate-800 border-white dark:border-slate-700 hover:border-opacity-0`}
                                                `}
                                            >
                                                {!isCompleted && (
                                                    <div className={`absolute inset-0 bg-gradient-to-br ${levelConfig.from} ${levelConfig.to} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                                                )}
                                                
                                                {/* Watermark - large number on bottom right */}
                                                <div className={`absolute right-2 bottom-0 text-6xl md:text-7xl font-black font-game opacity-10 select-none transition-colors duration-300 ${isCompleted ? 'text-white' : 'text-slate-400 dark:text-slate-600 group-hover:text-white'}`}>
                                                    {topicNumber}
                                                </div>

                                                <div className="relative z-10 w-full h-full flex flex-col justify-between gap-4">
                                                    <div>
                                                        <h4 className={`font-black text-2xl leading-tight transition-colors duration-300 ${isCompleted ? 'text-white' : 'text-slate-800 dark:text-white group-hover:text-white'}`}>
                                                            {topic.title}
                                                        </h4>
                                                        {isCached && (
                                                            <span className={`inline-flex items-center gap-1 mt-2 text-[10px] font-bold px-2 py-0.5 rounded-md border ${isCompleted ? 'bg-white/20 text-white border-white/20' : 'bg-slate-100 text-slate-500 border-slate-200 group-hover:bg-white/20 group-hover:text-white group-hover:border-white/20'}`}>
                                                                <span>☁️</span> Synced
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Progress Bar - MOVED TO LEFT to avoid overlap */}
                                                    <div className="w-3/4"> 
                                                        <div className="w-full h-3 bg-black/10 dark:bg-black/30 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                                                            <div 
                                                                className={`h-full transition-all duration-1000 ${isCompleted ? 'bg-green-400' : 'bg-slate-400 dark:bg-slate-600 group-hover:bg-white'}`} 
                                                                style={{width: `${mastery}%`}}
                                                            ></div>
                                                        </div>
                                                        <div className={`text-[10px] font-bold uppercase tracking-wider mt-2 text-left transition-colors ${isCompleted ? 'text-green-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-white/80'}`}>
                                                            {mastery}% {isGrammar ? 'Constructed' : 'Grown'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto h-full flex flex-col pt-4 pb-20 px-2 relative">
            {/* ... Header ... */}
            <div className="flex justify-between items-center mb-6 animate-fade-in">
                <button onClick={() => { setSelectedTopic(null); if(soundEnabled) playSound('click'); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold flex items-center gap-2 transition-colors">
                    <span>←</span> Back to Menu
                </button>
                <div className="flex items-center gap-2">
                    <button onClick={handleRegenerate} title="Regenerate Lesson" className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-slate-400 hover:text-red-500 transition-colors shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
                {/* NEW LESSON CARD HEADER */}
                {lessonData && (
                    <div className={`relative overflow-hidden rounded-[2.5rem] mb-10 p-8 text-white shadow-2xl animate-scale-in
                        ${isGrammar 
                            ? 'bg-gradient-to-br from-indigo-600 to-purple-700 border-4 border-indigo-400' 
                            : 'bg-gradient-to-br from-teal-500 to-emerald-600 border-4 border-teal-400'}
                    `}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white opacity-5 rounded-full blur-3xl -ml-10 -mb-10"></div>
                        
                        <div className="relative z-10 text-center">
                            <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-6xl mx-auto mb-6 shadow-lg border border-white/30">
                                {lessonData.emoji}
                            </div>
                            {/* REDUCED TITLE SIZE HERE */}
                            <h1 className="text-2xl md:text-3xl font-black font-game tracking-tight drop-shadow-md mb-3">
                                {lessonData.title}
                            </h1>
                            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest border border-white/20 shadow-sm">
                                <span>{isGrammar ? '📐 Grammar' : '🌱 Vocabulary'}</span>
                                <span className="w-1 h-1 bg-white rounded-full"></span>
                                <span>{selectedTopic?.level}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* LOADING STATE */}
                {loading && (
                    <div className="flex flex-col items-center justify-center h-64">
                        <div className={`w-12 h-12 border-4 border-${activeThemeColor}-200 border-t-${activeThemeColor}-600 rounded-full animate-spin mb-4`}></div>
                        <p className="text-slate-400 font-bold animate-pulse">Generating Content...</p>
                    </div>
                )}

                {/* ERROR/EMPTY STATE */}
                {!loading && !lessonData && selectedTopic && (
                    <div className="flex flex-col items-center justify-center h-64 text-center bg-white dark:bg-slate-800 rounded-[2rem] p-8 shadow-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <div className="text-4xl mb-4">😕</div>
                        <h3 className="font-bold text-slate-800 dark:text-white mb-2">Content Not Found</h3>
                        <p className="text-slate-500 text-sm mb-6">The lesson could not be loaded. Please try generating again.</p>
                        <button onClick={handleRegenerate} className={`px-6 py-3 rounded-xl bg-${activeThemeColor}-500 text-white font-bold shadow-lg hover:bg-${activeThemeColor}-600 transition-all`}>
                            Retry Generation
                        </button>
                    </div>
                )}

                {/* LESSON CONTENT */}
                {lessonData && (
                    <>
                        {/* Tabs */}
                        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-8 mx-auto max-w-sm">
                            <button 
                                onClick={() => { setActiveTab('LEARN'); if(soundEnabled) playSound('click'); }}
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${activeTab === 'LEARN' ? `bg-${activeThemeColor}-500 text-white shadow-lg` : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            >
                                Theory
                            </button>
                            <button 
                                onClick={() => { setActiveTab('PRACTICE'); if(soundEnabled) playSound('click'); }}
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${activeTab === 'PRACTICE' ? `bg-${activeThemeColor}-500 text-white shadow-lg` : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            >
                                Practice
                            </button>
                        </div>

                        {/* CONTENT: LEARN */}
                        {activeTab === 'LEARN' && (
                            <div className="space-y-8 animate-slide-up min-h-[300px]">
                                <div className="bg-transparent">
                                    <MarkdownRenderer content={lessonData.theoryMarkdown} themeColor={activeThemeColor} />
                                </div>

                                {lessonData.examples && lessonData.examples.length > 0 && (
                                    <div className={`bg-gradient-to-br from-${activeThemeColor}-50 to-${activeThemeColor}-100 dark:from-${activeThemeColor}-900/10 dark:to-${activeThemeColor}-900/20 rounded-[2.5rem] p-8 md:p-10 border-2 border-${activeThemeColor}-100 dark:border-${activeThemeColor}-900/30 relative overflow-hidden`}>
                                        <div className={`absolute top-0 left-0 w-full h-2 bg-${activeThemeColor}-400`}></div>
                                        <h3 className={`text-xl font-black text-${activeThemeColor}-700 dark:text-${activeThemeColor}-300 mb-6 flex items-center gap-3`}>
                                            <span className={`bg-${activeThemeColor}-200 dark:bg-${activeThemeColor}-800 p-2 rounded-lg`}>💡</span> 
                                            Examples
                                        </h3>
                                        <div className="space-y-4 relative z-10">
                                            {lessonData.examples.map((ex, i) => (
                                                <div key={i} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white dark:border-slate-700 flex gap-4 items-start hover:scale-[1.01] transition-transform">
                                                    {/* NEW FANCY RENDERER */}
                                                    {renderFancyExample(ex, activeThemeColor)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                <button 
                                    onClick={() => { setActiveTab('PRACTICE'); window.scrollTo({top: 0, behavior: 'smooth'}); if(soundEnabled) playSound('click'); }}
                                    className={`w-full py-5 rounded-[2rem] bg-${activeThemeColor}-600 text-white font-black text-xl shadow-xl hover:bg-${activeThemeColor}-700 transition-all active:scale-95 flex items-center justify-center gap-3 mt-8`}
                                >
                                    Start Practice <span>→</span>
                                </button>
                            </div>
                        )}

                        {/* CONTENT: PRACTICE */}
                        {activeTab === 'PRACTICE' && (
                            <div className="animate-slide-up pb-12 min-h-[300px]">
                                {lessonData.exercises.map((ex, i) => renderExercise(ex, i))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default UniversalTutor;
