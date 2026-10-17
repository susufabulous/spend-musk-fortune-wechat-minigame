// js/databus.js —— 全局状态与游戏逻辑（50 商品，图片按 1.jpg~50.jpg 命名）
const INITIAL_MONEY = 400000000000;
const BASE_INCOME   = 2000000;

// img 字段对应 images/ 目录下的图片文件（1.jpg ~ 50.jpg）；文件不存在时自动用 emoji 兜底
const BUILTIN_ASSETS = [
  // —— 交通（1-8） ——
  { id:'tesla',    icon:'🚗', img:'1.jpg',  cat:'交通', name:'特斯拉 Model S',       price:90000,        desc:'电动爹入门款',            inc:0 },
  { id:'rr',       icon:'🚗', img:'2.jpg',  cat:'交通', name:'劳斯莱斯幻影',         price:500000,      desc:'对开门星空顶',            inc:0 },
  { id:'ferrari',  icon:'🏎️', img:'3.jpg', cat:'交通', name:'法拉利 SF90',          price:700000,      desc:'声浪比账单还响',          inc:0 },
  { id:'bugatti',  icon:'🏎️', img:'4.jpg', cat:'交通', name:'布加迪 Chiron',         price:3000000,    desc:'一台抵一套房',            inc:0 },
  { id:'rv',       icon:'🚐', img:'5.jpg',  cat:'交通', name:'顶配 A 型房车',         price:2000000,    desc:'开到哪都是家',            inc:0 },
  { id:'harley',   icon:'🏍️', img:'6.jpg', cat:'交通', name:'哈雷摩托车',           price:30000,      desc:'自由与落枕',              inc:0 },
  { id:'limo',     icon:'🚘', img:'7.jpg',  cat:'交通', name:'加长礼宾车',           price:400000,    desc:'车门比你家客厅长',        inc:0 },
  { id:'offroad',  icon:'🛻', img:'8.jpg',  cat:'交通', name:'履带越野房车',         price:1500000,   desc:'无人区也能洗澡',          inc:0 },
  // —— 空中（9-14） ——
  { id:'heli',     icon:'🚁', img:'9.jpg',  cat:'空中', name:'空客 H130 直升机',      price:3500000,    desc:'告别早高峰',              inc:0 },
  { id:'g650',     icon:'✈️', img:'10.jpg', cat:'空中', name:'湾流 G650 私人飞机',    price:65000000,   desc:'跨大西洋不加油',          inc:0 },
  { id:'acj',      icon:'✈️', img:'11.jpg', cat:'空中', name:'空客 ACJ319 公务机',    price:110000000,   desc:'带卧室和淋浴',            inc:0 },
  { id:'b747',     icon:'✈️', img:'12.jpg', cat:'空中', name:'波音 747 空中宫殿',    price:400000000,   desc:'维护费约小国 GDP',        inc:0 },
  { id:'dragon',   icon:'🚀', img:'13.jpg', cat:'空中', name:'SpaceX 龙飞船座位',    price:55000000,    desc:'给自己发张船票',          inc:0 },
  { id:'airforce', icon:'✈️', img:'14.jpg', cat:'空中', name:'空军一号同款',         price:660000000,   desc:'总统专机 downgrade 版',   inc:0 },
  // —— 水上（15-18） ——
  { id:'yacht40',  icon:'🚢', img:'15.jpg', cat:'水上', name:'40 米豪华游艇',         price:25000000,    desc:'船员比客人多',            inc:0 },
  { id:'yacht100', icon:'🛥️', img:'16.jpg', cat:'水上', name:'100 米超级游艇',        price:600000000,   desc:'带泳池和潜艇',            inc:0 },
  { id:'sub',      icon:'🛟', img:'17.jpg', cat:'水上', name:'私人潜水艇',             price:50000000,   desc:'海底两万里自由行',        inc:0 },
  { id:'sail',     icon:'⛵', img:'18.jpg', cat:'水上', name:'豪华双体帆船',           price:2000000,    desc:'出海看鲸鱼',              inc:0 },
  // —— 房产（19-24） ——
  { id:'villa',    icon:'🏠', img:'19.jpg', cat:'房产', name:'洛杉矶半山别墅',         price:15000000,    desc:'对着好莱坞山',            inc:0 },
  { id:'penta',    icon:'🏙️', img:'20.jpg', cat:'房产', name:'曼哈顿顶层公寓',         price:60000000,    desc:'卫生间能住一家人',        inc:0 },
  { id:'bldg',     icon:'🏢', img:'21.jpg', cat:'房产', name:'整栋纽约公寓楼',         price:1200000000,  desc:'当房东收租',              inc:0 },
  { id:'castle',   icon:'🏰', img:'22.jpg', cat:'房产', name:'欧洲中世纪城堡',         price:50000000,    desc:'吸血鬼都嫌旧',            inc:0 },
  { id:'winery',   icon:'🍇', img:'23.jpg', cat:'房产', name:'波尔多葡萄酒庄',         price:20000000,    desc:'庄园红酒管够',            inc:0 },
  { id:'dubai',    icon:'🌇', img:'24.jpg', cat:'房产', name:'迪拜顶层公寓',           price:40000000,    desc:'推开窗是哈利法塔',        inc:0 },
  // —— 土地（25-28） ——
  { id:'island',   icon:'🏝️', img:'25.jpg', cat:'土地', name:'斐济私人岛屿',         price:250000000,   desc:'海和椰子树都是你的',      inc:0 },
  { id:'landmark', icon:'🌆', img:'26.jpg', cat:'土地', name:'拿下一座地标摩天楼',    price:2500000000,  desc:'换 logo 那天全城熄灯',    inc:0 },
  { id:'airport',  icon:'🛬', img:'27.jpg', cat:'土地', name:'巴哈马私人机场',         price:1500000000,  desc:'私人飞机专属停机坪',      inc:0 },
  { id:'ranch',    icon:'🤠', img:'28.jpg', cat:'土地', name:'德州大牧场',               price:80000000,    desc:'骑马放羊当西部牛仔',      inc:0 },
  // —— 收藏（29-33） ——
  { id:'vangogh',  icon:'🖼️', img:'29.jpg', cat:'收藏', name:'梵高真迹',                price:100000000,   desc:'挂餐厅配菜更贵',          inc:0 },
  { id:'diamond',  icon:'💎', img:'30.jpg', cat:'收藏', name:'顶级粉钻',                price:50000000,    desc:'举手投足都是流量',        inc:0 },
  { id:'carcol',   icon:'🏎️', img:'31.jpg', cat:'收藏', name:'古董跑车收藏组',          price:20000000,    desc:'10 台老爷车博物馆',       inc:0 },
  { id:'patek',    icon:'⌚', img:'32.jpg', cat:'收藏', name:'百达翡丽腕表',            price:2000000,     desc:'时间就是金钱',            inc:0 },
  { id:'crown',    icon:'👑', img:'33.jpg', cat:'收藏', name:'古董皇冠珠宝',            price:30000000,    desc:'戴上去就是王室',          inc:0 },
  // —— 产业（34-43，买了涨进账） ——
  { id:'tslastk',  icon:'⚡', img:'34.jpg', cat:'产业', name:'特斯拉 1% 股份',          price:8000000000,  desc:'加仓自己公司',            inc:600000 },
  { id:'spacex',   icon:'🚀', img:'35.jpg', cat:'产业', name:'SpaceX 1% 股份',          price:7000000000,  desc:'星链每圈都在打钱',        inc:500000 },
  { id:'xcorp',    icon:'🐦', img:'36.jpg', cat:'产业', name:'X 平台股权',               price:4000000000,  desc:'言论自由按条结算',        inc:250000 },
  { id:'nba',      icon:'🏀', img:'37.jpg', cat:'产业', name:'一支 NBA 球队',           price:3500000000,  desc:'球衣印你的名字',          inc:180000 },
  { id:'epl',      icon:'⚽', img:'38.jpg', cat:'产业', name:'一支英超俱乐部',           price:5000000000,  desc:'排名靠你打电话',          inc:300000 },
  { id:'f1',       icon:'🏎️', img:'39.jpg', cat:'产业', name:'赞助一支 F1 车队',         price:6000000000,  desc:'引擎烧的是现金',          inc:250000 },
  { id:'record',   icon:'🎵', img:'40.jpg', cat:'产业', name:'一家唱片公司',             price:1000000000,  desc:'榜单你说了算',            inc:120000 },
  { id:'airline',  icon:'✈️', img:'41.jpg', cat:'产业', name:'一家航空公司',             price:5000000000,  desc:'机票定价权在你手',        inc:200000 },
  { id:'chip',     icon:'💾', img:'42.jpg', cat:'产业', name:'一家芯片公司',             price:10000000000, desc:'卡你脖子也卡别人脖子',    inc:400000 },
  { id:'esports',  icon:'🎮', img:'43.jpg', cat:'产业', name:'一支电竞俱乐部',           price:500000000,   desc:'冠军皮肤你抽成',          inc:80000 },
  // —— 神操作（44-50） ——
  { id:'fans',     icon:'💰', img:'44.jpg', cat:'神操作', name:'给每位粉丝发 1 美元',     price:100000000,   desc:'1 亿粉丝雨露均沾',        inc:0 },
  { id:'paint',    icon:'🎨', img:'45.jpg', cat:'神操作', name:'把纪念碑刷成 Tesla 红',   price:50000000,    desc:'公关与罚款混合物',        inc:0 },
  { id:'charity',  icon:'💝', img:'46.jpg', cat:'神操作', name:'捐 10 亿做慈善',          price:1000000000,  desc:'人设暴涨账户暴跌',        inc:0 },
  { id:'timesq',   icon:'📺', img:'47.jpg', cat:'神操作', name:'包下时代广场广告一周',   price:10000000,    desc:'全纽约看你脸色',          inc:0 },
  { id:'firework', icon:'🎆', img:'48.jpg', cat:'神操作', name:'定制海上烟花秀',          price:20000000,    desc:'整片海滩为你亮灯',        inc:0 },
  { id:'employee', icon:'🚗', img:'49.jpg', cat:'神操作', name:'给员工每人发辆车',        price:500000000,   desc:'HR 哭了快递员笑了',      inc:0 },
  { id:'nation',   icon:'🏴', img:'50.jpg', cat:'神操作', name:'买小岛宣布建国',          price:1000000000,  desc:'国歌自己写护照自己印',    inc:0 },
];

