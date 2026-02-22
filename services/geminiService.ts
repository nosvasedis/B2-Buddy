
import { GoogleGenAI, LiveServerMessage, Modality, Type, Schema, GenerateContentResponse, Blob as GenAIBlob } from "@google/genai";
import { EssayType, LearningProfile, ListeningExercise, ListeningType, ReadingExercise, VocabItem, Exercise, UserStats, DrillQuestion, SpeakingScore } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const TEEN_COACH_INSTRUCTION = `You are a legendary B2 English Coach for a 13-15 year old student preparing for Cambridge FCE or Michigan ECCE. 
Your tone is high-energy, encouraging, and clear. 
- Use relevant emojis (🚀, 💡, 💎, ✨).
- Focus on practical 'Exam Hacks'.
- Calibrate all vocabulary strictly to CEFR B2 level.`;

export interface CoachingBrief {
  greeting: string;
  mood: "motivated" | "warning" | "celebratory" | "neutral";
  insight: string;
  mission: string;
}

export interface DictionaryResult {
  word: string;
  phonetic: string;
  definition: string;
  partOfSpeech: string;
  cefr: string;
  synonyms: string[];
  antonyms: string[];
  examples: string[];
  wordFamily: string[];
}

export const generateLessonContent = async (topic: string, type: 'GRAMMAR' | 'VOCABULARY', profile?: LearningProfile) => {
  try {
    const prompt = type === 'GRAMMAR' 
      ? `Create a B2 Level Grammar lesson for: "${topic}". Explain rules and provide 4 exercises.`
      : `Create a B2 Level Vocabulary lesson for: "${topic}". Focus on collocations.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        systemInstruction: TEEN_COACH_INSTRUCTION
      }
    });

    return response.text;
  } catch (error) {
    console.error("Lesson generation error", error);
    throw error;
  }
};

export const generateCoachingBrief = async (stats: UserStats): Promise<CoachingBrief> => {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a brief for ${stats.name} (Lvl ${stats.level}).`,
        config: {
            responseMimeType: "application/json",
            systemInstruction: TEEN_COACH_INSTRUCTION
        }
    });
    return JSON.parse(response.text || '{}');
};

export const analyzeHomeworkImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
            parts: [
                { inlineData: { mimeType, data: base64Image } },
                { text: `Analyze this B2 English homework. Check for FCE/ECCE accuracy. ${prompt}` }
            ]
        },
        config: {
            systemInstruction: TEEN_COACH_INSTRUCTION
        }
    });
    return response.text || "";
};

export const evaluateSpeakingSession = async (transcript: string, part: string): Promise<{report: string, score: SpeakingScore}> => {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Evaluate this FCE Speaking ${part} attempt.
        TRANSCRIPT:
        ${transcript}

        Use official Cambridge marking criteria (1-5 scale):
        - Grammatical Resource
        - Lexical Resource
        - Discourse Management
        - Pronunciation
        - Interactive Communication
        
        Provide a detailed qualitative report (Markdown) and a JSON score.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    report: { type: Type.STRING, description: "Detailed feedback report in Markdown" },
                    score: {
                        type: Type.OBJECT,
                        properties: {
                            grammarResource: { type: Type.NUMBER },
                            lexicalResource: { type: Type.NUMBER },
                            discourseManagement: { type: Type.NUMBER },
                            pronunciation: { type: Type.NUMBER },
                            interactiveCommunication: { type: Type.NUMBER },
                            overallBand: { type: Type.STRING },
                            status: { type: Type.STRING, enum: ["PASS", "FAIL", "DISTINCTION", "BORDERLINE"] }
                        },
                        required: ["grammarResource", "lexicalResource", "discourseManagement", "pronunciation", "interactiveCommunication", "overallBand", "status"]
                    }
                },
                required: ["report", "score"]
            },
            systemInstruction: "You are a senior Cambridge English Examiner for B2 First. You are analytical, fair, and thorough."
        }
    });
    return JSON.parse(response.text || "{}");
};

export const generateSpeakingAssets = async (part: string): Promise<any> => {
    if (part === 'PART2') {
        const topics = ["Education", "Environment", "Technology", "Social Life", "Travel", "Hobbies"];
        const topic = topics[Math.floor(Math.random() * topics.length)];
        
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Suggest two specific, contrasting scenes for a B2 Speaking Part 2 photo comparison task about "${topic}". Return as a simple JSON with 'prompt1', 'prompt2', and 'question'.`,
            config: { responseMimeType: "application/json" }
        });
        const data = JSON.parse(response.text || "{}");
        
        // Generate images
        const [img1, img2] = await Promise.all([
            generateExamImage(data.prompt1, "1:1"),
            generateExamImage(data.prompt2, "1:1")
        ]);

        return { images: [img1, img2], topic, question: data.question };
    }
    
    if (part === 'PART3') {
        const topics = ["Ways to protect the environment", "Benefits of learning languages", "How to spend school holidays", "Ways to improve health in cities"];
        const topic = topics[Math.floor(Math.random() * topics.length)];
        
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Generate a B2 Speaking Part 3 mind map about "${topic}". 
            Need 5 distinct points (max 3 words each). 
            Return JSON with 'centralQuestion' and 'points' (array).`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    }

    return { topic: "General Conversation" };
};

