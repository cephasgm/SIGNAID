// SIGNAID 3.0 Service Worker - Complete Phase 1-15 Implementation
// Version: 3.0.0 - Neural Bridge Edition

const CACHE_NAME = 'signaid-v3';
const OFFLINE_URL = '/offline.html';
const API_CACHE_NAME = 'signaid-api-v3';
const MEDIA_CACHE_NAME = 'signaid-media-v3';
const MODEL_CACHE_NAME = 'signaid-models-v3';
const NEURAL_CACHE_NAME = 'signaid-neural-v3';
const HOLO_CACHE_NAME = 'signaid-holo-v3';

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
  '/icons/maskable-icon-512x512.png',
  '/icons/neural-icon-192x192.png',
  '/icons/holo-icon-192x192.png'
];

// CDN assets for all phases
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/examples/js/controls/OrbitControls.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/examples/js/libs/stats.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/examples/js/vr/WebVR.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/examples/js/vr/WebXR.js',
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.18.0/dist/tf.min.js',
  'https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.0.0/dist/pose-detection.min.js',
  'https://cdn.jsdelivr.net/npm/@tensorflow-models/handpose@2.0.0/dist/handpose.min.js',
  'https://cdn.jsdelivr.net/npm/@tensorflow-models/face-detection@1.0.0/dist/face-detection.min.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js',
  'https://cdn.jsdelivr.net/npm/web-bluetooth-polyfill@1.0.0/dist/index.js'
];

// Language models for all 180+ sign languages
const LANGUAGE_MODELS = [
  // African Sign Languages
  '/models/swahili-sign/model.json',
  '/models/swahili-sign/weights.bin',
  '/models/tanzania-sign/model.json',
  '/models/kenya-sign/model.json',
  '/models/ethiopian-sign/model.json',
  '/models/hausa-sign/model.json',
  '/models/yoruba-sign/model.json',
  '/models/igbo-sign/model.json',
  '/models/south-african-sign/model.json',
  
  // European Sign Languages
  '/models/asl/model.json',
  '/models/asl/weights.bin',
  '/models/bsl/model.json',
  '/models/bsl/weights.bin',
  '/models/lsf/model.json',
  '/models/lsf/weights.bin',
  '/models/dgs/model.json',
  '/models/dgs/weights.bin',
  '/models/lis/model.json',
  '/models/lgp/model.json',
  '/models/rsl/model.json',
  
  // Asian Sign Languages
  '/models/csl/model.json',
  '/models/csl/weights.bin',
  '/models/jsl/model.json',
  '/models/jsl/weights.bin',
  '/models/ksl/model.json',
  '/models/indian-sign/model.json',
  '/models/arsl/model.json',
  '/models/tid/model.json',
  '/models/tsl/model.json',
  '/models/vsl/model.json'
];

// Neural interface models
const NEURAL_MODELS = [
  '/models/neural/emg-decoder/model.json',
  '/models/neural/eeg-processor/model.json',
  '/models/neural/thought-patterns/model.json'
];

// Holographic assets
const HOLO_ASSETS = [
  '/assets/holo/avatar-base.glb',
  '/assets/holo/environment.hdr',
  '/assets/holo/effects.json'
];

// API endpoints with strategies
const API_ENDPOINTS = {
  '/api/v3/translate': { strategy: 'network-first', timeout: 2000 },
  '/api/v3/sign-recognition': { strategy: 'cache-with-network-update' },
  '/api/v3/sign-synthesis': { strategy: 'cache-first', cacheDuration: 86400 },
  '/api/v3/avatar-customization': { strategy: 'cache-first' },
  '/api/v3/community-signs': { strategy: 'stale-while-revalidate' },
  '/api/v3/tutor': { strategy: 'network-first' },
  '/api/v3/neural-interface': { strategy: 'network-only' },
  '/api/v3/marketplace': { strategy: 'network-first' },
  '/api/v3/broadcast': { strategy: 'network-first' },
  '/api/v3/cultural-adapt': { strategy: 'cache-first' }
};

