/**
 * Local B1–B2 thesaurus for Dictionary Vault. Look up here first; use AI only if not found.
 * Keys are lowercase for O(1) lookup.
 */
import type { DictionaryResult } from "../services/openRouterService";
import { DAILY_WORDS } from "./dailyWords";

function toResult(entry: { word: string; type: string; meaning: string; example: string }): DictionaryResult {
    return {
        word: entry.word,
        phonetic: "",
        definition: entry.meaning,
        partOfSpeech: entry.type,
        cefr: "B2",
        synonyms: [],
        antonyms: [],
        examples: entry.example ? [entry.example] : [],
        wordFamily: []
    };
}

const map = new Map<string, DictionaryResult>();
for (const entry of DAILY_WORDS) {
    const key = entry.word.toLowerCase().trim();
    if (!map.has(key)) {
        map.set(key, toResult(entry));
    }
}

/** O(1) local lookup. Returns null if word is not in the thesaurus. */
export function getThesaurusEntry(word: string): DictionaryResult | null {
    const key = word.toLowerCase().trim();
    return map.get(key) ?? null;
}
