/**
 * MemWault API Service Layer
 * Centralized fetch wrapper for all backend API calls.
 */

/**
 * Get the active Vault Server URL (e.g. 'http://192.168.29.51:8000' or 'https://tunnel.trycloudflare.com')
 */
export function getVaultUrl() {
  const custom = localStorage.getItem('sv_vault_url') || localStorage.getItem('metro_server_host');
  if (custom && custom.trim()) {
    let clean = custom.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `http://${clean}`;
    }
    return clean.replace(/\/$/, '');
  }
  return '';
}

/**
 * Store the active Vault Server URL
 */
export function setVaultUrl(url) {
  if (!url || !url.trim()) {
    localStorage.removeItem('sv_vault_url');
    localStorage.removeItem('metro_server_host');
  } else {
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `http://${clean}`;
    }
    const finalUrl = clean.replace(/\/$/, '');
    localStorage.setItem('sv_vault_url', finalUrl);
    localStorage.setItem('metro_server_host', finalUrl);
  }
}

/**
 * Clear the custom Vault Server URL
 */
export function clearVaultUrl() {
  localStorage.removeItem('sv_vault_url');
  localStorage.removeItem('metro_server_host');
}

/**
 * Get dynamic API Base URL
 */
export function getApiBase() {
  const vault = getVaultUrl();
  if (vault) {
    return `${vault}/api/v1`;
  }
  return import.meta.env.VITE_API_URL || '/api/v1';
}

/**
 * Test connectivity with a target Vault URL
 */
export async function testVaultConnection(targetUrl = '') {
  const base = targetUrl ? `${targetUrl.replace(/\/$/, '')}/api/v1` : getApiBase();
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${base}/auth/me`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - start);
    return { ok: res.ok || res.status === 401, latency, status: res.status };
  } catch (err) {
    clearTimeout(timeoutId);
    return { ok: false, error: err.message || 'Unreachable' };
  }
}

/**
 * Get the stored JWT token from localStorage or sessionStorage.
 */
function getToken() {
  return localStorage.getItem('sv_token') || sessionStorage.getItem('sv_token');
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
 * Core fetch wrapper with auth headers, timeout, and error handling.
 */
export async function apiFetch(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 14000); // 14s timeout

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', () => controller.abort());
    }
  }

  try {
    const token = getToken();
    const headers = { ...options.headers };
    
    if (!('Content-Type' in headers)) {
      headers['Content-Type'] = 'application/json';
    } else if (headers['Content-Type'] === null) {
      delete headers['Content-Type'];
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const apiBase = getApiBase();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = endpoint.startsWith('http://') || endpoint.startsWith('https://') ? endpoint : `${apiBase}${cleanEndpoint}`;

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 401) {
      clearToken();
      // Only redirect to /login if we're not already on public/guest routes
      const path = window.location.pathname;
      if (!path.startsWith('/login') && !path.startsWith('/pocket') && !path.startsWith('/upload-link') && !path.startsWith('/mobile-paint')) {
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
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  }
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

export async function uploadProfilePic(file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/user/profile-pic', {
    method: 'POST',
    headers: { 'Content-Type': null },
    body: formData,
  });
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
  if (params.isTrashed !== undefined) searchParams.set('is_trashed', params.isTrashed);
  if (params.isCloseFriends !== undefined) searchParams.set('is_close_friends', params.isCloseFriends);
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

export async function refreshStoryViewers(storyId) {
  return apiFetch(`/stories/${storyId}/refresh-viewers`, { method: 'POST' });
}

export async function getAdjacentStories(storyId, params = {}) {
  const searchParams = new URLSearchParams();
  if (params.location) searchParams.set('location_name', params.location);
  const qs = searchParams.toString();
  return apiFetch(`/stories/${storyId}/adjacent${qs ? `?${qs}` : ''}`);
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
 * @param {object}  updates     Fields to patch (e.g. { is_trashed: true })
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

export async function triggerFullScan(maxStories = null) {
  return apiFetch('/scrape/full', {
    method: 'POST',
    body: JSON.stringify({ max_stories: maxStories }),
  });
}

export async function getScrapeLogs(limit = 10) {
  return apiFetch(`/scrape/logs?limit=${limit}`);
}

export async function getScrapeStatus() {
  return apiFetch('/scrape/status');
}


// ═══════════════════════════════════════════════════════════
// Dashboard API
// ═══════════════════════════════════════════════════════════

export async function getDashboardStats() {
  return apiFetch('/dashboard/stats');
}

export async function locateStoryMedia(storyId) {
  const res = await apiFetch(`/stories/locate`, {
    method: 'POST',
    body: JSON.stringify({ story_id: storyId })
  })
  return res
}

export async function openStorageFolder() {
  const res = await apiFetch(`/storage/open-folder`, {
    method: 'POST'
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

export async function deleteHighlight(highlightId) {
  return apiFetch(`/highlights/${highlightId}`, { method: 'DELETE' })
}

export async function uploadHighlightCover(highlightId, file) {
  const formData = new FormData()
  formData.append('file', file)
  return apiFetch(`/highlights/${highlightId}/cover`, {
    method: 'POST',
    headers: { 'Content-Type': null },
    body: formData
  })
}

export async function updateHighlight(highlightId, title) {
  return apiFetch(`/highlights/${highlightId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  })
}

