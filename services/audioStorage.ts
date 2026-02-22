
/**
 * Local Audio Storage using IndexedDB.
 * Completely decoupled from Cloud/Supabase to ensure reliability and offline access.
 */
export const AudioStorage = {
  dbName: 'B2BuddyAudio',
  storeName: 'audio_files',

  async openDB() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      // Safety timeout for DB open
      const timeout = setTimeout(() => reject(new Error("DB Open Timeout")), 5000);

      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => {
          clearTimeout(timeout);
          resolve(request.result);
      };
      request.onerror = () => {
          clearTimeout(timeout);
          reject(request.error);
      };
    });
  },

  async saveAudio(key: string, blob: Blob) {
    // Save to IndexedDB (Local Device Cache)
    // This persists even if the tab is closed, unlike memory cache.
    try {
        const db = await this.openDB();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.put(blob, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        // console.log(`Audio saved locally: ${key}`);
    } catch (e) {
        console.warn("IndexedDB Save Failed", e);
    }
  },

  async getAudio(key: string): Promise<Blob | undefined> {
    // Try IndexedDB (Local Device Cache)
    try {
        const db = await this.openDB();
        const localData = await new Promise<Blob | undefined>((resolve, reject) => {
            // Safety timeout for read
            const timeout = setTimeout(() => reject(new Error("Read Timeout")), 5000);

            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.get(key);
            request.onsuccess = () => {
                clearTimeout(timeout);
                resolve(request.result);
            };
            request.onerror = () => {
                clearTimeout(timeout);
                reject(request.error);
            };
        });

        if (localData) return localData;
    } catch (e) {
        // console.warn("Local audio fetch failed", e);
    }
    return undefined;
  }
};
