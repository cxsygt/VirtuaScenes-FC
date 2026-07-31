// ========================================
// 足球策略对战游戏 - 核心逻辑层
// ========================================

const FIELD_WIDTH = 20;
const FIELD_HEIGHT = 14;
const GOAL_WIDTH = 4;

// 位置枚举
const Position = { GK: 'GK', DEF: 'DEF', MID: 'MID', FWD: 'FWD' };
const PositionName = { GK: '门将', DEF: '后卫', MID: '中场', FWD: '前锋' };

// ===== 球员类 =====
class Player {
    constructor(name, pos, team) {
        this.name = name;
        this.position = pos;
        this.isGoalkeeper = (pos === Position.GK);
        this.teamId = team;
        this.x = 0;
        this.y = 0;
        this.hasBall = false;
        this.exp = 0;
        this.level = 1;

        // 根据位置设置默认属性（100分制）
        const presets = {
            [Position.GK]:  { shoot: 0, speed: 40, dribble: 30, tackle: 40, pass: 40, power: 50, physique: 60, save: 70, jump: 70 },
            [Position.DEF]: { shoot: 30, speed: 60, dribble: 50, tackle: 70, pass: 50, power: 60, physique: 70, save: 0, jump: 50 },
            [Position.MID]: { shoot: 50, speed: 70, dribble: 70, tackle: 60, pass: 70, power: 50, physique: 50, save: 0, jump: 40 },
            [Position.FWD]: { shoot: 80, speed: 80, dribble: 80, tackle: 30, pass: 50, power: 60, physique: 60, save: 0, jump: 50 },
        };
        Object.assign(this, presets[pos]);

        // 随机微调 ±10（100分制）
        const rand = (v) => Math.max(20, Math.min(100, v + Math.floor(Math.random() * 21) - 10));
        if (this.isGoalkeeper) {
            this.save = rand(this.save);
            this.speed = rand(this.speed);
            this.dribble = rand(this.dribble);
            this.tackle = rand(this.tackle);
            this.pass = rand(this.pass);
            this.power = rand(this.power);
            this.physique = rand(this.physique);
            this.jump = rand(this.jump);
        } else {
            this.shoot = rand(this.shoot);
            this.speed = rand(this.speed);
            this.dribble = rand(this.dribble);
            this.tackle = rand(this.tackle);
            this.pass = rand(this.pass);
            this.power = rand(this.power);
            this.physique = rand(this.physique);
            this.jump = rand(this.jump);
        }
    }

    getMoveRange() { return Math.max(1, Math.ceil(this.speed / 10)); }
    getFreePassDistance() { return Math.floor(this.pass / 20); }
    manhattanDist(x, y) { return Math.abs(this.x - x) + Math.abs(this.y - y); }
    getShootValue() { return this.isGoalkeeper ? this.save : this.shoot; }
}

