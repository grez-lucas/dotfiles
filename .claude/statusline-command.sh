#!/usr/bin/env bash
# Claude Code status line — mirrors Powerlevel10k segments:
#   dir | vcs (git branch + status) | model | context% | time

input=$(cat)

cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // ""')
model=$(echo "$input" | jq -r '.model.display_name // ""')
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
used_tokens=$(echo "$input" | jq -r '.context_window.total_input_tokens // empty')

# Format a raw token count as a compact human-readable string (e.g. 15500 -> 15.5k)
fmt_tokens() {
  awk -v n="$1" 'BEGIN {
    if (n >= 1000000)      printf "%.1fM", n / 1000000
    else if (n >= 1000)    printf "%.1fk", n / 1000
    else                   printf "%d", n
  }'
}

ESC=$'\033'

# --- directory (shorten home to ~) ---
home="$HOME"
short_dir="${cwd/#$home/~}"

# --- git branch + dirty flag ---
git_part=""
if git -C "$cwd" rev-parse --git-dir >/dev/null 2>&1; then
  branch=$(git -C "$cwd" symbolic-ref --short HEAD 2>/dev/null \
           || git -C "$cwd" rev-parse --short HEAD 2>/dev/null)
  # Check for uncommitted changes (skip optional locks to avoid blocking)
  if git -C "$cwd" --no-optional-locks status --porcelain 2>/dev/null | grep -q .; then
    git_part=" ${ESC}[33m${branch}*${ESC}[0m"
  else
    git_part=" ${ESC}[32m${branch}${ESC}[0m"
  fi
fi

# --- context usage ---
ctx_part=""
if [ -n "$used_pct" ] || [ -n "$used_tokens" ]; then
  used_int=$(printf '%.0f' "${used_pct:-0}")
  if [ "$used_int" -ge 75 ]; then
    ctx_color="${ESC}[31m"   # red
  elif [ "$used_int" -ge 50 ]; then
    ctx_color="${ESC}[33m"   # yellow
  else
    ctx_color="${ESC}[32m"   # green
  fi
  # Compose "ctx:<tokens> <pct>%", omitting whichever part is unavailable
  ctx_label="ctx:"
  [ -n "$used_tokens" ] && ctx_label="${ctx_label}$(fmt_tokens "$used_tokens")"
  [ -n "$used_pct" ] && ctx_label="${ctx_label}${used_tokens:+ }${used_int}%"
  ctx_part=" ${ctx_color}${ctx_label}${ESC}[0m"
fi

# --- time ---
time_part=$(date +%H:%M:%S)

printf "\033[34m%s\033[0m%s \033[2m%s\033[0m%s \033[2m%s\033[0m" \
  "$short_dir" "$git_part" "$model" "$ctx_part" "$time_part"
