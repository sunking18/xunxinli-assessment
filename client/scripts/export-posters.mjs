/**
 * 生成「爱情三角」成品宣传图
 *
 * 1. 公众号封面图（2.35:1）—— 主题色渐变背景 + 小人 + 类型名文字
 * 2. 类型总览组合图（透明背景）—— 7 个小人横排 / 竖排（带名称 + 纯图两版）
 * 3. 主题色渐变背景版 —— 每种类型一张方形图，可当头像 / 卡片 / 社群配图
 *
 * 用法：cd client && node scripts/export-posters.mjs
 * 输出：项目根目录 design-assets/lovetri-posters/
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, '../public/lovetri-avatars');
const OUT_DIR = path.resolve(__dirname, '../../design-assets/lovetri-posters');

const FONT = "PingFang SC, PingFangSC-Regular, Heiti SC, STHeiti, Microsoft YaHei, sans-serif";

const TYPES = [
  { key: 'consummate', cn: '满分式爱情', name: '满分恋人', en: 'Consummate Love', elem: '亲密 · 激情 · 承诺', color: '#f7c948' },
  { key: 'romantic', cn: '心动式爱情', name: '心动甜心', en: 'Romantic Love', elem: '亲密 · 激情', color: '#ff4d6d' },
  { key: 'companionate', cn: '长情式爱情', name: '长情暖宝', en: 'Companionate Love', elem: '亲密 · 承诺', color: '#2ec4b6' },
  { key: 'fatuous', cn: '热恋式爱情', name: '热恋小火', en: 'Fatuous Love', elem: '激情 · 承诺', color: '#ff7b00' },
  { key: 'liking', cn: '知己式爱情', name: '知己暖阳', en: 'Liking', elem: '亲密', color: '#ffb347' },
  { key: 'infatuated', cn: '火花式爱情', name: '火花精灵', en: 'Infatuated Love', elem: '激情', color: '#ff5d8f' },
  { key: 'empty', cn: '坚守式爱情', name: '坚守骑士', en: 'Empty Love', elem: '承诺', color: '#667eea' },
];

/** 调整颜色明暗：percent 为负数变暗，正数变亮 */
function shade(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent * 100);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/** 主题色渐变背景（对角渐变） */
function gradientSvg(w, h, color) {
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${shade(color, 0.18)}"/>
      <stop offset="55%" stop-color="${color}"/>
      <stop offset="100%" stop-color="${shade(color, -0.22)}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
</svg>`);
}

/** 透明背景的文字层 */
function textSvg(w, h, lines) {
  const body = lines
    .map(
      l =>
        `<text x="${l.x}" y="${l.y}" font-family="${FONT}" font-size="${l.size}" fill="${l.fill}" opacity="${l.opacity ?? 1}" font-weight="${l.weight ?? 400}" text-anchor="${l.anchor ?? 'start'}">${l.text}</text>`,
    )
    .join('\n  ');
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">\n  ${body}\n</svg>`);
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ==================== 1. 公众号封面图 2.35:1 ====================
async function exportCovers() {
  const sizes = [900, 1800]; // 900×383 为公众号封面标准尺寸，1800 为 2 倍高清
  for (const w of sizes) {
    const h = Math.round(w / 2.35);
    const s = w / 900; // 缩放系数
    const dir = path.join(OUT_DIR, '公众号封面-2.35比1', String(w));
    fs.mkdirSync(dir, { recursive: true });

    for (let i = 0; i < TYPES.length; i++) {
      const t = TYPES[i];
      const src = path.join(SRC_DIR, `${t.key}.png`);

      const avatarSize = Math.round(260 * s);
      const avatar = await sharp(src).resize(avatarSize, avatarSize, { kernel: 'lanczos3' }).toBuffer();

      const textX = Math.round(370 * s);
      const lines = [
        { x: textX, y: Math.round(105 * s), size: Math.round(24 * s), fill: '#ffffff', opacity: 0.75, text: esc(t.name) },
        { x: textX, y: Math.round(168 * s), size: Math.round(56 * s), fill: '#ffffff', weight: 700, text: esc(t.cn) },
        { x: textX, y: Math.round(212 * s), size: Math.round(23 * s), fill: '#ffffff', opacity: 0.7, text: esc(t.en) },
        { x: textX, y: Math.round(268 * s), size: Math.round(26 * s), fill: '#ffffff', opacity: 0.95, text: esc(t.elem) },
        { x: w - Math.round(28 * s), y: h - Math.round(26 * s), size: Math.round(19 * s), fill: '#ffffff', opacity: 0.55, anchor: 'end', text: '寻心理 · 爱情三角测评' },
      ];

      const base = `${String(i + 1).padStart(2, '0')}-${t.cn}-${t.key}`;
      await sharp(gradientSvg(w, h, t.color))
        .composite([
          { input: avatar, left: Math.round(62 * s), top: Math.round((h - avatarSize) / 2) },
          { input: textSvg(w, h, lines), top: 0, left: 0 },
        ])
        .png({ compressionLevel: 9 })
        .toFile(path.join(dir, `${base}.png`));
    }
    console.log(`✓ 封面图 ${w}×${h} 已生成`);
  }
}

