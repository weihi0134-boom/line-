import { getJSON, setJSON } from './_store.js';
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
    const text = String(body.text || '').trim().slice(0, 500);
    if (!text) return res.status(400).json({ error: '留言不可為空' });

    const comments = await getJSON('comments', {});
    const now = new Date();
    const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    (comments[eventId] || (comments[eventId] = [])).push({ u: user.name, t: hm, x: text, sys: false });
    await setJSON('comments', comments);
    return res.status(200).json({ ok: true, comments: comments[eventId] });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
