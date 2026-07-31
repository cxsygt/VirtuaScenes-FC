// ========================================
// 资源管理器 - 金币/资金/导师卡 + localStorage持久化
// ========================================

const Storage = {
    keys: {
        RESOURCES: 'football_resources',
        PLAYERS: 'football_players',
        TEAM: 'football_team'
    },

    // ===== 资源 =====
    defaultResources() {
        return {
            gold: 2000,        // 金币（球探、升级）
            funds: 100000,     // 资金（比赛奖励、球探）
            mentorCards: 10    // 导师卡（升级球员）
        };
    },

    getResources() {
        const data = localStorage.getItem(this.keys.RESOURCES);
        return data ? JSON.parse(data) : this.defaultResources();
    },

    saveResources(res) {
        localStorage.setItem(this.keys.RESOURCES, JSON.stringify(res));
    },

    addGold(amount) {
        const res = this.getResources();
        res.gold += amount;
        this.saveResources(res);
    },

    addFunds(amount) {
        const res = this.getResources();
        res.funds += amount;
        this.saveResources(res);
    },

    addMentorCards(amount) {
        const res = this.getResources();
        res.mentorCards += amount;
        this.saveResources(res);
    },

    spendGold(amount) {
        const res = this.getResources();
        if (res.gold < amount) return false;
        res.gold -= amount;
        this.saveResources(res);
        return true;
    },

    spendFunds(amount) {
        const res = this.getResources();
        if (res.funds < amount) return false;
        res.funds -= amount;
        this.saveResources(res);
        return true;
    },

    spendMentorCards(amount) {
        const res = this.getResources();
        if (res.mentorCards < amount) return false;
        res.mentorCards -= amount;
        this.saveResources(res);
        return true;
    },

    canAfford(cost) {
        const res = this.getResources();
        return res.gold >= cost;
    },

    canAffordFunds(cost) {
        const res = this.getResources();
        return res.funds >= cost;
    },

    // ===== 球员库 =====
    defaultPlayers() {
        return [];
    },

    getPlayers() {
        const data = localStorage.getItem(this.keys.PLAYERS);
        const players = data ? JSON.parse(data) : this.defaultPlayers();
        // 旧存档兼容：如果没有power/jump属性，给默认值50
        for (const p of players) {
            if (p.power === undefined) p.power = 50;
            if (p.jump === undefined) p.jump = 50;
        }
        return players;
    },

    savePlayers(players) {
        localStorage.setItem(this.keys.PLAYERS, JSON.stringify(players));
    },

    addPlayer(player) {
        const players = this.getPlayers();
        players.push(player);
        this.savePlayers(players);
    },

    updatePlayer(playerId, updates) {
        const players = this.getPlayers();
        const idx = players.findIndex(p => p.id === playerId);
        if (idx !== -1) {
            Object.assign(players[idx], updates);
            this.savePlayers(players);
            return true;
        }
        return false;
    },

    removePlayer(playerId) {
        const players = this.getPlayers();
        const idx = players.findIndex(p => p.id === playerId);
        if (idx !== -1) {
            players.splice(idx, 1);
            this.savePlayers(players);
            return true;
        }
        return false;
    },

    // ===== 球队 =====
    defaultTeam() {
        return {
            name: '我的球队',
            playerIds: []  // 球队中的球员ID列表
        };
    },

    getTeam() {
        const data = localStorage.getItem(this.keys.TEAM);
        return data ? JSON.parse(data) : this.defaultTeam();
    },

    saveTeam(team) {
        localStorage.setItem(this.keys.TEAM, JSON.stringify(team));
    },

    getTeamPlayers() {
        const team = this.getTeam();
        const allPlayers = this.getPlayers();
        return team.playerIds.map(id => allPlayers.find(p => p.id === id)).filter(Boolean);
    },

    addPlayerToTeam(playerId) {
        const team = this.getTeam();
        if (!team.playerIds.includes(playerId) && team.playerIds.length < 11) {
            team.playerIds.push(playerId);
            this.saveTeam(team);
            return true;
        }
        return false;
    },

    removePlayerFromTeam(playerId) {
        const team = this.getTeam();
        const idx = team.playerIds.indexOf(playerId);
        if (idx !== -1) {
            team.playerIds.splice(idx, 1);
            this.saveTeam(team);
            return true;
        }
        return false;
    },

    // ===== 重置 =====
    resetAll() {
        localStorage.removeItem(this.keys.RESOURCES);
        localStorage.removeItem(this.keys.PLAYERS);
        localStorage.removeItem(this.keys.TEAM);
        return '所有数据已重置';
    }
};