# Proxima Nova

Proxima Nova is a commercial, licensed typeface — it isn't available on Google
Fonts and can't be redistributed here. The wordmark ("AZENION" in the navbar,
footer, and anywhere `font-display` is used) is already wired up to use it.

To activate it:

1. Purchase/obtain a **web license** for Proxima Nova (e.g. via Adobe Fonts,
   Fontspring, or directly from Mark Simonson Studio).
2. Export/convert the Semibold (600) and Bold (700) weights to `.woff2`
   (and `.woff` for older-browser fallback).
3. Drop the files in this folder using these exact names, matching the
   `@font-face` rules in `app/globals.css`:
   - `ProximaNova-Semibold.woff2` / `.woff`
   - `ProximaNova-Bold.woff2` / `.woff`

Until those files are added, the wordmark falls back to Inter, which was
chosen specifically because it pairs cleanly with Proxima Nova's proportions —
so the site looks correct either way, just slightly different in the mark.
