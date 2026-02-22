
import axios from 'axios';
import {
    EssayType,
    LearningProfile,
    ListeningExercise,
    ListeningType,
    ReadingExercise,
    VocabItem,
    Exercise,
    UserStats,
    DrillQuestion,
    ECCEQuestion,
    LessonContent,
    SpeakingScore
} from "../types";
import { PART2_PHOTO_PAIRS, PART3_MIND_MAPS } from "../data/speakingPrompts";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";
const BASE_URL = "https://openrouter.ai/api/v1";

// Models: openrouter/free routes to free models and supports JSON + vision
const TEXT_MODEL = "openrouter/free";
const VISION_MODEL = "openrouter/free";

if (!OPENROUTER_API_KEY && import.meta.env.DEV) {
    console.warn("B2 Buddy: VITE_OPENROUTER_API_KEY is not set. AI features may fail.");
}

const TEEN_COACH_INSTRUCTION = `You are a legendary B2 English Coach for a 13-15 year old student preparing for Michigan ECCE (B2). 
Your tone is high-energy, encouraging, and clear. 
- Use relevant emojis (🚀, 💡, 💎, ✨).
- Focus on practical Michigan ECCE 'Exam Hacks'.
- Calibrate all vocabulary strictly to CEFR B2 level.`;

const B2_EXAMINER_INSTRUCTION = `You are a professional B2 First / Michigan ECCE Speaking examiner. You conduct the test in real time.
- Be natural and conversational. React to what the candidate actually said.
- Use standard examiner phrasing: polite, clear, brief (1–2 sentences).
- Do NOT repeat generic scripts. Ask relevant follow-ups based on their answer.
- Part 1: Personal questions; Part 2: Photo comparison; Part 3: Mind map discussion; Part 4: Deeper discussion.`;

const openRouterClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://b2-buddy.web.app",
        "X-Title": "B2 Buddy"
    }
});

/** User-friendly error when API key is missing or rejected (401). */
export const OPENROUTER_AUTH_ERROR_MESSAGE = "OpenRouter API key is missing or invalid. Set VITE_OPENROUTER_API_KEY when building the app.";

openRouterClient.interceptors.response.use(
    (res) => res,
    (err) => {
        const status = err?.response?.status;
        if (status === 401) {
            return Promise.reject(new Error(OPENROUTER_AUTH_ERROR_MESSAGE));
        }
        if (status === 429) {
            return Promise.reject(new Error("Rate limit reached. Please try again in a moment."));
        }
        return Promise.reject(err);
    }
);

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

const callModel = async (prompt: string, model: string = TEXT_MODEL, systemInstruction: string = TEEN_COACH_INSTRUCTION, json: boolean = false) => {
    if (!OPENROUTER_API_KEY || !OPENROUTER_API_KEY.trim()) {
        throw new Error(OPENROUTER_AUTH_ERROR_MESSAGE);
    }
    try {
        const response = await openRouterClient.post("/chat/completions", {
            model: model,
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: prompt }
            ],
            response_format: json ? { type: "json_object" } : undefined
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error(`OpenRouter Error (${model}):`, error);
        throw error;
    }
};

/** Strip markdown code fences so we can parse JSON from model output. */
function extractJsonFromResponse(raw: string): string {
    const s = (raw || '').trim();
    const jsonBlock = /^```(?:json)?\s*([\s\S]*?)```\s*$/m.exec(s);
    if (jsonBlock) return jsonBlock[1].trim();
    return s;
}

/** Normalize API lesson shape to LessonContent (handles "correct" vs "correctAnswer", missing fields). */
function normalizeLessonContent(raw: any, topic: string): LessonContent {
    const exercises: Exercise[] = Array.isArray(raw.exercises)
        ? raw.exercises.map((ex: any, idx: number) => ({
            id: typeof ex.id === 'number' ? ex.id : idx,
            type: 'multiple_choice' as const,
            question: String(ex.question ?? ex.prompt ?? ''),
            options: Array.isArray(ex.options) ? ex.options.map((o: any) => String(o)) : [],
            correctAnswer: String(ex.correctAnswer ?? ex.correct ?? '').trim()
        })).filter((ex: Exercise) => ex.question && (ex.options?.length ?? 0) >= 2)
        : [];
    const examples: string[] = Array.isArray(raw.examples)
        ? raw.examples.map((e: any) => (typeof e === 'string' ? e : String(e)))
        : [];
    return {
        title: String(raw.title ?? topic).trim() || topic,
        emoji: String(raw.emoji ?? '📚').trim(),
        theoryMarkdown: String(raw.theoryMarkdown ?? raw.theory ?? '').trim() || `*Lesson: ${topic}*`,
        examples,
        exercises,
        imageUrl: raw.imageUrl,
        targetWords: Array.isArray(raw.targetWords) ? raw.targetWords : undefined
    };
}

