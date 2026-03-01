// ==================== Firebase 初始化 ====================
const firebaseConfig = {
    apiKey: "AIzaSyDnDQPo2lXA2VdHmmpQt9joJhIf3VQZ3aE",
    authDomain: "chuangshixiuxian.firebaseapp.com",
    projectId: "chuangshixiuxian",
    storageBucket: "chuangshixiuxian.firebasestorage.app",
    messagingSenderId: "953320846923",
    appId: "1:953320846923:web:228abb367ce28518f87fce",
    measurementId: "G-BBQS9JFEB4"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==================== 全局状态 ====================
let currentUser = null;
let player = null;           // 角色对象
let inventory = [];          // 背包物品数组
let currentTab = 'login';
let gameLog = [];

// 扩展状态
let dailyCheckin = { last: null, days: 0 };
let quests = [];             // 任务/成就列表
let friends = [];            // 好友列表
let mails = [];              // 邮件列表
let guild = null;            // 公会对象
let gachaHistory = [];       // 抽卡记录
let pets = [];               // 拥有的宠物
let marketplace = [];        // 交易行上架物品
let dailyTasks = [];         // 每日任务列表
let activeEvent = null;      // 当前活动

// ==================== 静态数据 ====================
// 商店物品
const shopItems = [
    { id: 'sword1', name: '铁剑', type: 'weapon', price: 100, atk: 5, def: 0, agi: 0, desc: '攻击+5' },
    { id: 'sword2', name: '青铜剑', type: 'weapon', price: 250, atk: 12, def: 0, agi: 0, desc: '攻击+12' },
    { id: 'armor1', name: '皮甲', type: 'armor', price: 80, atk: 0, def: 3, agi: 0, desc: '防御+3' },
    { id: 'armor2', name: '锁子甲', type: 'armor', price: 200, atk: 0, def: 8, agi: -1, desc: '防御+8，敏捷-1' },
    { id: 'ring1', name: '敏捷戒指', type: 'accessory', price: 150, atk: 0, def: 0, agi: 2, desc: '敏捷+2' },
    { id: 'potion', name: '治疗药水', type: 'consumable', price: 30, hpRestore: 30, desc: '回复30HP' },
    { id: 'potion2', name: '强力治疗药水', type: 'consumable', price: 80, hpRestore: 80, desc: '回复80HP' },
    { id: 'petEgg', name: '宠物蛋', type: 'pet', price: 200, desc: '随机孵化一只宠物' },
    { id: 'material1', name: '铁矿', type: 'material', price: 20, desc: '锻造材料' },
];

// 副本
const dungeons = [
    { id: 'd1', name: '寂静森林', minLevel: 1, monster: '哥布林', hp: 30, atk: 8, rewardExp: 50, rewardGold: 30, drops: [{ id: 'potion', rate: 0.3 }, { id: 'material1', rate: 0.5 }] },
    { id: 'd2', name: '幽暗矿洞', minLevel: 3, monster: '蝙蝠群', hp: 60, atk: 15, rewardExp: 80, rewardGold: 50, drops: [{ id: 'armor1', rate: 0.2 }, { id: 'material1', rate: 0.6 }] },
    { id: 'd3', name: '火龙巢穴', minLevel: 5, monster: '幼龙', hp: 120, atk: 25, rewardExp: 200, rewardGold: 150, drops: [{ id: 'sword2', rate: 0.3 }, { id: 'petEgg', rate: 0.1 }] },
];

// 宠物模板
const petTemplates = [
    { id: 'pet1', name: '小狼', type: 'pet', atk: 3, def: 1, agi: 2, desc: '攻击+3,防御+1,敏捷+2' },
    { id: 'pet2', name: '灵猫', type: 'pet', atk: 1, def: 0, agi: 5, desc: '攻击+1,敏捷+5' },
    { id: 'pet3', name: '龟丞相', type: 'pet', atk: 0, def: 8, agi: -2, desc: '防御+8,敏捷-2' },
];

// 任务模板
const questTemplates = [
    { id: 'q1', name: '初次战斗', desc: '击败任意怪物1次', target: 1, type: 'kill', rewardExp: 50, rewardGold: 50 },
    { id: 'q2', name: '收集材料', desc: '获得5个铁矿', target: 5, type: 'collect', itemId: 'material1', rewardExp: 100, rewardGold: 80 },
    { id: 'q3', name: '装备收集', desc: '装备3件不同装备', target: 3, type: 'equip', rewardExp: 150, rewardGold: 120 },
];

// 每日任务模板
const dailyTaskTemplates = [
    { id: 'dt1', name: '每日登录', desc: '登录游戏', target: 1, type: 'login', rewardExp: 20, rewardGold: 30 },
    { id: 'dt2', name: '副本挑战', desc: '完成任意副本2次', target: 2, type: 'dungeon', rewardExp: 40, rewardGold: 50 },
    { id: 'dt3', name: '使用药水', desc: '使用1瓶药水', target: 1, type: 'usePotion', rewardExp: 15, rewardGold: 20 },
];

// ==================== 辅助函数 ====================
function addLog(msg) {
    if (msg.includes('✅')) {
        gameLog = gameLog.filter(log => !log.includes('❌'));
    }
    gameLog.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
    if (gameLog.length > 15) gameLog.pop();
    render();
}

// 计算角色总属性
function calcPlayerStats() {
    if (!player) return { attack: 0, defense: 0, agility: 0, maxHp: 100 };
    let baseAtk = player.baseAttack || 15;
    let baseDef = player.baseDefense || 0;
    let baseAgi = player.baseAgility || 0;
    let baseMaxHp = player.baseMaxHp || 100;

    let equipAtk = 0, equipDef = 0, equipAgi = 0;
    if (player.weapon) {
        const w = player.weapon;
        equipAtk += w.atk || 0;
        equipDef += w.def || 0;
        equipAgi += w.agi || 0;
    }
    if (player.armor) {
        const a = player.armor;
        equipAtk += a.atk || 0;
        equipDef += a.def || 0;
        equipAgi += a.agi || 0;
    }
    if (player.accessory) {
        const ac = player.accessory;
        equipAtk += ac.atk || 0;
        equipDef += ac.def || 0;
        equipAgi += ac.agi || 0;
    }

    let petAtk = 0, petDef = 0, petAgi = 0;
    if (player.pet) {
        const p = player.pet;
        petAtk += p.atk || 0;
        petDef += p.def || 0;
        petAgi += p.agi || 0;
    }

    const totalAtk = baseAtk + equipAtk + petAtk;
    const totalDef = baseDef + equipDef + petDef;
    const totalAgi = baseAgi + equipAgi + petAgi;
    const totalMaxHp = baseMaxHp + (totalDef * 2);

    return {
        attack: totalAtk,
        defense: totalDef,
        agility: totalAgi,
        maxHp: totalMaxHp,
    };
}

function updateHp() {
    if (!player) return;
    const stats = calcPlayerStats();
    const oldMax = player.maxHp;
    player.maxHp = stats.maxHp;
    if (oldMax < player.maxHp) {
        player.hp += player.maxHp - oldMax;
    } else if (player.hp > player.maxHp) {
        player.hp = player.maxHp;
    }
}

async function saveCharacter() {
    if (!currentUser || !player) return;
    try {
        // 在保存前确保所有字段都是有效值（防止 undefined）
        const cleanPlayer = JSON.parse(JSON.stringify(player)); // 简单深拷贝，移除 undefined
        await db.collection('chuangshi_characters').doc(currentUser.uid).set(cleanPlayer);
        await db.collection('chuangshi_inventories').doc(currentUser.uid).set({ items: inventory });
        await db.collection('chuangshi_extras').doc(currentUser.uid).set({
            dailyCheckin,
            quests,
            friends,
            mails,
            guild,
            gachaHistory,
            pets,
            marketplace,
            dailyTasks,
            activeEvent,
        });
        addLog('✅ 数据保存成功');
    } catch (e) {
        console.error('保存失败', e);
        addLog(`❌ 保存失败: ${e.message}`);
    }
}

async function loadCharacter() {
    if (!currentUser) return;
    const charDoc = await db.collection('chuangshi_characters').doc(currentUser.uid).get();
    if (charDoc.exists) {
        player = charDoc.data();
        player.baseAttack = player.baseAttack || 15;
        player.baseDefense = player.baseDefense || 0;
        player.baseAgility = player.baseAgility || 0;
        player.baseMaxHp = player.baseMaxHp || 100;
        player.hp = (player.hp !== undefined && player.hp !== null) ? player.hp : player.maxHp;

        // 清洗装备对象中的 undefined 值，确保 desc 存在
        if (player.weapon) {
            player.weapon.atk = player.weapon.atk || 0;
            player.weapon.def = player.weapon.def || 0;
            player.weapon.agi = player.weapon.agi || 0;
            player.weapon.desc = player.weapon.desc || '';
        }
        if (player.armor) {
            player.armor.atk = player.armor.atk || 0;
            player.armor.def = player.armor.def || 0;
            player.armor.agi = player.armor.agi || 0;
            player.armor.desc = player.armor.desc || '';
        }
        if (player.accessory) {
            player.accessory.atk = player.accessory.atk || 0;
            player.accessory.def = player.accessory.def || 0;
            player.accessory.agi = player.accessory.agi || 0;
            player.accessory.desc = player.accessory.desc || '';
        }
        if (player.pet) {
            player.pet.atk = player.pet.atk || 0;
            player.pet.def = player.pet.def || 0;
            player.pet.agi = player.pet.agi || 0;
            player.pet.desc = player.pet.desc || '';
        }
    } else {
        player = {
            name: '冒险者',
            level: 1,
            hp: 100,
            maxHp: 100,
            exp: 0,
            gold: 100,
            baseAttack: 15,
            baseDefense: 0,
            baseAgility: 0,
            baseMaxHp: 100,
            weapon: null,
            armor: null,
            accessory: null,
            pet: null,
            kills: 0,
        };
    }

    const invDoc = await db.collection('chuangshi_inventories').doc(currentUser.uid).get();
    inventory = invDoc.exists ? invDoc.data().items || [] : [];

    const extraDoc = await db.collection('chuangshi_extras').doc(currentUser.uid).get();
    if (extraDoc.exists) {
        const ex = extraDoc.data();
        dailyCheckin = ex.dailyCheckin || { last: null, days: 0 };
        quests = ex.quests || [];
        friends = ex.friends || [];
        mails = ex.mails || [];
        guild = ex.guild || null;
        gachaHistory = ex.gachaHistory || [];
        pets = ex.pets || [];
        marketplace = ex.marketplace || [];
        dailyTasks = ex.dailyTasks || [];
        activeEvent = ex.activeEvent || null;
    } else {
        quests = questTemplates.map(q => ({ ...q, progress: 0, completed: false }));
        dailyTasks = dailyTaskTemplates.map(t => ({ ...t, progress: 0, completed: false, date: new Date().toDateString() }));
    }
    updateHp();
    render();
}

// ==================== 界面渲染 ====================
function render() {
    const app = document.getElementById('app');
    if (!app) return;
    if (!currentUser) {
        app.innerHTML = renderAuthScreen();
        attachAuthEvents();
        return;
    }
    app.innerHTML = renderMainGame();
    attachGameEvents();
}

function renderAuthScreen() {
    return `
        <div class="panel" style="text-align:center;">
            <h1>📜 创世修仙 · 文字RPG</h1>
            <div id="authTabLogin" class="tab-content active">
                <h2>登录</h2>
                <input type="email" id="loginEmail" placeholder="邮箱" />
                <input type="password" id="loginPassword" placeholder="密码" />
                <button id="loginBtn">进入冒险</button>
                <p style="color:#8895b0;">还没有契约？ <button id="goToRegisterBtn" style="background:transparent; border:none; box-shadow:none; text-decoration:underline;">缔结契约</button></p>
            </div>
            <div id="authTabRegister" class="tab-content">
                <h2>注册</h2>
                <input type="email" id="regEmail" placeholder="邮箱" />
                <input type="password" id="regPassword" placeholder="密码" />
                <input type="text" id="regName" placeholder="角色名称" />
                <button id="registerBtn">注册并开始</button>
                <button id="backToLoginBtn">返回登录</button>
            </div>
            <div id="authError" class="error-msg" style="display:none;"></div>
        </div>
    `;
}

function renderMainGame() {
    const stats = calcPlayerStats();
    const hpPercent = (player.hp / player.maxHp) * 100;
    let mainContent = '';
    if (currentTab === 'status') mainContent = renderStatus();
    else if (currentTab === 'inventory') mainContent = renderInventory();
    else if (currentTab === 'dungeon') mainContent = renderDungeon();
    else if (currentTab === 'shop') mainContent = renderShop();
    else if (currentTab === 'map') mainContent = renderMap();
    else if (currentTab === 'checkin') mainContent = renderCheckin();
    else if (currentTab === 'extra') mainContent = renderExtra();

    return `
        <div class="panel" style="padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
                <h2 style="border:none;">⚔️ ${player.name} Lv.${player.level}</h2>
                <div style="color:#b7c9e2;">💰 ${player.gold} G</div>
            </div>
            <div style="background:#0b0f1a; border-radius:20px; height:20px; margin:10px 0;">
                <div style="width:${hpPercent}%; background:#aa8cd2; height:20px; border-radius:20px;"></div>
            </div>
            <div class="stat-grid">
                <span>❤️ ${player.hp}/${player.maxHp}</span>
                <span>⚔️ ${stats.attack}</span>
                <span>🛡️ ${stats.defense}</span>
                <span>💨 ${stats.agility}</span>
                <span>✨ ${player.exp} EXP</span>
            </div>
            <div>装备: 武${player.weapon ? player.weapon.name : '无'} 防${player.armor ? player.armor.name : '无'} 饰${player.accessory ? player.accessory.name : '无'} 宠${player.pet ? player.pet.name : '无'}</div>
        </div>
        <div class="nav-bar">
            <button class="tab-btn" data-tab="status">📊 状态</button>
            <button class="tab-btn" data-tab="inventory">🎒 背包</button>
            <button class="tab-btn" data-tab="dungeon">🏹 打怪</button>
            <button class="tab-btn" data-tab="shop">🏪 商城</button>
            <button class="tab-btn" data-tab="map">🗺️ 地图</button>
            <button class="tab-btn" data-tab="checkin">📆 签到</button>
            <button class="tab-btn special" data-tab="extra">✨ 额外功能</button>
        </div>
        <div class="panel">${mainContent}</div>
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 16px;">
            <div class="log-area" style="flex: 1;">${gameLog.map(msg => `<div>${msg}</div>`).join('')}</div>
            <button id="clearLogBtn" style="padding: 8px 16px; background: #3c4a68;">🗑️ 清空</button>
        </div>
        <div style="text-align:right;"><button id="logoutBtn">🚪 登出</button></div>
    `;
}

function renderStatus() {
    const stats = calcPlayerStats();
    return `
        <h3>⚜️ 角色状态</h3>
        <div>名称：${player.name}</div>
        <div>等级：${player.level} (下一级需 ${player.level * 100} EXP)</div>
        <div>基础攻击：${player.baseAttack}  总攻击：${stats.attack}</div>
        <div>基础防御：${player.baseDefense}  总防御：${stats.defense}</div>
        <div>基础敏捷：${player.baseAgility}  总敏捷：${stats.agility}</div>
        <div>生命：${player.hp}/${player.maxHp}</div>
        <div>宠物：${player.pet ? player.pet.name : '无'}</div>
        <div>武器：${player.weapon ? player.weapon.name : '无'}  防具：${player.armor ? player.armor.name : '无'}  饰品：${player.accessory ? player.accessory.name : '无'}</div>
        <h3>🏅 成就</h3>
        <div>击杀数: ${player.kills || 0}  签到: ${dailyCheckin.days}天</div>
    `;
}

function renderInventory() {
    if (!inventory.length) return '<p>背包空空如也。</p>';
    let html = '<h3>📦 背包</h3><div class="item-list">';
    inventory.forEach((item, idx) => {
        let actions = '';
        if (item.type === 'consumable') {
            actions = `<button class="use-item" data-index="${idx}">使用</button>`;
        } else if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') {
            const equipped = (player.weapon && player.weapon.id === item.id) ||
                             (player.armor && player.armor.id === item.id) ||
                             (player.accessory && player.accessory.id === item.id);
            actions = equipped ? '<span>已装备</span>' : `<button class="equip-item" data-index="${idx}">装备</button>`;
        } else if (item.type === 'pet') {
            const equipped = player.pet && player.pet.id === item.id;
            actions = equipped ? '<span>已出战</span>' : `<button class="equip-pet" data-index="${idx}">出战</button>`;
        }
        html += `<div class="item-entry">
            <span><b>${item.name}</b> x${item.qty || 1} <small>${item.desc || ''}</small></span>
            <span>${actions}</span>
        </div>`;
    });
    html += '</div>';
    return html;
}

