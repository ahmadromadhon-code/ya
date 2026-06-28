// State Management
let currentMode = 'latest'; // 'latest' or 'search'
let searchQuery = '';
let currentPage = 1;
let currentCategory = ''; // category URL, empty = all
let currentPostUrl = ''; // track current detail page
let currentPostInfo = null; // store current loaded info for bookmark toggle

// DOM Elements
const cardsGrid = document.getElementById('cards-grid');
const loader = document.getElementById('loader');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');
const sectionTitle = document.getElementById('section-title');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pageNum = document.getElementById('page-num');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalClose = document.getElementById('modal-close');
const modalContent = document.getElementById('modal-content');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const themeSelect = document.getElementById('theme-select');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file-input');

// LocalStorage helpers for Bookmarks and History
function getBookmarks() {
    return JSON.parse(localStorage.getItem('poi_bookmarks') || '[]');
}

function saveBookmarks(bookmarks) {
    localStorage.setItem('poi_bookmarks', JSON.stringify(bookmarks));
}

function addBookmark(item) {
    let bookmarks = getBookmarks();
    if (!bookmarks.some(b => b.link === item.link)) {
        bookmarks.unshift({
            title: item.title,
            image: item.image,
            link: item.link,
            addedAt: new Date().toISOString()
        });
        saveBookmarks(bookmarks);
    }
}

function removeBookmark(link) {
    let bookmarks = getBookmarks();
    bookmarks = bookmarks.filter(b => b.link !== link);
    saveBookmarks(bookmarks);
}

function isBookmarked(link) {
    return getBookmarks().some(b => b.link === link);
}

function getHistory() {
    return JSON.parse(localStorage.getItem('poi_history') || '[]');
}

function saveHistory(history) {
    localStorage.setItem('poi_history', JSON.stringify(history));
}

function addToHistory(item) {
    let history = getHistory();
    // Remove if already exists so we can move it to the top/latest
    history = history.filter(h => h.link !== item.link);
    history.unshift({
        title: item.title,
        image: item.image,
        link: item.link,
        watchedAt: new Date().toISOString()
    });
    // Limit history to 100 items
    if (history.length > 100) {
        history = history.slice(0, 100);
    }
    saveHistory(history);
}

function removeFromHistory(link) {
    let history = getHistory();
    history = history.filter(h => h.link !== link);
    saveHistory(history);
}

function clearAllHistory() {
    localStorage.removeItem('poi_history');
}

// Global actions for card buttons
window.deleteBookmark = function(link) {
    removeBookmark(link);
    fetchData();
};

window.deleteHistory = function(link) {
    removeFromHistory(link);
    fetchData();
};

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
    // Apply saved theme early
    const savedTheme = localStorage.getItem('poi_theme') || 'dark';
    if (themeSelect) {
        themeSelect.value = savedTheme;
    }
    applyTheme(savedTheme);

    fetchData();
    
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Apakah Anda yakin ingin menghapus semua riwayat tontonan?')) {
                clearAllHistory();
                fetchData();
            }
        });
    }
});

// Event Listeners
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
        currentMode = 'search';
        searchQuery = query;
        currentPage = 1;
        sectionTitle.textContent = `Hasil Pencarian: "${query}"`;
        fetchData();
    }
});

prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        fetchData();
    }
});

nextBtn.addEventListener('click', () => {
    currentPage++;
    fetchData();
});

modalClose.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) {
        closeModal();
    }
});

// Category Filter Tabs
const filterTabs = document.querySelectorAll('.filter-tab');
filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Set active tab
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update state and reload
        currentCategory = tab.dataset.category || '';
        const label = tab.dataset.label;
        currentMode = 'latest';
        currentPage = 1;
        sectionTitle.textContent = label === 'Semua' ? 'Rilis Terbaru' : label;
        fetchData();
    });
});

