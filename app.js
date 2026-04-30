let allGames = [];
let filteredGames = [];

const gamesGrid = document.getElementById('games-grid');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const resultsCount = document.getElementById('resultsCount');
const loadingSpinner = document.getElementById('loading-spinner');

// Modal Elements
const gameModal = document.getElementById('gameModal');
const closeModalBtn = document.getElementById('closeModal');
const modalBody = document.getElementById('modalBody');

// Mock Data for Playstation to fulfill the filter requirement
const mockPlaystationGames = [
    { Game: "God of War Ragnarök", System: "Playstation", Release: "Nov-22", Metacritic: "94", Genre: "Action-Adventure" },
    { Game: "The Last of Us Part II", System: "Playstation", Release: "Jun-20", Metacritic: "93", Genre: "Action-Adventure" },
    { Game: "Spider-Man 2", System: "Playstation", Release: "Oct-23", Metacritic: "90", Genre: "Action-Adventure" },
    { Game: "Ghost of Tsushima", System: "Playstation", Release: "Jul-20", Metacritic: "83", Genre: "Action-Adventure" },
    { Game: "Horizon Forbidden West", System: "Playstation", Release: "Feb-22", Metacritic: "88", Genre: "Action / Role-Playing" }
];

async function init() {
    try {
        const response = await fetch('data/xboxgames.csv');
        if (!response.ok) throw new Error('Failed to fetch CSV');
        const csvText = await response.text();
        
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                // Filter out empty rows or games without names
                const parsedGames = results.data.filter(row => row.Game);
                
                // Add our mock Playstation games
                allGames = [...parsedGames, ...mockPlaystationGames];
                filteredGames = [...allGames];
                
                loadingSpinner.style.display = 'none';
                renderGames();
                setupEventListeners();
            }
        });
    } catch (error) {
        console.error("Error loading games:", error);
        resultsCount.textContent = "Error loading games. Please make sure you are running a local server.";
        loadingSpinner.style.display = 'none';
    }
}

function renderGames() {
    gamesGrid.innerHTML = '';
    
    // For performance, only render first 100 if searching/filtering isn't aggressive
    const gamesToRender = filteredGames.slice(0, 150);
    
    resultsCount.textContent = `Showing ${filteredGames.length} games`;
    
    if (gamesToRender.length === 0) {
        gamesGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 3rem;">No games found matching your criteria.</div>';
        return;
    }

    const fragment = document.createDocumentFragment();

    gamesToRender.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.setAttribute('data-system', game.System || '');
        
        const score = parseInt(game.Metacritic);
        let scoreClass = 'null';
        let scoreText = '-';
        if (!isNaN(score)) {
            scoreText = score;
            if (score >= 80) scoreClass = 'high';
            else if (score >= 60) scoreClass = 'mid';
            else scoreClass = 'low';
        }

        // Platform tags
        let tagsHtml = '';
        if (game.System) {
            if (game.System.includes('Xbox')) tagsHtml += '<span class="platform-tag xbox">Xbox</span>';
            if (game.System.includes('PC')) tagsHtml += '<span class="platform-tag pc">PC</span>';
            if (game.System.includes('Playstation')) tagsHtml += '<span class="platform-tag playstation">Playstation</span>';
        }

        const release = game.Release || 'Unknown';
        const genre = game.Genre || 'Various';

        card.innerHTML = `
            <div class="card-header">
                <h3 class="game-title">${game.Game}</h3>
                <div class="metascore ${scoreClass}">${scoreText}</div>
            </div>
            <div class="card-meta">
                <span>${release}</span>
                <span>${genre.split('/')[0].trim()}</span>
            </div>
            <div class="card-footer">
                ${tagsHtml}
            </div>
        `;

        card.addEventListener('click', () => openModal(game));
        fragment.appendChild(card);
    });

    gamesGrid.appendChild(fragment);
}

function filterGames() {
    const searchTerm = searchInput.value.toLowerCase();
    const activeFilterBtn = document.querySelector('.filter-btn.active');
    const filterType = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';

    filteredGames = allGames.filter(game => {
        const matchesSearch = game.Game && game.Game.toLowerCase().includes(searchTerm);
        
        let matchesFilter = true;
        if (filterType !== 'all') {
            const system = game.System || '';
            matchesFilter = system.includes(filterType);
        }

        return matchesSearch && matchesFilter;
    });

    renderGames();
}

function setupEventListeners() {
    searchInput.addEventListener('input', () => {
        // Simple debounce
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(filterGames, 300);
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterGames();
        });
    });

    closeModalBtn.addEventListener('click', closeModal);
    gameModal.addEventListener('click', (e) => {
        if (e.target === gameModal) closeModal();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !gameModal.classList.contains('hidden')) {
            closeModal();
        }
    });
}

function openModal(game) {
    const score = parseInt(game.Metacritic);
    let scoreClass = 'null';
    let scoreText = 'No Metascore';
    if (!isNaN(score)) {
        scoreText = `Metascore: ${score}`;
        if (score >= 80) scoreClass = 'high';
        else if (score >= 60) scoreClass = 'mid';
        else scoreClass = 'low';
    }

    const encodedTitle = encodeURIComponent(game.Game);
    // Generic proxy search since original RARBG is offline, or generic duckduckgo search
    const searchUrl = `https://duckduckgo.com/?q=${encodedTitle}+game+download+or+buy`;

    modalBody.innerHTML = `
        <h2 class="modal-title">${game.Game}</h2>
        <div class="modal-meta">
            <span class="metascore ${scoreClass}">${scoreText}</span>
            <span style="display:flex; align-items:center; color: var(--text-secondary);">${game.Release || 'Unknown Release Date'}</span>
        </div>
        
        <div class="modal-section">
            <h4>Platforms</h4>
            <p style="color: var(--text-primary); font-size: 1.1rem;">${game.System || 'Unknown'}</p>
        </div>

        <div class="modal-section">
            <h4>Genres</h4>
            <p style="color: var(--text-primary);">${game.Genre || 'Unknown'}</p>
        </div>
        
        ${game.ESRB ? `
        <div class="modal-section">
            <h4>ESRB Rating</h4>
            <p style="color: var(--text-primary);">${game.ESRB} <span style="font-size: 0.85rem; color: var(--text-secondary); margin-left: 0.5rem;">${game['ESRB Content Descriptors'] || ''}</span></p>
        </div>` : ''}

        <a href="${searchUrl}" target="_blank" class="action-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            Search on Web
        </a>
    `;

    gameModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeModal() {
    gameModal.classList.add('hidden');
    document.body.style.overflow = '';
}

// Start the app
init();
