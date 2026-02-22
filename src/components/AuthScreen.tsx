
import React, { useState } from 'react';
import { authService } from '../services/authService';
import { UserAccount } from '../types';

interface AuthScreenProps {
    onLogin: (user: UserAccount) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
    const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!email || !password) {
            setError("Please fill in email and password");
            setLoading(false);
            return;
        }

        if (mode === 'REGISTER' && !username) {
            setError("Please pick a username");
            setLoading(false);
            return;
        }

        // RACE CONDITION TIMEOUT
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Connection timeout. Check internet or try again later.")), 10000)
        );

        try {
            if (mode === 'REGISTER') {
                const result: any = await Promise.race([
                    authService.register(username, email, password),
                    timeoutPromise
                ]);

                if (result.success && result.user) {
                    onLogin(result.user);
                } else {
                    setError(result.message || "Registration failed");
                }
            } else {
                const result: any = await Promise.race([
                    authService.login(email, password),
                    timeoutPromise
                ]);

                if (result.success && result.user) {
                    onLogin(result.user);
                } else {
                    setError(result.message || "Login failed");
                }
            }
        } catch (e: any) {
            setError(e.message || "An unexpected error occurred");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
            {/* Background Animations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-300 dark:bg-purple-900 rounded-full blur-[120px] opacity-40 dark:opacity-20 animate-[pulse_8s_infinite]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-300 dark:bg-indigo-900 rounded-full blur-[120px] opacity-40 dark:opacity-20 animate-[pulse_8s_infinite]" style={{ animationDelay: '4s' }}></div>
                <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-pink-300 dark:bg-pink-900 rounded-full blur-[80px] opacity-30 dark:opacity-10 animate-bounce" style={{ animationDuration: '10s' }}></div>
            </div>

            <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl dark:shadow-none p-8 relative z-10 border border-white dark:border-slate-800 animate-scale-in overflow-hidden transition-all duration-500">

                {/* Header */}
                <div className="text-center mb-8 relative">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-lg shadow-indigo-200/50 dark:shadow-none mx-auto mb-6 transform rotate-3 transition-transform hover:rotate-12 duration-500 group cursor-default">
                        <span className="group-hover:scale-125 transition-transform">🚀</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">B2 Buddy</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-widest">Cloud-synced Exam Prep</p>
                </div>

                {/* Animated Tab Switcher */}
                <div className="relative bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-8 flex h-14">
                    {/* Sliding Background Pill */}
                    <div
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-700 rounded-xl shadow-sm transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-0
                        ${mode === 'LOGIN' ? 'left-1' : 'left-[calc(50%)]'}`}
                    ></div>

                    <button
                        onClick={() => { setMode('LOGIN'); setError(''); }}
                        className={`flex-1 rounded-xl text-sm font-black transition-colors duration-300 relative z-10 h-full ${mode === 'LOGIN' ? 'text-indigo-600 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                        LOG IN
                    </button>
                    <button
                        onClick={() => { setMode('REGISTER'); setError(''); }}
                        className={`flex-1 rounded-xl text-sm font-black transition-colors duration-300 relative z-10 h-full ${mode === 'REGISTER' ? 'text-indigo-600 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                        SIGN UP
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-2">
                    {/* Username Field - Animated Expand/Collapse */}
                    <div className={`transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${mode === 'REGISTER' ? 'max-h-32 opacity-100 translate-y-0 mb-4' : 'max-h-0 opacity-0 -translate-y-4 mb-0'}`}>
                        <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 ml-2">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all placeholder:font-medium dark:placeholder:text-slate-600 focus:shadow-lg focus:shadow-indigo-100/50 dark:focus:shadow-none"
                            placeholder="e.g. EnglishPro2025"
                            tabIndex={mode === 'REGISTER' ? 0 : -1}
                        />
                    </div>

                    <div className="group">
                        <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 ml-2 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all placeholder:font-medium dark:placeholder:text-slate-600 focus:shadow-lg focus:shadow-indigo-100/50 dark:focus:shadow-none"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="group pt-4">
                        <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 ml-2 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all placeholder:font-medium dark:placeholder:text-slate-600 focus:shadow-lg focus:shadow-indigo-100/50 dark:focus:shadow-none"
                            placeholder="••••••••"
                        />
                    </div>

                    {/* Error Message Animation */}
                    <div className={`overflow-hidden transition-all duration-300 ${error ? 'max-h-20 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-300 p-3 rounded-xl text-xs font-bold text-center border border-red-100 dark:border-red-800 flex items-center justify-center gap-2">
                            <span className="text-lg">⚠️</span> {error}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-200/50 dark:shadow-none hover:bg-indigo-700 hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-70 disabled:transform-none mt-8 relative overflow-hidden"
                    >
                        {/* Button Content Animation */}
                        <div className={`relative z-10 flex items-center justify-center gap-2 transition-all duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}>
                            {mode === 'LOGIN' ? 'Start Learning' : 'Create Account'} <span>→</span>
                        </div>

                        {/* Loader */}
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center z-20">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            </div>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-bold transition-colors">
                        {mode === 'LOGIN' ? "Don't have an account?" : "Already have an account?"}
                        <button
                            onClick={() => { setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN'); setError(''); }}
                            className="text-indigo-600 dark:text-indigo-400 font-black ml-1 hover:underline decoration-2 underline-offset-4"
                        >
                            {mode === 'LOGIN' ? 'Sign Up' : 'Log In'}
                        </button>
                    </p>
                </div>
            </div>

            <div className="absolute bottom-6 flex items-center gap-2 text-slate-400/50 dark:text-slate-600 text-[10px] font-black uppercase tracking-widest animate-fade-in">
                <div className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                Connected to Firebase Cloud
            </div>
        </div>
    );
};

export default AuthScreen;