function renderDungeon() {
    let html = '<h3>🏰 副本 · 打怪</h3>';
    dungeons.forEach(d => {
        html += `<div style="margin:10px 0; background:#1e2439; padding:10px; border-radius:16px;">
            <b>${d.name}</b> (Lv.${d.minLevel}+) 怪物:${d.monster} (HP${d.hp} 攻${d.atk})<br>
            奖励: ${d.rewardExp}exp/${d.rewardGold}G<br>
            <button class="fight-dungeon" data-dungeon='${JSON.stringify(d)}'>进入战斗</button>
        </div>`;
    });
    return html;
}

function renderShop() {
    let html = '<h3>🏪 神秘商店</h3><div class="item-list">';
    shopItems.forEach(item => {
        html += `<div class="item-entry">
            <span><b>${item.name}</b> - ${item.price}G <small>${item.desc}</small></span>
            <button class="buy-item" data-item='${JSON.stringify(item)}'>购买</button>
        </div>`;
    });
    html += '</div>';
    return html;
}

function renderMap() {
    return `
        <h3>🗺️ 世界地图</h3>
        <p>🌲 寂静森林 ·  🌋 烈焰山 ·  🏰 王都</p>
        <button class="travel" data-to="森林">前往森林 (可能遇到草药)</button>
        <button class="travel" data-to="山脚">山脚 (采矿点)</button>
        <button class="travel" data-to="遗迹">古老遗迹 (随机事件)</button>
    `;
}

