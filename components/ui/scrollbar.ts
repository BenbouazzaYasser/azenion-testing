/**
 * Shared custom scrollbar styling used by every scrollable surface
 * (chat, notifications, etc.). Keep widths, colors and radius identical
 * everywhere so scroll areas feel like one system.
 */
export const SCROLLBAR_CLASSES =
  "[scrollbar-width:thin] [scrollbar-color:rgb(var(--ink-500)/0.6)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ink-500/60 [&::-webkit-scrollbar-track]:bg-transparent";
