#!/usr/bin/env bash
# Merge the portable Claude Code settings into this machine's settings.json.
#
#   merge-settings.sh <portable.json> [<settings.json>]
#
# The target defaults to ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/settings.json. Keys
# from <portable.json> win; keys it does not name (autoMode, machine-local env,
# anything Claude Code wrote) are kept. jq's `*` merges objects deeply but
# replaces arrays, so each hook event in <portable.json> replaces that event's
# local list. Idempotent: when the merge changes nothing, nothing is written. A
# changed file is backed up first. Set JQ to pick the jq binary.
set -euo pipefail

jq_bin="${JQ:-jq}"

if [ $# -lt 1 ] || [ $# -gt 2 ]; then
  echo "usage: $0 <portable.json> [<settings.json>]" >&2
  exit 64
fi

portable="$1"
target="${2:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}/settings.json}"

# Write through a symlinked settings.json instead of replacing the link.
if [ -L "$target" ]; then
  target="$(realpath "$target")"
fi

"$jq_bin" empty "$portable"

if [ ! -e "$target" ]; then
  mkdir -p "$(dirname "$target")"
  (umask 077 && "$jq_bin" -S . "$portable" > "$target")
  echo "level=info action=created path=$target"
  exit 0
fi

"$jq_bin" empty "$target"

merged="$(mktemp "$(dirname "$target")/.settings.json.XXXXXX")"
trap 'rm -f "$merged"' EXIT
"$jq_bin" -S -s '.[0] * .[1]' "$target" "$portable" > "$merged"

if [ "$("$jq_bin" -S . "$target")" = "$(cat "$merged")" ]; then
  echo "level=info action=unchanged path=$target"
  exit 0
fi

backup="$target.pre-dotfiles-$(date -u +%Y%m%dT%H%M%SZ)"
cp -p "$target" "$backup"
chmod 600 "$merged"
mv "$merged" "$target"
trap - EXIT
echo "level=info action=merged path=$target backup=$backup"
