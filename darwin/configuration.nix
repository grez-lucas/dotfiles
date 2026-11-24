{ pkgs, ... }:
{
  nixpkgs.hostPlatform = "aarch64-darwin";

  # Determinate Nix owns the Nix install, its daemon and nix.conf.
  nix.enable = false;

  system.primaryUser = "luken";
  system.stateVersion = 6;
  users.users.luken.home = "/Users/luken";

  # Writes /etc/zshenv, so Nix's paths reach every zsh, "ssh mac <cmd>" included.
  programs.zsh.enable = true;
}
