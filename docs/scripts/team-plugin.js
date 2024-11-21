function runteamPlugin() {
  const teamPlugin = {
    name: 'team-plugin',
    data: {
      rosters: null,
      players: null
    },
    mounted() { 
      this.fetchAllData(); 
    },
    
    async fetchAllData() {
      try {
        const [rostersResponse, playersResponse] = await Promise.all([
          fetch('datatables/team-rosters.json').catch(() => ({ json: () => ({ teams: [] }) })),
          fetch('datatables/players.json').catch(() => ({ json: () => ({ players: [] }) }))
        ]);
    
        this.data.rosters = await rostersResponse.json();
        this.data.players = await playersResponse.json();
    
        // Ensure all expected properties exist
        this.data.rosters.teams = this.data.rosters.teams || [];
        this.data.players.players = this.data.players.players || [];
    
        this.renderTeams();
      } catch (error) {
        console.warn('Error fetching data:', error);
        this.renderTeams();
      }
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
      const content = document.querySelector('#team-display');
      if (!content) {
        console.error('Could not find #team-display element');
        return;
      }
      content.innerHTML = '';
    
      const buttonContainer = document.createElement('div');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.justifyContent = 'center';
      buttonContainer.style.marginBottom = '20px';
    
      const expandAllButton = document.createElement('button');
      expandAllButton.id = 'expand-all-button';
      expandAllButton.textContent = 'EXPAND ALL ROSTERS';
      expandAllButton.addEventListener('click', () => this.toggleAllRosters());
      
      buttonContainer.appendChild(expandAllButton);
      content.appendChild(buttonContainer);
    
      const teamsContainer = document.createElement('div');
      teamsContainer.className = 'teams-container';
      content.appendChild(teamsContainer);
      
      const sortedTeams = this.data.rosters.teams.sort((a, b) => a.name.localeCompare(b.name));
      
      sortedTeams.forEach(team => {
        const teamElement = document.createElement('div');
        teamElement.className = 'team';
        teamElement.id = `team-${team.name.toLowerCase().replace(/ /g, '-')}`;
    
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
    
        const roster = this.getInitialRoster(team.players);

        const initialPlayerList = document.createElement('ul');
        initialPlayerList.className = 'player-list';
        roster.initial.forEach(playerName => {
          const playerElement = this.renderPlayer(playerName, team.captain);
          initialPlayerList.innerHTML += playerElement;
        });
        teamElement.appendChild(initialPlayerList);
        
        if (roster.remaining.length > 0) {
          const fullRosterButton = document.createElement('button');
          fullRosterButton.className = 'see-full-roster';
          fullRosterButton.textContent = 'see full roster';
          teamElement.appendChild(fullRosterButton);
          
          const fullRosterList = document.createElement('ul');
          fullRosterList.className = 'full-roster hidden';
          roster.remaining.forEach(playerName => {
            const playerElement = this.renderPlayer(playerName, team.captain);
            fullRosterList.innerHTML += playerElement;
          });
          teamElement.appendChild(fullRosterList);
          
          fullRosterButton.addEventListener('click', () => {
            this.toggleRoster(fullRosterList, fullRosterButton);
          });
        }
        
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

      const backgroundStyle = `background-image: url('images/players/placeholder_portrait.png'); background-size: cover; background-position: center;`;

      return `
        <li class="player ${captainClass}">
          <div class="player-info">
            <img src="images/sprites/${playerData.position.toLowerCase()}.png" class="position-sprite">
            <span class="player-name">${playerData.name}${isCaptain ? ' (Captain)' : ''}</span>
            <div class="social-icons">${socialIcons}</div>
          </div>
          <div class="disabled-player-profile" style="${backgroundStyle}">
            <div class="profile-overlay"></div>
            <div class="profile-content">
              <div class="player-attributes">
                <div class="attribute">
                  <img src="images/sprites/${playerData.position.toLowerCase()}.png" class="attribute-icon" title="Position: ${playerData.position}">
                  ${playerData.secondaryPosition ? 
                    `<img src="images/sprites/${playerData.secondaryPosition.toLowerCase()}.png" class="attribute-icon" title="Secondary Position: ${playerData.secondaryPosition}">` 
                    : ''}
                </div>
                <div class="attribute">
                  <img src="images/sprites/region_${playerData.region.toLowerCase()}.png" class="attribute-icon" title="Region: ${playerData.region}">
                  <img src="images/sprites/${playerData.platform.toLowerCase()}.png" class="attribute-icon" title="Platform: ${playerData.platform}">
                </div>
                <div class="attribute">
                  <img src="images/sprites/${playerData.input.toLowerCase().replace(/ /g, '_')}.png" class="attribute-icon" title="Input: ${playerData.input}">
                  <img src="images/sprites/${playerData.hogwartsHouse.toLowerCase()}.png" class="attribute-icon" title="House: ${playerData.hogwartsHouse}">
                </div>
              </div>
            </div>
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
        const profile = player.querySelector('.player-profile');
        
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

    toggleAllRosters() {
      const expandAllButton = document.getElementById('expand-all-button');
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
}

window.runteamPlugin = runteamPlugin;