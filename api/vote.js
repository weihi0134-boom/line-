import { getJSON, setJSON } from './_store.js';
import { EVENTS } from './seed.js';
import { verifyIdToken, readBody } from './_auth.js';

// 大家一起投票喬日期：成員點自己方便的候選日，可複選（再點一次 = 收回）。
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
    const date = String(body.date || '').slice(0, 10);
    if (!date) return res.status(400).json({ error: '沒有指定日期' });

    const events = await getJSON('events', EVENTS);
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return res.status(404).json({ error: '找不到活動' });
    const opts = Array.isArray(ev.dateOptions) ? ev.dateOptions : [];
    if (!opts.includes(date)) return res.status(400).json({ error: '這不是候選日期' });

    const votes = await getJSON('votes', {});
    const bucket = votes[eventId] || (votes[eventId] = {});
    const arr = bucket[date] || (bucket[date] = []);
    if (arr.includes(user.name)) {
      bucket[date] = arr.filter((n) => n !== user.name);
    } else {
      arr.push(user.name);
    }
    await setJSON('votes', votes);
    return res.status(200).json({ ok: true, votes: votes[eventId] });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