// Core Fetch Logic
async function fetchData() {
    showLoader();
    hideError();
    cardsGrid.innerHTML = '';
    
    // Handle LocalStorage filters
    const headerActions = document.getElementById('header-actions');
    if (currentCategory === 'bookmarks' || currentCategory === 'history') {
        const pagination = document.getElementById('pagination');
        if (pagination) pagination.style.display = 'none';
        if (headerActions) {
            headerActions.style.display = currentCategory === 'history' ? 'block' : 'none';
            if (clearHistoryBtn) clearHistoryBtn.style.display = currentCategory === 'history' ? 'inline-block' : 'none';
        }
        
        hideLoader();
        let items = [];
        if (currentCategory === 'bookmarks') {
            items = getBookmarks();
        } else {
            items = getHistory();
        }
        
        if (items.length > 0) {
            renderGrid(items);
        } else {
            showEmptyState(currentCategory === 'bookmarks' ? 'Belum ada penanda yang disimpan.' : 'Belum ada riwayat tontonan.');
        }
        return;
    }
    
    // Normal online endpoints
    const pagination = document.getElementById('pagination');
    if (pagination) pagination.style.display = 'flex';
    if (headerActions) headerActions.style.display = 'none';
    if (clearHistoryBtn) clearHistoryBtn.style.display = 'none';

    let url = `/api/latest?page=${currentPage}`;
    if (currentCategory) {
        url += `&category=${encodeURIComponent(currentCategory)}`;
    }
    if (currentMode === 'search') {
        url = `/api/search?q=${encodeURIComponent(searchQuery)}&page=${currentPage}`;
    }

    try {
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
            renderGrid(result.data);
            updatePaginationControls(true);
        } else {
            throw new Error(result.error || 'Tidak ada data ditemukan.');
        }
    } catch (err) {
        showError(err.message);
        updatePaginationControls(false);
    } finally {
        hideLoader();
    }
}

// Helper: proxy image through local server to bypass hotlink protection
function proxyImg(url) {
    if (!url) return '';
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

// Show Empty State for local lists
function showEmptyState(msg) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
        <div class="empty-icon">📂</div>
        <h3>Kosong</h3>
        <p>${escapeHTML(msg)}</p>
    `;
    cardsGrid.appendChild(empty);
}

// Render Grid Cards
function renderGrid(items) {
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'poi-card';
        
        // Route image through proxy to bypass nekopoi.care hotlink protection
        const coverImg = item.image 
            ? proxyImg(item.image)
            : 'https://via.placeholder.com/300x169/1a1526/f3f0ff?text=No+Image';
        
        let deleteBtnHTML = '';
        if (currentCategory === 'bookmarks') {
            deleteBtnHTML = `<button class="btn-delete-item" title="Hapus dari Penanda" onclick="event.stopPropagation(); deleteBookmark('${escapeHTML(item.link)}')">🗑️ Hapus</button>`;
        } else if (currentCategory === 'history') {
            deleteBtnHTML = `<button class="btn-delete-item" title="Hapus dari Riwayat" onclick="event.stopPropagation(); deleteHistory('${escapeHTML(item.link)}')">🗑️ Hapus</button>`;
        }
        
        card.innerHTML = `
            <div class="poi-thumb" style="background-image: url('${coverImg}')"></div>
            <div class="poi-details">
                <h3>${escapeHTML(item.title)}</h3>
                <div class="poi-footer" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div class="poi-footer-left">${deleteBtnHTML}</div>
                    <button class="btn-detail">Lihat Detail</button>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            fetchPostInfo(item.link);
        });
        
        cardsGrid.appendChild(card);
    });
}

// Fetch Detailed Info for Modal
async function fetchPostInfo(url) {
    currentPostUrl = url;
    showModalLoader();
    
    try {
        const response = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
        const result = await response.json();
        
        if (result.success) {
            currentPostInfo = result.data;
            // Ensure the data has a link property set to the fetch url
            currentPostInfo.link = url;
            
            // Add to watch history automatically
            addToHistory({
                title: currentPostInfo.title,
                image: currentPostInfo.image,
                link: url
            });
            
            renderModalContent(currentPostInfo);
        } else {
            throw new Error(result.error || 'Gagal mengambil detail postingan.');
        }
    } catch (err) {
        renderModalError(err.message);
    }
}

