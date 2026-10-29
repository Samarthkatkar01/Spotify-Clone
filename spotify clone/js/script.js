// ==========================================================================
// SPOTIFY WEB PLAYER CLONE - CORE LOGIC & AUDIO ENGINE
// ==========================================================================

console.log('Spotify Clone Initialized');

let currentSong = new Audio();
let songs = [];
let currFolder = 'songs/ncs';
let currentTrackIndex = 0;
let isShuffle = false;
let isRepeat = false;
let savedLikes = new Set();
let albumCatalog = {};

const PLAYLIST_THEMES = {
    'ncs': { gradient: 'linear-gradient(180deg, #107040 0%, #0d4629 55%, #121212 100%)', likes: '3,842,109' },
    'Diljit': { gradient: 'linear-gradient(180deg, #1d4ed8 0%, #1e3a8a 55%, #121212 100%)', likes: '5,291,480' },
    'karan aujla': { gradient: 'linear-gradient(180deg, #7c3aed 0%, #4c1d95 55%, #121212 100%)', likes: '4,198,221' },
    'Chill_(mood)': { gradient: 'linear-gradient(180deg, #0284c7 0%, #075985 55%, #121212 100%)', likes: '2,931,540' },
    'Love_(mood)': { gradient: 'linear-gradient(180deg, #e11d48 0%, #881337 55%, #121212 100%)', likes: '6,401,902' },
    'Funky_(mood)': { gradient: 'linear-gradient(180deg, #d97706 0%, #78350f 55%, #121212 100%)', likes: '1,842,654' },
    'Angry_(mood)': { gradient: 'linear-gradient(180deg, #dc2626 0%, #7f1d1d 55%, #121212 100%)', likes: '2,104,780' },
    'Bright_(mood)': { gradient: 'linear-gradient(180deg, #ca8a04 0%, #713f12 55%, #121212 100%)', likes: '3,120,450' },
    'Dark_(mood)': { gradient: 'linear-gradient(180deg, #334155 0%, #0f172a 55%, #121212 100%)', likes: '4,510,980' },
    'Uplifting_(mood)': { gradient: 'linear-gradient(180deg, #059669 0%, #064e3b 55%, #121212 100%)', likes: '2,670,119' },
    'cs': { gradient: 'linear-gradient(180deg, #c026d3 0%, #701a75 55%, #121212 100%)', likes: '1,598,340' }
};

// Format seconds into MM:SS
function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
}

// Parse track string into clean { title, artist }
function parseTrackName(rawTrack) {
    let clean = decodeURIComponent(rawTrack).replace(/\.mp3$/i, '').trim();
    if (clean.includes(' - ')) {
        const parts = clean.split(' - ');
        return {
            title: parts[0].trim(),
            artist: parts.slice(1).join(' - ').trim()
        };
    }
    return {
        title: clean,
        artist: 'Various Artists'
    };
}

// Update Play/Pause UI state across all buttons
function updatePlayIcons(isPlaying) {
    const playIconSvg = document.getElementById('playIconSvg');
    const heroPlayIcon = document.getElementById('heroPlayIcon');

    if (isPlaying) {
        if (playIconSvg) {
            playIconSvg.innerHTML = '<rect x="6" y="4" width="4" height="16" fill="#000"/><rect x="14" y="4" width="4" height="16" fill="#000"/>';
        }
        if (heroPlayIcon) {
            heroPlayIcon.innerHTML = '<rect x="6" y="4" width="4" height="16" fill="#000"/><rect x="14" y="4" width="4" height="16" fill="#000"/>';
        }
    } else {
        if (playIconSvg) {
            playIconSvg.innerHTML = '<polygon points="6 4 18 12 6 20 6 4" fill="#000"/>';
        }
        if (heroPlayIcon) {
            heroPlayIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3" fill="#000"/>';
        }
    }

    // Toggle active state on track rows
    updateActiveRowVisuals();
}

