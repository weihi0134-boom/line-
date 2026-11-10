import { getJSON, setJSON } from './_store.js';
import { EVENTS } from './seed.js';
import { verifyIdToken, readBody } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  try {
    const body = await readBody(req);
    const user = await verifyIdToken(body.idToken);
    if (!user) return res.status(401).json({ error: '請先登入' });
    const eventId = String(body.eventId || '');

    const events = await getJSON('events', EVENTS);
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return res.status(404).json({ error: '找不到活動' });

    const signups = await getJSON('signups', {});
    const comments = await getJSON('comments', {});
    const arr = signups[eventId] || (signups[eventId] = []);
    const base = ev.members.slice();
    arr.forEach((n) => { if (!base.includes(n)) base.push(n); });

    const now = new Date();
    const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const log = (x) => { (comments[eventId] || (comments[eventId] = [])).push({ u: user.name, t: hm, x, sys: true }); };

    if (base.includes(user.name)) {
      signups[eventId] = arr.filter((n) => n !== user.name);
      log('取消報名');
    } else {
      if (base.length >= ev.cap) return res.status(409).json({ error: '揪團已滿' });
      arr.push(user.name);
      log('報名參加');
    }
    await setJSON('signups', signups);
    await setJSON('comments', comments);
    return res.status(200).json({ ok: true, signups: signups[eventId], comments: comments[eventId] });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
