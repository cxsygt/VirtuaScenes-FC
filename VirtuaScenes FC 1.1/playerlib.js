// ========================================
// 球员库 - 星级分类、属性生成、等级升级
// ========================================

const ScoutConfig = {
    goldCost: 100,
    fundsCost: 10000
};

const MAX_LEVEL = 20;

// 属性池（按位置分）
const AttrPool = {
    GK: ['save', 'speed', 'dribble', 'tackle', 'pass', 'power', 'physique', 'jump'],
    DEF: ['shoot', 'speed', 'dribble', 'tackle', 'pass', 'power', 'physique', 'jump'],
    MID: ['shoot', 'speed', 'dribble', 'tackle', 'pass', 'power', 'physique', 'jump'],
    FWD: ['shoot', 'speed', 'dribble', 'tackle', 'pass', 'power', 'physique', 'jump']
};

const AttrNames = {
    shoot: '射门',
    save: '扑救',
    speed: '速度',
    dribble: '控球',
    tackle: '抢断',
    pass: '传球',
    power: '力量',
    physique: '身体',
    jump: '弹跳'
};

const AttrWeights = {
    // 各位置属性权重（影响初始分配倾向）
    GK: { save: 3, speed: 1, dribble: 1, tackle: 2, pass: 1, power: 2, physique: 2, jump: 3 },
    DEF: { shoot: 1, speed: 2, dribble: 2, tackle: 3, pass: 2, power: 2, physique: 3, jump: 2 },
    MID: { shoot: 2, speed: 3, dribble: 3, tackle: 2, pass: 3, power: 2, physique: 2, jump: 1 },
    FWD: { shoot: 3, speed: 3, dribble: 3, tackle: 1, pass: 2, power: 3, physique: 2, jump: 2 }
};

// 各位置评分权重（权重和为1，用于计算球员"价值"评分）
const PositionScoreWeights = {
    // 门将：扑救为主，辅以传球、抢断、弹跳、身体
    GK: { save: 0.40, pass: 0.20, tackle: 0.20, jump: 0.10, physique: 0.10 },
    // 后卫：抢断、身体为核心，传球、速度、力量、弹跳辅助
    DEF: { tackle: 0.30, physique: 0.20, pass: 0.15, speed: 0.15, power: 0.10, jump: 0.10 },
    // 中场：传球、控球为核心，速度、抢断、射门辅助
    MID: { pass: 0.30, dribble: 0.25, speed: 0.15, tackle: 0.15, shoot: 0.15 },
    // 前锋：射门、控球、速度为核心，力量、传球辅助
    FWD: { shoot: 0.35, dribble: 0.20, speed: 0.20, power: 0.15, pass: 0.10 }
};

