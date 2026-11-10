const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WD = ['日', '一', '二', '三', '四', '五', '六'];
const CFG = window.APP_CONFIG || { LIFF_ID: '', API_BASE: '/api' };
const useLiff = !!CFG.LIFF_ID;

// 狀態
let CATS = [], EVENTS = [], signups = {}, comments = {};
let me = null, idToken = null, picUrl = '';
let activeCat = null, curEvent = null, curTab = 'info';

const localStore = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
};

function initial(n) { return (n || '?').trim().charAt(0).toUpperCase(); }
function membersOf(ev) {
  const base = ev.members.slice();
  (signups[ev.id] || []).forEach((n) => { if (!base.includes(n)) base.push(n); });
  return base;
}
function commentsOf(ev) { return (ev.comments || []).concat(comments[ev.id] || []); }
function nowHM() { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

// ===== 資料存取：有 LIFF 走 API，否則走 localStorage =====
async function api(path, body) {
  const r = await fetch(CFG.API_BASE + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, idToken }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || '錯誤');
  return j;
}

async function loadData() {
  try {
    const r = await fetch(CFG.API_BASE + '/events');
    const j = await r.json();
    CATS = j.cats; EVENTS = j.events; signups = j.signups || {}; comments = j.comments || {};
  } catch (e) {
    // 無後端時的本機備援（理論上 Vercel 上不會發生）
    CATS = []; EVENTS = [];
    signups = localStore.get('signups', {}); comments = localStore.get('cmts', {});
  }
  // 試跑模式：把本機新增的活動也合併進來
  if (!useLiff) {
    const locals = localStore.get('localEvents', []);
    locals.forEach((ev) => { if (!EVENTS.find((x) => x.id === ev.id)) EVENTS.push(ev); });
  }
}

// ===== 渲染 =====
function renderLogin() {
  $('#loginStatus').textContent = '登入身份：' + (me ? me : '未登入成員');
  $('#loginBtn').textContent = me ? '登出' : '點此登入';
}
function renderCats() {
  $('#catRow').innerHTML = CATS.map((c) =>
    `<button class="chip${activeCat === c.id ? ' active' : ''}" data-cat="${esc(c.id)}">${esc(c.name)}<span class="cnt">${c.n}</span></button>`
  ).join('');
}
function renderList() {
  let list = EVENTS.slice().sort((a, b) => a.date.localeCompare(b.date));
  if (activeCat) list = list.filter((e) => e.cat === activeCat);
  const el = $('#eventList');
  if (!list.length) { el.innerHTML = '<div class="foot-note">目前沒有活動</div>'; return; }
  el.innerHTML = list.map((ev) => {
    const cnt = membersOf(ev).length, full = cnt >= ev.cap;
    const d = ev.date.split('-'), wd = WD[new Date(ev.date).getDay()];
    const catName = (CATS.find((c) => c.id === ev.cat) || {}).name || '';
    return `<div class="event-card" data-id="${esc(ev.id)}">
      <div class="ev-date"><div class="d">${esc(d[2])}</div><div class="w">${esc(d[1])}月·${wd}</div></div>
      <div class="ev-main">
        <div class="ev-title">${esc(ev.title)}</div>
        <div class="ev-meta"><span class="cat-dot">${esc(catName)}</span>${esc((ev.time.split(' ')[1]) || '')} · ${esc(ev.place)}</div>
      </div>
      <div class="ev-badge ${full ? 'badge-full' : 'badge-open'}">${full ? '揪團已滿' : '揪團中'} ${cnt}/${ev.cap}</div>
    </div>`;
  }).join('');
}

function openModal(id) { curEvent = EVENTS.find((e) => e.id === id); curTab = 'info'; renderModal(); $('#modalMask').classList.remove('hidden'); }
function closeModal() { $('#modalMask').classList.add('hidden'); curEvent = null; }

