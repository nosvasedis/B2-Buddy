
import { UserStats, UserAccount } from '../types';
import { supabase } from '../lib/supabase';

// Default Stats Template (Fallback)
export const DEFAULT_STATS: UserStats = {
    streak: 0,
    wordsLearned: 0,
    lastLoginDate: new Date().toISOString().split('T')[0],
    xp: 0,
    username: 'Student',
    name: 'Student',
    avatar: '👋',
    level: 1,
    speakingSessionsCompleted: 0,
    speakingHistory: [],
    grammarProgress: [],
    vocabProgress: [],
    vocabItems: [],
    
    // Unified Cache
    lessonCache: {}, 
    readingCache: {},
    drillCache: {},
    listeningCache: {},
    essayModels: {},
    currentDailyWord: undefined, // Initialize as undefined

    learningProfile: {
        strengths: [],
        weaknesses: [],
        recentMistakes: [],
        topicMastery: {}
    },
    soundEnabled: true,
    notificationsEnabled: true,
    targetExamDate: undefined,
    colorMode: 'auto' // Default appearance
};

export const authService = {
    // 1. Register New User
    register: async (username: string, email: string, password: string): Promise<{ success: boolean, message?: string, user?: UserAccount }> => {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username
                }
            }
        });

        if (error) {
            return { success: false, message: error.message };
        }

        if (data.user) {
            return { 
                success: true, 
                user: {
                    id: data.user.id,
                    username: username,
                    passwordHash: '', 
                    createdAt: new Date().toISOString()
                }
            };
        }
        return { success: false, message: "Registration successful! If email confirmation is on, please check your inbox." };
    },

    // 2. Login
    login: async (email: string, password: string): Promise<{ success: boolean, message?: string, user?: UserAccount }> => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return { success: false, message: error.message };
        }

        if (data.user) {
            let username = email.split('@')[0];
            try {
                // Try to fetch profile but don't fail login if it errors (e.g. permissions/missing table)
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', data.user.id)
                    .single();
                
                if (!profileError && profile?.username) {
                    username = profile.username;
                }
            } catch (e) {
                console.warn("Profile fetch failed, using default username.", e);
            }

            return { 
                success: true, 
                user: {
                    id: data.user.id,
                    username: username,
                    passwordHash: '',
                    createdAt: data.user.created_at
                }
            };
        }
        return { success: false, message: "Login failed" };
    },

    // 3. Subscribe to Auth Changes (Persistence)
    subscribeToAuth: (callback: (user: UserAccount | null) => void) => {
        const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                let username = session.user.email?.split('@')[0] || 'Student';

                try {
                    // Attempt fetch but catch error so we don't block
                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('username')
                        .eq('id', session.user.id)
                        .single();
                    
                    if (!error && profile?.username) username = profile.username;
                } catch (e) {
                    console.warn("Profile fetch failed, using default", e);
                }
                
                const user: UserAccount = {
                    id: session.user.id,
                    username: username,
                    passwordHash: '',
                    createdAt: session.user.created_at
                };
                callback(user);
            } else {
                callback(null);
            }
        });
        return data.subscription;
    },

    // 4. Get User Stats (Fetch from Supabase DB)
    getUserStats: async (userId: string): Promise<UserStats> => {
        try {
            // Attempt to fetch with a hard catch to prevent bubbling errors
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error || !data) {
                console.warn("Could not fetch profile, using default:", error?.message);
                return { ...DEFAULT_STATS, userId };
            }

            // Merge DB columns and the JSONB 'game_data' column
            const gameData = data.game_data || {};
            const username = data.username || DEFAULT_STATS.username;
            // Use full_name if available, otherwise fallback to username
            const displayName = data.full_name || username;
            
            return {
                ...DEFAULT_STATS,
                userId: data.id,
                username: username,
                name: displayName,
                xp: data.xp || 0,
                level: data.level || 1,
                streak: data.streak || 0,
                avatar: data.avatar || DEFAULT_STATS.avatar,
                // Map JSON fields back
                speakingSessionsCompleted: gameData.speakingSessionsCompleted || 0,
                speakingHistory: gameData.speakingHistory || [],
                grammarProgress: gameData.grammarProgress || [],
                vocabProgress: gameData.vocabProgress || [],
                vocabItems: gameData.vocabItems || [],
                
                // CACHE
                lessonCache: gameData.lessonCache || {},
                readingCache: gameData.readingCache || {},
                drillCache: gameData.drillCache || {},
                listeningCache: gameData.listeningCache || {},
                essayModels: gameData.essayModels || {},
                currentDailyWord: gameData.currentDailyWord,

                learningProfile: gameData.learningProfile || DEFAULT_STATS.learningProfile,
                lastLoginDate: gameData.lastLoginDate || new Date().toISOString().split('T')[0],
                soundEnabled: gameData.soundEnabled ?? true,
                notificationsEnabled: gameData.notificationsEnabled ?? true,
                targetExamDate: gameData.targetExamDate,
                themeColor: gameData.themeColor,
                colorMode: gameData.colorMode || 'auto',
                accessory: gameData.accessory
            };
        } catch (e) {
            console.error("Critical stats load failure:", e);
            // ABSOLUTE FALLBACK: Return default stats so app doesn't crash
            return { ...DEFAULT_STATS, userId };
        }
    },

    // 5. Save User Data (Push to Supabase DB)
    saveUserStats: async (userId: string, stats: UserStats) => {
        const { xp, level, streak, name, username, avatar, userId: uid, ...rest } = stats;
        
        // Upsert: Create or Update
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                xp: xp,
                level: level,
                streak: streak,
                username: username,    // Unique handle
                full_name: name,       // Display Name
                avatar: avatar,
                game_data: rest,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error("Cloud Save Error:", error.message);
        }
    },

    // 6. Reset Progress (Keep Account)
    resetUserProgress: async (userId: string, currentStats: UserStats) => {
        // Reset all progress fields to default, but keep identity settings
        const newStats: UserStats = {
            ...DEFAULT_STATS,
            userId: userId,
            username: currentStats.username,
            name: currentStats.name,
            avatar: currentStats.avatar,
            themeColor: currentStats.themeColor,
            colorMode: currentStats.colorMode,
            accessory: currentStats.accessory,
            soundEnabled: currentStats.soundEnabled,
            notificationsEnabled: currentStats.notificationsEnabled,
            targetExamDate: currentStats.targetExamDate,
            // KEEP CACHE? The user asked for a separate button to purge cache. 
            // Reset Progress usually means stats/levels. 
            // We will keep cache here as requested (separate button exists now).
            lessonCache: currentStats.lessonCache,
            readingCache: currentStats.readingCache,
            drillCache: currentStats.drillCache,
            listeningCache: currentStats.listeningCache,
            essayModels: currentStats.essayModels,
            currentDailyWord: currentStats.currentDailyWord
        };
        
        await authService.saveUserStats(userId, newStats);
        return newStats;
    },

    // 7. Delete Account (Full Wipe)
    deleteAccount: async (userId: string) => {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);
        
        if (error) {
            console.error("Error deleting profile:", error.message);
            throw error;
        }
        await supabase.auth.signOut();
    },

    // 8. Logout
    logout: async () => {
        await supabase.auth.signOut();
    },

    // 9. Get Session (Initial Check - Optional usage now)
    getSession: async (): Promise<UserAccount | null> => {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
             let username = 'Student';
             try {
                 const { data: profile } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', data.session.user.id)
                    .single();
                 if (profile?.username) username = profile.username;
             } catch (e) {
                 console.warn("Session profile fetch failed", e);
             }
                
             return {
                 id: data.session.user.id,
                 username: username,
                 passwordHash: '',
                 createdAt: data.session.user.created_at
             };
        }
        return null;
    }
};
