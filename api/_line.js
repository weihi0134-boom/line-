// 用 LINE Messaging API 發訊息。需要環境變數：
//   LINE_CHANNEL_ACCESS_TOKEN  → Messaging API channel 的長期 access token
//   LINE_TARGET_GROUP_ID       → 要推播的群組 ID（由 webhook 取得）
//   LIFF_URL                   → 你的 LIFF 網址（https://liff.line.me/xxxx），卡片按鈕用
const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const GROUP_ID = process.env.LINE_TARGET_GROUP_ID;
const LIFF_URL = process.env.LIFF_URL || '';

export function canPush() { return !!(TOKEN && GROUP_ID); }

// 組一張活動 Flex 卡片
export function buildEventFlex(ev) {
  const line = (label, val) => ({
    type: 'box', layout: 'baseline', spacing: 'sm',
    contents: [
      { type: 'text', text: label, color: '#8a9099', size: 'sm', flex: 2 },
      { type: 'text', text: String(val || '-'), wrap: true, color: '#333333', size: 'sm', flex: 5 },
    ],
  });
  return {
    type: 'flex',
    altText: `【新活動】${ev.title}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#9FD0DE', paddingAll: '16px',
        contents: [
          { type: 'text', text: '🎉 新活動開措囉', color: '#0e4e5a', size: 'xs' },
          { type: 'text', text: ev.title, color: '#0e4e5a', size: 'lg', weight: 'bold', wrap: true, margin: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', paddingAll: '16px',
        contents: [
          line('時間', ev.time || ev.date),
          line('地點', ev.place),
          line('費用', ev.fee),
          line('主措', ev.host),
          line('人數', `上限 ${ev.cap} 人`),
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', paddingAll: '12px',
        contents: [{
          type: 'button', style: 'primary', color: '#2b8296', height: 'md',
          action: { type: 'uri', label: '查看 / 報名', uri: LIFF_URL || 'https://line.me' },
        }],
      },
    },
  };
}

export async function pushToGroup(messages) {
  if (!canPush()) return { skipped: true };
  const r = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: GROUP_ID, messages: Array.isArray(messages) ? messages : [messages] }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error('LINE push ' + r.status + ' ' + t);
  }
  return { ok: true };
}
