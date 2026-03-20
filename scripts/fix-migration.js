const postgres = require('postgres');
const { readFileSync } = require('fs');
const path = require('path');

// 读取 .env 文件
const envPath = path.join(process.cwd(), '.env');
const envContent = readFileSync(envPath, 'utf-8');

// 解析 DATABASE_URL (支持 DATABASE_URL= 和 DATABASE_URL = 格式)
let dbUrl = null;
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL') || trimmed.startsWith('database_url')) {
    // 支持 "DATABASE_URL=value" 和 "DATABASE_URL = value" 格式
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      dbUrl = parts.slice(1).join('=').trim();
      break;
    }
  }
}

if (!dbUrl) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

// 移除可能的引号
dbUrl = dbUrl.replace(/^['"]|['"]$/g, '');

(async () => {
  const sql = postgres(dbUrl);

  try {
    // 检查列是否存在
    const result = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'coloring_page'
      AND column_name IN ('root_keyword', 'modifier')
    `;

    const existingCols = result.map(r => r.column_name);
    console.log('Existing columns:', existingCols);

    if (!existingCols.includes('root_keyword')) {
      await sql`ALTER TABLE coloring_page ADD COLUMN root_keyword text`;
      console.log('✓ Added root_keyword column');
    } else {
      console.log('• root_keyword already exists');
    }

    if (!existingCols.includes('modifier')) {
      await sql`ALTER TABLE coloring_page ADD COLUMN modifier text`;
      console.log('✓ Added modifier column');
    } else {
      console.log('• modifier already exists');
    }

    console.log('Migration completed!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
})();
