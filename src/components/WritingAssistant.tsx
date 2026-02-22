import React, { useState } from 'react';
import { generateExamImage } from '../services/openRouterService';

const WritingAssistant: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '3:4'>('1:1');

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const result = await generateExamImage(prompt, aspectRatio);
      setImage(result);
    } catch (e) {
      alert("Could not generate image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const randomPrompts = [
    "A futuristic city under the ocean with glowing fish",
    "A teenager discovering a magic portal in their school locker",
    "A robot chef cooking a disastrous meal",
    "A flying car traffic jam in the year 3000",
    "A mysterious island where dinosaurs still live"
  ];

  const setRandom = () => {
      const p = randomPrompts[Math.floor(Math.random() * randomPrompts.length)];
      setPrompt(p);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden w-full">
          <div className="p-8 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-center">
               <h2 className="text-3xl font-bold mb-2">Creative Studio 🎨</h2>
               <p className="text-pink-100">Generate crazy images to inspire your writing tasks!</p>
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Controls */}
               <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">What should we draw?</label>
                        <div className="relative">
                            <textarea 
                                className="w-full border-2 border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none resize-none h-32 text-lg"
                                placeholder="e.g., A cat wearing sunglasses surfing on a pizza..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                            <button 
                                onClick={setRandom}
                                className="absolute bottom-3 right-3 bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                            >
                                🎲 Random Idea
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Shape</label>
                        <div className="flex space-x-3">
                            {(['1:1', '16:9', '3:4'] as const).map((r) => (
                                <button 
                                    key={r}
                                    onClick={() => setAspectRatio(r)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${aspectRatio === r ? 'bg-pink-100 text-pink-700 border-2 border-pink-400' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={loading || !prompt}
                        className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {loading ? 'Painting...' : 'Generate Visual Prompt ✨'}
                    </button>
               </div>

               {/* Result */}
               <div className="bg-gray-100 rounded-2xl border-4 border-white shadow-inner flex items-center justify-center min-h-[300px] overflow-hidden relative group">
                    {image ? (
                        <>
                            <img src={image} alt="Generated" className="w-full h-full object-contain" />
                            <a 
                                href={image} 
                                download="story-prompt.jpg"
                                className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Download"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </a>
                        </>
                    ) : (
                        <div className="text-center text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p>Your masterpiece appears here</p>
                        </div>
                    )}
               </div>
          </div>
      </div>
    </div>
  );
};

export default WritingAssistant;
