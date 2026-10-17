// js/main.js —— 入口：canvas、事件、主循环、自定义弹窗、分享
const DB = require('./databus.js');
const Render = require('./render.js');

class Main {
  constructor() {
    this.canvas = wx.createCanvas();
    this.ctx = this.canvas.getContext('2d');

    DB.loadCustomAssets();
    DB.resetState();
    this.render = new Render(this.canvas, this.ctx);

    this.bindTouch();
    this.loop = this.loop.bind(this);
    this.loop();
  }

  bindTouch() {
    wx.onTouchStart(e => this.render.onTouchStart(e.touches[0]));
    wx.onTouchMove(e => this.render.onTouchMove(e.touches[0]));
    wx.onTouchEnd(e => {
      const wasMoved = this.render.moved;
      this.render.onTouchEnd();
      if (wasMoved) return;
      const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
      if (!t) return;
      this.handleTap(t.clientX / this.render.scale, t.clientY / this.render.scale);
    });
  }

  handleTap(x, y) {
    const h = this.render.hitTest(x, y);
    if (!h) return;

    switch (h.type) {
      case 'tab':
        DB.state.filter = h.cat;
        DB.state.scroll = 0;
        break;
      case 'buy':
        DB.buy(h.asset);
        break;
      case 'sell':
        DB.sell(h.asset);
        break;
      case 'settle':
        DB.state.showSettle = true;
        break;
      case 'closeSettle':
        DB.state.showSettle = false;
        break;
      case 'restart':
        DB.resetState();
        break;
      case 'addCustom':
        DB.state.customDialog = true;
        DB.state.draftName = '';
        DB.state.draftPrice = '';
        break;
      case 'inputName':
        this.promptKeyboard('请输入商品名称', DB.state.draftName, (v) => {
          DB.state.draftName = v;
        });
        break;
      case 'inputPrice':
        this.promptKeyboard('请输入价格（美元）', DB.state.draftPrice, (v) => {
          DB.state.draftPrice = v;
        });
        break;
      case 'cancelCustom':
        DB.state.customDialog = false;
        DB.state.draftName = '';
        DB.state.draftPrice = '';
        break;
      case 'confirmCustom':
        this.confirmCustom();
        break;
      case 'share':
        this.shareResult();
        break;
    }
  }

  // 弹微信键盘，输入完回调
  promptKeyboard(placeholder, defaultValue, cb) {
    wx.showKeyboard({
      defaultValue: defaultValue || '',
      maxLength: 20,
      multiple: false,
      confirmsHold: false,
      success: () => {
        wx.onKeyboardConfirm((res) => {
          const v = (res.value || '').trim();
          wx.hideKeyboard();
          wx.offKeyboardConfirm();
          wx.offKeyboardInput();
          if (cb) cb(v);
        });
      }
    });
  }

  confirmCustom() {
    const name = (DB.state.draftName || '').trim();
    const priceStr = (DB.state.draftPrice || '').trim();
    const price = parseInt(priceStr.replace(/[^\d]/g, ''), 10);

    if (!name) {
      wx.showToast({ title: '请先输入名称', icon: 'none' });
      return;
    }
    if (!price || price < 1) {
      wx.showToast({ title: '价格无效', icon: 'none' });
      return;
    }

    DB.addCustomAsset(name, price);
    DB.state.customDialog = false;
    DB.state.draftName = '';
    DB.state.draftPrice = '';
    DB.state.filter = '神操作';
    DB.state.scroll = 0;
    wx.showToast({ title: '已添加「' + name + '」', icon: 'success' });
  }

  shareResult() {
    const totalEver = DB.INITIAL_MONEY + DB.state.earned;
    const r = DB.state.spent / totalEver;
    let grade = 'E';
    if (r >= 0.99) grade = 'SSS';
    else if (r >= 0.95) grade = 'SS';
    else if (r >= 0.85) grade = 'S';
    else if (r >= 0.7) grade = 'A';
    else if (r >= 0.5) grade = 'B';
    else if (r >= 0.3) grade = 'C';
    else if (r >= 0.15) grade = 'D';

    wx.shareAppMessage({
      title: '我在「花光首富的钱」花掉 ' + DB.fmt(DB.state.spent) + '，评级 ' + grade + '！你敢来挑战吗？',
      imageUrl: 'images/elon.jpg'
    });
  }

  loop() {
    DB.tick();
    this.render.draw();
    requestAnimationFrame(this.loop);
  }
}

module.exports = Main;
