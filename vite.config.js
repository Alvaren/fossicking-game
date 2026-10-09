import { defineConfig } from 'vite';

// Relative paths so the built game works from any folder, e.g.
// https://alvaren.github.io/fossicking-game/ on GitHub Pages.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1500 },
});
