/**
 * MemWault Mobile IndexedDB Offline Storage Engine
 * Provides persistent local storage for stories, feed posts, journals, 
 * and mobile-captured camera photos directly on the phone.
 */

const DB_NAME = 'memwault_mobile_vault';
const DB_VERSION = 1;

let dbPromise = null;

export function openMobileDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Object store for memories (stories)
      if (!db.objectStoreNames.contains('memories')) {
        const memoryStore = db.createObjectStore('memories', { keyPath: 'id' });
        memoryStore.createIndex('taken_at', 'taken_at', { unique: false });
        memoryStore.createIndex('media_type', 'media_type', { unique: false });
      }

      // Object store for feed posts
      if (!db.objectStoreNames.contains('posts')) {
        const postStore = db.createObjectStore('posts', { keyPath: 'id' });
        postStore.createIndex('taken_at', 'taken_at', { unique: false });
      }

      // Object store for highlights
      if (!db.objectStoreNames.contains('highlights')) {
        db.createObjectStore('highlights', { keyPath: 'id' });
      }

      // Object store for pending mobile uploads (photos added on phone to sync to PC)
      if (!db.objectStoreNames.contains('pending_uploads')) {
        db.createObjectStore('pending_uploads', { keyPath: 'id', autoIncrement: true });
      }

      // Object store for sync metadata & settings
      if (!db.objectStoreNames.contains('sync_meta')) {
        db.createObjectStore('sync_meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('Failed to open Mobile IndexedDB:', event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

/**
 * Save stories into local offline IndexedDB
 */
export async function saveMemoriesOffline(stories) {
  try {
    const db = await openMobileDB();
    const tx = db.transaction(['memories'], 'readwrite');
    const store = tx.objectStore('memories');
    
    for (const story of stories) {
      store.put(story);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save memories offline:', err);
    return false;
  }
}

/**
 * Get all offline memories from IndexedDB
 */
export async function getOfflineMemories() {
  try {
    const db = await openMobileDB();
    const tx = db.transaction(['memories'], 'readonly');
    const store = tx.objectStore('memories');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get offline memories:', err);
    return [];
  }
}

/**
 * Save feed posts into local offline IndexedDB
 */
export async function savePostsOffline(posts) {
  try {
    const db = await openMobileDB();
    const tx = db.transaction(['posts'], 'readwrite');
    const store = tx.objectStore('posts');

    for (const post of posts) {
      store.put(post);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save posts offline:', err);
    return false;
  }
}

/**
 * Get all offline feed posts
 */
export async function getOfflinePosts() {
  try {
    const db = await openMobileDB();
    const tx = db.transaction(['posts'], 'readonly');
    const store = tx.objectStore('posts');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    return [];
  }
}

/**
 * Queue a photo/video captured on phone to be synced to PC
 */
export async function addPendingMobileUpload(uploadData) {
  try {
    const db = await openMobileDB();
    const tx = db.transaction(['pending_uploads'], 'readwrite');
    const store = tx.objectStore('pending_uploads');
    
    const entry = {
      ...uploadData,
      created_at: new Date().toISOString()
    };
    store.add(entry);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to queue mobile upload:', err);
    return false;
  }
}

/**
 * Get all pending mobile uploads
 */
export async function getPendingMobileUploads() {
  try {
    const db = await openMobileDB();
    const tx = db.transaction(['pending_uploads'], 'readonly');
    const store = tx.objectStore('pending_uploads');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    return [];
  }
}

/**
 * Delete a pending upload after successful sync to PC
 */
export async function removePendingUpload(id) {
  try {
    const db = await openMobileDB();
    const tx = db.transaction(['pending_uploads'], 'readwrite');
    const store = tx.objectStore('pending_uploads');
    store.delete(id);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    return false;
  }
}

/**
 * Update sync metadata
 */
export async function saveSyncMeta(key, value) {
  try {
    const db = await openMobileDB();
    const tx = db.transaction(['sync_meta'], 'readwrite');
    const store = tx.objectStore('sync_meta');
    store.put({ key, value, updated_at: new Date().toISOString() });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    return false;
  }
}

/**
 * Get sync metadata
 */
export async function getSyncMeta(key, defaultValue = null) {
  try {
    const db = await openMobileDB();
    const tx = db.transaction(['sync_meta'], 'readonly');
    const store = tx.objectStore('sync_meta');
    const request = store.get(key);

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result?.value ?? defaultValue);
      request.onerror = () => resolve(defaultValue);
    });
  } catch (err) {
    return defaultValue;
  }
}

/**
 * Get device storage estimation
 */
export async function getStorageStats() {
  try {
    const memories = await getOfflineMemories();
    const posts = await getOfflinePosts();
    const pending = await getPendingMobileUploads();
    
    // Estimate size in bytes
    let estimatedBytes = JSON.stringify(memories).length + JSON.stringify(posts).length;
    for (const p of pending) {
      if (p.dataUrl) estimatedBytes += p.dataUrl.length;
    }

    const mb = (estimatedBytes / (1024 * 1024)).toFixed(2);
    return {
      memoryCount: memories.length,
      postCount: posts.length,
      pendingCount: pending.length,
      storageMb: mb
    };
  } catch (err) {
    return { memoryCount: 0, postCount: 0, pendingCount: 0, storageMb: '0.00' };
  }
}
