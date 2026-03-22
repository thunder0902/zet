#!/usr/bin/env bash
# scripts/optimize-images.sh
# Simple wrapper to convert images to WebP/AVIF and generate responsive sizes using sharp (via npx)
# Usage: bash scripts/optimize-images.sh <source-dir> <out-dir>
set -euo pipefail
SRC=${1:-./static/images}
OUT=${2:-./static/images-opt}
mkdir -p "$OUT"
echo "Converting images from $SRC -> $OUT"
# Requires sharp-cli (npm) or fallback to imagemin if available
npx --yes sharp-cli "$SRC/**/*.{png,jpg,jpeg}" --output "$OUT" --format webp --quality 80 || {
  echo "sharp-cli failed or not available. Trying @squoosh/cli..."
  npx --yes @squoosh/cli --output="$OUT" "$SRC" || { echo "No converter available. Install sharp-cli or @squoosh/cli."; exit 1; }
}

echo "Done. Review $OUT for generated images."
