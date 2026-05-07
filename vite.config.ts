import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [
    svelte(),
    viteStaticCopy({
      targets: [
        { src: 'module.json', dest: '.' },
        { src: 'src/lang/**/*', dest: 'lang' },
        { src: 'templates/**/*', dest: 'templates' },
        { src: 'styles/**/*', dest: 'styles' },
      ],
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/module.ts'),
      formats: ['es'],
      fileName: () => 'module.js',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'module.js',
      },
    },
  },
});
