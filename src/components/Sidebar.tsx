
import React, { useState, useEffect } from 'react';
import { AppSection, UserStats } from '../types';
import { playSound } from '../services/soundService';

interface SidebarProps {
    activeSection: AppSection;
    onNavigate: (section: AppSection) => void;
    userStats: UserStats;
    themeColor?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onNavigate, userStats, themeColor = 'indigo' }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Dynamic Theme Classes
    const themeClasses: Record<string, { bg: string, text: string, border: string, shadow: string, gradient: string }> = {
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', shadow: 'shadow-indigo-200', gradient: 'from-indigo-500 to-purple-600' },
        pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', shadow: 'shadow-pink-200', gradient: 'from-pink-500 to-rose-600' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', shadow: 'shadow-emerald-200', gradient: 'from-emerald-500 to-teal-600' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', shadow: 'shadow-orange-200', gradient: 'from-orange-500 to-red-600' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', shadow: 'shadow-blue-200', gradient: 'from-blue-500 to-indigo-600' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', shadow: 'shadow-purple-200', gradient: 'from-purple-500 to-fuchsia-600' },
        teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', shadow: 'shadow-teal-200', gradient: 'from-teal-500 to-emerald-600' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', shadow: 'shadow-rose-200', gradient: 'from-rose-500 to-pink-600' },
        cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', shadow: 'shadow-cyan-200', gradient: 'from-cyan-500 to-sky-600' },
        fuchsia: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', border: 'border-fuchsia-200', shadow: 'shadow-fuchsia-200', gradient: 'from-fuchsia-500 to-purple-600' },
    };

    const currentTheme = themeClasses[themeColor] || themeClasses['indigo'];

    const navItems = [
        { id: AppSection.DASHBOARD, label: 'Home', icon: 'Home', color: themeColor },
        { id: AppSection.DICTIONARY, label: 'Vault', icon: 'BookOpen', color: 'fuchsia' },
        { id: AppSection.GRAMMAR, label: 'Grammar', icon: 'Puzzle', color: 'blue' },
        { id: AppSection.VOCABULARY, label: 'Vocabulary', icon: 'Sparkles', color: 'emerald' },
        { id: AppSection.DRILL, label: 'Drills', icon: 'Target', color: 'orange' },
        { id: AppSection.EXAM, label: 'Exam Mode', icon: 'Trophy', color: 'yellow' },
        { id: AppSection.SPEAKING, label: 'Speaking', icon: 'Mic', color: 'rose' },
        { id: AppSection.READING, label: 'Reading', icon: 'Book', color: 'teal' },
        { id: AppSection.LISTENING, label: 'Listening', icon: 'Radio', color: 'cyan' },
        { id: AppSection.ESSAY_TUTOR, label: 'Writing', icon: 'Pencil', color: 'pink' },
        { id: AppSection.SETTINGS, label: 'Config', icon: 'Cog', color: 'gray' },
    ];

    const getIcon = (name: string) => {
        switch (name) {
            case 'Home': return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            );
            case 'Mic': return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            );
            case 'Radio': return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
            );
            case 'Pencil': return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            );
            case 'User': return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            );
            case 'Puzzle': return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
            );
            case 'Sparkles': return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            );
            case 'Book': return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            );
            case 'Target': return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            );
            case 'Cog': return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            );
            case 'BookOpen': return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            );
            case 'Trophy': return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 21h8m-4-4v4M5 7h14m-1 0a2 2 0 01-2 2H8a2 2 0 01-2-2V5h12v2zM7 10h10v1a5 5 0 01-10 0v-1z" /></svg>
            );
            default: return null;
        }
    }

    const handleClose = () => {
        setIsAnimatingOut(true);
        setTimeout(() => {
            setIsMobileMenuOpen(false);
            setIsAnimatingOut(false);
        }, 300);
    }

    const handleMobileNavigate = (id: AppSection) => {
        onNavigate(id);
        handleClose();
    }

    const handleConfetti = () => {
        if (showConfetti) return;
        setShowConfetti(true);
        if (userStats.soundEnabled) playSound('pop');
        setTimeout(() => setShowConfetti(false), 2000);
    }

    // Calculate days remaining
    let daysLeft = null;
    if (userStats.targetExamDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exam = new Date(userStats.targetExamDate);
        const diff = exam.getTime() - today.getTime();
        daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
    }

    // Compact Countdown Pill (Sidebar & Mobile)
    const CompactCountdown = ({ className = "" }: { className?: string }) => {
        if (daysLeft === null || daysLeft < 0) return null;

        return (
            <button
                onClick={(e) => { e.stopPropagation(); handleConfetti(); }}
                className={`flex items-center gap-2 px-3 py-1 rounded-full bg-${themeColor}-50 dark:bg-${themeColor}-900/30 border border-${themeColor}-100 dark:border-${themeColor}-800 text-${themeColor}-600 dark:text-${themeColor}-300 hover:scale-105 transition-transform relative overflow-hidden group ${className}`}
            >
                <span className="text-xs font-black whitespace-nowrap">{daysLeft} Days Left</span>
                {showConfetti && (
                    <div className="absolute inset-0 z-20 pointer-events-none">
                        {[...Array(10)].map((_, i) => (
                            <div
                                key={i}
                                className={`absolute w-1.5 h-1.5 bg-${themeColor}-500 rounded-full animate-[ping_1s_ease-out_forwards]`}
                                style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}
                            ></div>
                        ))}
                    </div>
                )}
            </button>
        )
    }

    // Helper for Gamer Card to reuse in Mobile Menu
    const GamerCard = ({ isMobile = false }: { isMobile?: boolean }) => (
        <button
            onClick={() => isMobile ? handleMobileNavigate(AppSection.PROFILE) : onNavigate(AppSection.PROFILE)}
            className={`w-full bg-gradient-to-br ${currentTheme.gradient} p-4 text-white shadow-lg relative overflow-hidden group
            ${isMobile ? 'rounded-3xl mb-6' : 'rounded-[2rem] hover:scale-[1.02] transition-transform mt-auto'}
        `}
        >
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full -mr-10 -mt-10 group-hover:scale-125 transition-transform duration-700"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 bg-black opacity-10 rounded-full -ml-4 -mb-4"></div>

            <div className="flex items-center gap-3 relative z-10">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl border-2 border-white/30 shadow-inner shrink-0">
                    {userStats.avatar}
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col items-start overflow-hidden">
                    <p className="font-black text-sm truncate font-game tracking-wide text-white drop-shadow-sm w-full text-left">
                        {userStats.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 w-full">
                        <span className="bg-white/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">LVL {userStats.level}</span>
                        <span className="text-[10px] font-medium text-white/80 truncate min-w-0 flex-shrink">{userStats.xp} XP</span>
                    </div>
                </div>
                <div className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </div>
            </div>
        </button>
    );

    return (
        <>
            {/* MOBILE MENU OVERLAY */}
            {isMobileMenuOpen && (
                <div className={`fixed inset-0 z-[60] flex flex-col bg-white dark:bg-slate-900 ${isAnimatingOut ? 'animate-fade-out' : 'animate-fade-in'}`}>
                    {/* Header */}
                    <div className="p-6 flex justify-between items-center border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
                        <div className="flex flex-col items-start">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🚀</span>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white font-game">Menu</h2>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-red-500 transition-colors active:scale-90"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className={`flex-1 overflow-y-auto p-4 pb-24 ${isAnimatingOut ? 'animate-slide-down' : 'animate-slide-up'}`}>
                        {/* GAMER CARD IN MENU FOR EASY PROFILE ACCESS */}
                        <GamerCard isMobile={true} />

                        <div className="grid grid-cols-2 gap-4">
                            {navItems.map((item, index) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleMobileNavigate(item.id)}
                                    style={{ animationDelay: `${index * 0.03}s` }}
                                    className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all transform active:scale-95
                                ${activeSection === item.id
                                            ? `bg-${item.color}-50 border-${item.color}-200 text-${item.color}-600 shadow-inner dark:bg-${item.color}-900/20 dark:border-${item.color}-800 dark:text-${item.color}-300`
                                            : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-100 hover:shadow-lg dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600'
                                        }
                                animate-scale-in opacity-0 fill-mode-forwards
                            `}
                                >
                                    <div className={`mb-3 p-3 rounded-2xl ${activeSection === item.id ? `bg-white shadow-sm dark:bg-slate-700` : 'bg-gray-50 dark:bg-slate-700/50'}`}>
                                        {getIcon(item.icon)}
                                    </div>
                                    <span className="font-black text-xs md:text-sm">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* DESKTOP SIDEBAR */}
            <aside className="hidden md:flex w-72 h-screen sticky top-0 z-50 flex-col">
                <div className="flex-1 bg-white dark:bg-slate-900 m-4 rounded-[2.5rem] shadow-xl border-4 border-slate-50 dark:border-slate-800 flex flex-col overflow-hidden animate-slide-in-right relative transition-colors">

                    {/* Logo Area - THEMED */}
                    <div className={`p-6 flex flex-col ${currentTheme.bg} bg-opacity-50 dark:bg-opacity-10`}>
                        <div className="flex items-center justify-start space-x-3 mb-2">
                            <div className={`text-white p-2.5 rounded-2xl shadow-md transform rotate-[-10deg] hover:rotate-0 transition-transform duration-300 bg-gradient-to-br ${currentTheme.gradient}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <div>
                                <span className={`font-black text-2xl tracking-tight font-game ${currentTheme.text} dark:text-white`}>B2 Buddy</span>
                            </div>
                        </div>
                        {daysLeft !== null && <CompactCountdown />}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto scrollbar-hide">
                        {navItems.map((item) => {
                            const isActive = activeSection === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onNavigate(item.id)}
                                    className={`w-full flex items-center p-3.5 rounded-2xl transition-all duration-300 group relative
                        ${isActive
                                            ? `bg-${item.color}-100 text-${item.color}-600 shadow-sm font-black translate-x-1 dark:bg-${item.color}-900/30 dark:text-${item.color}-300`
                                            : 'hover:bg-slate-50 text-slate-400 hover:text-slate-600 hover:translate-x-1 dark:hover:bg-slate-800 dark:hover:text-slate-300'}
                        `}
                                >
                                    <span className={`mx-0 mr-3 transition-colors ${isActive ? `text-${item.color}-500` : 'text-slate-300 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400'}`}>
                                        {getIcon(item.icon)}
                                    </span>
                                    <span className="text-sm font-bold font-game truncate">
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* BEAUTIFIED MINI PROFILE CARD - THEMED */}
                    <div className="p-4 mt-auto">
                        <GamerCard isMobile={false} />
                    </div>
                </div>
            </aside>

            {/* MOBILE BOTTOM NAVIGATION */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 z-50 flex justify-around items-center px-2 py-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                {/* We show first 4 items. Dictionary is index 1, so it will show up. */}
                {navItems.slice(0, 4).map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl w-14 transition-all active:scale-90 ${isActive ? `text-${item.color}-600 bg-${item.color}-50 dark:bg-${item.color}-900/30 dark:text-${item.color}-400` : 'text-slate-400 dark:text-slate-600'}`}
                        >
                            <div className={`${isActive ? 'scale-110' : 'scale-100'} transition-transform duration-200`}>
                                {getIcon(item.icon)}
                            </div>
                            <span className="text-[9px] font-bold mt-1 truncate w-full text-center font-game">{item.label}</span>
                        </button>
                    );
                })}

                {/* MENU BUTTON */}
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl w-14 active:scale-90 transition-transform ${isMobileMenuOpen ? `text-${themeColor}-600 bg-${themeColor}-50 dark:bg-${themeColor}-900/30` : 'text-slate-400 dark:text-slate-600'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    <span className="text-[9px] font-bold mt-1 truncate w-full text-center font-game">Menu</span>
                </button>
            </nav>
        </>
    );
};

export default Sidebar;
