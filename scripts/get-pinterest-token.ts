import { createServer } from 'http';
import { envConfigs } from '../src/config';
import { exec } from 'child_process';

const PORT = 3001;
const REDIRECT_URI = `https://coloringpages.club/callback`;

if (!envConfigs.pinterest_app_id || !envConfigs.pinterest_app_secret) {
  console.error("❌ 错误: 请确保 .env 或者 .env.development 中已经配置了 PINTEREST_APP_ID 和 PINTEREST_APP_SECRET");
  process.exit(1);
}

const appId = envConfigs.pinterest_app_id;
const appSecret = envConfigs.pinterest_app_secret;
// boards:read, boards:write, pins:read, pins:write are needed for pinning
const scope = 'boards:read,boards:write,pins:read,pins:write';

const authUrl = `https://www.pinterest.com/oauth/?client_id=${appId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${scope}`;

console.log("🚀 正在启动本地服务器...");
console.log(`🔗 请在浏览器中打开此链接进行授权: \n${authUrl}\n`);

// Attempt to open the auth URL in the user's default browser
const openCommand = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
exec(`${openCommand} "${authUrl}"`, (error) => {
  if (error) {
    // Silently ignore if browser can't be opened automatically
  }
});

const server = createServer(async (req, res) => {
  // CORS configuration to allow coloringpages.club to call this localhost server
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');

    if (!code) {
      res.writeHead(400);
      res.end('<h1>授权失败</h1><p>没有找到 code 参数</p>');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.write('<h1>正在获取 Refresh Token，请稍候...</h1>');

    try {
      const authString = Buffer.from(`${appId}:${appSecret}`).toString('base64');

      const tokenResponse = await fetch('https://api.pinterest.com/v5/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: REDIRECT_URI,
        }).toString(),
      });

      const data = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error("❌ 获取 Token 失败:", data);
        res.end(`<p>获取失败: ${JSON.stringify(data)}</p>`);
        process.exit(1);
      }

      console.log("\n✅ 授权成功！");
      console.log("\n=============================================");
      console.log("请将以下内容复制到你的 .env 或 .env.development 文件中：\n");
      console.log(`PINTEREST_REFRESH_TOKEN="${data.refresh_token}"`);
      console.log("=============================================\n");
      console.log("注意：这个 refresh_token 有效期为 1 年。系统会自动用它来刷新短期的 access_token。");

      res.end('<h1>✅ 授权成功！</h1><p>请查看终端控制台获取你的 <b>PINTEREST_REFRESH_TOKEN</b>，然后你可以关闭此页面了。</p>');

      setTimeout(() => {
        console.log("脚本即将退出...");
        process.exit(0);
      }, 3000);

    } catch (err: any) {
      console.error(err);
      res.end(`<p>发生错误: ${err.message}</p>`);
      process.exit(1);
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  // Server running
});
