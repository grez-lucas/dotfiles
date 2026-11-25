#!/usr/bin/env bash
# Install the third-party skills this setup uses, globally for Claude Code, with
# the skills CLI (https://github.com/vercel-labs/skills). They are installed
# from their upstream repos rather than copied here. The CLI keeps its own
# lock at ~/.agents/.skill-lock.json; update later with `npx skills update -g -y`.
#
# A dangling ~/.claude/skills/<name> link (left by copying ~/.claude from
# another machine) is removed before its skill is installed. Needs npx.
set -euo pipefail

skills_dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills"

install() {
  local source="$1"; shift
  local args=() name
  for name in "$@"; do
    if [ -L "$skills_dir/$name" ] && [ ! -e "$skills_dir/$name" ]; then
      echo "level=info action=removed-dangling-link path=$skills_dir/$name"
      rm "$skills_dir/$name"
    fi
    args+=(--skill "$name")
  done
  npx skills add "$source" "${args[@]}" -g -a claude-code -y
}

install anthropics/skills \
  skill-creator
install humanlayer/skills \
  show-me
install kunchenguid/chrome-devtools-axi \
  chrome-devtools-axi
install kunchenguid/gh-axi \
  gh-axi
install kunchenguid/lavish-axi \
  lavish
install mattpocock/skills \
  chief-of-staff \
  claude-handoff \
  code-review \
  domain-modeling \
  grill-me \
  grill-with-docs \
  grilling \
  handoff \
  implement \
  implement-spec \
  improve-codebase-architecture \
  pr \
  prototype \
  research \
  retro \
  tdd \
  teach \
  to-issues \
  to-prd \
  to-spec \
  to-tickets \
  wait-what \
  wayfinder
install vercel-labs/skills \
  find-skills
