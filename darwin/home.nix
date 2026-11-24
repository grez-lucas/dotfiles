{ config, pkgs, ... }:
{
  home.stateVersion = "25.05";

  # No compilers here: xcodebuild must use Apple's clang, not one from Nix.
  home.packages = with pkgs; [
    tmux git gh go nodejs_22 aria2 xcodes cocoapods
    neovim ripgrep fd fzf bat
  ];

  # Same rule as on Linux: the installed Go is the only one that runs.
  home.sessionVariables.GOTOOLCHAIN = "local";

  # Claude Code's native installer puts claude here.
  home.sessionPath = [ "$HOME/.local/bin" ];

  programs.zsh.enable = true;

  # Shared with Linux. Outside the store, so TPM can clone plugins beside it.
  xdg.configFile."tmux".source =
    config.lib.file.mkOutOfStoreSymlink "${config.home.homeDirectory}/dotfiles/.config/tmux";
}
