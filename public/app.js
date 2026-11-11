const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WD = ['日', '一', '二', '三', '四', '五', '六'];
const CFG = window.APP_CONFIG || { LIFF_ID: '', API_BASE: '/api' };
const useLiff = !!CFG.LIFF_ID;

// 狀態
let CATS = [], EVENTS = [], signups = {}, comments = {}, votes = {};
let me = null, idToken = null, picUrl = '';
let activeCat = null, curEvent = null, curTab = 'info';
let curEditId = null;
let sortOrder = 'desc'; // 'desc' 日期新→舊；'asc' 日期舊→新

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
function votesOf(ev) { return votes[ev.id] || {}; }
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
    CATS = j.cats; EVENTS = j.events; signups = j.signups || {}; comments = j.comments || {}; votes = j.votes || {};
  } catch (e) {
    // 無後端時的本機備援（理論上 Vercel 上不會發生）
    CATS = []; EVENTS = [];
    signups = localStore.get('signups', {}); comments = localStore.get('cmts', {}); votes = localStore.get('votes', {});
  }
  // 試跑模式：把本機新增的活動也合併進來
  if (!useLiff) {
    const locals = localStore.get('localEvents', []);
    locals.forEach((ev) => { if (!EVENTS.find((x) => x.id === ev.id)) EVENTS.push(ev); });
    const lv = localStore.get('votes', {});
    Object.keys(lv).forEach((k) => { votes[k] = lv[k]; });
  }
}

