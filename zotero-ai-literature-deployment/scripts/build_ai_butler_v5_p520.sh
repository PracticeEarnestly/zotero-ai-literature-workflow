#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
upstream_commit="2a3ba3a16114f6a61e581c3eb0b40a089d63f165"
work_dir="$(mktemp -d "${TMPDIR:-/tmp}/ai-butler-v5-build.XXXXXX")"
trap 'rm -rf "$work_dir"' EXIT

git clone --quiet https://github.com/steven-jianhao-li/zotero-AI-Butler.git "$work_dir/source"
git -C "$work_dir/source" checkout --quiet --detach "$upstream_commit"
rsync -a "$repo_root/ai-butler-v5-overlay/files/" "$work_dir/source/"
git -C "$work_dir/source" apply "$repo_root/ai-butler-v5-overlay/patches/hooks.patch"

# Zotero accepts four-part extension versions, while npm 11 rejects them in
# `npm ci` self-package validation. `npm install` still honors the pinned lock
# for dependencies and only mutates the disposable build checkout.
npm --prefix "$work_dir/source" install --no-audit --no-fund
npm --prefix "$work_dir/source" run lint:check
npm --prefix "$work_dir/source" run test:task-queue
npm --prefix "$work_dir/source" run build
npm --prefix "$work_dir/source" run test:compat

cp "$work_dir/source/.scaffold/build/zotero-ai-butler.xpi" \
  "$repo_root/release/zotero-ai-butler-5.1.0.3-p520.xpi"
shasum -a 256 "$repo_root/release/zotero-ai-butler-5.1.0.3-p520.xpi"
