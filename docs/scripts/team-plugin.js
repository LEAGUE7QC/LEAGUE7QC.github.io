function runteamPlugin() {
    const teamPlugin = {
      name: 'team-plugin',
      data: {
        rosters: null,
        players: null,
        brooms: null,
        skills: null
      },
      mounted() { this.fetchAllData();},
      async fetchAllData() {
        try {
          const [rostersResponse, playersResponse, broomsResponse, skillsResponse] = await Promise.all([
            fetch('datatables/team-rosters.json').catch(() => ({ json: () => ({ teams: [] }) })),
            fetch('datatables/players.json').catch(() => ({ json: () => ({ players: [] }) })),
            fetch('datatables/brooms.json').catch(() => ({ json: () => ({ brooms: [], stats: [] }) })),
            fetch('datatables/skill-builds.json').catch(() => ({ json: () => ({ skills: {} }) }))
          ]);
      
          this.data.rosters = await rostersResponse.json();
          this.data.players = await playersResponse.json();
          this.data.brooms = await broomsResponse.json();
          this.data.skills = await skillsResponse.json();
      
          // Ensure all expected properties exist
          this.data.rosters.teams = this.data.rosters.teams || [];
          this.data.players.players = this.data.players.players || [];
          this.data.brooms.brooms = this.data.brooms.brooms || [];
          this.data.brooms.stats = this.data.brooms.stats || [];
          this.data.skills.skills = this.data.skills.skills || {};
      
          this.renderTeams();
        } catch (error) {
          console.warn('Error fetching data:', error);
          // Render teams with empty data
          this.renderTeams();
        }
      },
      renderTeams() {
        const content = document.querySelector('#team-display');
        if (!content) {
          console.error('Could not find #team-display element');
          return;
        }
        content.innerHTML = ''; // Clear existing content
  
        // Create a container for the button
      const buttonContainer = document.createElement('div');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.justifyContent = 'center';
      buttonContainer.style.marginBottom = '20px';

      // Add EXPAND ALL button
      const expandAllButton = document.createElement('button');
      expandAllButton.id = 'expand-all-button';
      expandAllButton.textContent = 'EXPAND ALL ROSTERS';
      expandAllButton.addEventListener('click', () => this.toggleAllRosters());
      
      // Add the button to the container
      buttonContainer.appendChild(expandAllButton);

      // Add the container to the content
      content.appendChild(buttonContainer);

      const teamsContainer = document.createElement('div');
      teamsContainer.className = 'teams-container';
      content.appendChild(teamsContainer);
        
        const initialPlayerCount = 6;
        
        // Sort teams alphabetically
        const sortedTeams = this.data.rosters.teams.sort((a, b) => a.name.localeCompare(b.name));
        
        sortedTeams.forEach(team => {
          const teamElement = document.createElement('div');
          teamElement.className = 'team';
          teamElement.id = `team-${team.name.toLowerCase().replace(/ /g, '-')}`;
      
          // Create gradient string from team colors
          const gradientColors = team.colors.join(', ');
      
          // Render team header with gradient background
          teamElement.innerHTML = `
            <div class="team-border" style="background: repeating-linear-gradient(45deg,${team.colors[0]}, 
                                                                                      ${team.colors[0]} 20px, 
                                                                                      ${team.colors[1]} 20px, 
                                                                                      ${team.colors[1]} 40px );"> </div>
            <div class="team-header">
                  <img src="images/teams/${team.name.toLowerCase().replace(/ /g, '_')}.png" class="team-logo">
            </div>
            <div class="team-colors">
              ${team.colors.map(color => `<div class="color-swatch" style="background-color: ${color};"></div>`).join('')}
            </div>
            <div class="team-border">  ${team.name}  </div>
          `;
          // Render initial players
          const initialPlayerList = document.createElement('ul');
          initialPlayerList.className = 'player-list';
          team.players.slice(0, initialPlayerCount).forEach((playerName, index) => {
            const playerElement = this.renderPlayer(playerName, team.captain);
            initialPlayerList.innerHTML += playerElement;
          });
          teamElement.appendChild(initialPlayerList);
          
          if (team.players.length > initialPlayerCount) {
              const fullRosterButton = document.createElement('button');
              fullRosterButton.className = 'see-full-roster';
              fullRosterButton.textContent = 'see full roster';
              teamElement.appendChild(fullRosterButton);
              
              const fullRosterList = document.createElement('ul');
              fullRosterList.className = 'full-roster hidden';
              team.players.slice(initialPlayerCount).forEach((playerName, index) => {
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
                <span class="player-name">${playerName}</span>
                <span class="player-realname">Player unavailable</span>
              </div>
              <div class="player-profile">
              </div>
            </li>
          `;
        }
    
        const isCaptain = playerName === captainName;
        const captainClass = isCaptain ? 'captain' : '';
    
        const broomData = this.data.brooms.brooms.find(b => b.name === playerData.broom) || { levels: [[]] };
        const skillsData = this.data.skills.skills[playerData.position] || [];
    
        const broomLevelIndex = Math.max(0, Math.min(parseInt(playerData.level || '1') - 1, broomData.levels.length - 1));
        const broomLevel = broomData.levels[broomLevelIndex] || [];
    
        const playerImageUrl = `images/players/${playerName.toLowerCase().replace(/ /g, '_')}.png`;
        const placeholderUrl = 'images/players/placeholder_portrait.png';
    
        const createTicks = (value, max, isSkill = false) => {
          const ticks = [];
          for (let i = 0; i < max; i++) {
            ticks.push(`<div class="tick ${isSkill ? 'skill-tick' : ''} ${i < value ? 'filled' : ''}"></div>`);
          }
          return ticks.join('');
        };
    
        const createStatBar = (name, value, max, isSkill = false) => {
          return `
            <div class="${isSkill ? 'skill-bar' : 'stat-bar'}">
              <span class="${isSkill ? 'skill-name' : 'stat-name'}">${name}</span>
              <div class="tick-container">
                ${createTicks(value, max, isSkill)}
              </div>
            </div>
          `;
        };
    
        const skillBars = skillsData.map((skill, index) => 
          createStatBar(skill, parseInt((playerData.skills || '0/0/0').split('/')[index] || '0'), 6, true)
        ).join('');
    
        const broomStatBars = (this.data.brooms.stats || []).map((stat, index) => 
          createStatBar(stat, broomLevel[index] || 0, 7)
        ).join('');
    
        return `
          <li class="player ${captainClass}">
          
            <div class="player-info">
              <img src="${this.getPositionSprite(playerData.position || 'fill')}" class="position-sprite">
              <span class="player-name">${playerData.name || playerName}${isCaptain ? ' (C)' : ''}</span>
              <span class="player-realname">${playerData.realname || 'Unknown'}</span>
            </div>
            <div class="player-profile">
              <div class="profile-image">
                <img src="${playerImageUrl}" onerror="this.src='${placeholderUrl}';" >
              </div>
              <div class="profile-content">
                <div class="profile-column profile-details">
                  <div class="stats-title">${playerData.position || ''} Skills</div>
                  ${skillBars || 'No data available'}
                </div>
                <div class="profile-column broom-stats">
                  <div class="stats-title">${playerData.broom || 'Unknown'} (${playerData.level || 'N/A'})</div>
                  ${broomStatBars || 'No data available'}
                </div>
              </div>
            </div>
          </li>
        `;
      },
      getPositionSprite(position) {
        return `images/sprites/${position.toLowerCase()}.png`;
      },
      addPlayerProfileListeners() {
          const players = document.querySelectorAll('.player:not(.unavailable)');
          players.forEach(player => {
            const playerInfo = player.querySelector('.player-info');
            const profile = player.querySelector('.player-profile');
            
            playerInfo.addEventListener('mousemove', (event) => {
              profile.style.display = 'flex';
              profile.style.position = 'fixed';
              profile.style.left = `${event.clientX + 10}px`;
              profile.style.top = `${event.clientY + 10}px`;
              
              // Ensure the profile stays within the viewport
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