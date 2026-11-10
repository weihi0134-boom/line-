// 預設種子資料（第一次呼叫時寫入儲存層）
export const CATS = [
  { id: 'volunteer', name: '志工', n: 12 }, { id: 'boardgame', name: '桌遊', n: 10 },
  { id: 'reading', name: '讀書會', n: 7 }, { id: 'dog', name: '狗派', n: 6 },
  { id: 'draw', name: '畫畫', n: 2 }, { id: 'hiking', name: '爬山', n: 1 },
  { id: 'surf', name: '衝浪', n: 1 }, { id: 'cat', name: '貓派', n: 7 },
  { id: 'cafe', name: '咖啡廳', n: 6 }, { id: 'climb', name: '攀岩', n: 2 },
  { id: 'music', name: '練音樂', n: 2 }, { id: 'ski', name: '滑雪', n: 1 },
  { id: 'sing', name: '唱歌', n: 13 },
];

export const EVENTS = [
  { id: 'e1', date: '2026-11-06', title: '小酌局｜沃wo', cat: 'cafe', time: '11/06(五) 19:30', place: '臺北市中正區忠孝東路二段7號 沃wo', fee: '各付各的', host: 'Kiki', cap: 6, desc: '下班會晚到也沒關係，輕鬆小酌聊天。\n地點交通方便，捷步即到。', members: ['Kiki','阿彥','小雨','Ray','Nina','Joe'] },
  { id: 'e2', date: '2026-11-08', title: '下午茶 法式甜點', cat: 'cafe', time: '11/08(日) 14:00', place: '臺北市大安區永康街', fee: '450/人', host: 'Nina', cap: 5, desc: '找一間質雅的店吃甜點拍照，歡迎甜點控。', members: ['Nina','小雨','Joe','Amy','Leo'] },
  { id: 'e3', date: '2026-11-13', title: '龍洞戶外攀岩', cat: 'climb', time: '11/13(五) 08:00', place: '新北市貢寮區龍洞', fee: '1200/人（含裝備）', host: 'Marco', cap: 8, desc: '有經驗教練帶領，新手可。\n請自備隨身水與防曬。', members: ['Marco','Ray','Tina'] },
  { id: 'e4', date: '2026-11-13', title: 'PROHIBITION 金曲理性飲酒之夜', cat: 'cafe', time: '11/13(五) 20:00', place: '臺北市信義區 PROHIBITION', fee: '低消 500/人', host: 'Layla', cap: 30, desc: '金曲獸主題之夜，一起微醺聽音樂。\n場地有低消與餐點，詳情見留言。', members: ['Layla','Kiki','Ray','Nina','Joe','Amy','Leo','阿彥','小雨','Tina','Marco','Sam','Ivy','Ken','Mia','Tom','Eva','Lin','Max','Zoe'] },
  { id: 'e5', date: '2026-11-14', title: '山或海 - 桃園 Chill 一日遊', cat: 'hiking', time: '11/14(六) 09:00', place: '桃園市 大溪老街', fee: '交通 AA', host: 'Sam', cap: 10, desc: '開車共乘，走路行程輕鬆，天氣不好改室內。', members: ['Sam','Ivy','Ken'] },
  { id: 'e6', date: '2026-11-15', title: '青埔燒肉圈 - 稼Meat', cat: 'cafe', time: '11/15(日) 18:00', place: '桃園市中壢區 稼Meat', fee: '800/人', host: 'Tom', cap: 8, desc: '君王級燒肉吃到飽，預訂包廂。', members: ['Tom','Eva','Lin','Max'] },
  { id: 'e7', date: '2026-11-19', title: '北美館一起逛', cat: 'draw', time: '11/19(四) 14:00', place: '臺北市立美術館', fee: '免費', host: 'Zoe', cap: 12, desc: '一起逛展覽、聽坂本龍一，歡迎藝文青年。', members: ['Zoe','Mia','Eva','Lin'] },
  { id: 'e8', date: '2026-12-26', title: '聖誕驚魂 - 密室逃脫', cat: 'boardgame', time: '12/26(六) 19:00', place: '臺北市中山區 密室逃脫館', fee: '600/人', host: 'Ken', cap: 6, desc: '聖誕特別場，燒腦解謎團隊合作。', members: ['Ken','Ivy'] },
];