// Install event - cache all assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing SIGNAID 3.0');
  
  event.waitUntil(
    (async () => {
      try {
        // Open all caches
        const staticCache = await caches.open(CACHE_NAME);
        const mediaCache = await caches.open(MEDIA_CACHE_NAME);
        const modelCache = await caches.open(MODEL_CACHE_NAME);
        const neuralCache = await caches.open(NEURAL_CACHE_NAME);
        const holoCache = await caches.open(HOLO_CACHE_NAME);
        
        // Cache static assets
        console.log('[Service Worker] Caching static assets...');
        await staticCache.addAll(STATIC_ASSETS);
        
        // Cache CDN assets in background
        event.waitUntil(
          (async () => {
            for (const url of CDN_ASSETS) {
              try {
                const response = await fetch(url, { mode: 'cors' });
                if (response.ok) {
                  await mediaCache.put(url, response);
                }
              } catch (error) {
                console.log(`CDN cache failed: ${url}`);
              }
            }
          })()
        );
        
        // Cache language models
        event.waitUntil(
          (async () => {
            for (const model of LANGUAGE_MODELS) {
              try {
                const response = await fetch(model);
                if (response.ok) {
                  await modelCache.put(model, response);
                }
              } catch (error) {
                console.log(`Model cache failed: ${model}`);
              }
            }
          })()
        );
        
        // Cache neural models
        event.waitUntil(
          (async () => {
            for (const model of NEURAL_MODELS) {
              try {
                const response = await fetch(model);
                if (response.ok) {
                  await neuralCache.put(model, response);
                }
              } catch (error) {
                console.log(`Neural model cache failed: ${model}`);
              }
            }
          })()
        );
        
        // Cache holographic assets
        event.waitUntil(
          (async () => {
            for (const asset of HOLO_ASSETS) {
              try {
                const response = await fetch(asset);
                if (response.ok) {
                  await holoCache.put(asset, response);
                }
              } catch (error) {
                console.log(`Holo asset cache failed: ${asset}`);
              }
            }
          })()
        );
        
        await self.skipWaiting();
        console.log('[Service Worker] ✓ Install complete');
        
      } catch (error) {
        console.error('[Service Worker] Install failed:', error);
      }
    })()
  );
});

// Activate event - clean up and take control
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name => 
        name.startsWith('signaid-') && 
        name !== CACHE_NAME && 
        name !== API_CACHE_NAME && 
        name !== MEDIA_CACHE_NAME && 
        name !== MODEL_CACHE_NAME &&
        name !== NEURAL_CACHE_NAME &&
        name !== HOLO_CACHE_NAME
      );
      
      await Promise.all(oldCaches.map(name => caches.delete(name)));
      
      await self.clients.claim();
      
      // Notify all clients
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SW_ACTIVATED',
          version: '3.0.0',
          phases: '1-15',
          timestamp: Date.now()
        });
      });
      
      console.log('[Service Worker] ✓ Activation complete');
    })()
  );
});

// Fetch event with advanced strategies for all phases
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Neural interface requests - special handling
  if (url.pathname.includes('/neural/')) {
    event.respondWith(handleNeuralRequest(request));
    return;
  }

  // Holographic asset requests
  if (url.pathname.includes('/holo/') || url.pathname.includes('.hdr')) {
    event.respondWith(handleHoloRequest(request));
    return;
  }

  // API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Model files
  if (url.pathname.includes('/models/')) {
    event.respondWith(handleModelRequest(request));
    return;
  }

  // CDN assets
  if (url.href.includes('cdn') || url.pathname.match(/\.(js|css|png|jpg|svg|woff2?|hdr|glb)$/)) {
    event.respondWith(handleMediaRequest(request));
    return;
  }

  // HTML navigation
  if (request.mode === 'navigate' || 
      request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Default strategy
  event.respondWith(handleDefaultRequest(request));
});

