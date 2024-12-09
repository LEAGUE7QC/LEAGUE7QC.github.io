const TeamMatchesTable = () => {
  const [selectedTeam, setSelectedTeam] = React.useState(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const matchesPerPage = 14;
  
  const matches = [
    // December 2, 2024
    { date: "2024-12-02", matchNo: 91, team1: "Trailblazing Thunderbirds", team2: "Nimbus Nighthawks" },
    { date: "2024-12-02", matchNo: 90, team1: "The Knock Out Knights", team2: "The Oakshaft Owls" },
    { date: "2024-12-02", matchNo: 89, team1: "Houston Spartans", team2: "Mad Mobsters" },
    { date: "2024-12-02", matchNo: 88, team1: "Dumbledork's Army", team2: "Quaffle House" },
    { date: "2024-12-02", matchNo: 87, team1: "The Nexus", team2: "Revenants Quidditch Club" },
    { date: "2024-12-02", matchNo: 86, team1: "The Knockout Vampires", team2: "(No Match This Week)" },
    { date: "2024-12-02", matchNo: 85, team1: "Winguardians", team2: "The Tenebrous Thestrals" },
    
    // December 9, 2024
    { date: "2024-12-09", matchNo: 84, team1: "The Tenebrous Thestrals", team2: "The Knockout Vampires" },
    { date: "2024-12-09", matchNo: 83, team1: "Revenants Quidditch Club", team2: "Winguardians" },
    { date: "2024-12-09", matchNo: 82, team1: "Quaffle House", team2: "The Nexus" },
    { date: "2024-12-09", matchNo: 81, team1: "Mad Mobsters", team2: "Dumbledork's Army" },
    { date: "2024-12-09", matchNo: 80, team1: "Trailblazing Thunderbirds", team2: "(No Match This Week)" },
    { date: "2024-12-09", matchNo: 79, team1: "Nimbus Nighthawks", team2: "The Knock Out Knights" },
    { date: "2024-12-09", matchNo: 78, team1: "The Oakshaft Owls", team2: "Houston Spartans" },
    
    // December 16, 2024
    { date: "2024-12-16", matchNo: 77, team1: "The Knock Out Knights", team2: "Trailblazing Thunderbirds" },
    { date: "2024-12-16", matchNo: 76, team1: "Houston Spartans", team2: "Nimbus Nighthawks" },
    { date: "2024-12-16", matchNo: 75, team1: "Dumbledork's Army", team2: "The Oakshaft Owls" },
    { date: "2024-12-16", matchNo: 74, team1: "(No Match This Week)", team2: "The Tenebrous Thestrals" },
    { date: "2024-12-16", matchNo: 73, team1: "Winguardians", team2: "Quaffle House" },
    { date: "2024-12-16", matchNo: 72, team1: "The Knockout Vampires", team2: "Revenants Quidditch Club" },
    { date: "2024-12-16", matchNo: 71, team1: "The Nexus", team2: "Mad Mobsters" },
    
    // January 6, 2025
    { date: "2025-01-06", matchNo: 70, team1: "Revenants Quidditch Club", team2: "The Tenebrous Thestrals" },
    { date: "2025-01-06", matchNo: 69, team1: "Quaffle House", team2: "The Knockout Vampires" },
    { date: "2025-01-06", matchNo: 68, team1: "The Knock Out Knights", team2: "(No Match This Week)" },
    { date: "2025-01-06", matchNo: 67, team1: "The Oakshaft Owls", team2: "The Nexus" },
    { date: "2025-01-06", matchNo: 66, team1: "Nimbus Nighthawks", team2: "Dumbledork's Army" },
    { date: "2025-01-06", matchNo: 65, team1: "Trailblazing Thunderbirds", team2: "Houston Spartans" },
    { date: "2025-01-06", matchNo: 64, team1: "Mad Mobsters", team2: "Winguardians" }
  ];

  const allTeams = [...new Set(matches.flatMap(match => [match.team1, match.team2]))].filter(team => team !== "(No Match This Week)").sort();

  const filteredMatches = selectedTeam
    ? matches.filter(match => match.team1 === selectedTeam || match.team2 === selectedTeam)
    : matches;

  // Pagination calculations
  const totalPages = Math.ceil(filteredMatches.length / matchesPerPage);
  const indexOfLastMatch = currentPage * matchesPerPage;
  const indexOfFirstMatch = indexOfLastMatch - matchesPerPage;
  const currentMatches = filteredMatches.slice(indexOfFirstMatch, indexOfLastMatch);

  // Format date function
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return React.createElement("div", { className: "p-4 max-w-4xl mx-auto" },
    React.createElement("div", { className: "mb-6" },
      React.createElement("h2", { className: "text-xl font-bold mb-4" }, "Team Matches"),
      React.createElement("div", { className: "mb-4" },
        React.createElement("label", { className: "block text-sm font-medium mb-2" },
          "Select a team to filter matches:"
        ),
        React.createElement("div", { className: "flex flex-wrap gap-2" },
          allTeams.map(team =>
            React.createElement("button", {
              key: team,
              onClick: () => {
                setSelectedTeam(team === selectedTeam ? null : team);
                setCurrentPage(1); // Reset to first page when filtering
              },
              className: `px-3 py-1 rounded-full text-sm ${
                team === selectedTeam
                  ? ' bg-gray-700'
                  : 'hover:bg-gray-400'
              }`
            }, team)
          )
        )
      )
    ),
    React.createElement("div", { className: "overflow-x-auto" },
      React.createElement("table", { className: "min-w-full border-collapse" },
        React.createElement("thead", null,
          React.createElement("tr", { className: "" },
            React.createElement("th", { className: "py-2 px-4 text-left" }, "Date"),
            React.createElement("th", { className: "py-2 px-4 text-left" }, "Match #"),
            React.createElement("th", { className: "py-2 px-4 text-left" }, "Team 1"),
            React.createElement("th", { className: "py-2 px-4 text-left" }, "Team 2")
          )
        ),
        React.createElement("tbody", null,
          currentMatches.map(match =>
            React.createElement("tr", {
              key: match.matchNo,
              className: `hover:bg-gray-50 ${
                selectedTeam && (match.team1 === selectedTeam || match.team2 === selectedTeam)
                  ? 'bg-blue-50'
                  : ''
              }`
            },
              React.createElement("td", { className: "py-2 px-4 border border-gray-200" }, formatDate(match.date)),
              React.createElement("td", { className: "py-2 px-4 border border-gray-200" }, match.matchNo),
              React.createElement("td", {
                className: `py-2 px-4 border border-gray-200 ${
                  match.team1 === selectedTeam ? 'font-bold' : ''
                }`
              }, match.team1),
              React.createElement("td", {
                className: `py-2 px-4 border border-gray-200 ${
                  match.team2 === selectedTeam ? 'font-bold' : ''
                }`
              }, match.team2)
            )
          )
        )
      )
    ),
    React.createElement("div", { className: "mt-4 flex items-center justify-between" },
      React.createElement("div", null,
        `Page ${currentPage} of ${totalPages}`
      ),
      React.createElement("div", { className: "flex gap-2" },
        React.createElement("button", {
          onClick: () => setCurrentPage(prev => Math.max(prev - 1, 1)),
          disabled: currentPage === 1,
          className: `px-4 py-2 ${currentPage === 1 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-gray-100 hover:bg-gray-200'} rounded`
        }, "Previous"),
        React.createElement("button", {
          onClick: () => setCurrentPage(prev => Math.min(prev + 1, totalPages)),
          disabled: currentPage === totalPages,
          className: `px-4 py-2 ${currentPage === totalPages 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-gray-100 hover:bg-gray-200'} rounded`
        }, "Next")
      ),
      selectedTeam && React.createElement("button", {
        onClick: () => {
          setSelectedTeam(null);
          setCurrentPage(1);
        },
        className: "px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
      }, "Clear Filter")
    )
  );
};