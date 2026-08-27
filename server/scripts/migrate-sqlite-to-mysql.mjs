// SQLite → MySQL 全量迁移脚本
// 用法: node --experimental-sqlite scripts/migrate-sqlite-to-mysql.mjs
// 可选: MYSQL_URL=mysql://user:pass@host:port/db node --experimental-sqlite scripts/migrate-sqlite-to-mysql.mjs
import { DatabaseSync } from 'node:sqlite';
import mysql from 'mysql2/promise';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQLITE_DB = path.join(__dirname, '..', 'prisma', 'dev.db');
const MYSQL_URL =
  process.env.MYSQL_URL || 'mysql://root@localhost:3306/xunxinli_test';

// 表顺序: 先父表后子表（外键约束）
const TABLES = ['User', 'Assessment', 'Response', 'Order', 'UnlockCode'];

// 需要按"本地时间"写入的 DateTime 列（列名以 At/Time 结尾且值为 ISO 字符串）
function isDateTimeCol(name) {
  return /(At|Time)$/.test(name);
}

function toMysqlLocalTime(v) {
  if (v == null || v === '') return v;
  // SQLite 下 Prisma 的 DateTime 存为毫秒时间戳(number)；老数据可能为 ISO 字符串
  let d;
  if (typeof v === 'number') {
    d = new Date(v);
  } else {
    d = new Date(v);
  }
  if (isNaN(d.getTime())) return v;
  const pad = (n) => String(n).padStart(2, '0');
  const pad3 = (n) => String(n).padStart(3, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad3(d.getMilliseconds())}`;
}

const sqlite = new DatabaseSync(SQLITE_DB);
const conn = await mysql.createConnection(MYSQL_URL);

console.log(`SQLite: ${SQLITE_DB}\nMySQL : ${MYSQL_URL}\n`);

// 迁移前清空目标表（按外键反向顺序）
await conn.query('SET FOREIGN_KEY_CHECKS=0');
for (const table of [...TABLES].reverse()) {
  await conn.query(`DELETE FROM \`${table}\``);
}
await conn.query('SET FOREIGN_KEY_CHECKS=1');

for (const table of TABLES) {
  let rows;
  try {
    rows = sqlite.prepare(`SELECT * FROM "${table}"`).all();
  } catch (e) {
    console.log(`[skip] ${table}: 表不存在或读取失败: ${e.message}`);
    continue;
  }
  if (!rows.length) {
    console.log(`[skip] ${table}: 0 行`);
    continue;
  }

  const cols = Object.keys(rows[0]);
  const qcols = cols.map((c) => `\`${c}\``).join(',');
  const placeholders = cols.map(() => '?').join(',');
  const insertSql = `INSERT INTO \`${table}\` (${qcols}) VALUES (${placeholders})`;

  let inserted = 0;
  for (const row of rows) {
    const vals = cols.map((c) => {
      let v = row[c];
      if (
        isDateTimeCol(c) &&
        ((typeof v === 'number' && v > 0) ||
          (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)))
      ) {
        v = toMysqlLocalTime(v);
      }
      return v;
    });
    try {
      await conn.execute(insertSql, vals);
      inserted++;
    } catch (e) {
      console.error(
        `[fail] ${table} id=${row.id}: code=${e.code} errno=${e.errno} sqlState=${e.sqlState} msg=${e.sqlMessage || e.message}`,
      );
      throw e;
    }
  }
  console.log(`[ok] ${table}: ${inserted}/${rows.length} 行`);
}

await conn.end();
sqlite.close();
console.log('\n迁移完成。');
