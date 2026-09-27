import { copyFile, mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('.asset-build/character-review/public');
await access(resolve(root,'review-assets/characters-v1/manifest.json')).catch(() => {
  throw new Error('尚未生成角色预览资产。请先用 Blender 4.5 运行 scripts/models/build_character_review.py。');
});
await mkdir(resolve(root,'fonts'),{recursive:true});
await copyFile('public/fonts/birthday-serif.woff',resolve(root,'fonts/birthday-serif.woff'));
await copyFile('public/fonts/NotoSerifSC-OFL.txt',resolve(root,'fonts/NotoSerifSC-OFL.txt'));
