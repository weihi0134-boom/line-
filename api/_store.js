// 簡易儲存層：有設 Upstash Redis 環境變數就用 Redis（永久保存），
// 否則落到記憶體（僅供試跑，重新部署會清空）。
const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = !!(URL && TOKEN);

// --- 記憶體備援（跨呼叫尽量保持）---
globalThis.__mem = globalThis.__mem || {};
const mem = globalThis.__mem;

async function redis(cmd) {
  const r = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error('redis ' + r.status);
  const j = await r.json();
  return j.result;
}

export async function getJSON(key, fallback) {
  if (useRedis) {
    const v = await redis(['GET', key]);
    return v ? JSON.parse(v) : fallback;
  }
  return key in mem ? mem[key] : fallback;
}

export async function setJSON(key, value) {
  if (useRedis) {
    await redis(['SET', key, JSON.stringify(value)]);
    return;
  }
  mem[key] = value;
}

export { useRedis };