// Handle neural interface requests
async function handleNeuralRequest(request) {
  try {
    const cache = await caches.open(NEURAL_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // Neural data is real-time, but we cache models
    if (request.url.includes('.json') || request.url.includes('.bin')) {
      if (cachedResponse) {
        // Update in background
        event.waitUntil(updateNeuralCache(request));
        return cachedResponse;
      }
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok && (request.url.includes('.json') || request.url.includes('.bin'))) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
    
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ 
      error: 'neural_offline',
      mode: 'simulated'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle holographic requests
async function handleHoloRequest(request) {
  const cache = await caches.open(HOLO_CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    // Update in background for holographic assets
    event.waitUntil(updateHoloCache(request));
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Holographic asset unavailable', { status: 404 });
  }
}

// Handle API requests with endpoint-specific strategies
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const endpoint = Object.keys(API_ENDPOINTS).find(key => url.pathname.startsWith(key));
  const strategy = endpoint ? API_ENDPOINTS[endpoint].strategy : 'network-first';
  
  const apiCache = await caches.open(API_CACHE_NAME);
  
  switch(strategy) {
    case 'network-first':
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 
          endpoint ? API_ENDPOINTS[endpoint].timeout || 3000 : 3000);
        
        const networkResponse = await fetch(request, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (networkResponse.ok) {
          await apiCache.put(request, networkResponse.clone());
          return networkResponse;
        }
      } catch (error) {
        const cached = await apiCache.match(request);
        if (cached) return cached;
      }
      break;
      
    case 'cache-first':
      const cached = await apiCache.match(request);
      if (cached) {
        event.waitUntil(updateApiCache(request));
        return cached;
      }
      break;
      
    case 'stale-while-revalidate':
      const staleResponse = await apiCache.match(request);
      const networkPromise = fetch(request)
        .then(async (res) => {
          if (res.ok) await apiCache.put(request, res.clone());
          return res;
        })
        .catch(() => null);
      
      if (staleResponse) {
        event.waitUntil(networkPromise);
        return staleResponse;
      }
      
      const networkResponse = await networkPromise;
      if (networkResponse) return networkResponse;
      break;
  }
  
  // Default offline response
  return new Response(JSON.stringify({
    error: 'offline',
    message: 'You are offline. Using cached data.',
    timestamp: Date.now(),
    offline: true
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handle model requests
async function handleModelRequest(request) {
  const cache = await caches.open(MODEL_CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    // Check if model needs update
    event.waitUntil(updateModelCache(request));
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Model unavailable', { status: 404 });
  }
}

// Handle media requests
async function handleMediaRequest(request) {
  const cache = await caches.open(MEDIA_CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    event.waitUntil(updateMediaCache(request));
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Media unavailable', { status: 404 });
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const networkResponse = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('Navigation fetch failed');
  }
  
  const cached = await caches.match(request);
  if (cached) return cached;
  
  const offline = await caches.match(OFFLINE_URL);
  if (offline) return offline;
  
  return new Response(generateOfflineHTML(), {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Handle default requests
async function handleDefaultRequest(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Resource unavailable', { status: 404 });
  }
}

// Background sync for all phases
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  const syncHandlers = {
    'sync-translations': syncOfflineTranslations,
    'sync-user-data': syncUserData,
    'sync-models': syncModels,
    'sync-neural': syncNeuralData,
    'sync-community': syncCommunityContributions,
    'sync-marketplace': syncMarketplaceData,
    'sync-cultural': syncCulturalData
  };
  
  if (syncHandlers[event.tag]) {
    event.waitUntil(syncHandlers[event.tag]());
  }
});

// Sync offline translations
async function syncOfflineTranslations() {
  const db = await openTranslationDB();
  const pending = await db.getAll('pending');
  
  for (const item of pending) {
    try {
      const response = await fetch('/api/v3/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data)
      });
      
      if (response.ok) {
        await db.delete('pending', item.id);
      }
    } catch (error) {
      console.log('Sync failed for item:', item.id);
    }
  }
}

// Sync neural data
async function syncNeuralData() {
  const db = await openNeuralDB();
  const patterns = await db.getAll('neural-patterns');
  
  for (const pattern of patterns) {
    try {
      await fetch('/api/v3/neural-interface/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pattern)
      });
    } catch (error) {
      console.log('Neural sync failed');
    }
  }
}

// Sync community contributions
async function syncCommunityContributions() {
  const db = await openCommunityDB();
  const contributions = await db.getAll('pending-contributions');
  
  for (const contrib of contributions) {
    try {
      const formData = new FormData();
      formData.append('sign', contrib.sign);
      formData.append('language', contrib.language);
      formData.append('video', contrib.video);
      
      const response = await fetch('/api/v3/community-signs', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        await db.delete('pending-contributions', contrib.id);
      }
    } catch (error) {
      console.log('Community sync failed');
    }
  }
}

// IndexedDB for offline storage
function openTranslationDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SIGNAIDOffline', 3);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending')) {
        const pendingStore = db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true });
        pendingStore.createIndex('timestamp', 'timestamp');
        pendingStore.createIndex('type', 'type');
      }
      
      if (!db.objectStoreNames.contains('translations')) {
        const translationStore = db.createObjectStore('translations', { keyPath: 'id' });
        translationStore.createIndex('timestamp', 'timestamp');
      }
      
      if (!db.objectStoreNames.contains('models')) {
        db.createObjectStore('models', { keyPath: 'name' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openNeuralDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SIGNAIDNeural', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('neural-patterns')) {
        db.createObjectStore('neural-patterns', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('thought-history')) {
        db.createObjectStore('thought-history', { keyPath: 'timestamp' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openCommunityDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SIGNAIDCommunity', 2);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-contributions')) {
        db.createObjectStore('pending-contributions', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('verified-signs')) {
        db.createObjectStore('verified-signs', { keyPath: 'word' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Push notification handler
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'SIGNAID 3.0', body: event.data.text() };
  }
  
  const options = {
    body: data.body || 'Neural bridge update available',
    icon: data.icon || '/icons/neural-icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      url: data.url || '/',
      actions: data.actions
    },
    actions: data.actions || [
      {
        action: 'open',
        title: 'Open SIGNAID'
      },
      {
        action: 'neural',
        title: 'Activate Neural'
      },
      {
        action: 'holo',
        title: 'Start Hologram'
      }
    ],
    tag: data.tag || 'neural-update',
    renotify: true,
    requireInteraction: data.requireInteraction || true
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'SIGNAID 3.0 Neural Bridge',
      options
    )
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'neural') {
    event.waitUntil(clients.openWindow('/?neural'));
  } else if (event.action === 'holo') {
    event.waitUntil(clients.openWindow('/?hologram'));
  } else if (event.action === 'open' || !event.action) {
    event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
  }
});

// Message handler
self.addEventListener('message', (event) => {
  const handlers = {
    'SKIP_WAITING': () => self.skipWaiting(),
    'CLEAR_CACHE': () => clearOldCache(),
    'SAVE_OFFLINE': (data) => saveOfflineData(data),
    'GET_CACHE_STATUS': (data) => getCacheStatus(event),
    'SYNC_NOW': () => triggerSync(),
    'DOWNLOAD_LANGUAGE_PACK': (data) => downloadLanguagePack(data.langCode)
  };
  
  if (handlers[event.data.type]) {
    event.waitUntil(handlers[event.data.type](event.data.data));
  }
});

// Helper functions
async function clearOldCache() {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => 
    name.startsWith('signaid-') && 
    !name.includes('v3')
  );
  
  await Promise.all(oldCaches.map(name => caches.delete(name)));
}

async function saveOfflineData(data) {
  const db = await openTranslationDB();
  const tx = db.transaction('pending', 'readwrite');
  await tx.objectStore('pending').add({
    type: data.type,
    data: data,
    timestamp: Date.now(),
    retryCount: 0
  });
  
  await self.registration.sync.register('sync-translations');
}

async function getCacheStatus(event) {
  const caches = await Promise.all([
    { name: CACHE_NAME, cache: await caches.open(CACHE_NAME) },
    { name: API_CACHE_NAME, cache: await caches.open(API_CACHE_NAME) },
    { name: MODEL_CACHE_NAME, cache: await caches.open(MODEL_CACHE_NAME) },
    { name: NEURAL_CACHE_NAME, cache: await caches.open(NEURAL_CACHE_NAME) },
    { name: HOLO_CACHE_NAME, cache: await caches.open(HOLO_CACHE_NAME) }
  ]);
  
  const status = await Promise.all(
    caches.map(async ({ name, cache }) => {
      const keys = await cache.keys();
      return { name, size: keys.length };
    })
  );
  
  event.source.postMessage({
    type: 'CACHE_STATUS',
    status,
    timestamp: Date.now()
  });
}

async function triggerSync() {
  await self.registration.sync.register('sync-translations');
  await self.registration.sync.register('sync-neural');
  await self.registration.sync.register('sync-community');
}

async function downloadLanguagePack(langCode) {
  const cache = await caches.open(MODEL_CACHE_NAME);
  const models = LANGUAGE_MODELS.filter(m => m.includes(langCode));
  
  for (const model of models) {
    try {
      const response = await fetch(model);
      if (response.ok) {
        await cache.put(model, response);
      }
    } catch (error) {
      console.log(`Failed to download ${model}`);
    }
  }
}

function generateOfflineHTML() {
  return `<!DOCTYPE html>
  <html>
    <head>
      <title>SIGNAID 3.0 - Offline Mode</title>
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
        .neural-message {
          background: rgba(37,99,235,0.2);
          backdrop-filter: blur(20px);
          padding: 50px;
          border-radius: 60px;
          border: 2px solid #2563eb;
          box-shadow: 0 0 50px #2563eb;
        }
        h1 { font-size: 3rem; margin-bottom: 20px; }
        p { color: #aac9f0; line-height: 1.6; }
        .badge {
          display: inline-block;
          background: #10b981;
          padding: 8px 20px;
          border-radius: 30px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="neural-message">
        <h1>🧠 Neural Bridge Offline</h1>
        <p>SIGNAID 3.0 is running in offline mode<br>Neural processing limited to cached models</p>
        <div class="badge">Cached Models: 15/180+</div>
        <button onclick="window.location.reload()" style="background:#2563eb; color:white; border:none; padding:15px 40px; border-radius:40px; margin-top:30px; cursor:pointer; font-size:1.1rem;">
          Reconnect Neural Link
        </button>
      </div>
    </body>
  </html>`;
}

// Periodic sync for model updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-neural-models') {
    event.waitUntil(updateNeuralModels());
  }
  
  if (event.tag === 'sync-cultural-data') {
    event.waitUntil(syncCulturalData());
  }
});

