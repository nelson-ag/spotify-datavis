import { BubbleChart } from './src/components/BubbleChart.js';
import { DataInfo } from './src/components/DataInfo.js';
import { debounce as createDebounce } from './src/utils/debounce.js';
import { CATEGORIES } from './src/config/constants.js';

let albumData = [];
let artistData = [];
const artistInfoCache = new Map();
const albumInfoCache = new Map();
let currentFetchController = null;
const mySpotifyApiBaseUrl = "http://localhost:4000";

const albumHandler = document.getElementById("album");
const artistHandler = document.getElementById("artist");
const categoryListHandler = document.querySelectorAll(".category-item");

const dataInfo = new DataInfo();
const bubbleChart = new BubbleChart("bubble-chart", (d) => {
    dataInfo.updateDataInfo(d);
});

let selectedCategory = "album";
let locked = false;

function debounce(func, wait = 100) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

window.onload = () => {
  albumHandler.classList.add("category-selected");
  loadInitialData();
}

function loadInitialData() {
  Promise.all([
    fetch('/data/Top_Albums.json').then(res => res.json()),
    fetch('/data/Top_Artists.json').then(res => res.json())
  ]).then(([albums, artists]) => {
    albumData = albums;
    artistData = artists;
    bubbleChart.render(albumData);
  });
}

categoryListHandler.forEach((item) => {
  item.addEventListener("click", (e) => {
    for (let i = 0; i < categoryListHandler.length; i++) {
      categoryListHandler[i].classList.remove("category-selected");
    }
    e.target.classList.add("category-selected");
    dataInfo.setCategory(e.target.id);
  })
});

async function getArtistInfo(artistName, signal) {
  const response = await fetch(`${mySpotifyApiBaseUrl}/api/v1/artists?name=${artistName}`,{ signal });
  if (!response.ok) throw new Error('Failed to fetch artist info');
  return await response.json();
}

async function getAlbumInfo(albumName, signal) {
  const response = await fetch(`${mySpotifyApiBaseUrl}/api/v1/albums?title=${albumName}`, { signal });
  if (!response.ok) throw new Error('Failed to fetch album info');
  return await response.json();
}

async function getArtistInfoById(artistId, signal) {
  const response = await fetch(`${mySpotifyApiBaseUrl}/api/v1/artists/${artistId}`,{ signal });
  if (!response.ok) throw new Error('Failed to fetch artist by ID');
  return await response.json();
}

function renderBubbleChart(data) {
  const container = document.getElementById("chart-container");
  const bounds = container.getBoundingClientRect();
  const width = bounds.width;
  const height = bounds.height;

  const svg = d3.select("#bubble-chart");
  svg
    .selectAll("*")
    .remove();
  svg
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const root = d3.hierarchy({ children: data }).sum(d => d.totalStreams);
  const pack = d3.pack().size([width, height]).padding(10);
  const nodes = pack(root).leaves();

  const defs = svg.append("defs");

  nodes.forEach((d, i) => {
    defs.append("pattern")
      .attr("id", `img-${i}`) 
      .attr("patternUnits", "userSpaceOnUse")
      .attr("width", d.r * 2)
      .attr("height", d.r * 2)
      .attr("x", d.x - d.r)
      .attr("y", d.y - d.r)
    .append("image")
      .attr("href", d.data.imageUrl)
      .attr("width", d.r * 2)
      .attr("height", d.r * 2)
      .attr("preserveAspectRatio", "xMidYMid slice");
  });

  const circles = svg.selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.r)
      .attr("fill", (d, i) => `url(#img-${i})`)
      .style("opacity", 1)

  const overlays = svg.selectAll("circle-overlay")
    .data(nodes)
    .enter()
    .append("circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.r)
      .attr("fill", "none")
      .attr("stroke", "#0ebf24")
      .attr("stroke-width", 8)
      .style("opacity", 0)
      .style("pointer-events", "none")

  let selectedCircle = null;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  circles
    .on("mouseover", function(e, d) {
      if (!isMobile && !locked) {
        d3.select(overlays.nodes()[nodes.indexOf(d)])
          .transition()
          .duration(300)
          .style("opacity", 0.6);
        updateDataInfo(d);
      }
    })
    .on("mouseout", function(e, d) {
      if (!isMobile && !locked) {  
        d3.select(overlays.nodes()[nodes.indexOf(d)])
          .transition()
          .duration(200)
          .style("opacity", 0);
      }
    })
    .on("click", function(e, d) {
      e.stopPropagation();
      selectedCircle = d;
      locked = true;
      updateDataInfo(d);
    });
  
  // Only add mouseenter event for non-mobile devices
  if (!isMobile) {
    d3.select(container)
      .on("mouseenter", () => { 
        locked = false;
        selectedCircle = null;
        circles
          .transition()
          .duration(200)
          .style("opacity", 1); 
        overlays
          .transition()
          .duration(200)
          .style("opacity", 0);
      });
  }

  updateDataInfo({data : data[0], index : 0});
}

