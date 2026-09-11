import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://muhsi.in',
  base: process.env.BASE_PATH || '/',
  output: 'static',
});
