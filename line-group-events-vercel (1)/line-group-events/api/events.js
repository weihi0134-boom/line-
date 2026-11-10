import { getJSON, setJSON } from './_store.js';
import { EVENTS, CATS } from './seed.js';
import { verifyIdToken, readBody } from './_auth.js';

async function loadEvents() {
  let list = await getJSON('events', null);
  if (!list) { list = EVENTS; await setJSON('events', list); }
  return list;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const list = await loadEvents();
      const signups = await getJSON('signups', {});
      const comments = await getJSON('comments', {});
      return res.status(200).json({ cats: CATS, events: list, signups, comments });
    }

    if (req.method === 'POST') {
      // 新增活動（需登入）
      const body = await readBody(req);
      const user = await verifyIdToken(body.idToken);
      if (!user) return res.status(401).json({ error: '請先登入' });
      const list = await loadEvents();
      const ev = {
        id: 'e' + Date.now(),
        date: String(body.date || '').slice(0, 10),
        title: String(body.title || '未命名活動').slice(0, 60),
        cat: String(body.cat || 'cafe'),
        time: String(body.time || ''),
        place: String(body.place || ''),
        fee: String(body.fee || ''),
        host: user.name,
        cap: Math.max(1, parseInt(body.cap, 10) || 6),
        desc: String(body.desc || '').slice(0, 1000),
        members: [user.name],
      };
      list.push(ev);
      await setJSON('events', list);
      return res.status(200).json({ ok: true, event: ev });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
