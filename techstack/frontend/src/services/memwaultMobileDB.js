/**
 * MemWault Mobile IndexedDB & CacheStorage Offline Storage Engine
 * Provides persistent local storage for stories, feed posts, journals, 
 * highlights, and real media blobs (images/videos/audio) directly on the phone.
 */

const DB_NAME = 'memwault_mobile_vault';
const DB_VERSION = 2;
const CACHE_NAME = 'memwault-media-vault-v2';

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

      // Object store for binary media blobs (offline media cache)
      if (!db.objectStoreNames.contains('media_blobs')) {
        db.createObjectStore('media_blobs', { keyPath: 'url' });
      }

      // Object store for pending mobile uploads
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
 * Cache a media URL as a binary Blob in both IndexedDB and CacheStorage
 */
export async function cacheMediaBlob(url, blob) {
  if (!url || !blob) return null;
  try {
    // 1. Save to CacheStorage for Service Worker interception
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(CACHE_NAME);
        const headers = new Headers({
          'Content-Type': blob.type || 'image/jpeg',
          'Content-Length': String(blob.size),
        });
        await cache.put(url, new Response(blob, { headers }));
      } catch (e) {}
    }

    // 2. Save to IndexedDB media_blobs
    const db = await openMobileDB();
    const tx = db.transaction(['media_blobs'], 'readwrite');
    const store = tx.objectStore('media_blobs');
    store.put({
      url,
      blob,
      size: blob.size,
      mime: blob.type,
      cached_at: new Date().toISOString(),
    });

    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = rej;
    });

    return true;
  } catch (err) {
    console.warn('Failed to cache media blob:', err);
    return false;
  }
}

/**
 * Retrieve cached blob for a media URL
 */
export async function getCachedMediaBlob(url) {
  if (!url) return null;
  try {
    const db = await openMobileDB();
    const tx = db.transaction(['media_blobs'], 'readonly');
    const store = tx.objectStore('media_blobs');
    const request = store.get(url);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        if (request.result?.blob) {
          resolve(request.result.blob);
        } else {
          // Fallback to CacheStorage
          if (typeof caches !== 'undefined') {
            caches.open(CACHE_NAME).then(cache => cache.match(url)).then(res => {
              if (res) res.blob().then(resolve).catch(() => resolve(null));
              else resolve(null);
            }).catch(() => resolve(null));
          } else {
            resolve(null);
          }
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
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
    console.error('Failed to get offline posts:', err);
    return [];
  }
}

/**
 * Save highlights into local offline IndexedDB
 */
export async function saveHighlightsOffline(highlights) {
  try {
    const db = await openMobileDB();
    const tx = db.transaction(['highlights'], 'readwrite');
    const store = tx.objectStore('highlights');

    for (const hl of highlights) {
      store.put(hl);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    return false;
  }
}

/**
 * Get offline highlights
 */
export async function getOfflineHighlights() {
  try {
    const db = await openMobileDB();
    const tx = db.transaction(['highlights'], 'readonly');
    const store = tx.objectStore('highlights');
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch (err) {
    return [];
  }
}

/**
 * Queue a new photo taken on the phone
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
 * Get accurate device storage usage in MB from media blobs + IndexedDB
 */
export async function getStorageStats() {
  try {
    const memories = await getOfflineMemories();
    const posts = await getOfflinePosts();
    const pending = await getPendingMobileUploads();
    const highlights = await getOfflineHighlights();
    
    let totalBytes = JSON.stringify(memories).length + JSON.stringify(posts).length + JSON.stringify(highlights).length;
    
    for (const p of pending) {
      if (p.dataUrl) totalBytes += p.dataUrl.length;
      if (p.size) totalBytes += p.size;
    }

    // Measure media_blobs store size
    const db = await openMobileDB();
    if (db.objectStoreNames.contains('media_blobs')) {
      const tx = db.transaction(['media_blobs'], 'readonly');
      const store = tx.objectStore('media_blobs');
      const allBlobs = await new Promise((res) => {
        const req = store.getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => res([]);
      });
      for (const b of allBlobs) {
        totalBytes += (b.size || b.blob?.size || 0);
      }
    }

    // Try navigator.storage.estimate if available
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        if (est.usage && est.usage > totalBytes) {
          totalBytes = est.usage;
        }
      } catch (e) {}
    }

    const mb = (totalBytes / (1024 * 1024)).toFixed(2);
    return {
      memoryCount: memories.length,
      postCount: posts.length,
      pendingCount: pending.length,
      highlightCount: highlights.length,
      storageMb: mb,
      bytes: totalBytes
    };
  } catch (err) {
    return { memoryCount: 0, postCount: 0, pendingCount: 0, highlightCount: 0, storageMb: '0.00', bytes: 0 };
  }
}
