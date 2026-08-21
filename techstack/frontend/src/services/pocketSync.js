/**
 * Pocket PC / Windows Phone Live Sync Engine
 * Handles bidirectional synchronization with progress tracking and offline storage.
 */

import { getStories, getPosts, uploadToPortal } from './api';
import { 
  saveMemoriesOffline, getOfflineMemories, 
  savePostsOffline, getOfflinePosts,
  getPendingMobileUploads, removePendingUpload,
  saveSyncMeta, getSyncMeta, getStorageStats 
} from './memwaultMobileDB';

export { getOfflineMemories, getOfflinePosts, getStorageStats };

/**
 * Get sync metadata
 */
export async function getPocketSyncMeta() {
  return await getSyncMeta('pocket_sync_meta', {
    lastSync: null,
    storyCount: 0,
    postCount: 0,
    serverIp: '192.168.29.50',
    status: 'idle'
  });
}

/**
 * Perform a full live sync with the laptop vault with progress callback
 * @param {Function} onProgress - callback({ step, percent, current, total, status })
 */
export async function syncPocketWithLaptop(onProgress = () => {}) {
  try {
    onProgress({ step: 'Connecting to Laptop Vault...', percent: 10, status: 'connecting' });

    // Step 1: Sync pending mobile uploads first (photos added on phone)
    const pending = await getPendingMobileUploads();
    if (pending && pending.length > 0) {
      onProgress({ 
        step: `Syncing ${pending.length} phone photos to laptop...`, 
        percent: 25, 
        status: 'uploading' 
      });

      for (let i = 0; i < pending.length; i++) {
        const item = pending[i];
        try {
          if (item.fileBlob) {
            // Upload to general portal
            const res = await fetch('/api/v1/upload/qr-session', { method: 'POST' });
            const session = await res.json();
            if (session && session.token) {
              await uploadToPortal(session.token, 0, item.fileBlob);
            }
          }
          await removePendingUpload(item.id);
        } catch (e) {
          console.warn('Failed to upload pending item:', e);
        }
      }
    }

    // Step 2: Fetch Stories from Laptop Backend
    onProgress({ step: 'Downloading memories from Laptop Vault...', percent: 45, status: 'downloading' });
    const storyData = await getStories({ pageSize: 500 });
    const stories = Array.isArray(storyData) ? storyData : (storyData?.stories || storyData?.items || []);

    onProgress({ 
      step: `Downloaded ${stories.length} memories. Saving to phone storage...`, 
      percent: 75, 
      status: 'saving' 
    });
    await saveMemoriesOffline(stories);

    // Step 3: Fetch Posts & Carousels
    onProgress({ step: 'Downloading feed posts & carousels...', percent: 85, status: 'downloading' });
    const postData = await getPosts({ pageSize: 100 });
    const posts = Array.isArray(postData) ? postData : (postData?.posts || postData?.items || []);
    await savePostsOffline(posts);

    // Step 4: Finalize Sync
    const meta = {
      lastSync: new Date().toISOString(),
      storyCount: stories.length,
      postCount: posts.length,
      status: 'synced'
    };
    await saveSyncMeta('pocket_sync_meta', meta);

    const stats = await getStorageStats();

    onProgress({ 
      step: `✓ Synced ${stories.length} Memories & ${posts.length} Posts (${stats.storageMb} MB offline)`, 
      percent: 100, 
      status: 'completed',
      stories,
      posts,
      meta,
      stats
    });

    return { success: true, stories, posts, meta, stats };
  } catch (err) {
    console.warn('Sync failed (offline or unreachable):', err);
    
    // Fallback to local offline cache
    const cachedStories = await getOfflineMemories();
    const cachedPosts = await getOfflinePosts();
    const meta = await getPocketSyncMeta();
    const stats = await getStorageStats();

    onProgress({ 
      step: `Offline Mode: Showing ${cachedStories.length} cached memories`, 
      percent: 100, 
      status: 'offline',
      error: err.message,
      stories: cachedStories,
      posts: cachedPosts,
      meta,
      stats
    });

    return { 
      success: false, 
      error: err.message,
      stories: cachedStories,
      posts: cachedPosts,
      meta,
      stats
    };
  }
}

/**
 * Find "On This Day" flashback memory
 */
export function getOnThisDayMemory(stories) {
  if (!stories || stories.length === 0) return null;
  const today = new Date();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  const match = stories.find(s => {
    if (!s.taken_at) return false;
    const d = new Date(s.taken_at);
    return d.getMonth() === todayMonth && d.getDate() === todayDate && d.getFullYear() !== today.getFullYear();
  });

  return match || stories[0] || null;
}