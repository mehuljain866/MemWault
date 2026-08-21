import { getStories, getPosts, uploadToPortal, createQRSession, isAuthenticated } from './api';
import { 
  saveMemoriesOffline, getOfflineMemories, 
  savePostsOffline, getOfflinePosts,
  getPendingMobileUploads, removePendingUpload,
  saveSyncMeta, getSyncMeta, getStorageStats 
} from './memwaultMobileDB';

export { getOfflineMemories, getOfflinePosts, getStorageStats };

function dataURLtoBlob(dataurl) {
  try {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.error('Failed to convert dataURL to Blob:', e);
    return null;
  }
}

export async function getPocketSyncMeta() {
  return await getSyncMeta('pocket_sync_meta', {
    lastSync: null,
    storyCount: 0,
    postCount: 0,
    serverIp: window.location.hostname || '192.168.29.50',
    status: 'idle'
  });
}

export async function syncPocketWithLaptop(onProgress = () => {}) {
  try {
    if (!isAuthenticated()) {
      throw new Error('Mobile device is not paired with laptop. Please scan the QR code from Connect Phone on your laptop.');
    }

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
          const blobToUpload = item.fileBlob || (item.dataUrl ? dataURLtoBlob(item.dataUrl) : null);
          if (blobToUpload) {
            const session = await createQRSession();
            if (session && session.token) {
              await uploadToPortal(session.token, 0, blobToUpload);
              await removePendingUpload(item.id);
            }
          } else {
            await removePendingUpload(item.id);
          }
        } catch (e) {
          console.warn('Failed to upload pending item:', e);
        }
      }
    }

    // Step 2: Fetch Stories with full pagination
    onProgress({ step: 'Downloading memories from Laptop Vault...', percent: 45, status: 'downloading' });
    let allStories = [];
    let page = 1;
    let hasMoreStories = true;

    while (hasMoreStories) {
      const storyData = await getStories({ page, pageSize: 500 });
      const batch = Array.isArray(storyData) ? storyData : (storyData?.stories || storyData?.items || []);
      allStories.push(...batch);
      if (storyData?.has_next && batch.length > 0) {
        page++;
      } else {
        hasMoreStories = false;
      }
    }

    onProgress({ 
      step: `Downloaded ${allStories.length} memories. Saving to phone storage...`, 
      percent: 75, 
      status: 'saving' 
    });
    await saveMemoriesOffline(allStories);

    // Step 3: Fetch Posts with full pagination
    onProgress({ step: 'Downloading feed posts & carousels...', percent: 85, status: 'downloading' });
    let allPosts = [];
    let postPage = 1;
    let hasMorePosts = true;

    while (hasMorePosts) {
      const postData = await getPosts({ page: postPage, pageSize: 100 });
      const batch = Array.isArray(postData) ? postData : (postData?.posts || postData?.items || []);
      allPosts.push(...batch);
      if (postData?.has_next && batch.length > 0) {
        postPage++;
      } else {
        hasMorePosts = false;
      }
    }
    await savePostsOffline(allPosts);

    // Step 4: Finalize Sync
    const meta = {
      lastSync: new Date().toISOString(),
      storyCount: allStories.length,
      postCount: allPosts.length,
      status: 'synced',
      serverIp: window.location.hostname
    };
    await saveSyncMeta('pocket_sync_meta', meta);

    const stats = await getStorageStats();

    onProgress({ 
      step: `✓ Synced ${allStories.length} Memories & ${allPosts.length} Posts (${stats.storageMb} MB offline)`, 
      percent: 100, 
      status: 'completed',
      stories: allStories,
      posts: allPosts,
      meta,
      stats
    });

    return { success: true, stories: allStories, posts: allPosts, meta, stats };
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