-- Everforest (dark, medium background), with the comment contrast raised.
-- Matches kitty/colors/everforest.conf.
--
-- Upstream sets Comment to grey1 (#859289) on #2D353B, which measures 3.84:1
-- against WCAG's 4.5:1 floor for body text. grey2 (#9DA9A0), from the same
-- palette, is 5.12:1. Italics are dropped for the same reason: thin oblique
-- strokes are the hardest thing to read at low contrast.
local comment_fg = "#9DA9A0"

return {
  {
    "sainnhe/everforest",
    lazy = false,
    priority = 1000,
    init = function()
      -- The colorscheme reads these globals when it loads, so they must be
      -- set before LazyVim applies it.
      vim.g.everforest_background = "medium"
      vim.g.everforest_disable_italic_comment = 1
      vim.g.everforest_better_performance = 1

      -- Must be an autocmd, not a bare call: the colorscheme loads after the
      -- plugin spec is read and would otherwise clobber these.
      vim.api.nvim_create_autocmd("ColorScheme", {
        pattern = "everforest",
        group = vim.api.nvim_create_augroup("everforest_overrides", { clear = true }),
        callback = function()
          vim.api.nvim_set_hl(0, "Comment", { fg = comment_fg })
          vim.api.nvim_set_hl(0, "@comment", { link = "Comment" })
          vim.api.nvim_set_hl(0, "@comment.documentation", { link = "Comment" })
          vim.api.nvim_set_hl(0, "@lsp.type.comment", { link = "Comment" })
          vim.api.nvim_set_hl(0, "LspInlayHint", { fg = "#83C092" })
        end,
      })
    end,
  },
  {
    "LazyVim/LazyVim",
    opts = {
      colorscheme = "everforest",
    },
  },
}
