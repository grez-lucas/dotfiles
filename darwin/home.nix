{ config, pkgs, ... }:
{
  home.stateVersion = "25.05";

  # No compilers here: xcodebuild must use Apple's clang, not one from Nix.
  home.packages = with pkgs; [
    tmux git gh go nodejs_22 aria2 xcodes cocoapods
    neovim ripgrep fd fzf bat
    btop
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
}