function renderCheckin() {
    const today = new Date().toDateString();
    const checked = dailyCheckin.last === today;
    return `
        <h3>📆 每日签到</h3>
        <p>累计签到: ${dailyCheckin.days} 天</p>
        ${checked ? '<p>✅ 今日已签到</p>' : '<button id="checkinBtn">✨ 签到领取奖励</button>'}
        <p>连续签到奖励: 7天额外礼包</p>
    `;
}

function renderExtra() {
    return `
        <h3>✨ 额外功能</h3>
        <div style="display:grid; gap:10px; grid-template-columns: repeat(2,1fr);">
            <div><button class="extra-func" data-func="quests">📋 1. 任务/成就</button> <span>${quests.filter(q => !q.completed).length}进行中</span></div>
            <div><button class="extra-func" data-func="friends">👥 2. 好友</button> <span>好友数: ${friends.length}</span></div>
            <div><button class="extra-func" data-func="mails">✉️ 3. 邮件</button> <span>${mails.length}封</span></div>
            <div><button class="extra-func" data-func="guild">⚔️ 4. 公会</button> <span>${guild ? guild.name : '未加入'}</span></div>
            <div><button class="extra-func" data-func="gacha">🎴 5. 抽卡/扭蛋</button> <span>抽卡次数: ${gachaHistory.length}</span></div>
            <div><button class="extra-func" data-func="pets">🐕 6. 宠物</button> <span>宠物: ${pets.length}</span></div>
            <div><button class="extra-func" data-func="market">🏷️ 7. 交易行</button> <span>上架${marketplace.length}</span></div>
            <div><button class="extra-func" data-func="dailyTasks">⏳ 8. 每日任务</button> <span>日常${dailyTasks.filter(t => !t.completed).length}</span></div>
            <div><button class="extra-func" data-func="events">🎉 9. 游戏活动</button> <span>${activeEvent ? '进行中' : '无'}</span></div>
            <div><button class="extra-func" data-func="leaderboard">🏆 10. 排行榜</button> <span>(点击查看)</span></div>
        </div>
        <div id="extraDetail" class="extra-detail-panel">点击上方按钮查看详情。</div>
    `;
}

