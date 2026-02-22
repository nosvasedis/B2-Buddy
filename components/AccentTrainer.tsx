
import React, { useState } from 'react';
import { generateSpeech, decodeAudio, decodeAudioData } from '../services/geminiService';

const AccentTrainer: React.FC = () => {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('Kore');
  const [loading, setLoading] = useState(false);

  const handleSpeak = async () => {
    if (!text) return;
    setLoading(true);
    try {
      const base64Audio = await generateSpeech(text, voice);
      const audioBytes = decodeAudio(base64Audio);
      
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const audioCtx = new AudioContextClass(); // Use default system rate
      
      // Gemini output is typically 24000Hz. decodeAudioData handles resampling.
      const buffer = await decodeAudioData(audioBytes, audioCtx, 24000, 1);
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
    } catch (error) {
      console.error(error);
      alert("Could not generate speech");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 p-8 md:p-12 mt-10">
      <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-3xl shadow-sm text-indigo-600">🗣️</div>
          <div>
              <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Accent Trainer</h2>
              <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-widest">Shadowing Practice</p>
          </div>
      </div>
      
      <p className="text-slate-600 dark:text-slate-300 font-medium mb-6 leading-relaxed">
          Type a difficult phrase or paragraph below. Listen to how different voices pronounce it to perfect your intonation.
      </p>

      <textarea
        className="w-full p-6 border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none mb-6 h-40 resize-none font-medium text-lg text-slate-800 dark:text-white transition-all focus:border-indigo-400"
        placeholder="Paste a paragraph from your reading exercise here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-4 mb-8">
        {['Kore', 'Puck', 'Fenrir', 'Charon'].map((v) => (
            <button
                key={v}
                onClick={() => setVoice(v)}
                className={`p-4 rounded-xl border-2 text-center font-bold transition-all ${
                    voice === v 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-md' 
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'
                }`}
            >
                {v}
            </button>
        ))}
      </div>

      <button
        onClick={handleSpeak}
        disabled={loading || !text}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xl py-5 rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95 transition-all"
      >
         {loading ? (
             <span>Synthesizing...</span>
         ) : (
             <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                <span>Listen Now</span>
             </>
         )}
      </button>
    </div>
  );
};

export default AccentTrainer;
