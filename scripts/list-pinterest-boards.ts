import '../src/config';
import { createPinterestProvider } from '../src/extensions/pinterest';
import { getAllConfigs } from '../src/shared/models/config';

async function listBoards() {
    try {
        const allConfigs = await getAllConfigs();
        const provider = createPinterestProvider({
            appId: allConfigs.pinterest_app_id,
            appSecret: allConfigs.pinterest_app_secret,
            refreshToken: allConfigs.pinterest_refresh_token,
            accessToken: allConfigs.pinterest_access_token,
        }, process.env.PINTEREST_USE_SANDBOX === 'true');

        console.log("🚀 正在刷新 Token 并获取看板列表...");
        const accessToken = await provider.refreshAccessToken();

        const response = await fetch('https://api.pinterest.com/v5/boards', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const data = await response.json() as any;

        if (!response.ok) {
            console.error("❌ 获取看板失败:", data);
            return;
        }

        console.log("\n✅ 成功获取看板列表：");
        console.log("=============================================");
        data.items.forEach((board: any) => {
            console.log(`看板名称: ${board.name}`);
            console.log(`看板 ID: ${board.id}`);
            console.log("---------------------------------------------");
        });
        console.log("=============================================");
        console.log("\n请选择一个看板 ID 并填入 .env 中的 PINTEREST_BOARD_ID。");

    } catch (error) {
        console.error("❌ 发生错误:", error);
    }
}

listBoards();