// ===== 球队类 =====
class Team {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.score = 0;
        this.actionPoints = 0;
        this.players = [];
        this.formation = {};
        this.initPlayers();
        this.setupFormation();
    }

    initPlayers() {
        const prefix = this.id === 0 ? 'H' : 'A';
        this.players.push(new Player(prefix + '_GK', Position.GK, this.id));
        for (let i = 0; i < 4; i++)
            this.players.push(new Player(prefix + '_DEF' + (i + 1), Position.DEF, this.id));
        for (let i = 0; i < 3; i++)
            this.players.push(new Player(prefix + '_MID' + (i + 1), Position.MID, this.id));
        for (let i = 0; i < 3; i++)
            this.players.push(new Player(prefix + '_FWD' + (i + 1), Position.FWD, this.id));
    }

    // 从球员库加载球员
    loadPlayersFromStorage(storagePlayerIds) {
        const allStoragePlayers = Storage.getPlayers();
        let available = storagePlayerIds.map(id => allStoragePlayers.find(p => p.id === id)).filter(Boolean);

        if (available.length < 11) {
            this.initPlayers();
            return;
        }

        // 目标位置分配: GK(1), DEF(4), MID(3), FWD(3)
        const targets = [
            { pos: Position.GK, count: 1, isGk: true },
            { pos: Position.DEF, count: 4, isGk: false },
            { pos: Position.MID, count: 3, isGk: false },
            { pos: Position.FWD, count: 3, isGk: false }
        ];

        const used = new Set();
        const result = [];

        for (const target of targets) {
            let need = target.count;
            // 先选位置匹配的
            for (const p of available) {
                if (need <= 0) break;
                if (used.has(p.id)) continue;
                if (p.position === target.pos) {
                    used.add(p.id);
                    result.push({ player: p, assignPos: target.pos });
                    need--;
                }
            }
            // 再选位置最接近的（排除GK转为非GK的情况）
            if (need > 0) {
                for (const p of available) {
                    if (need <= 0) break;
                    if (used.has(p.id)) continue;
                    // GK 只作为最后手段
                    if (target.pos !== Position.GK && p.position === Position.GK) continue;
                    used.add(p.id);
                    result.push({ player: p, assignPos: target.pos });
                    need--;
                }
            }
            // 最后手段：任何剩余球员
            if (need > 0) {
                for (const p of available) {
                    if (need <= 0) break;
                    if (used.has(p.id)) continue;
                    used.add(p.id);
                    result.push({ player: p, assignPos: target.pos });
                    need--;
                }
            }
        }

        this.players = [];
        for (const r of result) {
            const src = r.player;
            const pos = r.assignPos;
            const p = new Player(src.name, pos, this.id);
            Object.assign(p, src, { teamId: this.id, position: pos });
            // 旧存档兼容：如果没有power/jump属性，给默认值50
            if (p.power === undefined) p.power = 50;
            if (p.jump === undefined) p.jump = 50;
            if (pos === Position.GK) {
                p.isGoalkeeper = true;
                p.save = src.save || src.shoot || 50;
                p.shoot = 0;
            } else {
                p.isGoalkeeper = false;
                if (pos !== Position.GK) p.save = 0;
            }
            this.players.push(p);
        }
    }

    setupFormation() {
        const f = {};
        if (this.id === 0) {
            f.gk = [2, 7];
            f.def = [[4,2],[4,5],[4,8],[4,11]];
            f.mid = [[8,3],[8,7],[8,11]];
            f.fwd = [[12,3],[12,7],[12,11]];
        } else {
            f.gk = [FIELD_WIDTH - 3, 7];
            f.def = [[FIELD_WIDTH-5,2],[FIELD_WIDTH-5,5],[FIELD_WIDTH-5,8],[FIELD_WIDTH-5,11]];
            f.mid = [[FIELD_WIDTH-9,3],[FIELD_WIDTH-9,7],[FIELD_WIDTH-9,11]];
            f.fwd = [[FIELD_WIDTH-13,3],[FIELD_WIDTH-13,7],[FIELD_WIDTH-13,11]];
        }
        this.formation = f;

        let di = 0, mi = 0, fi = 0;
        for (const p of this.players) {
            switch (p.position) {
                case Position.GK: p.x = f.gk[0]; p.y = f.gk[1]; break;
                case Position.DEF: p.x = f.def[di][0]; p.y = f.def[di][1]; di++; break;
                case Position.MID: p.x = f.mid[mi][0]; p.y = f.mid[mi][1]; mi++; break;
                case Position.FWD: p.x = f.fwd[fi][0]; p.y = f.fwd[fi][1]; fi++; break;
            }
        }
    }

    getGoalkeeper() { return this.players.find(p => p.isGoalkeeper); }
    getBallHolder() { return this.players.find(p => p.hasBall); }
    resetAP(ap) { this.actionPoints = ap; }
    consumeAP(cost) {
        if (this.actionPoints >= cost) { this.actionPoints -= cost; return true; }
        return false;
    }
}

// ===== 比赛引擎 =====
class MatchEngine {
    constructor() {
        this.homeTeam = new Team(0, '主队');
        this.awayTeam = new Team(1, '客队');
        this.ballX = 10;
        this.ballY = 7;
        this.ballHolder = null;
        this.currentTeam = 0;
        this.round = 1;
        this.half = 1;
        this.phase = 'KICKOFF';
    }

