// ========================================
// UI 交互层 - Canvas渲染 + 鼠标交互
// ========================================

const UI = {
    canvas: null,
    ctx: null,
    cellSize: 36,
    offsetX: 0,
    offsetY: 0,
    hoverCell: null,
    logEntries: [],

    init() {
        this.canvas = document.getElementById('fieldCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        this.bindEvents();
    },

    resizeCanvas() {
        const w = FIELD_WIDTH * this.cellSize + 4;
        const h = FIELD_HEIGHT * this.cellSize + 4;
        this.canvas.width = w;
        this.canvas.height = h;
        this.offsetX = 2;
        this.offsetY = 2;
    },

    bindEvents() {
        this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.onCanvasMove(e));
        this.canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); this.cancelAction(); });
        window.addEventListener('resize', () => this.renderField());
    },

    // ===== 坐标转换 =====
    screenToGrid(sx, sy) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = Math.floor(((sx - rect.left) * scaleX - this.offsetX) / this.cellSize);
        const y = Math.floor(((sy - rect.top) * scaleY - this.offsetY) / this.cellSize);
        return { x, y };
    },

    gridToScreen(gx, gy) {
        return {
            x: this.offsetX + gx * this.cellSize,
            y: this.offsetY + gy * this.cellSize
        };
    },

    // ===== 鼠标事件 =====
    onCanvasClick(e) {
        const { x, y } = this.screenToGrid(e.clientX, e.clientY);
        if (x < 0 || x >= FIELD_WIDTH || y < 0 || y >= FIELD_HEIGHT) return;

        const eng = Game.engine;
        const allPlayers = eng.getAllPlayers();
        const clickedPlayer = allPlayers.find(p => p.x === x && p.y === y);

        // 行动模式下处理
        if (Game.actionMode === 'move' && Game.selectedPlayer) {
            const moves = eng.getValidMoves(Game.selectedPlayer);
            const valid = moves.find(m => m.x === x && m.y === y);
            if (valid) {
                const r = eng.executeMove(Game.selectedPlayer, x, y);
                this.log(r.message, r.success ? 'success' : 'fail');
                this.clearActionMode();
                this.afterAction();
                return;
            }
        }

        if (Game.actionMode === 'shoot' && Game.selectedPlayer) {
            const goal = eng.getGoalRange(Game.selectedPlayer.teamId);
            if (x === goal.x && y >= goal.yStart && y <= goal.yEnd) {
                const r = eng.executeShoot(Game.selectedPlayer, x, y);
                this.log(r.message, r.goal ? 'goal' : (r.success ? 'success' : 'fail'));
                this.clearActionMode();
                if (r.goal) this.onGoal();
                this.afterAction();
                return;
            }
        }

        if (Game.actionMode === 'pass' && Game.selectedPlayer) {
            const targets = eng.getValidPassTargets(Game.selectedPlayer);
            const target = targets.find(t => t.x === x && t.y === y);
            if (target) {
                const r = eng.executePass(Game.selectedPlayer, target.player);
                this.log(r.message, r.success ? 'success' : 'fail');
                this.clearActionMode();
                this.afterAction();
                return;
            }
        }

        if (Game.actionMode === 'tackle' && Game.selectedPlayer) {
            const opp = eng.getTeam(1 - eng.currentTeam);
            const target = opp.players.find(p => p.x === x && p.y === y && p.hasBall);
            if (target) {
                const r = eng.executeTackle(Game.selectedPlayer, target);
                this.log(r.message, r.success ? 'success' : 'fail');
                this.clearActionMode();
                this.afterAction();
                return;
            }
        }

        // 非行动模式：选择球员
        if (clickedPlayer) {
            Game.selectedPlayer = clickedPlayer;
            this.showPlayerCard(clickedPlayer);
            this.renderField();
            this.renderPlayerList();
        } else {
            // 点击空地：取消选择
            Game.selectedPlayer = null;
            this.closeCard();
            this.renderField();
            this.renderPlayerList();
        }
    },

    onCanvasMove(e) {
        const { x, y } = this.screenToGrid(e.clientX, e.clientY);
        this.hoverCell = (x >= 0 && x < FIELD_WIDTH && y >= 0 && y < FIELD_HEIGHT) ? { x, y } : null;
        this.renderField();
    },

    // ===== 行动模式 =====
    setActionMode(mode) {
        if (!Game.selectedPlayer) return;
        if (Game.selectedPlayer.teamId !== Game.engine.currentTeam) {
            this.log('只能操作当前回合队伍的球员', 'fail');
            return;
        }
        Game.actionMode = mode;
        this.renderField();
        this.renderCardActions();
    },

    cancelAction() {
        this.clearActionMode();
        this.renderField();
    },

    clearActionMode() {
        Game.actionMode = null;
        this.renderCardActions();
    },

    // ===== 行动后处理 =====
    afterAction() {
        this.renderAll();
        const eng = Game.engine;
        // AP耗尽
        if (eng.getActionPoints() <= 0) {
            this.log(eng.getCurrentTeam().name + ' 行动点耗尽，自动结束回合', 'info');
            setTimeout(() => {
                eng.endTurn();
                this.log('轮到 ' + eng.getCurrentTeam().name + ' 行动 (AP:' + eng.getActionPoints() + ')', 'info');
                this.renderAll();
                this.checkHalfTime();
            }, 1000);
        }
    },

    onGoal() {
        const eng = Game.engine;
        const scoringTeam = eng.currentTeam;
        const shooter = eng.ballHolder;

        this.log('!!! 进球 !!! ' + (scoringTeam === 0 ? '主队' : '客队') + ' 得分！', 'goal');

        // 播放进球动画
        this.playGoalAnimation(scoringTeam, shooter);

        setTimeout(() => {
            const kicker = 1 - scoringTeam;
            eng.kickoff(kicker);
            this.log((kicker === 0 ? '主队' : '客队') + ' 开球', 'info');
            this.renderAll();
        }, 3500);
    },

    // ===== 进球动画 =====
    playGoalAnimation(team, shooter) {
        const ctx = this.ctx;
        const cs = this.cellSize;
        const eng = Game.engine;

        // 获取球门位置
        const goal = eng.getGoalRange(team);
        const goalScreenX = this.offsetX + goal.x * cs + cs / 2;
        const goalScreenY = this.offsetY + (goal.yStart + goal.yEnd) / 2 * cs + cs / 2;

        // 球的起始位置（射门者脚下）
        let startX, startY;
        if (shooter) {
            const ss = this.gridToScreen(shooter.x, shooter.y);
            startX = ss.x + cs * 0.75;
            startY = ss.y + cs * 0.75;
        } else {
            startX = this.canvas.width / 2;
            startY = this.canvas.height / 2;
        }

        const endX = goalScreenX;
        const endY = goalScreenY;

        // 动画参数
        const duration = 800; // ms
        const startTime = performance.now();

        // 球门闪光效果
        const goalFlash = () => {
            let flashAlpha = 0.8;
            const flashInterval = setInterval(() => {
                ctx.save();
                ctx.fillStyle = `rgba(255, 215, 0, ${flashAlpha})`;
                for (let y = goal.yStart; y <= goal.yEnd; y++) {
                    const s = this.gridToScreen(goal.x, y);
                    ctx.fillRect(s.x, s.y, cs, cs);
                }
                ctx.restore();
                flashAlpha -= 0.1;
                if (flashAlpha <= 0) clearInterval(flashInterval);
            }, 80);
        };

        // 球飞行轨迹
        const animate = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);

            // 使用抛物线轨迹
            const x = startX + (endX - startX) * t;
            const baseY = startY + (endY - startY) * t;
            const arcHeight = -cs * 3; // 弧度高度
            const y = baseY + arcHeight * 4 * t * (1 - t);

            // 清除并重绘场地
            this.renderField();

            // 画飞行中的球
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 球的拖尾效果
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(x - (endX - startX) * 0.05, y - (endY - startY) * 0.05, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.15;
            ctx.beginPath();
            ctx.arc(x - (endX - startX) * 0.1, y - (endY - startY) * 0.1, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                // 球进门后，播放庆祝动画
                goalFlash();
                this.playCelebration(team);
            }
        };

        requestAnimationFrame(animate);
    },

    // 庆祝动画（彩带/烟花效果）
    playCelebration(team) {
        const ctx = this.ctx;
        const colors = team === 0
            ? ['#4ecca3', '#2d8659', '#00ff7f', '#7cfc00']
            : ['#e94560', '#ff6347', '#ff4500', '#ff69b4'];

        const particles = [];
        for (let i = 0; i < 50; i++) {
            particles.push({
                x: this.canvas.width / 2 + (Math.random() - 0.5) * 100,
                y: this.canvas.height / 2 + (Math.random() - 0.5) * 50,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 1) * 8,
                size: Math.random() * 6 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1
            });
        }

        let frame = 0;
        const maxFrames = 60;

        const celebrate = () => {
            frame++;
            this.renderField();

            // 更新和绘制粒子
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.15; // 重力
                p.life = 1 - frame / maxFrames;

                ctx.save();
                ctx.globalAlpha = Math.max(0, p.life);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // 显示进球文字
            if (frame < 40) {
                ctx.save();
                ctx.font = 'bold 36px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = `rgba(255, 215, 0, ${Math.min(1, (40 - frame) / 10)})`;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                const text = 'GOAL!';
                ctx.strokeText(text, this.canvas.width / 2, 50);
                ctx.fillText(text, this.canvas.width / 2, 50);
                ctx.restore();
            }

            if (frame < maxFrames) {
                requestAnimationFrame(celebrate);
            } else {
                this.renderField();
                this.renderAll();
            }
        };

        requestAnimationFrame(celebrate);
    },

    checkHalfTime() {
        const eng = Game.engine;
        if (eng.round > 40) {
            if (eng.half === 1) {
                eng.half = 2;
                eng.round = 1;
                this.log('===== 中场休息 =====', 'info');
                eng.kickoff(1);
                this.log('下半场开始，客队开球', 'info');
                this.renderAll();
            } else {
                this.log('===== 全场结束 =====', 'goal');
                let msg = '全场结束！';
                if (eng.homeTeam.score > eng.awayTeam.score) msg += '主队获胜！';
                else if (eng.homeTeam.score < eng.awayTeam.score) msg += '客队获胜！';
                else msg += '双方平局！';
                this.showModal('比赛结束', msg);
            }
        }
    },

    // ===== 渲染：球场 =====
    renderField() {
        const ctx = this.ctx;
        const cs = this.cellSize;
        const eng = Game.engine;

        // 背景
        ctx.fillStyle = '#2d5a27';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制格子
        for (let y = 0; y < FIELD_HEIGHT; y++) {
            for (let x = 0; x < FIELD_WIDTH; x++) {
                const sx = this.offsetX + x * cs;
                const sy = this.offsetY + y * cs;

                // 交替条纹
                if ((x + y) % 2 === 0) {
                    ctx.fillStyle = '#2d5a27';
                } else {
                    ctx.fillStyle = '#285022';
                }
                ctx.fillRect(sx, sy, cs, cs);

                // 中线
                if (x === FIELD_WIDTH / 2 - 1) {
                    ctx.fillStyle = 'rgba(255,255,255,0.15)';
                    ctx.fillRect(sx + cs - 1, sy, 2, cs);
                }
            }
        }

        // 中圈
        const cx = this.offsetX + (FIELD_WIDTH / 2) * cs;
        const cy = this.offsetY + (FIELD_HEIGHT / 2) * cs;
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, cs * 2, 0, Math.PI * 2);
        ctx.stroke();

        // 球门
        this.drawGoals();

        // 高亮：移动范围
        if (Game.actionMode === 'move' && Game.selectedPlayer) {
            const moves = eng.getValidMoves(Game.selectedPlayer);
            for (const m of moves) {
                const s = this.gridToScreen(m.x, m.y);
                if (m.affordable) {
                    ctx.fillStyle = 'rgba(78, 204, 163, 0.35)';
                    ctx.fillRect(s.x, s.y, cs, cs);
                    ctx.strokeStyle = '#4ecca3';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(s.x + 1, s.y + 1, cs - 2, cs - 2);
                    // 标注消耗AP
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.fillText(m.cost + 'AP', s.x + cs/2, s.y + 1);
                } else {
                    // AP不足的格子用灰色虚线标记
                    ctx.fillStyle = 'rgba(128, 128, 128, 0.2)';
                    ctx.fillRect(s.x, s.y, cs, cs);
                    ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([3, 3]);
                    ctx.strokeRect(s.x + 1, s.y + 1, cs - 2, cs - 2);
                    ctx.setLineDash([]);
                    ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
                    ctx.font = '9px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.fillText(m.cost + 'AP', s.x + cs/2, s.y + 1);
                }
            }
        }

        // 高亮：传球目标
        if (Game.actionMode === 'pass' && Game.selectedPlayer) {
            const targets = eng.getValidPassTargets(Game.selectedPlayer);
            const passer = Game.selectedPlayer;
            for (const t of targets) {
                const s = this.gridToScreen(t.x, t.y);
                if (t.affordable) {
                    // 可传：绿色高亮
                    ctx.fillStyle = 'rgba(78, 204, 163, 0.25)';
                    ctx.fillRect(s.x, s.y, cs, cs);
                    ctx.strokeStyle = '#4ecca3';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(s.x + 1, s.y + 1, cs - 2, cs - 2);
                    // 标注AP消耗
                    ctx.fillStyle = '#4ecca3';
                    ctx.font = 'bold 11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.fillText(t.cost + 'AP', s.x + cs/2, s.y + 1);
                    // 画传球虚线
                    const ps = this.gridToScreen(passer.x, passer.y);
                    ctx.strokeStyle = 'rgba(78, 204, 163, 0.4)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 4]);
                    ctx.beginPath();
                    ctx.moveTo(ps.x + cs/2, ps.y + cs/2);
                    ctx.lineTo(s.x + cs/2, s.y + cs/2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                } else {
                    // AP不足：灰色标记
                    ctx.fillStyle = 'rgba(128, 128, 128, 0.15)';
                    ctx.fillRect(s.x, s.y, cs, cs);
                    ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([3, 3]);
                    ctx.strokeRect(s.x + 1, s.y + 1, cs - 2, cs - 2);
                    ctx.setLineDash([]);
                    ctx.fillStyle = 'rgba(200, 200, 200, 0.6)';
                    ctx.font = '9px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.fillText(t.cost + 'AP', s.x + cs/2, s.y + 1);
                }
            }
        }

        // 高亮：射门目标
        if (Game.actionMode === 'shoot' && Game.selectedPlayer) {
            const goal = eng.getGoalRange(Game.selectedPlayer.teamId);
            ctx.fillStyle = 'rgba(240, 165, 0, 0.3)';
            for (let y = goal.yStart; y <= goal.yEnd; y++) {
                const s = this.gridToScreen(goal.x, y);
                ctx.fillRect(s.x, s.y, cs, cs);
                ctx.strokeStyle = '#f0a500';
                ctx.lineWidth = 2;
                ctx.strokeRect(s.x + 1, s.y + 1, cs - 2, cs - 2);
            }
        }

        // 高亮：抢断目标
        if (Game.actionMode === 'tackle' && Game.selectedPlayer) {
            const opp = eng.getTeam(1 - eng.currentTeam);
            for (const p of opp.players) {
                if (p.hasBall && Game.selectedPlayer.manhattanDist(p.x, p.y) <= 2) {
                    const s = this.gridToScreen(p.x, p.y);
                    ctx.fillStyle = 'rgba(233, 69, 96, 0.3)';
                    ctx.fillRect(s.x, s.y, cs, cs);
                    ctx.strokeStyle = '#e94560';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(s.x + 1, s.y + 1, cs - 2, cs - 2);
                }
            }
        }

        // hover 高亮
        if (this.hoverCell) {
            const s = this.gridToScreen(this.hoverCell.x, this.hoverCell.y);
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(s.x, s.y, cs, cs);
        }

        // 绘制球员
        for (const p of eng.getAllPlayers()) {
            this.drawPlayer(p);
        }

        // 选中球员高亮
        if (Game.selectedPlayer) {
            const s = this.gridToScreen(Game.selectedPlayer.x, Game.selectedPlayer.y);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.strokeRect(s.x + 1, s.y + 1, cs - 2, cs - 2);
        }

        // 绘制球
        this.drawBall();
    },

    drawGoals() {
        const ctx = this.ctx;
        const cs = this.cellSize;
        const yStart = Math.floor((FIELD_HEIGHT - GOAL_WIDTH) / 2);

        // 左球门
        const ls = this.gridToScreen(0, yStart);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(this.offsetX - 6, ls.y, 6, GOAL_WIDTH * cs);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.offsetX - 6, ls.y, 6, GOAL_WIDTH * cs);

        // 右球门
        const rs = this.gridToScreen(FIELD_WIDTH - 1, yStart);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(rs.x + cs, rs.y, 6, GOAL_WIDTH * cs);
        ctx.strokeRect(rs.x + cs, rs.y, 6, GOAL_WIDTH * cs);
    },

    drawPlayer(p) {
        const ctx = this.ctx;
        const cs = this.cellSize;
        const s = this.gridToScreen(p.x, p.y);
        const cx = s.x + cs / 2;
        const cy = s.y + cs / 2;
        const r = cs * 0.35;

        // 球员圆圈
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        if (p.teamId === 0) {
            ctx.fillStyle = '#4ecca3';
        } else {
            ctx.fillStyle = '#e94560';
        }
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 球员编号
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const idx = p.teamId === 0
            ? Game.engine.homeTeam.players.indexOf(p) + 1
            : Game.engine.awayTeam.players.indexOf(p) + 1;
        ctx.fillText(idx, cx, cy);

        // 门将标记
        if (p.isGoalkeeper) {
            ctx.strokeStyle = '#f0a500';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
            ctx.stroke();
        }
    },

    drawBall() {
        const ctx = this.ctx;
        const cs = this.cellSize;
        const eng = Game.engine;

        // 如果有人持球，球在球员脚下
        let bx, by;
        if (eng.ballHolder) {
            const s = this.gridToScreen(eng.ballHolder.x, eng.ballHolder.y);
            bx = s.x + cs * 0.75;
            by = s.y + cs * 0.75;
        } else {
            const s = this.gridToScreen(eng.ballX, eng.ballY);
            bx = s.x + cs / 2;
            by = s.y + cs / 2;
        }

        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
    },

    // ===== 渲染：顶部状态栏 =====
    renderTopbar() {
        const eng = Game.engine;
        document.getElementById('scoreDisplay').textContent =
            eng.homeTeam.score + ' : ' + eng.awayTeam.score;
        document.getElementById('halfDisplay').textContent =
            eng.half === 1 ? '上半场' : '下半场';
        document.getElementById('roundDisplay').textContent = '第' + eng.round + '回合';
        document.getElementById('possessionDisplay').textContent =
            '控球：' + (eng.ballHolder ? (eng.ballHolder.teamId === 0 ? '主队' : '客队') : '无');

        const cur = eng.getCurrentTeam();
        document.getElementById('currentTeamName').textContent = cur.name;
        document.getElementById('currentTeamName').style.color =
            eng.currentTeam === 0 ? '#4ecca3' : '#e94560';

        // AP进度条
        const apBar = document.getElementById('apBar');
        apBar.innerHTML = '';
        for (let i = 0; i < 12; i++) {
            const cell = document.createElement('div');
            cell.className = 'ap-cell';
            if (i < cur.actionPoints) {
                cell.classList.add('filled');
                if (cur.actionPoints <= 3) cell.classList.add('low');
            }
            apBar.appendChild(cell);
        }
        document.getElementById('apText').textContent = cur.actionPoints + '/12';
    },

    // ===== 渲染：球员列表 =====
    renderPlayerList() {
        const eng = Game.engine;
        const team = eng.currentTeam === Game.viewSide ? eng.getCurrentTeam() : eng.getTeam(1 - eng.currentTeam);
        document.getElementById('listTitle').textContent = team.name + '阵容';

        const table = document.getElementById('playerTable');
        let html = '<thead><tr><th>ID</th><th>姓名</th><th>位置</th><th>坐标</th>';
        html += '<th>射</th><th>速</th><th>控</th><th>断</th><th>传</th><th>力</th><th>体</th><th>弹</th><th>扑</th>';
        html += '</tr></thead><tbody>';

        team.players.forEach((p, i) => {
            const sel = Game.selectedPlayer === p ? 'selected' : '';
            const ball = p.hasBall ? 'has-ball' : '';
            const sc = (v) => v >= 80 ? 'stat-high' : (v >= 50 ? 'stat-mid' : 'stat-low');
            html += '<tr class="' + sel + ' ' + ball + '" onclick="UI.selectFromList(' + i + ')">';
            html += '<td>' + (i + 1) + '</td>';
            html += '<td style="text-align:left">' + p.name + '</td>';
            html += '<td>' + PositionName[p.position] + '</td>';
            html += '<td>(' + p.x + ',' + p.y + ')</td>';
            if (p.isGoalkeeper) {
                html += '<td>--</td><td class="' + sc(p.speed) + '">' + p.speed + '</td>';
                html += '<td class="' + sc(p.dribble) + '">' + p.dribble + '</td>';
                html += '<td class="' + sc(p.tackle) + '">' + p.tackle + '</td>';
                html += '<td class="' + sc(p.pass) + '">' + p.pass + '</td>';
                html += '<td class="' + sc(p.power) + '">' + p.power + '</td>';
                html += '<td class="' + sc(p.physique) + '">' + p.physique + '</td>';
                html += '<td class="' + sc(p.jump) + '">' + p.jump + '</td>';
                html += '<td class="' + sc(p.save) + '">' + p.save + '</td>';
            } else {
                html += '<td class="' + sc(p.shoot) + '">' + p.shoot + '</td>';
                html += '<td class="' + sc(p.speed) + '">' + p.speed + '</td>';
                html += '<td class="' + sc(p.dribble) + '">' + p.dribble + '</td>';
                html += '<td class="' + sc(p.tackle) + '">' + p.tackle + '</td>';
                html += '<td class="' + sc(p.pass) + '">' + p.pass + '</td>';
                html += '<td class="' + sc(p.power) + '">' + p.power + '</td>';
                html += '<td class="' + sc(p.physique) + '">' + p.physique + '</td>';
                html += '<td class="' + sc(p.jump) + '">' + p.jump + '</td>';
                html += '<td>--</td>';
            }
            html += '</tr>';
        });
        html += '</tbody>';
        table.innerHTML = html;
    },

    selectFromList(index) {
        const eng = Game.engine;
        const team = eng.currentTeam === Game.viewSide ? eng.getCurrentTeam() : eng.getTeam(1 - eng.currentTeam);
        const p = team.players[index];
        if (p) {
            Game.selectedPlayer = p;
            this.showPlayerCard(p);
            this.renderField();
            this.renderPlayerList();
        }
    },

    toggleSide() {
        Game.viewSide = 1 - Game.viewSide;
        this.renderPlayerList();
    },

    // ===== 球员属性卡片 =====
    showPlayerCard(p) {
        document.getElementById('playerCard').classList.remove('hidden');
        document.getElementById('cardTitle').textContent = p.name + ' - ' + PositionName[p.position];

        const eng = Game.engine;
        const eval_ = eng.evaluatePlayer(p);
        const isCurrent = p.teamId === eng.currentTeam;

        let html = '';

        // 基础信息
        html += '<div style="margin-bottom:8px;color:#a0a0b0;font-size:13px">';
        html += '坐标: (' + p.x + ', ' + p.y + ') | Lv.' + p.level + ' Exp:' + p.exp;
        if (p.hasBall) html += ' | <span style="color:#4ecca3;font-weight:bold">● 持球中</span>';
        if (!isCurrent) html += ' | <span style="color:#e94560">非当前回合方</span>';
        html += '</div>';

        // 属性条
        const stats = p.isGoalkeeper
            ? [['扑救', p.save], ['速度', p.speed], ['控球', p.dribble], ['抢断', p.tackle], ['传球', p.pass], ['力量', p.power], ['身体', p.physique], ['弹跳', p.jump]]
            : [['射门', p.shoot], ['速度', p.speed], ['控球', p.dribble], ['抢断', p.tackle], ['传球', p.pass], ['力量', p.power], ['身体', p.physique], ['弹跳', p.jump]];

        for (const [label, val] of stats) {
            const cls = val >= 80 ? 'high' : (val >= 50 ? 'mid' : 'low');
            html += '<div class="stat-row">';
            html += '<span class="stat-label">' + label + '</span>';
            html += '<div class="stat-bar-bg"><div class="stat-bar-fill ' + cls + '" style="width:' + val + '%"></div></div>';
            html += '<span class="stat-value">' + val + '</span>';
            html += '</div>';
        }

        // 派生信息
        const ap = eng.getActionPoints();
        const moveRange = p.getMoveRange();
        const actualMove = Math.min(moveRange, ap);
        const moveColor = ap === 0 ? '#e94560' : (ap < moveRange ? '#f0a500' : '#4ecca3');
        html += '<div style="margin-top:8px;font-size:13px;color:#a0a0b0">';
        html += '速度: ' + moveRange + '格 | 传球免耗: ' + p.getFreePassDistance() + '格';
        html += '</div>';
        html += '<div style="font-size:13px;color:' + moveColor + '">';
        html += '当前AP: ' + ap + ' | 可移动: ' + actualMove + '格';
        if (ap < moveRange && ap > 0) html += ' (AP不足, 少走' + (moveRange - actualMove) + '格)';
        if (ap === 0) html += ' (无AP, 无法行动)';
        html += '</div>';

        // 射门分析
        if (!p.isGoalkeeper) {
            const gk = eng.getTeam(1 - p.teamId).getGoalkeeper();
            if (gk) {
                const d = p.shoot - gk.save;
                const rate = eng.getShootSuccessRate(d);
                const shootColor = rate >= 65 ? '#4ecca3' : (rate >= 45 ? '#f0a500' : '#e94560');
                html += '<div style="font-size:13px;color:' + shootColor + '">vs门将 D=' + d + ' 成功率' + rate + '%' + (ap >= 3 ? '' : ' (AP不足射门)') + '</div>';
            }
        }

        // 传球目标列表
        if (p.hasBall && isCurrent) {
            const passTargets = eng.getValidPassTargets(p);
            if (passTargets.length > 0) {
                html += '<div style="margin-top:8px;font-size:12px;color:#a0a0b0;border-top:1px solid #333;padding-top:6px">';
                html += '可传球目标:';
                html += '</div>';
                for (const t of passTargets) {
                    const color = t.affordable ? '#4ecca3' : '#888';
                    const strike = t.affordable ? '' : 'text-decoration:line-through;opacity:0.5;';
                    html += '<div style="font-size:12px;color:' + color + ';padding:2px 0;' + strike + '">';
                    html += '  ' + t.player.name + ' [' + PositionName[t.player.position] + ']';
                    html += ' 距' + t.distance + '格 需' + t.cost + 'AP';
                    if (!t.affordable) html += ' (AP不足)';
                    html += '</div>';
                }
            }
        }

        // 抢断目标列表
        if (!p.hasBall && isCurrent) {
            const opp = eng.getTeam(1 - eng.currentTeam);
            const tackleTargets = opp.players.filter(op => op.hasBall && p.manhattanDist(op.x, op.y) <= 2);
            if (tackleTargets.length > 0) {
                html += '<div style="margin-top:8px;font-size:12px;color:#a0a0b0;border-top:1px solid #333;padding-top:6px">';
                html += '可抢断目标:';
                html += '</div>';
                for (const op of tackleTargets) {
                    const d = (p.tackle + p.power * 0.1) - (op.dribble + op.physique * 0.1);
                    let rate = eng.getTackleSuccessRate(d);
                    const physMod = eng.getPhysiqueModifier(p.physique, op.physique);
                    rate += physMod;
                    rate = Math.max(5, Math.min(95, rate));
                    const color = rate >= 60 ? '#4ecca3' : (rate >= 40 ? '#f0a500' : '#e94560');
                    html += '<div style="font-size:12px;color:' + color + ';padding:2px 0">';
                    html += '  ' + op.name + ' 距' + p.manhattanDist(op.x, op.y) + '格';
                    html += ' D=' + d + ' 身体' + (physMod > 0 ? '+' : '') + physMod + '%';
                    html += ' 率' + rate + '%' + (ap >= 2 ? '' : ' (AP不足)');
                    html += '</div>';
                }
            }
        }

        // 评价
        const evalCls = 'eval-' + eval_.stars;
        const stars = '★'.repeat(eval_.stars) + '☆'.repeat(5 - eval_.stars);
        html += '<div style="text-align:center;margin-top:8px"><span class="eval-badge ' + evalCls + '">' + stars + ' ' + eval_.text + '</span></div>';

        document.getElementById('cardBody').innerHTML = html;

        this.renderCardActions();
    },

    renderCardActions() {
        const p = Game.selectedPlayer;
        if (!p) { document.getElementById('cardActions').innerHTML = ''; return; }

        const eng = Game.engine;
        const isCurrent = p.teamId === eng.currentTeam;
        const actions = document.getElementById('cardActions');

        if (!isCurrent) {
            actions.innerHTML = '<span style="color:#888;font-size:13px">非当前回合方，无法操作</span>';
            return;
        }

        const ap = eng.getActionPoints();
        let html = '';
        const mkBtn = (mode, label, enabled, color) => {
            const active = Game.actionMode === mode ? 'active' : '';
            const dis = enabled ? '' : 'disabled';
            const style = color ? ('border-color:' + color + ';') : '';
            html += '<button class="btn btn-action ' + active + '" ' + dis + ' style="' + style + '" onclick="UI.setActionMode(\'' + mode + '\')">' + label + '</button>';
        };

        // 移动
        const canMove = ap > 0 && eng.getValidMoves(p).length > 0;
        mkBtn('move', '移动', canMove, '#4ecca3');

        // 传球
        const canPass = p.hasBall && ap > 0 && eng.getValidPassTargets(p).length > 0;
        mkBtn('pass', '传球', canPass, '#4ecca3');

        // 射门
        const canShoot = p.hasBall && !p.isGoalkeeper && ap >= 3;
        mkBtn('shoot', '射门', canShoot, '#f0a500');

        // 抢断
        const opp = eng.getTeam(1 - eng.currentTeam);
        const canTackle = !p.hasBall && ap >= 2 && opp.players.some(op => op.hasBall && p.manhattanDist(op.x, op.y) <= 2);
        mkBtn('tackle', '抢断', canTackle, '#e94560');

        if (Game.actionMode) {
            html += '<button class="btn btn-action" style="border-color:#888" onclick="UI.cancelAction()">取消</button>';
        }

        actions.innerHTML = html;
    },

    closeCard() {
        document.getElementById('playerCard').classList.add('hidden');
        Game.selectedPlayer = null;
        Game.actionMode = null;
        this.renderPlayerList();
    },

    // ===== 回合控制 =====
    endTurn() {
        const eng = Game.engine;
        this.showConfirm('结束回合？', () => {
            eng.endTurn();
            this.log('轮到 ' + eng.getCurrentTeam().name + ' 行动 (AP:' + eng.getActionPoints() + ')', 'info');
            this.checkHalfTime();
            this.renderAll();
        });
    },

    // ===== 日志 =====
    log(msg, type) {
        type = type || 'info';
        this.logEntries.push({ msg, type });
        if (this.logEntries.length > 50) this.logEntries.shift();

        const body = document.getElementById('logBody');
        let html = '';
        for (const e of this.logEntries) {
            html += '<div class="log-entry ' + e.type + '">' + e.msg + '</div>';
        }
        body.innerHTML = html;
        body.scrollTop = body.scrollHeight;
    },

    clearLog() {
        this.logEntries = [];
        document.getElementById('logBody').innerHTML = '';
    },

    // ===== 全部渲染 =====
    renderAll() {
        this.renderTopbar();
        this.renderField();
        this.renderPlayerList();
        if (Game.selectedPlayer) this.showPlayerCard(Game.selectedPlayer);
    },

    onGameReady() {
        this.renderAll();
        this.log('比赛开始！主队开球', 'info');
        this.log('点击球员选择 | 选择行动按钮 | 点击高亮格子执行', 'info');
    },

    // ===== 模态框 =====
    showModal(title, content) {
        const modal = document.getElementById('modal');
        const c = document.getElementById('modalContent');
        c.innerHTML = '<h2>' + title + '</h2><p>' + content + '</p><button class="btn" onclick="UI.closeModalDirect()">确定</button>';
        modal.classList.remove('hidden');
    },

    showConfirm(msg, onConfirm) {
        const modal = document.getElementById('modal');
        const c = document.getElementById('modalContent');
        c.innerHTML = '<h2>确认</h2><p>' + msg + '</p><div style="text-align:center"><button class="btn" id="confirmYes" style="margin-right:10px">确定</button><button class="btn btn-danger" id="confirmNo">取消</button></div>';
        modal.classList.remove('hidden');
        document.getElementById('confirmYes').onclick = () => { this.closeModalDirect(); onConfirm(); };
        document.getElementById('confirmNo').onclick = () => this.closeModalDirect();
    },

    closeModal(e) {
        if (e.target === document.getElementById('modal')) {
            document.getElementById('modal').classList.add('hidden');
        }
    },

    closeModalDirect() {
        document.getElementById('modal').classList.add('hidden');
    },

    showHelp() {
        this.showModal('操作帮助', `
            <b>基本操作</b><br>
            1. 点击球场上的球员 → 选中并显示属性卡<br>
            2. 属性卡底部点击行动按钮（移动/传球/射门/抢断）<br>
            3. 球场上高亮格子为可执行目标，点击执行<br>
            4. 右键或点击取消按钮退出行动模式<br><br>
            <b>AP消耗</b><br>
            移动: 每格1AP | 传球: ceil(距离/2)AP | 射门: 3AP | 抢断: 2AP<br><br>
            <b>规则</b><br>
            每回合AP随机1~12 | 传球路径L型 | 每半场40回合
        `);
    },

    exitGame() {
        Menu.exitToMenu();
    }
};