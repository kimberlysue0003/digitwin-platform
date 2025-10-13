// IndexedDB cache for 3D building data
// Stores building data locally to avoid repeated API requests

const DB_NAME = 'digitwin-cache';
const DB_VERSION = 1;
const BUILDINGS_STORE = 'buildings';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CachedBuilding {
  areaId: string;
  data: any[]; // Building data array
  timestamp: number;
  chunkCount: number;
}

class BuildingCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  // Initialize IndexedDB
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ BuildingCache IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(BUILDINGS_STORE)) {
          const store = db.createObjectStore(BUILDINGS_STORE, { keyPath: 'areaId' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('📦 Created buildings object store');
        }
      };
    });

    return this.initPromise;
  }

  // Get cached buildings for an area
  async get(areaId: string): Promise<any[] | null> {
    await this.init();

    if (!this.db) {
      console.warn('IndexedDB not available');
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BUILDINGS_STORE], 'readonly');
      const store = transaction.objectStore(BUILDINGS_STORE);
      const request = store.get(areaId);

      request.onsuccess = () => {
        const cached = request.result as CachedBuilding | undefined;

        if (!cached) {
          console.log(`📭 Cache miss for ${areaId}`);
          resolve(null);
          return;
        }

        // Check if cache is expired
        const age = Date.now() - cached.timestamp;
        if (age > CACHE_DURATION) {
          console.log(`⏰ Cache expired for ${areaId} (age: ${(age / 3600000).toFixed(1)}h)`);
          this.delete(areaId); // Clean up expired cache
          resolve(null);
          return;
        }

        console.log(`✅ Cache hit for ${areaId} (${cached.data.length} buildings, age: ${(age / 1000).toFixed(0)}s)`);
        resolve(cached.data);
      };

      request.onerror = () => {
        console.error('Failed to read from cache:', request.error);
        reject(request.error);
      };
    });
  }

  // Save buildings to cache
  async set(areaId: string, data: any[], chunkCount: number): Promise<void> {
    await this.init();

    if (!this.db) {
      console.warn('IndexedDB not available, skipping cache');
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BUILDINGS_STORE], 'readwrite');
      const store = transaction.objectStore(BUILDINGS_STORE);

      const cached: CachedBuilding = {
        areaId,
        data,
        timestamp: Date.now(),
        chunkCount,
      };

      const request = store.put(cached);

      request.onsuccess = () => {
        console.log(`💾 Cached ${data.length} buildings for ${areaId} (${chunkCount} chunks)`);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to write to cache:', request.error);
        reject(request.error);
      };
    });
  }

  // Delete cached data for an area
  async delete(areaId: string): Promise<void> {
    await this.init();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BUILDINGS_STORE], 'readwrite');
      const store = transaction.objectStore(BUILDINGS_STORE);
      const request = store.delete(areaId);

      request.onsuccess = () => {
        console.log(`🗑️ Deleted cache for ${areaId}`);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to delete from cache:', request.error);
        reject(request.error);
      };
    });
  }

  // Clear all cached data
  async clear(): Promise<void> {
    await this.init();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BUILDINGS_STORE], 'readwrite');
      const store = transaction.objectStore(BUILDINGS_STORE);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('🗑️ Cleared all building cache');
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to clear cache:', request.error);
        reject(request.error);
      };
    });
  }

  // Get cache statistics
  async getStats(): Promise<{ count: number; totalSize: number; areas: string[] }> {
    await this.init();

    if (!this.db) {
      return { count: 0, totalSize: 0, areas: [] };
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BUILDINGS_STORE], 'readonly');
      const store = transaction.objectStore(BUILDINGS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const cached = request.result as CachedBuilding[];
        const totalSize = cached.reduce((sum, item) => sum + item.data.length, 0);
        const areas = cached.map(item => item.areaId);

        resolve({
          count: cached.length,
          totalSize,
          areas,
        });
      };

      request.onerror = () => {
        console.error('Failed to get cache stats:', request.error);
        reject(request.error);
      };
    });
  }
}

// Singleton instance
export const buildingCache = new BuildingCache();

// Initialize on module load
buildingCache.init().catch(err => {
  console.error('Failed to initialize building cache:', err);
});
