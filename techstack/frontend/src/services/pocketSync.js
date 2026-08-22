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

  // Tier 1: Exact date anniversary (same month & day, past years)
  const exactMatches = [];
  // Tier 2: Same week anniversary (within 7 days of today, past years)
  const weekMatches = [];
  // Tier 3: Same month (past years)
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

  // Fallback: Pick top archived memories sorted by date with throwback label
  return stories.slice(0, 5).map((s, idx) => {
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
      return;
    }
  } catch (err) {
    // Network or CORS issue, proceed to proxy fallback
  }

  // Automatic Proxy Fallback for external or expired signed URLs
  if (typeof url === 'string' && url.startsWith('http') && !url.startsWith(window.location.origin)) {
    try {
      const proxyRes = await fetch(`/api/v1/proxy/image?url=${encodeURIComponent(url)}`);
      if (proxyRes.ok) {
        const blob = await proxyRes.blob();
        await cacheMediaBlob(url, blob);
      }
    } catch (e) {}
  }
}

/**
 * Complete ActiveSync Engine
 * Downloads metadata and real media blobs to make MemWault 100% functional offline!
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
            let sessionToken = item.token;
            if (!sessionToken) {
              const session = await createQRSession(item.postId || null);
              sessionToken = session?.token;
            }
            if (sessionToken) {
              await uploadToPortal(sessionToken, item.slideIndex || 0, fileBlob);
              await removePendingUpload(item.id);
            }
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
    onProgress({ step: 'Downloading feed posts & carousels...', percent: 45, status: 'downloading' });
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

    // Step 4: Fetch Highlights
    onProgress({ step: 'Downloading highlights & albums...', percent: 60, status: 'downloading' });
    let allHighlights = [];
    try {
      const hlData = await getHighlights();
      allHighlights = Array.isArray(hlData) ? hlData : (hlData?.highlights || hlData?.items || []);
      await saveHighlightsOffline(allHighlights);
    } catch (e) {}

    // Step 5: Multi-Tier Media Pre-caching
    // Priority 1: Cache 100% of thumbnails across stories, highlights, posts, and album covers
    // Priority 2: Cache full media for recent stories and carousels
    onProgress({ 
      step: `Pre-caching thumbnails & media assets for offline vault...`, 
      percent: 75, 
      status: 'caching' 
    });

    const thumbnailUrlsToCache = new Set();
    const fullMediaUrlsToCache = new Set();

    // 1. Stories thumbnails & recent full media
    allStories.forEach((s, idx) => {
      const thumb = s.thumbnail_url || s.cover_media_url || s.display_url || s.media_url || (s.s3_key_compressed ? `/api/v1/media/${s.s3_key_compressed}` : null);
      if (thumb) thumbnailUrlsToCache.add(thumb);
      if (idx < 30 && s.media_url) fullMediaUrlsToCache.add(s.media_url);
    });

    // 2. Highlights covers & preview thumbnails
    allHighlights.forEach(hl => {
      const cover = hl.cover_thumbnail_url || hl.cover_media_url;
      if (cover) thumbnailUrlsToCache.add(cover);
      if (Array.isArray(hl.preview_thumbnails)) {
        hl.preview_thumbnails.forEach(u => u && thumbnailUrlsToCache.add(u));
      }
      if (Array.isArray(hl.preview_stories)) {
        hl.preview_stories.forEach(u => u && thumbnailUrlsToCache.add(u));
      }
    });

    // 3. Posts thumbnails & recent full media
    allPosts.forEach((p, idx) => {
      if (p.media_items && p.media_items.length > 0) {
        p.media_items.forEach((m) => {
          const thumb = m.thumbnail_url || m.display_url || m.media_url || m.instagram_media_url;
          if (thumb) thumbnailUrlsToCache.add(thumb);
          if (idx < 15 && (m.media_url || m.display_url)) fullMediaUrlsToCache.add(m.media_url || m.display_url);
        });
      } else if (p.media_url || p.display_url) {
        const u = p.thumbnail_url || p.display_url || p.media_url;
        if (u) thumbnailUrlsToCache.add(u);
        if (idx < 15 && p.media_url) fullMediaUrlsToCache.add(p.media_url);
      }
    });

    const allThumbnails = Array.from(thumbnailUrlsToCache);
    const allFullMedia = Array.from(fullMediaUrlsToCache);
    const totalToCache = allThumbnails.length + allFullMedia.length;

    let cachedCount = 0;
    // Download and store thumbnails first
    for (const url of allThumbnails) {
      await downloadAndCacheMedia(url);
      cachedCount++;
      if (cachedCount % 15 === 0) {
        onProgress({
          step: `Cached ${cachedCount}/${totalToCache} thumbnails & media assets...`,
          percent: 75 + Math.round((cachedCount / (totalToCache || 1)) * 20),
          status: 'caching'
        });
      }
    }

    // Download full media for recent items
    for (const url of allFullMedia) {
      await downloadAndCacheMedia(url);
      cachedCount++;
      if (cachedCount % 10 === 0) {
        onProgress({
          step: `Cached ${cachedCount}/${totalToCache} thumbnails & media assets...`,
          percent: 75 + Math.round((cachedCount / (totalToCache || 1)) * 20),
          status: 'caching'
        });
      }
    }

    // Step 6: Finalize Sync & Storage Stats
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