// ==================== 2. 类型总览组合图（透明背景）====================
async function exportOverviews() {
  const dir = path.join(OUT_DIR, '类型总览-透明背景');
  fs.mkdirSync(dir, { recursive: true });

  const AV = 180; // 单个小人尺寸
  const GAP = 22;
  const LABEL_H = 56; // 名称文字区高度

  for (const layout of ['横排', '竖排']) {
    const isH = layout === '横排';
    const cols = isH ? TYPES.length : 1;
    const rows = isH ? 1 : TYPES.length;
    const cellW = AV + GAP;
    const cellH = AV + LABEL_H + GAP;
    const W = cols * cellW + GAP;
    const H = rows * cellH + GAP;

    const composites = [];
    const textLines = [];

    for (let i = 0; i < TYPES.length; i++) {
      const t = TYPES[i];
      const src = path.join(SRC_DIR, `${t.key}.png`);
      const avatar = await sharp(src).resize(AV, AV, { kernel: 'lanczos3' }).toBuffer();

      const cx = isH ? GAP + i * cellW : GAP;
      const cy = isH ? GAP : GAP + i * cellH;
      composites.push({ input: avatar, left: cx + Math.round(GAP / 2), top: cy });

      // 名称标签：第一行中文名，第二行构成要素
      const labelX = cx + cellW / 2;
      const labelY1 = cy + AV + 26;
      const labelY2 = cy + AV + 48;
      textLines.push(
        { x: labelX, y: labelY1, size: 26, fill: '#1a1a2e', weight: 600, anchor: 'middle', text: esc(t.cn) },
        { x: labelX, y: labelY2, size: 18, fill: '#6b7280', opacity: 0.9, anchor: 'middle', text: esc(t.elem) },
      );
    }

    const canvas = sharp({
      create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    });

    // 带名称版
    await canvas
      .composite([...composites, { input: textSvg(W, H, textLines), top: 0, left: 0 }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(dir, `${layout}-带名称.png`));

    // 纯图版（仅小人，无文字）
    const pureW = isH ? TYPES.length * (AV + GAP) + GAP : AV + GAP * 2;
    const pureH = isH ? AV + GAP * 2 : TYPES.length * (AV + GAP) + GAP;
    const pureComposites = composites.map((c, i) => {
      const cx = isH ? GAP + i * (AV + GAP) : GAP;
      const cy = isH ? GAP : GAP + i * (AV + GAP);
      return { input: c.input, left: cx, top: cy };
    });
    await sharp({
      create: { width: pureW, height: pureH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite(pureComposites)
      .png({ compressionLevel: 9 })
      .toFile(path.join(dir, `${layout}-纯图.png`));

    console.log(`✓ ${layout}总览图 已生成（带名称 ${W}×${H} / 纯图 ${pureW}×${pureH}）`);
  }
}

// ==================== 3. 主题色渐变背景版 ====================
async function exportThemedSquares() {
  for (const size of [512, 1024]) {
    const dir = path.join(OUT_DIR, '主题色背景', String(size));
    fs.mkdirSync(dir, { recursive: true });

    for (let i = 0; i < TYPES.length; i++) {
      const t = TYPES[i];
      const src = path.join(SRC_DIR, `${t.key}.png`);
      const avatarSize = Math.round(size * 0.68);
      const avatar = await sharp(src).resize(avatarSize, avatarSize, { kernel: 'lanczos3' }).toBuffer();

      const base = `${String(i + 1).padStart(2, '0')}-${t.cn}-${t.key}`;
      await sharp(gradientSvg(size, size, t.color))
        .composite([{ input: avatar, gravity: 'center' }])
        .png({ compressionLevel: 9 })
        .toFile(path.join(dir, `${base}.png`));

      await sharp(gradientSvg(size, size, t.color))
        .composite([{ input: avatar, gravity: 'center' }])
        .jpeg({ quality: 92 })
        .toFile(path.join(dir, `${base}.jpg`));
    }
    console.log(`✓ 主题色背景 ${size}×${size} 已生成`);
  }
}

// ==================== 说明文档 ====================
function writeReadme() {
  const table = TYPES.map(
    (t, i) => `| ${i + 1} | ${t.cn} | ${t.name} | \`${t.color}\` | ${t.elem} |`,
  ).join('\n');

  const readme = `# 爱情三角 · 成品宣传图素材

源图为 512×512，本目录为**合成后的成品图**，可直接使用。

## 一、公众号封面（2.35 : 1）

\`公众号封面-2.35比1/\`
- \`900/\` —— **900×383**，公众号封面标准尺寸，推荐
- \`1800/\` —— 1800×766，2 倍高清，用于高清屏 / 二次排版

每张包含：主题色对角渐变背景 + 小人 + 类型名 / 英文名 / 构成要素文字。

## 二、类型总览（透明背景）

\`类型总览-透明背景/\`

| 文件 | 说明 |
| --- | --- |
| \`横排-带名称.png\` | 7 个小人横向排列，下方标注类型名与构成要素 |
| \`横排-纯图.png\` | 仅 7 个小人横向排列，无任何文字 |
| \`竖排-带名称.png\` | 7 个小人纵向排列，下方标注类型名与构成要素 |
| \`竖排-纯图.png\` | 仅 7 个小人纵向排列，无任何文字 |

透明背景，可直接拖进 PS / Figma / 稿定设计叠在任意底图上，适合做「7 种类型总览」长图。

## 三、主题色背景方形图

\`主题色背景/\`
- \`512/\` —— 512×512，头像 / 卡片 / 社群配图
- \`1024/\` —— 1024×1024，高清大图

每种类型用自己的主题色做对角渐变背景，小人居中。同时提供 \`.png\`（原始）与 \`.jpg\`（体积小）两版。

## 7 种类型对照

| 序号 | 类型名 | 小人名 | 主题色 | 构成要素 |
| --- | --- | --- | --- | --- |
${table}

## 命名规则

\`序号-中文类型名-英文key.格式\`

## 关于清晰度

源图为 512×512，因此：

- 封面图 / 主题色背景图的**小人元素**在 1024、1800 尺寸下属于放大，细节略有损失
- 屏幕显示（公众号、社群、PPT）完全够用
- 如需印刷级（易拉宝、画册），需要从设计源文件（AI / Figma）重新导出矢量版本

---

重新生成：\`cd client && node scripts/export-posters.mjs\`
`;

  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), readme);
}

async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error('源图目录不存在：', SRC_DIR);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await exportCovers();
  await exportOverviews();
  await exportThemedSquares();
  writeReadme();

  console.log('\n全部完成');
  console.log('输出目录：', OUT_DIR);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