    initMatch() {
        this.homeTeam.score = 0;
        this.awayTeam.score = 0;

        // 从球员库加载主队球员
        const teamData = Storage.getTeam();
        if (teamData.playerIds.length >= 11) {
            this.homeTeam.loadPlayersFromStorage(teamData.playerIds);
        }

        // 客队使用默认球员（先清空再初始化）
        this.awayTeam.players = [];
        this.awayTeam.initPlayers();

        this.homeTeam.setupFormation();
        this.awayTeam.setupFormation();
        this.ballX = 10; this.ballY = 7; this.ballHolder = null;
        this.round = 1; this.half = 1; this.phase = 'KICKOFF';
    }

    kickoff(teamKicking) {
        this.homeTeam.setupFormation();
        this.awayTeam.setupFormation();
        this.ballX = 10; this.ballY = 7; this.ballHolder = null;

        const team = teamKicking === 0 ? this.homeTeam : this.awayTeam;
        const mid = team.players.find(p => p.position === Position.MID && p.y === 7);
        if (mid) { mid.hasBall = true; this.ballHolder = mid; }

        this.currentTeam = teamKicking;
        const ap = this.generateAP();
        team.resetAP(ap);
        this.phase = 'IN_PROGRESS';
    }

    generateAP() { return Math.floor(Math.random() * 12) + 1; }
    rollD100() { return Math.floor(Math.random() * 100) + 1; }
    getAllPlayers() { return [...this.homeTeam.players, ...this.awayTeam.players]; }
    getTeam(id) { return id === 0 ? this.homeTeam : this.awayTeam; }
    getCurrentTeam() { return this.getTeam(this.currentTeam); }
    getActionPoints() { return this.getCurrentTeam().actionPoints; }

    // ===== 球门 =====
    getGoalRange(team) {
        const yStart = Math.floor((FIELD_HEIGHT - GOAL_WIDTH) / 2);
        if (team === 0) return { x: FIELD_WIDTH - 1, yStart, yEnd: yStart + GOAL_WIDTH - 1 };
        return { x: 0, yStart, yEnd: yStart + GOAL_WIDTH - 1 };
    }

    isInGoalRange(x, y, team) {
        const g = this.getGoalRange(team);
        return x === g.x && y >= g.yStart && y <= g.yEnd;
    }

    getGoalCenter(team) {
        const g = this.getGoalRange(team);
        return { x: g.x, y: Math.floor((g.yStart + g.yEnd) / 2) };
    }

    // ===== 差值查表 =====
    getShootSuccessRate(d) {
        // d是100分制的差值，除以10转换为查表用的-10~10范围
        d = Math.round(d / 10);
        if (d <= -6) return 10;
        if (d === -5) return 15;
        if (d === -4) return 25;
        if (d === -3) return 35;
        if (d === -2) return 45;
        if (d === -1) return 50;
        if (d === 0) return 55;
        if (d === 1) return 65;
        if (d === 2) return 75;
        if (d === 3) return 80;
        if (d === 4) return 85;
        if (d === 5) return 90;
        if (d >= 6) return 95;
        return 50;
    }

    getTackleSuccessRate(d) {
        // d是100分制的差值，除以10转换为查表用的-10~10范围
        d = Math.round(d / 10);
        if (d <= -6) return 10;
        if (d === -5) return 20;
        if (d === -4) return 30;
        if (d === -3) return 40;
        if (d === -2) return 50;
        if (d === -1) return 55;
        if (d === 0) return 60;
        if (d === 1) return 70;
        if (d === 2) return 80;
        if (d === 3) return 85;
        if (d >= 4) return 90;
        return 50;
    }

    getPhysiqueModifier(defPhys, attPhys) {
        if (defPhys > attPhys) return 10;
        if (defPhys < attPhys) return -10;
        return 0;
    }

    // ===== 行动点消耗 =====
    calculatePassCost(distance, passAttr) {
        const freeDist = Math.floor(passAttr / 20);
        const chargeDist = distance > freeDist ? distance - freeDist : 0;
        return Math.ceil(chargeDist / 2);
    }

