// @ts-check
import cloudflare from '@astrojs/cloudflare';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    imageService: 'passthrough',
    // Required so prerender runs in Node (outside workerd) — otherwise the
    // page can't even render in dev because workerd lacks Node compat for
    // some Starlight transitive deps.
    prerenderEnvironment: 'node',
  }),
  integrations: [
    starlight({
      title: 'Repro',
    }),
  ],
});
