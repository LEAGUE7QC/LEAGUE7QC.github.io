
(function(window) {
    'use strict';

    /**
     * Parse CSV text into array of arrays
     */
    function parseCSV(csvText) {
        const lines = csvText.trim().split(/\r?\n/);
        const data = [];
        
        // Skip first row (merged headers), start from row 2 for actual data
        for (let i = 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            if (values.length >= 19 && values[0]) { // Make sure we have enough columns and data
                data.push(values);
            }
        }
        
        return data;
    }

    /**
     * Process match results and calculate standings
     */
    function processMatchResults(matchData, division = null) {
        const standings = {};
        
        matchData.forEach(match => {
            // CSV column structure: [Date, Staff, Division, MatchID, TeamA, TeamB, -, Game1A, Game1B, Game2A, Game2B, Game3A, Game3B, Game4A, Game4B, Game5A, Game5B, -, SeriesA, SeriesB]
            const divisionName = match[2];
            const teamA = match[4]?.trim();
            const teamB = match[5]?.trim();
            
            // Filter by division if specified
            if (division && divisionName !== division) {
                return;
            }
            
            if (!teamA || !teamB) return;
            
            // Initialize teams
            if (!standings[teamA]) {
                standings[teamA] = {
                    name: teamA,
                    matchesPlayed: 0,
                    matchesWon: 0,
                    gamesPlayed: 0,
                    gamesWon: 0,
                    pointsScored: 0,
                    pointsConceded: 0
                };
            }
            
            if (!standings[teamB]) {
                standings[teamB] = {
                    name: teamB,
                    matchesPlayed: 0,
                    matchesWon: 0,
                    gamesPlayed: 0,
                    gamesWon: 0,
                    pointsScored: 0,
                    pointsConceded: 0
                };
            }
            
            // Process individual games
            let teamAGamesWon = 0;
            let teamBGamesWon = 0;
            let teamAPointsScored = 0;
            let teamBPointsScored = 0;
            let gamesPlayed = 0;
            
            // Game score pairs: positions [7,8], [9,10], [11,12], [13,14], [15,16]
            const gameScorePairs = [
                [7, 8],   // Game 1
                [9, 10],  // Game 2
                [11, 12], // Game 3
                [13, 14], // Game 4
                [15, 16]  // Game 5
            ];
            
            gameScorePairs.forEach(([aIndex, bIndex]) => {
                const scoreA = match[aIndex];
                const scoreB = match[bIndex];
                
                if (scoreA && scoreB && scoreA.trim() !== '' && scoreB.trim() !== '') {
                    const numScoreA = parseInt(scoreA);
                    const numScoreB = parseInt(scoreB);
                    
                    if (!isNaN(numScoreA) && !isNaN(numScoreB)) {
                        gamesPlayed++;
                        teamAPointsScored += numScoreA;
                        teamBPointsScored += numScoreB;
                        
                        if (numScoreA > numScoreB) {
                            teamAGamesWon++;
                        } else if (numScoreB > numScoreA) {
                            teamBGamesWon++;
                        }
                    }
                }
            });
            
            // Get series results from positions 18,19
            const seriesWinsA = parseInt(match[18]) || 0;
            const seriesWinsB = parseInt(match[19]) || 0;
            
            // Update team statistics
            standings[teamA].matchesPlayed++;
            standings[teamB].matchesPlayed++;
            
            standings[teamA].gamesPlayed += gamesPlayed;
            standings[teamB].gamesPlayed += gamesPlayed;
            
            standings[teamA].gamesWon += teamAGamesWon;
            standings[teamB].gamesWon += teamBGamesWon;
            
            standings[teamA].pointsScored += teamAPointsScored;
            standings[teamA].pointsConceded += teamBPointsScored;
            standings[teamB].pointsScored += teamBPointsScored;
            standings[teamB].pointsConceded += teamAPointsScored;
            
            // Match wins: 1 if team won more games in this series, 0 otherwise
            if (teamAGamesWon > teamBGamesWon) {
                standings[teamA].matchesWon++;
            } else if (teamBGamesWon > teamAGamesWon) {
                standings[teamB].matchesWon++;
            }
            // Note: ties are possible, in which case neither team gets a match win
        });
        
        return standings;
    }

    /**
     * Helper function to get team logo path
     */
    function getTeamLogoPath(teamName) {
        return `images/teams/${teamName.toLowerCase().replace(/\s+/g, '_')}.png`;
    }

    /**
     * Helper function to create team cell with logo
     */
    function createTeamCell(teamName) {
        const disbandedTeams = [];

        const logoPath = getTeamLogoPath(teamName);
        const isDisbanded = disbandedTeams.includes(teamName);
        const displayName = isDisbanded ? `${teamName} (disbanded)` : teamName;
        const style = isDisbanded ? 'font-style: italic; opacity: 0.2;' : '';

        return `
            <div style="display: flex; align-items: center; gap: 15px;">
                <img src="${logoPath}" alt="${teamName} logo" style="width: 30px; height: auto;" />
                <span style="${style}">${displayName}</span>
            </div>
        `;
    }

    /**
     * Generate head-to-head round robin matrix table
     */
    function generateSingleRoundRobinMatrix(matchData, division = null) {
        // Filter matches by division and collect teams
        const filteredMatches = matchData.filter(match => 
            !division || match[2] === division
        );
        
        const teams = [...new Set(filteredMatches.flatMap(match => [match[4], match[5]]))];
        teams.sort();
        
        // Create head-to-head results matrix
        const matrix = {};
        teams.forEach(team => {
            matrix[team] = {};
            teams.forEach(opponent => {
                matrix[team][opponent] = null;
            });
        });
        
        // Fill matrix with match results
        filteredMatches.forEach(match => {
            const teamA = match[4];
            const teamB = match[5];
            
            // Count games won by each team
            let teamAGamesWon = 0;
            let teamBGamesWon = 0;
            
            const gameScorePairs = [[7, 8], [9, 10], [11, 12], [13, 14], [15, 16]];
            
            gameScorePairs.forEach(([aIndex, bIndex]) => {
                const scoreA = match[aIndex];
                const scoreB = match[bIndex];
                
                if (scoreA && scoreB && scoreA.trim() !== '' && scoreB.trim() !== '') {
                    const numScoreA = parseInt(scoreA);
                    const numScoreB = parseInt(scoreB);
                    
                    if (!isNaN(numScoreA) && !isNaN(numScoreB)) {
                        if (numScoreA > numScoreB) {
                            teamAGamesWon++;
                        } else if (numScoreB > numScoreA) {
                            teamBGamesWon++;
                        }
                    }
                }
            });
            
            // Store results in matrix
            matrix[teamA][teamB] = `${teamAGamesWon}-${teamBGamesWon}`;
            matrix[teamB][teamA] = `${teamBGamesWon}-${teamAGamesWon}`;
        });
        
        // Calculate column width based on number of teams
        const headerColumnWidth = Math.max(200, Math.floor(300 / teams.length * 2));
        const teamColumnWidth = Math.floor((100 - (headerColumnWidth / 7)) / teams.length);
        
        // Generate HTML table
        let html = `
            <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse; margin-top:20px;  margin-bottom:60px;">
                <thead>
                    <tr>
                        <th style="padding: 8px; text-align: left; width: ${headerColumnWidth}px;">Team vs. Team</th>
                        
        `;
        
        // Add team header columns with logos
        teams.forEach(team => {
            const logoPath = getTeamLogoPath(team);
            html += `<th style="padding: 8px;text-align: center; width: ${teamColumnWidth}%;" title="${team}">
                <img src="${logoPath}" alt="${team}" style="width: 30px; height: auto;" />
            </th>`;
        });
        
        html += `
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Add team rows
        teams.forEach(team => {
            const logoPath = getTeamLogoPath(team);
            const disbandedTeams = [ ];
            const isDisbanded = disbandedTeams.includes(team);
            const backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--base-background-color').trim();
            const teamStyle = isDisbanded ? 'font-style: italic; opacity: 0.2;' : '';
            
            html += `
                <tr>
                    <td style="padding: 8px; text-align: left; display: flex; align-items: center; gap: 10px;">
                        <img src="${logoPath}" alt="${team}" style="width: 30px; height: auto;" />
                        <span style="${teamStyle}">${team}${isDisbanded ? ' (disbanded)' : ''}</span>
                    </td>
            `;
            
            teams.forEach(opponent => {
                const result = matrix[team][opponent];
                let backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--base-background-color').trim();
                let textColor = '';
                let cellContent = '';
                let borderColor = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-border-color').trim();
                
                if (team === opponent) {
                    backgroundColor = '';
                    textColor = '';
                    cellContent = '';
                } else if (result) {
                    const [teamScore, opponentScore] = result.split('-').map(Number);
                    if (teamScore > opponentScore) {
                        textColor = '#90EE90'; // Light green for wins
                    } else if (teamScore < opponentScore) {
                        textColor = '#FFB6C1'; // Light red for losses
                    } else {
                        textColor = '#FFFF99'; // Light yellow for ties
                    }
                    cellContent = result;
                } else {
                    textColor = '';
                    cellContent = '';
                }
                
                html += `<td style="padding: 8px;  border: 1px solid ${borderColor}; text-align: center; color: ${textColor};">${cellContent}</td>`;
            });
            
            html += '</tr>';
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        return html;
    }

        /**
     * Generate head-to-head round robin matrix table
     */
    function generateDoubleRoundRobinMatrix(matchData, division = null) {
        // Filter matches by division and collect teams
        const filteredMatches = matchData.filter(match => 
            !division || match[2] === division
        );
        
        const teams = [...new Set(filteredMatches.flatMap(match => [match[4], match[5]]))];
        teams.sort();
        
        // Create head-to-head results matrix - now stores arrays of match results
        const matrix = {};
        teams.forEach(team => {
            matrix[team] = {};
            teams.forEach(opponent => {
                matrix[team][opponent] = [];
            });
        });
        
        // Fill matrix with match results
        filteredMatches.forEach(match => {
            const teamA = match[4];
            const teamB = match[5];
            
            // Count games won by each team
            let teamAGamesWon = 0;
            let teamBGamesWon = 0;
            
            const gameScorePairs = [[7, 8], [9, 10], [11, 12], [13, 14], [15, 16]];
            
            gameScorePairs.forEach(([aIndex, bIndex]) => {
                const scoreA = match[aIndex];
                const scoreB = match[bIndex];
                
                if (scoreA && scoreB && scoreA.trim() !== '' && scoreB.trim() !== '') {
                    const numScoreA = parseInt(scoreA);
                    const numScoreB = parseInt(scoreB);
                    
                    if (!isNaN(numScoreA) && !isNaN(numScoreB)) {
                        if (numScoreA > numScoreB) {
                            teamAGamesWon++;
                        } else if (numScoreB > numScoreA) {
                            teamBGamesWon++;
                        }
                    }
                }
            });
            
            // Store results in matrix as arrays
            matrix[teamA][teamB].push(`${teamAGamesWon}-${teamBGamesWon}`);
            matrix[teamB][teamA].push(`${teamBGamesWon}-${teamAGamesWon}`);
        });
        
        // Calculate column width based on number of teams
        const headerColumnWidth = Math.max(200, Math.floor(300 / teams.length * 2));
        const teamColumnWidth = Math.floor((100 - (headerColumnWidth / 7)) / teams.length);
        
        // Generate HTML table
        let html = `
            <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse; margin-top:20px; margin-bottom:60px;">
                <thead>
                    <tr>
                        <th style="padding: 8px; text-align: left; width: ${headerColumnWidth}px;">Team vs. Team</th>
                        
        `;
        
        // Add team header columns with logos
        teams.forEach(team => {
            const logoPath = getTeamLogoPath(team);
            html += `<th style="padding: 8px; text-align: center; width: ${teamColumnWidth}%;" title="${team}">
                <img src="${logoPath}" alt="${team}" style="width: 30px; height: auto;" />
            </th>`;
        });
        
        html += `
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Add team rows
        teams.forEach(team => {
            const logoPath = getTeamLogoPath(team);
            const disbandedTeams = [];
            const isDisbanded = disbandedTeams.includes(team);
            const backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--base-background-color').trim();
            const teamStyle = isDisbanded ? 'font-style: italic; opacity: 0.2;' : '';
            
            html += `
                <tr>
                    <td style="padding: 8px; text-align: left; display: flex; align-items: center; gap: 10px;">
                        <img src="${logoPath}" alt="${team}" style="width: 30px; height: auto;" />
                        <span style="${teamStyle}">${team}${isDisbanded ? ' (disbanded)' : ''}</span>
                    </td>
            `;
            
            teams.forEach(opponent => {
                const results = matrix[team][opponent];
                let backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--base-background-color').trim();
                let cellContent = '';
                let borderColor = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-border-color').trim();
                
                if (team === opponent) {
                    // Empty cell for team vs itself
                    cellContent = '';
                } else if (results && results.length > 0) {
                    // Display all match results
                    cellContent = '<div style="display: flex; flex-direction: column; gap: 2px; align-items: center;">';
                    
                    results.forEach((result, index) => {
                        const [teamScore, opponentScore] = result.split('-').map(Number);
                        let textColor = '';
                        
                        if (teamScore > opponentScore) {
                            textColor = '#90EE90'; // Light green for wins
                        } else if (teamScore < opponentScore) {
                            textColor = '#FFB6C1'; // Light red for losses
                        } else {
                            textColor = '#FFFF99'; // Light yellow for ties
                        }
                        
                        // Add game number label if there are multiple games
                        cellContent += `<div style="color: ${textColor}; font-size: 0.9em;">${result}</div>`;
                    });
                    
                    cellContent += '</div>';
                } else {
                    cellContent = '';
                }
                
                html += `<td style="padding: 8px; border: 1px solid ${borderColor}; text-align: center;">${cellContent}</td>`;
            });
            
            html += '</tr>';
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        return html;
    }
    /**
     * Generate HTML table from standings
     */
    function generateStandingsTable(standings, tableId) {
        // Convert to array and sort
        const teams = Object.values(standings);
        teams.sort((a, b) => {
            // Primary: Matches Won (descending)
            if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
            
            // Secondary: Games Won (descending) - FIXED
            if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
            
            // Tertiary: Game Win Ratio (descending)
            const aGWR = a.gamesPlayed > 0 ? a.gamesWon / a.gamesPlayed : 0;
            const bGWR = b.gamesPlayed > 0 ? b.gamesWon / b.gamesPlayed : 0;
            if (Math.abs(bGWR - aGWR) > 0.001) return bGWR - aGWR;
            
            // Quaternary: Points difference (descending)
            const aPointsDiff = a.pointsScored - a.pointsConceded;
            const bPointsDiff = b.pointsScored - b.pointsConceded;
            if (bPointsDiff !== aPointsDiff) return bPointsDiff - aPointsDiff;
            
            // Quinary: Total points scored (descending)
            return b.pointsScored - a.pointsScored;
        });

        // Generate table HTML
        let html = `
            <table class="owls-standings-table" id="${tableId}" style="width: 100%;">
                <thead>
                    <tr>
                        <th style="width: 40%;">Team Statistics</th>
                        <th style="text-align: center; width: 10%;" title="Matches Won">MW</th>
                        <th style="text-align: center; width: 10%;" title="Games Won">GW</th>
                        <th style="text-align: center; width: 10%;" title="Game Win Ratio">GWR</th>
                        <th style="text-align: center; width: 10%;" title="Points Scored">PS</th>
                        <th style="text-align: center; width: 10%;" title="Points Conceded">PC</th>
                        <th style="text-align: center; width: 8%;" title="Matches Played">#M</th>
                        <th style="text-align: center; width: 7%;" title="Games Played">#G</th>
                    </tr>
                </thead>
                <tbody>
        `;

        teams.forEach((team, index) => {
            const gwr = team.gamesPlayed > 0 ? ((team.gamesWon / team.gamesPlayed) * 100).toFixed(1) : '0.0';
            
            html += `
                <tr>
                    <td style="vertical-align: middle;">${createTeamCell(team.name)}</td>
                    <td style="text-align: center; vertical-align: middle;">${team.matchesWon}</td>
                    <td style="text-align: center; vertical-align: middle;">${team.gamesWon}</td>
                    <td style="text-align: center; vertical-align: middle;">${gwr}%</td>
                    <td style="text-align: center; vertical-align: middle;">${team.pointsScored}</td>
                    <td style="text-align: center; vertical-align: middle;">${team.pointsConceded}</td>
                    <td style="text-align: center; vertical-align: middle;">${team.matchesPlayed}</td>
                    <td style="text-align: center; vertical-align: middle;">${team.gamesPlayed}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        return html;
    }

    /**
     * Load and process OWLs match results
     */
    function loadOWLSStandings(csvUrl, divisionElementId, division = null) {
        const targetElement = document.getElementById(divisionElementId);
        if (!targetElement) {
            console.error(`Element with ID '${divisionElementId}' not found`);
            return;
        }

        // Show loading state
        targetElement.innerHTML = '<div>Loading standings...</div>';

        fetch(csvUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(csvText => {
                const matchData = parseCSV(csvText);
                console.log(`Parsed ${matchData.length} match records`);
                
                if (matchData.length === 0) {
                    throw new Error('No match data found in CSV');
                }
                
                const standings = processMatchResults(matchData, division);
                console.log(`Generated standings for ${Object.keys(standings).length} teams in ${division || 'all divisions'}`);
                
                if (Object.keys(standings).length === 0) {
                    throw new Error(`No standings data generated for division: ${division}`);
                }
                
                // Generate both tables
                const matrixHtml = generateDoubleRoundRobinMatrix(matchData, division);
                const standingsHtml = generateStandingsTable(standings, divisionElementId + '-table');
                
                targetElement.innerHTML =  standingsHtml + matrixHtml;
                
                console.log(`Successfully loaded standings for ${divisionElementId}`);
            })
            .catch(error => {
                console.error('Error loading OWLs standings:', error);
                targetElement.innerHTML = `
                    <div style="color: red; padding: 20px; text-align: center;">
                        <strong>Error loading standings:</strong><br>
                        ${error.message}
                    </div>
                `;
            });
    }

    // Make functions available globally
    window.loadOWLSStandings = loadOWLSStandings;

})(window);
