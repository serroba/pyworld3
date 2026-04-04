#!/bin/sh
# sync-core.sh — Copy @world3/core sources into app/ts/core/
#
# The app compiles ts/ → js/ with tsc (rootDir: "ts"), so core files must
# live inside that directory. This script makes packages/core/src/ the single
# source of truth and copies the files before each build.
set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$REPO_ROOT/packages/core/src"
DEST="$REPO_ROOT/app/ts/core"

case "$DEST" in
  */app/ts/core) ;;
  *) echo "sync-core: unexpected DEST: '$DEST'" >&2; exit 1 ;;
esac

rm -rf "$DEST"
mkdir -p "$DEST"
cp "$SRC"/*.ts "$DEST/"

count=$(ls "$DEST"/*.ts 2>/dev/null | wc -l | tr -d ' ')
echo "sync-core: copied $count files → app/ts/core/"
