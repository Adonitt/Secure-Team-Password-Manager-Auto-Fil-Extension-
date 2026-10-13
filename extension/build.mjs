import { build } from 'esbuild'
import { mkdir, copyFile } from 'node:fs/promises'
await mkdir('dist', { recursive: true })
for (const name of ['background', 'content', 'popup']) {
  await build({ entryPoints: [`src/${name}.ts`], bundle: true, minify: false, format: 'iife',
    platform: 'browser', target: 'chrome120', outfile: `dist/${name}.js` })
}
for (const name of ['manifest.json', 'popup.html', 'popup.css']) await copyFile(name, `dist/${name}`)
