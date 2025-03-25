function runMatchPlugin() {
    const matchPlugin = {
        raw: {
            matches: [],
            playerResults: [],
        },
        teams: {},
        players: {},
        matches: {},
        defaultDivider: "-",
        csvUrls: {
            matches: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTNSR5EOLa0z72ue8LTYkT6gWuzBAM8HuD91pd7CyDeLBpAgeORsrO2ZJYu1yH8SP612Srn8X_ruM3G/pub?gid=1105953179&single=true&output=csv",
            playerResults: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTNSR5EOLa0z72ue8LTYkT6gWuzBAM8HuD91pd7CyDeLBpAgeORsrO2ZJYu1yH8SP612Srn8X_ruM3G/pub?gid=561594826&single=true&output=csv"
        },
        medalHeaders: [
            "ASSISTED N GOALS",
            "SCORED N GOALS",
            "STOLE THE QUAFFLE N TIMES",
            "INTERCEPTED N ENEMY PASS",
            "PASSED THE QUAFFLE N TIMES",
            "SAVED N GOALS",
            "PLAYERCALLER USED N TIMES",
            "PLAYCALLER ASSISTED N GOALS",
            "BEATER ASSISTED N GOALS",
            "CAUSED N FUMBLES",
            "FILLED N% METER",
            "CAUGHT SNITCH N TIMES",
            "FLEW THROUGH N RINGS",
            "KNOCKED OUT N CHASERS",
            "KNOCKED OUT N BEATERS", 
            "KNOCKED OUT N KEEPERS",
            "KNOCKED OUT N SEEKERS"
        ],

        mounted() {
            this.fetchAllData();
        },

        async fetchAllData() {
            try {
                // First load the team rosters and player data from JSON
                const [teamsResponse, playersResponse] = await Promise.all([
                    fetch('datatables/team-rosters.json').catch(() => ({ json: () => ({ teams: [] }) })),
                    fetch('datatables/players.json').catch(() => ({ json: () => ({ players: [] }) }))
                ]);

                // Parse JSON responses
                let teams = await teamsResponse.json();
                let players = await playersResponse.json();

                // Process teams and players
                this.parseTeams(teams.teams || []);
                this.parsePlayers(players.players || []);

                // Then load the match and player results from CSVs using the provided URLs
                await Promise.all([
                    this.loadCSV(this.csvUrls.matches, "matches"),
                    this.loadCSV(this.csvUrls.playerResults, "playerResults")
                ]);

                // Process the matches and player results
                this.parseMatches();
                this.processPlayerResults();

                // Render the matches
                this.renderMatches();
            } catch (error) {
                //console.warn('Error fetching data:', error);
            }
        },

        loadCSV(url, dataName) {
            return new Promise((resolve, reject) => {
                Papa.parse(url, {
                    download: true,
                    header: false, // Changed to false since we're handling header row manually
                    skipEmptyLines: true,
                    complete: function(results) {
                        //console.log(`Loaded ${dataName}:`, results.data);
                        matchPlugin.raw[dataName] = results.data;
                        resolve(results.data);
                    },
                    error: function(error) {
                        // console.error(`Error loading ${dataName}:`, error);
                        reject(error);
                    }
                });
            });
        },

        parseTeams(teams) {
            for (const team of teams) {
                if (team && team.tag) {
                    this.teams[team.tag] = team;
                }
            }
        },

        parsePlayers(players) {
            for (const player of players) {
                if (player && player.name) {
                    this.players[player.name] = player;
                }
            }
        },

        // Process match data
        parseMatches() {
            // If no matches data, return
            if (!this.raw.matches || this.raw.matches.length < 2) {
                // console.warn("No match results data found");
                return;
            }
            
            // Get header row - first row is expected to be the header
            const headerRow = this.raw.matches[0];
            
            // Initialize match collections by division
            const eastMatches = {};
            const westMatches = {};
            const newtsMatches = {};
            
            // Process data rows starting from index 1 (skipping header)
            for (let i = 1; i < this.raw.matches.length; i++) {
                const row = this.raw.matches[i];
                
                // Skip empty rows
                if (!row || row.length === 0) continue;
                
                // Extract basic match information from the row
                // Based on column structure: Date, Division, Round, MatchID, TeamA, TeamB, etc.
                const matchDate = row[0] || '';
                const divisionText = (row[1] || '').toLowerCase();
                const round = row[2] || '1'; // Round number
                const matchId = row[3] || `match_${i}`;
                const teamA = row[4] || '';
                const teamB = row[5] || '';
                
                // Week/round is the Round column
                const week = round;
                
                // Determine division
                let division = 'west'; // Default
                if (divisionText.includes('newt')) {
                    division = 'newts';
                } else if (divisionText.includes('east')) {
                    division = 'east';
                }
                
                // Find team objects using the team names
                const team1Obj = this.findTeamByName(teamA);
                const team2Obj = this.findTeamByName(teamB);
                
                // Skip this match if either team is not found in the teams data
                if (!team1Obj || !team2Obj || !team1Obj.name || !team2Obj.name) {
                    // console.warn(`Skipping match ${matchId}: One or both teams not found (${teamA}, ${teamB})`);
                    continue;
                }
                
                // Initialize match object
                const matchObj = {
                    id: matchId,
                    date: matchDate,
                    division: division,
                    week: week,
                    team1: team1Obj,
                    team2: team2Obj,
                    team1Score: 0, // Will be calculated from games
                    team2Score: 0, // Will be calculated from games
                    rounds: {}
                };
                
                for (let gameIndex = 1; gameIndex <= 5; gameIndex++) {
                    const teamAScoreIndex = 7 + (gameIndex - 1) * 2;
                    const teamBScoreIndex = 8 + (gameIndex - 1) * 2;
                    
                    // Skip games where either score is missing
                    if (!row[teamAScoreIndex] || !row[teamBScoreIndex] || 
                        row[teamAScoreIndex].trim() === '' || row[teamBScoreIndex].trim() === '') {
                        continue;
                    }
                    
                    // Parse scores
                    const team1Score = parseInt(row[teamAScoreIndex] || 0);
                    const team2Score = parseInt(row[teamBScoreIndex] || 0);
                    
                    // Create game/round object
                    matchObj.rounds[gameIndex] = {
                        round: gameIndex,
                        team1Score: team1Score,
                        team2Score: team2Score,
                        team1Players: [],
                        team2Players: []
                    };
                    
                    // Update match winner count based on game scores
                    if (team1Score > team2Score) {
                        matchObj.team1Score += 1;
                    } else if (team2Score > team1Score) {
                        matchObj.team2Score += 1;
                    }
                }
                
                // Process series result from columns 18-19
                if (row.length >= 20) {
                    const seriesA = parseInt(row[18] || 0);
                    const seriesB = parseInt(row[19] || 0);
                    matchObj.seriesResult = `${seriesA}-${seriesB}`;
                }
                
                // Add match to appropriate division and week
                if (division === 'newts') {
                    if (!newtsMatches[week]) newtsMatches[week] = {};
                    newtsMatches[week][matchId] = matchObj;
                } else if (division === 'east') {
                    if (!eastMatches[week]) eastMatches[week] = {};
                    eastMatches[week][matchId] = matchObj;
                } else {
                    if (!westMatches[week]) westMatches[week] = {};
                    westMatches[week][matchId] = matchObj;
                }
            }
            
            // Update the matches object
            this.matches = {
                east: eastMatches,
                west: westMatches,
                newts: newtsMatches
            };
        },

        // Helper function to find a team by name in the teams object
        findTeamByName(teamName) {
            if (!teamName) return null;
            
            // First try direct match on team tag
            if (this.teams[teamName]) {
                return this.teams[teamName];
            }
            
            // Otherwise search by name
            for (const tag in this.teams) {
                if (this.teams[tag].name === teamName) {
                    return this.teams[tag];
                }
            }
            
            // Return null if team not found
            return null;
        },

        // Process player data from PlayerResults.csv
        processPlayerResults() {
            // If no player results data, return
            if (!this.raw.playerResults || this.raw.playerResults.length < 2) {
                //console.warn("No player results data found");
                return;
            }
            
            // Get header row - first row contains the column names
            const headerRow = this.raw.playerResults[1];
            const medalIndices = {}; // Map medal headers to column indices
            
            // Create a mapping of medal column names to their column indices
            for (let i = 5; i < headerRow.length; i++) {
                const header = headerRow[i];
                if (header && header.trim() !== '') {
                    // Store the header exactly as it appears in the CSV
                    medalIndices[header.trim()] = i;
                }
            } 
            
            // Process data rows starting from index 1 (skipping header)
            for (let i = 1; i < this.raw.playerResults.length; i++) {
                const row = this.raw.playerResults[i];
                
                // Skip empty rows
                if (!row || row.length < 5) continue;
                
                // Extract player information
                const matchId = row[0] || '';
                const gameId = row[1] || '';
                const teamName = row[2] || '';
                const playerName = row[3] || '';
                const totalScore = parseInt(row[4] || 0);
                
                // Get player position from players object
                const playerObj = this.findPlayerByName(playerName);
                const position = playerObj ? playerObj.position : 'Unknown';
                const isCaptain = playerObj ? playerObj.captain === true : false;
                
                // Process medals - collect all non-zero medal values
                const medals = [];
                
                // Check each medal column directly using the header mapping
                for (const [header, index] of Object.entries(medalIndices)) {
                    // If the player has a value for this medal
                    if (row[index] && row[index].trim() !== '' && row[index] !== '0') {
                        // Replace N with the actual value in the header
                        const formattedMedal = header.replace('N', row[index]);
                        medals.push(formattedMedal);
                    }
                }
                
                // Find the match
                let matchObj = null;
                let division = '';
                
                // Search for the match in all divisions
                for (const div of ['east', 'west', 'newts']) {
                    if (this.matches[div]) {
                        for (const week in this.matches[div]) {
                            if (this.matches[div][week][matchId]) {
                                division = div;
                                matchObj = this.matches[div][week][matchId];
                                break;
                            }
                        }
                    }
                    if (matchObj) break;
                }
                
                // If match not found, skip this player result
                if (!matchObj) {
                    // console.warn(`Match not found for player ${playerName}, match ID ${matchId}`);
                    continue;
                }
                
                // Determine which team the player is on
                const teamObj = this.findTeamByName(teamName);
                
                // Skip if team not found
                if (!teamObj) {
                    // console.warn(`Team not found for player ${playerName}, team name ${teamName}`);
                    continue;
                }
                
                const isTeam1 = teamObj && matchObj.team1 && (
                    teamObj.tag === matchObj.team1.tag || 
                    teamObj.name === matchObj.team1.name
                );
                
                // Add player to the appropriate round and team
                const teamKey = isTeam1 ? 'team1Players' : 'team2Players';
                
                // Add player to the round if it exists
                if (matchObj.rounds[gameId]) {
                    matchObj.rounds[gameId][teamKey].push({
                        player: playerName,
                        playerInfo: playerObj,
                        position: position,
                        captain: isCaptain,
                        points: totalScore,
                        medals: medals
                    });
                } else {
                    // console.warn(`Round ${gameId} not found in match ${matchId} for player ${playerName}`);
                }
            }
        },

        // Helper function to find a player by name
        findPlayerByName(playerName) {
            if (!playerName) return null;
            
            // Direct lookup
            if (this.players[playerName]) {
                return this.players[playerName];
            }
            
            // Search by name (case insensitive)
            const lowerName = playerName.toLowerCase();
            for (const name in this.players) {
                if (name.toLowerCase() === lowerName) {
                    return this.players[name];
                }
            }
            
            // Not found
            return null;
        },

        renderMatches() {
            // Render for each division
            this.renderDivision('east', this.matches.east);
            this.renderDivision('west', this.matches.west);
            this.renderDivision('newts', this.matches.newts);
            
            // Register event handlers for the toggles
            this.registerToggles();
        },

        renderDivision(division, rounds) {
            // Ensure both parameters are provided and valid
            if (!division || !rounds) {
                //console.warn(`Invalid division or rounds data: ${division}`);
                return;
            }

            // Make sure division is a string
            const divisionStr = String(division);

            // Find the container element
            const content = document.querySelector(`#${divisionStr}-season-matches`);
            if (!content) {
                //console.error(`Could not find \`#${divisionStr}-season-matches\` element`);
                return;
            }

            let roundsHtml = '';

            // Sort rounds numerically
            const sortedrounds = Object.keys(rounds).sort((a, b) => {
                return parseInt(a) - parseInt(b);
            });

            // Generate HTML for each round
            for (const round of sortedrounds) {
                // Skip rounds with no matches
                if (Object.keys(rounds[round]).length === 0) continue;
                
                roundsHtml += this.getroundHtml(round, rounds[round]);
            }

            // Display a message if no matches found
            if (roundsHtml === '') {
                content.innerHTML = '<div class="no-matches">No matches available for this division</div>';
                return;
            }

            // Update the container content
            content.innerHTML = roundsHtml;
        },

        registerToggles() {
            document.querySelectorAll(`.round-toggle`).forEach(el => el.addEventListener(
            'click',
            (event) => {
                let toggle = event.target;
                let matchId = toggle.getAttribute('data-match-id');
                this.toggleRounds(matchId);

                if (event.target.classList.contains('active')) {
                    event.target.innerHTML = "Show match details"
                    event.target.classList.toggle('active');
                } else {
                    event.target.innerHTML = "Hide match details"
                    event.target.classList.toggle('active');
                }
            }))

            document.querySelectorAll(`.player-toggle`).forEach(el => el.addEventListener(
            'click',
            (event) => {
                let toggle = event.target;
                let matchId = toggle.getAttribute('data-match-id');
                let round = toggle.getAttribute('data-round');
                this.togglePlayerDetails(matchId, round);

                if (event.target.classList.contains('active')) {
                    event.target.innerHTML = "Show players details"
                    event.target.classList.toggle('active');
                } else {
                    event.target.innerHTML = "Hide players details"
                    event.target.classList.toggle('active');
                }
            }))
        },
        
        toggleRounds(matchId) {
            const element = document.querySelector(`#match-${matchId} .match-details`);
            if (element) {
                element.classList.toggle('active');
            }
        },
        
        togglePlayerDetails(matchId, round) {
            const element = document.querySelector(`#match-${matchId}-round-${round}`);
            if (element) {
                element.classList.toggle('active');
            }
        },

        getroundHtml(round, matches) {
            let matchesHtml = '';

            for (const matchId in matches) {
                // Skip matches with missing or invalid teams
                const match = matches[matchId];
                if (!match || !match.team1 || !match.team2 || !match.team1.name || !match.team2.name) {
                    continue;
                }
                
                const matchHtml = this.getMatchHtml(match);
                if (matchHtml) {
                    matchesHtml += matchHtml;
                }
            }

            // Skip empty rounds
            if (matchesHtml === '') {
                return '';
            }

            return `
                <h3 class="round-match-header">${round}</h4>
                <div class="round">
                    ${matchesHtml}
                </div>
            `;
        },
        
        getMatchHtml(match) {
            if (!match || !match.id || !match.team1 || !match.team2 || !match.team1.name || !match.team2.name) {
                return '';
            }

            let matchHeader = this.getMatchHeaderHtml(match);
            let matchResult = this.getMatchResultHtml(match);
            let matchDetails = this.getMatchDetailsHtml(match);

            return `
                <div class="match" id="match-${match.id}">
                    ${matchHeader}
                    ${matchResult}
                    ${matchDetails}
                </div>
            `;
        },

        getMatchHeaderHtml(match) {
            // Check if there are any rounds with player details
            let hasPlayerDetails = false;
            
            if (match.rounds) {
                for (const roundId in match.rounds) {
                    const round = match.rounds[roundId];
                    if ((round.team1Players && round.team1Players.length > 0) || 
                        (round.team2Players && round.team2Players.length > 0)) {
                        hasPlayerDetails = true;
                        break;
                    }
                }
            }
            
            return `
                <div class="match-header">
                    <div class="date">Match ${match.id || ''} - ${match.date || ''}</div>
                    
                </div>
            `;
        },

        getMatchResultHtml(match) {
            let winnerTeam = null;
            let team1Score = Number(match.team1Score || 0);
            let team2Score = Number(match.team2Score || 0);

            if (team1Score !== team2Score) {
                winnerTeam = team1Score > team2Score ? 1 : 2;
            }

            let team1Tag = this.getTeamTagHtml(match.team1);
            let team2Tag = this.getTeamTagHtml(match.team2);

            return `
                <div class="match-results">
                    <div class="team-match team1">
                        ${team1Tag}
                    </div>

                    
                    <div class="score-container">
                    
                        <div class="score-toggle-details">
                        </div>
                        <div class="score">
                            <span class="score-team score-team-1 ${winnerTeam === 1 ? "winner" : ""}">${match.team1Score || '0'}</span>
                            <span class="divider">${this.defaultDivider}</span>
                            <span class="score-team score-team-2 ${winnerTeam === 2 ? "winner" : ""}">${match.team2Score || '0'}</span>
                        </div>

                        <div class="score-toggle-details">
                            ${match.rounds && Object.keys(match.rounds).length > 0 ? 
                                `<div class="round-toggle" data-match-id="${match.id}">Show match details</div>` : 
                                `<div class="no-rounds">No details available yet.</div>`
                            }
                        </div>
                    </div>

                    
                    <div class="team-match team2">
                        ${team2Tag}
                    </div>
                </div>
            `;
        },
        
        getTeamTagHtml(team) {
            if (!team || !team.name) {
                return `<div class="team-name">Unknown Team</div>`;
            }
            
            return `
                <img src="images/teams/${team.name.toLowerCase().replace(/ /g, '_')}.png" class="team-logo" alt="${team.name} logo" onerror="this.src='images/teams/default.png';">
                <div class="team-name"><span class="team-tag">${team.tag || team.name.substring(0, 3)}</span> <br/> ${team.name} </div> 
            `;
        },

        getMatchDetailsHtml(match) {
            let roundsHtml = '';

            // Sort rounds by round number
            const roundIds = Object.keys(match.rounds).sort((a, b) => {
                return parseInt(a) - parseInt(b);
            });

            // Generate HTML for each round
            for (const roundId of roundIds) {
                const round = match.rounds[roundId];
                const hasTeam1Players = round.team1Players && round.team1Players.length > 0;
                const hasTeam2Players = round.team2Players && round.team2Players.length > 0;
                
                // Always show round score
                roundsHtml += this.getRoundHtml(match.id, round);
                
                // Only show player details toggle and section if either team has players
                if (hasTeam1Players || hasTeam2Players) {
                    roundsHtml += this.getRoundDetailsHtml(match.id, round);
                }
            }

            return `
                <div class="match-details">
                    ${roundsHtml}
                </div>
            `;
        },
        
        getRoundHtml(matchId, round) {
            if (!round || !round.round) {
                return '';
            }
            
            let winnerTeam = null;
            let team1Score = Number(round.team1Score || 0);
            let team2Score = Number(round.team2Score || 0);

            if (team1Score !== team2Score) {
                winnerTeam = team1Score > team2Score ? 1 : 2;
            }

            const hasTeam1Players = round.team1Players && round.team1Players.length > 0;
            const hasTeam2Players = round.team2Players && round.team2Players.length > 0;
            const hasPlayers = hasTeam1Players || hasTeam2Players;

            return `
                <div class="round">
                    <div class="round-number">Game #${round.round}</div>
                    <div class="score">
                        <span class="score-team score-team-1 ${winnerTeam === 1 ? "winner" : ""}">${round.team1Score || '0'}</span>
                        <span class="divider">${this.defaultDivider}</span>
                        <span class="score-team score-team-2 ${winnerTeam === 2 ? "winner" : ""}">${round.team2Score || '0'}</span>
                    </div>
                    ${hasPlayers ? `<div class="player-toggle" data-match-id="${matchId}" data-round="${round.round}">Show players details</div>` : `<div class="player-toggle" data-match-id="${matchId}" data-round="${round.round}"> </div>`}
                </div>
            `;
        },
        
        getRoundDetailsHtml(matchId, round) {
            if (!round || !round.round) {
                return '';
            }
            
            const hasTeam1Players = round.team1Players && round.team1Players.length > 0;
            const hasTeam2Players = round.team2Players && round.team2Players.length > 0;
            
            // If neither team has players, don't render the details section
            if (!hasTeam1Players && !hasTeam2Players) {
                return '';
            }
            
            let team1PlayersDetailsHtml = hasTeam1Players ? this.getPlayersDetailsHtml(round.team1Players) : '';
            let team2PlayersDetailsHtml = hasTeam2Players ? this.getPlayersDetailsHtml(round.team2Players) : '';

            return `
                <div class="round-details" id="match-${matchId}-round-${round.round}">
                    <div class="team-match team1">
                        ${team1PlayersDetailsHtml}
                    </div>
                    <div class="rounds-details-middle"></div>
                    <div class="team-match team2">
                        ${team2PlayersDetailsHtml}
                    </div>
                </div>
            `;
        },
        
        getPlayersDetailsHtml(players) {
            if (!Array.isArray(players) || players.length === 0) {
                return '';
            }
            
            let playerDetailHtml = '';
        
            // Sort players: Captain first, then by TotalScore (highest to lowest)
            const sortedPlayers = [...players].sort((a, b) => {
                // Captain first
                if (a.captain && !b.captain) return -1;
                if (!a.captain && b.captain) return 1;
                
                // Then by points (TotalScore) in descending order
                return (b.points || 0) - (a.points || 0);
            });
        
            for (const player of sortedPlayers) {
                const playerDetail = this.getPlayerDetailHtml(player);
                if (playerDetail) {
                    playerDetailHtml += playerDetail;
                }
            }
        
            return playerDetailHtml;
        },
        
        getPlayerDetailHtml(player) {
            if (!player || !player.player) {
                return '';
            }
            
            // Get position for icon
            const position = player.position || 'Unknown';
            const positionLower = position.toLowerCase();
            // Create medals HTML as a tooltip that appears on hover
            let medalsHtml = '';
            if (player.medals && player.medals.length > 0) {
                
                //console.log(player.medals)
                const medalsList = player.medals.map(medal => `<li>${medal}</li>`).join('');
                medalsHtml = `
                    <div class="medals-tooltip">
                        <ul>${medalsList}</ul>
                    </div>
                `;
            }
            
            return `
                <div class="player-stats">
                    <div class="score">${player.points || '0'}</div>
                    <div class="player">
                        <img class="position" src="images/sprites/${positionLower}.png" onerror="this.src='images/sprites/unknown.png';">
                        <div class="name ${player.captain ? "captain" : ""} ${player.medals && player.medals.length > 0 ? "has-medals" : ""}">
                            ${player.player}
                            ${medalsHtml}
                        </div>
                    </div>
                </div>            
            `;
        }
    };
 

    // Start loading data
    matchPlugin.mounted();
}

window.runMatchPlugin = runMatchPlugin;

// Add this CSS to match-styles.css if needed
/*
.series-result {
    text-align: center;
    font-weight: bold;
    margin-top: 5px;
}

.no-matches {
    padding: 20px;
    text-align: center;
    font-style: italic;
    color: #888;
    font-size: 1.2em;
}

.player-medals {
    font-size: 0.8em;
    margin-top: 5px;
}

.player-medals ul {
    list-style-type: none;
    padding-left: 0;
    margin: 0;
}

.player-medals li {
    color: #f0ad4e;
    font-style: italic;
    margin-bottom: 2px;
}
*/