async function _updateDataInfo(d) {
  try {
    if (currentFetchController) {
      currentFetchController.abort();
    }
    currentFetchController = new AbortController();
    const { signal } = currentFetchController;

    const name = d.data.name;
    const rank = d.data.rank;
    const streams = d.data.totalStreams;

    d3.select("#artist-name").text(name);
    d3.select("#artist-rank").text("#" + rank);
    d3.select("#artist-total-streams").text(streams.toLocaleString());

    if (selectedCategory === "album") {
      if (albumInfoCache.has(name)) {
        const albumData = albumInfoCache.get(name);
        await handleAlbumUpdate(albumData, signal);
      } else {
        try {
          const albumData = await getAlbumInfo(name, signal);
          if (albumData) {
            albumInfoCache.set(name, albumData);
            await handleAlbumUpdate(albumData, signal);
          } else {
            await handleAlbumUpdate(false, signal);
          }
        } catch (error) {
          console.error('Fetch Error:', error);        
          await handleAlbumUpdate(false, signal);
        }
      }
    } else {
      try {
        if (artistInfoCache.has(name)) {
          const artistData = artistInfoCache.get(name);
          handleArtistUpdate(artistData);
        } else {
          const artistData = await getArtistInfo(name, signal);
          if (artistData) {
            artistInfoCache.set(name, artistData);
            handleArtistUpdate(artistData);
          } else {
            handleArtistUpdate(false);
          }
        }
      }
      catch (error) {
        console.error('Fetch Error:', error);        
        handleArtistUpdate(false, signal);
      }
    }

  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Update Info Error:', error);
    }
  }
}

const updateDataInfo = debounce(_updateDataInfo, 300);

function handleArtistUpdate(artistData) {
  if (artistData) {
    d3.select("#artist-followers").text(artistData.followers.toLocaleString());
    d3.select("#artist-name")
      .attr("href", artistData.spotifyProfile)
      .attr("target", "_blank");
    d3.select("#bubble-data-image-preview")
      .attr("src", artistData.imageUrl);
  } else {
    d3.select("#bubble-data-image-preview")
      .attr("src", "");
  }
}

async function handleAlbumUpdate(albumData, signal) {
  if (albumData) {
    d3.select("#artist-name")
      .attr("href", albumData.spotifyProfile)
      .attr("target", "_blank")
      .text(`${albumData.name} - ${albumData.artist}`);
    d3.select("#bubble-data-image-preview")
      .attr("src", albumData.imageUrl);

    const artistId = albumData.artistId;
    if (artistId) {
      if (artistInfoCache.has(artistId)) {
        const artistData = artistInfoCache.get(artistId);
        d3.select("#artist-followers").text(artistData.followers.toLocaleString());
      } else {
        const artistData = await getArtistInfoById(artistId, signal);
        if (artistData) {
          artistInfoCache.set(artistId, artistData);
          d3.select("#artist-followers").text(artistData.followers.toLocaleString());
        }
      }
    }
  } else {
    d3.select("#bubble-data-image-preview")
      .attr("src", "");
    d3.select("#artist-followers").text("");
  }
}

albumHandler.addEventListener("click", () => bubbleChart.render(albumData));
artistHandler.addEventListener("click", () => bubbleChart.render(artistData));

/*** 
 * 
 * https://www.kaggle.com/code/ryanangelodelacruz/exploration-on-spotify-s-most-streamed-songs-2024

*/