// Highlight active track in sidebar and banner track table
function updateActiveRowVisuals() {
    // Banner table rows
    const bannerRows = document.querySelectorAll('.track-row');
    bannerRows.forEach((row, i) => {
        const indexCol = row.querySelector('.track-col-index');
        const trackNum = row.querySelector('.track-num');
        const playRowIcon = row.querySelector('.play-row-icon');
        const eqWave = row.querySelector('.equalizer-wave');

        if (i === currentTrackIndex) {
            row.classList.add('active');
            if (trackNum) trackNum.style.display = 'none';
            if (eqWave) {
                eqWave.style.display = currentSong.paused ? 'none' : 'flex';
            }
            if (playRowIcon && currentSong.paused) {
                playRowIcon.style.display = 'block';
            }
        } else {
            row.classList.remove('active');
            if (trackNum) trackNum.style.display = 'block';
            if (eqWave) eqWave.style.display = 'none';
            if (playRowIcon) playRowIcon.style.display = 'none';
        }
    });

    // Sidebar items — use .songList ul li (no longer has an ID)
    const sidebarItems = document.querySelectorAll('.songList ul li');
    sidebarItems.forEach((item, i) => {
        const eqWave = item.querySelector('.equalizer-wave');
        if (i === currentTrackIndex) {
            item.classList.add('active');
            if (eqWave) eqWave.style.display = currentSong.paused ? 'none' : 'flex';
        } else {
            item.classList.remove('active');
            if (eqWave) eqWave.style.display = 'none';
        }
    });
}

