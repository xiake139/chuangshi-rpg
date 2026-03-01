// ==================== 配置 ====================
// ⚠️ 后端 API 基础地址（根据你的实际后端地址修改）
const API_BASE = 'https://chuangshi-rpg-production.up.railway.app/api';
let token = localStorage.getItem('token') || null;
let userId = localStorage.getItem('userId') || null;

// ==================== 全局状态 ====================
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
const shopItems = [ /* 原内容不变，此处省略节省篇幅，实际使用时请完整保留 */ ];
const dungeons = [ /* 原内容不变 */ ];
const petTemplates = [ /* 原内容不变 */ ];
const questTemplates = [ /* 原内容不变 */ ];
const dailyTaskTemplates = [ /* 原内容不变 */ ];

// ==================== 辅助函数 ====================
function addLog(msg) {
    if (msg.includes('✅')) {
        gameLog = gameLog.filter(log => !log.includes('❌'));
    }
    gameLog.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
    if (gameLog.length > 15) gameLog.pop();
    render();
}

function calcPlayerStats() { /* 原函数内容不变，此处省略 */ }
function updateHp() { /* 原函数内容不变，此处省略 */ }

// ==================== API 交互 ====================
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '请求失败');
    }
    return res.json();
}

async function saveCharacter() {
    if (!token || !player) return;
    try {
        await apiCall('/game/character', 'POST', player);
        await apiCall('/game/inventory', 'POST', { items: inventory });
        await apiCall('/game/extra', 'POST', {
            dailyCheckin, quests, friends, mails, guild,
            gachaHistory, pets, marketplace, dailyTasks, activeEvent
        });
        addLog('✅ 数据保存成功');
    } catch (e) {
        console.error('保存失败', e);
        addLog(`❌ 保存失败: ${e.message}`);
    }
}

async function loadGameData() {
    const data = await apiCall('/game/data');
    player = data.character;
    inventory = data.inventory || [];
    const ex = data.extra || {};
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

    // 兼容旧数据
    player.baseAttack = player.baseAttack || 15;
    player.baseDefense = player.baseDefense || 0;
    player.baseAgility = player.baseAgility || 0;
    player.baseMaxHp = player.baseMaxHp || 100;
    player.hp = player.hp ?? player.maxHp;

    updateHp();
}

function logout() {
    token = null;
    userId = null;
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    player = null;
    currentTab = 'login';
    render();
}

// ==================== 界面渲染（全部保留原内容，此处省略以节省篇幅，实际使用时请完整保留）====================
function render() { /* 原内容不变，需确保内部调用了正确的全局变量 */ }
function renderAuthScreen() { /* 原内容不变 */ }
function renderMainGame() { /* 原内容不变 */ }
function renderStatus() { /* 原内容不变 */ }
function renderInventory() { /* 原内容不变 */ }
function renderDungeon() { /* 原内容不变 */ }
function renderShop() { /* 原内容不变 */ }
function renderMap() { /* 原内容不变 */ }
function renderCheckin() { /* 原内容不变 */ }
function renderExtra() { /* 原内容不变 */ }

