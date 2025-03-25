function runMatchPlugin() {
    const matchPlugin = {
        raw: {
            matches: [],
            rounds: [],
            details: [],
        },
        teams: {},
        players: {},
        matches: {},
        sheet: {
            matchesGid: "0",
            roundsGid: "1964373001",
            detailsGid: "1532718104"
        },
        defaultDivider: "-",

        mounted() {
            this.fetchAllData();
        },

        async fetchAllData() {
            try {
                const [teamsResponse, playersResponse] = await Promise.all([
                    fetch('datatables/team-rosters.json').catch(() => ({ json: () => ({ teams: [] }) })),
                    fetch('datatables/players.json').catch(() => ({ json: () => ({ players: [] }) }))
                ]);

                let teams = await teamsResponse.json();
                let players = await playersResponse.json();

                this.parseTeams(teams.teams);
                this.parsePlayers(players.players);
                this.parseMatches();

                this.renderMatches()
            } catch (error) {
                console.warn('Error fetching data:', error);
            }
        },

        parseTeams(teams) {
            for (const team of teams) {
                this.teams[team.tag] = team;
            }
        },

        parsePlayers(players) {
            for (const player of players) {
                this.players[player.name] = player;
            }
        },

        parseMatches() {
            // console.log(this.teams, this.players)
            for (const match of this.raw.matches) {
                if (!match.id) {
                    continue;
                }

                if (!this.matches[match.division]) {
                    this.matches[match.division] = {}
                }

                if (!this.matches[match.division][match.week]) {
                    this.matches[match.division][match.week] = {}
                }

                this.matches[match.division][match.week][match.id] = {
                    id: match.id,
                    week: match.week,
                    division: match.division,
                    team1: this.teams[match.team1],
                    team2: this.teams[match.team2],
                    date: match.date,
                    timezone: match.timezone,
                    team1Score: match.team1score,
                    team2Score: match.team2score,
                    rounds: {}
                }
            }

            for (const round of this.raw.rounds) {
                if (!round.match) {
                    continue;
                }

                this.matches[round.division][round.week][round.match].rounds[round.round] = {
                    round: round.round,
                    team1Score: round.team1score,
                    team2Score: round.team2score,
                    team1Players: [],
                    team2Players: []
                }
            }

            for (const detail of this.raw.details) {
                if (!detail.match) {
                    continue;
                }

                let teamProp = `team${detail.team}Players`
                this.matches[detail.division][detail.week][detail.match].rounds[detail.round][teamProp].push({
                    player: detail.player,
                    playerInfo: this.players[detail.player],
                    position: detail.position,
                    captain: detail.captain === "TRUE",
                    points: detail.points,
                    medals: JSON.parse(detail.medals)
                })
            }
        },

        renderMatches() {
            // console.log(this.matches)
            this.renderDivision('west', this.matches.west);
            this.renderDivision('east', this.matches.east);

            this.registerToggles();
        },

        renderDivision(division, weeks) {
            if (!weeks) {
                return;
            }

            const content = document.querySelector(`#${division}-season-matches`);
            if (!content) {
                console.error(`Could not find \`#${division}-season-matches\` element```);
                return;
            }

            let weeksHtml = '';

            for (const week in weeks) {
                weeksHtml = weeksHtml + this.getWeekHtml(week, weeks[week]);
            }

            content.innerHTML = weeksHtml;
        },

        registerToggles() {
            document.querySelectorAll(`.round-toggle`).forEach(el => el.addEventListener(
            'click',
            (event) => {
                let toggle = event.target;
                let matchId = toggle.getAttribute('data-match-id');
                this.toggleRounds(matchId);

                if (event.target.classList.contains('active')) {
                    event.target.innerHTML = "See Rounds"
                    event.target.classList.toggle('active');
                } else {
                    event.target.innerHTML = "Hide Rounds"
                    event.target.classList.toggle('active');
                }
            }))

            document.querySelectorAll(`.player-toggle`).forEach(el => el.addEventListener(
            'click',
            (event) => {
                let toggle = event.target;
                let matchId = toggle.getAttribute('data-match-id');
                let round = toggle.getAttribute('data-round');
                this.togglePlayerDetails(matchId, round);

                if (event.target.classList.contains('active')) {
                    event.target.innerHTML = "See Players Details"
                    event.target.classList.toggle('active');
                } else {
                    event.target.innerHTML = "Hide Players Details"
                    event.target.classList.toggle('active');
                }
            }))
        },
        toggleRounds(matchId) {
            document.querySelector(`#match-${matchId} .match-details`).classList.toggle('active')
        },
        togglePlayerDetails(matchId, round) {
            document.querySelector(`#match-${matchId}-round-${round}`).classList.toggle('active')
        },

        getWeekHtml(week, matches) {
            let matchesHtml = '';

            for (const matchId in matches) {
                matchesHtml = matchesHtml + this.getMatchHtml(matches[matchId]);
            }

            return `
                <h4 class="week-match-header">Week ${week}</h4>
                <div class="week">
                    ${matchesHtml}
                </div>
            `;
        },
        getMatchHtml(match) {
            if (!match.id) {
                return;
            }

            let matchHeader = this.getMatchHeaderHtml(match);
            let matchResult = this.getMatchResultHtml(match);
            let matchDetails = this.getMatchDetailsHtml(match);

            return `
                <div class="match" id="match-${match.id}">
                    ${matchHeader}
                    ${matchResult}
                    ${matchDetails}
                </div>
            `;
        },

        getMatchHeaderHtml(match) {
            return `
                <div class="match-header">
                    <div class="timezone">${match.timezone}</div>
                    <div class="date">${match.date}</div>
                    <div class="round-toggle" data-match-id="${match.id}">See Rounds</div>
                </div>
            `;
        },

        getMatchResultHtml(match) {
            let winnerTeam = null;
            let team1Score = Number(match.team1Score);
            let team2Score = Number(match.team2Score);

            if (team1Score !== team2Score) {
                winnerTeam = team1Score > team2Score ? 1 : 2;
            }

            let team1Tag = this.getTeamTagHtml(match.team1);
            let team2Tag = this.getTeamTagHtml(match.team2);

            return `
                <div class="match-results">
                    <div class="team-match team1">
                        ${team1Tag}
                    </div>
                    <div class="score">
                        <span class="score-team score-team-1 ${winnerTeam === 1 ? "winner" : ""}">${match.team1Score}</span>
                        <span class="divider">${this.defaultDivider}</span>
                        <span class="score-team score-team-2 ${winnerTeam === 2 ? "winner" : ""}">${match.team2Score}</span>
                    </div>
                    <div class="team-match team2">
                        ${team2Tag}
                    </div>
                </div>
            `;
        },
        getTeamTagHtml(team) {
            return `
                <img src="images/teams/${team.name.toLowerCase().replace(/ /g, '_')}.png" class="team-logo" alt="${team.name} logo">
                <div class="team-name">${team.tag}</div>
            `;
        },

        getMatchDetailsHtml(match) {
            let roundsHtml = '';

            for (const roundId in match.rounds) {
                roundsHtml = roundsHtml + this.getRoundHtml(match.id, match.rounds[roundId]);
                roundsHtml = roundsHtml + this.getRoundDetailsHtml(match.id, match.rounds[roundId]);
            }

            return `
                <div class="match-details">
                    <div class="rounds-title">Rounds</div>
                    ${roundsHtml}
                </div>
            `;
        },
        getRoundHtml(matchId, round) {
            let winnerTeam = null;
            let team1Score = Number(round.team1Score);
            let team2Score = Number(round.team2Score);

            if (team1Score !== team2Score) {
                winnerTeam = team1Score > team2Score ? 1 : 2;
            }

            return `
                <div class="round">
                    <div class="round-number">Round ${round.round}</div>
                    <div class="score">
                        <span class="score-team score-team-1 ${winnerTeam === 1 ? "winner" : ""}">${round.team1Score}</span>
                        <span class="divider">${this.defaultDivider}</span>
                        <span class="score-team score-team-2 ${winnerTeam === 2 ? "winner" : ""}">${round.team2Score}</span>
                    </div>
                    <div class="player-toggle" data-match-id="${matchId}" data-round="${round.round}">
                        See Players Details
                    </div>
                </div>
            `;
        },
        getRoundDetailsHtml(matchId, round) {
            let team1PlayersDetailsHtml = this.getPlayersDetailsHtml(round.team1Players);
            let team2PlayersDetailsHtml = this.getPlayersDetailsHtml(round.team2Players);

            return `
                <div class="round-details" id="match-${matchId}-round-${round.round}">
                    <div class="team-match team1">
                        ${team1PlayersDetailsHtml}
                    </div>
                    <div class="rounds-details-middle"></div>
                    <div class="team-match team2">
                        ${team2PlayersDetailsHtml}
                    </div>
                </div>
            `;
        },
        getPlayersDetailsHtml(players) {
            let playerDetailHtml = '';

            for (const player of players) {
                playerDetailHtml = playerDetailHtml + this.getPlayerDetailHtml(player);
            }

            return playerDetailHtml;
        },
        getPlayerDetailHtml(player) {
            return `
                <div class="player-stats">
                    <div class="score">${player.points}</div>
                    <div class="player">
                        <img class="position" src="images/sprites/${player.position}.png">
                        <div class="name ${player.captain ? "captain" : ""}">${player.player}</div>
                    </div>
                </div>            
            `;
        },
    }

    const loadCSV = (file, gid, dataName) => {
        let url = `${file}?gid=${gid}&single=true&output=csv`

        Papa.parse(url, {
            download: true,
            header: true,
            complete: function(results) {
                // console.log(results)
                matchPlugin.raw[dataName] = results.data;

                if (
                    matchPlugin.raw.matches.length > 0
                    && matchPlugin.raw.rounds.length > 0
                    && matchPlugin.raw.details.length > 0
                ) {
                    matchPlugin.mounted();
                }
            }
        });
    }

    let url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAJQ2SazcwDIEYvZfUuMptrtpbTHymLMZR0klBbcT1ABmhhBQg6Hg6HqqduKvnSMY3lc96Yxze2SWy/pub";

    loadCSV(url, "0", "matches")
    loadCSV(url, "1964373001", "rounds")
    loadCSV(url, "1532718104", "details")

}

window.runMatchPlugin = runMatchPlugin;
