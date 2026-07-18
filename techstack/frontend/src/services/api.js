/**
 * MemWault API Service Layer
 * Centralized fetch wrapper for all backend API calls.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * Get the stored JWT token from localStorage.
 */
function getToken() {
  return localStorage.getItem('sv_token');
}

/**
 * Store the JWT token in localStorage.
 */
export function setToken(token) {
  localStorage.setItem('sv_token', token);
}

/**
 * Remove the stored token (logout).
 */
export function clearToken() {
  localStorage.removeItem('sv_token');
}

/**
 * Check if the user is currently authenticated.
 */
export function isAuthenticated() {
  return !!getToken();
}

/**
 * Core fetch wrapper with auth headers and error handling.
 */
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    // Only redirect if we're not already on the login page (avoids infinite spinner bug)
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    const error = await response.json().catch(() => ({ detail: 'Invalid credentials' }));
    throw new Error(error.detail || 'Invalid credentials');
  }


  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}


// ═══════════════════════════════════════════════════════════
// Auth API
// ═══════════════════════════════════════════════════════════

export async function register(username, password) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function login(username, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (data.access_token) {
    setToken(data.access_token);
  }
  return data;
}

export async function getMe() {
  return apiFetch('/auth/me');
}


// ═══════════════════════════════════════════════════════════
// Instagram Session API
// ═══════════════════════════════════════════════════════════

export async function connectInstagram(igUsername, igPassword, sessionid = null) {
  return apiFetch('/instagram/login', {
    method: 'POST',
    body: JSON.stringify({
      ig_username: igUsername,
      ig_password: igPassword || null,
      sessionid: sessionid || null,
    }),
  });
}

export async function browserLoginInstagram() {
  // This endpoint opens a real browser window on the server.
  // It takes a while (user needs to log in), so we use a long timeout.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 330000); // 5.5 min timeout

  try {
    return await apiFetch('/instagram/browser-login', {
      method: 'POST',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getInstagramSession() {
  return apiFetch('/instagram/session');
}

export async function disconnectInstagram() {
  return apiFetch('/instagram/session', { method: 'DELETE' });
}

export async function renewInstagramSession() {
  // Opens a real browser window on the server to refresh cookies
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 330000); // 5.5 min timeout
  try {
    return await apiFetch('/instagram/renew', {
      method: 'POST',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}



export async function getStories(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page);
  if (params.pageSize) searchParams.set('page_size', params.pageSize);
  if (params.mediaType) searchParams.set('media_type', params.mediaType);
  if (params.hasMusic !== undefined) searchParams.set('has_music', params.hasMusic);
  if (params.hasLocation !== undefined) searchParams.set('has_location', params.hasLocation);
  if (params.dateFrom) searchParams.set('date_from', params.dateFrom);
  if (params.dateTo) searchParams.set('date_to', params.dateTo);
  if (params.isReel !== undefined) searchParams.set('is_reel', params.isReel);
  if (params.isMemory !== undefined) searchParams.set('is_memory', params.isMemory);
  if (params.isArchived !== undefined) searchParams.set('is_archived', params.isArchived);
  if (params.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return apiFetch(`/stories${query ? `?${query}` : ''}`);
}

export async function getStory(storyId) {
  return apiFetch(`/stories/${storyId}`);
}

export async function getStoryViewers(storyId) {
  return apiFetch(`/stories/${storyId}/viewers`);
}

export async function getAdjacentStories(storyId) {
  return apiFetch(`/stories/${storyId}/adjacent`);
}

export async function getStoryManifest(storyId) {
  return apiFetch(`/stories/${storyId}/manifest`);
}

export async function getAllStoryLocations() {
  return apiFetch(`/stories/locations/all`);
}

export async function updateStory(storyId, updates) {
  return apiFetch(`/stories/${storyId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

/**
 * Bulk update multiple stories in one request.
 * @param {number[]} story_ids  Array of story IDs to update
 * @param {object}  updates     Fields to patch (e.g. { is_archived: true })
 */
export async function bulkUpdateStories(story_ids, updates) {
  return apiFetch('/stories/bulk', {
    method: 'PATCH',
    body: JSON.stringify({ story_ids, ...updates }),
  })
}

// Deprecated, use updateStory instead
export async function toggleStoryReel(storyId) {
  return apiFetch(`/stories/${storyId}/toggle-reel`, {
    method: 'PUT'
  });
}

export async function rescanMetadata() {
  return apiFetch(`/stories/rescan-metadata`, {
    method: 'POST'
  });
}


// ═══════════════════════════════════════════════════════════
// Scraping API
// ═══════════════════════════════════════════════════════════

export async function triggerScrape(force = false) {
  return apiFetch('/scrape/now', {
    method: 'POST',
    body: JSON.stringify({ force }),
  });
}

export async function triggerArchiveImport(maxStories = null) {
  return apiFetch('/scrape/archive', {
    method: 'POST',
    body: JSON.stringify({ max_stories: maxStories }),
  });
}

export async function getScrapeLogs(limit = 10) {
  return apiFetch(`/scrape/logs?limit=${limit}`);
}


// ═══════════════════════════════════════════════════════════
// Dashboard API
// ═══════════════════════════════════════════════════════════

export async function getDashboardStats() {
  return apiFetch('/dashboard/stats');
}

export async function locateStoryMedia(storyId) {
  const res = await apiFetch(`/media/locate`, {
    method: 'POST',
    body: JSON.stringify({ story_id: storyId })
  })
  return res
}

export async function updateStoryLocation(storyId, locationData) {
  const res = await apiFetch(`/media/${storyId}/location`, {
    method: 'PUT',
    body: JSON.stringify(locationData)
  })
  return res
}

export async function getHighlights() {
  return apiFetch('/highlights')
}

export async function triggerHighlightsSync() {
  return apiFetch('/scrape/highlights', { method: 'POST' })
}

export async function getHighlightStories(highlightId) {
  return apiFetch(`/highlights/${highlightId}/stories`)
}

export async function createHighlight(title, storyIds) {
  return apiFetch('/highlights/manual', {
    method: 'POST',
    body: JSON.stringify({ title, story_ids: storyIds }),
  })
}