// ===== 真实球员库（112名）=====
const RealPlayers = [
    {name:"维尼修斯",pos:"FWD",shoot:83,save:0,speed:90,dribble:85,tackle:65,pass:75,power:81,physique:77,jump:71},
    {name:"阿什拉夫",pos:"DEF",shoot:74,save:0,speed:87,dribble:79,tackle:78,pass:85,power:75,physique:84,jump:76},
    {name:"基米希",pos:"DEF",shoot:76,save:0,speed:73,dribble:81,tackle:76,pass:91,power:87,physique:82,jump:74},
    {name:"多纳鲁马",pos:"GK",shoot:0,save:93,speed:71,dribble:67,tackle:69,pass:73,power:86,physique:88,jump:95},
    {name:"热苏斯",pos:"FWD",shoot:86,save:0,speed:83,dribble:84,tackle:72,pass:80,power:78,physique:82,jump:77},
    {name:"内马尔",pos:"FWD",shoot:82,save:0,speed:84,dribble:91,tackle:67,pass:82,power:85,physique:73,jump:72},
    {name:"阿利松",pos:"GK",shoot:0,save:92,speed:72,dribble:73,tackle:75,pass:81,power:80,physique:85,jump:92},
    {name:"德布劳内",pos:"MID",shoot:84,save:0,speed:80,dribble:82,tackle:74,pass:93,power:85,physique:81,jump:76},
    {name:"马基尼奥斯",pos:"DEF",shoot:68,save:0,speed:81,dribble:74,tackle:90,pass:83,power:83,physique:87,jump:83},
    {name:"特奥",pos:"DEF",shoot:73,save:0,speed:85,dribble:83,tackle:80,pass:85,power:80,physique:83,jump:78},
    {name:"芒特",pos:"MID",shoot:81,save:0,speed:83,dribble:81,tackle:78,pass:84,power:88,physique:85,jump:79},
    {name:"奥斯梅恩",pos:"FWD",shoot:88,save:0,speed:87,dribble:75,tackle:70,pass:76,power:84,physique:91,jump:85},
    {name:"萨卡",pos:"FWD",shoot:86,save:0,speed:85,dribble:83,tackle:67,pass:77,power:79,physique:78,jump:67},
    {name:"坎塞洛",pos:"DEF",shoot:76,save:0,speed:81,dribble:80,tackle:74,pass:87,power:81,physique:80,jump:77},
    {name:"凯恩",pos:"FWD",shoot:92,save:0,speed:78,dribble:82,tackle:66,pass:84,power:89,physique:84,jump:86},
    {name:"吕迪格",pos:"DEF",shoot:71,save:0,speed:83,dribble:73,tackle:92,pass:75,power:82,physique:89,jump:87},
    {name:"佩德里",pos:"MID",shoot:79,save:0,speed:78,dribble:83,tackle:77,pass:83,power:86,physique:75,jump:71},
    {name:"阿诺德",pos:"DEF",shoot:76,save:0,speed:84,dribble:79,tackle:75,pass:90,power:90,physique:82,jump:77},
    {name:"洛里",pos:"GK",shoot:0,save:90,speed:74,dribble:68,tackle:72,pass:73,power:82,physique:86,jump:91},
    {name:"穆夏拉",pos:"MID",shoot:77,save:0,speed:79,dribble:87,tackle:68,pass:86,power:84,physique:73,jump:81},
    {name:"什克里尼亚",pos:"DEF",shoot:67,save:0,speed:78,dribble:72,tackle:88,pass:78,power:77,physique:91,jump:89},
    {name:"登贝莱",pos:"FWD",shoot:81,save:0,speed:85,dribble:88,tackle:71,pass:84,power:76,physique:75,jump:74},
    {name:"莱万",pos:"FWD",shoot:94,save:0,speed:79,dribble:80,tackle:64,pass:78,power:91,physique:82,jump:85},
    {name:"瓦拉内",pos:"DEF",shoot:68,save:0,speed:85,dribble:80,tackle:90,pass:82,power:79,physique:86,jump:88},
    {name:"姆巴佩",pos:"FWD",shoot:90,save:0,speed:91,dribble:81,tackle:67,pass:77,power:83,physique:84,jump:79},
    {name:"扎卡",pos:"MID",shoot:77,save:0,speed:75,dribble:78,tackle:83,pass:82,power:87,physique:87,jump:80},
    {name:"尼德高",pos:"MID",shoot:81,save:0,speed:77,dribble:82,tackle:74,pass:87,power:79,physique:78,jump:76},
    {name:"范戴克",pos:"DEF",shoot:72,save:0,speed:80,dribble:74,tackle:90,pass:83,power:75,physique:89,jump:89},
    {name:"莫德里奇",pos:"MID",shoot:83,save:0,speed:76,dribble:83,tackle:76,pass:92,power:87,physique:80,jump:74},
    {name:"哈兰德",pos:"FWD",shoot:93,save:0,speed:86,dribble:76,tackle:68,pass:78,power:83,physique:93,jump:83},
    {name:"巴雷拉",pos:"MID",shoot:74,save:0,speed:81,dribble:81,tackle:80,pass:85,power:85,physique:77,jump:69},
    {name:"鲁本迪亚斯",pos:"DEF",shoot:65,save:0,speed:77,dribble:76,tackle:88,pass:75,power:81,physique:89,jump:88},
    {name:"拉比奥",pos:"MID",shoot:73,save:0,speed:80,dribble:81,tackle:80,pass:84,power:82,physique:83,jump:81},
    {name:"莱奥",pos:"FWD",shoot:85,save:0,speed:86,dribble:86,tackle:67,pass:79,power:83,physique:84,jump:82},
    {name:"蒂亚戈席尔瓦",pos:"DEF",shoot:69,save:0,speed:79,dribble:76,tackle:94,pass:76,power:75,physique:86,jump:85},
    {name:"孙兴慜",pos:"FWD",shoot:88,save:0,speed:87,dribble:84,tackle:71,pass:77,power:85,physique:78,jump:76},
    {name:"诺伊尔",pos:"GK",shoot:0,save:94,speed:77,dribble:76,tackle:80,pass:76,power:82,physique:86,jump:90},
    {name:"福登",pos:"MID",shoot:86,save:0,speed:81,dribble:85,tackle:74,pass:83,power:80,physique:75,jump:74},
    {name:"卡塞米罗",pos:"MID",shoot:77,save:0,speed:78,dribble:83,tackle:86,pass:82,power:84,physique:85,jump:79},
    {name:"库尔图瓦",pos:"GK",shoot:0,save:93,speed:75,dribble:68,tackle:67,pass:78,power:85,physique:85,jump:96},
    {name:"德容",pos:"MID",shoot:78,save:0,speed:80,dribble:84,tackle:81,pass:82,power:79,physique:80,jump:76},
    {name:"萨拉赫",pos:"FWD",shoot:83,save:0,speed:86,dribble:88,tackle:67,pass:81,power:80,physique:79,jump:73},
    {name:"德保罗",pos:"MID",shoot:72,save:0,speed:76,dribble:82,tackle:84,pass:80,power:85,physique:88,jump:83},
    {name:"梅西",pos:"FWD",shoot:86,save:0,speed:82,dribble:90,tackle:64,pass:88,power:82,physique:74,jump:65},
    {name:"德赫亚",pos:"GK",shoot:0,save:92,speed:75,dribble:72,tackle:74,pass:73,power:84,physique:83,jump:92},
    {name:"格雷茨卡",pos:"MID",shoot:81,save:0,speed:78,dribble:77,tackle:82,pass:81,power:87,physique:86,jump:85},
    {name:"拉什福德",pos:"FWD",shoot:80,save:0,speed:88,dribble:85,tackle:71,pass:78,power:85,physique:84,jump:81},
    {name:"本泽马",pos:"FWD",shoot:93,save:0,speed:80,dribble:83,tackle:72,pass:81,power:86,physique:85,jump:88},
    {name:"京多安",pos:"MID",shoot:75,save:0,speed:77,dribble:79,tackle:78,pass:85,power:84,physique:80,jump:76},
    {name:"劳塔罗",pos:"FWD",shoot:83,save:0,speed:82,dribble:77,tackle:68,pass:81,power:84,physique:81,jump:80},
    {name:"阿尔巴",pos:"DEF",shoot:72,save:0,speed:80,dribble:79,tackle:81,pass:87,power:77,physique:82,jump:75},
    {name:"埃德森",pos:"GK",shoot:0,save:88,speed:72,dribble:71,tackle:69,pass:78,power:83,physique:83,jump:89},
    {name:"米利克",pos:"FWD",shoot:86,save:0,speed:81,dribble:75,tackle:71,pass:74,power:80,physique:81,jump:86},
    {name:"克瓦拉茨赫利亚",pos:"FWD",shoot:78,save:0,speed:83,dribble:85,tackle:68,pass:79,power:78,physique:76,jump:77},
    {name:"阿劳霍",pos:"DEF",shoot:66,save:0,speed:80,dribble:72,tackle:87,pass:76,power:77,physique:81,jump:86},
    {name:"B费",pos:"MID",shoot:79,save:0,speed:81,dribble:82,tackle:74,pass:84,power:80,physique:72,jump:75},
    {name:"舒波莫廷",pos:"FWD",shoot:85,save:0,speed:76,dribble:77,tackle:67,pass:81,power:79,physique:82,jump:84},
    {name:"琼阿梅尼",pos:"MID",shoot:76,save:0,speed:74,dribble:78,tackle:85,pass:79,power:81,physique:88,jump:82},
    {name:"萨利巴",pos:"DEF",shoot:67,save:0,speed:79,dribble:73,tackle:89,pass:76,power:75,physique:85,jump:89},
    {name:"阿拉巴",pos:"DEF",shoot:74,save:0,speed:77,dribble:75,tackle:84,pass:81,power:82,physique:83,jump:84},
    {name:"埃里克森",pos:"MID",shoot:80,save:0,speed:78,dribble:82,tackle:73,pass:90,power:85,physique:78,jump:74},
    {name:"努涅斯",pos:"FWD",shoot:81,save:0,speed:88,dribble:82,tackle:66,pass:75,power:76,physique:82,jump:85},
    {name:"法比尼奥",pos:"MID",shoot:74,save:0,speed:79,dribble:74,tackle:83,pass:81,power:78,physique:84,jump:83},
    {name:"加维",pos:"MID",shoot:78,save:0,speed:82,dribble:80,tackle:79,pass:80,power:81,physique:77,jump:73},
    {name:"佩里西奇",pos:"FWD",shoot:79,save:0,speed:79,dribble:77,tackle:74,pass:86,power:85,physique:78,jump:77},
    {name:"斯通斯",pos:"DEF",shoot:72,save:0,speed:81,dribble:73,tackle:83,pass:82,power:78,physique:85,jump:86},
    {name:"哲科",pos:"FWD",shoot:85,save:0,speed:73,dribble:75,tackle:69,pass:80,power:77,physique:82,jump:88},
    {name:"布罗佐维奇",pos:"MID",shoot:76,save:0,speed:78,dribble:77,tackle:81,pass:83,power:80,physique:77,jump:76},
    {name:"萨内",pos:"FWD",shoot:80,save:0,speed:85,dribble:83,tackle:72,pass:76,power:78,physique:79,jump:81},
    {name:"科斯蒂奇",pos:"FWD",shoot:77,save:0,speed:84,dribble:78,tackle:73,pass:84,power:86,physique:76,jump:76},
    {name:"帕瓦尔",pos:"DEF",shoot:73,save:0,speed:76,dribble:77,tackle:80,pass:82,power:85,physique:81,jump:83},
    {name:"埃尔马斯",pos:"MID",shoot:82,save:0,speed:80,dribble:79,tackle:71,pass:78,power:84,physique:77,jump:73},
    {name:"马丁内利",pos:"FWD",shoot:83,save:0,speed:83,dribble:82,tackle:68,pass:77,power:75,physique:75,jump:78},
    {name:"罗梅逊",pos:"DEF",shoot:75,save:0,speed:84,dribble:76,tackle:82,pass:81,power:79,physique:78,jump:77},
    {name:"卡拉布里亚",pos:"DEF",shoot:72,save:0,speed:81,dribble:77,tackle:80,pass:79,power:82,physique:79,jump:76},
    {name:"梅雷特",pos:"GK",shoot:0,save:87,speed:75,dribble:66,tackle:73,pass:72,power:74,physique:87,jump:91},
    {name:"巴尔韦德",pos:"MID",shoot:81,save:0,speed:80,dribble:79,tackle:79,pass:75,power:89,physique:80,jump:84},
    {name:"乌帕梅卡诺",pos:"DEF",shoot:71,save:0,speed:76,dribble:74,tackle:84,pass:77,power:75,physique:88,jump:85},
    {name:"罗德里戈",pos:"FWD",shoot:84,save:0,speed:83,dribble:85,tackle:66,pass:79,power:76,physique:74,jump:69},
    {name:"戴维斯",pos:"DEF",shoot:74,save:0,speed:87,dribble:78,tackle:78,pass:81,power:81,physique:77,jump:79},
    {name:"B席",pos:"MID",shoot:80,save:0,speed:79,dribble:83,tackle:73,pass:85,power:81,physique:72,jump:70},
    {name:"卡卢卢",pos:"DEF",shoot:73,save:0,speed:82,dribble:73,tackle:88,pass:79,power:76,physique:86,jump:82},
    {name:"邓弗里斯",pos:"DEF",shoot:75,save:0,speed:84,dribble:77,tackle:78,pass:82,power:84,physique:85,jump:83},
    {name:"菲尔米诺",pos:"FWD",shoot:83,save:0,speed:80,dribble:82,tackle:69,pass:82,power:75,physique:79,jump:81},
    {name:"基耶萨",pos:"FWD",shoot:79,save:0,speed:83,dribble:83,tackle:70,pass:80,power:77,physique:76,jump:73},
    {name:"本坦库尔",pos:"MID",shoot:74,save:0,speed:76,dribble:80,tackle:81,pass:83,power:78,physique:80,jump:84},
    {name:"卡卡",pos:"DEF",shoot:70,save:0,speed:78,dribble:72,tackle:86,pass:78,power:80,physique:84,jump:85},
    {name:"吉鲁",pos:"FWD",shoot:84,save:0,speed:75,dribble:78,tackle:67,pass:81,power:79,physique:85,jump:88},
    {name:"格里兹曼",pos:"MID",shoot:79,save:0,speed:82,dribble:84,tackle:71,pass:84,power:83,physique:74,jump:75},
    {name:"洛萨诺",pos:"FWD",shoot:81,save:0,speed:87,dribble:79,tackle:68,pass:76,power:81,physique:77,jump:78},
    {name:"巴斯托尼",pos:"DEF",shoot:75,save:0,speed:81,dribble:76,tackle:84,pass:81,power:73,physique:83,jump:86},
    {name:"努诺·门德斯",pos:"DEF",shoot:76,save:0,speed:83,dribble:75,tackle:84,pass:77,power:82,physique:77,jump:79},
    {name:"弗拉霍维奇",pos:"FWD",shoot:82,save:0,speed:82,dribble:77,tackle:72,pass:78,power:81,physique:84,jump:85},
    {name:"科曼",pos:"FWD",shoot:76,save:0,speed:83,dribble:85,tackle:72,pass:75,power:79,physique:78,jump:76},
    {name:"米利唐",pos:"DEF",shoot:72,save:0,speed:77,dribble:74,tackle:86,pass:77,power:77,physique:83,jump:84},
    {name:"莫拉塔",pos:"FWD",shoot:78,save:0,speed:80,dribble:76,tackle:70,pass:82,power:81,physique:80,jump:82},
    {name:"安东尼",pos:"FWD",shoot:78,save:0,speed:81,dribble:83,tackle:65,pass:80,power:86,physique:75,jump:73},
    {name:"迪马利亚",pos:"FWD",shoot:81,save:0,speed:80,dribble:83,tackle:74,pass:82,power:78,physique:76,jump:74},
    {name:"托莫里",pos:"DEF",shoot:74,save:0,speed:84,dribble:72,tackle:86,pass:80,power:75,physique:85,jump:83},
    {name:"帕尔特伊",pos:"MID",shoot:76,save:0,speed:76,dribble:79,tackle:84,pass:78,power:82,physique:88,jump:80},
    {name:"恰尔汗奥卢",pos:"MID",shoot:79,save:0,speed:78,dribble:80,tackle:76,pass:81,power:83,physique:77,jump:78},
    {name:"库库雷利亚",pos:"DEF",shoot:72,save:0,speed:82,dribble:77,tackle:82,pass:83,power:79,physique:83,jump:79},
    {name:"罗梅罗",pos:"DEF",shoot:70,save:0,speed:76,dribble:74,tackle:87,pass:77,power:80,physique:87,jump:84},
    {name:"克罗斯",pos:"MID",shoot:71,save:0,speed:75,dribble:80,tackle:75,pass:88,power:86,physique:74,jump:77},
    {name:"基恩",pos:"FWD",shoot:79,save:0,speed:82,dribble:78,tackle:70,pass:76,power:81,physique:82,jump:80},
    {name:"詹姆斯",pos:"DEF",shoot:78,save:0,speed:83,dribble:76,tackle:75,pass:76,power:88,physique:86,jump:78},
    {name:"拉姆斯戴尔",pos:"GK",shoot:0,save:89,speed:74,dribble:68,tackle:71,pass:73,power:84,physique:85,jump:88},
    {name:"马奎尔",pos:"DEF",shoot:71,save:0,speed:73,dribble:75,tackle:85,pass:78,power:77,physique:90,jump:91},
    {name:"维拉蒂",pos:"MID",shoot:79,save:0,speed:78,dribble:82,tackle:70,pass:83,power:79,physique:82,jump:80},
    {name:"阿斯皮利奎塔",pos:"DEF",shoot:72,save:0,speed:81,dribble:77,tackle:84,pass:76,power:81,physique:89,jump:88},
    {name:"托纳利",pos:"MID",shoot:74,save:0,speed:80,dribble:81,tackle:73,pass:82,power:80,physique:81,jump:79},
    {name:"加克波",pos:"FWD",shoot:80,save:0,speed:83,dribble:82,tackle:71,pass:78,power:82,physique:83,jump:81}
];

