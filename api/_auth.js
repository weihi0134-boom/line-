// 驗證 LINE 登入拿到的 idToken，以後端為準取得使用者身份。
// 前端用 liff.getIDToken() 拿 token 傳過來，後端向 LINE 驗證，
// 不要相信前端自報的名字（防止偽裝身份）。
export async function verifyIdToken(idToken) {
  if (!idToken) return null;
  const clientId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!clientId) {
    // 沒設 channel id 時的寬鬆模式（僅供本機 / 試跑）
    try {
      const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
      return { userId: payload.sub, name: payload.name || '成員', picture: payload.picture || '' };
    } catch { return null; }
  }
  const r = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: clientId }),
  });
  if (!r.ok) return null;
  const p = await r.json();
  return { userId: p.sub, name: p.name || '成員', picture: p.picture || '' };
}

export function readBody(req) {
  return new Promise((resolve) => {
    if (req.body) { resolve(typeof req.body === 'string' ? JSON.parse(req.body) : req.body); return; }
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch { resolve({}); } });
  });
}
