import { ListeningExercise, ListeningType } from '../types';

/**
 * SERVICE FOR DAILY LOCAL CACHE
 * Stores exercises in LocalStorage keyed by Date + Part.
 * This ensures:
 * 1. Persistence if tab is closed/refreshed (Text saved in LocalStorage).
 * 2. One unique test per day per part (unless forced reset).
 * 3. Zero reliance on external databases (Supabase) for this feature.
 */

const STORAGE_PREFIX = 'b2_listening_v2';

// Helper to get YYYY-MM-DD
const getTodayKey = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

export const cacheService = {
    getDailyExercise: (partType: ListeningType): ListeningExercise | null => {
        const today = getTodayKey();
        const key = `${STORAGE_PREFIX}_${partType}_${today}`;

        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                return JSON.parse(stored) as ListeningExercise;
            }
            return null;
        } catch (e) {
            console.warn("Local cache fetch failed", e);
            return null;
        }
    },

    saveDailyExercise: (partType: ListeningType, exercise: ListeningExercise) => {
        const today = getTodayKey();
        const key = `${STORAGE_PREFIX}_${partType}_${today}`;
        
        // We also inject the ID into the exercise object for audio referencing
        const exToSave = { ...exercise, weekId: `${partType}_${today}` }; // reusing 'weekId' prop as 'sessionKey'

        try {
            localStorage.setItem(key, JSON.stringify(exToSave));
            
            // Cleanup: Remove old keys to prevent storage bloat
            // Iterate all keys, if it starts with prefix but NOT today, delete it.
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(`${STORAGE_PREFIX}_${partType}_`) && k !== key) {
                    localStorage.removeItem(k);
                }
            }
        } catch (e) {
            console.warn("Failed to save to local cache (quota exceeded?)", e);
        }
    },

    // Used when "Generate New" is clicked
    clearDailyExercise: (partType: ListeningType) => {
        const today = getTodayKey();
        const key = `${STORAGE_PREFIX}_${partType}_${today}`;
        localStorage.removeItem(key);
    }
};