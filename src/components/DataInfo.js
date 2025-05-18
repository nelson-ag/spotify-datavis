import { spotifyApi } from '../api/spotifyApi.js';
import { cacheService } from '../services/CacheService.js';
import { CATEGORIES } from '../config/constants.js';

export class DataInfo {
    constructor() {
        this.selectedCategory = CATEGORIES.ALBUM;
    }

    async updateDataInfo(d) {
        try {
            this.showSkeleton();
            const signal = spotifyApi.abortCurrentFetch();
            const name = d.data.name;
            const rank = d.data.rank;
            const streams = d.data.totalStreams;

            this.updateBasicInfo(name, rank, streams);

            if (this.selectedCategory === CATEGORIES.ALBUM) {
                await this.handleAlbumUpdate(name, signal);
            } else {
                await this.handleArtistUpdate(name, signal);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Update Info Error:', error);
                this.hideSkeleton();
            }
        }
    }

    showSkeleton() {
        const skeleton = document.querySelector('#image-skeleton');
        const previewImage = document.querySelector('#bubble-data-image-preview');
        if (skeleton) skeleton.style.display = 'block';
        if (previewImage) previewImage.style.opacity = '0';
    }

    hideSkeleton() {
        const skeleton = document.querySelector('#image-skeleton');
        if (skeleton) skeleton.style.display = 'none';
    }

    updateBasicInfo(name, rank, streams) {
        d3.select("#artist-name").text(name);
        d3.select("#artist-rank").text("#" + rank);
        d3.select("#artist-total-streams").text(streams.toLocaleString());
    }

    async handleAlbumUpdate(name, signal) {
        let albumData = cacheService.getAlbumInfo(name);
        
        if (!albumData) {
            try {
                albumData = await spotifyApi.getAlbumInfo(name, signal);
                if (albumData) {
                    cacheService.setAlbumInfo(name, albumData);
                }
            } catch (error) {
                console.error('Fetch Error:', error);
                albumData = false;
            }
        }

        if (albumData) {
            this.updateAlbumInfo(albumData);
            await this.updateArtistFollowers(albumData.artistId, signal);
        } else {
            this.hideSkeleton();
        }
    }

    async handleArtistUpdate(name, signal) {
        let artistData = cacheService.getArtistInfo(name);
        
        if (!artistData) {
            try {
                artistData = await spotifyApi.getArtistInfo(name, signal);
                if (artistData) {
                    cacheService.setArtistInfo(name, artistData);
                }
            } catch (error) {
                console.error('Fetch Error:', error);
                artistData = false;
            }
        }

        if (artistData) {
            this.updateArtistInfo(artistData);
        } else {
            this.hideSkeleton();
        }
    }

    updateAlbumInfo(albumData) {
        d3.select("#artist-name")
            .attr("href", albumData.spotifyProfile)
            .attr("target", "_blank")
            .text(`${albumData.name} - ${albumData.artist}`);
        
        const previewImage = document.querySelector('#bubble-data-image-preview');
        if (previewImage) {
            previewImage.onload = () => {
                this.hideSkeleton();
                previewImage.style.opacity = '1';
            };
            previewImage.src = albumData.imageUrl;
        }
    }

    updateArtistInfo(artistData) {
        d3.select("#artist-followers").text(artistData.followers.toLocaleString());
        d3.select("#artist-name")
            .attr("href", artistData.spotifyProfile)
            .attr("target", "_blank");
        
        const previewImage = document.querySelector('#bubble-data-image-preview');
        if (previewImage) {
            previewImage.onload = () => {
                this.hideSkeleton();
                previewImage.style.opacity = '1';
            };
            previewImage.src = artistData.imageUrl;
        }
    }

    async updateArtistFollowers(artistId, signal) {
        if (artistId) {
            let artistData = cacheService.getArtistInfo(artistId);
            if (!artistData) {
                artistData = await spotifyApi.getArtistInfoById(artistId, signal);
                if (artistData) {
                    cacheService.setArtistInfo(artistId, artistData);
                }
            }
            if (artistData) {
                d3.select("#artist-followers").text(artistData.followers.toLocaleString());
            }
        }
    }

    setCategory(category) {
        this.selectedCategory = category;
    }
} 