const CATS = ['全部','交通','空中','水上','房产','土地','收藏','产业','神操作'];

let S = null;
let customAssets = [];

function loadCustomAssets() {
  try {
    const raw = wx.getStorageSync('customAssets');
    if (raw) customAssets = JSON.parse(raw);
  } catch (e) { customAssets = []; }
}
function saveCustomAssets() {
  try { wx.setStorageSync('customAssets', JSON.stringify(customAssets)); } catch (e) {}
}
function addCustomAsset(name, price) {
  const a = {
    id: 'custom_' + Date.now(),
    icon: '🎁', img: '', cat: '神操作', name: name,
    price: Math.max(1, Math.floor(price)),
    desc: '我自己想花的钱', inc: 0
  };
  customAssets.push(a);
  saveCustomAssets();
  return a;
}
function allAssets() {
  return BUILTIN_ASSETS.concat(customAssets);
}

function resetState() {
  S = {
    money: INITIAL_MONEY,
    income: BASE_INCOME,
    spent: 0,
    earned: 0,
    bought: {},
    start: Date.now(),
    lastTick: Date.now(),
    filter: '全部',
    showSettle: false,
    scroll: 0,
    customDialog: false,
    draftName: '',
    draftPrice: '',
  };
  allAssets().forEach(a => { S.bought[a.id] = 0; });
}

