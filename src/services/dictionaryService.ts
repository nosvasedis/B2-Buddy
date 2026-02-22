/**
 * Dictionary lookup: local thesaurus first, then optional AI fallback.
 */
import type { DictionaryResult } from "./openRouterService";
import { getThesaurusEntry } from "../data/b2Thesaurus";

/** Look up a word in the local B2 thesaurus. Returns null if not found. */
export function lookupWordLocal(word: string): DictionaryResult | null {
    if (!word || typeof word !== "string") return null;
    return getThesaurusEntry(word.trim());
}
