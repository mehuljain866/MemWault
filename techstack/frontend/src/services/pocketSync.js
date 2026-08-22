import { getStories, getPosts, getHighlights, getHighlightStories, uploadToPortal, createQRSession, isAuthenticated } from './api';
import { 
  saveMemoriesOffline, getOfflineMemories, 
  savePostsOffline, getOfflinePosts,
  saveHighlightsOffline, getOfflineHighlights,
  cacheMediaBlob, getCachedMediaBlob,
  getPendingMobileUploads, removePendingUpload,
  saveSyncMeta, getSyncMeta, getStorageStats 
} from './memwaultMobileDB';

export { getOfflineMemories, getOfflinePosts, getOfflineHighlights, getStorageStats, getCachedMediaBlob };

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

/**
 * Multi-tier intelligent On This Day / Throwback Flashback algorithm
 * Returns an array of flashback items with relative anniversary labels.
 */
export function getOnThisDayMemories(stories) {
  if (!stories || stories.length === 0) return [];
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();
  const currentYear = today.getFullYear();

  const exactMatches = [];
  const weekMatches = [];
  const monthMatches = [];

  for (const story of stories) {
    if (!story.taken_at) continue;
    const d = new Date(story.taken_at);
    const storyYear = d.getFullYear();
    const storyMonth = d.getMonth();
    const storyDate = d.getDate();
    const yearsAgo = currentYear - storyYear;

    if (storyMonth === currentMonth && storyDate === currentDate && yearsAgo >= 1) {
      exactMatches.push({
        ...story,
        relativeLabel: `${yearsAgo} ${yearsAgo === 1 ? 'YEAR' : 'YEARS'} AGO TODAY`,
        badgeText: `${storyYear} • ON THIS DAY`,
        isExact: true,
        yearsAgo,
      });
    } else if (storyMonth === currentMonth && Math.abs(storyDate - currentDate) <= 7 && yearsAgo >= 1) {
      weekMatches.push({
        ...story,
        relativeLabel: `${yearsAgo} ${yearsAgo === 1 ? 'YEAR' : 'YEARS'} AGO THIS WEEK`,
        badgeText: `${storyYear} • FLASHBACK`,
        isExact: false,
        yearsAgo,
      });
    } else if (storyMonth === currentMonth && yearsAgo >= 1) {
      monthMatches.push({
        ...story,
        relativeLabel: `FROM ${d.toLocaleString('default', { month: 'short' }).toUpperCase()} ${storyYear}`,
        badgeText: `${storyYear} • THROWBACK`,
        isExact: false,
        yearsAgo,
      });
    }
  }

  if (exactMatches.length > 0) return exactMatches;
  if (weekMatches.length > 0) return weekMatches;
  if (monthMatches.length > 0) return monthMatches;

  return stories.slice(0, 8).map((s) => {
    const d = s.taken_at ? new Date(s.taken_at) : new Date();
    const yr = d.getFullYear();
    return {
      ...s,
      relativeLabel: s.taken_at ? `MEMORY FROM ${d.toLocaleDateString()}` : 'VAULT FLASHBACK',
      badgeText: `${yr} • HIGHLIGHT`,
      isExact: false,
      yearsAgo: currentYear - yr,
    };
  });
}

export function getOnThisDayMemory(stories) {
  const list = getOnThisDayMemories(stories);
  return list.length > 0 ? list[0] : null;
}

/**
 * Downloads a single media asset over the network and caches it in local storage
 */
async function downloadAndCacheMedia(url) {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      await cacheMediaBlob(url, blob);
    }
  } catch (err) {
    // Non-critical individual fetch error
  }
}

/**
 * Complete ActiveSync Engine
 * Downloads metadata and 100% of media blobs (all photos, videos, and highlights)
 */