export const generateLessonContent = async (topic: string, type: 'GRAMMAR' | 'VOCABULARY', profile?: LearningProfile): Promise<LessonContent> => {
    const prompt = type === 'GRAMMAR'
        ? `Create a MEGA B2 Level Grammar lesson for: "${topic}". 
           Return ONLY valid JSON (no markdown, no code block, no explanation) with:
           - "title": string
           - "emoji": string (single emoji)
           - "theoryMarkdown": string (markdown explanation)
           - "examples": array of 4 strings (format "**Label (Context)**: Sentence")
           - "exercises": array of 4 objects with "id" (number), "question" (string), "options" (array of 4 strings), "correctAnswer" (string, one of the options).`
        : `Create a MEGA B2 Level Vocabulary lesson for: "${topic}". Focus on collocations. 
           Return ONLY valid JSON (no markdown, no code block, no explanation) with:
           - "title": string
           - "emoji": string (single emoji)
           - "theoryMarkdown": string (markdown explanation)
           - "examples": array of 4 strings (format "**Label (Context)**: Sentence")
           - "exercises": array of 4 objects with "id" (number), "question" (string), "options" (array of 4 strings), "correctAnswer" (string, one of the options).`;
    const raw = await callModel(prompt, TEXT_MODEL, TEEN_COACH_INSTRUCTION, true);
    const jsonString = extractJsonFromResponse(raw || '');
    let parsed: any;
    try {
        parsed = JSON.parse(jsonString);
    } catch (e) {
        console.error('Lesson JSON parse error:', e);
        throw new Error('The lesson response was invalid. Please try again.');
    }
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('The lesson response was invalid. Please try again.');
    }
    return normalizeLessonContent(parsed, topic);
};

export const generateCoachingBrief = async (stats: UserStats): Promise<CoachingBrief> => {
    const prompt = `Generate a brief for ${stats.name} (Lvl ${stats.level}). Strengths: ${stats.learningProfile.strengths.join(', ')}. Return JSON with greeting, mood, insight, mission.`;
    const res = await callModel(prompt, TEXT_MODEL, TEEN_COACH_INSTRUCTION, true);
    return JSON.parse(res || '{}');
};

export const analyzeHomeworkImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    try {
        const response = await openRouterClient.post("/chat/completions", {
            model: VISION_MODEL,
            messages: [
                { role: "system", content: TEEN_COACH_INSTRUCTION },
                {
                    role: "user",
                    content: [
                        { type: "text", text: `Analyze this B2 English homework. Check for FCE/ECCE accuracy. ${prompt}` },
                        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                    ]
                }
            ]
        });
        return response.data.choices[0].message.content || "";
    } catch (e) {
        console.error("Vision Error:", e);
        return "Sorry, I couldn't analyze the image right now.";
    }
};

export const evaluateSpeakingSession = async (transcript: string, part: string): Promise<{ report: string, score: SpeakingScore }> => {
    const prompt = `Evaluate this FCE Speaking ${part} attempt.
    TRANSCRIPT: ${transcript}
    Use official Cambridge criteria (1-5 scale). Provide JSON with 'report' (markdown) and 'score' object.`;
    const res = await callModel(prompt, TEXT_MODEL, "You are a senior Cambridge Examiner.", true);
    return JSON.parse(res || "{}");
};

