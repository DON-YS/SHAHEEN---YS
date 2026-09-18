#!/bin/bash
cd ~/SHAHEEN-YS
MSG="${1:-Auto update $(date +'%Y-%m-%d %H:%M')}"
git add .
git commit -m "$MSG"
git push origin main
echo "✅ Pushed: $MSG"
