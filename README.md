# Starlight `Tabs.astro` evaluated in Node SSR on Vite full reload

Minimal reproduction: editing any MDX file that uses `<Tabs>` from
`@astrojs/starlight/components` puts the dev server into a broken state.
Vite triggers a `program reload`, then errors with
`HTMLElement is not defined` while evaluating Starlight's `Tabs.astro` —
specifically the client `<script>` block at line 146 (`class StarlightTabs
extends HTMLElement`). The dev server stays in this state until restarted.

## Versions

- `astro@6.2.2`
- `@astrojs/starlight@0.38.5`
- `@astrojs/cloudflare@13.3.1`
- `@astrojs/mdx@5.0.4`
- `vite@7.3.1` (transitive)
- Node 22.14, macOS, run with `bun@1.3.13` (also reproduces with `npm`/`pnpm`)

## Reproduce

```sh
bun install
bun run dev
```

Open `http://localhost:4321/` once so the page enters the module graph.
Then edit `src/content/docs/index.mdx` (any change — add a trailing space
to the title, save). The dev server log will print:

```
[watch] src/content/docs/index.mdx
[vite] program reload
[vite] An error happened during full reload
HTMLElement is not defined
ReferenceError: HTMLElement is not defined
    at eval (.../node_modules/@astrojs/starlight/user-components/Tabs.astro:146:42)
    at ESModulesEvaluator.runInlinedModule (.../vite/dist/node/module-runner.js:913:161)
    ...
    at async eval (.../node_modules/@astrojs/starlight/components.ts:6:1)
```

The page in the browser stops responding to further edits until the dev
server is restarted.

## What seems to be happening

`@astrojs/starlight/components.ts` is a barrel that re-exports every user
component, including `Tabs.astro`. Any MDX importing from this barrel
(e.g. just `import { LinkCard } from '@astrojs/starlight/components'`)
pulls the entire barrel — and therefore `Tabs.astro` — into the module
graph.

On MDX edit Vite issues a `program reload` rather than letting Astro's
HMR handle the change incrementally. During that reload Vite's SSR
module runner re-evaluates `Tabs.astro` as a Node module, including the
contents of its client `<script>` block. The script references
`HTMLElement`, which doesn't exist in Node, and the reload aborts.

A first cold start works fine — `<script>` is correctly extracted for
the client bundle. The problem is only on subsequent reloads.

## Notes

- `prerenderEnvironment: 'node'` on the Cloudflare adapter is set in this
  repro because without it the page can't render in dev at all (workerd
  lacks Node compat for some Starlight transitive deps). Whether the bug
  itself depends on that flag is unclear — in a real project that has
  `nodejs_compat` in `wrangler.jsonc`, the same crash occurs without
  the flag.
- The bug does not depend on Svelte, custom Vite plugins, Starlight
  component overrides, `output: 'server'` vs `output: 'static'`, or
  `rehype-external-links` — all bisected away in a real project before
  arriving at this minimum.
- Triggers on edits to *any* MDX in the docs collection that imports
  from `@astrojs/starlight/components` (even via the barrel for an
  unrelated component), as long as Tabs is somewhere in the graph.