function normalizeDictionaryResult(raw: any, searchedWord: string): DictionaryResult | null {
    const word = String(raw?.word ?? searchedWord).trim();
    const definition = String(raw?.definition ?? raw?.meaning ?? '').trim();
    if (!word || !definition) return null;
    return {
        word,
        phonetic: String(raw?.phonetic ?? '').trim(),
        definition,
        partOfSpeech: String(raw?.partOfSpeech ?? raw?.type ?? '').trim(),
        cefr: String(raw?.cefr ?? 'B2').trim(),
        synonyms: Array.isArray(raw?.synonyms) ? raw.synonyms.map((s: any) => String(s)) : [],
        antonyms: Array.isArray(raw?.antonyms) ? raw.antonyms.map((a: any) => String(a)) : [],
        examples: Array.isArray(raw?.examples) ? raw.examples.map((x: any) => String(x)) : [],
        wordFamily: Array.isArray(raw?.wordFamily) ? raw.wordFamily.map((w: any) => String(w)) : []
    };
}

export const lookupWord = async (word: string): Promise<DictionaryResult | null> => {
    try {
        const prompt = `Define "${word}" for B2 level. Return ONLY valid JSON (no markdown) with: word, phonetic, definition, partOfSpeech, cefr, synonyms (array), antonyms (array), examples (array), wordFamily (array).`;
        const raw = await callModel(prompt, TEXT_MODEL, TEEN_COACH_INSTRUCTION, true);
        const jsonString = extractJsonFromResponse(raw || '');
        const parsed = JSON.parse(jsonString || '{}');
        return normalizeDictionaryResult(parsed, word.trim());
    } catch (e) {
        console.warn('Lookup word failed:', e);
        return null;
    }
};

export const getDailyWord = async (): Promise<string> => {
    const prompt = "Provide a B2 level word of the day in this format: Word: [word]\nType: [type]\nMeaning: [meaning]\nExample: [example]";
    return await callModel(prompt, TEXT_MODEL);
};

export const generateReadingExercise = async (topic: string): Promise<ReadingExercise> => {
    const prompt = `Generate a B2 First Reading Exercise about "${topic}". 300-word passage + 4 MCQs. Return JSON with title, type, text, questions (id, question, options, correctAnswer, evidence).`;
    const res = await callModel(prompt, TEXT_MODEL, "B2 Examiner persona", true);
    return JSON.parse(res || "{}");
};

export const generateSpeakingAssets = async (part: string): Promise<any> => {
    if (part === 'PART2') {
        const pair = PART2_PHOTO_PAIRS[Math.floor(Math.random() * PART2_PHOTO_PAIRS.length)];
        const [img1, img2] = await Promise.all([
            generateExamImage(pair.prompt1, "1:1"),
            generateExamImage(pair.prompt2, "1:1")
        ]);
        return { images: [img1, img2], topic: pair.topic, question: pair.question };
    }

    if (part === 'PART3') {
        const mindMap = PART3_MIND_MAPS[Math.floor(Math.random() * PART3_MIND_MAPS.length)];
        return mindMap;
    }

    return { topic: "General Conversation" };
};

/** Generate the examiner's opening line for this part (AI, so it fits the task). */
export const generateExaminerGreeting = async (part: string, contextSummary: string): Promise<string> => {
    const prompt = `You are the B2 Speaking examiner. This is ${part}.
Context: ${contextSummary}
Say ONE short greeting (1–2 sentences): introduce yourself as the examiner, then ask if the candidate is ready to begin. Be natural and warm. Do not list instructions.`;
    const text = await callModel(prompt, TEXT_MODEL, B2_EXAMINER_INSTRUCTION);
    return (text || "Hello. I'm your examiner today. Are you ready to begin?").trim();
};

/** Generate the examiner's next turn based on what the candidate just said (fully interactive). */
export const generateExaminerTurn = async (part: string, topic: string, history: string, studentInput: string): Promise<string> => {
    const prompt = `Session: ${part}
Topic/task: ${topic}

Conversation so far:
${history}

Candidate just said: "${studentInput}"

Respond as the examiner. React to what they actually said. One or two short sentences. Ask a relevant follow-up or move the task on naturally.`;
    const text = await callModel(prompt, TEXT_MODEL, B2_EXAMINER_INSTRUCTION);
    return (text || "Thank you. Could you tell me a bit more about that?").trim();
};

export const checkExerciseAnswer = async (question: string, answer: string, context: string, target?: string, options?: string[]): Promise<string> => {
    const prompt = `Check: Q: "${question}" Ans: "${answer}" Target: "${target}". Context: ${context}. Return JSON with feedback.`;
    return await callModel(prompt, TEXT_MODEL, TEEN_COACH_INSTRUCTION, true);
};

