import * as esbuild from 'esbuild'
import { promises as fs } from 'fs'
import { dirname, resolve } from 'path'
import matter from 'gray-matter'
import { StringDecoder } from 'string_decoder'
import { compile } from 'xdm'
import xdm from 'xdm/esbuild.js'
import type { Options } from 'xdm/lib/integration/esbuild'
import { rehypeMetaPlugin } from './rehype-meta-plugin'
import { rehypeShikiPlugin } from './rehype-shiki-plugin'
import { remarkExamplePlugin } from './remark-example-plugin'
import { transformCode } from './transform-code.js'

export async function getReadme(directoryPath) {
  const readmePath = `${directoryPath}/README.mdx`
  let readmeContents = null

  try {
    readmeContents = await fs.readFile(readmePath, 'utf-8')
  } catch (error) {
    // Bail if README.mdx not found since it isn't required
    return null
  }

  try {
    const result = matter(readmeContents)
    return {
      data: result.data,
      code: await transformReadme(result.content, readmePath),
    }
  } catch (error) {
    throw Error(`Error parsing README.mdx at "${readmePath}": ${error}`)
  }
}

async function transformReadme(readmeContents, readmePath) {
  const examples = []
  const containsImports = /import [^}]*.*(?=from).*/.test(readmeContents)
  const xdmOptions: Options = {
    providerImportSource: '@mdx-js/react',
    remarkPlugins: [[remarkExamplePlugin, { examples }]],
    rehypePlugins: [
      rehypeMetaPlugin,
      [rehypeShikiPlugin, { theme: resolve(process.cwd(), 'theme/code.json') }],
    ],
  }
  if (containsImports) {
    // If there are imports we need to bundle with esbuild before transforming
    const result = await esbuild.build({
      entryPoints: [readmePath],
      absWorkingDir: dirname(readmePath),
      target: 'esnext',
      format: 'esm',
      bundle: true,
      write: false,
      minify: process.env.NODE_ENV === 'production',
      plugins: [xdm(xdmOptions)],
      external: ['react', 'react-dom', '@mdx-js/react'],
    })
    const bundledReadme = new StringDecoder('utf-8').write(
      Buffer.from(result.outputFiles[0].contents)
    )
    return transformCode(bundledReadme)
  }
  // Otherwise we can simply just compile it with xdm
  const compiledReadme = await compile(
    { path: readmePath, value: readmeContents },
    xdmOptions
  )
  return transformCode(compiledReadme.value)
}