const PlayerLib = {
    nextId: 1,

    // ===== 从真实球员模板创建球员 =====
    createPlayerFromTemplate(template) {
        const id = 'p_' + Date.now() + '_' + (this.nextId++);
        const player = {
            id: id,
            name: template.name,
            position: template.pos,
            level: 0,
            exp: 0,
            createdAt: Date.now(),
            shoot: template.shoot || 0,
            save: template.save || 0,
            speed: template.speed,
            dribble: template.dribble,
            tackle: template.tackle,
            pass: template.pass,
            power: template.power,
            physique: template.physique,
            jump: template.jump
        };
        Storage.addPlayer(player);
        return player;
    },

    // ===== 升级相关 =====
    getUpgradeCost(currentLevel) {
        // n-1级升到n级需要 3n 导师卡
        if (currentLevel >= MAX_LEVEL) return null;
        return 3 * (currentLevel + 1);
    },

    canUpgrade(player) {
        if (player.level >= MAX_LEVEL) return { can: false, reason: '已达最高等级' };
        const cost = this.getUpgradeCost(player.level);
        const res = Storage.getResources();
        if (res.mentorCards < cost) return { can: false, reason: '导师卡不足(需' + cost + '张)' };
        return { can: true, cost: cost };
    },

    // 执行升级
    upgradePlayer(playerId, chosenAttr = null) {
        const players = Storage.getPlayers();
        const player = players.find(p => p.id === playerId);
        if (!player) return { success: false, message: '球员不存在' };

        const check = this.canUpgrade(player);
        if (!check.can) return { success: false, message: check.reason };

        // 扣除导师卡
        const res = Storage.getResources();
        res.mentorCards -= check.cost;
        Storage.saveResources(res);

        // 升级
        player.level++;

        // 5级、10级：随机增加一个属性
        // 15级、20级：指定增加一个属性
        const milestone = player.level;
        const pool = AttrPool[player.position];
        let increasedAttr = null;

        if (milestone === 5 || milestone === 10) {
            // 随机选一个未满的属性
            const available = pool.filter(a => player[a] < 100);
            if (available.length > 0) {
                increasedAttr = available[Math.floor(Math.random() * available.length)];
                player[increasedAttr]++;
            }
        } else if (milestone === 15 || milestone === 20) {
            // 指定增加
            if (chosenAttr && pool.includes(chosenAttr) && player[chosenAttr] < 100) {
                increasedAttr = chosenAttr;
                player[chosenAttr]++;
            } else {
                // 如果没指定或已满，随机选一个
                const available = pool.filter(a => player[a] < 100);
                if (available.length > 0) {
                    increasedAttr = available[Math.floor(Math.random() * available.length)];
                    player[increasedAttr]++;
                }
            }
        }

        Storage.savePlayers(players);

        let msg = player.name + ' 升至 ' + player.level + ' 级！';
        if (increasedAttr) {
            msg += ' ' + AttrNames[increasedAttr] + '+1';
            if (milestone === 5 || milestone === 10) msg += '（随机奖励）';
            if (milestone === 15 || milestone === 20) msg += '（指定奖励）';
        }

        return { success: true, message: msg, player: player };
    },

    // ===== 查询辅助 =====
    getPlayerTotalAttrs(player) {
        const pool = AttrPool[player.position] || AttrPool.FWD;
        return pool.reduce((s, a) => s + (player[a] || 0), 0);
    },

    // 根据位置加权属性计算球员评分（0-100，用于显示评级）
    getPlayerScore(player) {
        const weights = PositionScoreWeights[player.position] || PositionScoreWeights.FWD;
        let score = 0;
        let weightSum = 0;
        for (const attr in weights) {
            const val = player[attr] || 0;
            score += val * weights[attr];
            weightSum += weights[attr];
        }
        return weightSum > 0 ? Math.round(score / weightSum) : 0;
    },

    // 根据评分计算球员评级
    getPlayerRating(player) {
        const score = this.getPlayerScore(player);
        if (score >= 85) return { grade: 'S', text: '顶级', score };
        if (score >= 78) return { grade: 'A', text: '优秀', score };
        if (score >= 70) return { grade: 'B', text: '良好', score };
        if (score >= 60) return { grade: 'C', text: '普通', score };
        return { grade: 'D', text: '新秀', score };
    },

    getUpgradeMilestoneHint(level) {
        if (level === 4) return '下次升级(5级): 随机+1属性';
        if (level === 9) return '下次升级(10级): 随机+1属性';
        if (level === 14) return '下次升级(15级): 可指定+1属性';
        if (level === 19) return '下次升级(20级): 可指定+1属性';
        return null;
    },

    // ===== 球探招募 =====
    scoutPlayer(paymentType) {
        const cost = paymentType === 'funds' ? ScoutConfig.fundsCost : ScoutConfig.goldCost;
        const res = Storage.getResources();

        if (paymentType === 'funds') {
            if (res.funds < cost) return { success: false, message: '资金不足(需' + cost + ')' };
            if (!Storage.spendFunds(cost)) return { success: false, message: '资金不足' };
        } else {
            if (res.gold < cost) return { success: false, message: '金币不足(需' + cost + ')' };
            if (!Storage.spendGold(cost)) return { success: false, message: '金币不足' };
        }

        // 从全池随机抽取
        const template = RealPlayers[Math.floor(Math.random() * RealPlayers.length)];
        const player = this.createPlayerFromTemplate(template);
        if (!player) {
            // 退款
            if (paymentType === 'funds') Storage.addFunds(cost);
            else Storage.addGold(cost);
            return { success: false, message: '创建球员失败，已退款' };
        }

        const costLabel = paymentType === 'funds' ? cost + '资金' : cost + '金币';
        return {
            success: true,
            message: '球探发现了 ' + player.name + ' (' + PositionName[player.position] + ')！',
            player: player,
            cost: cost,
            costLabel: costLabel
        };
    },

    // 出售球员（按位置评分回收金币）
    sellPlayer(playerId) {
        const players = Storage.getPlayers();
        const player = players.find(p => p.id === playerId);
        if (!player) return { success: false, message: '球员不存在' };

        // 按位置评分计算价值
        const score = this.getPlayerScore(player);
        const baseValue = Math.floor(score * 30);
        const levelBonus = player.level * 100;
        const sellPrice = Math.floor((baseValue + levelBonus) * 0.5);

        // 从球队移除
        Storage.removePlayerFromTeam(playerId);
        // 从球员库移除
        Storage.removePlayer(playerId);
        // 加金币
        Storage.addGold(sellPrice);

        return { success: true, message: '出售 ' + player.name + ' 获得 ' + sellPrice + ' 金币' };
    }
};