export async function addStoriesToHighlight(highlightId, storyIds) {
  return apiFetch(`/highlights/${highlightId}/stories`, {
    method: 'POST',
    body: JSON.stringify({ story_ids: storyIds }),
  })
}

export async function removeStoriesFromHighlight(highlightId, storyIds) {
  return apiFetch(`/highlights/${highlightId}/stories`, {
    method: 'DELETE',
    body: JSON.stringify({ story_ids: storyIds }),
  })
}

// ═══════════════════════════════════════════════════════════
// Posts & Carousels API
// ═══════════════════════════════════════════════════════════

export async function getPosts(params = {}) {
  const searchParams = new URLSearchParams()
  if (params.mediaType) searchParams.append('media_type', params.mediaType)
  if (params.isFavorite !== undefined) searchParams.append('is_favorite', params.isFavorite)
  if (params.page) searchParams.append('page', params.page)
  if (params.pageSize) searchParams.append('page_size', params.pageSize)
  const query = searchParams.toString()
  return apiFetch(`/posts${query ? `?${query}` : ''}`)
}

export async function getPost(postId) {
  return apiFetch(`/posts/${postId}`)
}

export async function triggerPostsSync(amount = 50) {
  return apiFetch(`/posts/sync?amount=${amount}`, { method: 'POST' })
}

export async function updatePost(postId, updates) {
  return apiFetch(`/posts/${postId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export async function updatePostMedia(postId, mediaId, updates) {
  return apiFetch(`/posts/${postId}/media/${mediaId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export async function replacePostMediaRaw(postId, mediaId, file, companionVideo = null) {
  const formData = new FormData()
  formData.append('file', file)
  if (companionVideo) {
    formData.append('companion_video', companionVideo)
  }
  return apiFetch(`/posts/${postId}/media/${mediaId}/replace-raw`, {
    method: 'POST',
    headers: { 'Content-Type': null },
    body: formData,
  })
}

export async function createQRSession(postId = null) {
  if (postId) {
    return apiFetch(`/posts/${postId}/qr-session`, { method: 'POST' })
  }
  return apiFetch('/upload/qr-session', { method: 'POST' })
}

export async function getUploadPortalSession(token) {
  const res = await fetch(`/api/v1/upload-portal/${token}`)
  if (!res.ok) throw new Error('Session not found or expired')
  return res.json()
}

export async function uploadToPortal(token, slideIndex, file, companionVideo = null) {
  const formData = new FormData()
  formData.append('file', file)
  if (companionVideo) {
    formData.append('companion_video', companionVideo)
  }
  const res = await fetch(`/api/v1/upload-portal/${token}/upload?slide_index=${slideIndex}`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}

export async function shutdownSystem() {
  return apiFetch('/system/shutdown', {
    method: 'POST',
  })
}

export async function startRemoteTunnel(port = 8000, force = false) {
  return apiFetch(`/remote-tunnel/start?port=${port}&force=${force}`, {
    method: 'POST',
  })
}

export async function stopRemoteTunnel() {
  return apiFetch('/remote-tunnel/stop', {
    method: 'POST',
  })
}

export async function getRemoteTunnelStatus() {
  return apiFetch('/remote-tunnel/status')
}

export async function generatePairingTicket(mode = 'remote') {
  return apiFetch(`/pair/generate-ticket?mode=${mode}`, {
    method: 'POST',
  })
}

export async function getPairingTicketStatus(ticket) {
  return apiFetch(`/pair/ticket-status?ticket=${encodeURIComponent(ticket)}`)
}

export async function redeemPairingTicket(ticket, deviceName = 'Mobile Companion') {
  const apiBase = getApiBase()
  const res = await fetch(`${apiBase}/pair/redeem-ticket?ticket=${encodeURIComponent(ticket)}&device_name=${encodeURIComponent(deviceName)}`, {
    method: 'POST',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to redeem ticket' }))
    throw new Error(err.detail || 'Invalid or expired pairing ticket')
  }
  return res.json()
}

export async function getConnectedDevices() {
  return apiFetch('/pair/connected-devices')
}

export async function deleteConnectedDevice(deviceId) {
  return apiFetch(`/pair/connected-devices/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE',
  })
}