function renderModal() {
  const ev = curEvent; if (!ev) return;
  const mem = membersOf(ev), cnt = mem.length, full = cnt >= ev.cap;
  const joined = me && mem.includes(me);
  let body;
  if (curTab === 'info') {
    body = `<div class="m-body">
      <div class="info-row"><div class="ic">◷</div><div class="lb">時間</div><div class="vl">${esc(ev.time)}</div></div>
      <div class="info-row"><div class="ic">◉</div><div class="lb">地點</div><div class="vl">${esc(ev.place)}</div></div>
      <div class="info-row"><div class="ic">▸</div><div class="lb">費用</div><div class="vl">${esc(ev.fee)}</div></div>
      <div class="info-row"><div class="ic">★</div><div class="lb">主揪</div><div class="vl">${esc(ev.host)}</div></div>
      <div class="desc-box">${esc(ev.desc)}</div>
      <div class="members-head"><span>已報名成員名冊</span><span class="ratio">${cnt}/${ev.cap}</span></div>
      <div class="avatars">${mem.map((n) => `<div class="avatar"><div class="pic">${esc(initial(n))}</div><div class="nm">${esc(n)}</div></div>`).join('')}</div>
      <div class="act-row">
        <button data-act="share">分享</button>
        <button data-act="cal">加到日曆</button>
        <button data-act="close2">關閉</button>
      </div>
    </div>
    <div class="join-bar">
      ${joined
        ? `<button class="green-btn leave-btn" id="joinBtn">取消報名</button>`
        : `<button class="green-btn" id="joinBtn" ${full ? 'disabled' : ''}>${full ? '揪團已滿' : '參加活動'}</button>`}
    </div>`;
  } else {
    const cs = commentsOf(ev);
    body = `<div class="m-body cmt-list">
      ${cs.map((c) => c.sys
        ? `<div class="cmt"><div class="pic" style="background:#06c755">i</div><div class="cmt-body"><div class="cmt-sys">${esc(c.u)} ${esc(c.x)} · ${esc(c.t)}</div></div></div>`
        : `<div class="cmt"><div class="pic">${esc(initial(c.u))}</div><div class="cmt-body"><div class="cmt-name">${esc(c.u)}<span class="cmt-time">${esc(c.t)}</span></div><div class="cmt-text">${esc(c.x)}</div></div></div>`
      ).join('')}
    </div>
    <div class="cmt-input">
      <input id="cmtBox" placeholder="${me ? '輸入留言...' : '請先登入再留言'}" ${me ? '' : 'disabled'}>
      <button id="cmtSend" ${me ? '' : 'disabled'}>送出</button>
    </div>`;
  }
  $('#modal').innerHTML = `
    <div class="m-head">
      <button class="m-close" id="mClose">✕</button>
      <div class="m-title">${esc(ev.title)}</div>
      <span class="m-badge ${full ? 'badge-full' : 'badge-open'}">${full ? '揪團已滿' : '揪團中'} ${cnt}/${ev.cap}</span>
    </div>
    <div class="m-tabs">
      <div class="m-tab ${curTab === 'info' ? 'active' : ''}" data-tab="info">活動詳情</div>
      <div class="m-tab ${curTab === 'cmt' ? 'active' : ''}" data-tab="cmt">活動留言 (${commentsOf(ev).length})</div>
    </div>${body}`;
}

// ===== 事件 =====
document.addEventListener('click', (e) => {
  const card = e.target.closest('.event-card');
  if (card) { openModal(card.dataset.id); return; }
  const catBtn = e.target.closest('[data-cat]');
  if (catBtn) { activeCat = activeCat === catBtn.dataset.cat ? null : catBtn.dataset.cat; renderCats(); renderList(); return; }
  if (e.target.id === 'mClose' || e.target.id === 'modalMask') { closeModal(); return; }
  const tab = e.target.closest('.m-tab');
  if (tab) { curTab = tab.dataset.tab; renderModal(); return; }
  if (e.target.id === 'joinBtn') { toggleJoin(); return; }
  if (e.target.id === 'cmtSend') { sendComment(); return; }
  const act = e.target.closest('[data-act]');
  if (act) { doAct(act.dataset.act); return; }
  if (e.target.id === 'loginBtn') { me ? logout() : openLogin(); return; }
  if (e.target.id === 'doLoginBtn') { doLogin(); return; }
  if (e.target.id === 'cancelLoginBtn' || e.target.id === 'loginMask') { $('#loginMask').classList.add('hidden'); return; }
  if (e.target.id === 'fab') { openAddForm(); return; }
  if (e.target.id === 'addSubmit') { submitNewEvent(); return; }
  if (e.target.id === 'addCancel' || e.target.id === 'addClose' || e.target.id === 'addMask') { $('#addMask').classList.add('hidden'); return; }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && document.activeElement.id === 'cmtBox') sendComment(); });

function doAct(a) {
  const ev = curEvent;
  if (a === 'close2') { closeModal(); return; }
  if (a === 'cal') {
    const url = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(ev.title) + '&details=' + encodeURIComponent(ev.desc) + '&location=' + encodeURIComponent(ev.place);
    (useLiff && liff.isInClient()) ? liff.openWindow({ url, external: true }) : window.open(url, '_blank');
    return;
  }
  if (a === 'share') {
    if (useLiff && liff.isApiAvailable('shareTargetPicker')) {
      liff.shareTargetPicker([{ type: 'text', text: `【${ev.title}】${ev.time} @ ${ev.place}` }]);
    } else { alert('分享功能需在 LINE 內開啟'); }
  }
}

async function toggleJoin() {
  if (!me) { openLogin(); return; }
  const ev = curEvent;
  if (useLiff) {
    try { const j = await api('/signup', { eventId: ev.id }); signups[ev.id] = j.signups; comments[ev.id] = j.comments; }
    catch (err) { alert(err.message); return; }
  } else {
    const arr = signups[ev.id] || (signups[ev.id] = []); const mem = membersOf(ev);
    if (mem.includes(me)) { signups[ev.id] = arr.filter((n) => n !== me); pushLocal(ev, '取消報名', true); }
    else { if (mem.length >= ev.cap) { alert('揪團已滿！'); return; } arr.push(me); pushLocal(ev, '報名參加', true); }
    localStore.set('signups', signups);
  }
  renderModal(); renderList();
}
function pushLocal(ev, text, sys) { (comments[ev.id] || (comments[ev.id] = [])).push({ u: me, t: nowHM(), x: text, sys: !!sys }); localStore.set('cmts', comments); }