    // ===== 移动 =====
    getValidMoves(player) {
        const moves = [];
        const range = player.getMoveRange();
        const ap = this.getTeam(player.teamId).actionPoints;
        const all = this.getAllPlayers();
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                if (Math.abs(dx) + Math.abs(dy) > range) continue;
                if (dx === 0 && dy === 0) continue;
                const nx = player.x + dx, ny = player.y + dy;
                if (nx < 0 || nx >= FIELD_WIDTH || ny < 0 || ny >= FIELD_HEIGHT) continue;
                if (all.some(p => p !== player && p.x === nx && p.y === ny)) continue;
                const cost = Math.abs(dx) + Math.abs(dy);
                moves.push({ x: nx, y: ny, cost: cost, affordable: cost <= ap });
            }
        }
        return moves;
    }

    executeMove(player, tx, ty) {
        if (!player) return { success: false, message: '无效球员' };
        if (tx < 0 || tx >= FIELD_WIDTH || ty < 0 || ty >= FIELD_HEIGHT)
            return { success: false, message: '目标位置在场外' };
        const dist = player.manhattanDist(tx, ty);
        if (dist > player.getMoveRange()) return { success: false, message: '超出移动范围' };
        const occupier = this.getAllPlayers().find(p => p !== player && p.x === tx && p.y === ty);
        if (occupier) return { success: false, message: '目标位置已被占据' };

        const team = this.getTeam(player.teamId);
        if (!team.consumeAP(dist)) return { success: false, message: '行动点不足(需' + dist + 'AP)' };

        player.x = tx; player.y = ty;
        if (player.hasBall) { this.ballX = tx; this.ballY = ty; }
        return { success: true, message: player.name + ' 移动到(' + tx + ',' + ty + ') 消耗' + dist + 'AP' };
    }

    // ===== 传球 =====
    // 使用Bresenham算法计算直线路径上的所有格子
    getLinePath(fromX, fromY, toX, toY) {
        const cells = [];
        const dx = Math.abs(toX - fromX);
        const dy = Math.abs(toY - fromY);
        const sx = fromX < toX ? 1 : -1;
        const sy = fromY < toY ? 1 : -1;
        let err = dx - dy;
        let x = fromX, y = fromY;
        while (true) {
            cells.push([x, y]);
            if (x === toX && y === toY) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x += sx; }
            if (e2 < dx) { err += dx; y += sy; }
        }
        return cells;
    }

    validatePassPath(fromX, fromY, toX, toY) {
        // 直线传球：起点和终点必须不同
        return Math.abs(toX - fromX) + Math.abs(toY - fromY) > 0;
    }

    getValidPassTargets(passer) {
        if (!passer || !passer.hasBall) return [];
        const team = this.getTeam(passer.teamId);
        const ap = team.actionPoints;
        return team.players
            .filter(p => p !== passer && this.validatePassPath(passer.x, passer.y, p.x, p.y))
            .map(p => {
                const dist = passer.manhattanDist(p.x, p.y);
                const cost = Math.max(1, this.calculatePassCost(dist, passer.pass));
                // 预计算传球成功率用于显示
                const analysis = this.analyzePass(passer, p);
                return {
                    player: p, x: p.x, y: p.y, distance: dist, cost: cost, affordable: cost <= ap,
                    successRate: analysis.successRate,
                    interceptors: analysis.interceptors
                };
            });
    }

    // 分析传球：计算路径、阻挡球员、成功率
    analyzePass(passer, receiver) {
        const path = this.getLinePath(passer.x, passer.y, receiver.x, receiver.y);
        // 路径中间格子（不含起终点）
        const midPath = path.slice(1, -1);
        const defTeam = this.getTeam(1 - passer.teamId);

        // 路径上的对方球员（直接阻挡）
        const interceptors = [];
        for (const [x, y] of midPath) {
            const blocker = defTeam.players.find(p => p.x === x && p.y === y && !p.isGoalkeeper);
            if (blocker && !interceptors.find(i => i.player === blocker)) {
                interceptors.push({ player: blocker, x, y });
            }
        }

        // 基础成功率：传球属性越高越准
        const dist = passer.manhattanDist(receiver.x, receiver.y);
        let successRate = 50 + passer.pass * 0.4;
        // 距离惩罚：每格距离降低2%
        successRate -= dist * 2;
        // 拦截者惩罚
        for (const ic of interceptors) {
            const d = ic.player.tackle - passer.pass;
            // 路径上阻挡球员降低成功率
            successRate -= Math.max(5, Math.min(25, 10 + d * 0.2));
        }
        successRate = Math.max(15, Math.min(95, Math.round(successRate)));

        return { successRate, interceptors, path };
    }

    executePass(passer, receiver) {
        if (!passer || !receiver) return { success: false, message: '无效球员' };
        if (!passer.hasBall) return { success: false, message: '未持球' };
        if (passer.teamId !== receiver.teamId) return { success: false, message: '不能传给对方' };

        const dist = passer.manhattanDist(receiver.x, receiver.y);
        const cost = Math.max(1, this.calculatePassCost(dist, passer.pass));
        const team = this.getTeam(passer.teamId);
        if (!team.consumeAP(cost)) return { success: false, message: '行动点不足(需' + cost + 'AP)' };

        if (!this.validatePassPath(passer.x, passer.y, receiver.x, receiver.y)) {
            team.actionPoints += cost;
            return { success: false, message: '传球路径无效' };
        }

        const analysis = this.analyzePass(passer, receiver);
        const roll = this.rollD100();

        // 传球成功
        if (roll <= analysis.successRate) {
            passer.hasBall = false;
            receiver.hasBall = true;
            this.ballHolder = receiver;
            this.ballX = receiver.x; this.ballY = receiver.y;
            return {
                success: true,
                message: passer.name + ' 传球给 ' + receiver.name + ' (距离' + dist + '格 成功率' + analysis.successRate + '% 掷' + roll + ')',
                path: analysis.path
            };
        }

        // 传球失败：判定是被拦截还是传球失误
        if (analysis.interceptors.length > 0) {
            // 被路径上最强拦截者拿到
            const interceptor = analysis.interceptors
                .map(i => ({ player: i.player, d: i.player.tackle }))
                .sort((a, b) => b.d - a.d)[0].player;
            passer.hasBall = false;
            interceptor.hasBall = true;
            this.ballHolder = interceptor;
            this.ballX = interceptor.x; this.ballY = interceptor.y;
            return {
                success: false,
                message: '传球被' + interceptor.name + '拦截！(成功率' + analysis.successRate + '% 掷' + roll + ')',
                turnover: true,
                path: analysis.path
            };
        }

        // 传球失误：球落在路径中点附近
        const midIdx = Math.floor(analysis.path.length / 2);
        const [bx, by] = analysis.path[midIdx];
        passer.hasBall = false;
        this.ballX = bx; this.ballY = by;
        // 找落点最近的球员（任何队伍）
        let nearest = null, minDist = 999;
        for (const p of this.getAllPlayers()) {
            const dd = p.manhattanDist(bx, by);
            if (dd < minDist) { minDist = dd; nearest = p; }
        }
        if (nearest) {
            nearest.hasBall = true;
            this.ballHolder = nearest;
        }
        return {
            success: false,
            message: passer.name + ' 传球失误！球落在(' + bx + ',' + by + ')附近，' + (nearest ? nearest.name : '无人') + '获得球权',
            turnover: true,
            path: analysis.path
        };
    }

    // ===== 射门 =====
    // 分析射门：路径、阻挡、成功率
    analyzeShoot(shooter, targetX, targetY) {
        const path = this.getLinePath(shooter.x, shooter.y, targetX, targetY);
        const midPath = path.slice(1, -1); // 不含起终点
        const defTeam = this.getTeam(1 - shooter.teamId);

        // 射门路径上的防守球员（阻挡）
        const blockers = [];
        for (const [x, y] of midPath) {
            const blocker = defTeam.players.find(p => p.x === x && p.y === y && !p.isGoalkeeper);
            if (blocker && !blockers.find(b => b.player === blocker)) {
                blockers.push({ player: blocker, x, y });
            }
        }

        const gk = defTeam.getGoalkeeper();
        // 射门距离
        const dist = Math.abs(targetX - shooter.x) + Math.abs(targetY - shooter.y);
        // 角度：目标y离球门中心越近越易进
        const goalCenter = this.getGoalCenter(shooter.teamId);
        const angleOffset = Math.abs(targetY - goalCenter.y);

        // 基础成功率
        let rate = 30 + shooter.shoot * 0.5;
        // 力量加成
        rate += shooter.power * 0.1;
        // 距离惩罚：每格距离降低3%
        rate -= dist * 3;
        // 角度惩罚：偏离球门中心每格降低5%
        rate -= angleOffset * 5;
        // 阻挡惩罚：路径上每个防守球员降低15%
        for (const b of blockers) {
            rate -= 15;
        }
        // 门将扑救影响
        if (gk) {
            const gkBonus = gk.save * 0.3 + gk.jump * 0.1;
            rate -= gkBonus;
        }
        rate = Math.max(5, Math.min(90, Math.round(rate)));

        return { path, blockers, gk, dist, angleOffset, successRate: rate };
    }

    // 获取射门目标格子的分析（用于UI显示）
    getShootTargetAnalysis(shooter, targetX, targetY) {
        if (!shooter || !this.isInGoalRange(targetX, targetY, shooter.teamId)) return null;
        return this.analyzeShoot(shooter, targetX, targetY);
    }

    executeShoot(shooter, targetX, targetY) {
        if (!shooter || !shooter.hasBall) return { success: false, message: '未持球' };
        if (shooter.isGoalkeeper) return { success: false, message: '门将不能射门' };
        if (!this.isInGoalRange(targetX, targetY, shooter.teamId)) return { success: false, message: '目标不在球门范围' };

        const team = this.getTeam(shooter.teamId);
        if (!team.consumeAP(3)) return { success: false, message: '行动点不足(需3AP)' };

        const analysis = this.analyzeShoot(shooter, targetX, targetY);
        const roll = this.rollD100();
        const defTeam = this.getTeam(1 - shooter.teamId);
        const gk = analysis.gk;

        // 无门将：直接进球
        if (!gk) {
            shooter.hasBall = false;
            this.onGoal(shooter.teamId);
            return {
                success: true,
                message: '进球！(无门将)',
                goal: true,
                path: analysis.path
            };
        }

        // 射门成功
        if (roll <= analysis.successRate) {
            shooter.hasBall = false;
            this.onGoal(shooter.teamId);
            return {
                success: true,
                message: '进球！(' + shooter.name + ' 距离' + analysis.dist + '格 成功率' + analysis.successRate + '% 掷' + roll + ')',
                goal: true,
                path: analysis.path,
                targetX, targetY
            };
        }

        // 射门失败：判定是被阻挡还是被扑出
        shooter.hasBall = false;

        // 被路径上防守球员阻挡
        if (analysis.blockers.length > 0 && roll < analysis.successRate + 20) {
            // 阻挡者获得球
            const blocker = analysis.blockers[0].player;
            blocker.hasBall = true;
            this.ballHolder = blocker;
            this.ballX = blocker.x; this.ballY = blocker.y;
            return {
                success: false,
                message: '射门被' + blocker.name + '阻挡！(成功率' + analysis.successRate + '% 掷' + roll + ')',
                turnover: true,
                path: analysis.path,
                targetX, targetY
            };
        }

        // 被门将扑出
        if (gk) {
            gk.hasBall = true;
            this.ballHolder = gk;
            this.ballX = gk.x; this.ballY = gk.y;
            return {
                success: false,
                message: gk.name + ' 扑出射门！(成功率' + analysis.successRate + '% 掷' + roll + ')',
                path: analysis.path,
                targetX, targetY
            };
        }

        // 射偏：球落在目标附近，最近防守方获得
        this.ballX = targetX; this.ballY = targetY;
        let nearest = null, minDist = 999;
        for (const p of defTeam.players) {
            const dd = p.manhattanDist(targetX, targetY);
            if (dd < minDist) { minDist = dd; nearest = p; }
        }
        if (nearest) { nearest.hasBall = true; this.ballHolder = nearest; }
        return {
            success: false,
            message: shooter.name + ' 射偏！(成功率' + analysis.successRate + '% 掷' + roll + ')',
            path: analysis.path,
            targetX, targetY
        };
    }

    // ===== 抢断 =====
    executeTackle(tackler, target) {
        if (!tackler || !target) return { success: false, message: '无效球员' };
        if (!target.hasBall) return { success: false, message: '目标未持球' };
        if (tackler.teamId === target.teamId) return { success: false, message: '不能抢断队友' };
        const dist = tackler.manhattanDist(target.x, target.y);
        if (dist > 2) return { success: false, message: '距离太远' };

        const team = this.getTeam(tackler.teamId);
        if (!team.consumeAP(2)) return { success: false, message: '行动点不足(需2AP)' };

        const d = (tackler.tackle + tackler.power * 0.1) - (target.dribble + target.physique * 0.1);
        let rate = this.getTackleSuccessRate(d);
        const physMod = this.getPhysiqueModifier(tackler.physique, target.physique);
        rate += physMod;
        rate = Math.max(5, Math.min(95, rate));
        const roll = this.rollD100();

        if (roll <= rate) {
            target.hasBall = false;
            tackler.hasBall = true;
            this.ballHolder = tackler;
            this.ballX = tackler.x; this.ballY = tackler.y;
            return { success: true, message: '抢断成功！(' + tackler.name + ' D=' + d + ' 身体' + physMod + '% 总率' + rate + '%)', turnover: true };
        }
        return { success: false, message: '抢断失败！(' + tackler.name + ' D=' + d + ' 身体' + physMod + '% 总率' + rate + '%)' };
    }

    // ===== 回合控制 =====
    endTurn() {
        this.currentTeam = 1 - this.currentTeam;
        const ap = this.generateAP();
        this.getTeam(this.currentTeam).resetAP(ap);
        this.round++;
    }

    onGoal(scoringTeam) {
        this.phase = 'GOAL';
        if (scoringTeam === 0) this.homeTeam.score++;
        else this.awayTeam.score++;
    }

    // ===== 球员评价 =====
    evaluatePlayer(p) {
        if (p.isGoalkeeper) {
            const t = p.save + p.physique + p.tackle + p.jump;
            if (t >= 320) return { stars: 5, text: '顶级门神' };
            if (t >= 280) return { stars: 4, text: '优秀门将' };
            if (t >= 240) return { stars: 3, text: '合格门将' };
            return { stars: 2, text: '需提升' };
        }
        if (p.position === Position.DEF) {
            const t = p.tackle + p.physique + p.speed + p.power;
            if (t >= 320) return { stars: 5, text: '顶级后卫' };
            if (t >= 280) return { stars: 4, text: '优秀后卫' };
            if (t >= 240) return { stars: 3, text: '合格后卫' };
            return { stars: 2, text: '需提升' };
        }
        if (p.position === Position.MID) {
            const t = p.pass + p.dribble + p.speed + p.tackle;
            if (t >= 320) return { stars: 5, text: '顶级中场' };
            if (t >= 280) return { stars: 4, text: '优秀中场' };
            if (t >= 240) return { stars: 3, text: '合格中场' };
            return { stars: 2, text: '需提升' };
        }
        const t = p.shoot + p.speed + p.dribble + p.power;
        if (t >= 320) return { stars: 5, text: '顶级前锋' };
        if (t >= 280) return { stars: 4, text: '优秀前锋' };
        if (t >= 240) return { stars: 3, text: '合格前锋' };
        return { stars: 2, text: '需提升' };
    }
}

// ===== 全局游戏对象 =====
const Game = {
    engine: null,
    selectedPlayer: null,
    actionMode: null, // null | 'move' | 'pass' | 'shoot' | 'tackle'
    viewSide: 0, // 0=当前队, 1=对方

    init() {
        this.engine = new MatchEngine();
        this.engine.initMatch();
        this.engine.kickoff(0);
    }
};