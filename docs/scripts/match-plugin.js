function runMatchPlugin() {
    const matchPlugin = {
        raw: {},
        teams: {},
        matches: {},
        defaultDivider: "-",
        
        // Season configuration - easily extensible for future seasons
        seasonConfig: {
            1: {
                divisions: ['newts'],
                sources: {
                    teams: { type: 'json', url: 'datatables/s01-team-rosters.json' },
                    matches: { type: 'csv', url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTNSR5EOLa0z72ue8LTYkT6gWuzBAM8HuD91pd7CyDeLBpAgeORsrO2ZJYu1yH8SP612Srn8X_ruM3G/pub?gid=1105953179&single=true&output=csv" },
                    playerResults: { type: 'csv', url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTNSR5EOLa0z72ue8LTYkT6gWuzBAM8HuD91pd7CyDeLBpAgeORsrO2ZJYu1yH8SP612Srn8X_ruM3G/pub?gid=561594826&single=true&output=csv" }
                }
            },
            2: {
                divisions: ['promotion', 'championship'],
                sources: {
                    teams: { type: 'csv', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQOmRiv9Z_hNUYX8EG0nHtYTTCtDjBKt3q4lywJO1lC_8M-KbpmMOpf--naPkRwoBI4BZCU_ri2XTTR/pub?gid=1700745241&single=true&output=csv' },
                    matches: { type: 'csv', url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS00SbAZBCRRS72CJ9t9u5hfwP4AFGPdxuo-bQwBvxgN5nvwjCOTs4G6vFPsW7UEBv_rArkT21To5Xh/pub?gid=2059611897&single=true&output=csv" },
                    playerResults: { type: 'csv', url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS00SbAZBCRRS72CJ9t9u5hfwP4AFGPdxuo-bQwBvxgN5nvwjCOTs4G6vFPsW7UEBv_rArkT21To5Xh/pub?gid=814014886&single=true&output=csv" }
                }
            }
            // Future seasons can be added here like:
            // 3: {
            //     divisions: ['championship', 'premier'],
            //     sources: {
            //         teams: { type: 'csv', url: 'season3_teams_url' },
            //         matches: { type: 'csv', url: 'season3_matches_url' },
            //         playerResults: { type: 'csv', url: 'season3_playerResults_url' }
            //     }
            // }
        },

        mounted() {
            this.fetchAllData();
        },

        async fetchAllData() {
            try {
                // Load teams from all seasons
                await this.loadAllTeams();

                // Load matches from all seasons
                await this.loadAllMatches();

                // Process the matches
                this.parseMatches();

                // Render the matches
                this.renderMatches();
            } catch (error) {
                //console.warn('Error fetching data:', error);
            }
        },

        async loadAllTeams() {
            const teamPromises = [];
            
            // Load teams from each season
            for (const [season, config] of Object.entries(this.seasonConfig)) {
                if (config.sources.teams) {
                    teamPromises.push(this.loadTeamsForSeason(season, config.sources.teams));
                }
            }
            
            await Promise.all(teamPromises);
        },

        async loadTeamsForSeason(season, teamSource) {
            try {
                if (teamSource.type === 'json') {
                    const response = await fetch(teamSource.url);
                    const data = await response.json();
                    this.parseTeamsJSON(data.teams || []);
                } else if (teamSource.type === 'csv') {
                    const response = await fetch(teamSource.url);
                    const csvText = await response.text();
                    this.parseTeamsCSV(csvText);
                }
            } catch (error) {
                //console.warn(`Error loading teams for season ${season}:`, error);
            }
        },

        async loadAllMatches() {
            const matchPromises = [];
            
            // Load matches from each season
            for (const [season, config] of Object.entries(this.seasonConfig)) {
                if (config.sources.matches) {
                    const dataKey = `matches_s${season.padStart(2, '0')}`;
                    matchPromises.push(this.loadCSV(config.sources.matches.url, dataKey));
                }
            }
            
            await Promise.all(matchPromises);
        },

        loadCSV(url, dataName) {
            return new Promise((resolve, reject) => {
                Papa.parse(url, {
                    download: true,
                    header: false,
                    skipEmptyLines: true,
                    complete: function(results) {
                        matchPlugin.raw[dataName] = results.data;
                        resolve(results.data);
                    },
                    error: function(error) {
                        reject(error);
                    }
                });
            });
        },

        parseTeamsJSON(teams) {
            for (const team of teams) {
                if (team && team.tag) {
                    this.teams[team.tag] = team;
                }
            }
        },

        parseTeamsCSV(csvText) {
            if (!csvText) return;
            
            const lines = csvText.split('\n');
            if (lines.length < 2) return;
            
            // Starting from line 1 (after headers)
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const values = this.parseCSVLine(line);
                
                // Create a new team
                const team = {
                    name: values[0] ? values[0].trim() : '',
                    tag: values[1] ? values[1].trim() : '',
                    colors: [
                        values[2] ? values[2].trim() : '#CCCCCC',
                        values[3] ? values[3].trim() : '#FFFFFF'
                    ],
                    captain: values[4] ? values[4].trim() : '',
                    players: []
                };
                
                // Add captain as first player
                if (team.captain) {
                    team.players.push(team.captain);
                }
                
                // Add remaining players (Player2 through Player10)
                for (let j = 5; j < 14; j++) {
                    if (values[j] && values[j].trim()) {
                        team.players.push(values[j].trim());
                    }
                }
                
                // Add to teams object using tag as key
                if (team.tag) {
                    this.teams[team.tag] = team;
                }
            }
        },

        parseCSVLine(line) {
            const values = [];
            let inQuotes = false;
            let currentValue = '';
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(currentValue);
                    currentValue = '';
                } else {
                    currentValue += char;
                }
            }
            
            values.push(currentValue);
            return values;
        },

        // Process match data from all seasons
        parseMatches() {
            // Initialize match collections for all divisions from all seasons
            const allMatches = {};
            
            // Initialize containers for all known divisions
            for (const config of Object.values(this.seasonConfig)) {
                for (const division of config.divisions) {
                    allMatches[division] = {};
                }
            }
            
            // Process matches from each season
            for (const [season, config] of Object.entries(this.seasonConfig)) {
                const dataKey = `matches_s${season.padStart(2, '0')}`;
                if (this.raw[dataKey]) {
                    this.parseSeasonMatches(this.raw[dataKey], config.divisions, allMatches);
                }
            }
            
            this.matches = allMatches;
        },

        parseSeasonMatches(matchesData, seasonDivisions, allMatches) {
            if (!matchesData || matchesData.length < 2) {
                return;
            }
            
            // Process data rows starting from index 1 (skipping header)
            for (let i = 1; i < matchesData.length; i++) {
                const row = matchesData[i];
                
                if (!row || row.length === 0) continue;
                
                const matchDate = row[0] || '';
                const divisionText = (row[1] || '').toLowerCase();
                const round = row[2] || '1';
                const matchId = row[3] || `match_${i}`;
                const teamA = row[4] || '';
                const teamB = row[5] || '';
                
                const week = round;
                
                // Determine division based on season's available divisions
                let division = '';
                for (const div of seasonDivisions) {
                    if (divisionText.includes(div.toLowerCase()) || divisionText.includes(div.substring(0, 4))) {
                        division = div;
                        break;
                    }
                }
                
                if (!division) continue;
                
                // Find team objects
                const team1Obj = this.findTeamByName(teamA);
                const team2Obj = this.findTeamByName(teamB);
                
                if (!team1Obj || !team2Obj || !team1Obj.name || !team2Obj.name) {
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
                    team1Score: 0,
                    team2Score: 0,
                    rounds: {}
                };
                
                // Process games 1-5
                for (let gameIndex = 1; gameIndex <= 5; gameIndex++) {
                    const teamAScoreIndex = 7 + (gameIndex - 1) * 2;
                    const teamBScoreIndex = 8 + (gameIndex - 1) * 2;
                    
                    if (!row[teamAScoreIndex] || !row[teamBScoreIndex] || 
                        row[teamAScoreIndex].trim() === '' || row[teamBScoreIndex].trim() === '') {
                        continue;
                    }
                    
                    const team1Score = parseInt(row[teamAScoreIndex] || 0);
                    const team2Score = parseInt(row[teamBScoreIndex] || 0);
                    
                    matchObj.rounds[gameIndex] = {
                        round: gameIndex,
                        team1Score: team1Score,
                        team2Score: team2Score,
                        team1Players: [],
                        team2Players: []
                    };
                    
                    if (team1Score > team2Score) {
                        matchObj.team1Score += 1;
                    } else if (team2Score > team1Score) {
                        matchObj.team2Score += 1;
                    }
                }
                
                // Process series result
                if (row.length >= 20) {
                    const seriesA = parseInt(row[18] || 0);
                    const seriesB = parseInt(row[19] || 0);
                    matchObj.seriesResult = `${seriesA}-${seriesB}`;
                }
                
                // Add match to appropriate division
                if (!allMatches[division][week]) allMatches[division][week] = {};
                allMatches[division][week][matchId] = matchObj;
            }
        },

        findTeamByName(teamName) {
            if (!teamName) return null;
            
            if (this.teams[teamName]) {
                return this.teams[teamName];
            }
            
            for (const tag in this.teams) {
                if (this.teams[tag].name === teamName) {
                    return this.teams[tag];
                }
            }
            
            return null;
        },

        renderMatches() {
            // Render for all divisions from all seasons
            for (const config of Object.values(this.seasonConfig)) {
                for (const division of config.divisions) {
                    this.renderDivision(division, this.matches[division] || {});
                }
            }
            
            this.registerToggles();
        },

        renderDivision(division, rounds) {
            if (!division || !rounds) {
                return;
            }

            const divisionStr = String(division);
            const content = document.querySelector(`#${divisionStr}-season-matches`);
            if (!content) {
                return;
            }

            let roundsHtml = '';
            const sortedrounds = Object.keys(rounds).sort((a, b) => {
                return parseInt(a) - parseInt(b);
            });

            for (const round of sortedrounds) {
                if (Object.keys(rounds[round]).length === 0) continue;
                roundsHtml += this.getroundHtml(round, rounds[round]);
            }

            if (roundsHtml === '') {
                content.innerHTML = '<div class="no-matches">No match data to show</div>';
                return;
            }

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
        },
        
        toggleRounds(matchId) {
            const element = document.querySelector(`#match-${matchId} .match-details`);
            if (element) {
                element.classList.toggle('active');
            }
        },

        getroundHtml(round, matches) {
            let matchesHtml = '';

            for (const matchId in matches) {
                const match = matches[matchId];
                if (!match || !match.team1 || !match.team2 || !match.team1.name || !match.team2.name) {
                    continue;
                }
                
                const matchHtml = this.getMatchHtml(match);
                if (matchHtml) {
                    matchesHtml += matchHtml;
                }
            }

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

            const roundIds = Object.keys(match.rounds).sort((a, b) => {
                return parseInt(a) - parseInt(b);
            });

            for (const roundId of roundIds) {
                const round = match.rounds[roundId];
                roundsHtml += this.getRoundHtml(match.id, round);
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

            return `
                <div class="round">
                    <div class="round-number">Game #${round.round}</div>
                    <div class="score">
                        <span class="score-team score-team-1 ${winnerTeam === 1 ? "winner" : ""}">${round.team1Score || '0'}</span>
                        <span class="divider">${this.defaultDivider}</span>
                        <span class="score-team score-team-2 ${winnerTeam === 2 ? "winner" : ""}">${round.team2Score || '0'}</span>
                    </div>
                </div>
            `;
        }
    };

    matchPlugin.mounted();
}

window.runMatchPlugin = runMatchPlugin;