export const validateDrillAnswer = async (question: DrillQuestion, answer: string): Promise<any> => {
    const prompt = `Eval: Ans: "${answer}" Correct: "${question.correctAnswer}". Return JSON with isCorrect (boolean) and explanation.`;
    const res = await callModel(prompt, TEXT_MODEL, TEEN_COACH_INSTRUCTION, true);
    return JSON.parse(res || '{}');
};

export const generateReviewQuiz = async (words: VocabItem[]): Promise<Exercise[]> => {
    const prompt = `Quiz for: ${words.map(w => w.word).join(', ')}. Return JSON array of exercises.`;
    const res = await callModel(prompt, TEXT_MODEL, "B2 Examiner persona", true);
    return JSON.parse(res || "[]");
};

export const analyzeStudentPerformance = async (area: string, input: string): Promise<any> => {
    const prompt = `Analyze performance in ${area}. Data: "${input}". Return JSON with strengths and weaknesses arrays.`;
    const res = await callModel(prompt, TEXT_MODEL, "B2 Analyst persona", true);
    return JSON.parse(res || '{"strengths":[], "weaknesses":[]}');
};

export const analyzeMistakePattern = async (topic: string, mistakes: string[]): Promise<string[]> => {
    const prompt = `Identify 3 grammar/vocab patterns from mistakes: ${mistakes.join('; ')}. Topic: ${topic}. Return JSON array of strings.`;
    const res = await callModel(prompt, TEXT_MODEL, "B2 Analyst persona", true);
    return JSON.parse(res || "[]");
};

export const generateTeacherReport = async (profile: LearningProfile, name: string): Promise<string> => {
    const prompt = `Report for ${name} based on profile: ${JSON.stringify(profile)}.`;
    return await callModel(prompt, TEXT_MODEL, "Senior B2 Examiner persona.");
};

export const generateListeningExercise = async (topic: string, type: ListeningType): Promise<ListeningExercise> => {
    const prompt = `B2 Listening ${type} on ${topic}. Generate a transcript and 4 questions. Return JSON with transcript and questions array.`;
    const res = await callModel(prompt, TEXT_MODEL, "B2 Content Creator persona", true);
    return JSON.parse(res || "{}");
};

export const generateDrillExercises = async (type: string): Promise<DrillQuestion[]> => {
    const prompt = `10 Drills for ${type}. Return JSON array.`;
    const res = await callModel(prompt, TEXT_MODEL, "B2 Drill Sergeant persona", true);
    return JSON.parse(res || "[]");
};

const ECCE_EXAM_SYSTEM = `You are an official Michigan ECCE (Examination for the Certificate of Proficiency in English) item writer.
Generate B2-level multiple-choice questions for the GVR (Grammar, Vocabulary, Reading) section.
- Grammar: tenses, conditionals, modals, relative clauses, passives, linkers.
- Vocabulary: collocations, phrasal verbs, word choice, idioms at B2.
- Reading: short context (1-2 sentences) then choose best completion or meaning.
Each question must have exactly 4 options. Return ONLY a valid JSON array, no markdown or explanation.`;

/** Generates one batch of ECCE GVR questions (e.g. 20). Batch index used to vary topics and avoid repetition. */
export const generateECCEExamBatch = async (batchIndex: number, batchSize: number = 20): Promise<ECCEQuestion[]> => {
    const startId = batchIndex * batchSize + 1;
    const prompt = `Generate exactly ${batchSize} Michigan ECCE GVR questions for this batch (IDs ${startId} to ${startId + batchSize - 1}).
Mix: about 40% GRAMMAR, 40% VOCABULARY, 20% READING. Vary topics (work, travel, environment, education, technology, health, etc.).
Return a JSON array of objects. Each object must have:
- "id": number (${startId} to ${startId + batchSize - 1})
- "type": "GRAMMAR" | "VOCABULARY" | "READING"
- "question": string (clear stem; use ________ for gap if completion)
- "options": string array of exactly 4 options
- "correctAnswer": string (exactly one of the options)
No duplicate questions. Make distractors plausible.`;
    const res = await callModel(prompt, TEXT_MODEL, ECCE_EXAM_SYSTEM, true);
    const raw = JSON.parse(res || "[]");
    return Array.isArray(raw) ? raw.map((q: any) => ({
        id: Number(q.id) || startId + raw.indexOf(q),
        type: ['GRAMMAR', 'VOCABULARY', 'READING'].includes(q.type) ? q.type : 'GRAMMAR',
        question: String(q.question || '').trim(),
        options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : [],
        correctAnswer: String(q.correctAnswer || '').trim()
    })).filter((q: ECCEQuestion) => q.question && q.options.length >= 2) : [];
};

