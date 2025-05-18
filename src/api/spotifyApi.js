import { API_BASE_URL } from '../config/constants.js';

class SpotifyApi {
    constructor() {
        this.currentFetchController = null;
    }

    async getArtistInfo(artistName, signal) {
        const response = await fetch(`${API_BASE_URL}/api/v1/artists?name=${artistName}`, { signal });
        if (!response.ok) throw new Error('Failed to fetch artist info');
        return await response.json();
    }

    async getAlbumInfo(albumName, signal) {
        const response = await fetch(`${API_BASE_URL}/api/v1/albums?title=${albumName}`, { signal });
        if (!response.ok) throw new Error('Failed to fetch album info');
        return await response.json();
    }

    async getArtistInfoById(artistId, signal) {
        const response = await fetch(`${API_BASE_URL}/api/v1/artists/${artistId}`, { signal });
        if (!response.ok) throw new Error('Failed to fetch artist by ID');
        return await response.json();
    }

    abortCurrentFetch() {
        if (this.currentFetchController) {
            this.currentFetchController.abort();
        }
        this.currentFetchController = new AbortController();
        return this.currentFetchController.signal;
    }
}

export const spotifyApi = new SpotifyApi(); 