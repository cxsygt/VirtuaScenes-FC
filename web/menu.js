// ========================================
// 菜单与球队管理界面
// ========================================

const Menu = {
    currentScreen: 'home',

    init() {
        this.showHome();
    },

    // ===== 首页 =====
    showHome() {
        this.currentScreen = 'home';
        const menuScreen = document.getElementById('menuScreen');
        menuScreen.innerHTML = this.getHomeHTML();
        menuScreen.classList.remove('hidden');
    },

    getHomeHTML() {
        const res = Storage.getResources();
        const teamPlayers = Storage.getTeamPlayers();

        return `
            <div id="homeScreen" class="screen">
                <div class="home-header">
                    <h1 class="game-title">⚽ 足球策略对战</h1>
                    <div class="resources-bar">
                        <div class="res-item"><span class="res-icon">💰</span><span class="res-value">${res.gold}</span><span class="res-label">金币</span></div>
                        <div class="res-item"><span class="res-icon">💵</span><span class="res-value">${res.funds}</span><span class="res-label">资金</span></div>
                        <div class="res-item"><span class="res-icon">🎓</span><span class="res-value">${res.mentorCards}</span><span class="res-label">导师卡</span></div>
                    </div>
                </div>
                <div class="home-menu">
                    <div class="menu-section">
                        <h2>比赛</h2>
                        <button class="menu-btn primary" onclick="Menu.startMatch()">
                            <span class="btn-icon">🏆</span>
                            <span class="btn-text">开始比赛</span>
                            <span class="btn-sub">进入对战模式</span>
                        </button>
                    </div>
                    <div class="menu-section">
                        <h2>球队管理</h2>
                        <button class="menu-btn" onclick="Menu.showTeamManagement()">
                            <span class="btn-icon">👥</span>
                            <span class="btn-text">我的球队</span>
                            <span class="btn-sub">${teamPlayers.length}/11 球员</span>
                        </button>
                        <button class="menu-btn" onclick="Menu.showRecruitMenu()">
                            <span class="btn-icon">🛒</span>
                            <span class="btn-text">招募球员</span>
                            <span class="btn-sub">购买新球员</span>
                        </button>
                    </div>
                    <div class="menu-section">
                        <h2>设置</h2>
                        <button class="menu-btn danger" onclick="Menu.resetGame()">
                            <span class="btn-icon">🔄</span>
                            <span class="btn-text">重置数据</span>
                            <span class="btn-sub">清除所有进度</span>
                        </button>
                    </div>
                </div>
                <div class="home-footer">
                    <p>提示：先招募球员组建球队，再开始比赛</p>
                </div>
            </div>
        `;
    },

    // ===== 重置确认 =====
    resetGame() {
        this.showConfirm('确定重置所有数据？这将清除所有球员、资源和球队！', () => {
            Storage.resetAll();
            this.showToast('数据已重置！', 'success');
            this.showHome();
        });
    },

    // ===== 招募界面（球探系统）=====
    showRecruitMenu() {
        this.currentScreen = 'recruit';
        const menuScreen = document.getElementById('menuScreen');
        menuScreen.innerHTML = this.getRecruitHTML();
        menuScreen.classList.remove('hidden');
        this.scoutResult = null;
    },

    getRecruitHTML() {
        const res = Storage.getResources();
        const goldCost = ScoutConfig.goldCost;
        const fundsCost = ScoutConfig.fundsCost;

        // 球探球员池预览
        const poolHTML = this.getScoutPoolHTML();

        return `
            <div id="recruitScreen" class="screen">
                <div class="screen-header">
                    <button class="back-btn" onclick="Menu.showHome()">← 返回</button>
                    <h2>球探招募</h2>
                    <div class="resources-bar mini">
                        <span>💰 ${res.gold}</span>
                        <span>💵 ${res.funds}</span>
                        <span>🎓 ${res.mentorCards}</span>
                    </div>
                </div>
                <div class="recruit-content">
                    <div class="scout-info">
                        <div class="info-title">常驻球探</div>
                        <div class="info-desc">球探会从下方球员池中随机发现一名球员（共 ${RealPlayers.length} 名）</div>
                    </div>
                    <div class="scout-actions">
                        <button class="scout-btn gold" onclick="Menu.doScout('gold')">
                            <div class="scout-icon">🔍</div>
                            <div class="scout-label">金币球探</div>
                            <div class="scout-cost">💰 ${goldCost}</div>
                        </button>
                        <button class="scout-btn funds" onclick="Menu.doScout('funds')">
                            <div class="scout-icon">🔍</div>
                            <div class="scout-label">资金球探</div>
                            <div class="scout-cost">💵 ${fundsCost}</div>
                        </button>
                    </div>
                    <div id="scoutResult" class="scout-result-area"></div>
                    <div class="scout-pool-section">
                        <div class="pool-header">
                            <h3>球员池预览</h3>
                            <div class="pool-filter">
                                <select id="poolPosFilter" onchange="Menu.filterScoutPool()">
                                    <option value="ALL">全部位置</option>
                                    <option value="GK">门将</option>
                                    <option value="DEF">后卫</option>
                                    <option value="MID">中场</option>
                                    <option value="FWD">前锋</option>
                                </select>
                                <select id="poolSortBy" onchange="Menu.filterScoutPool()">
                                    <option value="total">按总属性</option>
                                    <option value="shoot">按射门</option>
                                    <option value="save">按扑救</option>
                                    <option value="speed">按速度</option>
                                    <option value="dribble">按控球</option>
                                    <option value="tackle">按抢断</option>
                                    <option value="pass">按传球</option>
                                    <option value="power">按力量</option>
                                    <option value="physique">按身体</option>
                                    <option value="jump">按弹跳</option>
                                </select>
                                <select id="poolSortOrder" onchange="Menu.filterScoutPool()">
                                    <option value="desc">降序</option>
                                    <option value="asc">升序</option>
                                </select>
                            </div>
                        </div>
                        <div id="poolGrid" class="pool-grid">${poolHTML}</div>
                    </div>
                </div>
            </div>
        `;
    },

    // 球探球员池筛选与渲染
    getScoutPoolHTML() {
        const posFilter = document.getElementById('poolPosFilter');
        const sortBy = document.getElementById('poolSortBy');
        const sortOrder = document.getElementById('poolSortOrder');
        let list = RealPlayers.slice();
        const pos = posFilter ? posFilter.value : 'ALL';
        const sort = sortBy ? sortBy.value : 'total';
        const order = sortOrder ? sortOrder.value : 'desc';

        if (pos !== 'ALL') {
            list = list.filter(p => p.pos === pos);
        }

        list.sort((a, b) => {
            let va, vb;
            if (sort === 'total') {
                va = PlayerLib.getPlayerTotalAttrs(a);
                vb = PlayerLib.getPlayerTotalAttrs(b);
            } else {
                va = a[sort] || 0;
                vb = b[sort] || 0;
            }
            return order === 'desc' ? vb - va : va - vb;
        });

        return list.map(p => this.getPoolCardHTML(p)).join('');
    },

    getPoolCardHTML(p) {
        const total = PlayerLib.getPlayerTotalAttrs(p);
        const rating = PlayerLib.getPlayerRating(p);
        const attrs = AttrPool[p.pos];
        let attrBars = '';
        for (const attr of attrs) {
            const val = p[attr] || 0;
            const cls = val >= 80 ? 'high' : (val >= 50 ? 'mid' : 'low');
            attrBars += `
                <div class="mini-stat">
                    <span class="mini-stat-label">${AttrNames[attr]}</span>
                    <div class="mini-stat-bar"><div class="mini-stat-fill ${cls}" style="width:${val}%"></div></div>
                    <span class="mini-stat-val">${val}</span>
                </div>
            `;
        }

        return `
            <div class="pool-card grade-${rating.grade.toLowerCase()}">
                <div class="pcd-header">
                    <span class="pcd-grade">${rating.grade} · ${rating.score}</span>
                    <span class="pcd-pos">${PositionName[p.pos]}</span>
                </div>
                <div class="pcd-name">${p.name}</div>
                <div class="pcd-attrs">${attrBars}</div>
                <div class="pcd-total">评分: ${rating.score} | 总属性: ${total}</div>
            </div>
        `;
    },

    filterScoutPool() {
        const grid = document.getElementById('poolGrid');
        if (grid) grid.innerHTML = this.getScoutPoolHTML();
    },

    doScout(paymentType) {
        this._lastPaymentType = paymentType;
        const cost = paymentType === 'funds' ? ScoutConfig.fundsCost : ScoutConfig.goldCost;
        const res = Storage.getResources();

        if (paymentType === 'funds' && res.funds < cost) {
            this.showToast('资金不足！', 'error');
            return;
        }
        if (paymentType === 'gold' && res.gold < cost) {
            this.showToast('金币不足！', 'error');
            return;
        }

        const scoutRes = PlayerLib.scoutPlayer(paymentType);
        this.showToast(scoutRes.message, scoutRes.success ? 'success' : 'error');

        if (scoutRes.success) {
            this.scoutResult = scoutRes.player;
            this.renderScoutResult(scoutRes.player);

            // 自动加入球队
            const team = Storage.getTeam();
            if (team.playerIds.length < 11) {
                Storage.addPlayerToTeam(scoutRes.player.id);
                this.showToast('球员已自动加入球队！', 'success');
            } else {
                this.showToast('球队已满员，球员暂存于球员库', 'warning');
            }
        }

        // 刷新资源显示
        const resourceEls = document.querySelectorAll('.resources-bar.mini span');
        if (resourceEls.length >= 3) {
            const updatedRes = Storage.getResources();
            resourceEls[0].textContent = '💰 ' + updatedRes.gold;
            resourceEls[1].textContent = '💵 ' + updatedRes.funds;
            resourceEls[2].textContent = '🎓 ' + updatedRes.mentorCards;
        }
    },

    renderScoutResult(player) {
        const area = document.getElementById('scoutResult');
        if (!area || !player) return;

        const rating = PlayerLib.getPlayerRating(player);
        const totalAttrs = PlayerLib.getPlayerTotalAttrs(player);
        const attrs = AttrPool[player.position];

        let attrBars = '';
        for (const attr of attrs) {
            const val = player[attr] || 0;
            const cls = val >= 80 ? 'high' : (val >= 50 ? 'mid' : 'low');
            attrBars += `
                <div class="mini-stat">
                    <span class="mini-stat-label">${AttrNames[attr]}</span>
                    <div class="mini-stat-bar"><div class="mini-stat-fill ${cls}" style="width:${val}%"></div></div>
                    <span class="mini-stat-val">${val}</span>
                </div>
            `;
        }

        area.innerHTML = `
            <div class="scout-result-card grade-${rating.grade.toLowerCase()}">
                <div class="src-header">
                    <span class="src-grade">${rating.grade} · ${rating.score}分 ${rating.text}</span>
                    <span class="src-badge">新发现</span>
                </div>
                <div class="src-name">${player.name}</div>
                <div class="src-pos">${PositionName[player.position]}</div>
                <div class="src-attrs">${attrBars}</div>
                <div class="src-total">评分: ${rating.score} | 总属性: ${totalAttrs}</div>
                <div class="src-actions">
                    <button class="btn-recruit-again" onclick="Menu.doScout('${this._lastPaymentType || 'gold'}')">再次球探</button>
                    <button class="btn-team" onclick="Menu.showTeamManagement()">查看球队</button>
                </div>
            </div>
        `;
    },

    // ===== 球队管理 =====
    showTeamManagement() {
        this.currentScreen = 'team';
        const menuScreen = document.getElementById('menuScreen');
        menuScreen.innerHTML = this.getTeamHTML();
        menuScreen.classList.remove('hidden');
        this.bindTeamEvents();
    },

    getTeamHTML() {
        const res = Storage.getResources();
        const team = Storage.getTeam();
        const teamPlayers = Storage.getTeamPlayers();
        const allPlayers = Storage.getPlayers();

        let html = `
            <div id="teamScreen" class="screen">
                <div class="screen-header">
                    <button class="back-btn" onclick="Menu.showHome()">← 返回</button>
                    <h2>${team.name} (${teamPlayers.length}/11)</h2>
                    <div class="resources-bar mini">
                        <span>💰 ${res.gold}</span>
                        <span>🎓 ${res.mentorCards}</span>
                    </div>
                </div>
                <div class="team-tabs">
                    <button class="tab-btn active" data-tab="team">球队成员 (${teamPlayers.length})</button>
                    <button class="tab-btn" data-tab="bench">球员库 (${allPlayers.length})</button>
                </div>
                <div class="team-content" id="teamContent">
                    ${this.getTeamRosterHTML(teamPlayers)}
                </div>
            </div>
        `;
        return html;
    },

    getTeamRosterHTML(teamPlayers) {
        if (teamPlayers.length === 0) {
            return '<div class="empty-state"><p>球队暂无球员</p><p>请先前往招募界面购买球员</p></div>';
        }
        return `
            <div class="player-grid">
                ${teamPlayers.map(p => this.getPlayerCardHTML(p, true)).join('')}
            </div>
        `;
    },

    getBenchHTML(allPlayers, teamPlayerIds) {
        const benchPlayers = allPlayers.filter(p => !teamPlayerIds.includes(p.id));
        if (benchPlayers.length === 0) {
            return '<div class="empty-state"><p>球员库为空</p></div>';
        }
        return `
            <div class="player-grid">
                ${benchPlayers.map(p => this.getPlayerCardHTML(p, false)).join('')}
            </div>
        `;
    },

    getPlayerCardHTML(p, inTeam) {
        const rating = PlayerLib.getPlayerRating(p);
        const totalAttrs = PlayerLib.getPlayerTotalAttrs(p);
        const upgradeInfo = PlayerLib.getUpgradeCost(p.level);
        const canUpgrade = upgradeInfo && Storage.getResources().mentorCards >= upgradeInfo;
        const milestoneHint = PlayerLib.getUpgradeMilestoneHint(p.level);

        const attrs = AttrPool[p.position];
        let attrBars = '';
        for (const attr of attrs) {
            const val = p[attr] || 0;
            const cls = val >= 80 ? 'high' : (val >= 50 ? 'mid' : 'low');
            attrBars += `
                <div class="mini-stat">
                    <span class="mini-stat-label">${AttrNames[attr]}</span>
                    <div class="mini-stat-bar"><div class="mini-stat-fill ${cls}" style="width:${val}%"></div></div>
                    <span class="mini-stat-val">${val}</span>
                </div>
            `;
        }

        return `
            <div class="player-card-detailed grade-${rating.grade.toLowerCase()}">
                <div class="pcd-header">
                    <span class="pcd-grade">${rating.grade} · ${rating.score}</span>
                    <span class="pcd-level">Lv.${p.level}</span>
                </div>
                <div class="pcd-name">${p.name}</div>
                <div class="pcd-pos">${PositionName[p.position]}</div>
                <div class="pcd-attrs">${attrBars}</div>
                <div class="pcd-total">评分: ${rating.score} | 总属性: ${totalAttrs}</div>
                ${milestoneHint ? `<div class="pcd-hint">💡 ${milestoneHint}</div>` : ''}
                <div class="pcd-actions">
                    ${p.level < MAX_LEVEL ? `
                        <button class="btn-upgrade" ${canUpgrade ? '' : 'disabled'} onclick="Menu.doUpgrade('${p.id}')">
                            升级 (需${upgradeInfo}🎓)
                        </button>
                    ` : '<div class="pcd-max">已满级</div>'}
                    ${inTeam ? `
                        <button class="btn-remove" onclick="Menu.removeFromTeam('${p.id}')">移出球队</button>
                    ` : `
                        <button class="btn-add" onclick="Menu.addToTeam('${p.id}')">加入球队</button>
                    `}
                    <button class="btn-sell" onclick="Menu.doSell('${p.id}')">出售</button>
                </div>
            </div>
        `;
    },

    bindTeamEvents() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.tab;
                const team = Storage.getTeam();
                const allPlayers = Storage.getPlayers();
                const content = document.getElementById('teamContent');
                if (tab === 'team') {
                    content.innerHTML = this.getTeamRosterHTML(Storage.getTeamPlayers());
                } else {
                    content.innerHTML = this.getBenchHTML(allPlayers, team.playerIds);
                }
            });
        });
    },

    doUpgrade(playerId) {
        const player = Storage.getPlayers().find(p => p.id === playerId);
        if (!player) return;

        const nextLevel = player.level + 1;
        if (nextLevel === 15 || nextLevel === 20) {
            const pool = AttrPool[player.position];
            const choice = prompt('升级到' + nextLevel + '级！\n请选择要增加的属性:\n' +
                pool.map((a, i) => (i + 1) + '. ' + AttrNames[a] + '(当前' + player[a] + ')').join('\n') +
                '\n\n输入编号:');
            if (choice === null) return;
            const idx = parseInt(choice) - 1;
            if (idx >= 0 && idx < pool.length) {
                const attr = pool[idx];
                if (player[attr] >= 100) {
                    this.showToast(AttrNames[attr] + '已满值，请选其他属性', 'warning');
                    return;
                }
                const res = PlayerLib.upgradePlayer(playerId, attr);
                this.showToast(res.message, res.success ? 'success' : 'error');
                if (res.success) this.showTeamManagement();
            } else {
                this.showToast('无效选择', 'error');
            }
        } else {
            const res = PlayerLib.upgradePlayer(playerId);
            this.showToast(res.message, res.success ? 'success' : 'error');
            if (res.success) this.showTeamManagement();
        }
    },

    addToTeam(playerId) {
        const team = Storage.getTeam();
        if (team.playerIds.length >= 11) {
            this.showToast('球队已满员(11人)', 'warning');
            return;
        }
        if (Storage.addPlayerToTeam(playerId)) {
            this.showToast('已加入球队', 'success');
            this.showTeamManagement();
        }
    },

    removeFromTeam(playerId) {
        if (Storage.removePlayerFromTeam(playerId)) {
            this.showToast('已移出球队', 'success');
            this.showTeamManagement();
        }
    },

    doSell(playerId) {
        this.showConfirm('确定出售此球员？', () => {
            const res = PlayerLib.sellPlayer(playerId);
            this.showToast(res.message, res.success ? 'success' : 'error');
            if (res.success) this.showTeamManagement();
        });
    },

    // ===== 开始比赛 =====
    startMatch() {
        const team = Storage.getTeam();
        if (team.playerIds.length < 11) {
            this.showToast('球队需要11名球员才能开始比赛！\n当前: ' + team.playerIds.length + '/11', 'error');
            return;
        }

        document.getElementById('menuScreen').classList.add('hidden');
        document.getElementById('matchScreen').classList.remove('hidden');

        if (typeof UI !== 'undefined') {
            UI.init();
        }
        if (typeof Game !== 'undefined') {
            Game.init();
        }
        if (typeof UI !== 'undefined') {
            UI.onGameReady();
        }
    },

    // 从比赛返回主菜单
    exitToMenu() {
        if (typeof UI !== 'undefined') {
            UI.clearLog();
        }
        document.getElementById('matchScreen').classList.add('hidden');
        document.getElementById('menuScreen').classList.remove('hidden');
        this.showHome();
    },

    // ===== 提示框 =====
    showToast(message, type) {
        type = type || 'info';
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:8px;font-size:14px;font-weight:bold;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3);transition:all 0.3s ease;max-width:400px;text-align:center;';
        const colors = { success: '#4ecca3', error: '#e94560', info: '#0f3460', warning: '#f0a500' };
        const textColors = { success: '#000', error: '#fff', info: '#fff', warning: '#000' };
        toast.style.background = colors[type] || colors.info;
        toast.style.color = textColors[type] || '#fff';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    },

    // ===== 确认框 =====
    showConfirm(message, onConfirm) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9998;';
        const content = document.createElement('div');
        content.style.cssText = 'background:#16213e;border:2px solid #4ecca3;border-radius:12px;padding:30px;max-width:400px;text-align:center;';
        content.innerHTML = '<p style="margin-bottom:20px;font-size:16px;color:#fff;">' + message + '</p>' +
            '<div style="display:flex;gap:15px;justify-content:center;">' +
            '<button style="padding:8px 20px;background:#4ecca3;color:#000;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">确定</button>' +
            '<button style="padding:8px 20px;background:#333;color:#fff;border:none;border-radius:6px;cursor:pointer;">取消</button>' +
            '</div>';
        modal.appendChild(content);
        document.body.appendChild(modal);
        const cleanup = () => modal.remove();
        const btns = content.querySelectorAll('button');
        btns[0].onclick = () => { cleanup(); onConfirm(); };
        btns[1].onclick = cleanup;
        modal.onclick = (e) => { if (e.target === modal) cleanup(); };
    }
};
