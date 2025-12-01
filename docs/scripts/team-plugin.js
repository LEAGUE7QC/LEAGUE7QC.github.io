function runteamPlugin(season = 1) {
  // Common player source for both seasons
  const PLAYER_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRXtOx3h3Q0fMBHo86O0OAdS8QFcPdM1zGh4nBcGvLav4AeKHYGW7y6nczN4ZjMzxbtZrMaPgrc5thr/pub?gid=1071930535&single=true&output=csv';
  // Season Roster Sources
  const SEASON1_ROSTER_JSON = 'datatables/s01-team-rosters.json'
  const SEASON2_ROSTER_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQOmRiv9Z_hNUYX8EG0nHtYTTCtDjBKt3q4lywJO1lC_8M-KbpmMOpf--naPkRwoBI4BZCU_ri2XTTR/pub?gid=1700745241&single=true&output=csv';
  const SEASON3_ROSTER_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSE9zzuZk-G-NTbxyXn9EkrMyUVoDexXP2Hu3vpuMsQPrLhxF_MxqSw-oNhC2BMs__dINFP3RR6f4sF/pub?gid=495267531&single=true&output=csv'
  const SEASON4_ROSTER_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR2SSP7gOsKULExVn4qWhJg_IemlecB08bjJG9wGmvzZNJ3Ww2IjEZZo_qoSQsTZMixjOcm0ba3m_ZH/pub?gid=495267531&single=true&output=csv'
  const teamPlugin = {
    name: 'team-plugin',
    data: { rosters: null, players: null, season: season },

    mounted() { this.fetchAllData();  },
    
    async fetchAllData() {
      try {
        // Common player source for both seasons
        const playersSource = PLAYER_CSV_URL;
        
        // Season-specific roster source
        let rostersSource;
        
        if (this.data.season === 1) {
          // Season 1: local JSON file
          const rostersResponse = await fetch(SEASON1_ROSTER_JSON);
          this.data.rosters = await rostersResponse.json();
          
        } else if (this.data.season === 2) {
          // Season 2: Use Google Sheets CSV
          rostersSource = SEASON2_ROSTER_CSV_URL;
          const rostersResponse = await fetch(rostersSource);
          const rostersText = await rostersResponse.text();
          this.data.rosters = this.parseRostersCSV(rostersText);
        } else if (this.data.season === 3) {
          // Season 3: Use Google Sheets CSV
          rostersSource = SEASON3_ROSTER_CSV_URL;
          const rostersResponse = await fetch(rostersSource);
          const rostersText = await rostersResponse.text();
          this.data.rosters = this.parseRostersCSV(rostersText);
        } else {
          // Season 4: Use Google Sheets CSV
          rostersSource = SEASON4_ROSTER_CSV_URL;
          const rostersResponse = await fetch(rostersSource);
          const rostersText = await rostersResponse.text();
          this.data.rosters = this.parseRostersCSV(rostersText);
        }
        
        // Fetch players data from CSV
        const playersResponse = await fetch(playersSource);
        const playersText = await playersResponse.text();
        this.data.players = this.parsePlayersCSV(playersText);
    
        // Ensure all expected properties exist
        this.data.rosters.teams = this.data.rosters.teams || [];
        this.data.players.players = this.data.players.players || [];
    
        this.renderTeams();
      } catch (error) {
        console.warn('Error fetching data:', error);
        this.renderTeams();
      }
    },
    
    parseRostersCSV(csvText) {
      if (!csvText) return { teams: [] };
      
      const lines = csvText.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Headers: TeamName,TeamTag,PrimaryColor,SecondaryColor,PlayerCaptain,Player2,Player3,Player4,Player5,Player6,Player7,Player8,Player9,Player10
      
      const teams = [];
      
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
            values[2] ? values[2].trim() : '#CCCCCC',  // Primary color
            values[3] ? values[3].trim() : '#FFFFFF'   // Secondary color
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
        
        teams.push(team);
      }
      
      return { teams };
    },
    
    parsePlayersCSV(csvText) {
      if (!csvText) return { players: [] };
      
      const lines = csvText.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Expected headers: Discord,IGN,PrimaryRole,SecondaryRole,Region,Platform,Input,House,X,Twitch,YouTube,Tiktok
      
      const players = [];
      
      // Starting from line 1 (after headers)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = this.parseCSVLine(line);
        
        // Map to the expected structure
        const player = {
          name: values[1] ? values[1].trim() : '',         // IGN
          position: values[2] ? values[2].trim() : '',     // PrimaryRole
          secondaryPosition: values[3] ? values[3].trim() : '', // SecondaryRole
          region: values[4] ? values[4].trim() : '',       // Region
          platform: values[5] ? values[5].trim() : '',     // Platform
          input: values[6] ? values[6].trim() : '',        // Input
          hogwartsHouse: values[7] ? values[7].trim() : '', // House
          discord: values[0] ? values[0].trim() : '',      // Discord
          twitter: values[8] ? values[8].trim() : '',      // X
          twitch: values[9] ? values[9].trim() : '',       // Twitch
          youtube: values[10] ? values[10].trim() : '',    // YouTube
          tiktok: values[11] ? values[11].trim() : ''      // Tiktok
        };
        
        // Only add if player has a name
        if (player.name) {
          players.push(player);
        }
      }
      
      return { players };
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
      
      values.push(currentValue); // Add the last value
      return values;
    },

    sortPlayersByRole(players) {
      // Define role priority order
      const rolePriority = {
        'Seeker': 1,
        'Keeper': 2,
        'Beater': 3,
        'Chaser': 4
      };

      // Sort players by their primary role
      return players.sort((a, b) => {
        const playerDataA = this.data.players.players.find(p => p.name === a);
        const playerDataB = this.data.players.players.find(p => p.name === b);
        
        // Handle cases where player data is not found
        const roleA = playerDataA ? playerDataA.position : 'Other';
        const roleB = playerDataB ? playerDataB.position : 'Other';
        
        // Get priority for each role (default to 5 for unknown roles)
        const priorityA = rolePriority[roleA] || 5;
        const priorityB = rolePriority[roleB] || 5;
        
        // Sort by priority (lower number = higher priority)
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        // If same role, sort alphabetically by name
        return a.localeCompare(b);
      });
    },

    getInitialRoster(players) {
      // Group players by their positions
      const playersByPosition = {
        Seeker: [],
        Keeper: [],
        Beater: [],
        Chaser: [],
        Other: []
      };

      // Get player data and group by position
      players.forEach(name => {
        const playerData = this.data.players.players.find(p => p.name === name);
        const position = playerData ? playerData.position : 'Other';
        if (playersByPosition.hasOwnProperty(position)) {
          playersByPosition[position].push(name);
        } else {
          playersByPosition.Other.push(name);
        }
      });

      // Initialize arrays for initial display and remaining players
      const initialDisplay = [];
      const remaining = [];

      // First, add one of each required position in the specified order
      const requiredPositions = ['Seeker', 'Keeper', 'Beater'];
      requiredPositions.forEach(position => {
        if (playersByPosition[position].length > 0) {
          initialDisplay.push(playersByPosition[position][0]);
          playersByPosition[position].shift(); // Remove the used player
        }
      });

      // Add up to 3 Chasers
      const chaserCount = Math.min(3, playersByPosition.Chaser.length);
      for (let i = 0; i < chaserCount; i++) {
        initialDisplay.push(playersByPosition.Chaser[0]);
        playersByPosition.Chaser.shift();
      }

      // If we have less than 6 players in initial display, fill with remaining players
      const remainingPlayers = [
        ...playersByPosition.Seeker,
        ...playersByPosition.Keeper,
        ...playersByPosition.Beater,
        ...playersByPosition.Chaser,
        ...playersByPosition.Other
      ];

      while (initialDisplay.length < 6 && remainingPlayers.length > 0) {
        initialDisplay.push(remainingPlayers[0]);
        remainingPlayers.shift();
      }

      // Any players not used in initial display go to remaining
      remaining.push(...remainingPlayers);

      return {
        initial: initialDisplay,
        remaining: remaining
      };
    },

    renderTeams() {
      const seasonId = this.data.season;
      const displayId = `s0${seasonId}-team-rosters`;
      const content = document.querySelector(`#${displayId}`);
      if (!content) {
        console.error(`Could not find #${displayId} element`);
        return;
      }
      content.innerHTML = '';

      // Remove the expand/collapse button container entirely
      // const buttonContainer = document.createElement('div');
      // ... button code removed

      const teamsContainer = document.createElement('div');
      teamsContainer.className = 'teams-container';
      content.appendChild(teamsContainer);
      
      const sortedTeams = this.data.rosters.teams.sort((a, b) => a.name.localeCompare(b.name));
      
      sortedTeams.forEach(team => {
        const teamElement = document.createElement('div');
        teamElement.className = 'team';
        teamElement.id = `team-s${seasonId}-${team.name.toLowerCase().replace(/ /g, '-')}`;

        const gradientColors = team.colors.join(', ');

        teamElement.innerHTML = `
          <div class="team-border" style="background: repeating-linear-gradient(45deg,${team.colors[0]}, 
                                                                                    ${team.colors[0]} 20px, 
                                                                                    ${team.colors[1]} 20px, 
                                                                                    ${team.colors[1]} 40px );"> </div>
          <div class="team-header">
                <img src="images/teams/${team.name.toLowerCase().replace(/ /g, '_')}.png" 
                      class="team-logo" 
                      onerror="this.src='images/teams/missing_logo.png';" 
                      alt="${team.name} logo">
          </div>
          <div class="team-colors">
            ${team.colors.map(color => `<div class="color-swatch" style="background-color: ${color};"></div>`).join('')}
          </div>
          <div class="team-border">${team.tag} - ${team.name}</div>
        `;

        // Show ALL players in a single list, ordered by role
        const allPlayerList = document.createElement('ul');
        allPlayerList.className = 'player-list';
        
        // Sort players by role priority
        const sortedPlayers = this.sortPlayersByRole(team.players);
        
        // Display all players from the team in sorted order
        sortedPlayers.forEach(playerName => {
          const playerElement = this.renderPlayer(playerName, team.captain);
          allPlayerList.innerHTML += playerElement;
        });
        
        teamElement.appendChild(allPlayerList);
        
        // Remove all the toggle button and hidden roster logic
        // No more "see full roster" button or hidden lists
        
        teamsContainer.appendChild(teamElement);
      });
      
      this.addPlayerProfileListeners();
    },

    renderPlayer(playerName, captainName) {
      const playerData = this.data.players.players.find(p => p.name === playerName);
      if (!playerData) {
        return `
          <li class="player unavailable">
            <div class="player-info">
              <img src="images/sprites/missingrole.png" class="position-sprite" alt="Missing Role">
              <span class="player-name">${playerName}</span> 
              <span class="player-unavailable">player unavailable</span>
            </div>
            <div class="player-profile">
            </div>
          </li>
        `;
      }
  
      const isCaptain = playerName === captainName;
      const captainClass = isCaptain ? 'captain' : '';
      const socialIcons = this.renderSocialIcons(playerData);

      return `
        <li class="player ${captainClass}">
          <div class="player-info">
            <img src="images/sprites/${playerData.position.toLowerCase()}.png" class="position-sprite">
            <img src="images/sprites/${(playerData.secondaryPosition.toLowerCase() || 'flex')}.png" class="position-sprite">
            <span class="player-name ${isCaptain ? 'captain-name' : ''}">${playerData.name}${isCaptain ? ' (C)' : ''}</span>
              <img src="images/sprites/${playerData.region.toLowerCase()}.png" class="region-sprite">
            <div class="social-icons">${socialIcons}</div>
          </div>
        </li>
      `;
    },
          
    renderSocialIcons(playerData) {
      const socialPlatforms = {
        discord: playerData.discord,
        twitch: playerData.twitch,
        youtube: playerData.youtube,
        x: playerData.twitter,
        tiktok: playerData.tiktok
      };

      return Object.entries(socialPlatforms)
        .filter(([_, username]) => username)
        .map(([platform, username]) => {
          if (platform === 'discord') {
            return `<span class="social-icon-container" title="@${username}">
                      <img src="images/sprites/${platform}.png" class="social-icon social-icon-link">
                    </span>`;
          } else {
            return `<a href="${this.getSocialLink(platform, username)}" target="_blank" class="social-icon-link">
                      <img src="images/sprites/${platform}.png" class="social-icon">
                    </a>`;
          }
        }).join('');
    },

    getSocialLink(platform, username) {
      const links = {
        discord: `${username}`,
        twitch: `https://www.twitch.tv/${username}`,
        youtube: username.startsWith('@') ? `https://www.youtube.com/${username}` : `https://www.youtube.com/@${username}`,
        x: `https://x.com/${username}`,
        tiktok: `https://tiktok.com/@${username}`
      };
      return links[platform] || '#';
    },

    addPlayerProfileListeners() {
      const players = document.querySelectorAll('.player:not(.unavailable)');
      players.forEach(player => {
        const playerInfo = player.querySelector('.player-name');
        const profile = player.querySelector('.disabled-player-profile');
        
        playerInfo.addEventListener('mousemove', (event) => {
          profile.style.display = 'flex';
          profile.style.position = 'fixed';
          profile.style.left = `${event.clientX + 10}px`;
          profile.style.top = `${event.clientY + 10}px`;
          
          const rect = profile.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          if (rect.right > viewportWidth) {
            profile.style.left = `${event.clientX - rect.width - 10}px`;
          }
          if (rect.bottom > viewportHeight) {
            profile.style.top = `${event.clientY - rect.height - 10}px`;
          }
        });
    
        playerInfo.addEventListener('mouseleave', () => {
          profile.style.display = 'none';
        });
      });
    },

    toggleRoster(rosterList, rosterButton) {
      if (rosterList.classList.contains('hidden')) {
        rosterList.classList.remove('hidden');
        rosterButton.textContent = 'hide full roster';
      } else {
        rosterList.classList.add('hidden');
        rosterButton.textContent = 'see full roster';
      }
    },

    toggleAllRosters(seasonId) {
      const expandAllButton = document.getElementById(`expand-all-button-s${seasonId}`);
      const fullRosterButtons = document.querySelectorAll('.see-full-roster');
      const fullRosterLists = document.querySelectorAll('.full-roster');
      
      const isExpanded = expandAllButton.textContent === 'COLLAPSE ALL';
      
      fullRosterLists.forEach((list, index) => {
        this.toggleRoster(list, fullRosterButtons[index]);
      });

      expandAllButton.textContent = isExpanded ? 'EXPAND ALL ROSTERS' : 'COLLAPSE ALL';
    }
  };

  teamPlugin.mounted();
  return teamPlugin;
}

// Helper function to run for selected season
function initializeTeamRoster(seasonNumber) {
  return runteamPlugin(seasonNumber);
}

// Export functions
window.runteamPlugin = runteamPlugin;
window.initializeTeamRoster = initializeTeamRoster;

// Automatically initialize if the elements exist
document.addEventListener('DOMContentLoaded', function() {
  // Check and initialize Season 1 roster
  if (document.getElementById('s01-team-rosters')) {
    window.s1TeamPlugin = initializeTeamRoster(1);
  }
  // Check and initialize Season 2 roster
  if (document.getElementById('s02-team-rosters')) {
    window.s2TeamPlugin = initializeTeamRoster(2);
  }
  // Check and initialize Season 3 roster
  if (document.getElementById('s03-team-rosters')) {
    window.s3TeamPlugin = initializeTeamRoster(3);
  }
  // Check and initialize Season 4 roster
  if (document.getElementById('s04-team-rosters')) {
    window.s4TeamPlugin = initializeTeamRoster(4);
  }
});