import { copyFile, mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('.asset-build/character-review/public');
await access(resolve(root,'review-assets/characters-v2/manifest.json')).catch(() => {
  throw new Error('缺少人物素材。请从 GitHub Release 下载完整迁移包，或先用 Blender 4.5 运行 scripts/models/build_character_review.py，再运行 node scripts/review/optimize-characters.mjs。详见 docs/MOVE_TO_ANOTHER_COMPUTER.md。');
});
await mkdir(resolve(root,'fonts'),{recursive:true});
await copyFile('public/fonts/birthday-serif.woff',resolve(root,'fonts/birthday-serif.woff'));
await copyFile('public/fonts/NotoSerifSC-OFL.txt',resolve(root,'fonts/NotoSerifSC-OFL.txt'));
