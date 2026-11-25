{ config, pkgs, lib, ... }:
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

  # Everforest ensō wallpaper, applied on every GUI login. NSWorkspace through
  # JXA instead of System Events, so no Automation permission is needed.
  #
  # Not launchd.agents: home-manager bootstraps those into gui/$UID during
  # activation, which fails (and fails the switch) when nobody is logged in at
  # the console, the usual state when rebuilding over ssh. Here activation only
  # installs the plist, and launchd loads it at the next GUI login.
  home.activation.wallpaperAgent =
    let
      label = "local.everforest.wallpaper";
      script = pkgs.writeText "set-wallpaper.js" ''
        ObjC.import("AppKit");
        const url = $.NSURL.fileURLWithPath("${./wallpapers/everforest-enso-3840x2160.jpg}");
        // Fill the screen, cropping the overflow (16:9 image on any panel).
        const opts = $.NSDictionary.dictionaryWithObjectsForKeys(
          [$.NSNumber.numberWithInt($.NSImageScaleProportionallyUpOrDown), $.NSNumber.numberWithBool(true)],
          [$.NSWorkspaceDesktopImageScalingKey, $.NSWorkspaceDesktopImageAllowClippingKey]);
        const screens = $.NSScreen.screens;
        for (let i = 0; i < screens.count; i++) {
          $.NSWorkspace.sharedWorkspace.setDesktopImageURLForScreenOptionsError(
            url, screens.objectAtIndex(i), opts, null);
        }
      '';
      plist = pkgs.writeText "${label}.plist" (lib.generators.toPlist { escape = true; } {
        Label = label;
        # The Determinate Nix store volume can mount after login items start.
        ProgramArguments = [ "/bin/sh" "-c" "/bin/wait4path /nix/store && exec /usr/bin/osascript -l JavaScript ${script}" ];
        RunAtLoad = true;
        LimitLoadToSessionType = "Aqua";
        StandardErrorPath = "${config.home.homeDirectory}/Library/Logs/wallpaper.log";
      });
      dst = "${config.home.homeDirectory}/Library/LaunchAgents/${label}.plist";
    in
    lib.hm.dag.entryAfter [ "writeBoundary" ] ''
      run install -Dm644 ${plist} "${dst}"
      # Apply right away when a GUI session exists; otherwise the next login does.
      if /bin/launchctl print "gui/$UID" >/dev/null 2>&1; then
        run /bin/launchctl bootout "gui/$UID/${label}" 2>/dev/null || true
        run /bin/launchctl bootstrap "gui/$UID" "${dst}" || true
      fi
    '';
}