// ==================== 事件绑定 ====================
function attachAuthEvents() {
    const goToRegisterBtn = document.getElementById('goToRegisterBtn');
    const backToLoginBtn = document.getElementById('backToLoginBtn');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');

    if (goToRegisterBtn) {
        goToRegisterBtn.addEventListener('click', () => {
            document.getElementById('authTabLogin').classList.remove('active');
            document.getElementById('authTabRegister').classList.add('active');
        });
    }
    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', () => {
            document.getElementById('authTabRegister').classList.remove('active');
            document.getElementById('authTabLogin').classList.add('active');
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = document.getElementById('loginEmail').value.trim();
            const pass = document.getElementById('loginPassword').value;
            const errorDiv = document.getElementById('authError');
            errorDiv.style.display = 'none';
            errorDiv.innerHTML = '';
            if (!email || !pass) {
                errorDiv.innerHTML = '邮箱和密码不能为空';
                errorDiv.style.display = 'block';
                return;
            }
            try {
                const cred = await auth.signInWithEmailAndPassword(email, pass);
                currentUser = cred.user;
                await loadCharacter();
                addLog(`欢迎回来，${player?.name || '冒险者'}`);
                render();
            } catch (e) {
                console.error('登录错误', e);
                errorDiv.style.display = 'block';
                if (e.code === 'auth/user-not-found') {
                    errorDiv.innerHTML = `账号不存在，请<span class="switch-to-register" style="color:#ffd966; text-decoration:underline; cursor:pointer;">注册</span>`;
                } else if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-login-credentials') {
                    errorDiv.innerHTML = '密码错误，请重新输入';
                } else if (e.code === 'auth/too-many-requests') {
                    errorDiv.innerHTML = '尝试次数过多，请稍后再试';
                } else if (e.code === 'auth/network-request-failed') {
                    errorDiv.innerHTML = '网络错误，请检查连接';
                } else {
                    errorDiv.innerHTML = '登录失败: ' + e.message;
                }
            }
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            const email = document.getElementById('regEmail').value.trim();
            const pass = document.getElementById('regPassword').value;
            const name = document.getElementById('regName').value.trim() || '冒险者';
            const errorDiv = document.getElementById('authError');
            errorDiv.style.display = 'none';
            errorDiv.innerHTML = '';
            if (!email || !pass) {
                errorDiv.innerHTML = '邮箱和密码不能为空';
                errorDiv.style.display = 'block';
                return;
            }
            if (pass.length < 6) {
                errorDiv.innerHTML = '密码至少6位';
                errorDiv.style.display = 'block';
                return;
            }
            try {
                const cred = await auth.createUserWithEmailAndPassword(email, pass);
                currentUser = cred.user;
                player = {
                    name,
                    level: 1,
                    hp: 100,
                    maxHp: 100,
                    exp: 0,
                    gold: 100,
                    baseAttack: 15,
                    baseDefense: 0,
                    baseAgility: 0,
                    baseMaxHp: 100,
                    weapon: null,
                    armor: null,
                    accessory: null,
                    pet: null,
                    kills: 0,
                };
                inventory = [];
                quests = questTemplates.map(q => ({ ...q, progress: 0, completed: false }));
                dailyTasks = dailyTaskTemplates.map(t => ({ ...t, progress: 0, completed: false, date: new Date().toDateString() }));
                await saveCharacter();
                addLog('角色创建成功，冒险开始！');
                render();
            } catch (e) {
                errorDiv.style.display = 'block';
                if (e.code === 'auth/email-already-in-use') {
                    errorDiv.innerHTML = `账号已存在，请<span class="switch-to-login" style="color:#ffd966; text-decoration:underline; cursor:pointer;">登录</span>`;
                } else if (e.code === 'auth/weak-password') {
                    errorDiv.innerHTML = '密码强度太弱，请使用更复杂的密码';
                } else if (e.code === 'auth/invalid-email') {
                    errorDiv.innerHTML = '邮箱格式不正确';
                } else if (e.code === 'auth/network-request-failed') {
                    errorDiv.innerHTML = '网络错误，请检查连接';
                } else {
                    errorDiv.innerHTML = '注册失败: ' + e.message;
                }
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('switch-to-register')) {
            const email = document.getElementById('loginEmail').value;
            document.getElementById('authTabLogin').classList.remove('active');
            document.getElementById('authTabRegister').classList.add('active');
            document.getElementById('regEmail').value = email;
            document.getElementById('authError').style.display = 'none';
        } else if (e.target.classList.contains('switch-to-login')) {
            const email = document.getElementById('regEmail').value;
            document.getElementById('authTabRegister').classList.remove('active');
            document.getElementById('authTabLogin').classList.add('active');
            document.getElementById('loginEmail').value = email;
            document.getElementById('authError').style.display = 'none';
        }
    });
}

