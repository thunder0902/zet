#!/bin/bash
set -euo pipefail

echo "== Installing webdev skills (non-blocking failures are OK) =="
CMDS=(
  "npx github:vercel-labs/skills add vercel-labs/agent-skills"
  "npx github:vercel-labs/skills add vercel-labs/skills/image-optimize"
  "npx github:vercel-labs/skills add vercel-labs/skills/deploy-vercel"
  "npx github:vercel-labs/skills add vercel-labs/skills/eslint-prettier"
  "npx github:vercel-labs/skills add vercel-labs/skills/testing-playwright"
  "npx github:vercel-labs/skills add vercel-labs/skills/tailwind-helper"
)

for c in "${CMDS[@]}"; do
  echo "-> $c"
  if $c; then
    echo "[OK] $c"
  else
    echo "[FAILED] $c (continuing)"
  fi
done

echo "== Installed/registered skills =="
npx skills list || true

echo "== Done =="