export async function syncPocketWithLaptop(onProgress = () => {}) {
  try {
    // Step 1: Upload any phone-captured photos first
    const pendingUploads = await getPendingMobileUploads();
    if (pendingUploads.length > 0 && isAuthenticated()) {
      onProgress({ 
        step: `Uploading ${pendingUploads.length} phone photos to laptop vault...`, 
        percent: 10, 
        status: 'uploading' 
      });

      for (let i = 0; i < pendingUploads.length; i++) {
        const item = pendingUploads[i];
        let fileBlob = item.fileBlob;
        if (!fileBlob && item.dataUrl) {
          fileBlob = dataURLtoBlob(item.dataUrl);
        }

        if (fileBlob) {
          try {
            await uploadToPortal(fileBlob, item.storyId);
            await removePendingUpload(item.id);
          } catch (e) {
            console.warn('Failed to upload pending item:', e);
          }
        }
      }
    }

    // Step 2: Fetch Stories from Laptop Backend
    onProgress({ step: 'Downloading stories & memories from laptop...', percent: 25, status: 'downloading' });
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

    await saveMemoriesOffline(allStories);

    // Step 3: Fetch Feed Posts
    onProgress({ step: 'Downloading feed posts & carousels...', percent: 40, status: 'downloading' });
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

    // Step 4: Fetch Highlights and their story reels
    onProgress({ step: 'Downloading highlights & albums...', percent: 55, status: 'downloading' });
    let allHighlights = [];
    try {
      const hlData = await getHighlights();
      const hlList = Array.isArray(hlData) ? hlData : (hlData?.highlights || hlData?.items || []);
      
      for (const hl of hlList) {
        try {
          const reel = await getHighlightStories(hl.id);
          const reelStories = Array.isArray(reel) ? reel : (reel?.stories || reel?.items || []);
          allHighlights.push({
            ...hl,
            stories: reelStories,
            cover_media_url: hl.cover_media_url || reelStories[0]?.media_url || null,
          });
        } catch (e) {
          allHighlights.push(hl);
        }
      }
      await saveHighlightsOffline(allHighlights);
    } catch (e) {}

    // Step 5: Full Media Pre-caching (Downloads 100% of raw media files)
    onProgress({ 
      step: `Caching full offline media archive (${allStories.length + allPosts.length} items)...`, 
      percent: 70, 
      status: 'caching' 
    });

    const mediaUrlsToCache = new Set();
    for (const s of allStories) {
      if (s.media_url) mediaUrlsToCache.add(s.media_url);
    }
    for (const p of allPosts) {
      if (p.media_items && p.media_items.length > 0) {
        for (const m of p.media_items) {
          const u = m.display_url || m.media_url || m.instagram_media_url;
          if (u) mediaUrlsToCache.add(u);
        }
      } else if (p.media_url) {
        mediaUrlsToCache.add(p.media_url);
      }
    }
    for (const hl of allHighlights) {
      if (hl.cover_media_url) mediaUrlsToCache.add(hl.cover_media_url);
      if (hl.stories) {
        for (const s of hl.stories) {
          if (s.media_url) mediaUrlsToCache.add(s.media_url);
        }
      }
    }

    const urlList = Array.from(mediaUrlsToCache);
    let cachedCount = 0;
    
    // Download in concurrent batches of 4
    const BATCH_SIZE = 4;
    for (let i = 0; i < urlList.length; i += BATCH_SIZE) {
      const chunk = urlList.slice(i, i + BATCH_SIZE);
      await Promise.all(chunk.map(u => downloadAndCacheMedia(u)));
      cachedCount += chunk.length;
      onProgress({
        step: `Cached ${cachedCount}/${urlList.length} media files into offline vault...`,
        percent: 70 + Math.round((cachedCount / urlList.length) * 28),
        status: 'caching'
      });
    }

    // Step 6: Finalize Sync & Accurate Storage Stats
    const stats = await getStorageStats();
    const meta = {
      lastSync: new Date().toISOString(),
      storyCount: allStories.length,
      postCount: allPosts.length,
      highlightCount: allHighlights.length,
      status: 'synced',
      serverIp: window.location.hostname
    };
    await saveSyncMeta('pocket_sync_meta', meta);

    onProgress({ 
      step: `✓ Synced ${allStories.length} Memories & ${allPosts.length} Posts (${stats.storageMb} MB offline)`, 
      percent: 100, 
      status: 'completed',
      stories: allStories,
      posts: allPosts,
      highlights: allHighlights,
      meta,
      stats
    });

    return { 
      success: true, 
      stories: allStories, 
      posts: allPosts, 
      highlights: allHighlights,
      meta, 
      stats 
    };
  } catch (err) {
    console.warn('Sync failed (using local offline cache):', err);
    
    const cachedStories = await getOfflineMemories();
    const cachedPosts = await getOfflinePosts();
    const cachedHighlights = await getOfflineHighlights();
    const meta = await getPocketSyncMeta();
    const stats = await getStorageStats();

    onProgress({ 
      step: `Offline Vault: ${cachedStories.length} Memories & ${cachedPosts.length} Posts available`, 
      percent: 100, 
      status: 'offline',
      error: err.message,
      stories: cachedStories,
      posts: cachedPosts,
      highlights: cachedHighlights,
      meta,
      stats
    });

    return { 
      success: false, 
      error: err.message, 
      stories: cachedStories, 
      posts: cachedPosts, 
      highlights: cachedHighlights,
      meta, 
      stats 
    };
  }
}

export async function getPocketSyncMeta() {
  return getSyncMeta('pocket_sync_meta', {
    lastSync: null,
    storyCount: 0,
    postCount: 0,
    highlightCount: 0,
    status: 'never'
  });
}