/**
 * 将 创业计划书-穷人军师.md 转换为 Word (.docx)
 * 用法: node scripts/md2docx.js
 */
const fs = require('fs');
const path = require('path');
const { convertMarkdownToDocx } = require('@mohtasham/md-to-docx');

const ROOT = path.join(__dirname, '..');
const MD_PATH = path.join(ROOT, '创业计划书-穷人军师.md');
const OUT_PATH = path.join(ROOT, '创业计划书-穷人军师.docx');

async function main() {
  let md = fs.readFileSync(MD_PATH, 'utf-8');

  // 将 HTML 原型区块替换为 Word 友好的纯文本（iframe 无法在 Word 中展示）
  const htmlBlock = /<section[\s\S]*?<[/]section>/;
  const prototypeText = `
精打细算 Pro 已上线，可在手机框内直接交互体验。

**体验链接：**
- [在新窗口打开体验](index.html)
- [在线正式版](https://jingdaxisuang-pro.vercel.app/)
`;
  md = md.replace(htmlBlock, prototypeText.trim());

  const blob = await convertMarkdownToDocx(md, {
    documentType: 'document',
    style: {
      titleSize: 28,
      heading1Size: 24,
      heading2Size: 20,
      heading3Size: 18,
      paragraphSize: 14,
      headingSpacing: 240,
      paragraphSpacing: 200,
      lineSpacing: 1.35,
      paragraphAlignment: 'JUSTIFIED',
    },
  });

  const buf = Buffer.from(await blob.arrayBuffer());
  fs.writeFileSync(OUT_PATH, buf);
  console.log('已生成:', OUT_PATH);
}

main().catch((e) => {
  console.error('转换失败:', e);
  process.exit(1);
});
