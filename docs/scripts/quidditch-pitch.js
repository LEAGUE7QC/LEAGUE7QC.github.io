// Constants and Types
const SCALE = 4;  // Try different scales like 2, 3, 4 etc.
const FIELD_WIDTH = 400 * SCALE;
const FIELD_HEIGHT = 140 * SCALE;
const MAX_HEIGHT = 120 * SCALE;

const QuiddichBoard = () => {
  const CENTER_X = FIELD_WIDTH / 2;
  const CENTER_Y = FIELD_HEIGHT / 2;
  const OFFSET_X = 50 * SCALE;  // Distance from center for chasers/beaters
  const END_OFFSET = 40 * SCALE;  // Distance from edges for keepers
  
  const rolePositions = {
    home: {
      'Keeper': { x: END_OFFSET, y: CENTER_Y, z: MAX_HEIGHT/2-20 },
      'Beater': { x: CENTER_X - OFFSET_X*2, y: CENTER_Y, z: MAX_HEIGHT/2-20 },
      'Seeker': { x: CENTER_X, y: 30 * SCALE, z: MAX_HEIGHT/2+30 },
      'Chaser 1': { x: CENTER_X - (OFFSET_X/2), y: CENTER_Y - (20 * SCALE), z: MAX_HEIGHT/2-40 },
      'Chaser 2': { x: CENTER_X-40 - (OFFSET_X/2), y: CENTER_Y, z: MAX_HEIGHT/2-40 },
      'Chaser 3': { x: CENTER_X - (OFFSET_X/2), y: CENTER_Y + (20 * SCALE), z: MAX_HEIGHT/2-40 }
    },
    away: {
      'Keeper': { x: FIELD_WIDTH - END_OFFSET, y: CENTER_Y, z: MAX_HEIGHT/2-20 },
      'Beater': { x: CENTER_X + OFFSET_X*2, y: CENTER_Y, z: MAX_HEIGHT/2-20 },
      'Seeker': { x: CENTER_X, y: FIELD_HEIGHT - (30 * SCALE), z: MAX_HEIGHT/2+30 },
      'Chaser 1': { x: CENTER_X + (OFFSET_X/2), y: CENTER_Y - (20 * SCALE), z: MAX_HEIGHT/2-40 },
      'Chaser 2': { x: CENTER_X+40 + (OFFSET_X/2), y: CENTER_Y, z: MAX_HEIGHT/2-40 },
      'Chaser 3': { x: CENTER_X + (OFFSET_X/2), y: CENTER_Y + (20 * SCALE), z: MAX_HEIGHT/2-40 }
    }
  };

  // State Management
  const [teams, setTeams] = React.useState([]);
  const [playerData, setPlayerData] = React.useState({});
  const [players, setPlayers] = React.useState({ home: [], away: [] });
  const [selectedTeams, setSelectedTeams] = React.useState({ home: 'default', away: 'default' });
  const [activeRoster, setActiveRoster] = React.useState({ home: [], away: [] });
  const [inactivePlayers, setInactivePlayers] = React.useState({ home: new Set(), away: new Set() });
  const [draggedPlayer, setDraggedPlayer] = React.useState(null);

  React.useEffect(() => {
    // Initialize both teams as default
    handleTeamSelect('home', 'default');
    handleTeamSelect('away', 'default');
  }, [])

  // Default Team Setup
  const defaultTeam = {
    name: "Default",
    players: ["Keeper", "Beater", "Seeker", "Chaser 1", "Chaser 2", "Chaser 3"]
  };

  // Data Fetching
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [rostersResponse, playersResponse] = await Promise.all([
          fetch('datatables/team-rosters.json'),
          fetch('datatables/players.json')
        ]);
  
        const rostersData = await rostersResponse.json();
        const playersData = await playersResponse.json();
  
        const playerLookup = {};
        playersData.players.forEach(player => {
          playerLookup[player.name] = player;
        });
  
        // Sort teams alphabetically by name
        rostersData.teams.sort((a, b) => a.name.localeCompare(b.name));
  
        setTeams(rostersData.teams);
        setPlayerData(playerLookup);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
  
    fetchData();
  }, []);

  // Role Assignment
  const assignRoles = (teamPlayers) => {
    const assigned = [];
    let chaserCount = 1;

    teamPlayers.forEach(playerName => {
      const player = playerData[playerName];
      if (!player) return;

      const role = player.position === 'Chaser' ? `Chaser ${chaserCount++}` : player.position;
      assigned.push({ name: playerName, role, primary: true });
    });

    const roles = ['Keeper', 'Beater', 'Seeker', 'Chaser 1', 'Chaser 2', 'Chaser 3'];
    roles.forEach(role => {
      if (!assigned.find(p => p.role === role)) {
        const availablePlayer = teamPlayers.find(playerName => {
          const player = playerData[playerName];
          return player && !assigned.find(p => p.name === playerName) && 
                 (player.secondaryPosition === role.replace(/ \d+$/, ''));
        });

        if (availablePlayer) {
          assigned.push({ name: availablePlayer, role, primary: false });
        }
      }
    });

    return assigned;
  };

  // Icon Management
  const getRoleIcon = (role, team) => {
    const baseRole = role.replace(/ \d+$/, '').toLowerCase();
    const suffix = team === 'away' ? '_gold' : '';
    return `images/sprites/${baseRole}${suffix}.png`;
  };

  // Event Handlers
  const handleTeamSelect = (side, teamName) => {
    if (teamName === 'none') {
      setPlayers(prev => ({ ...prev, [side]: [] }));
      setSelectedTeams(prev => ({ ...prev, [side]: 'none' }));
      setActiveRoster(prev => ({ ...prev, [side]: [] }));
      setInactivePlayers(prev => ({ ...prev, [side]: new Set() }));
      return;
    }

    if (teamName === 'default') {
      const defaultPlayers = defaultTeam.players.map((role, id) => ({
        id: side === 'home' ? id + 1 : id + 7,
        name: '',
        role,
        team: side,
        ...rolePositions[side][role]
      }));
      setPlayers(prev => ({ ...prev, [side]: defaultPlayers }));
      setSelectedTeams(prev => ({ ...prev, [side]: 'default' }));
      setActiveRoster(prev => ({ ...prev, [side]: [] }));
      setInactivePlayers(prev => ({ ...prev, [side]: new Set() }));
      return;
    }

    const team = teams.find(t => t.name === teamName);
    if (!team) return;

    const assignedPlayers = assignRoles(team.players);
    const positionedPlayers = assignedPlayers.slice(0, 6).map((player, id) => ({
      id: side === 'home' ? id + 1 : id + 7,
      name: player.name,
      role: player.role,
      team: side,
      primary: player.primary,
      ...rolePositions[side][player.role]
    }));

    setPlayers(prev => ({ ...prev, [side]: positionedPlayers }));
    setSelectedTeams(prev => ({ ...prev, [side]: teamName }));
    setActiveRoster(prev => ({ ...prev, [side]: team.players }));
    setInactivePlayers(prev => ({ ...prev, [side]: new Set() }));
  };

  const togglePlayer = (team, playerName) => {
    setInactivePlayers(prev => {
      const newInactive = new Set(prev[team]);
      if (newInactive.has(playerName)) {
        newInactive.delete(playerName);
      } else {
        newInactive.add(playerName);
      }

      const activeTeamPlayers = activeRoster[team]
        .filter(name => !newInactive.has(name));
        
      const assignedPlayers = assignRoles(activeTeamPlayers);
      const currentPositions = new Map(players[team].map(p => [p.role, p]));
      
      const positionedPlayers = assignedPlayers.map((player, id) => {
        const position = rolePositions[team][player.role];
        const currentPlayer = currentPositions.get(player.role);
        return {
          id: currentPlayer?.id || (team === 'home' ? id + 1 : id + 7),
          name: player.name,
          role: player.role,
          team,
          primary: player.primary,
          x: currentPlayer?.x || position.x,
          y: currentPlayer?.y || position.y,
          z: currentPlayer?.z || position.z
        };
      });

      setPlayers(prev => ({
        ...prev,
        [team]: positionedPlayers
      }));

      return {
        ...prev,
        [team]: newInactive
      };
    });
  };

  const handleDragStart = (e, player) => {
    setDraggedPlayer(player);
    const dragImage = new Image();
    dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(dragImage, 0, 0);
  };

  const handleDrag = (e) => {
    if (!draggedPlayer) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const newX = Math.max(0, Math.min(FIELD_WIDTH, e.clientX - rect.left));
    const newY = Math.max(0, Math.min(FIELD_HEIGHT, e.clientY - rect.top));
    
    setPlayers(prev => ({
      ...prev,
      [draggedPlayer.team]: prev[draggedPlayer.team].map(p => {
        if (p.id === draggedPlayer.id) {
          return { ...p, x: newX, y: newY };
        }
        return p;
      })
    }));
  };

  // UI Components
  const TeamSelect = ({ team, title }) => (
    React.createElement('div', {
      style: { padding: '0.5rem' }
    },
      React.createElement('p', {
        style: { fontSize: '1rem', marginBottom: '0.5rem' }
      }, title),
      React.createElement('select', {
        style: { 
          padding: '0.25rem',
          width: '100%',
          marginBottom: '0.5rem'
        },
        value: selectedTeams[team],
        onChange: (e) => handleTeamSelect(team, e.target.value)
      },
        React.createElement('option', { value: 'none' }, 'Select Team'),
        React.createElement('option', { value: 'default' }, 'Default'),
        teams.map(roster => 
          React.createElement('option', {
            key: roster.name,
            value: roster.name
          }, roster.name)
        )
      ),
      selectedTeams[team] !== 'none' && selectedTeams[team] !== 'default' && 
      React.createElement('div', {
        style: { 
          marginTop: '0.5rem'
        }
      },
        React.createElement('div', {
          style: { marginBottom: '0.25rem' }
        }, 'Roster:'),
        // Render roster players
        activeRoster[team]
          .slice()
          .sort((a, b) => a.localeCompare(b)) // Sort alphabetically
          .map(playerName => {
            const player = playerData[playerName];
            const roleIcon = player ? getRoleIcon(player.position, team) : null;
            
            return React.createElement('div', {
              key: playerName,
              onClick: () => togglePlayer(team, playerName),
              style: { 
                cursor: 'pointer',
                textDecoration: inactivePlayers[team].has(playerName) ? 'line-through' : 'none',
                opacity: inactivePlayers[team].has(playerName) ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                padding: '0.125rem 0',
                backgroundColor: 'var(--sidebar-background)',
                margin: '5px',
                paddingLeft: '15px'
              }
            },
            roleIcon && React.createElement('img', {
              src: roleIcon,
              alt: player.position,
              style: { width: '1.5rem', height: '1.5rem', marginRight: '0.5rem' }
            }),
            playerName
            );
          })
      )
    )
  );

  const PlayField = () => (
    React.createElement('div', {
      style: {
        width: `${FIELD_WIDTH}px`,
        height: `${FIELD_HEIGHT}px`,
        backgroundImage: 'url("images/tools/qpitch.png")', // Set the background image
        backgroundSize: '100% 100%', // Ensure the image stretches to fit the container
        backgroundPosition: 'center', // Center the image
        backgroundRepeat: 'no-repeat', // Prevent repeating
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '10rem'
      },
      onDragOver: (e) => {
        e.preventDefault();
        handleDrag(e);
      }
    },
      Object.values(players).flat().map((player) => 
        React.createElement('div', {
          key: player.id,
          draggable: true,
          onDragStart: (e) => handleDragStart(e, player),
          onDragEnd: () => setDraggedPlayer(null),
          style: { 
            position: 'absolute',
            left: player.x,
            top: player.y,
            transform: 'translate(-50%, -50%)',
            cursor: 'move',
            textAlign: 'center'
          }
        },
          React.createElement('div', {
            style: {
              width: '1.5rem',
              height: '1.5rem',
              margin: '0 auto 0.125rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }
          },
            React.createElement('img', {
              src: getRoleIcon(player.role, player.team),
              alt: player.role,
              style: {
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }
            })
          ),
          React.createElement('div', {
            style: {
              color: 'white',
              fontSize: '1em',
              whiteSpace: 'nowrap'
            }
          },
            selectedTeams[player.team] === 'default' ? 
              React.createElement('div', null, player.role) :
              (player.name && React.createElement('div', {
                style: { fontSize: '1em' }
              }, player.name))
          )
        )
      )
    )
  );

  // Main Render
  return React.createElement('div', { 
    style: { width: '100%', maxWidth: FIELD_WIDTH}
  },
    React.createElement('div', null,
      React.createElement(PlayField),
      React.createElement('div', null,
      React.createElement('div', { 
        style: {
            display: 'grid',
            width:  FIELD_WIDTH,
            gridTemplateColumns: 'repeat(2, 400px)', // Two columns, each 100px wide
            gap: '0.5rem', // Space between columns
            justifyContent: 'center', // Center the grid horizontally
            marginBottom: '0.5rem',
        },
      },
        React.createElement(TeamSelect, { team: 'home', title: 'Team 1 (White)' }),
        React.createElement(TeamSelect, { team: 'away', title: 'Team 2 (Gold)' })
      )
    )
    )
  );
};

window.QuiddichBoard = QuiddichBoard;