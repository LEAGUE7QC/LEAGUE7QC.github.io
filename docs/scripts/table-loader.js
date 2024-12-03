function loadCSVData(filePath, containerId, options, showGraph = true, role = null, tableType = null) {
  Papa.parse(filePath, {
    download: true,
    header: true,
    complete: function(results) {
      const data = results.data;
      
      // Create container for graphs and table
      const container = document.getElementById(containerId);
      container.innerHTML = ''; // Clear previous content

      if (showGraph) {
        const graphContainer = document.createElement('div');
        graphContainer.id = `${containerId}-graph`;
        container.appendChild(graphContainer);

        // Create and populate the graphs
        if (containerId === 'season-stats-table') {
          createTeamStatsGraphs(data, graphContainer.id);
        } else if (containerId === 'tryout-participants') {
          createParticipantsLineChart(data, graphContainer.id);
        } else if (role) {
          createRoleSpecificBarGraph(data, containerId, role);
        }
      }

      // Only create the table if it's not a role-specific graph
      if (!role) {
        // Create and populate the table
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
            if (key === 'PARTICIPANT') {
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

        // Initialize DataTables with custom options based on table type
        let tableConfig = {
          ...options,
          autoWidth: false
        };

        if (tableType === 'roster-changes-table') {
          tableConfig = {
            ...tableConfig,
            columnDefs: [
              {
                targets: 0, // Date column
                width: '25%',
                className: 'text-left',
                // Add type for date sorting
                type: 'date',
                // Add render function to ensure consistent date format
                render: function(data, type, row) {
                  if (type === 'sort') {
                    // Convert "Month Day, Year" to YYYY-MM-DD for proper sorting
                    const date = new Date(data);
                    return date.toISOString();
                  }
                  return data;
                }
              },
              {
                targets: 1, // Changes column
                width: 'auto',
                className: 'text-left'
              }
            ],
            pageLength: 7,
            lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]],
            order: [[0, 'desc']], // This will now correctly sort by date
            responsive: true,
            language: {
              search: "Filter changes by team or player name: ",
              lengthMenu: "Show _MENU_ updates per page",
              info: "Showing _START_ to _END_ of _TOTAL_ roster updates"
            },
            autoWidth: true
          };
        }

        const dataTable = $(table).DataTable(tableConfig);
      }
    }
  });
}

function loadChaserGraph() {
  loadCSVData('https://docs.google.com/spreadsheets/d/1t9489t0H458EkTJo-kKqgb_cvEhjYw7z4Km6phmK-eM/pub?gid=1551562604&single=true&output=csv', 'tryout-participants-chaser', {}, true, 'Chaser', null);
}

function loadSeekerGraph() {
  loadCSVData('https://docs.google.com/spreadsheets/d/1t9489t0H458EkTJo-kKqgb_cvEhjYw7z4Km6phmK-eM/pub?gid=1551562604&single=true&output=csv', 'tryout-participants-seeker', {}, true, 'Seeker', null);
}

function loadBeaterGraph() {
  loadCSVData('https://docs.google.com/spreadsheets/d/1t9489t0H458EkTJo-kKqgb_cvEhjYw7z4Km6phmK-eM/pub?gid=1551562604&single=true&output=csv', 'tryout-participants-beater', {}, true, 'Beater', null);
}

function loadKeeperGraph() {
  loadCSVData('https://docs.google.com/spreadsheets/d/1t9489t0H458EkTJo-kKqgb_cvEhjYw7z4Km6phmK-eM/pub?gid=1551562604&single=true&output=csv', 'tryout-participants-keeper', {}, true, 'Keeper', null);
}