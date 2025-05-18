class CacheService {
    constructor() {
        this.artistInfoCache = new Map();
        this.albumInfoCache = new Map();
    }

    getArtistInfo(name) {
        return this.artistInfoCache.get(name);
    }

    setArtistInfo(name, data) {
        this.artistInfoCache.set(name, data);
    }

    getAlbumInfo(name) {
        return this.albumInfoCache.get(name);
    }

    setAlbumInfo(name, data) {
        this.albumInfoCache.set(name, data);
    }
}

export const cacheService = new CacheService(); 