// ==================== 事件绑定（全部修改为使用 token 和 userId，并添加 await saveCharacter()）====================
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
            if (!email || !pass) {
                errorDiv.innerHTML = '邮箱和密码不能为空';
                errorDiv.style.display = 'block';
                return;
            }
            try {
                const data = await apiCall('/auth/login', 'POST', { email, password: pass });
                token = data.token;
                userId = data.userId;
                localStorage.setItem('token', token);
                localStorage.setItem('userId', userId);
                await loadGameData();
                currentTab = 'status';
                addLog(`欢迎回来，${player.name}`);
                render();
            } catch (e) {
                errorDiv.innerHTML = e.message;
                errorDiv.style.display = 'block';
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
                const data = await apiCall('/auth/register', 'POST', { email, password: pass, name });
                token = data.token;
                userId = data.userId;
                localStorage.setItem('token', token);
                localStorage.setItem('userId', userId);
                player = data.character;
                inventory = [];
                await loadGameData(); // 加载初始任务等
                addLog('角色创建成功，冒险开始！');
                render();
            } catch (e) {
                errorDiv.innerHTML = e.message;
                errorDiv.style.display = 'block';
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

    document.getElementById('logoutBtn')?.addEventListener('click', logout);

    document.getElementById('clearLogBtn')?.addEventListener('click', () => {
        gameLog = [];
        render();
    });

    // 使用物品
    document.querySelectorAll('.use-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
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
                await saveCharacter();
                render();
            } else {
                addLog('该物品不能直接使用');
            }
        });
    });

    // 装备物品
    document.querySelectorAll('.equip-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
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
            await saveCharacter();
            render();
        });
    });

    // 出战宠物
    document.querySelectorAll('.equip-pet').forEach(btn => {
        btn.addEventListener('click', async (e) => {
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
                await saveCharacter();
                render();
            }
        });
    });

    // 购买物品
    document.querySelectorAll('.buy-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
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
                await saveCharacter();
                render();
            } else {
                addLog('金币不足');
            }
        });
    });

    // 副本战斗
    document.querySelectorAll('.fight-dungeon').forEach(btn => {
        btn.addEventListener('click', async (e) => {
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
                    updateHp();
                    player.hp = player.maxHp;
                    addLog(`🎉 升级 LV.${player.level}！`);
                } else {
                    updateHp();
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
            await saveCharacter();
            render();
        });
    });

    // 签到
    document.getElementById('checkinBtn')?.addEventListener('click', async () => {
        const today = new Date().toDateString();
        if (dailyCheckin.last !== today) {
            dailyCheckin.last = today;
            dailyCheckin.days++;
            let rewardGold = 50;
            if (dailyCheckin.days % 7 === 0) rewardGold += 100;
            player.gold += rewardGold;
            addLog(`签到成功！第${dailyCheckin.days}天，获得${rewardGold}G`);
            await saveCharacter();
            render();
        }
    });

    // 地图探索
    document.querySelectorAll('.travel').forEach(btn => {
        btn.addEventListener('click', async (e) => {
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
            await saveCharacter();
            render();
        });
    });

    // 额外功能按钮（部分需要使用 userId 替代 currentUser.uid）
    document.querySelectorAll('.extra-func').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const func = e.target.dataset.func;
            const detailDiv = document.getElementById('extraDetail');
            let content = '';
            // 内容生成部分完全保留原样，此处省略以节省篇幅
            detailDiv.innerHTML = content;
            attachExtraButtons(func);
        });
    });
}

function attachExtraButtons(func) {
    // 此函数中所有使用 currentUser.uid 的地方应替换为 userId
    if (func === 'guild') {
        document.getElementById('createGuild')?.addEventListener('click', async () => {
            const name = document.getElementById('guildName').value;
            if (name) {
                guild = { name, members: [userId] };  // 替换为 userId
                addLog(`创建公会 ${name}`);
                await saveCharacter();
                render();
            }
        });
        // 其他类似
    } else if (func === 'market') {
        document.getElementById('listMarket')?.addEventListener('click', async () => {
            const select = document.getElementById('marketItemSelect');
            const idx = select.value;
            const price = parseInt(document.getElementById('marketPrice').value) || 50;
            if (idx !== '' && inventory[idx]) {
                const item = inventory[idx];
                const listingItem = { ...item };
                delete listingItem.qty;
                listingItem.price = price;
                listingItem.seller = userId;  // 替换为 userId
                marketplace.push(listingItem);
                if (item.qty && item.qty > 1) {
                    item.qty--;
                } else {
                    inventory.splice(idx, 1);
                }
                addLog('上架成功');
                await saveCharacter();
                render();
            }
        });
    }
    // 其他 extra 按钮处理类似，需确保所有事件监听器中用 userId 替换 currentUser.uid，并在修改数据后调用 await saveCharacter()
    // 由于篇幅，这里不再全部重复，实际使用时请将原 extra 按钮处理函数中的 currentUser.uid 全部替换为 userId，并在每个操作后调用 await saveCharacter()。
}

function updateQuestProgress(type, amount = 1) { /* 原内容不变 */ }
function updateDailyTaskProgress(type, amount = 1) { /* 原内容不变 */ }

// ==================== 启动 ====================
(async function init() {
    if (token) {
        try {
            await loadGameData();
            currentTab = 'status';
            addLog('连接至创世世界');
        } catch (e) {
            console.error('自动登录失败', e);
            logout();
        }
    }
    render();
})();