
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SpeakingCoach from './components/SpeakingCoach';
import ListeningLounge from './components/ListeningLounge';
import WritingTutor from './components/WritingTutor';
import UserProfile from './components/UserProfile';
import UniversalTutor from './components/UniversalTutor';
import Settings from './components/Settings';
import ReadingRoom from './components/ReadingRoom';
import DrillSergeant from './components/DrillSergeant';
import DictionaryVault from './components/DictionaryVault';
import AuthScreen from './components/AuthScreen';
import ExamMode from './components/ExamMode';
import { NotificationProvider } from './components/NotificationProvider';
import { AppSection, DailyWord, UserStats, VocabItem, UserAccount, LessonContent } from './types';
import { getDailyWordForDate } from './data/dailyWords';
import { CoachingBrief } from './services/openRouterService';
import { playSound } from './services/soundService';
import { authService, DEFAULT_STATS } from './services/authService';

const getLocalDate = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

const App: React.FC = () => {
    const [activeSection, setActiveSection] = useState<AppSection>(AppSection.DASHBOARD);
    const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
    const [userStats, setUserStats] = useState<UserStats>(DEFAULT_STATS);
    const [dailyWord, setDailyWord] = useState<DailyWord | null>(null);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [coachBrief, setCoachBrief] = useState<CoachingBrief | null>(null);
    // Removed timeout state

    const [isTransitioning, setIsTransitioning] = useState(false);
    const [renderKey, setRenderKey] = useState(0);
    const [pendingSearchTerm, setPendingSearchTerm] = useState<string | null>(null);

    const [currentDate, setCurrentDate] = useState(getLocalDate());
    const lastUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        const applyTheme = () => {
            const mode = userStats.colorMode || 'auto';
            const isDark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            if (isDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };
        applyTheme();

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            if (userStats.colorMode === 'auto' || !userStats.colorMode) applyTheme();
        };
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [userStats.colorMode]);

    // REMOVED TIMEOUT LOGIC HERE

    useEffect(() => {
        let isMounted = true;

        const initAuth = async () => {
            try {
                const initialSession = await authService.getSession();

                if (initialSession && isMounted) {
                    lastUserIdRef.current = initialSession.id;
                    setCurrentUser(initialSession);
                    const loadedStats = await loadUserStats(initialSession.id);
                    if (loadedStats) {
                        loadDailyWord(loadedStats);
                    }
                } else {
                    if (isMounted) setLoading(false);
                }
            } catch (e) {
                console.error("Auth init error", e);
                if (isMounted) setLoading(false);
            }
        };

        initAuth();

        const subscription = authService.subscribeToAuth(async (user) => {
            if (!isMounted) return;

            if (user) {
                if (lastUserIdRef.current !== user.id) {
                    lastUserIdRef.current = user.id;
                    setCurrentUser(user);
                    setLoading(true);
                    const loadedStats = await loadUserStats(user.id);
                    if (loadedStats) {
                        loadDailyWord(loadedStats);
                    }
                }
            } else {
                lastUserIdRef.current = null;
                setCurrentUser(null);
                setUserStats(DEFAULT_STATS);
                setCoachBrief(null);
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            subscription();
        };
    }, []);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const now = getLocalDate();
                if (now !== currentDate) {
                    setCurrentDate(now);
                    checkStreak(userStats, now);
                    loadDailyWord(userStats);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [currentDate, userStats]);

    const loadUserStats = async (userId: string) => {
        setDataLoading(true);
        try {
            // No more artificial timeout race here. Just await the result.
            const stats = await authService.getUserStats(userId);

            if (stats.vocabItems && stats.vocabItems.length !== stats.wordsLearned) {
                stats.wordsLearned = stats.vocabItems.length;
            }

            checkStreak(stats, getLocalDate());
            setUserStats(stats);
            return stats;
        } catch (e) {
            console.error("Failed to load stats, using default", e);
            const fallback = { ...DEFAULT_STATS, userId };
            setUserStats(fallback);
            return fallback;
        } finally {
            setDataLoading(false);
            setLoading(false);
        }
    }

    const checkStreak = (stats: UserStats, today: string) => {
        const lastDate = new Date(stats.lastLoginDate);
        const currentDateObj = new Date(today);
        const diffTime = Math.abs(currentDateObj.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (stats.lastLoginDate !== today) {
            if (diffDays > 1) {
                stats.streak = 0;
            }
            stats.lastLoginDate = today;
            if (stats.userId) {
                authService.saveUserStats(stats.userId, stats);
            }
        }
        setUserStats(stats);
    };

    const loadDailyWord = (currentStats: UserStats) => {
        const today = getLocalDate();
        if (currentStats.currentDailyWord && currentStats.currentDailyWord.date === today) {
            setDailyWord(currentStats.currentDailyWord);
            return;
        }
        const entry = getDailyWordForDate(today);
        const w: DailyWord = {
            word: entry.word,
            type: entry.type,
            definition: entry.meaning,
            example: entry.example,
            date: today
        };
        setDailyWord(w);
        const newStats = { ...currentStats, currentDailyWord: w };
        setUserStats(newStats);
        if (newStats.userId) {
            authService.saveUserStats(newStats.userId, newStats);
        }
    };

    const handleLogin = async (user: UserAccount) => {
        if (lastUserIdRef.current !== user.id) {
            lastUserIdRef.current = user.id;
            setCurrentUser(user);
            setLoading(true);
            const loadedStats = await loadUserStats(user.id);
            if (loadedStats) {
                loadDailyWord(loadedStats);
            }
            if (userStats.soundEnabled) playSound('success');
        }
    };

    const handleUpdateStats = (newStats: UserStats) => {
        if (newStats.vocabItems) {
            newStats.wordsLearned = newStats.vocabItems.length;
        }
        setUserStats(newStats);

        const uid = currentUser?.id || newStats.userId;
        if (uid) {
            authService.saveUserStats(uid, newStats);
        }
    };

    const handleUpdateVocabItems = (newItems: VocabItem[]) => {
        setUserStats(prev => {
            const newStats = {
                ...prev,
                vocabItems: newItems,
                wordsLearned: newItems.length
            };
            const uid = currentUser?.id || prev.userId;
            if (uid) authService.saveUserStats(uid, newStats);
            return newStats;
        });
    };

    const handleAddVocabItem = (newItem: VocabItem, xpBonus: number = 0, strengthTag?: string) => {
        setUserStats((prevStats) => {
            const currentItems = Array.isArray(prevStats.vocabItems) ? [...prevStats.vocabItems] : [];
            const newItemWord = newItem.word.toLowerCase().trim();
            const isDuplicate = currentItems.some(v => v.word.toLowerCase().trim() === newItemWord);

            if (isDuplicate) return prevStats;

            const now = new Date();
            const dayOfWeek = now.getDay();
            const daysUntilSaturday = 6 - dayOfWeek;

            let daysToAdd = daysUntilSaturday;
            if (daysToAdd <= 0) daysToAdd += 7;
            if (Math.random() > 0.5) daysToAdd += 1;
            if (dayOfWeek === 5) daysToAdd = 1;

            const nextReviewDate = new Date();
            nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);
            const nextReviewStr = nextReviewDate.toISOString().split('T')[0];

            const itemWithDelay = { ...newItem, nextReview: nextReviewStr };

            currentItems.unshift(itemWithDelay);

            const newStats = {
                ...prevStats,
                vocabItems: currentItems,
                wordsLearned: currentItems.length,
                xp: prevStats.xp + xpBonus
            };

            if (strengthTag) {
                const existingStrengths = prevStats.learningProfile.strengths || [];
                if (!existingStrengths.includes(strengthTag)) {
                    newStats.learningProfile = {
                        ...prevStats.learningProfile,
                        strengths: [...existingStrengths, strengthTag]
                    };
                }
            }

            const uid = prevStats.userId;
            if (uid) {
                authService.saveUserStats(uid, newStats);
            }
            return newStats;
        });
    }

    const handleDeleteVocabItem = (wordToDelete: string) => {
        setUserStats((prevStats) => {
            const currentItems = Array.isArray(prevStats.vocabItems) ? [...prevStats.vocabItems] : [];
            const newItems = currentItems.filter(v => v.word.toLowerCase().trim() !== wordToDelete.toLowerCase().trim());

            const newStats = {
                ...prevStats,
                vocabItems: newItems,
                wordsLearned: newItems.length
            };

            const uid = prevStats.userId;
            if (uid) {
                authService.saveUserStats(uid, newStats);
            }
            return newStats;
        });
    }

    const handleSaveLesson = (topicId: string, content: LessonContent | null) => {
        if (!content) return;
        setUserStats(prev => {
            const newCache = { ...prev.lessonCache, [topicId]: content };
            const newStats = { ...prev, lessonCache: newCache };
            if (prev.userId) authService.saveUserStats(prev.userId, newStats);
            return newStats;
        });
    };

    const handleSessionComplete = () => {
        setUserStats(prev => {
            const newStats = {
                ...prev,
                speakingSessionsCompleted: (prev.speakingSessionsCompleted || 0) + 1,
                xp: prev.xp + 50,
                streak: prev.streak === 0 ? 1 : prev.streak
            };
            if (prev.soundEnabled) playSound('complete');
            if (prev.userId) authService.saveUserStats(prev.userId, newStats);
            return newStats;
        });
    };

    const handleTutorComplete = (topicId: string, type: 'GRAMMAR' | 'VOCABULARY') => {
        setUserStats(prev => {
            const newStats = { ...prev };
            if (type === 'GRAMMAR') {
                if (!newStats.grammarProgress.includes(topicId)) {
                    newStats.grammarProgress = [...newStats.grammarProgress, topicId];
                    newStats.xp += 100;
                    newStats.level = Math.floor(newStats.xp / 1000) + 1;
                }
            } else {
                if (!newStats.vocabProgress.includes(topicId)) {
                    newStats.vocabProgress = [...newStats.vocabProgress, topicId];
                    newStats.xp += 100;
                    newStats.level = Math.floor(newStats.xp / 1000) + 1;
                }
            }
            if (prev.userId) authService.saveUserStats(prev.userId, newStats);
            return newStats;
        });
    };

    const handleNavigate = (section: AppSection) => {
        if (userStats.soundEnabled) playSound('click');

        setIsTransitioning(true);
        setRenderKey(prev => prev + 1);

        setTimeout(() => {
            setActiveSection(section);
            setIsTransitioning(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center transition-colors duration-500">
                <div className="relative w-24 h-24 mb-8">
                    <div className="absolute inset-0 bg-indigo-500 rounded-full opacity-20 animate-ping"></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-full shadow-xl p-6 flex items-center justify-center border-4 border-indigo-100 dark:border-slate-800">
                        <span className="text-4xl animate-bounce">🚀</span>
                    </div>
                </div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2 font-game tracking-tight">B2 Buddy</h1>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Initializing...</p>
            </div>
        );
    }

    if (!currentUser) {
        return <AuthScreen onLogin={handleLogin} />;
    }

    return (
        <NotificationProvider soundEnabled={userStats.soundEnabled}>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-500 flex flex-col md:flex-row">
                <Sidebar
                    activeSection={activeSection}
                    onNavigate={handleNavigate}
                    userStats={userStats}
                    themeColor={userStats.themeColor}
                />
                <main
                    key={renderKey}
                    id="main-content-area"
                    className={`flex-1 relative overflow-x-hidden transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
                >
                    {activeSection === AppSection.DASHBOARD && (
                        <Dashboard
                            onChangeSection={handleNavigate}
                            dailyWord={dailyWord}
                            stats={userStats}
                            coachBrief={coachBrief}
                            setCoachBrief={setCoachBrief}
                            onCollectDailyWord={(word) => {
                                setPendingSearchTerm(word);
                                handleNavigate(AppSection.DICTIONARY);
                            }}
                        />
                    )}
                    {activeSection === AppSection.SPEAKING && (
                        <SpeakingCoach
                            onSessionComplete={handleSessionComplete}
                            onUpdateStats={handleUpdateStats}
                            stats={userStats}
                        />
                    )}
                    {activeSection === AppSection.LISTENING && (
                        <ListeningLounge
                            stats={userStats}
                            onUpdateStats={handleUpdateStats}
                        />
                    )}
                    {activeSection === AppSection.ESSAY_TUTOR && (
                        <WritingTutor
                            stats={userStats}
                            onUpdateStats={handleUpdateStats}
                        />
                    )}
                    {activeSection === AppSection.PROFILE && (
                        <UserProfile
                            stats={userStats}
                            onUpdateStats={handleUpdateStats}
                        />
                    )}
                    {activeSection === AppSection.GRAMMAR && (
                        <UniversalTutor
                            type="GRAMMAR"
                            completedTopics={userStats.grammarProgress}
                            onCompleteTopic={(id) => handleTutorComplete(id, 'GRAMMAR')}
                            profile={userStats.learningProfile}
                            onUpdateProfile={(p) => handleUpdateStats({ ...userStats, learningProfile: p })}
                            soundEnabled={userStats.soundEnabled}
                            lessonCache={userStats.lessonCache}
                            onSaveLesson={handleSaveLesson}
                        />
                    )}
                    {activeSection === AppSection.VOCABULARY && (
                        <UniversalTutor
                            type="VOCABULARY"
                            completedTopics={userStats.vocabProgress}
                            onCompleteTopic={(id) => handleTutorComplete(id, 'VOCABULARY')}
                            profile={userStats.learningProfile}
                            onUpdateProfile={(p) => handleUpdateStats({ ...userStats, learningProfile: p })}
                            soundEnabled={userStats.soundEnabled}
                            lessonCache={userStats.lessonCache}
                            onSaveLesson={handleSaveLesson}
                        />
                    )}
                    {activeSection === AppSection.SETTINGS && (
                        <Settings
                            stats={userStats}
                            onUpdateStats={handleUpdateStats}
                            onReset={() => {
                                authService.logout();
                                setCurrentUser(null);
                                setUserStats(DEFAULT_STATS);
                                lastUserIdRef.current = null;
                            }}
                        />
                    )}
                    {activeSection === AppSection.READING && (
                        <ReadingRoom
                            stats={userStats}
                            onUpdateStats={handleUpdateStats}
                        />
                    )}
                    {activeSection === AppSection.DRILL && (
                        <DrillSergeant
                            stats={userStats}
                            onUpdateStats={handleUpdateStats}
                        />
                    )}
                    {activeSection === AppSection.DICTIONARY && (
                        <DictionaryVault
                            stats={userStats}
                            onUpdateStats={handleUpdateStats}
                            onAddVocabItem={handleAddVocabItem}
                            onDeleteVocabItem={handleDeleteVocabItem}
                            initialSearchTerm={pendingSearchTerm}
                            onClearInitialSearch={() => setPendingSearchTerm(null)}
                        />
                    )}
                    {activeSection === AppSection.EXAM && (
                        <ExamMode
                            stats={userStats}
                            onUpdateStats={handleUpdateStats}
                            onExit={() => handleNavigate(AppSection.DASHBOARD)}
                        />
                    )}
                </main>
            </div>
        </NotificationProvider>
    );
};

export default App;
