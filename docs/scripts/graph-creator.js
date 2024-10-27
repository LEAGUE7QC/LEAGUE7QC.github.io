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
          stacked: false,
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
     participantsCanvas.style.height = '400px'; // Set desired height
     participantsCanvas.style.width = '100%'; // Optional: Set width to fill the container
     graphContainer.insertBefore(participantsCanvas, graphContainer.firstChild);
 } else {
     // If the canvas already exists, update its height and width
     participantsCanvas.style.height = '400px'; // Set desired height
     participantsCanvas.style.width = '100%'; // Optional: Set width to fill the container
 }

 // Destroy previous chart instance if it exists
 if (chartInstances[containerId]) {
     chartInstances[containerId].destroy();
 }

  // Add W0 to weeks
  const weeks = ['W0', 'W1', 'W2', 'W3'];
  const roles = ['Chaser', 'Seeker', 'Beater', 'Keeper'];
  const colors = {
      Chaser: 'rgba(146, 56, 50, 1)',
      Seeker: 'rgba(255, 206, 86, 1)',
      Beater: 'rgba(54, 162, 235, 1)',
      Keeper: 'rgba(75, 192, 192, 1)'
  };

  // Modified data processing
  const datasets = data.map(participant => {
    let runningTotal = 0;
    
    const participantData = weeks.map((week, index) => {
      if (index === 0) return 0;
      
      const weekValue = parseInt(participant[week]);
      const nextWeekValue = index < weeks.length - 1 ? parseInt(participant[weeks[index + 1]]) : null;
      
      // Show 0 only if next week has a non-zero value
      if ((!weekValue || isNaN(weekValue)) && nextWeekValue && !isNaN(nextWeekValue) && nextWeekValue !== 0) {
        return runningTotal;
      }
      
      // Only add to running total if there's actual data
      if (!isNaN(weekValue) && weekValue !== 0) {
        runningTotal += weekValue;
        return runningTotal;
      }
      
      return null;
    });

      return {
          label: participant.PARTICIPANT,
          data: participantData, 
          borderColor: colors[participant.ROLE],
          backgroundColor: colors[participant.ROLE].replace('1)', '0.2)'),
          fill: false,
          tension: 0.2,
          borderWidth: 2, 
          pointRadius: 2, 
          pointHoverRadius: 4, 
          pointStyle: 'circle',
          hidden: false // Start with all lines visible
      };
  });

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
              title: { display: false, text: 'Weekly Performance by Participants' },
              legend: {
                  display: true,
                  position: 'top',
                  labels: {
                    generateLabels: function(chart) {
                      return roles.map(role => ({
                          text: role,
                          fillStyle: colors[role],
                          strokeStyle: colors[role],
                          lineWidth: 2,
                          hidden: false
                      }))
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
              dataset.borderWidth = 1; // Reset to thinner line
              dataset.hidden = false;
          });
          highlightedParticipant = null;
      } else {
          // Highlight the clicked participant
          chart.data.datasets.forEach(dataset => {
              if (dataset.label === participantName) {
                  dataset.borderWidth = 2; // Thicker line for highlighted participant
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
          dataset.borderWidth = 1; // Reset to thinner line
          dataset.hidden = false;
      });
      highlightedParticipant = null;
      chart.update();
  };
}



function createRoleSpecificBarGraph(data, containerId, role) {
  const baseColors = {
    Chaser: 'rgba(146, 56, 50, 1)',    // Base red
    Seeker: 'rgba(255, 206, 86, 1)',   // Base yellow
    Beater: 'rgba(54, 162, 235, 1)',   // Base blue
    Keeper: 'rgba(75, 192, 192, 1)'    // Base teal
  };

  // Function to darken a color by a factor
  function darkenColor(rgba, factor) {
    const colorParts = rgba.match(/[\d.]+/g);
    const r = Math.max(0, parseInt(colorParts[0]) * (1 - factor));
    const g = Math.max(0, parseInt(colorParts[1]) * (1 - factor));
    const b = Math.max(0, parseInt(colorParts[2]) * (1 - factor));
    return `rgba(${r}, ${g}, ${b}, ${colorParts[3]})`;
  }

  // Create week-specific colors based on role color
  const baseColor = baseColors[role];
  const weekColors = {
    W1: baseColor,                    // Original color
    W2: darkenColor(baseColor, 0.2),  // 20% darker
    W3: darkenColor(baseColor, 0.4)   // 40% darker
  };

  const roleData = data.filter(participant => participant.ROLE === role);
  roleData.sort((a, b) => parseInt(b.TOTAL) - parseInt(a.TOTAL));

  const graphContainer = document.getElementById(containerId);
  let roleCanvas = graphContainer.querySelector('canvas');
  if (!roleCanvas) {
    roleCanvas = document.createElement('canvas');
    roleCanvas.style.height = '400px'; // Increased height
    roleCanvas.style.width = '100%';   // Full width
    graphContainer.appendChild(roleCanvas);
  } else {
    roleCanvas.style.height = '400px'; // Increased height
    roleCanvas.style.width = '100%';   // Full width
  }

  if (chartInstances[containerId]) {
    chartInstances[containerId].destroy();
  }

  // Create datasets for each week
  const weeks = ['W1', 'W2', 'W3'];
  const datasets = weeks.map(week => ({
    label: `Week ${week.substring(1)}`,
    data: roleData.map(p => parseInt(p[week]) || 0),
    backgroundColor: weekColors[week],
    borderColor: 'rgba(0, 0, 0, 1)',
    borderWidth: 1
  }));

  chartInstances[containerId] = new Chart(roleCanvas, {
    type: 'bar',
    data: {
      labels: roleData.map(p => p.PARTICIPANT),
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        x: {
          stacked: true,
          ticks: {
            autoSkip: false,
            maxRotation: 90,
            minRotation: 90
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Score'
          }
        }
      },
      plugins: {
        title: {
          display: true,
        },
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const weekLabel = context.dataset.label;
              const score = context.parsed.y;
              return `${weekLabel}: ${score}`;
            },
            afterBody: function(tooltipItems) {
              const index = tooltipItems[0].dataIndex;
              const participant = roleData[index];
              const total = parseInt(participant.TOTAL);
              return [`Total: ${total}`];
            }
          }
        }
      }
    }
  });
}