export function decodeAudio(base64String: string): Uint8Array {
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function createPCMBlob(data: Float32Array, sampleRate: number = 16000): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    let s = Math.max(-1, Math.min(1, data[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7FFF;
    int16[i] = s;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return { data: btoa(binary), mimeType: `audio/pcm;rate=${sampleRate}` };
}

export function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1): Blob {
    const buffer = new ArrayBuffer(44 + pcmData.length);
    const view = new DataView(buffer);
    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, pcmData.length, true);
    const pcmView = new Uint8Array(buffer, 44);
    pcmView.set(pcmData);
    return new Blob([buffer], { type: 'audio/wav' });
}

export function downsampleTo16k(buffer: Float32Array, inputRate: number): Float32Array {
    if (inputRate === 16000) return buffer;
    const ratio = inputRate / 16000;
    const newLength = Math.ceil(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < newLength) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
        let accum = 0, count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }
        result[offsetResult] = count > 0 ? accum / count : 0;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
}

export const connectLiveSession = (
    onMessage: (message: LiveServerMessage) => Promise<void>,
    onOpen: () => void,
    onClose: () => void,
    onError: (e: ErrorEvent) => void,
    systemInstruction: string,
    voiceName: string
) => {
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: { onopen: onOpen, onmessage: onMessage, onclose: onClose, onerror: onError },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
            systemInstruction: systemInstruction,
            inputAudioTranscription: {}, 
            outputAudioTranscription: {},
        }
    });
};

export const lookupWord = async (word: string): Promise<DictionaryResult | null> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Define "${word}" for B2.`,
            config: {
                responseMimeType: "application/json",
                systemInstruction: TEEN_COACH_INSTRUCTION
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) { return null; }
};

export const checkExerciseAnswer = async (question: string, answer: string, context: string, target?: string, options?: string[]): Promise<string> => {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Check: Q: "${question}" Ans: "${answer}" Target: "${target}".`,
        config: {
            responseMimeType: "application/json",
            systemInstruction: TEEN_COACH_INSTRUCTION
        }
    });
    return response.text || "{}";
};

export const validateDrillAnswer = async (question: DrillQuestion, answer: string): Promise<any> => {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Eval: Ans: "${answer}" Correct: "${question.correctAnswer}".`,
        config: {
            responseMimeType: "application/json",
            systemInstruction: TEEN_COACH_INSTRUCTION
        }
    });
    return JSON.parse(response.text || '{}');
};

export const generateReviewQuiz = async (words: VocabItem[]): Promise<Exercise[]> => {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Quiz for: ${words.map(w => w.word).join(', ')}.`,
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "[]");
};

export const analyzeStudentPerformance = async (area: string, input: string): Promise<any> => {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze performance in ${area}. Data: "${input}". Return JSON with strengths and weaknesses arrays.`,
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                    weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["strengths", "weaknesses"]
            }
        }
    });
    return JSON.parse(response.text || '{"strengths":[], "weaknesses":[]}');
};

export const analyzeMistakePattern = async (topic: string, mistakes: string[]): Promise<string[]> => {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Identify 3 grammar/vocab patterns from mistakes: ${mistakes.join('; ')}. Topic: ${topic}. Return as JSON array of strings.`,
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });
    return JSON.parse(response.text || "[]");
};

export const generateTeacherReport = async (profile: LearningProfile, name: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Report for ${name}.`,
        config: { systemInstruction: "B2 Examiner persona." }
    });
    return response.text || "";
};

export const getDailyWord = async (): Promise<string> => {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "B2 word of the day."
    });
    return response.text || "";
};

export const generateReadingExercise = async (topic: string): Promise<ReadingExercise> => {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a B2 First (FCE) Level Reading Exercise about "${topic}". 
        Include a title, a 300-word passage, and 4 multiple-choice questions.
        CRITICAL: For the 'evidence' field of each question, provide an EXACT literal quote (substring) from the passage where the answer is found.`,
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['Article', 'Story', 'Report', 'Email'] },
                    text: { type: Type.STRING, description: "The main reading passage text." },
                    questions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.NUMBER },
                                question: { type: Type.STRING },
                                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                correctAnswer: { type: Type.STRING },
                                evidence: { type: Type.STRING, description: "A literal substring from the passage text that justifies the answer." }
                            },
                            required: ["id", "question", "options", "correctAnswer", "evidence"]
                        }
                    }
                },
                required: ["title", "type", "text", "questions"]
            }
        }
    });
    return JSON.parse(response.text || "{}");
};

export const generateListeningExercise = async (topic: string, type: ListeningType): Promise<ListeningExercise> => {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `B2 Listening ${type} on ${topic}.`,
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
};

export const generateDrillExercises = async (type: string): Promise<DrillQuestion[]> => {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `10 Drills for ${type}.`,
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "[]");
};

export const generateModelEssay = async (type: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `B2 ${type} model essay.`
    });
    return response.text || "";
};

export const gradeEssay = async (images: any[], type: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
            parts: [...images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })), { text: `Grade ${type}.` }]
        }
    });
    return response.text || "";
};

export const generateSpeech = async (text: string, voice: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: { parts: [{ text }] },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
        }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};

export const generateMultiSpeakerSpeech = async (script: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: { parts: [{ text: script }] },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        { speaker: 'Speaker A', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                        { speaker: 'Speaker B', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
                    ]
                }
            }
        }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};

export const generateExamImage = async (prompt: string, ratio: string): Promise<string> => {
  const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: ratio as any } }
  });
  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : "";
};