function tick() {
  const now = Date.now();
  const dt = (now - S.lastTick) / 1000;
  S.lastTick = now;
  const gain = S.income * dt;
  S.money += gain;
  S.earned += gain;
}

function buy(asset) {
  if (S.money < asset.price) return false;
  S.money -= asset.price;
  S.spent += asset.price;
  S.bought[asset.id]++;
  if (asset.inc) S.income += asset.inc;
  return true;
}

function sell(asset) {
  if (S.bought[asset.id] <= 0) return false;
  S.bought[asset.id]--;
  S.money += asset.price;
  S.spent -= asset.price;
  if (asset.inc) S.income -= asset.inc;
  return true;
}

function fmt(n) {
  n = Math.floor(n);
  const abs = Math.abs(n);
  if (abs >= 1e12) return '$' + (n/1e12).toFixed(2) + 'T';
  if (abs >= 1e9)  return '$' + (n/1e9).toFixed(2) + 'B';
  if (abs >= 1e6)  return '$' + (n/1e6).toFixed(1) + 'M';
  if (abs >= 1e3)  return '$' + (n/1e3).toFixed(1) + 'K';
  return '$' + n;
}
function fmtFull(n) {
  return '$' + Math.floor(n).toLocaleString('en-US');
}

module.exports = {
  CATS, INITIAL_MONEY, BASE_INCOME,
  resetState, tick, buy, sell, fmt, fmtFull,
  allAssets, addCustomAsset, loadCustomAssets,
  get state() { return S; }
};