// Fetch songs from folder and render both Left Sidebar and Banner Tracklist
async function getSongs(folder) {
    currFolder = folder;
    const folderKey = folder.replace('songs/', '');
    const folderUrl = new URL(`${folder}/`, window.location.href);

    try {
        let a = await fetch(folderUrl);
        let response = await a.text();
        let div = document.createElement("div");
        div.innerHTML = response;
        let as = div.getElementsByTagName("a");
        songs = [];

        for (let index = 0; index < as.length; index++) {
            const element = as[index];
            const songUrl = new URL(element.getAttribute("href"), folderUrl);
            if (songUrl.pathname.startsWith(folderUrl.pathname) && songUrl.pathname.toLowerCase().endsWith(".mp3")) {
                songs.push(songUrl.pathname.slice(folderUrl.pathname.length));
            }
        }
    } catch (err) {
        console.error("Error fetching songs for", folder, err);
        songs = [];
    }

    // Update Hero Banner Metadata & Gradient
    const theme = PLAYLIST_THEMES[folderKey] || {
        gradient: 'linear-gradient(180deg, #107040 0%, #0d4629 55%, #121212 100%)',
        likes: '2,400,000'
    };
    const heroBanner = document.getElementById('heroBanner');
    if (heroBanner) {
        heroBanner.style.background = theme.gradient;
    }

    const coverSrc = `${currFolder}/cover.jpg`;
    const heroCover = document.getElementById('heroCoverImg');
    if (heroCover) heroCover.src = coverSrc;

    // Fetch album info if not cached
    let meta = albumCatalog[folderKey];
    if (!meta) {
        try {
            const infoRes = await fetch(`${currFolder}/info.json`);
            meta = await infoRes.json();
            albumCatalog[folderKey] = meta;
        } catch (e) {
            meta = { title: folderKey.replaceAll('_', ' '), description: 'Curated playlist for you' };
        }
    }

    const heroTitle = document.getElementById('heroTitle');
    if (heroTitle) heroTitle.innerText = meta.title || 'Playlist';

    const heroDesc = document.getElementById('heroDescription');
    if (heroDesc) heroDesc.innerText = meta.description || 'Spotify Original Playlist';

    const heroLikes = document.getElementById('heroLikes');
    if (heroLikes) heroLikes.innerText = `${theme.likes} likes`;

    const heroSongCount = document.getElementById('heroSongCount');
    if (heroSongCount) heroSongCount.innerText = `${songs.length} songs, about ${Math.max(1, songs.length * 3)} min`;

    // 1. POPULATE SIDEBAR SONG LIST — targets .songList ul (the correct element)
    const sidebarSongUl = document.querySelector('.songList ul');
    if (sidebarSongUl) {
        sidebarSongUl.innerHTML = '';
        if (songs.length === 0) {
            sidebarSongUl.innerHTML = '<li class="sidebar-empty">No tracks found in this playlist</li>';
        } else {
            songs.forEach((song, idx) => {
                const { title, artist } = parseTrackName(song);
                const li = document.createElement('li');
                li.innerHTML = `
                    <img class="sidebar-song-thumb" src="${coverSrc}" alt="${title}">
                    <div class="sidebar-song-info">
                        <div class="sidebar-song-title">${title}</div>
                        <div class="sidebar-song-artist">${artist}</div>
                    </div>
                    <div class="equalizer-wave" style="display: none;">
                        <span class="equalizer-bar"></span>
                        <span class="equalizer-bar"></span>
                        <span class="equalizer-bar"></span>
                        <span class="equalizer-bar"></span>
                    </div>
                `;
                li.addEventListener('click', () => {
                    playMusic(idx);
                });
                sidebarSongUl.appendChild(li);
            });
        }
    }

    // 2. POPULATE SONGS LISTED ON BANNER (TRACKLIST TABLE)
    const bannerTrackRows = document.getElementById('bannerTrackRows');
    if (bannerTrackRows) {
        bannerTrackRows.innerHTML = '';
        if (songs.length === 0) {
            bannerTrackRows.innerHTML = '<div style="color:#b3b3b3; padding:24px; text-align:center;">No songs in this playlist.</div>';
        } else {
            songs.forEach((song, idx) => {
                const { title, artist } = parseTrackName(song);
                const isLiked = savedLikes.has(`${currFolder}/${song}`);
                const row = document.createElement('div');
                row.className = 'track-row';
                row.dataset.index = idx;
                row.innerHTML = `
                    <div class="track-col-index">
                        <span class="track-num">${idx + 1}</span>
                        <svg class="play-row-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        <div class="equalizer-wave" style="display: none;">
                            <span class="equalizer-bar"></span>
                            <span class="equalizer-bar"></span>
                            <span class="equalizer-bar"></span>
                        </div>
                    </div>
                    <div class="track-col-title">
                        <img class="track-thumb" src="${coverSrc}" alt="cover">
                        <div class="track-title-block">
                            <span class="track-title-text">${title}</span>
                            <span class="track-artist-text">${artist}</span>
                        </div>
                    </div>
                    <div class="track-col-album">${meta.title || 'Single'}</div>
                    <div class="track-col-date">${idx === 0 ? 'Today' : (idx + 1) + ' days ago'}</div>
                    <div class="track-col-duration">
                        <button class="row-heart-btn ${isLiked ? 'active' : ''}" title="Save to Your Library">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="${isLiked ? '#1ed760' : 'none'}" stroke="currentColor" stroke-width="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                        </button>
                        <span class="duration-time">03:${String(20 + (idx * 17) % 39).padStart(2, '0')}</span>
                    </div>
                `;

                // Row click plays track
                row.addEventListener('click', (e) => {
                    if (e.target.closest('.row-heart-btn')) {
                        e.stopPropagation();
                        const heart = row.querySelector('.row-heart-btn');
                        const key = `${currFolder}/${song}`;
                        if (savedLikes.has(key)) {
                            savedLikes.delete(key);
                            heart.classList.remove('active');
                            heart.querySelector('svg').setAttribute('fill', 'none');
                        } else {
                            savedLikes.add(key);
                            heart.classList.add('active');
                            heart.querySelector('svg').setAttribute('fill', '#1ed760');
                        }
                        return;
                    }
                    playMusic(idx);
                });

                bannerTrackRows.appendChild(row);
            });
        }
    }

    return songs;
}

