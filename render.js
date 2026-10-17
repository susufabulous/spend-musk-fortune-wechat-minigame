// js/render.js —— Canvas 绘制层（完整金额 + 大字体 + 双框卡片 + 结算明细）
const DB = require('./databus.js');

const DESIGN_W = 375;
const SIDEBAR_W = 72;
const BOTTOM_H  = 60;

const CARD_GAP = 8;
const CARD_W   = (DESIGN_W - SIDEBAR_W - 16 - CARD_GAP) / 2;
const CARD_H   = 150;   // 加高容纳双框
const ROW_GAP  = 8;

class Render {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.W = canvas.width;
    this.H = canvas.height;
    this.scale = this.W / DESIGN_W;
    this.logicalH = this.H / this.scale;
    this.headerH = this.logicalH * 0.26;

    // 马斯克头像
    this.avatarReady = false;
    this.avatar = wx.createImage();
    this.avatar.onload = () => { this.avatarReady = true; };
    this.avatar.src = 'images/elon.jpg';

    // 预加载商品图
    this.images = {};
    DB.allAssets().forEach(a => {
      if (!a.img) return;
      const img = wx.createImage();
      img.onload = () => { this.images[a.id] = img; };
      img.src = 'images/' + a.img;
    });

    this.touchStartY = 0;
    this.startScroll = 0;
    this.dragging = false;
    this.moved = false;
    this.hitAreas = [];
  }

  X(px) { return px * this.scale; }

  visibleList() {
    return DB.allAssets().filter(a => DB.state.filter === '全部' || a.cat === DB.state.filter);
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#f4f5f7';
    ctx.fillRect(0, 0, this.W, this.H);
    this.hitAreas = [];

    this.drawHeader();
    this.drawSidebar();
    this.drawList();
    this.drawBottomBar();
    if (DB.state.showSettle) this.drawSettle();
    if (DB.state.customDialog) this.drawCustomDialog();
  }

  // ===== 顶部：完整金额大数字 + 四项粗体数据 =====
  drawHeader() {
    const ctx = this.ctx;
    const h = this.headerH;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, this.W, this.X(h));

    const padTop = 44;

    // 圆形头像
    const avSize = 52;
    const avX = 14, avY = padTop;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.X(avX + avSize/2), this.X(avY + avSize/2), this.X(avSize/2), 0, Math.PI*2);
    ctx.clip();
    if (this.avatarReady) {
      ctx.drawImage(this.avatar, this.X(avX), this.X(avY), this.X(avSize), this.X(avSize));
    } else {
      ctx.fillStyle = '#e6e8ec';
      ctx.fillRect(this.X(avX), this.X(avY), this.X(avSize), this.X(avSize));
    }
    ctx.restore();

    // 余额：完整千分位，不缩写
    ctx.fillStyle = '#111418';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '800 ' + this.X(22) + 'px sans-serif';
    ctx.fillText(DB.fmtFull(DB.state.money * 7.2).replace('$','￥'), this.X(avX + avSize + 10), this.X(avY + 28));

    // 下面小字标注 + B 简写
    ctx.fillStyle = '#9aa0a6';
    ctx.font = '700 ' + this.X(18) + 'px sans-serif';
    ctx.fillText(DB.fmt(DB.state.money) + ' 美元', this.X(avX + avSize + 10), this.X(avY + 46));

    // 2x2 数据网格（再加大加粗）
    const gridY = avY + avSize + 14;
    const cellW = (DESIGN_W - 28) / 2;
    const cells = [
      { label: '每秒进账', value: '+' + DB.fmt(DB.state.income).slice(1), color: '#0f9d58' },
      { label: '累计已花', value: DB.fmt(DB.state.spent), color: '#111418' },
      { label: '游戏用时', value: this.fmtTime(), color: '#111418' },
      { label: '还剩', value: this.leftPct() + '%', color: '#111418' },
    ];
    cells.forEach((c, i) => {
      const cx = 14 + (i % 2) * cellW;
      const cy = gridY + Math.floor(i / 2) * 36;
      ctx.fillStyle = '#6b7280';
      ctx.font = '600 ' + this.X(12) + 'px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(c.label, this.X(cx), this.X(cy));
      ctx.fillStyle = c.color;
      ctx.font = '900 ' + this.X(20) + 'px sans-serif';
      ctx.fillText(c.value, this.X(cx), this.X(cy + 24));
    });

    ctx.fillStyle = '#e6e8ec';
    ctx.fillRect(0, this.X(h - 1), this.W, this.X(1));
  }

  fmtTime() {
    const sec = Math.floor((Date.now() - DB.state.start) / 1000);
    return String(Math.floor(sec/60)).padStart(2,'0') + ':' + String(sec%60).padStart(2,'0');
  }
  leftPct() {
    const totalEver = DB.INITIAL_MONEY + DB.state.earned;
    return Math.max(0, DB.state.money / totalEver * 100).toFixed(1);
  }

  // ===== 左侧分类栏 =====
  drawSidebar() {
    const ctx = this.ctx;
    const y0 = this.headerH;
    const h = this.logicalH - this.headerH - BOTTOM_H;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, this.X(y0), this.X(SIDEBAR_W), this.X(h));

    const itemH = 46;
    DB.CATS.forEach((cat, i) => {
      const cy = y0 + i * itemH;
      if (cy + itemH > y0 + h) return;
      const active = DB.state.filter === cat;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = (active ? '700 ' : '400 ') + this.X(12) + 'px sans-serif';
      ctx.fillStyle = active ? '#111418' : '#6b7280';
      ctx.fillText(cat, this.X(SIDEBAR_W/2), this.X(cy + itemH/2));

      if (active) {
        ctx.fillStyle = '#111418';
        ctx.fillRect(this.X(6), this.X(cy + 10), this.X(3), this.X(itemH - 20));
      }
      this.hitAreas.push({ type: 'tab', cat: cat, x: 0, y: cy, w: SIDEBAR_W, h: itemH });
    });

    const addY = y0 + h - 44;
    ctx.fillStyle = '#eef0f3';
    this.roundRect(this.X(8), this.X(addY), this.X(SIDEBAR_W - 16), this.X(36), this.X(8));
    ctx.fill();
    ctx.fillStyle = '#111418';
    ctx.font = '700 ' + this.X(11) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+ 自定义', this.X(SIDEBAR_W/2), this.X(addY + 18));
    this.hitAreas.push({ type: 'addCustom', x: 8, y: addY, w: SIDEBAR_W - 16, h: 36 });
  }

  // ===== 两列卡片：双框布局（左持有数标签 + 右购买按钮） =====
  drawList() {
    const ctx = this.ctx;
    const listX = SIDEBAR_W;
    const listTop = this.headerH;
    const listBottom = this.logicalH - BOTTOM_H;
    const listH = listBottom - listTop;

    ctx.save();
    ctx.beginPath();
    ctx.rect(this.X(listX), this.X(listTop), this.W - this.X(listX), this.X(listH));
    ctx.clip();

    const list = this.visibleList();
    const scroll = DB.state.scroll;
    const rowH = CARD_H + ROW_GAP;

    list.forEach((a, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = listX + 8 + col * (CARD_W + CARD_GAP);
      const cy = listTop + row * rowH - scroll;

      if (cy + CARD_H < listTop || cy > listBottom) return;

      // 卡片
      ctx.fillStyle = '#ffffff';
      this.roundRect(this.X(cx), this.X(cy), this.X(CARD_W), this.X(CARD_H), this.X(10));
      ctx.fill();

      // 图标
      const img = this.images[a.id];
      if (img) {
        ctx.save();
        this.roundRect(this.X(cx + 10), this.X(cy + 10), this.X(34), this.X(34), this.X(8));
        ctx.clip();
        ctx.drawImage(img, this.X(cx + 10), this.X(cy + 10), this.X(34), this.X(34));
        ctx.restore();
      } else {
        ctx.font = this.X(22) + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(a.icon, this.X(cx + 12), this.X(cy + 12));
      }

      // 名称
      ctx.fillStyle = '#111418';
      ctx.font = '700 ' + this.X(13) + 'px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      let name = a.name.length > 8 ? a.name.slice(0, 8) + '…' : a.name;
      ctx.fillText(name, this.X(cx + 10), this.X(cy + 48));

      // 价格
      ctx.fillStyle = '#111418';
      ctx.font = '800 ' + this.X(15) + 'px sans-serif';
      ctx.fillText(DB.fmt(a.price), this.X(cx + 10), this.X(cy + 70));

      // —— 底部三框：左出售 / 中持有数 / 右购买 ——
      const bottomY = cy + CARD_H - 44;
      const hold = DB.state.bought[a.id];
      const gap = 4;
      const sideW = 44;
      const holdW = 44;
      const innerX = cx + 8;

      // 左框：出售（灰底红字，没货置灰）
      const canSell = hold > 0;
      const sellX = innerX;
      ctx.fillStyle = canSell ? '#fde8e8' : '#f4f5f7';
      this.roundRect(this.X(sellX), this.X(bottomY), this.X(sideW), this.X(32), this.X(8));
      ctx.fill();
      ctx.fillStyle = canSell ? '#d93025' : '#b0b3b8';
      ctx.font = '800 ' + this.X(12) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('出售', this.X(sellX + sideW/2), this.X(bottomY + 16));
      this.hitAreas.push({ type: 'sell', asset: a, x: sellX, y: bottomY, w: sideW, h: 32 });

      // 中框：持有数 ×N（绿色）
      const holdX = sellX + sideW + gap;
      ctx.fillStyle = hold > 0 ? '#e6f4ea' : '#f4f5f7';
      this.roundRect(this.X(holdX), this.X(bottomY), this.X(holdW), this.X(32), this.X(8));
      ctx.fill();
      ctx.fillStyle = hold > 0 ? '#0f9d58' : '#9aa0a6';
      ctx.font = '900 ' + this.X(13) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('×' + hold, this.X(holdX + holdW/2), this.X(bottomY + 16));

      // 右框：购买（黑色长条）
      const btnX = holdX + holdW + gap;
      const btnW = CARD_W - 8 - (btnX - cx);
      const afford = DB.state.money >= a.price;
      ctx.fillStyle = afford ? '#111418' : '#d8dade';
      this.roundRect(this.X(btnX), this.X(bottomY), this.X(btnW), this.X(32), this.X(8));
      ctx.fill();
      ctx.fillStyle = afford ? '#ffffff' : '#8a8f98';
      ctx.font = '800 ' + this.X(12) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('购买', this.X(btnX + btnW/2), this.X(bottomY + 16));
      this.hitAreas.push({ type: 'buy', asset: a, x: btnX, y: bottomY, w: btnW, h: 32 });
    });

    ctx.restore();
  }

  // ===== 底部结算按钮 =====
  drawBottomBar() {
    const ctx = this.ctx;
    const y = this.logicalH - BOTTOM_H;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, this.X(y), this.W, this.X(BOTTOM_H));
    ctx.fillStyle = '#e6e8ec';
    ctx.fillRect(0, this.X(y), this.W, this.X(1));

    const btnW = DESIGN_W - 32;
    const btnH = 44;
    const btnX = 16;
    const btnY = y + (BOTTOM_H - btnH) / 2;

    ctx.fillStyle = '#d93025';
    this.roundRect(this.X(btnX), this.X(btnY), this.X(btnW), this.X(btnH), this.X(10));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 ' + this.X(16) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('结束并结算', this.X(btnX + btnW/2), this.X(btnY + btnH/2));
    this.hitAreas.push({ type: 'settle', x: btnX, y: btnY, w: btnW, h: btnH });
  }

  // ===== 结算遮罩（含购买明细列表） =====
  drawSettle() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(17,20,24,0.6)';
    ctx.fillRect(0, 0, this.W, this.H);

    // 卡片加高到 560 容纳明细
    const cardW = DESIGN_W - 32;
    const cardH = 560;
    const cardX = 16;
    const cardY = (this.logicalH - cardH) / 2;

    ctx.fillStyle = '#ffffff';
    this.roundRect(this.X(cardX), this.X(cardY), this.X(cardW), this.X(cardH), this.X(16));
    ctx.fill();

    const totalEver = DB.INITIAL_MONEY + DB.state.earned;
    const r = DB.state.spent / totalEver;
    let grade, title, verdict;
    if (r >= 0.99)      { grade='SSS'; title='地表散尽者';   verdict='四千亿清零，人类天花板。'; }
    else if (r >= 0.95) { grade='SS';  title='钞能力清零';   verdict='几乎一分不剩。'; }
    else if (r >= 0.85) { grade='S';   title='挥金如土';     verdict='大手脚花掉八成半。'; }
    else if (r >= 0.7)  { grade='A';   title='富哥本哥';     verdict='七成家底已清空。'; }
    else if (r >= 0.5)  { grade='B';   title='入门挥霍';     verdict='产业每秒还在进账。'; }
    else if (r >= 0.3)  { grade='C';   title='精打细算';     verdict='你居然开始比价了。'; }
    else if (r >= 0.15) { grade='D';   title='守财奴';       verdict='钱几乎没动。'; }
    else                { grade='E';    title='新首富诞生';   verdict='你是来接班的。'; }

    const items = Object.values(DB.state.bought).reduce((a,b)=>a+b,0);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // 评级
    ctx.fillStyle = '#111418';
    ctx.font = '800 ' + this.X(40) + 'px sans-serif';
    ctx.fillText(grade, this.X(cardX + 18), this.X(cardY + 52));

    ctx.font = '700 ' + this.X(16) + 'px sans-serif';
    ctx.fillText(title, this.X(cardX + 18), this.X(cardY + 80));

    ctx.fillStyle = '#6b7280';
    ctx.font = '400 ' + this.X(11) + 'px sans-serif';
    ctx.fillText(verdict, this.X(cardX + 18), this.X(cardY + 98));

    // 汇总行
    const rows = [
      ['总花费', DB.fmtFull(DB.state.spent)],
      ['期末剩余', DB.fmtFull(DB.state.money)],
      ['购入件数', items + ' 件'],
      ['游戏时长', this.fmtTime()],
    ];
    rows.forEach((row, i) => {
      const ry = cardY + 120 + i * 24;
      ctx.fillStyle = '#6b7280';
      ctx.font = '400 ' + this.X(11) + 'px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(row[0], this.X(cardX + 18), this.X(ry));
      ctx.fillStyle = '#111418';
      ctx.font = '700 ' + this.X(11) + 'px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(row[1], this.X(cardX + cardW - 18), this.X(ry));
    });

    // —— 购买明细列表 ——
    ctx.fillStyle = '#111418';
    ctx.font = '700 ' + this.X(12) + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('购买明细：', this.X(cardX + 18), this.X(cardY + 228));

    // 列出有购买的商品
    const boughtList = DB.allAssets().filter(a => DB.state.bought[a.id] > 0);
    let detailY = cardY + 248;
    const maxDetailY = cardY + cardH - 110;

    boughtList.forEach((a) => {
      if (detailY > maxDetailY) {
        ctx.fillStyle = '#9aa0a6';
        ctx.font = '400 ' + this.X(10) + 'px sans-serif';
        ctx.fillText('… 其余略', this.X(cardX + 18), this.X(detailY));
        return;
      }
      const qty = DB.state.bought[a.id];
      const cost = a.price * qty;
      ctx.fillStyle = '#111418';
      ctx.font = '500 ' + this.X(11) + 'px sans-serif';
      ctx.textAlign = 'left';
      let name = a.name.length > 10 ? a.name.slice(0, 10) + '…' : a.name;
      ctx.fillText(name + ' ×' + qty, this.X(cardX + 18), this.X(detailY));
      ctx.textAlign = 'right';
      ctx.fillStyle = '#d93025';
      ctx.font = '700 ' + this.X(11) + 'px sans-serif';
      ctx.fillText('-' + DB.fmt(cost), this.X(cardX + cardW - 18), this.X(detailY));
      detailY += 20;
    });

    if (boughtList.length === 0) {
      ctx.fillStyle = '#9aa0a6';
      ctx.font = '400 ' + this.X(11) + 'px sans-serif';
      ctx.fillText('（你什么都没买）', this.X(cardX + 18), this.X(detailY));
    }

    // 三个按钮
    const btnY2 = cardY + cardH - 100;
    const btnH2 = 40;
    const gap = 8;
    const btnW2 = (cardW - 36 - gap * 2) / 3;

    ctx.fillStyle = '#0f9d58';
    this.roundRect(this.X(cardX + 18), this.X(btnY2), this.X(btnW2), this.X(btnH2), this.X(10));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 ' + this.X(11) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('分享战绩', this.X(cardX + 18 + btnW2/2), this.X(btnY2 + btnH2/2));
    this.hitAreas.push({ type: 'share', x: cardX + 18, y: btnY2, w: btnW2, h: btnH2 });

    ctx.fillStyle = '#eef0f3';
    this.roundRect(this.X(cardX + 28 + btnW2), this.X(btnY2), this.X(btnW2), this.X(btnH2), this.X(10));
    ctx.fill();
    ctx.fillStyle = '#111418';
    ctx.fillText('继续挥霍', this.X(cardX + 28 + btnW2 + btnW2/2), this.X(btnY2 + btnH2/2));
    this.hitAreas.push({ type: 'closeSettle', x: cardX + 28 + btnW2, y: btnY2, w: btnW2, h: btnH2 });

    ctx.fillStyle = '#111418';
    this.roundRect(this.X(cardX + 38 + btnW2*2), this.X(btnY2), this.X(btnW2), this.X(btnH2), this.X(10));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('再来一局', this.X(cardX + 38 + btnW2 + btnW2*1.5), this.X(btnY2 + btnH2/2));
    this.hitAreas.push({ type: 'restart', x: cardX + 38 + btnW2*2, y: btnY2, w: btnW2, h: btnH2 });

    ctx.textBaseline = 'alphabetic';
  }

  // ===== 自定义弹窗 =====
  drawCustomDialog() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(17,20,24,0.55)';
    ctx.fillRect(0, 0, this.W, this.H);

    const cardW = DESIGN_W - 48;
    const cardH = 260;
    const cardX = 24;
    const cardY = (this.logicalH - cardH) / 2;

    ctx.fillStyle = '#ffffff';
    this.roundRect(this.X(cardX), this.X(cardY), this.X(cardW), this.X(cardH), this.X(16));
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = '#111418';
    ctx.font = '700 ' + this.X(17) + 'px sans-serif';
    ctx.fillText('添加神操作', this.X(cardX + 20), this.X(cardY + 34));

    const nameY = cardY + 56;
    ctx.fillStyle = '#f4f5f7';
    this.roundRect(this.X(cardX + 20), this.X(nameY), this.X(cardW - 40), this.X(40), this.X(8));
    ctx.fill();
    ctx.fillStyle = '#6b7280';
    ctx.font = '400 ' + this.X(12) + 'px sans-serif';
    ctx.fillText('名称：' + (DB.state.draftName || '点此输入商品名'), this.X(cardX + 32), this.X(nameY + 25));
    this.hitAreas.push({ type: 'inputName', x: cardX + 20, y: nameY, w: cardW - 40, h: 40 });

    const priceY = nameY + 56;
    ctx.fillStyle = '#f4f5f7';
    this.roundRect(this.X(cardX + 20), this.X(priceY), this.X(cardW - 40), this.X(40), this.X(8));
    ctx.fill();
    ctx.fillStyle = '#6b7280';
    ctx.font = '400 ' + this.X(12) + 'px sans-serif';
    ctx.fillText('价格（美元）：' + (DB.state.draftPrice || '点此输入价格'), this.X(cardX + 32), this.X(priceY + 25));
    this.hitAreas.push({ type: 'inputPrice', x: cardX + 20, y: priceY, w: cardW - 40, h: 40 });

    const btnY = priceY + 56;
    const btnH = 40;
    const gap = 10;
    const btnW = (cardW - 40 - gap) / 2;

    ctx.fillStyle = '#eef0f3';
    this.roundRect(this.X(cardX + 20), this.X(btnY), this.X(btnW), this.X(btnH), this.X(10));
    ctx.fill();
    ctx.fillStyle = '#111418';
    ctx.font = '700 ' + this.X(14) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('取消', this.X(cardX + 20 + btnW/2), this.X(btnY + btnH/2));
    this.hitAreas.push({ type: 'cancelCustom', x: cardX + 20, y: btnY, w: btnW, h: btnH });

    ctx.fillStyle = '#111418';
    this.roundRect(this.X(cardX + 30 + btnW), this.X(btnY), this.X(btnW), this.X(btnH), this.X(10));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('确认添加', this.X(cardX + 30 + btnW + btnW/2), this.X(btnY + btnH/2));
    this.hitAreas.push({ type: 'confirmCustom', x: cardX + 30 + btnW, y: btnY, w: btnW, h: btnH });

    ctx.textBaseline = 'alphabetic';
  }

  roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  onTouchStart(t) {
    this.touchStartY = t.clientY / this.scale;
    this.startScroll = DB.state.scroll;
    this.dragging = true;
    this.moved = false;
  }
  onTouchMove(t) {
    if (!this.dragging) return;
    const y = t.clientY / this.scale;
    const dy = y - this.touchStartY;
    if (Math.abs(dy) > 8) this.moved = true;
    let ns = this.startScroll - dy;
    const list = this.visibleList();
    const maxScroll = Math.max(0, Math.ceil(list.length / 2) * (CARD_H + ROW_GAP) - (this.logicalH - this.headerH - BOTTOM_H));
    ns = Math.max(0, Math.min(maxScroll, ns));
    DB.state.scroll = ns;
  }
  onTouchEnd() { this.dragging = false; }
  hitTest(x, y) {
    for (let i = this.hitAreas.length - 1; i >= 0; i--) {
      const h = this.hitAreas[i];
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
    }
    return null;
  }
}

module.exports = Render;
