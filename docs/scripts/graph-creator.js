let chartInstances = {};
let highlightedParticipant = null;

function createTeamStatsGraphs(data, containerId) {
  const teamNames = data.map(row => row['Team Name']);
  const teamNamesInitials = teamNames.map(teamName => teamName
                                                        .split(' ')
                                                        .map(word => word[0].toUpperCase())
                                                        .join('')
                                                    );
  const forScores = data.map(row => parseInt(row['For']) || 0);
  const againstScores = data.map(row => parseInt(row['Against']) || 0);

  const graphContainer = document.getElementById(containerId);
  
  // Create canvas for For/Against scores if it doesn't exist
  let scoresCanvas = graphContainer.querySelector('canvas');
  if (!scoresCanvas) {
    scoresCanvas = document.createElement('canvas');
    graphContainer.insertBefore(scoresCanvas, graphContainer.firstChild);
  }

  // Destroy previous chart instance if it exists
  if (chartInstances[containerId]) {
    chartInstances[containerId].destroy();
  }

  // Create For/Against scores chart
  chartInstances[containerId] = new Chart(scoresCanvas, {
    type: 'bar',
    data: {
      labels: teamNamesInitials,
      datasets: [
        {
          label: 'For',
          data: forScores,
          backgroundColor: 'rgba(255,189, 0, 1)',
          borderColor: 'rgba(0, 0, 0, 1)',
          borderWidth: 0
        },
        {
          label: 'Against',
          data: againstScores,
          backgroundColor: 'rgba(117, 117, 117, 1)',
          borderColor: 'rgba(0, 0, 0, 1)',
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        x: {
          stacked: false,  // grid: {color: '#414349'},          // ticks: {color: '#414349'},
        },
        y: {
          stacked: false,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Scores'
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'For and Against Scores by Team'
        },
        legend: {
          display: true,
          position: 'bottom'
        }
      }
    }
  });
}

function createParticipantsLineChart(data, containerId) {
    const graphContainer = document.getElementById(containerId);
    
    // Create canvas for Participants Line Chart if it doesn't exist
    let participantsCanvas = graphContainer.querySelector('canvas');
    if (!participantsCanvas) {
      participantsCanvas = document.createElement('canvas');
      graphContainer.insertBefore(participantsCanvas, graphContainer.firstChild);
    }
  
    // Destroy previous chart instance if it exists
    if (chartInstances[containerId]) {
      chartInstances[containerId].destroy();
    }
  
    const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'];
    const roles = ['Chaser', 'Seeker', 'Beater', 'Keeper'];
    const colors = {
      Chaser: 'rgba(146, 56, 50, 1)',
      Seeker: 'rgba(255, 206, 86,1)',
      Beater: 'rgba(54, 162, 235, 1)',
      Keeper: 'rgba(75, 192, 192, 1)'
    };
  
    // Process data
    const datasets = data.map(participant => ({
      label: participant.PARTICIPANT,
      data: weeks.map(week => parseInt(participant[week]) || 0),
      borderColor: colors[participant.ROLE],
      backgroundColor: colors[participant.ROLE].replace('1)', '0.2)'),
      fill: false,
      tension: 0.4,
      hidden: false // Start with all lines visible
    }));
  
    // Create Participants Line Chart
    chartInstances[containerId] = new Chart(participantsCanvas, {
      type: 'line',
      data: { labels: weeks, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          x: { title: { display: true, text: 'Weeks' } },
          y: { beginAtZero: true, title: { display: true, text: 'Score' } }
        },
        plugins: {
          title: { display: true, text: 'Weekly Performance by Participants' },
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              generateLabels: function(chart) {
                return roles.map(role => ({
                  text: role,
                  fillStyle: colors[role],
                  strokeStyle: colors[role],
                  lineWidth: 2,
                  hidden: false
                }));
              }
            },
            onClick: function(e, legendItem, legend) {
              const role = legendItem.text;
              const { chart } = legend;
              chart.data.datasets.forEach(dataset => {
                if (data.find(p => p.PARTICIPANT === dataset.label).ROLE === role) {
                  dataset.hidden = !dataset.hidden;
                }
              });
              chart.update();
            }
          },
          tooltip: {
            mode: 'nearest',
            intersect: false,
            callbacks: {
              title: function(context) {
                return `Week ${context[0].label.substring(1)}`;
              },
              label: function(context) {
                const participant = data.find(p => p.PARTICIPANT === context.dataset.label);
                return `${participant.ROLE} - ${participant.PARTICIPANT}: ${context.parsed.y}`;
              }
            }
          }
        },
        hover: { mode: 'nearest', intersect: true }
      }
    });

    // Function to toggle highlight for a specific participant's line
    window.toggleHighlightParticipant = function(participantName) {
      const chart = chartInstances[containerId];
      if (highlightedParticipant === participantName) {
        // If the clicked participant is already highlighted, unhighlight it
        chart.data.datasets.forEach(dataset => {
          dataset.borderWidth = 2;
          dataset.hidden = false;
        });
        highlightedParticipant = null;
      } else {
        // Highlight the clicked participant
        chart.data.datasets.forEach(dataset => {
          if (dataset.label === participantName) {
            dataset.borderWidth = 3;
            dataset.hidden = false;
          } else {
            dataset.hidden = true;
          }
        });
        highlightedParticipant = participantName;
      }
      chart.update();
    };

    // Function to reset the chart to its original state
    window.resetChart = function() {
      const chart = chartInstances[containerId];
      chart.data.datasets.forEach(dataset => {
        dataset.borderWidth = 2;
        dataset.hidden = false;
      });
      highlightedParticipant = null;
      chart.update();
    };
}