// Play specified music track by index or track name
const playMusic = (trackOrIndex, pause = false) => {
    if (songs.length === 0) return;

    let targetIndex = 0;
    if (typeof trackOrIndex === 'number') {
        targetIndex = trackOrIndex;
    } else {
        const found = songs.findIndex(s => decodeURIComponent(s).includes(decodeURIComponent(trackOrIndex)));
        targetIndex = found >= 0 ? found : 0;
    }

    if (targetIndex < 0 || targetIndex >= songs.length) {
        targetIndex = 0;
    }

    currentTrackIndex = targetIndex;
    const trackFile = songs[currentTrackIndex];
    const { title, artist } = parseTrackName(trackFile);

    // Audio source
    currentSong.src = new URL(`${currFolder}/${trackFile}`, window.location.href).href;

    if (!pause) {
        currentSong.play().catch(err => {
            console.log("Autoplay prevented or interrupted:", err);
        });
        updatePlayIcons(true);
    } else {
        updatePlayIcons(false);
    }

    // Update Bottom Player text & cover
    const songInfoEl = document.getElementById('songinfo');
    if (songInfoEl) songInfoEl.innerText = title;

    const songArtistEl = document.getElementById('songartist');
    if (songArtistEl) songArtistEl.innerText = artist;

    const nowPlayingCover = document.getElementById('nowPlayingCover');
    if (nowPlayingCover) nowPlayingCover.src = `${currFolder}/cover.jpg`;

    // Reset seekbar times
    const timeCurrent = document.getElementById('timeCurrent');
    const timeDuration = document.getElementById('timeDuration');
    if (timeCurrent) timeCurrent.innerText = "00:00";
    if (timeDuration) timeDuration.innerText = "00:00";

    const songTimeCompat = document.querySelector('.songtime');
    if (songTimeCompat) songTimeCompat.innerHTML = "00:00 / 00:00";

    // Like button state in bottom bar
    const playerHeartBtn = document.getElementById('playerHeartBtn');
    if (playerHeartBtn) {
        const isLiked = savedLikes.has(`${currFolder}/${trackFile}`);
        if (isLiked) {
            playerHeartBtn.classList.add('active');
            playerHeartBtn.querySelector('svg').setAttribute('fill', '#1ed760');
        } else {
            playerHeartBtn.classList.remove('active');
            playerHeartBtn.querySelector('svg').setAttribute('fill', 'none');
        }
    }

    updateActiveRowVisuals();
};

// Populate the Album Cards and Quick Picks Grids
async function displayAlbums() {
    console.log("Fetching and rendering albums...");
    const songsUrl = new URL("songs/", window.location.href);

    try {
        let a = await fetch(songsUrl);
        let response = await a.text();
        let div = document.createElement("div");
        div.innerHTML = response;
        let anchors = Array.from(div.getElementsByTagName("a"));

        const cardContainer = document.getElementById('cardContainer');
        const quickPicksGrid = document.getElementById('quickPicksGrid');
        if (cardContainer) cardContainer.innerHTML = "";
        if (quickPicksGrid) quickPicksGrid.innerHTML = "";

        const folders = [];
        for (let index = 0; index < anchors.length; index++) {
            const e = anchors[index];
            const albumUrl = new URL(e.getAttribute("href"), songsUrl);
            const relativePath = albumUrl.pathname.slice(songsUrl.pathname.length);
            const pathSegments = relativePath.split("/").filter(Boolean);

            if (albumUrl.pathname.startsWith(songsUrl.pathname) && albumUrl.pathname.endsWith("/") && pathSegments.length === 1) {
                let folder = decodeURIComponent(pathSegments[0]);
                if (folder === ".htaccess") continue;
                folders.push(folder);
            }
        }

        // Process all folders
        for (let i = 0; i < folders.length; i++) {
            const folder = folders[i];
            let meta = { title: folder.replaceAll('_', ' '), description: 'Spotify Playlist' };

            try {
                let infoRes = await fetch(new URL(`${encodeURIComponent(folder)}/info.json`, songsUrl));
                meta = await infoRes.json();
            } catch (err) {
                console.warn("No info.json for", folder);
            }
            albumCatalog[folder] = meta;

            // 1. Append Spotify Playlist Card
            if (cardContainer) {
                const card = document.createElement('div');
                card.className = 'card';
                card.dataset.folder = folder;
                card.innerHTML = `
                    <div class="play" title="Play">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
                            <polygon points="6 4 18 12 6 20 6 4"></polygon>
                        </svg>
                    </div>
                    <img src="songs/${encodeURIComponent(folder)}/cover.jpg" alt="${meta.title}">
                    <h2>${meta.title}</h2>
                    <p>${meta.description}</p>
                `;

                card.addEventListener('click', async () => {
                    await getSongs(`songs/${folder}`);
                    if (songs.length > 0) {
                        playMusic(0);
                    }
                });

                cardContainer.appendChild(card);
            }

            // 2. Append Quick Pick (first 6 items)
            if (quickPicksGrid && i < 6) {
                const qp = document.createElement('div');
                qp.className = 'quick-pick-card';
                qp.innerHTML = `
                    <img src="songs/${encodeURIComponent(folder)}/cover.jpg" alt="${meta.title}">
                    <span>${meta.title}</span>
                    <button class="quick-pick-play-btn" title="Play">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
                            <polygon points="6 4 18 12 6 20 6 4"></polygon>
                        </svg>
                    </button>
                `;

                qp.addEventListener('click', async () => {
                    await getSongs(`songs/${folder}`);
                    if (songs.length > 0) {
                        playMusic(0);
                    }
                });

                quickPicksGrid.appendChild(qp);
            }
        }
    } catch (err) {
        console.error("Failed to display albums:", err);
    }
}

