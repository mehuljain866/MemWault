/**
 * Pocket PC Offline Sync & Memory Cache Service
 * Enables full offline browsing of personal memories on mobile devices.
 */

import { getStories, getPosts } from './api';

const CACHE_KEY_STORIES = 'memwault_pocket_stories';
const CACHE_KEY_POSTS = 'memwault_pocket_posts';
const CACHE_KEY_SYNC_META = 'memwault_pocket_sync_meta';

export function getCachedPocketMemories() {
  try {
    const raw = localStorage.getItem(CACHE_KEY_STORIES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function getCachedPocketPosts() {
  try {
    const raw = localStorage.getItem(CACHE_KEY_POSTS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function getPocketSyncMeta() {
  try {
    const raw = localStorage.getItem(CACHE_KEY_SYNC_META);
    return raw ? JSON.parse(raw) : { lastSync: null, storyCount: 0, postCount: 0 };
  } catch (e) {
    return { lastSync: null, storyCount: 0, postCount: 0 };
  }
}

export async function syncPocketWithLaptop() {
  try {
    const storyData = await getStories({ pageSize: 300 });
    const stories = Array.isArray(storyData) ? storyData : (storyData?.stories || storyData?.items || []);
    
    const postData = await getPosts({ pageSize: 100 });
    const posts = Array.isArray(postData) ? postData : (postData?.posts || postData?.items || []);

    localStorage.setItem(CACHE_KEY_STORIES, JSON.stringify(stories));
    localStorage.setItem(CACHE_KEY_POSTS, JSON.stringify(posts));

    const meta = {
      lastSync: new Date().toISOString(),
      storyCount: stories.length,
      postCount: posts.length,
      status: 'synced'
    };
    localStorage.setItem(CACHE_KEY_SYNC_META, JSON.stringify(meta));

    return { success: true, stories, posts, meta };
  } catch (err) {
    return { 
      success: false, 
      error: err.message,
      stories: getCachedPocketMemories(),
      posts: getCachedPocketPosts(),
      meta: getPocketSyncMeta()
    };
  }
}

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