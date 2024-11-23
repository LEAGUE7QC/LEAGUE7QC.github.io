const SCALE = 4;
const FIELD_WIDTH = 400 * SCALE;
const FIELD_HEIGHT = 140 * SCALE;
const MAX_HEIGHT = 120 * SCALE;

const QuiddichBoard = () => {
  const CENTER_X = FIELD_WIDTH / 2;
  const CENTER_Y = FIELD_HEIGHT / 2;
  const OFFSET_X = 50 * SCALE;
  const END_OFFSET = 40 * SCALE;
  
  const rolePositions = {
    home: {
      'Keeper': { x: END_OFFSET, y: CENTER_Y, z: MAX_HEIGHT/2-20 },
      'Beater': { x: CENTER_X - OFFSET_X*2, y: CENTER_Y, z: MAX_HEIGHT/2-20 },
      'Seeker': { x: CENTER_X, y: 30 * SCALE, z: MAX_HEIGHT/2+30 },
      'Chaser 1': { x: CENTER_X - (OFFSET_X/2), y: CENTER_Y - (20 * SCALE), z: MAX_HEIGHT/2-40 },
      'Chaser 2': { x: CENTER_X-40 - (OFFSET_X/2), y: CENTER_Y, z: MAX_HEIGHT/2-40 },
      'Chaser 3': { x: CENTER_X - (OFFSET_X/2), y: CENTER_Y + (20 * SCALE), z: MAX_HEIGHT/2-40 },
      'Bench 1': { x: 20 * SCALE, y: 10 * SCALE, z: MAX_HEIGHT/2-20 },
      'Bench 2': { x: 40 * SCALE, y: 10 * SCALE, z: MAX_HEIGHT/2-20 },
      'Bench 3': { x: 60 * SCALE, y: 10 * SCALE, z: MAX_HEIGHT/2-20 }
    },
    away: {
      'Keeper': { x: FIELD_WIDTH - END_OFFSET, y: CENTER_Y, z: MAX_HEIGHT/2-20 },
      'Beater': { x: CENTER_X + OFFSET_X*2, y: CENTER_Y, z: MAX_HEIGHT/2-20 },
      'Seeker': { x: CENTER_X, y: FIELD_HEIGHT - (30 * SCALE), z: MAX_HEIGHT/2+30 },
      'Chaser 1': { x: CENTER_X + (OFFSET_X/2), y: CENTER_Y - (20 * SCALE), z: MAX_HEIGHT/2-40 },
      'Chaser 2': { x: CENTER_X+40 + (OFFSET_X/2), y: CENTER_Y, z: MAX_HEIGHT/2-40 },
      'Chaser 3': { x: CENTER_X + (OFFSET_X/2), y: CENTER_Y + (20 * SCALE), z: MAX_HEIGHT/2-40 },
      'Bench 1': { x: FIELD_WIDTH - (20 * SCALE), y: 10 * SCALE, z: MAX_HEIGHT/2-20 },
      'Bench 2': { x: FIELD_WIDTH - (40 * SCALE), y: 10 * SCALE, z: MAX_HEIGHT/2-20 },
      'Bench 3': { x: FIELD_WIDTH - (60 * SCALE), y: 10 * SCALE, z: MAX_HEIGHT/2-20 }
    }
  };

  // State Management
  const [teams, setTeams] = React.useState([]);
  const [playerData, setPlayerData] = React.useState({});
  const [players, setPlayers] = React.useState({ home: [], away: [] });
  const [selectedTeams, setSelectedTeams] = React.useState({ home: 'default', away: 'default' });
  const [activeRoster, setActiveRoster] = React.useState({ home: [], away: [] });
  const draggedPlayerRef = React.useRef(null);

  React.useEffect(() => {
    // Initialize both teams as default
    handleTeamSelect('home', 'default');
    handleTeamSelect('away', 'default');
  }, []);

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
    let benchCount = 1;

    // First, assign primary positions
    teamPlayers.forEach(playerName => {
      const player = playerData[playerName];
      if (!player) return;

      if (player.position === 'Chaser' && chaserCount <= 3) {
        assigned.push({ name: playerName, role: `Chaser ${chaserCount++}`, primary: true });
      } else if (['Keeper', 'Beater', 'Seeker'].includes(player.position) && 
                 !assigned.find(p => p.role === player.position)) {
        assigned.push({ name: playerName, role: player.position, primary: true });
      }
    });

    // Then, assign remaining players to bench
    teamPlayers.forEach(playerName => {
      if (!assigned.find(p => p.name === playerName) && benchCount <= 3) {
        assigned.push({ name: playerName, role: `Bench ${benchCount++}`, primary: false });
      }
    });

    return assigned;
  };

  // Updated Icon Management
  const getRoleIcon = (role, team, playerName) => {
    // If it's a bench position, get the actual player's position from playerData
    if (role.startsWith('Bench') && playerName) {
      const player = playerData[playerName];
      if (player) {
        const baseRole = player.position.toLowerCase();
        const suffix = team === 'away' ? '_gold' : '';
        return `images/sprites/${baseRole}${suffix}.png`;
      }
    }
    
    // For regular positions, use the role directly
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
      return;
    }

    const team = teams.find(t => t.name === teamName);
    if (!team) return;

    const assignedPlayers = assignRoles(team.players);
    const positionedPlayers = assignedPlayers.map((player, id) => ({
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
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, player) => {
    draggedPlayerRef.current = player;
    const dragImage = new Image();
    dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(dragImage, 0, 0);
  };
  
  const handleDrag = (e) => {
    e.preventDefault();
    if (!draggedPlayerRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newX = Math.max(0, Math.min(FIELD_WIDTH, x));
    const newY = Math.max(0, Math.min(FIELD_HEIGHT, y));
    
    setPlayers(prev => ({
      ...prev,
      [draggedPlayerRef.current.team]: prev[draggedPlayerRef.current.team].map(p => 
        p.id === draggedPlayerRef.current.id ? { ...p, x: newX, y: newY } : p
      )
    }));
  };

  const handleDragEnd = () => {
    draggedPlayerRef.current = null;
  };

  // UI Components
  const TeamSelect = ({ team, title }) => {
    // Helper function to sort players by role
    const sortPlayersByRole = (players) => {
      const roleOrder = {
        'Seeker': 1,
        'Keeper': 2,
        'Beater': 3,
        'Chaser': 4
      };

      return players.slice().sort((a, b) => {
        const playerA = playerData[a];
        const playerB = playerData[b];
        
        if (!playerA || !playerB) return 0;
        
        // Get base roles without numbers
        const roleA = playerA.position;
        const roleB = playerB.position;
        
        // Compare based on role order
        if (roleOrder[roleA] !== roleOrder[roleB]) {
          return roleOrder[roleA] - roleOrder[roleB];
        }
        
        // If same role (especially for Chasers), maintain original order
        return 0;
      });
    };

    return React.createElement('div', {
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
        // Group and render players by role
        ['Seeker', 'Keeper', 'Beater', 'Chaser'].map(roleGroup => {
          const playersInRole = activeRoster[team]
            .filter(playerName => {
              const player = playerData[playerName];
              return player && player.position === roleGroup;
            });

          if (playersInRole.length === 0) return null;

          return React.createElement('div', {
            key: roleGroup,
            style: {
              marginBottom: '0.5rem'
            }
          },
            React.createElement('div', {
              style: {
                fontSize: '0.9em',
                color: 'var(--text-muted)',
                paddingLeft: '15px',
                marginTop: '0.5rem'
              }
            }, roleGroup + 's'),
            playersInRole.map(playerName => {
              const player = playerData[playerName];
              const roleIcon = player ? getRoleIcon(player.position, team) : null;
              
              return React.createElement('div', {
                key: playerName,
                style: { 
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
          );
        })
      )
    )
  };

  const PlayField = () => (
    React.createElement('div', {
      style: {
        width: `${FIELD_WIDTH}px`,
        height: `${FIELD_HEIGHT}px`,
        backgroundImage: 'url("images/tools/qpitch.png")',
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'rgba(0, 0, 0, 0)',
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
          onDragEnd: handleDragEnd,
          style: { 
            position: 'absolute',
            left: `${player.x}px`,
            top: `${player.y}px`,
            transform: 'translate(-50%, -50%)',
            cursor: 'move',
            textAlign: 'center',
            padding: '5px',
            borderRadius: '10px',
            zIndex: draggedPlayerRef.current?.id === player.id ? 2 : 1,
          }
        },
          React.createElement('div', {
            style: {
              width: '2rem',
              height: '2rem',
              margin: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }
          },
            React.createElement('img', {
              src: getRoleIcon(player.role, player.team, player.name),
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
              fontSize: '0.8em',
              whiteSpace: 'nowrap',
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
            width: FIELD_WIDTH,
            gridTemplateColumns: 'repeat(2, 300px)',
            gap: '0.5rem',
            justifyContent: 'center',
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