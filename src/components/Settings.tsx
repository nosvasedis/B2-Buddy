
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { UserStats } from '../types';
import { authService } from '../services/authService';

interface SettingsProps {
    stats: UserStats;
    onUpdateStats: (newStats: UserStats) => void;
    onReset: () => void;
}

const Settings: React.FC<SettingsProps> = ({ stats, onUpdateStats, onReset }) => {
    const [modalConfig, setModalConfig] = useState<{isOpen: boolean, type: 'RESET' | 'DELETE' | 'LOGOUT' | 'PURGE' | null}>({ isOpen: false, type: null });
    const [loading, setLoading] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isAppInstalled, setIsAppInstalled] = useState(false);

    const theme = stats.themeColor || 'indigo';
    const colorMode = stats.colorMode || 'auto';

    // Check if app is already installed
    useEffect(() => {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsAppInstalled(true);
        }
    }, []);

    // Listen for the 'beforeinstallprompt' event to enable the Install button
    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsAppInstalled(true);
        }
    };

    // Theme Maps
    const themeColors: Record<string, string> = {
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
        pink: 'text-pink-600 bg-pink-50 border-pink-200 hover:bg-pink-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
        orange: 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100',
        blue: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100',
        purple: 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100',
        teal: 'text-teal-600 bg-teal-50 border-teal-200 hover:bg-teal-100',
        rose: 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100',
    };

    const themeButton: Record<string, string> = {
        indigo: 'bg-indigo-600 shadow-indigo-200',
        pink: 'bg-pink-600 shadow-pink-200',
        emerald: 'bg-emerald-600 shadow-emerald-200',
        orange: 'bg-orange-600 shadow-orange-200',
        blue: 'bg-blue-600 shadow-blue-200',
        purple: 'bg-purple-600 shadow-purple-200',
        teal: 'bg-teal-600 shadow-teal-200',
        rose: 'bg-rose-600 shadow-rose-200',
    };

    const handleAction = async () => {
        setLoading(true);
        try {
            // Fallback: Get ID from session if stats.userId is missing
            let uid = stats.userId;
            if (!uid && modalConfig.type !== 'LOGOUT') {
                const session = await authService.getSession();
                uid = session?.id;
            }

            if (modalConfig.type === 'RESET' && uid) {
                const resetStats = await authService.resetUserProgress(uid, stats);
                onUpdateStats(resetStats);
                setModalConfig({ isOpen: false, type: null });
            } 
            else if (modalConfig.type === 'PURGE' && uid) {
                // Clear all content caches but keep progress
                const newStats = {
                    ...stats,
                    lessonCache: {},
                    readingCache: {},
                    drillCache: {},
                    listeningCache: {},
                    essayModels: {}
                };
                // Save to cloud
                await authService.saveUserStats(uid, newStats);
                onUpdateStats(newStats);
                setModalConfig({ isOpen: false, type: null });
            }
            else if (modalConfig.type === 'DELETE' && uid) {
                await authService.deleteAccount(uid);
                setModalConfig({ isOpen: false, type: null });
                onReset(); // Trigger Logout/Reset in App
            }
            else if (modalConfig.type === 'LOGOUT') {
                onReset(); // Trigger Logout in App
                setModalConfig({ isOpen: false, type: null });
            }
        } catch (e: any) {
            console.error("Action failed", e);
            alert(`Error: ${e.message || "Operation failed"}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleSound = () => {
        onUpdateStats({ ...stats, soundEnabled: !stats.soundEnabled });
    };

    const toggleNotifications = async () => {
        if (!stats.notificationsEnabled) {
            // User is enabling notifications - Request Permission
            if ('Notification' in window) {
                try {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') {
                        alert("Please allow notifications in your browser settings to enable reminders.");
                        // Don't update state if permission denied
                        return;
                    }
                } catch (e) {
                    console.error("Notification permission error", e);
                }
            }
        }
        onUpdateStats({ ...stats, notificationsEnabled: !stats.notificationsEnabled });
    };

    const setMode = (mode: 'auto' | 'light' | 'dark') => {
        onUpdateStats({ ...stats, colorMode: mode });
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdateStats({ ...stats, targetExamDate: e.target.value });
    };

    // Calculate days until exam
    let daysLeft = null;
    if (stats.targetExamDate) {
        const today = new Date();
        const exam = new Date(stats.targetExamDate);
        const diff = exam.getTime() - today.getTime();
        daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
    }

    const getModalContent = () => {
        switch(modalConfig.type) {
            case 'LOGOUT':
                return {
                    icon: '👋',
                    title: 'Log Out?',
                    desc: 'You can log back in anytime to continue your progress.',
                    confirmText: 'Log Out',
                    confirmColor: 'bg-slate-800 hover:bg-black border-slate-900',
                    iconBg: 'bg-slate-100 text-slate-800'
                };
            case 'DELETE':
                return {
                    icon: '💀',
                    title: 'Delete Account?',
                    desc: 'This action is PERMANENT. All your XP, levels, and history will be wiped forever.',
                    confirmText: 'Delete Everything',
                    confirmColor: 'bg-red-600 hover:bg-red-700 border-red-800',
                    iconBg: 'bg-red-100 text-red-500'
                };
            case 'RESET':
                return {
                    icon: '🔄',
                    title: 'Reset Progress?',
                    desc: 'This will reset your Level to 1 and clear your streaks. Your account settings will remain.',
                    confirmText: 'Reset Progress',
                    confirmColor: 'bg-orange-500 hover:bg-orange-600 border-orange-700',
                    iconBg: 'bg-orange-100 text-orange-500'
                };
            case 'PURGE':
                return {
                    icon: '🧼',
                    title: 'Purge Cache?',
                    desc: 'This will delete all downloaded lessons, stories, and audio. You will need internet to regenerate them.',
                    confirmText: 'Clear All Cache',
                    confirmColor: 'bg-yellow-500 hover:bg-yellow-600 border-yellow-700',
                    iconBg: 'bg-yellow-100 text-yellow-500'
                };
            default:
                return { icon: '', title: '', desc: '', confirmText: '', confirmColor: '', iconBg: '' };
        }
    };

    const modalContent = getModalContent();

    // MODAL PORTAL
    const renderModal = () => {
        if (!modalConfig.isOpen) return null;
        
        return ReactDOM.createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl max-w-md w-full p-8 animate-scale-in relative overflow-hidden border border-white/20">
                    <div className={`absolute top-0 left-0 w-full h-2 ${
                        modalConfig.type === 'DELETE' ? 'bg-red-500' : 
                        modalConfig.type === 'RESET' ? 'bg-orange-500' : 
                        modalConfig.type === 'PURGE' ? 'bg-yellow-500' :
                        'bg-slate-800'
                    }`}></div>
                    
                    <div className="mb-6 text-center">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 ${modalContent.iconBg}`}>
                            {modalContent.icon}
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white">
                            {modalContent.title}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">
                            {modalContent.desc}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setModalConfig({isOpen: false, type: null})}
                            className="flex-1 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleAction}
                            disabled={loading}
                            className={`flex-1 py-4 rounded-xl font-black text-white shadow-lg transition-transform active:scale-95 border-b-4 active:border-b-0 active:translate-y-1 ${modalContent.confirmColor}`}
                        >
                            {loading ? 'Processing...' : modalContent.confirmText}
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    };

    return (
        <div className="max-w-5xl mx-auto pb-12 pt-4 px-4 relative">
            {/* RENDER MODAL VIA PORTAL */}
            {renderModal()}

            <div className="mb-10 animate-enter">
                <div className={`bg-gradient-to-br from-slate-700 to-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white flex flex-col md:flex-row items-center gap-6 relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                    <div className="relative z-10 text-center md:text-left">
                        <h1 className="text-4xl font-black font-game tracking-tight">System Config</h1>
                        <p className="text-white/60 font-medium mt-2 uppercase tracking-widest text-xs">Control Panel & Preferences</p>
                    </div>
                    <div className="ml-auto relative z-10 text-6xl animate-[spin_10s_linear_infinite]">⚙️</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up opacity-0" style={{animationFillMode: 'forwards', animationDelay: '0.1s'}}>
                
                {/* Exam Configuration */}
                <div className={`rounded-[2.5rem] shadow-xl border-2 p-8 flex flex-col relative overflow-hidden group transition-colors ${themeColors[theme] || themeColors['indigo']} bg-opacity-90 backdrop-blur-xl dark:bg-slate-800 dark:border-slate-700`}>
                    
                    <h2 className="text-2xl font-bold mb-6 flex items-center dark:text-white">
                        <span className="bg-white/50 p-2 rounded-xl mr-3 text-2xl shadow-sm dark:bg-slate-700">📅</span>
                        Exam Target
                    </h2>

                    <div className="space-y-6 relative z-10">
                        <div>
                            <label className="block text-xs font-bold opacity-60 uppercase tracking-wider mb-2 dark:text-slate-300">When is your B2 Exam?</label>
                            <input 
                                type="date" 
                                value={stats.targetExamDate || ''}
                                onChange={handleDateChange}
                                className="w-full p-4 bg-white/50 border-2 border-white/50 rounded-2xl font-bold outline-none focus:bg-white transition-all text-slate-800 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            />
                        </div>

                        {daysLeft !== null && (
                            <div className={`rounded-2xl p-6 text-white text-center shadow-lg ${themeButton[theme]}`}>
                                <p className="opacity-80 font-medium text-sm uppercase tracking-widest mb-1">Countdown</p>
                                <p className="text-5xl font-black mb-1">{daysLeft > 0 ? daysLeft : 0}</p>
                                <p className="font-bold opacity-90">Days Remaining</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Preferences */}
                <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white p-8 flex flex-col relative overflow-hidden dark:bg-slate-800 dark:border-slate-700">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center">
                        <span className="bg-slate-100 p-2 rounded-xl mr-3 text-2xl dark:bg-slate-700">🎛️</span>
                        Preferences
                    </h2>

                    <div className="space-y-4 relative z-10">
                        {/* Appearance Toggle */}
                        <div className="p-4 rounded-2xl border-2 border-gray-200 bg-white dark:bg-slate-700 dark:border-slate-600 transition-all">
                             <div className="flex items-center gap-4 mb-3">
                                 <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
                                     🌗
                                 </div>
                                 <div className="text-left">
                                     <h3 className="font-bold text-lg text-slate-800 dark:text-white">Appearance</h3>
                                     <p className="text-xs text-gray-400">Theme Mode</p>
                                 </div>
                             </div>
                             <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                 {['auto', 'light', 'dark'].map((m) => (
                                     <button
                                         key={m}
                                         onClick={() => setMode(m as 'auto' | 'light' | 'dark')}
                                         className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${colorMode === m ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                     >
                                         {m}
                                     </button>
                                 ))}
                             </div>
                        </div>

                        {/* PWA INSTALL BUTTON */}
                        {deferredPrompt && !isAppInstalled && (
                            <button 
                                type="button"
                                onClick={handleInstallClick}
                                className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 border-indigo-500 bg-indigo-50 transition-all hover:shadow-md hover:bg-indigo-100 group animate-bounce-in dark:bg-indigo-900 dark:border-indigo-700`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-indigo-200 text-indigo-700 group-hover:scale-110 transition-transform dark:bg-indigo-800 dark:text-indigo-300">
                                        📱
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-lg text-indigo-900 dark:text-indigo-100">Install App</h3>
                                        <p className="text-xs text-indigo-500 font-bold dark:text-indigo-300">Add to Home Screen</p>
                                    </div>
                                </div>
                                <div className="w-14 h-8 flex items-center justify-center">
                                     <span className="text-xl">📥</span>
                                </div>
                            </button>
                        )}

                        {/* Sound Toggle */}
                        <button 
                            type="button"
                            onClick={toggleSound}
                            className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all hover:shadow-md ${stats.soundEnabled ? 'border-green-500 bg-green-50 dark:bg-green-900/30 dark:border-green-800' : 'border-gray-200 bg-white dark:bg-slate-700 dark:border-slate-600'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${stats.soundEnabled ? 'bg-green-200 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-400 dark:bg-slate-600 dark:text-slate-400'}`}>
                                    {stats.soundEnabled ? '🔊' : '🔇'}
                                </div>
                                <div className="text-left">
                                    <h3 className={`font-bold text-lg ${stats.soundEnabled ? 'text-green-900 dark:text-green-100' : 'text-gray-500 dark:text-slate-400'}`}>Sound Effects</h3>
                                    <p className="text-xs text-gray-400">Mascot voice & interactions</p>
                                </div>
                            </div>
                            <div className={`w-14 h-8 rounded-full p-1 transition-colors ${stats.soundEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                                <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${stats.soundEnabled ? 'translate-x-6' : ''}`}></div>
                            </div>
                        </button>

                        {/* Notifications Toggle */}
                        <button 
                            type="button"
                            onClick={toggleNotifications}
                            className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all hover:shadow-md ${stats.notificationsEnabled ? `border-${theme}-500 bg-${theme}-50 dark:bg-${theme}-900/30 dark:border-${theme}-800` : 'border-gray-200 bg-white dark:bg-slate-700 dark:border-slate-600'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${stats.notificationsEnabled ? `bg-${theme}-200 text-${theme}-700 dark:bg-${theme}-900 dark:text-${theme}-300` : 'bg-gray-100 text-gray-400 dark:bg-slate-600 dark:text-slate-400'}`}>
                                    {stats.notificationsEnabled ? '🔔' : '🔕'}
                                </div>
                                <div className="text-left">
                                    <h3 className={`font-bold text-lg ${stats.notificationsEnabled ? `text-${theme}-900 dark:text-${theme}-100` : 'text-gray-500 dark:text-slate-400'}`}>Daily Reminders</h3>
                                    <p className="text-xs text-gray-400">Streak & Word of the Day</p>
                                </div>
                            </div>
                            <div className={`w-14 h-8 rounded-full p-1 transition-colors ${stats.notificationsEnabled ? `bg-${theme}-500` : 'bg-gray-300 dark:bg-slate-600'}`}>
                                <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${stats.notificationsEnabled ? 'translate-x-6' : ''}`}></div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Account Zone */}
                 <div className="lg:col-span-2 space-y-4">
                     
                     {/* Danger Zone - NOW WITH 3 BUTTONS */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         {/* Reset Data */}
                         <div className="bg-orange-50/90 backdrop-blur-sm rounded-[2.5rem] border-2 border-orange-100 p-6 flex flex-col justify-between dark:bg-orange-900/20 dark:border-orange-800">
                             <div className="mb-6">
                                 <h3 className="font-bold text-lg text-orange-800 flex items-center gap-2 mb-1 dark:text-orange-200">
                                     🔄 Reset Progress
                                 </h3>
                                 <p className="text-orange-600/70 text-xs dark:text-orange-300/70">Clear XP, Levels, and Streaks. Keeps your account.</p>
                             </div>
                             <button 
                                type="button"
                                onClick={() => setModalConfig({ isOpen: true, type: 'RESET' })}
                                className="w-full px-6 py-3 bg-white border-2 border-orange-200 text-orange-600 rounded-xl font-bold shadow-sm hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all dark:bg-orange-900 dark:border-orange-700 dark:text-orange-200 dark:hover:bg-orange-700 text-sm"
                             >
                                 Clear Stats
                             </button>
                         </div>

                         {/* Purge Cache (New) */}
                         <div className="bg-yellow-50/90 backdrop-blur-sm rounded-[2.5rem] border-2 border-yellow-100 p-6 flex flex-col justify-between dark:bg-yellow-900/20 dark:border-yellow-800">
                             <div className="mb-6">
                                 <h3 className="font-bold text-lg text-yellow-800 flex items-center gap-2 mb-1 dark:text-yellow-200">
                                     🧼 Purge Cache
                                 </h3>
                                 <p className="text-yellow-600/70 text-xs dark:text-yellow-300/70">Delete all downloaded lessons and audio. Regain storage.</p>
                             </div>
                             <button 
                                type="button"
                                onClick={() => setModalConfig({ isOpen: true, type: 'PURGE' })}
                                className="w-full px-6 py-3 bg-white border-2 border-yellow-200 text-yellow-600 rounded-xl font-bold shadow-sm hover:bg-yellow-500 hover:text-white hover:border-yellow-500 transition-all dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200 dark:hover:bg-yellow-700 text-sm"
                             >
                                 Clear Cache
                             </button>
                         </div>

                         {/* Delete Account */}
                         <div className="bg-red-50/90 backdrop-blur-sm rounded-[2.5rem] border-2 border-red-100 p-6 flex flex-col justify-between dark:bg-red-900/20 dark:border-red-800">
                             <div className="mb-6">
                                 <h3 className="font-bold text-lg text-red-800 flex items-center gap-2 mb-1 dark:text-red-200">
                                     💀 Delete Account
                                 </h3>
                                 <p className="text-red-600/70 text-xs dark:text-red-300/70">Permanently remove account. Cannot be undone.</p>
                             </div>
                             <button 
                                type="button"
                                onClick={() => setModalConfig({ isOpen: true, type: 'DELETE' })}
                                className="w-full px-6 py-3 bg-white border-2 border-red-200 text-red-600 rounded-xl font-bold shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all dark:bg-red-900 dark:border-red-700 dark:text-red-200 dark:hover:bg-red-700 text-sm"
                             >
                                 Delete Account
                             </button>
                         </div>
                     </div>

                     {/* Log Out - MOVED TO BOTTOM */}
                     <div className="bg-slate-50/90 backdrop-blur-sm rounded-[2.5rem] border-2 border-slate-200 p-8 flex flex-col md:flex-row items-center justify-between gap-6 dark:bg-slate-800 dark:border-slate-700">
                         <div>
                             <h3 className="font-bold text-xl text-slate-700 flex items-center gap-2 dark:text-slate-200">
                                 👋 Log Out
                             </h3>
                             <p className="text-slate-500 text-sm mt-1 dark:text-slate-400">Sign out of your account on this device.</p>
                         </div>
                         <button 
                            type="button"
                            onClick={() => setModalConfig({ isOpen: true, type: 'LOGOUT' })}
                            className="px-8 py-4 bg-white border-2 border-slate-300 text-slate-700 rounded-2xl font-bold shadow-lg hover:bg-slate-800 hover:text-white hover:border-slate-800 transition-all transform hover:scale-105 whitespace-nowrap dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:hover:bg-slate-600"
                         >
                             Log Out
                         </button>
                     </div>

                </div>
            </div>
            
            <div className="mt-12 text-center opacity-60">
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest">B2 Buddy • v2.9.5</p>
                <p className="text-slate-300 text-[10px] mt-2 font-mono dark:text-slate-600">ID: {stats.name?.toLowerCase().replace(/\s/g, '-') || 'user'}_{stats.level}</p>
            </div>
        </div>
    );
};

export default Settings;
