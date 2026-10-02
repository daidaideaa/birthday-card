@echo off
cd /d "%~dp0"
node scripts/migration/serve-preview.mjs
pause
