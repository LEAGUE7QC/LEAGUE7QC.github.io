function runteamPlugin() {
  const teamPlugin = {
    name: 'team-plugin',
    data: {
      rosters: null,
      players: null
    },
    mounted() { this.fetchAllData(); },
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

    getRolePriority(role) {
      const priorities = {
        'Seeker': 1,
        'Keeper': 2,
        'Beater': 3,
        'Chaser': 4
      };
      return priorities[role] || 999; // Default high priority for unknown roles
    },
    
    sortPlayersByRole(playerNames) {
      const players = playerNames.map(name => {
        const playerData = this.data.players.players.find(p => p.name === name);
        return {
          name,
          position: playerData ? playerData.position : 'Unknown',
          priority: playerData ? this.getRolePriority(playerData.position) : 999
        };
      });
    
      let chaserCount = 0;
      return players.sort((a, b) => {
        // If both are chasers, maintain their original order
        if (a.position === 'Chaser' && b.position === 'Chaser') {
          if (chaserCount < 3) {
            chaserCount++;
            return -1;
          }
          return 1;
        }
        // Sort by role priority
        return a.priority - b.priority;
      }).map(player => player.name);
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
      
      const initialPlayerCount = 6;
      
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
          <div class="team-border">${team.name}</div>
        `;
    
        // Sort players alphabetically
        const sortedPlayers = [...team.players].sort((a, b) => a.localeCompare(b));
    
        const initialPlayerList = document.createElement('ul');
        initialPlayerList.className = 'player-list';
        sortedPlayers.slice(0, initialPlayerCount).forEach(playerName => {
          const playerElement = this.renderPlayer(playerName, team.captain);
          initialPlayerList.innerHTML += playerElement;
        });
        teamElement.appendChild(initialPlayerList);
        
        if (sortedPlayers.length > initialPlayerCount) {
            const fullRosterButton = document.createElement('button');
            fullRosterButton.className = 'see-full-roster';
            fullRosterButton.textContent = 'see full roster';
            teamElement.appendChild(fullRosterButton);
            
            const fullRosterList = document.createElement('ul');
            fullRosterList.className = 'full-roster hidden';
            sortedPlayers.slice(initialPlayerCount).forEach(playerName => {
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

      // Get background image from qcPicture if available
      //const backgroundStyle = playerData.qcPicture ? 
      //  `background-image: url('${playerData.qcPicture}'); background-size: cover; background-position: center;` : '';

      const backgroundStyle = `background-image: url('images/players/placeholder_portrait.png'); background-size: cover; background-position: center;`;

      return `
        <li class="player ${captainClass}">
          <div class="player-info">
            <img src="images/sprites/${playerData.position.toLowerCase()}.png" class="position-sprite">
            <span class="player-name">${playerData.name}${isCaptain ? ' (Captain)' : ''}</span>
            <div class="social-icons">${socialIcons}</div>
          </div>




        </li>
      `;
    },

//    <div class="player-profile" style="${backgroundStyle}">
//            <div class="profile-overlay"></div>
//            <div class="profile-content">
//              <div class="player-attributes">
//                <div class="attribute">
//                  <img src="images/sprites/${playerData.position.toLowerCase()}.png" class="attribute-icon" title="Position: ${playerData.position}">
//                  ${playerData.secondaryPosition ? 
//                    `<img src="images/sprites/${playerData.secondaryPosition.toLowerCase()}.png" class="attribute-icon" title="Secondary Position: ${playerData.secondaryPosition}">` 
//                    : ''}
//                </div>
//                <div class="attribute">
//                  <img src="images/sprites/region_${playerData.region.toLowerCase()}.png" class="attribute-icon" title="Region: ${playerData.region}">
//                  <img src="images/sprites/${playerData.platform.toLowerCase()}.png" class="attribute-icon" title="Platform: ${playerData.platform}">
//                </div>
//                <div class="attribute">
//                  <img src="images/sprites/${playerData.input.toLowerCase().replace(/ /g, '_')}.png" class="attribute-icon" title="Input: ${playerData.input}">
//                  <img src="images/sprites/${playerData.hogwartsHouse.toLowerCase()}.png" class="attribute-icon" title="House: ${playerData.hogwartsHouse}">
//                </div>
//              </div>
//            </div>
//          </div>
          
    renderSocialIcons(playerData) {
      const socialPlatforms = {
        discord: playerData.discord,
        twitch: playerData.twitch,
        youtube: playerData.youtube,
        x: playerData.twitter, // Note: twitter in JSON maps to 'x' platform
        tiktok: playerData.tiktok
      };

      return Object.entries(socialPlatforms)
        .filter(([_, username]) => username) // Only show platforms with usernames
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