function attachGameEvents() {
    // 选项卡切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentTab = e.target.dataset.tab;
            render();
        });
    });

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await auth.signOut();
        currentUser = null;
        player = null;
        render();
    });

    document.getElementById('clearLogBtn')?.addEventListener('click', () => {
        gameLog = [];
        render();
    });

    // 使用物品
    document.querySelectorAll('.use-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.dataset.index;
            const item = inventory[idx];
            if (item.type === 'consumable') {
                if (item.hpRestore) {
                    player.hp = Math.min(player.hp + item.hpRestore, player.maxHp);
                    addLog(`使用了 ${item.name}，恢复 ${item.hpRestore} HP`);
                } else {
                    addLog(`使用了 ${item.name}，但没有任何效果`);
                }
                if (item.qty && item.qty > 1) {
                    item.qty -= 1;
                } else {
                    inventory.splice(idx, 1);
                }
                updateDailyTaskProgress('usePotion', 1);
                saveCharacter();
                render();
            } else {
                addLog('该物品不能直接使用');
            }
        });
    });

    // 装备物品（修复：确保所有字段都有值，desc 默认空字符串）
    document.querySelectorAll('.equip-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.dataset.index;
            const item = inventory[idx];
            if (item.type === 'weapon') {
                if (player.weapon) inventory.push({ ...player.weapon, qty: 1 });
                player.weapon = { 
                    id: item.id, 
                    name: item.name, 
                    type: item.type,
                    desc: item.desc || '',
                    atk: item.atk || 0, 
                    def: item.def || 0, 
                    agi: item.agi || 0 
                };
                if (item.qty && item.qty > 1) item.qty--; else inventory.splice(idx, 1);
                addLog(`装备了 ${item.name}`);
            } else if (item.type === 'armor') {
                if (player.armor) inventory.push({ ...player.armor, qty: 1 });
                player.armor = { 
                    id: item.id, 
                    name: item.name, 
                    type: item.type,
                    desc: item.desc || '',
                    atk: item.atk || 0, 
                    def: item.def || 0, 
                    agi: item.agi || 0 
                };
                if (item.qty && item.qty > 1) item.qty--; else inventory.splice(idx, 1);
                addLog(`装备了 ${item.name}`);
            } else if (item.type === 'accessory') {
                if (player.accessory) inventory.push({ ...player.accessory, qty: 1 });
                player.accessory = { 
                    id: item.id, 
                    name: item.name, 
                    type: item.type,
                    desc: item.desc || '',
                    atk: item.atk || 0, 
                    def: item.def || 0, 
                    agi: item.agi || 0 
                };
                if (item.qty && item.qty > 1) item.qty--; else inventory.splice(idx, 1);
                addLog(`装备了 ${item.name}`);
            }
            updateHp();
            saveCharacter();
            render();
        });
    });

    // 出战宠物（修复：确保 desc 字段）
    document.querySelectorAll('.equip-pet').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.dataset.index;
            const pet = inventory[idx];
            if (pet.type === 'pet') {
                if (player.pet) inventory.push({ ...player.pet, qty: 1 });
                player.pet = { 
                    id: pet.id, 
                    name: pet.name, 
                    type: pet.type,
                    desc: pet.desc || '',
                    atk: pet.atk || 0, 
                    def: pet.def || 0, 
                    agi: pet.agi || 0 
                };
                inventory.splice(idx, 1);
                addLog(`${pet.name} 已出战`);
                updateHp();
                saveCharacter();
                render();
            }
        });
    });

    // 购买物品
    document.querySelectorAll('.buy-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = JSON.parse(e.target.dataset.item);
            if (player.gold >= item.price) {
                player.gold -= item.price;
                const existing = inventory.find(i => i.id === item.id);
                if (existing) {
                    existing.qty = (existing.qty || 1) + 1;
                } else {
                    const newItem = { ...item };
                    delete newItem.price;
                    newItem.qty = 1;
                    inventory.push(newItem);
                }
                addLog(`购买 ${item.name} 成功`);
                saveCharacter();
                render();
            } else {
                addLog('金币不足');
            }
        });
    });

    // 副本战斗
    document.querySelectorAll('.fight-dungeon').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const d = JSON.parse(e.target.dataset.dungeon);
            if (player.level < d.minLevel) {
                addLog('等级不足，无法挑战');
                return;
            }
            const stats = calcPlayerStats();
            const playerPower = stats.attack + stats.agility * 0.5;
            const monsterPower = d.atk + d.hp * 0.2;
            const win = playerPower > monsterPower * (0.7 + Math.random() * 0.6);
            if (win) {
                player.exp += d.rewardExp;
                player.gold += d.rewardGold;
                player.kills = (player.kills || 0) + 1;
                addLog(`击败 ${d.monster}，获得 ${d.rewardExp}exp ${d.rewardGold}G`);
                d.drops.forEach(drop => {
                    if (Math.random() < drop.rate) {
                        const dropItem = shopItems.find(si => si.id === drop.id);
                        if (dropItem) {
                            const existing = inventory.find(i => i.id === dropItem.id);
                            if (existing) existing.qty = (existing.qty || 1) + 1;
                            else inventory.push({ ...dropItem, qty: 1 });
                            addLog(`掉落物品: ${dropItem.name}`);
                        }
                    }
                });
                // 升级检查
                if (player.exp >= player.level * 100) {
                    player.level++;
                    player.baseAttack += 3;
                    player.baseDefense += 2;
                    player.baseAgility += 1;
                    player.baseMaxHp += 20;
                    // 先更新血量再设置满血
                    updateHp();
                    player.hp = player.maxHp;
                    addLog(`🎉 升级 LV.${player.level}！`);
                } else {
                    updateHp(); // 防御可能变化，但升级才触发，这里无需
                }
                updateQuestProgress('kill', 1);
                updateDailyTaskProgress('dungeon', 1);
            } else {
                const damage = Math.max(1, d.atk - stats.defense / 2);
                player.hp -= Math.floor(damage);
                addLog(`苦战落败，HP-${Math.floor(damage)}`);
                if (player.hp <= 0) {
                    player.hp = 1;
                    addLog('你被击败了，但勉强逃生...');
                }
            }
            updateHp();
            saveCharacter();
            render();
        });
    });

    // 签到
    document.getElementById('checkinBtn')?.addEventListener('click', () => {
        const today = new Date().toDateString();
        if (dailyCheckin.last !== today) {
            dailyCheckin.last = today;
            dailyCheckin.days++;
            let rewardGold = 50;
            if (dailyCheckin.days % 7 === 0) rewardGold += 100;
            player.gold += rewardGold;
            addLog(`签到成功！第${dailyCheckin.days}天，获得${rewardGold}G`);
            saveCharacter();
            render();
        }
    });

    // 额外功能按钮
    document.querySelectorAll('.extra-func').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const func = e.target.dataset.func;
            const detailDiv = document.getElementById('extraDetail');
            let content = '';
            if (func === 'quests') {
                content = '<h4>📋 任务列表</h4>';
                quests.forEach(q => {
                    content += `<div>${q.name}: ${q.progress}/${q.target} ${q.completed ? '✅已完成' : ''}</div>`;
                });
                content += '<button id="claimQuestRewards">领取已完成任务奖励</button>';
            } else if (func === 'friends') {
                content = '<h4>👥 好友</h4>';
                if (friends.length === 0) content += '<p>暂无好友。输入ID添加：</p><input id="friendId" placeholder="好友UID"><button id="addFriendBtn">添加</button>';
                else {
                    friends.forEach(f => content += `<div>${f.name} (${f.id})</div>`);
                }
            } else if (func === 'mails') {
                content = '<h4>✉️ 邮件</h4>';
                if (mails.length === 0) content += '<p>暂无邮件。</p>';
                else {
                    mails.forEach((m, i) => {
                        content += `<div><b>${m.title}</b> ${m.content} <button class="claimMail" data-index="${i}">领取附件</button></div>`;
                    });
                }
            } else if (func === 'guild') {
                if (guild) {
                    content = `<h4>⚔️ 公会: ${guild.name}</h4><p>成员: ${guild.members ? guild.members.join(', ') : ''}</p><button id="leaveGuild">退出公会</button>`;
                } else {
                    content = '<p>未加入公会。创建或加入：</p><input id="guildName" placeholder="公会名称"><button id="createGuild">创建</button>';
                }
            } else if (func === 'gacha') {
                content = '<h4>🎴 抽卡 (100G/次)</h4>';
                content += '<button id="doGacha">抽一次</button> <button id="doGachaTen">十连抽</button>';
                content += '<div>历史: ' + gachaHistory.slice(-5).join(', ') + '</div>';
            } else if (func === 'pets') {
                content = '<h4>🐕 我的宠物</h4>';
                if (pets.length === 0) content += '<p>暂无宠物，可通过抽卡或购买宠物蛋获得。</p>';
                else {
                    pets.forEach(p => {
                        content += `<div>${p.name} (攻${p.atk} 防${p.def} 敏${p.agi}) <button class="selectPet" data-id="${p.id}">出战</button></div>`;
                    });
                }
            } else if (func === 'market') {
                // 修复：下拉菜单过滤可上架物品（非装备中）
                const availableItems = inventory.filter(item => {
                    // 排除已装备的物品（通过id比较）
                    if (player.weapon && player.weapon.id === item.id) return false;
                    if (player.armor && player.armor.id === item.id) return false;
                    if (player.accessory && player.accessory.id === item.id) return false;
                    if (player.pet && player.pet.id === item.id) return false;
                    return true;
                });
                content = '<h4>🏷️ 交易行</h4>';
                content += '<div>上架物品：<select id="marketItemSelect">' + 
                    availableItems.map((item, idx) => `<option value="${idx}">${item.name}</option>`).join('') +
                    '</select> 价格<input id="marketPrice" type="number" value="50"> <button id="listMarket">上架</button></div>';
                content += '<h4>在售</h4>';
                marketplace.forEach((item, idx) => {
                    content += `<div>${item.name} - ${item.price}G 卖家:${item.seller} <button class="buyMarket" data-index="${idx}">购买</button></div>`;
                });
            } else if (func === 'dailyTasks') {
                content = '<h4>⏳ 每日任务</h4>';
                const today = new Date().toDateString();
                dailyTasks.forEach(t => {
                    if (t.date !== today) { t.progress = 0; t.completed = false; t.date = today; }
                    content += `<div>${t.name}: ${t.progress}/${t.target} ${t.completed ? '✅' : ''}</div>`;
                });
                content += '<button id="claimDailyRewards">领取已完成奖励</button>';
            } else if (func === 'events') {
                if (activeEvent) {
                    content = `<h4>🎉 当前活动: ${activeEvent.name}</h4><p>${activeEvent.desc}</p>`;
                } else {
                    content = '<p>暂无活动。</p><button id="startEvent">开启测试活动</button>';
                }
            } else if (func === 'leaderboard') {
                content = '<h4>🏆 排行榜</h4>';
                content += '<p>等级榜: 1. 勇者(Lv.10) 2. 魔法师(Lv.9) 3. 你(Lv.' + player.level + ')</p>';
                content += '<p>击杀榜: 1. 战神(100) 2. 猎手(80) 3. 你(' + (player.kills || 0) + ')</p>';
            }
            detailDiv.innerHTML = content;
            attachExtraButtons(func);
        });
    });

    // 地图探索
    document.querySelectorAll('.travel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const place = e.target.dataset.to;
            const r = Math.random();
            if (place === '森林') {
                if (r < 0.5) {
                    player.gold += 20;
                    addLog('在森林发现了草药，卖得20G');
                } else {
                    player.hp -= 5;
                    addLog('在森林遭遇野蜂，HP-5');
                }
            } else if (place === '山脚') {
                if (r < 0.3) {
                    inventory.push({ id: 'material1', name: '铁矿', type: 'material', qty: 1, desc: '锻造材料' });
                    addLog('在山脚发现了铁矿');
                } else {
                    player.hp -= 3;
                    addLog('山脚碎石掉落，HP-3');
                }
            } else if (place === '遗迹') {
                if (r < 0.2) {
                    player.gold += 100;
                    addLog('在遗迹发现宝藏，获得100G');
                } else if (r < 0.6) {
                    player.hp -= 15;
                    addLog('触发陷阱，HP-15');
                } else {
                    addLog('遗迹空无一物');
                }
            }
            updateHp();
            saveCharacter();
            render();
        });
    });
}

