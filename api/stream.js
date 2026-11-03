export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).send('Missing video ID');

  const videoUrl = `https://www.youtube.com/watch?v=${id}`;

  // 專門解析 YouTube 原始音軌嘅高可用開源 Cobalt 實例群
  const instances = [
    "https://api.cobalt.tools/api/json",
    "https://cobalt-api.kwiatekm.tokyo/api/json",
    "https://api.server.ovh/api/json"
  ];

  for (const apiUrl of instances) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0"
        },
        body: JSON.stringify({
          url: videoUrl,
          downloadMode: "audio",
          audioFormat: "mp3"
        }),
        signal: controller.signal
      });

      clearTimeout(timer);
      if (!resp.ok) continue;

      const data = await resp.json();
      if (data && data.url) {
        // 直接 302 重定向到解密後嘅高音質直連音訊，秒出聲且不食 Vercel 頻寬流量
        return res.redirect(302, data.url);
      }
    } catch (e) {
      // 嘗試下一組節點
    }
  }

  // 保底備用線路
  return res.redirect(302, `https://invidious.nerdvpn.de/latest_version?id=${id}&itag=140&local=true`);
}