async function sendComment() {
  const box = $('#cmtBox'); if (!box || !box.value.trim()) return;
  const ev = curEvent, text = box.value.trim();
  if (useLiff) {
    try { const j = await api('/comments', { eventId: ev.id, text }); comments[ev.id] = j.comments; }
    catch (err) { alert(err.message); return; }
  } else { pushLocal(ev, text, false); }
  renderModal();
}

// ===== 新增活動表單 =====
function openAddForm() {
  if (!me) { alert('請先登入才能新增活動'); openLogin(); return; }
  const today = new Date().toISOString().slice(0, 10);
  const catOpts = CATS.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  $('#addModal').innerHTML = `
    <div class="m-head">
      <button class="m-close" id="addClose">✕</button>
      <div class="m-title">新增活動</div>
    </div>
    <div class="form-body">
      <div class="f-field"><label>活動名稱 *</label><input id="fTitle" maxlength="60" placeholder="例：週五小酌局"></div>
      <div class="f-row2">
        <div class="f-field"><label>日期 *</label><input id="fDate" type="date" value="${today}"></div>
        <div class="f-field"><label>分類</label><select id="fCat">${catOpts}</select></div>
      </div>
      <div class="f-field"><label>時間</label><input id="fTime" placeholder="例：19:30（或 11/06(五) 19:30）"></div>
      <div class="f-field"><label>地點</label><input id="fPlace" placeholder="例：台北市中正區…"></div>
      <div class="f-row2">
        <div class="f-field"><label>費用</label><input id="fFee" placeholder="例：各付各的 / 450/人 / 免費"></div>
        <div class="f-field"><label>人數上限</label><input id="fCap" type="number" min="1" value="6"></div>
      </div>
      <div class="f-field"><label>活動說明</label><textarea id="fDesc" placeholder="活動內容、注意事項…"></textarea></div>
      <div class="f-hint">主揪會自動帶入你的登入名稱（${esc(me)}），並預設你已報名。</div>
      <div class="act-row" style="margin-top:16px">
        <button id="addCancel">取消</button>
        <button id="addSubmit" class="green-btn" style="flex:2">建立活動</button>
      </div>
    </div>`;
  $('#addMask').classList.remove('hidden');
}

async function submitNewEvent() {
  const title = $('#fTitle').value.trim();
  const date = $('#fDate').value;
  if (!title) { alert('請填活動名稱'); return; }
  if (!date) { alert('請選日期'); return; }
  const payload = {
    title, date,
    cat: $('#fCat').value,
    time: $('#fTime').value.trim() || date.slice(5).replace('-', '/'),
    place: $('#fPlace').value.trim(),
    fee: $('#fFee').value.trim(),
    cap: parseInt($('#fCap').value, 10) || 6,
    desc: $('#fDesc').value.trim(),
  };
  const btn = $('#addSubmit'); if (btn) { btn.disabled = true; btn.textContent = '建立中…'; }
  try {
    if (useLiff) {
      const j = await api('/events', payload);
      EVENTS.push(j.event);
    } else {
      // 試跑模式：存在本機（localStorage），重整仍在
      const ev = { id: 'local' + Date.now(), host: me, members: [me], ...payload };
      EVENTS.push(ev);
      const locals = localStore.get('localEvents', []);
      locals.push(ev); localStore.set('localEvents', locals);
    }
    $('#addMask').classList.add('hidden');
    renderList();
    alert('活動已建立！');
  } catch (err) {
    alert('建立失敗：' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = '建立活動'; }
  }
}

// ===== 登入 =====
function openLogin() {
  if (useLiff) { liff.login(); return; }
  $('#loginDesc').innerHTML = '（試跑模式：輸入名稱即可登入）';
  $('#loginMask').classList.remove('hidden');
}
function doLogin() {
  const v = $('#nameInput').value.trim(); if (!v) { alert('請輸入名稱'); return; }
  me = v; localStore.set('me', me); $('#loginMask').classList.add('hidden');
  renderLogin(); renderList(); if (curEvent) renderModal();
}
function logout() {
  if (useLiff) { liff.logout(); location.reload(); return; }
  me = null; localStore.set('me', null); renderLogin(); renderList(); if (curEvent) renderModal();
}

// ===== 啟動 =====
async function boot() {
  if (useLiff) {
    try {
      await liff.init({ liffId: CFG.LIFF_ID });
      if (liff.isLoggedIn()) {
        const p = await liff.getProfile();
        me = p.displayName; picUrl = p.pictureUrl || ''; idToken = liff.getIDToken();
      }
    } catch (e) { console.warn('liff init failed', e); }
  } else {
    me = localStore.get('me', null);
  }
  await loadData();
  renderLogin(); renderCats(); renderList();
}
boot();