// Global initialization
async function main() {
    // 1. Load initial playlist
    await getSongs("songs/ncs");
    if (songs.length > 0) {
        playMusic(0, true);
    }

    // 2. Render all albums & quick picks
    await displayAlbums();

    // 3. Play / Pause Bottom Controls
    const playBtn = document.getElementById("play");
    if (playBtn) {
        playBtn.addEventListener("click", () => {
            if (currentSong.paused) {
                currentSong.play();
                updatePlayIcons(true);
            } else {
                currentSong.pause();
                updatePlayIcons(false);
            }
        });
    }

    // 4. Hero Banner Play Button
    const heroPlayBtn = document.getElementById("heroPlayBtn");
    if (heroPlayBtn) {
        heroPlayBtn.addEventListener("click", () => {
            if (currentSong.paused) {
                currentSong.play();
                updatePlayIcons(true);
            } else {
                currentSong.pause();
                updatePlayIcons(false);
            }
        });
    }

    // 5. Hero Banner Heart Button
    const heroHeartBtn = document.getElementById("heroHeartBtn");
    if (heroHeartBtn) {
        heroHeartBtn.addEventListener("click", () => {
            heroHeartBtn.classList.toggle("active");
            const svg = heroHeartBtn.querySelector("svg");
            if (heroHeartBtn.classList.contains("active")) {
                svg.setAttribute("fill", "#1ed760");
                svg.setAttribute("stroke", "#1ed760");
            } else {
                svg.setAttribute("fill", "none");
                svg.setAttribute("stroke", "currentColor");
            }
        });
    }

    // 6. Now Playing Heart Button
    const playerHeartBtn = document.getElementById("playerHeartBtn");
    if (playerHeartBtn) {
        playerHeartBtn.addEventListener("click", () => {
            playerHeartBtn.classList.toggle("active");
            const svg = playerHeartBtn.querySelector("svg");
            const currentTrackKey = `${currFolder}/${songs[currentTrackIndex]}`;
            if (playerHeartBtn.classList.contains("active")) {
                savedLikes.add(currentTrackKey);
                svg.setAttribute("fill", "#1ed760");
                svg.setAttribute("stroke", "#1ed760");
            } else {
                savedLikes.delete(currentTrackKey);
                svg.setAttribute("fill", "none");
                svg.setAttribute("stroke", "currentColor");
            }
            updateActiveRowVisuals();
        });
    }

    // 7. Timeupdate Event (Seekbar and elapsed time)
    currentSong.addEventListener("timeupdate", () => {
        const cur = currentSong.currentTime;
        const dur = currentSong.duration;

        const curFormatted = secondsToMinutesSeconds(cur);
        const durFormatted = secondsToMinutesSeconds(dur);

        const timeCurrent = document.getElementById("timeCurrent");
        const timeDuration = document.getElementById("timeDuration");
        if (timeCurrent) timeCurrent.innerText = curFormatted;
        if (timeDuration && !isNaN(dur)) timeDuration.innerText = durFormatted;

        const songTimeCompat = document.querySelector(".songtime");
        if (songTimeCompat) {
            songTimeCompat.innerHTML = `${curFormatted} / ${durFormatted}`;
        }

        const percent = dur ? (cur / dur) * 100 : 0;

        // Update seekbar progress bar and circle
        const progressEl = document.getElementById("centerSeekbarProgress");
        const circleEl = document.getElementById("centerCircle");
        if (progressEl) progressEl.style.width = percent + "%";
        if (circleEl) circleEl.style.left = percent + "%";

        // Top seekbar fallback
        const topProgress = document.getElementById("seekbarProgress");
        const topCircle = document.getElementById("circle");
        if (topProgress) topProgress.style.width = percent + "%";
        if (topCircle) topCircle.style.left = percent + "%";
    });

    // 8. Track Finished -> Play Next (Auto-advance)
    currentSong.addEventListener("ended", () => {
        if (isRepeat) {
            currentSong.currentTime = 0;
            currentSong.play();
        } else {
            playNext();
        }
    });

    // Helper: Play Next Track
    function playNext() {
        if (songs.length === 0) return;
        currentSong.pause();
        if (isShuffle) {
            let nextIdx = Math.floor(Math.random() * songs.length);
            if (nextIdx === currentTrackIndex && songs.length > 1) {
                nextIdx = (nextIdx + 1) % songs.length;
            }
            playMusic(nextIdx);
        } else {
            let nextIdx = (currentTrackIndex + 1) % songs.length;
            playMusic(nextIdx);
        }
    }

    // Helper: Play Previous Track
    function playPrevious() {
        if (songs.length === 0) return;
        currentSong.pause();
        if (currentSong.currentTime > 3) {
            currentSong.currentTime = 0;
            currentSong.play();
            return;
        }
        let prevIdx = (currentTrackIndex - 1 + songs.length) % songs.length;
        playMusic(prevIdx);
    }

    // 9. Previous & Next Button Listeners
    const prevBtn = document.getElementById("previous");
    if (prevBtn) prevBtn.addEventListener("click", playPrevious);

    const nextBtn = document.getElementById("next");
    if (nextBtn) nextBtn.addEventListener("click", playNext);

    // 10. Shuffle & Repeat Toggles
    const shuffleBtn = document.getElementById("shuffleBtn");
    if (shuffleBtn) {
        shuffleBtn.addEventListener("click", () => {
            isShuffle = !isShuffle;
            shuffleBtn.classList.toggle("active", isShuffle);
        });
    }

    const repeatBtn = document.getElementById("repeatBtn");
    if (repeatBtn) {
        repeatBtn.addEventListener("click", () => {
            isRepeat = !isRepeat;
            repeatBtn.classList.toggle("active", isRepeat);
        });
    }

    // 11. Seekbar Click & Scrub
    const centerSeekbar = document.getElementById("centerSeekbar");
    if (centerSeekbar) {
        centerSeekbar.addEventListener("click", (e) => {
            const rect = centerSeekbar.getBoundingClientRect();
            const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            if (!isNaN(currentSong.duration)) {
                currentSong.currentTime = currentSong.duration * clickPos;
            }
        });
    }

    // Fallback seekbar compatibility
    const oldSeekbar = document.getElementById("seekbar");
    if (oldSeekbar && oldSeekbar !== centerSeekbar) {
        oldSeekbar.addEventListener("click", (e) => {
            const rect = oldSeekbar.getBoundingClientRect();
            const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            if (!isNaN(currentSong.duration)) {
                currentSong.currentTime = currentSong.duration * clickPos;
            }
        });
    }

    // 12. Volume Slider & Mute Toggle
    const volumeSlider = document.getElementById("volumeSlider");
    const volumeBtn = document.getElementById("volumeBtn");
    let lastVolume = 0.7;

    if (volumeSlider) {
        currentSong.volume = parseFloat(volumeSlider.value) / 100;

        volumeSlider.addEventListener("input", (e) => {
            const val = parseFloat(e.target.value) / 100;
            currentSong.volume = val;
            if (val > 0) lastVolume = val;
            updateVolumeIcon(val);
        });
    }

    if (volumeBtn) {
        volumeBtn.addEventListener("click", () => {
            if (currentSong.volume > 0) {
                lastVolume = currentSong.volume;
                currentSong.volume = 0;
                if (volumeSlider) volumeSlider.value = 0;
                updateVolumeIcon(0);
            } else {
                currentSong.volume = lastVolume || 0.7;
                if (volumeSlider) volumeSlider.value = (lastVolume || 0.7) * 100;
                updateVolumeIcon(currentSong.volume);
            }
        });
    }

    function updateVolumeIcon(vol) {
        const iconSvg = document.getElementById("volumeIconSvg");
        if (!iconSvg) return;
        if (vol === 0) {
            iconSvg.innerHTML = `
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
            `;
        } else if (vol < 0.5) {
            iconSvg.innerHTML = `
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            `;
        } else {
            iconSvg.innerHTML = `
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            `;
        }
    }

    // 13. Global Search Filter
    const globalSearchInput = document.getElementById("globalSearchInput");
    const clearSearchBtn = document.getElementById("clearSearchBtn");

    if (globalSearchInput) {
        globalSearchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (clearSearchBtn) {
                clearSearchBtn.style.display = query.length > 0 ? "flex" : "none";
            }

            // Filter playlist cards
            const cards = document.querySelectorAll(".card");
            cards.forEach(card => {
                const text = card.innerText.toLowerCase();
                card.style.display = text.includes(query) ? "flex" : "none";
            });

            // Filter banner track rows
            const rows = document.querySelectorAll(".track-row");
            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                row.style.display = text.includes(query) ? "grid" : "none";
            });
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener("click", () => {
            if (globalSearchInput) {
                globalSearchInput.value = "";
                globalSearchInput.dispatchEvent(new Event("input"));
                globalSearchInput.focus();
            }
        });
    }

    // 14. Library Search Filter (Sidebar)
    const librarySearchInput = document.getElementById("librarySearchInput");
    if (librarySearchInput) {
        librarySearchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            const items = document.querySelectorAll("#sidebarSongUl li");
            items.forEach(item => {
                const text = item.innerText.toLowerCase();
                item.style.display = text.includes(query) ? "flex" : "none";
            });
        });
    }

    // 15. Mobile Drawer Hamburger & Close
    const hamburger = document.querySelector(".hamburger");
    const sidebar = document.querySelector(".left");
    const closeBtn = document.querySelector(".close");

    if (hamburger && sidebar) {
        hamburger.addEventListener("click", () => {
            sidebar.classList.add("active");
        });
    }

    if (closeBtn && sidebar) {
        closeBtn.addEventListener("click", () => {
            sidebar.classList.remove("active");
        });
    }

    // 16. Brand Logo & Home Navigation Buttons
    const logoBtn = document.getElementById("logoBtn");
    const navHomeBtn = document.getElementById("navHomeBtn");
    const mainContainer = document.getElementById("mainContainer");

    const scrollToTop = () => {
        if (mainContainer) {
            mainContainer.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    if (logoBtn) logoBtn.addEventListener("click", scrollToTop);
    if (navHomeBtn) navHomeBtn.addEventListener("click", scrollToTop);

    // 17. Search Nav Button
    const navSearchBtn = document.getElementById("navSearchBtn");
    if (navSearchBtn) {
        navSearchBtn.addEventListener("click", () => {
            if (globalSearchInput) {
                globalSearchInput.focus();
                scrollToTop();
            }
        });
    }
}

// Launch application
main();