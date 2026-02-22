
import React, { useState, useRef } from 'react';
import { analyzeHomeworkImage } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';
import { playSound } from '../services/soundService';

const HomeworkHero: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setFeedback('');
      playSound('click');
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setAnalyzing(true);
    playSound('pop');
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      try {
        const result = await analyzeHomeworkImage(base64String, selectedFile.type, "");
        setFeedback(result || "Could not analyze text.");
        playSound('success');
      } catch (error) {
        setFeedback("Error analyzing image. Please try again.");
        playSound('error');
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col lg:flex-row gap-8 pt-4 pb-20 px-2">
        <div className="lg:w-1/3 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl p-8 flex flex-col border border-indigo-50 dark:border-slate-700 h-fit animate-slide-up">
            <div className="mb-6 text-center lg:text-left">
                <div className="inline-block p-3 bg-teal-50 dark:bg-teal-900/30 rounded-2xl text-teal-600 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                </div>
                <h2 className="text-3xl font-black font-game text-slate-800 dark:text-white">Scan Logic</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">Upload a photo of your grammar/reading exercise. I'll check it for you!</p>
            </div>
            
            <div className={`aspect-square border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden ${preview ? 'border-teal-300' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'}`} onClick={() => fileInputRef.current?.click()}>
                {preview ? <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" /> : <div className="text-center p-6"><p className="font-black text-indigo-600 text-lg group-hover:scale-110 transition-transform">Tap to Upload</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Paper or Screen Photo</p></div>}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            
            <button onClick={handleAnalyze} disabled={!selectedFile || analyzing} className="mt-6 w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-95">
                {analyzing ? 'Analyzing...' : 'Check My Work'}
            </button>
        </div>

        <div className="lg:w-2/3 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl p-10 flex flex-col border border-indigo-50 dark:border-slate-700 min-h-[500px] animate-slide-up" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-700 pb-4">
                <h2 className="text-2xl font-black font-game text-slate-800 dark:text-white">Tutor Analysis</h2>
                {feedback && <span className="bg-green-100 text-green-700 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-200">Checked!</span>}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {feedback ? <MarkdownRenderer content={feedback} className="text-lg" /> : <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 space-y-4 opacity-60"><svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><p className="font-black uppercase tracking-widest text-xl">Awaiting Evidence</p></div>}
            </div>
        </div>
    </div>
  );
};

export default HomeworkHero;
