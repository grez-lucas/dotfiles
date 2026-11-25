{ config, lib, pkgs, ... }:
let
  # Claude Code config shared with Linux (stow links the same paths there).
  # Each item is linked on its own, never the whole ~/.claude, which also holds
  # credentials, history and per-project state. New skills only need git add.
  claudeSkills = builtins.attrNames
    (lib.filterAttrs (_: type: type == "directory") (builtins.readDir ../.claude/skills));
  claudeLinks = [ ".claude/CLAUDE.md" ".claude/statusline-command.sh" "VOICE.md" ]
    ++ map (skill: ".claude/skills/${skill}") claudeSkills;
in
{
  home.stateVersion = "25.05";

  # No compilers here: xcodebuild must use Apple's clang, not one from Nix.
  home.packages = with pkgs; [
    tmux git gh go nodejs_22 aria2 xcodes cocoapods
    neovim ripgrep fd fzf bat
    btop
    # Apple's /usr/bin/python3 is 3.9; mason's sqlfluff needs >= 3.10.
    python3
  ];

  # Same rule as on Linux: the installed Go is the only one that runs.
  home.sessionVariables.GOTOOLCHAIN = "local";

  # Claude Code's native installer puts claude here.
  home.sessionPath = [ "$HOME/.local/bin" ];

  programs.zsh.enable = true;
  programs.zsh.shellAliases.rebuild =
    "sudo darwin-rebuild switch --flake ~/dotfiles/darwin#grez-mac-mini";

  # ", <cmd>" runs any nixpkgs command without installing it.
  programs.nix-index-database.comma.enable = true;

  # Shared with Linux. Outside the store, so TPM can clone plugins beside it.
  xdg.configFile."tmux".source =
    config.lib.file.mkOutOfStoreSymlink "${config.home.homeDirectory}/dotfiles/.config/tmux";

  # The Mac's terminal; Linux runs kitty with the same Everforest palette.
  # Outside the store, so Ghostty's reload picks up edits without a rebuild.
  xdg.configFile."ghostty".source =
    config.lib.file.mkOutOfStoreSymlink "${config.home.homeDirectory}/dotfiles/.config/ghostty";

  # Shared with Linux. Outside the store, so lazy.nvim can write lazy-lock.json.
  xdg.configFile."nvim".source =
    config.lib.file.mkOutOfStoreSymlink "${config.home.homeDirectory}/dotfiles/.config/nvim";

  # Only the themes: btop rewrites btop.conf on exit, so that stays a local file
  # and names the theme with color_theme = "everforest-dark-medium".
  xdg.configFile."btop/themes".source =
    config.lib.file.mkOutOfStoreSymlink "${config.home.homeDirectory}/dotfiles/.config/btop/themes";

  # Outside the store, so edits in ~/dotfiles apply without a rebuild.
  home.file = lib.genAttrs claudeLinks (path: {
    source = config.lib.file.mkOutOfStoreSymlink "${config.home.homeDirectory}/dotfiles/${path}";
  });

  # Move anything already at a Claude link target into a dated backup folder.
  # It has to run before checkLinkTargets, which refuses to replace them, and
  # cannot use backupFileExtension: a skills/<name>.backup folder would load as
  # a second copy of the skill.
  home.activation.backupClaudeConflicts = lib.hm.dag.entryBefore [ "checkLinkTargets" ] ''
    claudeBackup="$HOME/.claude/dotfiles-backups/$(date -u +%Y%m%dT%H%M%SZ)"
    for path in ${lib.escapeShellArgs claudeLinks}; do
      target="$HOME/$path"
      if [ -L "$target" ] && [[ "$(readlink "$target")" == /nix/store/* ]]; then
        continue
      fi
      if [ -e "$target" ] || [ -L "$target" ]; then
        run mkdir -p "$claudeBackup/$(dirname "$path")"
        run mv "$target" "$claudeBackup/$path"
      fi
    done
  '';

  # settings.json stays a local file: Claude Code writes to it, and it holds
  # machine-only keys. The portable keys are merged in on every switch.
  home.activation.mergeClaudeSettings = lib.hm.dag.entryAfter [ "linkGeneration" ] ''
    run env JQ=${pkgs.jq}/bin/jq ${pkgs.bash}/bin/bash ${../claude/merge-settings.sh} ${../claude/settings.json}
  '';
}
