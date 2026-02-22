
import React, { useState, useRef, useMemo } from 'react';
import { UserStats } from '../types';
import { generateTeacherReport } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';
import { useNotification } from './NotificationProvider';

interface UserProfileProps {
  stats: UserStats;
  onUpdateStats: (newStats: UserStats) => void;
}

const avatars = ['👩‍🎓', '👨‍🎓', '🚀', '🐱', '🐶', '🌟', '⚡', '🎨', '⚽', '🎵', '🧠', '🤖', '🦁', '🐼'];
const accessories = ['nothing', '👓', '🧢', '🧣', '🎧', '👑', '🎒', '🎸', '💻', '🌺', '🕶️'];
const themes = ['indigo', 'pink', 'emerald', 'orange', 'blue', 'purple', 'teal', 'rose'];

const UserProfile: React.FC<UserProfileProps> = ({ stats, onUpdateStats }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(stats.name);
  const [teacherReport, setTeacherReport] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const { notify } = useNotification();
  
  const handleNameSave = () => {
    if (tempName.trim()) {
      onUpdateStats({ ...stats, name: tempName });
      notify("Gamertag Updated", "success");
    }
    setIsEditingName(false);
  };

  const readinessData = useMemo(() => {
    const totalGrammar = 60;
    const totalVocab = 60;
    return [
        { label: 'Grammar', value: Math.min(100, Math.round((stats.grammarProgress.length / totalGrammar) * 100)), icon: '🧩' },
        { label: 'Vocab', value: Math.min(100, Math.round((stats.vocabProgress.length / totalVocab) * 100)), icon: '🧠' },
        { label: 'Speaking', value: Math.min(100, (stats.speakingSessionsCompleted || 0) * 10), icon: '🎙️' },
        { label: 'Exam Focus', value: stats.streak > 5 ? 100 : stats.streak * 20, icon: '🎯' }
    ];
  }, [stats]);

  const currentLevelXp = stats.xp % 1000;
  const progressPercentage = (currentLevelXp / 1000) * 100;
  const currentTheme = stats.themeColor || 'indigo';

  const achievements = [
      { id: 'streak_7', title: 'Week Warrior', desc: '7 Day Streak', icon: '🔥', progress: stats.streak, target: 7, color: 'from-orange-400 to-red-500' },
      { id: 'vocab_50', title: 'Gem Collector', desc: '50 Words', icon: '💎', progress: stats.wordsLearned, target: 50, color: 'from-blue-400 to-indigo-500' },
      { id: 'lvl_10', title: 'Elite Student', desc: 'Reach Lvl 10', icon: '👑', progress: stats.level, target: 10, color: 'from-yellow-400 to-amber-600' },
      { id: 'speak_5', title: 'Chatterbox', desc: '5 Talks', icon: '🎙️', progress: stats.speakingSessionsCompleted || 0, target: 5, color: 'from-pink-400 to-rose-500' }
  ];

  return (
    <div className="max-w-6xl mx-auto pb-24 pt-4 px-2">
      <div className="relative mb-8 animate-enter">
          <div className={`absolute inset-0 bg-gradient-to-r from-${currentTheme}-600 to-purple-700 rounded-[3rem] opacity-30 blur-xl`}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-10 shadow-2xl border border-white dark:border-slate-800 overflow-hidden flex flex-col md:flex-row items-center gap-8">
              <div className="shrink-0 relative">
                  <div className={`w-40 h-40 rounded-full bg-gradient-to-br from-${currentTheme}-400 to-purple-500 p-1 shadow-2xl`}>
                      <div className="w-full h-full bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-7xl relative overflow-hidden">
                          <span>{stats.avatar}</span>
                          {stats.accessory && <span className="absolute -top-2 -right-2 text-5xl z-20">{stats.accessory}</span>}
                      </div>
                  </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                  {isEditingName ? (
                      <input value={tempName} onChange={(e) => setTempName(e.target.value)} onBlur={handleNameSave} autoFocus className="text-4xl font-black bg-transparent border-b-4 border-indigo-500 outline-none text-slate-800 dark:text-white" />
                  ) : (
                      <h1 onClick={() => setIsEditingName(true)} className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white font-game cursor-pointer hover:text-indigo-500 transition-colors">{stats.name}</h1>
                  )}
                  <p className="text-slate-400 font-black uppercase text-xs tracking-widest mt-1">Level {stats.level} Student • {stats.xp} Total XP</p>
                  <div className="mt-4 w-full max-w-md h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700">
                      <div className={`h-full bg-gradient-to-r from-${currentTheme}-500 to-purple-500 transition-all duration-1000`} style={{ width: `${progressPercentage}%` }}></div>
                  </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border-2 border-slate-100 dark:border-slate-800">
                  <h2 className="font-black text-2xl font-game mb-6 flex items-center gap-2"><span>🎯</span> Readiness Gauge</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {readinessData.map(r => (
                          <div key={r.label} className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                              <span className="text-2xl mb-2 block">{r.icon}</span>
                              <div className="text-xl font-black text-slate-800 dark:text-white">{r.value}%</div>
                              <span className="text-[9px] font-black uppercase text-slate-400">{r.label}</span>
                              <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500" style={{width: `${r.value}%`}}></div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {achievements.map(a => {
                      const isDone = a.progress >= a.target;
                      const pct = Math.min(100, (a.progress / a.target) * 100);
                      return (
                          <div key={a.id} className={`p-5 rounded-3xl border-2 transition-all text-center flex flex-col justify-between aspect-[3/4] ${isDone ? 'bg-white dark:bg-slate-800 border-indigo-200' : 'bg-slate-50 dark:bg-slate-900 opacity-60 grayscale'}`}>
                              <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center text-2xl shadow-inner ${isDone ? `bg-gradient-to-br ${a.color} text-white` : 'bg-slate-200'}`}>{isDone ? a.icon : '🔒'}</div>
                              <div><h4 className="font-black text-xs text-slate-800 dark:text-white mt-4">{a.title}</h4><p className="text-[9px] font-bold text-slate-400 uppercase">{a.desc}</p></div>
                              {!isDone && <div className="mt-3 h-1 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-slate-400" style={{width: `${pct}%`}}></div></div>}
                          </div>
                      );
                  })}
              </div>
          </div>

          <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-xl border-2 border-slate-100 dark:border-slate-800 h-fit">
              <h2 className="font-black text-xl font-game mb-6 flex items-center gap-2"><span>🎨</span> Style Studio</h2>
              <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Interface Color</p>
                    <div className="flex flex-wrap gap-2">
                        {themes.map(c => <button key={c} onClick={() => onUpdateStats({...stats, themeColor: c})} className={`w-8 h-8 rounded-full bg-${c}-500 ${stats.themeColor === c ? 'ring-4 ring-slate-200 dark:ring-slate-700' : ''}`} />)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Base Avatar</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {avatars.map(a => <button key={a} onClick={() => onUpdateStats({...stats, avatar: a})} className={`min-w-[44px] h-[44px] rounded-xl flex items-center justify-center text-xl bg-slate-50 dark:bg-slate-800 border-2 ${stats.avatar === a ? 'border-indigo-500' : 'border-transparent'}`}>{a}</button>)}
                    </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default UserProfile;
