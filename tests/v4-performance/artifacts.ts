import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve, relative, extname } from 'node:path'
import os from 'node:os'
import { gzipSync } from 'node:zlib'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const safeCommand = (command: string, args: string[]) => {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

export function environment() {
  const battery = os.platform() === 'darwin' ? safeCommand('pmset', ['-g', 'batt']) : null
  const status = safeCommand('git', ['status', '--porcelain', '--untracked-files=normal'])
  return {
    capturedAt: new Date().toISOString(),
    commit: safeCommand('git', ['rev-parse', 'HEAD']),
    dirty: status === null ? null : status.length > 0,
    changedPathCount: status === null ? null : status.split('\n').filter(Boolean).length,
    node: process.version,
    packageManager: safeCommand('pnpm', ['--version']),
    playwright: (require('@playwright/test/package.json') as { version: string }).version,
    machine: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      model: os.platform() === 'darwin' ? safeCommand('sysctl', ['-n', 'hw.model']) : null,
      cpu: os.cpus()[0]?.model ?? null,
      logicalCores: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
      freeMemoryBytes: os.freemem(),
      loadAverage: os.loadavg(),
      powerSource: battery?.includes('AC Power')
        ? 'AC'
        : battery?.includes('Battery Power')
          ? 'battery'
          : null,
      batteryPercent: battery?.match(/(\d+)%;/)?.[1] ?? null,
      thermalState: safeCommand('pmset', ['-g', 'therm'])?.includes('No thermal warning')
        ? 'no-warning-reported'
        : null,
      physicalIPhone: false,
    },
  }
}

/** Inventory includes root-level SW and every nested script, not just the main assets directory. */
export function buildInventory(directory = resolve('dist')) {
  const paths: string[] = []
  const walk = (folder: string) => {
    for (const item of readdirSync(folder, { withFileTypes: true })) {
      const path = resolve(folder, item.name)
      if (item.isDirectory()) walk(path)
      else if (item.isFile()) paths.push(path)
      else throw new Error('UnsupportedBuildEntry')
    }
  }
  walk(directory)
  paths.sort()
  const digest = createHash('sha256')
  const files = paths.map((path) => {
    const contents = readFileSync(path),
      name = relative(directory, path).split('\\').join('/'),
      extension = extname(path).toLowerCase()
    digest.update(name).update('\0').update(contents).update('\0')
    const kind = /\.[cm]?js$/.test(name)
      ? 'javascript'
      : extension === '.css'
        ? 'css'
        : /\.(woff2?|ttf|otf)$/.test(name)
          ? 'font'
          : /\.(png|jpe?g|webp|gif|svg|ico)$/.test(name)
            ? 'image'
            : extension === '.webmanifest'
              ? 'manifest'
              : extension === '.html'
                ? 'html'
                : 'other'
    return {
      name,
      kind,
      rawBytes: contents.length,
      gzipBytes: gzipSync(contents).length,
      sha256: createHash('sha256').update(contents).digest('hex'),
      modifiedAt: statSync(path).mtime.toISOString(),
    }
  })
  const html = readFileSync(resolve(directory, 'index.html'), 'utf8')
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map((match) => ({
    source: match[1].match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? null,
    inlineBytes: Buffer.byteLength(match[2]),
    inlineGzipBytes: match[2].trim() ? gzipSync(match[2]).length : 0,
    sha256: createHash('sha256').update(match[2]).digest('hex'),
  }))
  const entry = scripts.find((script) => script.source?.includes('/assets/'))?.source
  if (!entry) throw new Error('ProductionEntryMissing')
  const basePath = entry.slice(0, entry.indexOf('/assets/') + 1)
  const serviceWorker = readFileSync(resolve(directory, 'sw.js'), 'utf8')
  const precache = [
    ...new Set(
      [...serviceWorker.matchAll(/["'`]?\burl["'`]?\s*:\s*["'`]([^"'`]+)["'`]/g)]
        .map((match) => match[1].replace(/^\//, '').replace(basePath.replace(/^\//, ''), ''))
        .filter((name) => files.some((file) => file.name === name)),
    ),
  ]
  const unusualScripts = scripts.filter(
    (script) => script.source && !/\.[cm]?js(?:\?|$)/.test(script.source),
  )
  return {
    buildHash: digest.digest('hex'),
    basePath,
    files,
    totals: {
      rawBytes: files.reduce((sum, file) => sum + file.rawBytes, 0),
      javascriptGzip: files
        .filter((file) => file.kind === 'javascript')
        .reduce((sum, file) => sum + file.gzipBytes, 0),
      cssGzip: files
        .filter((file) => file.kind === 'css')
        .reduce((sum, file) => sum + file.gzipBytes, 0),
      inlineScriptGzip: scripts.reduce((sum, script) => sum + script.inlineGzipBytes, 0),
      precacheRawBytes: files
        .filter((file) => precache.includes(file.name))
        .reduce((sum, file) => sum + file.rawBytes, 0),
    },
    htmlScripts: scripts,
    unusualScripts,
    precache,
    exclusions: files.filter((file) => file.name.endsWith('.map')).map((file) => file.name),
    transferNote:
      'File gzip is a deterministic artifact calculation; actual HTTP encoding is recorded per response.',
  }
}
