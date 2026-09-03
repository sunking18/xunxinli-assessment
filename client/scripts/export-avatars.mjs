/**
 * 导出「爱情三角」7 种小人的多尺寸图片素材
 *
 * 用途：公众号文章配图、海报宣传物料、PPT / 社群分享等。
 *
 * 用法：
 *   cd client && node scripts/export-avatars.mjs
 *
 * 输出：项目根目录 design-assets/lovetri-avatars/
 *   ├── 64/   128/   256/   512/   1024/     ← 按尺寸分目录
 *   │     ├── 01-满分式爱情-consummate.png   ← 透明背景，设计叠加用
 *   │     └── 01-满分式爱情-consummate.jpg   ← 白底，公众号直接上传
 *   └── README.md
 *
 * 注意：源图为 512×512，512 及以下为无损缩放，1024 为 2 倍插值放大。
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, '../public/lovetri-avatars');
const OUT_DIR = path.resolve(__dirname, '../../design-assets/lovetri-avatars');

// 7 种爱情类型（顺序对应爱情三角理论经典排序）
const TYPES = [
  { key: 'consummate', cn: '满分式爱情', name: '满分恋人', en: 'Consummate Love', elem: '亲密+激情+承诺', color: '#f7c948' },
  { key: 'romantic', cn: '心动式爱情', name: '心动甜心', en: 'Romantic Love', elem: '亲密+激情', color: '#ff4d6d' },
  { key: 'companionate', cn: '长情式爱情', name: '长情暖宝', en: 'Companionate Love', elem: '亲密+承诺', color: '#2ec4b6' },
  { key: 'fatuous', cn: '热恋式爱情', name: '热恋小火', en: 'Fatuous Love', elem: '激情+承诺', color: '#ff7b00' },
  { key: 'liking', cn: '知己式爱情', name: '知己暖阳', en: 'Liking', elem: '亲密', color: '#ffb347' },
  { key: 'infatuated', cn: '火花式爱情', name: '火花精灵', en: 'Infatuated Love', elem: '激情', color: '#ff5d8f' },
  { key: 'empty', cn: '坚守式爱情', name: '坚守骑士', en: 'Empty Love', elem: '承诺', color: '#667eea' },
];

// 导出尺寸（正方形）
const SIZES = [64, 128, 256, 512, 1024];

// 各尺寸的推荐使用场景
const SIZE_USAGE = {
  64: '列表小图标、favicon、社群表情',
  128: '头像、文末小图标、PPT 小图示',
  256: '公众号文中配图（小）、卡片元素',
  512: '★ 原图尺寸，最清晰 —— 公众号文中大图、海报主体元素首选',
  1024: '大幅海报、易拉宝（由 512 放大 2 倍，细节略有损失，非印刷级）',
};

async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error('源图目录不存在：', SRC_DIR);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let total = 0;

  for (const size of SIZES) {
    const dir = path.join(OUT_DIR, String(size));
    fs.mkdirSync(dir, { recursive: true });

    for (let i = 0; i < TYPES.length; i++) {
      const t = TYPES[i];
      const src = path.join(SRC_DIR, `${t.key}.png`);
      if (!fs.existsSync(src)) {
        console.warn(`跳过（缺少源图）：${src}`);
        continue;
      }
      const base = `${String(i + 1).padStart(2, '0')}-${t.cn}-${t.key}`;

      // PNG：保留透明通道，方便在设计软件中叠加到任意背景
      const pngOut = path.join(dir, `${base}.png`);
      await sharp(src)
        .resize(size, size, { kernel: 'lanczos3', fit: 'contain' })
        .png({ compressionLevel: 9 })
        .toFile(pngOut);
      total += fs.statSync(pngOut).size;

      // JPG：白底，公众号 / 朋友圈等不支持透明的场景直接可用
      const jpgOut = path.join(dir, `${base}.jpg`);
      await sharp(src)
        .resize(size, size, { kernel: 'lanczos3', fit: 'contain' })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
        .toFile(jpgOut);
      total += fs.statSync(jpgOut).size;
    }
    console.log(`✓ ${size}×${size} 已生成`);
  }

  // 生成素材说明
  const table = TYPES.map(
    (t, i) =>
      `| ${i + 1} | ${t.cn} | ${t.name} | ${t.key} | ${t.en} | ${t.elem} | \`${t.color}\` |`,
  ).join('\n');

  const usage = SIZES.map(s => `- **${s}×${s}** —— ${SIZE_USAGE[s]}`).join('\n');

  const readme = `# 爱情三角 · 7 种小人图片素材

按尺寸分目录整理，每个尺寸下每种类型提供两种格式：

| 格式 | 说明 | 使用场景 |
| --- | --- | --- |
| \`.png\` | **透明背景** | 设计软件（PS / Figma / 稿定）中叠加到任意背景 |
| \`.jpg\` | **白色背景** | 公众号后台、朋友圈、社群等不支持透明的场景，直接上传 |

## 目录结构

\`\`\`
lovetri-avatars/
├── 64/     ${SIZE_USAGE[64]}
├── 128/    ${SIZE_USAGE[128]}
├── 256/    ${SIZE_USAGE[256]}
├── 512/    ← 推荐，原图尺寸，无损
├── 1024/   大幅物料（放大 2 倍）
└── README.md
\`\`\`

## 尺寸选择建议

${usage}

## 命名规则

\`序号-中文类型名-英文key.格式\`

例：\`01-满分式爱情-consummate.png\`

## 7 种爱情类型对照

| 序号 | 类型名 | 小人名 | key | 英文理论名 | 构成要素 | 主题色 |
| --- | --- | --- | --- | --- | --- | --- |
${table}

## 关于清晰度

源图为 **512×512** PNG。

- **512 及以下**：等比缩小，完全无损，最清晰
- **1024**：由 512 经 Lanczos3 插值放大 2 倍，屏幕显示够用，**不适合高精度印刷**

如果需要 2048 / 4096 等印刷级高清，需要从设计源文件（AI / Figma / Sketch）重新导出矢量版本。

---

重新生成本目录：\`cd client && node scripts/export-avatars.mjs\`
`;

  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), readme);

  console.log('\n全部完成');
  console.log('输出目录：', OUT_DIR);
  console.log('总体积：', (total / 1024 / 1024).toFixed(2), 'MB');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
