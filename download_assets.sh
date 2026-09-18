#!/bin/bash
set -e

cd ~/SHAHEEN-YS
mkdir -p platform/frontend/public/img
cd platform/frontend/public/img

echo "📥 Downloading SHAHEEN-YS visual assets..."

download_postimg() {
  local page_url="$1"
  local output_name="$2"
  echo ""
  echo "🔍 Processing: $page_url"
  
  # Extract direct image URL from og:image meta tag
  local direct_url=$(curl -sL "$page_url" | grep -oP 'property="og:image" content="\K[^"]+' | head -1)
  
  if [ -z "$direct_url" ]; then
    echo "❌ Failed to extract direct URL"
    return 1
  fi
  
  echo "📥 Direct URL: $direct_url"
  curl -sL "$direct_url" -o "$output_name"
  
  if [ -s "$output_name" ]; then
    local size=$(du -h "$output_name" | cut -f1)
    echo "✅ Saved: $output_name ($size)"
  else
    echo "❌ Failed to download"
    rm -f "$output_name"
    return 1
  fi
}

# Download all three images
download_postimg "https://postimg.cc/8fsHzdZQ" "shaheen-logo.png"
download_postimg "https://postimg.cc/BL474KWK" "welcome.jpg"
download_postimg "https://postimg.cc/FdCy8dh5" "login-bg.jpg"

echo ""
echo "============================================"
echo "✅ Download complete!"
echo "============================================"
echo ""
echo "Files in img/:"
ls -la
echo ""
echo "File types:"
file * 2>/dev/null || ls -la
