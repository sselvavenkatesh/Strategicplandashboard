import {copyFileSync} from 'node:fs';
// A non-index HTML file gives proxy hosts a stable shell without directory redirects.
copyFileSync(new URL('../dist/strategic-plan/demo/index.html', import.meta.url), new URL('../dist/strategic-plan-demo.html', import.meta.url));
