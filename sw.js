// SIGNAID Service Worker v2.1.0
// Production-ready with advanced caching strategies, background sync, and offline support

const CACHE_NAME = 'signaid-v2';
const OFFLINE_URL = '/offline.html';
const API_CACHE_NAME = 'signaid-api-v1';
const MEDIA_CACHE_NAME = 'signaid-media-v1';
const MODEL_CACHE_NAME = 'signaid-models-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/firebase.html',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon-192x192.png',
  '/icons/maskable-icon-512x512.png'
];

// CDN assets to cache
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.18.0/dist/tf.min.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js'
];

// Language models to cache (would be actual model files in production)
const LANGUAGE_MODELS = [
  '/models/swahili-sign/model.json',
  '/models/swahili-sign/weights.bin',
  '/models/asl/model.json',
  '/models/asl/weights.bin',
  '/models/bsl/model.json',
  '/models/bsl/weights.bin',
  '/models/lsf/model.json',
  '/models/lsf/weights.bin'
];

// API endpoints to cache strategies
const API_ENDPOINTS = {
  '/api/languages': { strategy: 'cache-first', cacheDuration: 86400 },
  '/api/translate': { strategy: 'network-first', timeout: 3000 },
  '/api/sign-motions': { strategy: 'stale-while-revalidate' }
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing version 2.1.0');
  
  event.waitUntil(
    (async () => {
      try {
        // Open caches
        const staticCache = await caches.open(CACHE_NAME);
        const mediaCache = await caches.open(MEDIA_CACHE_NAME);
        const modelCache = await caches.open(MODEL_CACHE_NAME);
        
        // Cache static assets
        console.log('[Service Worker] Caching static assets...');
        await staticCache.addAll(STATIC_ASSETS);
        console.log(`[Service Worker] ✓ Cached ${STATIC_ASSETS.length} static assets`);
        
        // Cache CDN assets in background (don't block install)
        event.waitUntil(
          (async () => {
            try {
              for (const url of CDN_ASSETS) {
                try {
                  const response = await fetch(url, { mode: 'cors' });
                  if (response.ok) {
                    await mediaCache.put(url, response);
                    console.log(`[Service Worker] ✓ Cached CDN: ${url.split('/').pop()}`);
                  }
                } catch (error) {
                  console.log(`[Service Worker] ⚠ Failed to cache CDN: ${url}`);
                }
              }
            } catch (error) {
              console.log('[Service Worker] CDN caching error:', error);
            }
          })()
        );
        
        // Cache language models (critical for offline functionality)
        event.waitUntil(
          (async () => {
            try {
              for (const model of LANGUAGE_MODELS) {
                try {
                  const response = await fetch(model);
                  if (response.ok) {
                    await modelCache.put(model, response);
                    console.log(`[Service Worker] ✓ Cached model: ${model}`);
                  }
                } catch (error) {
                  console.log(`[Service Worker] ⚠ Model not available: ${model}`);
                }
              }
            } catch (error) {
              console.log('[Service Worker] Model caching error:', error);
            }
          })()
        );
        
        // Force activation
        await self.skipWaiting();
        console.log('[Service Worker] ✓ Install complete');
        
      } catch (error) {
        console.error('[Service Worker] Install failed:', error);
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    (async () => {
      try {
        // Get all cache names
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
          name.startsWith('signaid-') && 
          name !== CACHE_NAME && 
          name !== API_CACHE_NAME && 
          name !== MEDIA_CACHE_NAME && 
          name !== MODEL_CACHE_NAME
        );
        
        // Delete old caches
        await Promise.all(
          oldCaches.map(name => {
            console.log(`[Service Worker] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
        );
        
        // Take control of all clients
        await self.clients.claim();
        console.log('[Service Worker] ✓ Now controlling all clients');
        
        // Notify all clients
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: '2.1.0',
            timestamp: Date.now()
          });
        });
        
        console.log('[Service Worker] ✓ Activation complete');
        
      } catch (error) {
        console.error('[Service Worker] Activation failed:', error);
      }
    })()
  );
});

// Fetch event - advanced caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests that aren't CDNs or APIs
  if (!url.origin.includes('localhost') && 
      !url.origin.includes('127.0.0.1') &&
      !url.origin.includes('signaid.app') &&
      !CDN_ASSETS.some(cdn => url.href.includes(cdn)) &&
      !url.pathname.startsWith('/api/')) {
    return;
  }

  // API requests - Network first with fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Model files - Cache first with network update
  if (url.pathname.includes('/models/')) {
    event.respondWith(handleModelRequest(request));
    return;
  }

  // CDN assets - Cache first with background update
  if (url.href.includes('cdn') || url.pathname.match(/\.(js|css|png|jpg|svg|woff2?)$/)) {
    event.respondWith(handleMediaRequest(request));
    return;
  }

  // HTML navigation - Stale-while-revalidate
  if (request.mode === 'navigate' || 
      (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Default - Cache first with network fallback
  event.respondWith(handleDefaultRequest(request));
});

// Handle API requests
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const endpoint = Object.keys(API_ENDPOINTS).find(key => url.pathname.startsWith(key));
  const strategy = endpoint ? API_ENDPOINTS[endpoint].strategy : 'network-first';
  
  // Network first strategy
  if (strategy === 'network-first') {
    try {
      const timeout = endpoint ? API_ENDPOINTS[endpoint].timeout || 3000 : 3000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const networkResponse = await fetch(request, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (networkResponse.ok) {
        // Cache successful response
        const cache = await caches.open(API_CACHE_NAME);
        cache.put(request, networkResponse.clone());
        return networkResponse;
      }
    } catch (error) {
      console.log('[Service Worker] API network request failed:', error);
    }
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline API response
    return new Response(
      JSON.stringify({ 
        error: 'offline', 
        message: 'You are offline. Please check your connection.',
        cached: false,
        timestamp: Date.now()
      }),
      {
        status: 503,
        headers: { 
          'Content-Type': 'application/json',
          'X-Offline': 'true'
        }
      }
    );
  }
  
  // Cache first strategy
  if (strategy === 'cache-first') {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Update cache in background
      event.waitUntil(updateApiCache(request));
      return cachedResponse;
    }
    
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(API_CACHE_NAME);
        cache.put(request, networkResponse.clone());
        return networkResponse;
      }
    } catch (error) {
      console.log('[Service Worker] API fetch failed:', error);
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'unavailable', 
        message: 'Service unavailable offline'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Stale while revalidate
  const cachedResponse = await caches.match(request);
  const networkPromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        const cache = await caches.open(API_CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);
  
  if (cachedResponse) {
    event.waitUntil(networkPromise);
    return cachedResponse;
  }
  
  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }
  
  return new Response(
    JSON.stringify({ error: 'offline' }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Handle model requests
async function handleModelRequest(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Check if model needs update
    event.waitUntil(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const cache = await caches.open(MODEL_CACHE_NAME);
            await cache.put(request, networkResponse);
            console.log('[Service Worker] Model updated:', request.url);
          }
        } catch (error) {
          console.log('[Service Worker] Model update failed:', error);
        }
      })()
    );
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(MODEL_CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('[Service Worker] Model fetch failed:', error);
  }
  
  return new Response('Model unavailable offline', { 
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handle media requests
async function handleMediaRequest(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Background update for media
    event.waitUntil(updateMediaCache(request));
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(MEDIA_CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('[Service Worker] Media fetch failed:', error);
  }
  
  return new Response('Media unavailable offline', { status: 404 });
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try network first with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const networkResponse = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (networkResponse.ok) {
      // Update cache
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('[Service Worker] Navigation fetch failed:', error);
  }
  
  // Check cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Try offline page
  const offlineResponse = await caches.match(OFFLINE_URL);
  if (offlineResponse) {
    return offlineResponse;
  }
  
  // Generate minimal offline page
  return new Response(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>SIGNAID - Offline</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            background: linear-gradient(135deg, #0a0f1e, #1a2f45);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: system-ui;
            text-align: center;
            margin: 0;
          }
          .message {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 40px;
            border: 1px solid rgba(255,255,255,0.1);
          }
          h1 { font-size: 2.5rem; margin-bottom: 20px; }
          p { color: #aac9f0; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="message">
          <h1>📶 Offline Mode</h1>
          <p>SIGNAID is running in offline mode.<br>Some features may be limited.</p>
          <button onclick="window.location.reload()" style="background:#2563eb; color:white; border:none; padding:12px 30px; border-radius:30px; margin-top:20px; cursor:pointer;">
            Try Reconnecting
          </button>
        </div>
      </body>
    </html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

// Handle default requests
async function handleDefaultRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok && networkResponse.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Default fetch failed:', error);
    return new Response('Resource unavailable', { status: 404 });
  }
}

// Update API cache in background
async function updateApiCache(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      await cache.put(request, networkResponse);
      console.log('[Service Worker] API cache updated:', request.url);
    }
  } catch (error) {
    console.log('[Service Worker] API cache update failed:', error);
  }
}

// Update media cache in background
async function updateMediaCache(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(MEDIA_CACHE_NAME);
      await cache.put(request, networkResponse);
      console.log('[Service Worker] Media cache updated:', request.url);
    }
  } catch (error) {
    console.log('[Service Worker] Media cache update failed:', error);
  }
}

// Background sync for offline translations
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-translations') {
    event.waitUntil(syncOfflineTranslations());
  }
  
  if (event.tag === 'sync-user-data') {
    event.waitUntil(syncUserData());
  }
  
  if (event.tag === 'sync-models') {
    event.waitUntil(syncModels());
  }
});

// Sync offline translations
async function syncOfflineTranslations() {
  console.log('[Service Worker] Syncing offline translations...');
  
  try {
    // Open IndexedDB
    const db = await openTranslationDB();
    const pendingTranslations = await db.getAll('pending');
    
    console.log(`[Service Worker] Found ${pendingTranslations.length} pending translations`);
    
    for (const translation of pendingTranslations) {
      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Sync': 'true'
          },
          body: JSON.stringify(translation.data)
        });
        
        if (response.ok) {
          await db.delete('pending', translation.id);
          console.log('[Service Worker] ✓ Synced translation:', translation.id);
          
          // Notify client
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'TRANSLATION_SYNCED',
              id: translation.id,
              timestamp: Date.now()
            });
          });
        }
      } catch (error) {
        console.log('[Service Worker] Sync failed for translation:', translation.id, error);
      }
    }
    
  } catch (error) {
    console.error('[Service Worker] Sync error:', error);
  }
}

// Sync user data
async function syncUserData() {
  console.log('[Service Worker] Syncing user data...');
  
  try {
    const db = await openTranslationDB();
    const userData = await db.getAll('userData');
    
    for (const data of userData) {
      try {
        const response = await fetch('/api/user/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          await db.delete('userData', data.id);
        }
      } catch (error) {
        console.log('[Service Worker] User data sync failed:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] User data sync error:', error);
  }
}

// Sync models (check for updates)
async function syncModels() {
  console.log('[Service Worker] Checking model updates...');
  
  try {
    const cache = await caches.open(MODEL_CACHE_NAME);
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          const cachedResponse = await cache.match(request);
          const cachedVersion = cachedResponse?.headers.get('etag');
          const networkVersion = networkResponse.headers.get('etag');
          
          if (cachedVersion !== networkVersion) {
            await cache.put(request, networkResponse);
            console.log('[Service Worker] Model updated:', request.url);
          }
        }
      } catch (error) {
        console.log('[Service Worker] Model check failed:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Model sync error:', error);
  }
}

// IndexedDB for offline storage
function openTranslationDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SIGNAIDOffline', 2);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending')) {
        const pendingStore = db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true });
        pendingStore.createIndex('timestamp', 'timestamp');
        pendingStore.createIndex('type', 'type');
      }
      
      if (!db.objectStoreNames.contains('translations')) {
        const translationStore = db.createObjectStore('translations', { keyPath: 'id' });
        translationStore.createIndex('sourceLang', 'sourceLang');
        translationStore.createIndex('targetLang', 'targetLang');
        translationStore.createIndex('timestamp', 'timestamp');
      }
      
      if (!db.objectStoreNames.contains('userData')) {
        const userStore = db.createObjectStore('userData', { keyPath: 'id' });
        userStore.createIndex('userId', 'userId');
        userStore.createIndex('timestamp', 'timestamp');
      }
      
      if (!db.objectStoreNames.contains('models')) {
        db.createObjectStore('models', { keyPath: 'name' });
      }
      
      console.log('[Service Worker] IndexedDB setup complete');
    };
    
    request.onsuccess = () => {
      console.log('[Service Worker] IndexedDB opened');
      resolve(request.result);
    };
    
    request.onerror = () => {
      console.error('[Service Worker] IndexedDB error:', request.error);
      reject(request.error);
    };
  });
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);
  
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'SIGNAID', body: event.data.text() };
  }
  
  const options = {
    body: data.body || 'New update from SIGNAID',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: data.vibrate || [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      url: data.url || '/',
      actions: data.actions
    },
    actions: data.actions || [
      {
        action: 'open',
        title: 'Open SIGNAID'
      },
      {
        action: 'translate',
        title: 'Start Translation'
      }
    ],
    tag: data.tag || 'general',
    renotify: true,
    requireInteraction: data.requireInteraction || false
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'SIGNAID',
      options
    )
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(urlToOpen);
    })
  );
});

// Notification close handler
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event);
  
  // Track notification close for analytics
  event.waitUntil(
    (async () => {
      const db = await openTranslationDB();
      const tx = db.transaction('userData', 'readwrite');
      tx.objectStore('userData').add({
        type: 'notification_close',
        timestamp: Date.now(),
        tag: event.notification.tag
      });
    })()
  );
});

// Message handler
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearOldCache());
  }
  
  if (event.data.type === 'SAVE_OFFLINE') {
    event.waitUntil(saveOfflineData(event.data.data));
  }
  
  if (event.data.type === 'GET_CACHE_STATUS') {
    event.waitUntil(getCacheStatus(event));
  }
});

// Clear old cache
async function clearOldCache() {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => 
    name.startsWith('signaid-') && 
    name !== CACHE_NAME && 
    name !== API_CACHE_NAME && 
    name !== MEDIA_CACHE_NAME && 
    name !== MODEL_CACHE_NAME
  );
  
  await Promise.all(oldCaches.map(name => caches.delete(name)));
  
  // Notify clients
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'CACHE_CLEARED',
      caches: oldCaches,
      timestamp: Date.now()
    });
  });
  
  console.log('[Service Worker] Cleared old caches:', oldCaches);
}

// Save offline data
async function saveOfflineData(data) {
  try {
    const db = await openTranslationDB();
    const tx = db.transaction('pending', 'readwrite');
    
    await tx.objectStore('pending').add({
      type: data.type,
      data: data,
      timestamp: Date.now(),
      retryCount: 0
    });
    
    console.log('[Service Worker] Saved offline data:', data.type);
    
    // Register sync
    await self.registration.sync.register('sync-translations');
    
  } catch (error) {
    console.error('[Service Worker] Failed to save offline data:', error);
  }
}

// Get cache status
async function getCacheStatus(event) {
  const caches = await Promise.all([
    { name: CACHE_NAME, cache: await caches.open(CACHE_NAME) },
    { name: API_CACHE_NAME, cache: await caches.open(API_CACHE_NAME) },
    { name: MEDIA_CACHE_NAME, cache: await caches.open(MEDIA_CACHE_NAME) },
    { name: MODEL_CACHE_NAME, cache: await caches.open(MODEL_CACHE_NAME) }
  ]);
  
  const status = await Promise.all(
    caches.map(async ({ name, cache }) => {
      const keys = await cache.keys();
      return {
        name,
        size: keys.length,
        urls: keys.map(req => req.url)
      };
    })
  );
  
  event.source.postMessage({
    type: 'CACHE_STATUS',
    status,
    timestamp: Date.now()
  });
}

// Periodic sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('[Service Worker] Periodic sync:', event.tag);
  
  if (event.tag === 'update-models') {
    event.waitUntil(updateLanguageModels());
  }
  
  if (event.tag === 'clean-cache') {
    event.waitUntil(cleanupCache());
  }
});

// Update language models
async function updateLanguageModels() {
  console.log('[Service Worker] Checking for model updates...');
  
  try {
    const cache = await caches.open(MODEL_CACHE_NAME);
    const modelManifest = await fetch('/api/models/manifest');
    
    if (modelManifest.ok) {
      const manifest = await modelManifest.json();
      
      for (const model of manifest.models) {
        try {
          const response = await fetch(model.url);
          if (response.ok) {
            await cache.put(model.url, response);
            console.log('[Service Worker] Model updated:', model.name);
          }
        } catch (error) {
          console.log('[Service Worker] Model update failed:', model.name);
        }
      }
    }
  } catch (error) {
    console.error('[Service Worker] Model update error:', error);
  }
}

// Cleanup cache
async function cleanupCache() {
  console.log('[Service Worker] Cleaning up cache...');
  
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      // Check if request is still valid
      try {
        const response = await cache.match(request);
        const dateHeader = response?.headers.get('date');
        
        if (dateHeader) {
          const cacheDate = new Date(dateHeader).getTime();
          const now = Date.now();
          const age = now - cacheDate;
          
          // Remove items older than 30 days
          if (age > 30 * 24 * 60 * 60 * 1000) {
            await cache.delete(request);
            console.log('[Service Worker] Removed old cache item:', request.url);
          }
        }
      } catch (error) {
        console.log('[Service Worker] Cache cleanup error:', error);
      }
    }
  }
}

// Error handler
self.addEventListener('error', (event) => {
  console.error('[Service Worker] Error:', event.error);
  
  // Log error for debugging
  event.waitUntil(
    (async () => {
      try {
        const response = await fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'sw_error',
            error: event.error.message,
            stack: event.error.stack,
            timestamp: Date.now()
          })
        });
      } catch (error) {
        console.log('[Service Worker] Failed to log error');
      }
    })()
  );
});

// Unhandled rejection handler
self.addEventListener('unhandledrejection', (event) => {
  console.error('[Service Worker] Unhandled rejection:', event.reason);
});

console.log('[Service Worker] SIGNAID v2.1.0 loaded and ready');
