
import { UserStats, UserAccount } from '../types';
import { auth, db } from '../lib/firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile
} from "firebase/auth";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "firebase/firestore";

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
    currentDailyWord: null,

    learningProfile: {
        strengths: [],
        weaknesses: [],
        recentMistakes: [],
        topicMastery: {}
    },
    soundEnabled: true,
    notificationsEnabled: true,
    targetExamDate: null,
    colorMode: 'auto'
};

export const authService = {
    // 1. Register New User
    register: async (username: string, email: string, password: string): Promise<{ success: boolean, message?: string, user?: UserAccount }> => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Set display name in Auth
            await updateProfile(user, { displayName: username });

            // Create profile in Firestore
            await setDoc(doc(db, "profiles", user.uid), {
                id: user.uid,
                username: username,
                full_name: username,
                xp: 0,
                level: 1,
                streak: 0,
                avatar: '👋',
                game_data: {},
                created_at: serverTimestamp(),
                updated_at: serverTimestamp()
            });

            return {
                success: true,
                user: {
                    id: user.uid,
                    username: username,
                    passwordHash: '',
                    createdAt: user.metadata.creationTime || new Date().toISOString()
                }
            };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    },

    // 2. Login
    login: async (email: string, password: string): Promise<{ success: boolean, message?: string, user?: UserAccount }> => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            let username = user.displayName || email.split('@')[0];

            return {
                success: true,
                user: {
                    id: user.uid,
                    username: username,
                    passwordHash: '',
                    createdAt: user.metadata.creationTime || new Date().toISOString()
                }
            };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    },

    // 3. Subscribe to Auth Changes
    subscribeToAuth: (callback: (user: UserAccount | null) => void) => {
        return onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const user: UserAccount = {
                    id: firebaseUser.uid,
                    username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Student',
                    passwordHash: '',
                    createdAt: firebaseUser.metadata.creationTime || new Date().toISOString()
                };
                callback(user);
            } else {
                callback(null);
            }
        });
    },

    // 4. Get User Stats
    getUserStats: async (userId: string): Promise<UserStats> => {
        try {
            const docRef = doc(db, "profiles", userId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                console.warn("No Firestore profile found, using default.");
                return { ...DEFAULT_STATS, userId };
            }

            const data = docSnap.data();
            const gameData = data.game_data || {};

            return {
                ...DEFAULT_STATS,
                userId: data.id,
                username: data.username || DEFAULT_STATS.username,
                name: data.full_name || data.username || DEFAULT_STATS.username,
                xp: data.xp || 0,
                level: data.level || 1,
                streak: data.streak || 0,
                avatar: data.avatar || DEFAULT_STATS.avatar,

                // Map fields from game_data
                speakingSessionsCompleted: gameData.speakingSessionsCompleted || 0,
                speakingHistory: gameData.speakingHistory || [],
                grammarProgress: gameData.grammarProgress || [],
                vocabProgress: gameData.vocabProgress || [],
                vocabItems: gameData.vocabItems || [],

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
            return { ...DEFAULT_STATS, userId };
        }
    },

    // 5. Save User Data
    saveUserStats: async (userId: string, stats: UserStats) => {
        try {
            const { xp, level, streak, name, username, avatar, userId: uid, ...rest } = stats;
            const docRef = doc(db, "profiles", userId);

            // Recursively remove undefined values from rest object
            const cleanData = JSON.parse(JSON.stringify(rest, (key, value) => {
                if (value === undefined) return null;
                return value;
            }));

            await setDoc(docRef, {
                id: userId,
                xp: xp || 0,
                level: level || 1,
                streak: streak || 0,
                username: username || 'Student',
                full_name: name || 'Student',
                avatar: avatar || '👋',
                game_data: cleanData,
                updated_at: serverTimestamp()
            }, { merge: true });
        } catch (e: any) {
            console.error("Firestore Save Error:", e.message);
        }
    },

    // 6. Reset Progress
    resetUserProgress: async (userId: string, currentStats: UserStats) => {
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

    // 7. Delete Account
    deleteAccount: async (userId: string) => {
        try {
            await deleteDoc(doc(db, "profiles", userId));
            const user = auth.currentUser;
            if (user) {
                await user.delete();
            }
        } catch (e: any) {
            console.error("Error deleting account:", e.message);
            throw e;
        }
    },

    // 8. Logout
    logout: async () => {
        await signOut(auth);
    },

    // 9. Get Session
    getSession: async (): Promise<UserAccount | null> => {
        return new Promise((resolve) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                unsubscribe();
                if (user) {
                    resolve({
                        id: user.uid,
                        username: user.displayName || user.email?.split('@')[0] || 'Student',
                        passwordHash: '',
                        createdAt: user.metadata.creationTime || new Date().toISOString()
                    });
                } else {
                    resolve(null);
                }
            });
        });
    }
};
