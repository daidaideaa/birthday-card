@echo off
cd /d "%~dp0"
node scripts/migration/serve-preview.mjs .asset-build/performance-preview 5184 performance-review.html
pause