function attachExtraButtons(func) {
    if (func === 'quests') {
        document.getElementById('claimQuestRewards')?.addEventListener('click', () => {
            quests.forEach(q => {
                if (q.progress >= q.target && !q.completed) {
                    q.completed = true;
                    player.exp += q.rewardExp;
                    player.gold += q.rewardGold;
                    addLog(`完成任务 ${q.name}，获得 ${q.rewardExp}exp ${q.rewardGold}G`);
                }
            });
            saveCharacter();
            render();
        });
    } else if (func === 'friends') {
        document.getElementById('addFriendBtn')?.addEventListener('click', () => {
            const fid = document.getElementById('friendId').value;
            if (fid) {
                friends.push({ id: fid, name: '好友' + fid.slice(0,4) });
                addLog(`添加好友成功`);
                saveCharacter();
                render();
            }
        });
    } else if (func === 'mails') {
        document.querySelectorAll('.claimMail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.dataset.index;
                const mail = mails[idx];
                if (mail.attachment) {
                    player.gold += mail.attachment.gold || 0;
                    if (mail.attachment.item) {
                        inventory.push(mail.attachment.item);
                    }
                }
                mails.splice(idx, 1);
                addLog('领取邮件附件');
                saveCharacter();
                render();
            });
        });
    } else if (func === 'guild') {
        document.getElementById('createGuild')?.addEventListener('click', () => {
            const name = document.getElementById('guildName').value;
            if (name) {
                guild = { name, members: [currentUser.uid] };
                addLog(`创建公会 ${name}`);
                saveCharacter();
                render();
            }
        });
        document.getElementById('leaveGuild')?.addEventListener('click', () => {
            guild = null;
            addLog('退出公会');
            saveCharacter();
            render();
        });
    } else if (func === 'gacha') {
        document.getElementById('doGacha')?.addEventListener('click', () => {
            if (player.gold >= 100) {
                player.gold -= 100;
                const r = Math.random();
                let result;
                if (r < 0.4) result = { ...shopItems.find(i => i.id === 'potion') };
                else if (r < 0.7) result = { ...shopItems.find(i => i.id === 'material1') };
                else if (r < 0.9) result = { ...petTemplates[Math.floor(Math.random() * petTemplates.length)] };
                else result = { ...shopItems.find(i => i.id === 'sword2') };
                result.qty = 1;
                inventory.push(result);
                gachaHistory.push(result.name);
                addLog(`抽卡获得: ${result.name}`);
                saveCharacter();
                render();
            } else addLog('金币不足100');
        });
        document.getElementById('doGachaTen')?.addEventListener('click', () => {
            if (player.gold >= 900) {
                player.gold -= 900;
                for (let i = 0; i < 10; i++) {
                    const r = Math.random();
                    let result;
                    if (r < 0.4) result = { ...shopItems.find(i => i.id === 'potion') };
                    else if (r < 0.7) result = { ...shopItems.find(i => i.id === 'material1') };
                    else if (r < 0.9) result = { ...petTemplates[Math.floor(Math.random() * petTemplates.length)] };
                    else result = { ...shopItems.find(i => i.id === 'sword2') };
                    result.qty = 1;
                    inventory.push(result);
                    gachaHistory.push(result.name);
                }
                addLog('十连抽完成');
                saveCharacter();
                render();
            } else addLog('金币不足900');
        });
    } else if (func === 'pets') {
        document.querySelectorAll('.selectPet').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const petId = e.target.dataset.id;
                const pet = pets.find(p => p.id === petId);
                if (pet) {
                    if (player.pet) inventory.push({ ...player.pet, qty: 1 });
                    player.pet = { 
                        id: pet.id, 
                        name: pet.name, 
                        type: pet.type,
                        desc: pet.desc || '',
                        atk: pet.atk || 0, 
                        def: pet.def || 0, 
                        agi: pet.agi || 0 
                    };
                    pets = pets.filter(p => p.id !== petId);
                    addLog(`${pet.name} 已出战`);
                    updateHp();
                    saveCharacter();
                    render();
                }
            });
        });
    } else if (func === 'market') {
        // 上架物品
        document.getElementById('listMarket')?.addEventListener('click', () => {
            const select = document.getElementById('marketItemSelect');
            const idx = select.value;
            const price = parseInt(document.getElementById('marketPrice').value) || 50;
            if (idx !== '' && inventory[idx]) {
                const item = inventory[idx];
                // 复制完整物品信息，移除 qty（因为只上架一个）
                const listingItem = { ...item };
                delete listingItem.qty; // 上架后数量为1，由交易行记录
                listingItem.price = price;
                listingItem.seller = currentUser.uid;
                marketplace.push(listingItem);
                // 从背包移除（减少数量或删除）
                if (item.qty && item.qty > 1) {
                    item.qty--;
                } else {
                    inventory.splice(idx, 1);
                }
                addLog('上架成功');
                saveCharacter();
                render();
            }
        });
        // 购买物品
        document.querySelectorAll('.buyMarket').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.dataset.index;
                const listing = marketplace[idx];
                if (player.gold >= listing.price) {
                    player.gold -= listing.price;
                    const boughtItem = { ...listing, qty: 1 };
                    delete boughtItem.price;
                    delete boughtItem.seller;
                    inventory.push(boughtItem);
                    marketplace.splice(idx, 1);
                    addLog(`购买 ${listing.name} 成功`);
                    saveCharacter();
                    render();
                } else addLog('金币不足');
            });
        });
    } else if (func === 'dailyTasks') {
        document.getElementById('claimDailyRewards')?.addEventListener('click', () => {
            dailyTasks.forEach(t => {
                if (t.progress >= t.target && !t.completed) {
                    t.completed = true;
                    player.exp += t.rewardExp;
                    player.gold += t.rewardGold;
                    addLog(`完成每日任务 ${t.name}，获得奖励`);
                }
            });
            saveCharacter();
            render();
        });
    } else if (func === 'events') {
        document.getElementById('startEvent')?.addEventListener('click', () => {
            activeEvent = { name: '双倍掉落', desc: '活动期间副本掉落率双倍', start: new Date() };
            addLog('活动已开启');
            saveCharacter();
            render();
        });
    }
}

function updateQuestProgress(type, amount = 1) {
    quests.forEach(q => {
        if (!q.completed && q.type === type) {
            q.progress = Math.min(q.progress + amount, q.target);
        }
    });
}

function updateDailyTaskProgress(type, amount = 1) {
    const today = new Date().toDateString();
    dailyTasks.forEach(t => {
        if (t.date !== today) {
            t.progress = 0;
            t.completed = false;
            t.date = today;
        }
        if (!t.completed && t.type === type) {
            t.progress = Math.min(t.progress + amount, t.target);
        }
    });
}

// ==================== 启动 ====================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadCharacter();
        currentTab = 'status';
        addLog('连接至创世世界');
    } else {
        currentUser = null;
        player = null;
        currentTab = 'login';
    }
    render();
});
render();