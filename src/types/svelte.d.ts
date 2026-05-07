// Ambient declaration so TS accepts `.svelte` imports.
// Real type-checking inside .svelte files is deferred to svelte-check;
// the build-time check happens via vite-plugin-svelte during `vite build`.
declare module '*.svelte' {
  import type { Component } from 'svelte';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component: Component<any>;
  export default component;
}