// ===== 渲染 =====
function renderLogin() {
  $('#loginStatus').textContent = '登入身份：' + (me ? me : '未登入成員');
  $('#loginBtn').textContent = me ? '登出' : '點此登入';
}
function renderCats() {
  const row = $('#catRow');
  if (!row) return; // 分類篩選列已移除
  row.innerHTML = CATS.map((c) =>
    `<button class="chip${activeCat === c.id ? ' active' : ''}" data-cat="${esc(c.id)}">${esc(c.name)}<span class="cnt">${c.n}</span></button>`
  ).join('');
}
function renderList() {
  let list = EVENTS.slice().sort((a, b) =>
    sortOrder === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
  );
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
  const hasPoll = Array.isArray(ev.dateOptions) && ev.dateOptions.length > 0;
  if (curTab === 'poll' && !hasPoll) curTab = 'info';
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
        <button data-act="share">📋 複製邀請</button>
        <button data-act="cal">加到日曆</button>
        <button data-act="close2">關閉</button>
      </div>
    </div>
    <div class="join-bar">
      ${joined
        ? `<button class="green-btn leave-btn" id="joinBtn">取消報名</button>`
        : `<button class="green-btn" id="joinBtn" ${full ? 'disabled' : ''}>${full ? '揪團已滿' : '參加活動'}</button>`}
      ${me && me === ev.host ? `<button class="edit-event-btn" id="editEventBtn">✏️ 編輯活動</button>` : ''}
      ${me && me === ev.host ? `<button class="cancel-event-btn" id="cancelEventBtn">取消揪團（刪除此活動）</button>` : ''}
    </div>`;
  } else if (curTab === 'poll') {
    const vt = votesOf(ev);
    const opts = ev.dateOptions.slice();
    const counts = opts.map((d) => (vt[d] || []).length);
    const maxC = counts.length ? Math.max(...counts) : 0;
    body = `<div class="m-body poll-wrap">
      <div class="poll-tip">點你方便的日期，可以複選 。票數最高的就是大家最喬得出來的那一天 😊</div>
      ${opts.map((d) => {
        const voters = vt[d] || [];
        const n = voters.length;
        const mine = me && voters.includes(me);
        const top = n > 0 && n === maxC;
        const dd = d.split('-');
        const wd = WD[new Date(d).getDay()];
        const pct = maxC ? Math.round((n / maxC) * 100) : 0;
        return `<div class="poll-row${top ? ' poll-top' : ''}">
          <div class="poll-date"><div class="pd-d">${esc(dd[1])}/${esc(dd[2])}</div><div class="pd-w">週${wd}${top ? ' ★' : ''}</div></div>
          <div class="poll-mid">
            <div class="poll-bar"><span style="width:${pct}%"></span></div>
            <div class="poll-voters">${n ? esc(voters.join('、')) : '還沒有人投'}</div>
          </div>
          <button class="poll-btn${mine ? ' voted' : ''}" data-vote="${esc(d)}" ${me ? '' : 'disabled'}>${mine ? '✓ 我可以' : '我可以'}<span class="pb-n">${n}</span></button>
        </div>`;
      }).join('')}
      ${me ? '' : '<div class="poll-login">請先登入才能投票喔</div>'}
    </div>`;
  } else {
    const cs = commentsOf(ev);
    body = `<div class="m-body cmt-list">
      ${cs.map((c) => c.sys
        ? `<div class="cmt"><div class="pic" style="background:#2b8296">i</div><div class="cmt-body"><div class="cmt-sys">${esc(c.u)} ${esc(c.x)} · ${esc(c.t)}</div></div></div>`
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
      ${hasPoll ? `<div class="m-tab ${curTab === 'poll' ? 'active' : ''}" data-tab="poll">喬日期</div>` : ''}
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
  const voteBtn = e.target.closest('[data-vote]');
  if (voteBtn) { voteDate(voteBtn.dataset.vote); return; }
  if (e.target.id === 'addDateOpt') { addDateOptField(); return; }
  if (e.target.closest('#sortBtn, [data-sort]')) { toggleSort(); return; }
  if (e.target.closest('#promoBtn, [data-view="promo"]')) { promoShare(); return; }
  if (e.target.id === 'cancelEventBtn') { cancelEvent(); return; }
  if (e.target.id === 'editEventBtn') { openEditForm(); return; }
  if (e.target.id === 'editSubmit') { submitEditEvent(); return; }
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
  if (a === 'share') { shareEvent(ev); return; }
}

// 共用：跳出「分享文字」視窗——文字會自動選起來，按複製或長按複製都行
function showShareBox(text, tip) {
  const old = document.getElementById('shareBox'); if (old) old.remove();
  const mask = document.createElement('div');
  mask.id = 'shareBox';
  mask.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:20px';
  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;border-radius:16px;width:100%;max-width:420px;padding:18px;box-shadow:0 8px 30px rgba(0,0,0,.25)';
  const h = document.createElement('div');
  h.style.cssText = 'font-size:15px;font-weight:700;color:#0e4e5a;margin-bottom:10px';
  h.textContent = tip || '複製下面文字，貼到群組邀請大家';
  const ta = document.createElement('textarea');
  ta.readOnly = true; ta.value = text;
  ta.style.cssText = 'width:100%;height:190px;border:1px solid #d9dbde;border-radius:10px;padding:12px;font-size:14px;line-height:1.6;resize:none;outline:none;color:#333;box-sizing:border-box';
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;margin-top:12px';
  const copyBtn = document.createElement('button');
  copyBtn.textContent = '複製文字';
  copyBtn.style.cssText = 'flex:2;background:#2b8296;color:#fff;border:none;border-radius:10px;padding:12px 0;font-size:15px;font-weight:700;cursor:pointer';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '關閉';
  closeBtn.style.cssText = 'flex:1;background:#f1f2f4;color:#4a4f55;border:none;border-radius:10px;padding:12px 0;font-size:15px;cursor:pointer';
  row.appendChild(copyBtn); row.appendChild(closeBtn);
  card.appendChild(h); card.appendChild(ta); card.appendChild(row);
  mask.appendChild(card); document.body.appendChild(mask);

  // 自動選起文字，方便直接複製
  setTimeout(() => { ta.focus(); ta.select(); try { ta.setSelectionRange(0, text.length); } catch (e) {} }, 50);

  copyBtn.onclick = () => {
    ta.focus(); ta.select(); try { ta.setSelectionRange(0, text.length); } catch (e) {}
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    if (!ok && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => { copyBtn.textContent = '✓ 已複製'; })
        .catch(() => { copyBtn.textContent = '請長按文字選取複製'; });
    } else {
      copyBtn.textContent = ok ? '✓ 已複製' : '請長按文字選取複製';
    }
  };
  closeBtn.onclick = () => mask.remove();
  mask.onclick = (e) => { if (e.target === mask) mask.remove(); };
}

// 單一活動：把完整細節整理成文字，複製後貼到群組邀請大家
async function shareEvent(ev) {
  if (!ev) return;
  const cnt = membersOf(ev).length;
  const lines = [
    `🎉 【揪團】${ev.title}`,
    '',
    `📅 時間：${ev.time || ev.date}`,
    `📍 地點：${ev.place || '-'}`,
  ];
  if (ev.fee) lines.push(`💰 費用：${ev.fee}`);
  if (ev.host) lines.push(`⭐ 主揪：${ev.host}`);
  lines.push(`👥 人數：${cnt}/${ev.cap} 人`);
  if (ev.desc) lines.push('', ev.desc);
  lines.push('', '點進佈告欄報名 👇', location.origin + '/');
  const text = lines.join('\n');

  // 統一用站內可複製的文字框（不再呼叫 LINE 分享選單，避免當機/空白頁）
  showShareBox(text, '複製下面文字，貼到群組邀請大家一起參加 😊');
}

// 切換排序：日期新→舊 ↔ 日期舊→新
function toggleSort() {
  sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
  const btn = $('#sortBtn') || $('[data-sort]');
  if (btn) btn.textContent = (sortOrder === 'desc' ? '排序：新→舊' : '排序：舊→新') + ' ▾';
  renderList();
}

// 宣傳：把目前所有活動整理成文字，複製到剪貼簿，貼到群組即可
async function promoShare() {
  let list = EVENTS.slice().sort((a, b) =>
    sortOrder === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
  );
  if (!list.length) { alert('目前沒有活動可以宣傳喔～'); return; }
  const lines = list.map((ev) => {
    const cnt = membersOf(ev).length;
    const t = ev.time || ev.date;
    return `▶ ${ev.title}\n   📅 ${t}\n   📍 ${ev.place}\n   👥 ${cnt}/${ev.cap} 人`;
  });
  const header = '🎉 真媽機群組活動佈告欄 ◈ 最新揪團';
  const footer = '點進佈告欄報名 👇\n' + location.origin + '/';
  const text = header + '\n\n' + lines.join('\n\n') + '\n\n' + footer;

  // 統一用站內可複製的文字框（不再呼叫 LINE 分享選單，避免當機/空白頁）
  showShareBox(text, '複製下面文字，貼到群組就能一次公告所有活動 😊');
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
async function cancelEvent() {
  const ev = curEvent; if (!ev) return;
  if (!me || me !== ev.host) { alert('只有主揪本人可以取消這個揪團'); return; }
  if (!confirm(`確定要取消並刪除「${ev.title}」這個揪團嗎？此動作無法復原。`)) return;
  if (useLiff) {
    try { await api('/events', { action: 'cancel', eventId: ev.id }); }
    catch (err) { alert('取消失敗：' + err.message); return; }
    EVENTS = EVENTS.filter((e) => e.id !== ev.id);
  } else {
    EVENTS = EVENTS.filter((e) => e.id !== ev.id);
    const locals = localStore.get('localEvents', []).filter((e) => e.id !== ev.id);
    localStore.set('localEvents', locals);
  }
  closeModal();
  renderList();
  alert('揪團已取消');
}
function pushLocal(ev, text, sys) { (comments[ev.id] || (comments[ev.id] = [])).push({ u: me, t: nowHM(), x: text, sys: !!sys }); localStore.set('cmts', comments); }

// 喬日期：點一下 = 投這天我可以，再點一次 = 收回（可複選）
async function voteDate(date) {
  if (!me) { openLogin(); return; }
  const ev = curEvent; if (!ev) return;
  if (useLiff) {
    try { const j = await api('/vote', { eventId: ev.id, date }); votes[ev.id] = j.votes || {}; }
    catch (err) { alert(err.message); return; }
  } else {
    const bucket = votes[ev.id] || (votes[ev.id] = {});
    const arr = bucket[date] || (bucket[date] = []);
    if (arr.includes(me)) bucket[date] = arr.filter((n) => n !== me);
    else arr.push(me);
    localStore.set('votes', votes);
  }
  renderModal();
}

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
      <div class="f-field">
        <label>大家一起投票喬日期（選填）</label>
        <div class="f-hint" style="margin:0 0 7px">日期還沒定？列幾個候選日，讓大家進來投自己方便的那一天。不填就是一般活動。</div>
        <div id="dateOptList">
          <input class="f-dateopt" type="date">
          <input class="f-dateopt" type="date">
        </div>
        <button type="button" id="addDateOpt" class="add-dateopt-btn">＋ 再加一個候選日</button>
      </div>
      <div class="f-hint">主揪會自動帶入你的登入名稱（${esc(me)}），並預設你已報名。</div>
      <div class="act-row" style="margin-top:16px">
        <button id="addCancel">取消</button>
        <button id="addSubmit" class="green-btn" style="flex:2">建立活動</button>
      </div>
    </div>`;
  $('#addMask').classList.remove('hidden');
}

// 在表單多加一個候選日期欄位（最多 8 個）
function addDateOptField() {
  const box = $('#dateOptList'); if (!box) return;
  if (box.querySelectorAll('.f-dateopt').length >= 8) { alert('候選日最多 8 個喔～'); return; }
  const inp = document.createElement('input');
  inp.className = 'f-dateopt'; inp.type = 'date';
  box.appendChild(inp);
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
    dateOptions: Array.from(document.querySelectorAll('.f-dateopt')).map((i) => i.value).filter(Boolean),
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

// ===== 編輯活動表單（限主揪）=====
function openEditForm() {
  const ev = curEvent; if (!ev) return;
  if (!me || me !== ev.host) { alert('只有主揪本人可以編輯活動'); return; }
  curEditId = ev.id;
  const catOpts = CATS.map((c) => `<option value="${esc(c.id)}"${c.id === ev.cat ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
  const opts = (ev.dateOptions && ev.dateOptions.length) ? ev.dateOptions.slice() : ['', ''];
  const optInputs = opts.map((d) => `<input class="f-dateopt" type="date" value="${esc(d)}">`).join('');
  $('#addModal').innerHTML = `
    <div class="m-head">
      <button class="m-close" id="addClose">✕</button>
      <div class="m-title">編輯活動</div>
    </div>
    <div class="form-body">
      <div class="f-field"><label>活動名稱 *</label><input id="fTitle" maxlength="60" value="${esc(ev.title)}"></div>
      <div class="f-row2">
        <div class="f-field"><label>日期 *</label><input id="fDate" type="date" value="${esc(ev.date)}"></div>
        <div class="f-field"><label>分類</label><select id="fCat">${catOpts}</select></div>
      </div>
      <div class="f-field"><label>時間</label><input id="fTime" value="${esc(ev.time || '')}"></div>
      <div class="f-field"><label>地點</label><input id="fPlace" value="${esc(ev.place || '')}"></div>
      <div class="f-row2">
        <div class="f-field"><label>費用</label><input id="fFee" value="${esc(ev.fee || '')}"></div>
        <div class="f-field"><label>人數上限</label><input id="fCap" type="number" min="1" value="${esc(ev.cap)}"></div>
      </div>
      <div class="f-field"><label>活動說明</label><textarea id="fDesc">${esc(ev.desc || '')}</textarea></div>
      <div class="f-field">
        <label>大家一起投票喬日期（選填）</label>
        <div class="f-hint" style="margin:0 0 7px">列幾個候選日讓大家投。想移除某一天，把那格日期清空即可。</div>
        <div id="dateOptList">${optInputs}</div>
        <button type="button" id="addDateOpt" class="add-dateopt-btn">＋ 再加一個候選日</button>
      </div>
      <div class="act-row" style="margin-top:16px">
        <button id="addCancel">取消</button>
        <button id="editSubmit" class="green-btn" style="flex:2">儲存變更</button>
      </div>
    </div>`;
  $('#addMask').classList.remove('hidden');
}

async function submitEditEvent() {
  const id = curEditId; if (!id) return;
  const title = $('#fTitle').value.trim();
  const date = $('#fDate').value;
  if (!title) { alert('請填活動名稱'); return; }
  if (!date) { alert('請選日期'); return; }
  const fields = {
    title, date,
    cat: $('#fCat').value,
    time: $('#fTime').value.trim() || date.slice(5).replace('-', '/'),
    place: $('#fPlace').value.trim(),
    fee: $('#fFee').value.trim(),
    cap: parseInt($('#fCap').value, 10) || 6,
    desc: $('#fDesc').value.trim(),
    dateOptions: Array.from(document.querySelectorAll('.f-dateopt')).map((i) => i.value).filter(Boolean),
  };
  const btn = $('#editSubmit'); if (btn) { btn.disabled = true; btn.textContent = '儲存中…'; }
  try {
    if (useLiff) {
      const j = await api('/events', { action: 'edit', eventId: id, ...fields });
      const i = EVENTS.findIndex((e) => e.id === id);
      if (i >= 0) EVENTS[i] = j.event;
      curEvent = j.event;
    } else {
      const ev = EVENTS.find((e) => e.id === id);
      if (ev) {
        Object.assign(ev, fields);
        const locals = localStore.get('localEvents', []);
        const li = locals.findIndex((e) => e.id === id);
        if (li >= 0) { locals[li] = ev; localStore.set('localEvents', locals); }
        curEvent = ev;
      }
    }
    $('#addMask').classList.add('hidden');
    curEditId = null;
    renderList(); renderModal();
    alert('活動已更新！');
  } catch (err) {
    alert('更新失敗：' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = '儲存變更'; }
  }
}

// ===== 登入 =====
function openLogin() {
  if (useLiff) {
    try {
      // 回到此頁登入完成後的導回網址（固定為首頁）
      liff.login({ redirectUri: location.origin + '/' });
    } catch (e) { liff.login(); }
    return;
  }
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
      // withLoginOnExternalBrowser：在一般瀏覽器（非 LINE App）也能直接完成登入，
      // 不會卡在「要在 LINE 中打開嗎」而登入失敗。
      await liff.init({ liffId: CFG.LIFF_ID, withLoginOnExternalBrowser: true });
      if (liff.isLoggedIn()) {
        try {
          const p = await liff.getProfile();
          me = p.displayName; picUrl = p.pictureUrl || '';
        } catch (e) { console.warn('getProfile failed', e); }
        try { idToken = liff.getIDToken() || null; } catch (e) { idToken = null; }
      }
    } catch (e) { console.warn('liff init failed', e); }
  } else {
    me = localStore.get('me', null);
  }
  await loadData();
  renderLogin(); renderCats(); renderList();
}
boot();
