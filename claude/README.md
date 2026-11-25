# Claude Code

My Claude Code setup: global instructions, my own skills, the status line and the portable settings. On the Mac, the nix-darwin flake installs it. On Linux, stow links the same files.

## What's included

| Path in this repo | Lands at | How |
|---|---|---|
| `.claude/CLAUDE.md` | `~/.claude/CLAUDE.md` | link |
| `.claude/statusline-command.sh` | `~/.claude/statusline-command.sh` | link |
| `.claude/skills/<name>/` | `~/.claude/skills/<name>` | one link per skill |
| `VOICE.md` | `~/VOICE.md` (read by `CLAUDE.md` when drafting in my name) | link |
| `claude/settings.json` | merged into `~/.claude/settings.json` | `claude/merge-settings.sh` |
| `claude/third-party-skills.sh` | `~/.agents/skills/` plus links in `~/.claude/skills/` | `npx skills add`, run by hand |

My skills: `attach-designs`, `controlling-mobile-devices`, `decision-page`, `delegate-issue`, `mentor-me`, `obsidian-ai-research`, `sp-task`, `to-project`, `worktree`.

`claude/settings.json` holds only portable keys: `hooks`, `permissions`, `statusLine` and preferences (`model`, `effortLevel`, `modelSettings`, `skillOverrides`, `editorMode`, `theme`, `voice`, `cleanupPeriodDays`, `autoCompactEnabled`). Every hook command checks that its tool exists and does nothing on a machine without it:

- the tmux-agent-indicator and tmux-assistant-resurrect plugins, which TPM installs from the shared `tmux.conf`
- the Obsidian vault validator at `~/Documents/obsidian-vault/.tools/vault`

## Install

### macOS (nix-darwin)

`darwin/home.nix` links every item above and merges the settings on each switch:

```bash
git -C ~/dotfiles pull
rebuild
~/dotfiles/claude/third-party-skills.sh
```

- Before linking, anything already at a link target is moved to `~/.claude/dotfiles-backups/<UTC timestamp>/`.
- The settings merge backs up a changed `settings.json` to `settings.json.pre-dotfiles-<UTC timestamp>` beside it.
- Repo keys win on each switch. Keys the repo doesn't name, such as `autoMode` and machine-local `env`, stay as they are. Each hook event in the repo replaces that event's local list.
- A new skill folder needs `git add` and a `rebuild`, since flakes only see tracked files. Edits to an already linked file apply right away.

`sp-task` needs the `sp-quadrant` MCP server, which lives in `~/.claude.json` and is not tracked. Build it from `grez-lucas/sp-quadrant-mcp`, then register it:

```bash
claude mcp add --scope user sp-quadrant -- "$HOME/go/bin/sp-quadrant-mcp"
```

### Linux (stow)

`.stow-local-ignore` keeps `claude/` out of stow. stow refuses to replace real files, and `stow --adopt` would copy the machine's old files over the repo's. So move the current copies aside first:

```bash
backup=~/.claude/dotfiles-backups/$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$backup/skills"
mv ~/.claude/CLAUDE.md ~/.claude/statusline-command.sh "$backup/"
mv ~/VOICE.md "$backup/"
for s in ~/dotfiles/.claude/skills/*/; do
  n=$(basename "$s")
  if [ -e ~/.claude/skills/"$n" ] || [ -L ~/.claude/skills/"$n" ]; then
    mv ~/.claude/skills/"$n" "$backup/skills/"
  fi
done
cd ~/dotfiles && stow .
~/dotfiles/claude/merge-settings.sh ~/dotfiles/claude/settings.json
~/dotfiles/claude/third-party-skills.sh
```

The merge replaces whole hook events, so a machine-only hook like the `sync-claude-profiles` `SessionStart` hook has to be added back after merging.

## Deliberately left out

- **Secrets and state:** `.credentials.json`, `settings.local.json`, `.claude.json` (account state and MCP servers), `history.jsonl`, `projects/` (transcripts and memories), `sessions/`, `shell-snapshots/`, `cache/`, `backups/`, `file-history/`, `paste-cache/`, `statsig/`, `todos/`.
- **`autoMode` settings:** they name employer hosts, tenants and private file paths, so each machine keeps its own.
- **`skills/synced/`:** managed by claude.ai.
- **Third-party skills:** installed from upstream by `third-party-skills.sh`, not copied here.
- **`sync-claude-profiles`:** only needed when a machine runs a second profile through `CLAUDE_CONFIG_DIR`. That's still Linux only.
- **Employer and client material:**
  - the `evaluar-candidato` skill
  - the `kriptex-platform` reference that `delegate-issue` used to carry
  - the `gymly-*` commands, which live in `gymly-dev-context`
- **Skill eval workspaces:** `mentor-me-workspace` and `obsidian-ai-research-workspace`.
- **Disabled third-party skill:** `no-mistakes`.
- **Codebase rules:** anything about one codebase belongs in that repo's own `CLAUDE.md` or `.claude/`, not here.