/** Generates a full ECCE mock exam (e.g. 100 questions) in batches to get diverse, non-repeating items. */
export const generateECCEExamQuestions = async (total: number = 100, batchSize: number = 20): Promise<ECCEQuestion[]> => {
    const batches = Math.ceil(total / batchSize);
    const all: ECCEQuestion[] = [];
    for (let i = 0; i < batches; i++) {
        const batch = await generateECCEExamBatch(i, batchSize);
        all.push(...batch);
    }
    return all.slice(0, total);
};

export const generateModelEssay = async (type: string): Promise<string> => {
    const prompt = `B2 ${type} model essay. Use advanced collocations.`;
    return await callModel(prompt, TEXT_MODEL, "Senior B2 Examiner persona.");
};

export const gradeEssay = async (images: any[], type: string): Promise<string> => {
    try {
        const response = await openRouterClient.post("/chat/completions", {
            model: VISION_MODEL,
            messages: [
                { role: "system", content: "You are a senior Cambridge Examiner." },
                {
                    role: "user",
                    content: [
                        { type: "text", text: `Grade this B2 ${type} essay from these images. Provide feedback and a score based on Cambridge criteria.` },
                        ...images.map(img => ({ type: "image_url", image_url: { url: img.base64.startsWith('data:') ? img.base64 : `data:${img.mimeType};base64,${img.base64}` } }))
                    ]
                }
            ]
        });
        return response.data.choices[0].message.content || "";
    } catch (e) {
        return "Failed to grade essay.";
    }
};

export const boostB2Phrasing = async (text: string): Promise<string[]> => {
    const prompt = `Text: "${text}". Suggest 3 B2-level vocabulary/phrasing upgrades. Return ONLY a JSON array of 3 strings. Each string: "Instead of '[old]', use '[new]'".`;
    const res = await callModel(prompt, TEXT_MODEL, "B2 Editor persona", true);
    try {
        return JSON.parse(res || "[]");
    } catch (e) {
        return [];
    }
};


export const generateMultiSpeakerSpeech = async (script: string): Promise<string> => {
    // Simplified: Use single speech for now
    return await generateSpeech(script, "Zephyr");
};

// Image Generation Fallback (Pollinations.ai - Free)
export const generateExamImage = async (prompt: string, ratio: string): Promise<string> => {
    const seed = Math.floor(Math.random() * 1000000);
    const [width, height] = ratio === "1:1" ? [1024, 1024] : [1280, 720];
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
};

// TTS Logic - Components should prefer SpeechSynthesis for real-time.
// This function remains for legacy or if we add a real TTS API later.
export const generateSpeech = async (text: string, voice: string): Promise<string> => {
    console.warn("generateSpeech requested. Note: Browser-based SpeechSynthesis is preferred for zero-latency.");
    return "UklGRuQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YcAAAAD//////////w==";
};

export const decodeAudio = (base64: string): Uint8Array => {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

export const decodeAudioData = async (audioBytes: Uint8Array, audioCtx: AudioContext): Promise<AudioBuffer> => {
    return await audioCtx.decodeAudioData(audioBytes.buffer.slice(0) as ArrayBuffer);
};

export const pcmToWav = (pcmData: Uint8Array, sampleRate: number = 24000): Blob => {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // RIFF identifier
    view.setUint32(0, 0x52494646, false);
    // file length
    view.setUint32(4, 36 + pcmData.length, true);
    // WAVE identifier
    view.setUint32(8, 0x57415645, false);
    // FMT chunk identifier
    view.setUint32(12, 0x666d7420, false);
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    view.setUint32(36, 0x64617461, false);
    // data chunk length
    view.setUint32(40, pcmData.length, true);

    return new Blob([header, pcmData as any], { type: 'audio/wav' });
};
