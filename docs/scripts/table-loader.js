// Helper Functions
function getTeamLogoPath(teamName) {
  return `images/teams/${teamName.toLowerCase().replace(/\s+/g, '_')}.png`;
}

function createTeamCell(teamName) {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.gap = '15px';

  const logo = document.createElement('img');
  logo.src = getTeamLogoPath(teamName);
  logo.alt = `${teamName} logo`;
  logo.style.width = '30px';
  logo.style.height = 'auto';

  const nameSpan = document.createElement('span');
  nameSpan.textContent = teamName;

  container.appendChild(logo);
  container.appendChild(nameSpan);
  
  return container;
}

// Table Configuration Objects
const ROSTER_TABLE_CONFIG = {
  columnDefs: [
    {
      targets: 0,
      width: '25%',
      className: 'text-left',
      type: 'date',
      render: function(data, type, row) {
        if (type === 'sort') {
          return new Date(data).toISOString();
        }
        return data;
      }
    },
    {
      targets: 1,
      width: 'auto',
      className: 'text-left'
    }
  ],
  pageLength: 7,
  lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]],
  order: [[0, 'desc']],
  responsive: true,
  language: {
    search: "Filter changes by team or player name: ",
    lengthMenu: "Show _MENU_ updates per page",
    info: "Showing _START_ to _END_ of _TOTAL_ roster updates"
  },
  autoWidth: true
};

// Main CSV Loading Function
function loadCSVData(filePath, containerId, options = {}, showGraph = true, role = null, tableType = null) {
  Papa.parse(filePath, {
    download: true,
    header: true,
    complete: function(results) {
      const data = results.data;
      const container = document.getElementById(containerId);
      container.innerHTML = '';

      // Handle graph creation if needed
      if (showGraph) {
        const graphContainer = document.createElement('div');
        graphContainer.id = `${containerId}-graph`;
        container.appendChild(graphContainer);

        if (containerId === 'season-stats-table') {
          createTeamStatsGraphs(data, graphContainer.id);
        } else if (containerId === 'tryout-participants') {
          createParticipantsLineChart(data, graphContainer.id);
        } else if (role) {
          createRoleSpecificBarGraph(data, containerId, role);
        }
      }

      // Create table if not a role-specific graph
      if (!role) {
        createDataTable(data, container, options, tableType);
      }
    }
  });
}

// Table Creation Function
function createDataTable(data, container, options, tableType) {
  const table = document.createElement('table');
  table.classList.add('table', 'display');

  // Create table header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  Object.keys(data[0]).forEach(key => {
    const th = document.createElement('th');
    th.textContent = key;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create table body
  const tbody = document.createElement('tbody');
  data.forEach(row => {
    const tr = document.createElement('tr');
    Object.entries(row).forEach(([key, value]) => {
      const td = document.createElement('td');
      if (key === 'Team Name' && tableType === 'stats-table') {
        td.appendChild(createTeamCell(value));
      } else if (key === 'PARTICIPANT') {
        const a = document.createElement('a');
        a.href = '#';
        a.textContent = value;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          window.toggleHighlightParticipant(value);
        });
        td.appendChild(a);
      } else {
        td.textContent = value;
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);

  // Initialize DataTable with appropriate config
  const tableConfig = {
    ...options,
    autoWidth: false,
    info: false,
    ...(tableType === 'roster-changes-table' ? ROSTER_TABLE_CONFIG : {}),
    ...(tableType === 'stats-table' ? {
      order: [
        [data[0].hasOwnProperty('#M') ? Object.keys(data[0]).indexOf('#M') : 0, 'desc'],
        [data[0].hasOwnProperty('GWR') ? Object.keys(data[0]).indexOf('GWR') : 0, 'desc'],
        [data[0].hasOwnProperty('GW') ? Object.keys(data[0]).indexOf('GW') : 0, 'desc'],
        [data[0].hasOwnProperty('MW') ? Object.keys(data[0]).indexOf('MW') : 0, 'desc']
      ],
      columnDefs: [
        {
          // Team Name column
          targets: Object.keys(data[0]).indexOf('Team Name'),
          width: '30%'
        },
        {
          // All other columns
          targets: Object.keys(data[0]).reduce((acc, key, index) => {
            if (key !== 'Team Name') acc.push(index);
            return acc;
          }, []),
          width: '5%',
          className: 'text-center align-middle'
        }
      ],
      // Add CSS to ensure header text is also centered
      createdRow: function(row, data) {
        $('td:not(:first-child)', row).addClass('text-center align-middle');
      },
      headerCallback: function(thead, data, start, end, display) {
        $('th:not(:first-child)', thead).addClass('text-center align-middle');
      }
    } : {})
  };

  const dataTable = $(table).DataTable(tableConfig);

  // Force table width to 100%
  if (tableType === 'stats-table') {
    $(table).css('width', '100%');
    dataTable.columns.adjust();
  }

  return dataTable;
}

// Add required CSS
const style = document.createElement('style');
style.textContent = `
  .text-center {
    text-align: center !important;
  }
  .align-middle {
    vertical-align: middle !important;
  }
`;
document.head.appendChild(style);

// Role-specific Graph Loading Functions
function loadChaserGraph() {
  loadCSVData(
    'https://docs.google.com/spreadsheets/d/1t9489t0H458EkTJo-kKqgb_cvEhjYw7z4Km6phmK-eM/pub?gid=1551562604&single=true&output=csv',
    'tryout-participants-chaser',
    {},
    true,
    'Chaser'
  );
}

function loadSeekerGraph() {
  loadCSVData(
    'https://docs.google.com/spreadsheets/d/1t9489t0H458EkTJo-kKqgb_cvEhjYw7z4Km6phmK-eM/pub?gid=1551562604&single=true&output=csv',
    'tryout-participants-seeker',
    {},
    true,
    'Seeker'
  );
}

function loadBeaterGraph() {
  loadCSVData(
    'https://docs.google.com/spreadsheets/d/1t9489t0H458EkTJo-kKqgb_cvEhjYw7z4Km6phmK-eM/pub?gid=1551562604&single=true&output=csv',
    'tryout-participants-beater',
    {},
    true,
    'Beater'
  );
}

function loadKeeperGraph() {
  loadCSVData(
    'https://docs.google.com/spreadsheets/d/1t9489t0H458EkTJo-kKqgb_cvEhjYw7z4Km6phmK-eM/pub?gid=1551562604&single=true&output=csv',
    'tryout-participants-keeper',
    {},
    true,
    'Keeper'
  );
}