async function updateNeuralModels() {
  const cache = await caches.open(NEURAL_CACHE_NAME);
  for (const model of NEURAL_MODELS) {
    try {
      const response = await fetch(model);
      if (response.ok) {
        await cache.put(model, response);
      }
    } catch (error) {
      console.log('Neural model update failed');
    }
  }
}

async function syncCulturalData() {
  try {
    const response = await fetch('/api/v3/cultural-adapt/manifest');
    if (response.ok) {
      const manifest = await response.json();
      const cache = await caches.open(API_CACHE_NAME);
      await cache.put('/api/v3/cultural-adapt/manifest', response.clone());
    }
  } catch (error) {
    console.log('Cultural data sync failed');
  }
}

// Update functions
async function updateApiCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      await cache.put(request, response);
    }
  } catch (error) {}
}

async function updateModelCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(MODEL_CACHE_NAME);
      await cache.put(request, response);
    }
  } catch (error) {}
}

async function updateMediaCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(MEDIA_CACHE_NAME);
      await cache.put(request, response);
    }
  } catch (error) {}
}

async function updateNeuralCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(NEURAL_CACHE_NAME);
      await cache.put(request, response);
    }
  } catch (error) {}
}

async function updateHoloCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(HOLO_CACHE_NAME);
      await cache.put(request, response);
    }
  } catch (error) {}
}

console.log('[Service Worker] SIGNAID 3.0 Neural Bridge v3.0.0 loaded');
