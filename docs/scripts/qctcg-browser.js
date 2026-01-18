(function(window) {
    'use strict';

    /**
     * QCTCG Card Browser - Enhanced Edition
     * A sleek, modern player browser with refined aesthetics
     */

    function parseCSV(csvText) {
        const lines = csvText.trim().split(/\r?\n/);
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let char of line) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());
            
            if (values[0]) {
                data.push(values);
            }
        }
        
        return data;
    }

    const COLUMNS = {
        TEAM_OWNER: 0, TWITCH_ID: 1,
        KEEPER: 2, KEEPER_OVR: 3, KEEPER_PERK: 4, KEEPER_TEAM: 5,
        BEATER: 6, BEATER_OVR: 7, BEATER_PERK: 8, BEATER_TEAM: 9,
        SEEKER: 10, SEEKER_OVR: 11, SEEKER_PERK: 12, SEEKER_TEAM: 13,
        BK_CHASER: 14, BK_CHASER_OVR: 15, BK_CHASER_PERK: 16, BK_CHASER_TEAM: 17,
        MID_CHASER: 18, MID_CHASER_OVR: 19, MID_CHASER_PERK: 20, MID_CHASER_TEAM: 21,
        UP_CHASER: 22, UP_CHASER_OVR: 23, UP_CHASER_PERK: 24, UP_CHASER_TEAM: 25,
        TRI_PERK: 26, TEAM_OVR: 27, SYNERGY: 28, TEAM_SCORE: 29,
        BENCH_1: 30, BENCH_2: 31, TRADE_1: 32, TRADE_2: 33
    };

    function extractPlayers(data) {
        const playerMap = new Map();
        const allOwners = new Set();
        
        data.forEach(row => {
            const owner = row[COLUMNS.TEAM_OWNER];
            if (!owner) return;
            
            allOwners.add(owner);
            
            const positions = [
                { name: row[COLUMNS.KEEPER], ovr: row[COLUMNS.KEEPER_OVR], perk: row[COLUMNS.KEEPER_PERK], team: row[COLUMNS.KEEPER_TEAM], position: 'Keeper', posClass: 'keeper' },
                { name: row[COLUMNS.BEATER], ovr: row[COLUMNS.BEATER_OVR], perk: row[COLUMNS.BEATER_PERK], team: row[COLUMNS.BEATER_TEAM], position: 'Beater', posClass: 'beater' },
                { name: row[COLUMNS.SEEKER], ovr: row[COLUMNS.SEEKER_OVR], perk: row[COLUMNS.SEEKER_PERK], team: row[COLUMNS.SEEKER_TEAM], position: 'Seeker', posClass: 'seeker' },
                { name: row[COLUMNS.BK_CHASER], ovr: row[COLUMNS.BK_CHASER_OVR], perk: row[COLUMNS.BK_CHASER_PERK], team: row[COLUMNS.BK_CHASER_TEAM], position: 'BK Chaser', posClass: 'chaser' },
                { name: row[COLUMNS.MID_CHASER], ovr: row[COLUMNS.MID_CHASER_OVR], perk: row[COLUMNS.MID_CHASER_PERK], team: row[COLUMNS.MID_CHASER_TEAM], position: 'Mid Chaser', posClass: 'chaser' },
                { name: row[COLUMNS.UP_CHASER], ovr: row[COLUMNS.UP_CHASER_OVR], perk: row[COLUMNS.UP_CHASER_PERK], team: row[COLUMNS.UP_CHASER_TEAM], position: 'Up Chaser', posClass: 'chaser' },
                { name: row[COLUMNS.BENCH_1], ovr: null, perk: null, team: null, position: 'Bench', posClass: 'bench' },
                { name: row[COLUMNS.BENCH_2], ovr: null, perk: null, team: null, position: 'Bench', posClass: 'bench' }
            ];
            
            positions.forEach(p => {
                if (p.name && p.name.trim()) {
                    const playerName = p.name.trim();
                    
                    if (!playerMap.has(playerName)) {
                        playerMap.set(playerName, {
                            name: playerName,
                            ovr: p.ovr || '?',
                            perk: p.perk || '',
                            team: p.team || '',
                            position: p.position,
                            posClass: p.posClass,
                            owners: []
                        });
                    }
                    
                    const player = playerMap.get(playerName);
                    if (!player.owners.includes(owner)) {
                        player.owners.push(owner);
                    }
                    
                    if (p.ovr && p.ovr.trim() && (player.ovr === '?' || !player.ovr)) player.ovr = p.ovr;
                    if (p.perk && p.perk.trim() && !player.perk) player.perk = p.perk;
                    if (p.team && p.team.trim() && !player.team) player.team = p.team;
                    if (p.posClass !== 'bench' && player.posClass === 'bench') {
                        player.position = p.position;
                        player.posClass = p.posClass;
                    }
                }
            });
        });
        
        const players = Array.from(playerMap.values()).sort((a, b) => {
            const ovrA = parseInt(a.ovr) || 0;
            const ovrB = parseInt(b.ovr) || 0;
            if (ovrB !== ovrA) return ovrB - ovrA;
            return a.name.localeCompare(b.name);
        });
        
        return { players, owners: allOwners };
    }

    function injectStyles() {
        if (document.getElementById('qctcg-browser-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'qctcg-browser-styles';
        styles.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Source+Sans+3:wght@400;600;700&display=swap');
            
            .qctcg-browser {
                --qctcg-gold: #ffc72e;
                --qctcg-gold-dim: #a68320;
                --qctcg-border: #1a1a1a;
                --qctcg-keeper: #00799e ;
                --qctcg-beater: #0d4f6b;
                --qctcg-seeker: #6b5a0d;
                --qctcg-chaser: #6b1a1a;
                --qctcg-bench: #3d3d3d;
                color: var(--qctcg-text);
                padding: 24px;
            }
            
            /* Search & Filters */
            .qctcg-controls {
                display: flex;
                flex-direction: column;
                gap: 16px;
                margin-bottom: 24px;
            }
            
            .qctcg-search-wrapper {
                position: relative;
            }
            
            .qctcg-search-icon {
                position: absolute;
                left: 16px;
                top: 50%;
                transform: translateY(-50%);
                color: var(--qctcg-text-dim);
                pointer-events: none;
            }
            
            .qctcg-search {
                width: 100%;
                padding: 14px 16px 14px 48px;
                font-size: 15px;
                font-family: inherit;
                background: var(--qctcg-bg-elevated);
                border: 1px solid var(--qctcg-border);
                border-radius: 8px;
                color: var(--qctcg-text);
                transition: all 0.2s ease;
            }
            
            .qctcg-search::placeholder {
                color: var(--qctcg-text-dim);
            }
            
            .qctcg-search:focus {
                outline: none;
                border-color: var(--qctcg-gold);
                box-shadow: 0 0 0 3px rgba(212, 165, 37, 0.15);
            }
            
            .qctcg-filters {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .qctcg-filter-btn {
                padding: 8px 16px;
                font-size: 12px;
                font-weight: 600;
                font-family: 'Oswald', sans-serif;
                text-transform: uppercase;
                letter-spacing: 1px;
                background: var(--qctcg-bg-elevated);
                border: 1px solid var(--qctcg-border);
                border-radius: 6px;
                color: var(--qctcg-text-dim);
                cursor: pointer;
                transition: all 0.15s ease;
            }
            
            .qctcg-filter-btn:hover {
                border-color: var(--qctcg-gold-dim);
                color: var(--qctcg-text);
            }
            
            .qctcg-filter-btn.active {
                background: var(--qctcg-gold);
                border-color: var(--qctcg-gold);
                color: #000;
            }
            
            /* Stats Bar */
            .qctcg-stats {
                display: flex;
                gap: 12px;
                justify-content: center;
                margin-bottom: 28px;
                flex-wrap: wrap;
            }
            
            .qctcg-stat {
                background: var(--qctcg-bg-elevated);
                border: 1px solid var(--qctcg-border);
                border-radius: 8px;
                padding: 12px 24px;
                text-align: center;
                min-width: 100px;
            }
            
            .qctcg-stat-value {
                font-family: 'Oswald', sans-serif;
                font-size: 28px;
                font-weight: 600;
                color: var(--qctcg-gold);
                line-height: 1;
            }
            
            .qctcg-stat-label {
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                color: var(--qctcg-text-dim);
                margin-top: 4px;
            }
            
            /* Card Grid */
            .qctcg-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 16px;
            }
            
            /* Player Card */
            .qctcg-card {
                background: var(--qctcg-bg-card);
                border: 1px solid var(--qctcg-border);
                border-radius: 10px;
                overflow: hidden;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            
            .qctcg-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
            }
            
            .qctcg-card.qctcg-card-prime {
                border-color: var(--qctcg-gold);
                box-shadow: 0 0 12px rgba(212, 165, 37, 0.3);
            }
            
            .qctcg-card.qctcg-card-prime:hover {
                box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4), 0 0 16px rgba(212, 165, 37, 0.4);
            }
            
            .qctcg-card-header {
                position: relative;
                padding: 16px;
                padding-right: 60px;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            
            .qctcg-card-header.keeper {
                background: linear-gradient(135deg, #0f5c7d 0%, #083d54 100%);
            }
            .qctcg-card-header.beater {
                background: linear-gradient(135deg, #8c1f1f 0%, #4d1111 100%);
            }
            .qctcg-card-header.seeker {
                background: linear-gradient(135deg, #9e7b14 0%, #6b530e 100%);
            }
            .qctcg-card-header.chaser {
                background: linear-gradient(135deg, #2d6b2d 0%, #1a4019 100%);
            }
            .qctcg-card-header.bench {
                background: linear-gradient(135deg, #4a4a4a 0%, #2d2d2d 100%);
            }
            
            .qctcg-card-position {
                font-family: 'Oswald', sans-serif;
                font-size: 10px;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 2px;
                color: rgba(255, 255, 255, 0.7);
            }
            
            .qctcg-card-name-row {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .qctcg-season-badge {
                font-family: 'Oswald', sans-serif;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding: 3px 8px;
                background: rgba(255, 255, 255, 0.15);
                border: 1px solid rgba(255, 255, 255, 0.25);
                border-radius: 4px;
                color: rgba(255, 255, 255, 0.9);
                white-space: nowrap;
            }
            
            .qctcg-season-badge.prime {
                background: rgba(212, 165, 37, 0.25);
                border-color: var(--qctcg-gold);
                color: var(--qctcg-gold);
            }
            
            .qctcg-card-name {
                font-family: 'Oswald', sans-serif;
                font-size: 18px;
                font-weight: 600;
                color: #fff;
                line-height: 1.2;
            }
            
            .qctcg-card-ovr {
                position: absolute;
                top: 50%;
                right: 12px;
                transform: translateY(-50%);
                width: 44px;
                height: 44px;
                backdrop-filter: blur(4px);
                border: 2px solid rgba(255, 255, 255, 0.25);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Oswald', sans-serif;
                font-size: 16px;
                font-weight: 600;
                color: #fff;
            }
            
            .qctcg-card-tags {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
                margin-top: 4px;
            }
            
            .qctcg-tag {
                font-size: 10px;
                font-weight: 600;
                padding: 4px 8px;
                border-radius: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                line-height: 1;
                white-space: nowrap;
            }
            
            .qctcg-tag.perk {
                background: rgba(106, 61, 154, 0.9);
                color: #d4e6f5;
            }
            
            /* Card Body */
            .qctcg-card-body {
                padding: 14px 16px;
                border-top: 1px solid var(--qctcg-border);
            }
            
            .qctcg-owners-label {
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                color: var(--qctcg-text-dim);
                margin-bottom: 8px;
            }
            
            .qctcg-owners-list {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }
            
            .qctcg-owner {
                font-size: 11px;
                font-weight: 600;
                padding: 4px 10px;
                background: var(--qctcg-gold);
                color: #000;
                border-radius: 4px;
                transition: all 0.15s ease;
            }
            
            .qctcg-owner.highlight {
                background: #27ae60;
                color: #fff;
                box-shadow: 0 0 12px rgba(39, 174, 96, 0.4);
            }
            
            /* Empty State */
            .qctcg-empty {
                grid-column: 1 / -1;
                text-align: center;
                padding: 60px 20px;
            }
            
            .qctcg-empty-icon {
                font-size: 48px;
                margin-bottom: 16px;
                opacity: 0.5;
            }
            
            .qctcg-empty h4 {
                font-family: 'Oswald', sans-serif;
                font-size: 20px;
                font-weight: 500;
                margin: 0 0 8px;
                color: var(--qctcg-text);
            }
            
            .qctcg-empty p {
                margin: 0;
                color: var(--qctcg-text-dim);
            }
            
            /* Loading State */
            .qctcg-loading {
                text-align: center;
                padding: 60px 20px;
            }
            
            .qctcg-spinner {
                width: 48px;
                height: 48px;
                border: 3px solid var(--qctcg-border);
                border-top-color: var(--qctcg-gold);
                border-radius: 50%;
                animation: qctcg-spin 0.8s linear infinite;
                margin: 0 auto 20px;
            }
            
            .qctcg-loading p {
                color: var(--qctcg-text-dim);
                font-size: 14px;
            }
            
            @keyframes qctcg-spin {
                to { transform: rotate(360deg); }
            }
            
            /* Responsive */
            @media (max-width: 600px) {
                .qctcg-browser {
                    padding: 16px;
                }
                
                .qctcg-grid {
                    grid-template-columns: 1fr;
                }
                
                .qctcg-stat {
                    padding: 10px 16px;
                    min-width: 80px;
                }
                
                .qctcg-stat-value {
                    font-size: 22px;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    function parsePlayerName(fullName) {
        // Match patterns like "S1 PRIME PlayerName", "S2 Player Name", etc.
        const match = fullName.match(/^(S\d+)\s+(PRIME|Player)\s+(.+)$/i);
        if (match) {
            return {
                season: match[1].toUpperCase(),
                type: match[2].toUpperCase(),
                name: match[3],
                isPrime: match[2].toUpperCase() === 'PRIME'
            };
        }
        return { season: null, type: null, name: fullName, isPrime: false };
    }

    function createPlayerCard(player, searchLower) {
        const parsed = parsePlayerName(player.name);
        
        const perkTag = player.perk && player.perk.toLowerCase() !== 'none' && player.perk.trim()
            ? `<span class="qctcg-tag perk">${player.perk}</span>` 
            : '';
        
        const teamTag = player.team && player.team.trim()
            ? `<span class="qctcg-tag">${player.team} Synergy</span>` 
            : '';
        
        const ownersHtml = player.owners.map(owner => {
            const isHighlight = searchLower && owner.toLowerCase().includes(searchLower);
            return `<span class="qctcg-owner ${isHighlight ? 'highlight' : ''}">${owner}</span>`;
        }).join('');
        
        const seasonBadge = parsed.season 
            ? `<span class="qctcg-season-badge ${parsed.isPrime ? 'prime' : ''}">${parsed.season} ${parsed.type}</span>` 
            : '';
        
        const primeClass = parsed.isPrime ? 'qctcg-card-prime' : '';
        
        return `
            <div class="qctcg-card ${primeClass}">
                <div class="qctcg-card-header ${player.posClass}">
                    <div class="qctcg-card-position">${player.position}</div>
                    <div class="qctcg-card-name-row">
                        ${seasonBadge}
                        <span class="qctcg-card-name">${parsed.name}</span>
                    </div>
                    <div class="qctcg-card-ovr">${player.ovr}</div>
                    <div class="qctcg-card-tags">${teamTag}${perkTag}</div>
                </div>
                <div class="qctcg-card-body">
                    <div class="qctcg-owners-label">Owned by (${player.owners.length})</div>
                    <div class="qctcg-owners-list">${ownersHtml}</div>
                </div>
            </div>
        `;
    }

    function renderPlayers(container, players, currentFilter, searchTerm) {
        const grid = container.querySelector('.qctcg-grid');
        const visibleCount = container.querySelector('.qctcg-visible-count');
        const searchLower = searchTerm.toLowerCase();
        
        const filtered = players.filter(player => {
            if (currentFilter !== 'all') {
                if (currentFilter === 'chaser' && player.posClass !== 'chaser') return false;
                if (currentFilter !== 'chaser' && player.posClass !== currentFilter) return false;
            }
            
            if (searchTerm) {
                const hasMatch = player.owners.some(owner => 
                    owner.toLowerCase().includes(searchLower)
                );
                if (!hasMatch) return false;
            }
            
            return true;
        });
        
        visibleCount.textContent = filtered.length;
        
        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="qctcg-empty">
                    <div class="qctcg-empty-icon">🔍</div>
                    <h4>No Players Found</h4>
                    <p>Try adjusting your search or filters</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = filtered.map(p => createPlayerCard(p, searchLower)).join('');
    }

    function loadQCTCGBrowser(csvUrl, elementId) {
        const target = document.getElementById(elementId);
        if (!target) {
            console.error(`Element '${elementId}' not found`);
            return;
        }
        
        injectStyles();
        
        target.innerHTML = `
            <div class="qctcg-browser">
                <div class="qctcg-loading">
                    <div class="qctcg-spinner"></div>
                    <p>Loading player data...</p>
                </div>
            </div>
        `;
        
        fetch(csvUrl)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.text();
            })
            .then(csvText => {
                const data = parseCSV(csvText);
                if (data.length === 0) throw new Error('No data in CSV');
                
                const { players, owners } = extractPlayers(data);
                if (players.length === 0) throw new Error('No players found');
                
                const searchIcon = `<svg class="qctcg-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`;
                
                target.innerHTML = `
                    <div class="qctcg-browser">
                        <div class="qctcg-controls">
                            <div class="qctcg-search-wrapper">
                                ${searchIcon}
                                <input type="text" class="qctcg-search" placeholder="Search by team owner...">
                            </div>
                            <div class="qctcg-filters">
                                <button class="qctcg-filter-btn active" data-pos="all">All</button>
                                <button class="qctcg-filter-btn" data-pos="keeper">Keeper</button>
                                <button class="qctcg-filter-btn" data-pos="beater">Beater</button>
                                <button class="qctcg-filter-btn" data-pos="seeker">Seeker</button>
                                <button class="qctcg-filter-btn" data-pos="chaser">Chaser</button>
                                <button class="qctcg-filter-btn" data-pos="bench">Bench</button>
                            </div>
                        </div>
                        
                        <div class="qctcg-stats">
                            <div class="qctcg-stat">
                                <div class="qctcg-stat-value">${players.length}</div>
                                <div class="qctcg-stat-label">Players</div>
                            </div>
                            <div class="qctcg-stat">
                                <div class="qctcg-stat-value">${owners.size}</div>
                                <div class="qctcg-stat-label">Owners</div>
                            </div>
                            <div class="qctcg-stat">
                                <div class="qctcg-stat-value qctcg-visible-count">${players.length}</div>
                                <div class="qctcg-stat-label">Showing</div>
                            </div>
                        </div>
                        
                        <div class="qctcg-grid"></div>
                    </div>
                `;
                
                const container = target.querySelector('.qctcg-browser');
                let currentFilter = 'all';
                let searchTerm = '';
                
                renderPlayers(container, players, currentFilter, searchTerm);
                
                const searchInput = container.querySelector('.qctcg-search');
                searchInput.addEventListener('input', e => {
                    searchTerm = e.target.value;
                    renderPlayers(container, players, currentFilter, searchTerm);
                });
                
                const filterBtns = container.querySelectorAll('.qctcg-filter-btn');
                filterBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        filterBtns.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        currentFilter = btn.dataset.pos;
                        renderPlayers(container, players, currentFilter, searchTerm);
                    });
                });
            })
            .catch(err => {
                console.error('QCTCG Browser Error:', err);
                target.innerHTML = `
                    <div class="qctcg-browser">
                        <div class="qctcg-empty">
                            <div class="qctcg-empty-icon">⚠️</div>
                            <h4>Error Loading Data</h4>
                            <p>${err.message}</p>
                        </div>
                    </div>
                `;
            });
    }

    window.loadQCTCGBrowser = loadQCTCGBrowser;

})(window);