// Render Modal Content
function renderModalContent(info) {
    const coverImg = info.image 
        ? proxyImg(info.image)
        : 'https://via.placeholder.com/300x420/1a1526/f3f0ff?text=No+Cover';
    const cleanTitle = escapeHTML(info.title).replace(/\s*–\s*NekoPoi\s*$/gi, '');
    
    let genresHTML = '';
    if (info.genres && info.genres.length > 0) {
        genresHTML = `
            <div class="modal-genres">
                ${info.genres.map(g => `<span class="genre-tag">${escapeHTML(g)}</span>`).join('')}
            </div>
        `;
    }

    let streamsHTML = '';
    if (info.streams && info.streams.length > 0) {
        streamsHTML = `
            <div class="modal-stream-section">
                <h3>Putar Online</h3>
                <div class="video-player-container">
                    <iframe id="poi-video-player"
                        src="${escapeHTML(info.streams[0].url)}"
                        allowfullscreen
                        allow="autoplay; fullscreen; encrypted-media"
                        referrerpolicy="no-referrer"
                    ></iframe>
                </div>
                <div class="stream-tabs">
                    ${info.streams.map((stream, idx) => `
                        <button class="stream-tab-btn ${idx === 0 ? 'active' : ''}" onclick="switchStream(this, '${escapeHTML(stream.url)}')">
                            ${escapeHTML(stream.name)}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    let downloadsHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Tautan unduhan tidak tersedia.</p>';
    if (info.downloads && info.downloads.length > 0) {
        downloadsHTML = `
            <div class="download-groups-container">
                ${info.downloads.map(group => `
                    <div class="download-group">
                        <div class="download-group-title">${escapeHTML(group.title)}</div>
                        <div class="download-group-links">
                            ${group.links.map(link => `
                                <a href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer" class="download-btn">
                                    ${escapeHTML(link.host)}
                                </a>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Episodes list (for series pages)
    let episodesHTML = '';
    if (info.episodes && info.episodes.length > 0) {
        episodesHTML = `
            <div class="modal-episodes-section">
                <h3>Daftar Episode <span class="episodes-count">${info.episodes.length} Episode</span></h3>
                <div class="episodes-grid">
                    ${info.episodes.map((ep, idx) => `
                        <div class="episode-card" onclick="fetchPostInfo('${escapeHTML(ep.link)}')" title="${escapeHTML(ep.title)}">
                            <div class="episode-thumb" style="background-image: url('${ep.thumb ? proxyImg(ep.thumb) : ''}')">
                                <span class="episode-badge">${escapeHTML(ep.badge || `Ep ${idx + 1}`)}</span>
                            </div>
                            <div class="episode-info">
                                <span class="episode-title">${escapeHTML(ep.title)}</span>
                                ${ep.date ? `<span class="episode-date">${escapeHTML(ep.date)}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    const isSaved = isBookmarked(info.link);
    const bookmarkBtnText = isSaved ? '🔖 Hapus Penanda' : '🔖 Simpan ke Penanda';
    const bookmarkBtnClass = isSaved ? 'btn-bookmark saved' : 'btn-bookmark';

    modalContent.innerHTML = `
        <div class="modal-header-section">
            <div class="modal-cover" style="background-image: url('${coverImg}')"></div>
            <div class="modal-meta-info">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
                    <h2 style="flex: 1; min-width: 200px; margin: 0;">${cleanTitle}</h2>
                    <button class="${bookmarkBtnClass}" id="modal-bookmark-btn" onclick="toggleModalBookmark()">
                        ${bookmarkBtnText}
                    </button>
                </div>
                ${genresHTML}
                <div class="modal-synopsis">${info.description ? escapeHTML(info.description) : 'Tidak ada deskripsi.'}</div>
            </div>
        </div>
        
        ${streamsHTML}
        
        <div class="modal-download-section">
            <h3>Tautan Unduhan</h3>
            ${downloadsHTML}
        </div>

        ${episodesHTML}
    `;
}

// Toggle bookmark state in modal
window.toggleModalBookmark = function() {
    if (!currentPostInfo) return;
    const isSaved = isBookmarked(currentPostInfo.link);
    if (isSaved) {
        removeBookmark(currentPostInfo.link);
    } else {
        addBookmark(currentPostInfo);
    }
    
    // Update modal button state
    const btn = document.getElementById('modal-bookmark-btn');
    if (btn) {
        const nowSaved = isBookmarked(currentPostInfo.link);
        btn.textContent = nowSaved ? '🔖 Hapus Penanda' : '🔖 Simpan ke Penanda';
        if (nowSaved) {
            btn.classList.add('saved');
        } else {
            btn.classList.remove('saved');
        }
    }
    
    // Refresh bookmarks view in grid if active
    if (currentCategory === 'bookmarks') {
        fetchData();
    }
};

// Modal Helpers
function showModalLoader() {
    modalContent.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 0; gap: 1.5rem;">
            <div class="poi-spinner"></div>
            <p style="color: var(--text-muted); font-size: 0.95rem;">Mengambil detail info...</p>
        </div>
    `;
    modalBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden'; // prevent body scrolling
}

function renderModalError(msg) {
    modalContent.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: #ff405b;">
            <div style="font-size: 2.5rem; margin-bottom: 1rem;">❌</div>
            <h3>Gagal Memuat Detail</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.5rem;">${escapeHTML(msg)}</p>
        </div>
    `;
}

function closeModal() {
    modalBackdrop.classList.remove('active');
    document.body.style.overflow = ''; // restore scrolling
    
    // Clear player iframe to stop playback
    const player = document.getElementById('poi-video-player');
    if (player) {
        player.src = '';
    }
}

// Pagination Helpers
function updatePaginationControls(hasData) {
    pageNum.textContent = `Halaman ${currentPage}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = !hasData;
}

// View Utilities
function showLoader() { loader.style.display = 'flex'; }
function hideLoader() { loader.style.display = 'none'; }
function showError(msg) {
    errorMessage.textContent = msg;
    errorContainer.style.display = 'flex';
    cardsGrid.style.display = 'none';
}
function hideError() {
    errorContainer.style.display = 'none';
    cardsGrid.style.display = 'grid';
}

function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Global Switch Stream Server Logic
window.switchStream = function(btn, url) {
    const player = document.getElementById('poi-video-player');
    if (player) {
        // Remove and re-set src to force reload without inheriting popup state
        player.src = '';
        setTimeout(() => { player.src = url; }, 50);
    }
    const buttons = document.querySelectorAll('.stream-tab-btn');
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
};

// Theme Helper Function
function applyTheme(themeName) {
    document.documentElement.classList.remove('theme-sakura', 'theme-oled', 'theme-cyberpunk');
    if (themeName && themeName !== 'dark') {
        document.documentElement.classList.add(`theme-${themeName}`);
    }
}

// Theme Change Event Listener
if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
        const theme = e.target.value;
        localStorage.setItem('poi_theme', theme);
        applyTheme(theme);
    });
}

// Backup (Export) Event Listener
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        try {
            const data = {
                bookmarks: getBookmarks(),
                history: getHistory(),
                theme: localStorage.getItem('poi_theme') || 'dark',
                exportedAt: new Date().toISOString()
            };
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `nekopoi_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Gagal mengekspor data: ' + err.message);
        }
    });
}

// Restore (Import) Event Listener
if (importBtn && importFileInput) {
    importBtn.addEventListener('click', () => {
        importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                
                if (data && (Array.isArray(data.bookmarks) || Array.isArray(data.history))) {
                    if (Array.isArray(data.bookmarks)) {
                        saveBookmarks(data.bookmarks);
                    }
                    if (Array.isArray(data.history)) {
                        saveHistory(data.history);
                    }
                    if (data.theme) {
                        localStorage.setItem('poi_theme', data.theme);
                    }
                    
                    alert('Data berhasil diimpor! Halaman akan dimuat ulang.');
                    window.location.reload();
                } else {
                    alert('Format file cadangan tidak valid (data Bookmarks atau History tidak ditemukan).');
                }
            } catch (err) {
                alert('Gagal membaca file: ' + err.message);
            }
            importFileInput.value = '';
        };
        reader.readAsText(file);
    });
}
