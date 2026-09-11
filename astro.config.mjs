import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://muhsin7majeed.github.io',
  base: process.env.BASE_PATH || '/realms',
  output: 'static',
});
