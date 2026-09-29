import { test, expect, type Browser, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { buildInventory, environment } from './artifacts'
import { createFixture, seedFixture, databaseDigest } from './fixtures'
import { installProbe } from './probe'
import { BACKUP_TABLES, validateBackupDocument } from '../../src/core/backup-schema'
import {
  budgets,
  browserOptions,
  entryNames,
  fixtureVersion,
  groups,
  protocolVersion,
  regions,
  seed,
  type Dataset,
  type Editor,
  type Metric,
  type Sample,
} from './protocol'

const saveJson = (path: string, value: unknown) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
const log = (event: string, context: Record<string, string | number | boolean>) =>
  console.info(`[LifeIndex performance] ${event}`, context)
const failureCodes = new Set([
  'ActivationTargetUnreachable',
  'KeyboardTargetUnreachable',
  'TimezoneMismatch',
  'EmptyFixtureAlreadyInitialized',
  'FixtureLoadedApplicationResources',
  'FixtureDatabaseCountMismatch',
  'KeyboardDidNotEditMainField',
  'CancelModifiedDatabase',
  'CalendarDayChangedDuringSample',
  'FixtureOpenFailed',
  'FixtureTransactionFailed',
  'DatabaseReadFailed',
])

/** A coordinate tap cannot silently scroll an unreachable entry into view. */
async function tap(page: Page, selector: string, text?: string) {
  const point = await page.evaluate(
    ({ selector, text }) => {
      const nodes = [...document.querySelectorAll<HTMLElement>(selector)]
      const node = nodes.find((item) => !text || item.textContent?.trim() === text)
      if (!node) return null
      const rect = node.getBoundingClientRect()
      if (
        rect.x < 0 ||
        rect.y < 0 ||
        rect.bottom > innerHeight + 0.5 ||
        rect.right > innerWidth + 0.5 ||
        rect.width < 44 ||
        rect.height < 44 ||
        node.matches(':disabled') ||
        node.closest('[inert]')
      )
        return null
      const x = rect.x + rect.width / 2,
        y = rect.y + rect.height / 2,
        hit = document.elementFromPoint(x, y)
      return hit && (hit === node || node.contains(hit)) ? { x, y } : null
    },
    { selector, text },
  )
  if (!point) throw new Error('ActivationTargetUnreachable')
  await page.touchscreen.tap(point.x, point.y)
}

async function keyboardActivate(page: Page, selector: string, text?: string) {
  for (let step = 0; step < 20; step++) {
    if (
      await page.evaluate(
        ({ selector, text }) =>
          !!document.activeElement?.matches(selector) &&
          (!text || document.activeElement.textContent?.trim() === text),
        { selector, text },
      )
    ) {
      await page.keyboard.press('Enter')
      return
    }
    await page.keyboard.press('Tab')
  }
  throw new Error('KeyboardTargetUnreachable')
}

async function sample(
  browser: Browser,
  options: {
    dataset: Dataset
    editor: Editor
    repetition: number
    order: number
    baseURL: string
    output: string
    observation?: 'normal-motion' | 'keyboard'
  },
): Promise<Sample> {
  const result: Sample = {
    order: options.order,
    group: `${options.dataset}-${options.editor}`,
    dataset: options.dataset,
    editor: options.editor,
    repetition: options.repetition,
    startedAt: new Date().toISOString(),
    baseDate: null,
    capturedAt: null,
    status: 'failed',
    failure: null,
    stage: 'context',
    metrics: { fcp: null, ready: null, chooser: null, editor: null },
    probe: null,
    preparationRequests: [],
    responseEncodings: {},
    fixtureCounts: {},
    keyboardChangedValue: false,
    cancelPreservedDatabase: false,
    databaseDigest: null,
    screenshot: null,
  }
  const sampleName = `${String(options.order).padStart(2, '0')}-${result.group}-${options.repetition}${options.observation ? `-${options.observation}` : ''}`
  const context = await browser.newContext({
    ...browserOptions,
    reducedMotion: options.observation === 'normal-motion' ? 'no-preference' : 'reduce',
  })
  const page = await context.newPage()
  let preparing = true
  page.on('request', (request) => {
    if (preparing) result.preparationRequests.push(new URL(request.url()).pathname)
  })
  page.on('response', (response) => {
    result.responseEncodings[new URL(response.url()).pathname] =
      response.headers()['content-encoding'] ?? 'identity'
  })
  log('sample.started', {
    order: options.order,
    group: result.group,
    repetition: options.repetition,
    observation: options.observation ?? 'budget',
  })
  try {
    // The context has no cache, storage or SW. CPU throttling precedes even the setup navigation.
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    result.stage = 'fixture-preparation'
    const blankURL = new URL('__lifeindex-v4-perf-blank__', options.baseURL).href
    await page.route(blankURL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><meta charset="utf-8"><title>Synthetic fixture preparation</title>',
      }),
    )
    await page.goto(blankURL, { waitUntil: 'load' })
    const clock = await page.evaluate(() => {
      const now = new Date()
      return {
        capturedAt: now.toISOString(),
        baseDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
        offset: -now.getTimezoneOffset(),
      }
    })
    if (clock.offset !== 480) throw new Error('TimezoneMismatch')
    result.baseDate = clock.baseDate
    result.capturedAt = clock.capturedAt
    const fixture = createFixture(options.dataset, clock.baseDate, clock.capturedAt)
    result.fixtureCounts = fixture.counts
    // Validate the synthetic rows with the same strict, reference-aware contract as a future V4 backup.
    validateBackupDocument({
      format: 'lifeindex-v4-backup',
      formatVersion: 1,
      schemaVersion: 1,
      appVersion: '4.0.0',
      exportedAt: clock.capturedAt,
      source: { utcOffsetMinutes: 480, locale: 'zh-CN' },
      counts: Object.fromEntries(BACKUP_TABLES.map((key) => [key, fixture.tables[key].length])),
      data: Object.fromEntries(BACKUP_TABLES.map((key) => [key, fixture.tables[key]])),
    })
    if (options.dataset !== 'F0') await seedFixture(page, fixture)
    else if ((await page.evaluate(() => indexedDB.databases())).length !== 0)
      throw new Error('EmptyFixtureAlreadyInitialized')
    if (
      result.preparationRequests.length !== 1 ||
      result.preparationRequests[0] !== new URL(blankURL).pathname
    )
      throw new Error('FixtureLoadedApplicationResources')
    await page.unroute(blankURL)
    await context.addInitScript(installProbe, {
      editor: options.editor,
      expected: fixture.expected,
      regionNames: regions,
    })
    preparing = false
    result.stage = 'ready'
    await page.goto(new URL('#/today', options.baseURL).href, { waitUntil: 'commit' })
    await page.waitForFunction(() => typeof window.__v4Performance?.ready === 'number', undefined, {
      timeout: 10_000,
    })
    // No screenshots, database reads, hover or intentional idle occur between ready and first editor.
    const activate = options.observation === 'keyboard' ? keyboardActivate : tap
    result.stage = 'chooser'
    await activate(page, '[data-focus-key="compose:mobile"]')
    await page.waitForFunction(
      () => typeof window.__v4Performance?.chooser === 'number',
      undefined,
      {
        timeout: 10_000,
      },
    )
    result.stage = 'editor'
    await activate(page, '.composer-option', entryNames[options.editor])
    await page.waitForFunction(
      () => typeof window.__v4Performance?.editor === 'number',
      undefined,
      {
        timeout: 10_000,
      },
    )
    result.stage = 'actual-input-and-cancel'
    const before = await databaseDigest(page)
    if (JSON.stringify(before.counts) !== JSON.stringify(fixture.counts))
      throw new Error('FixtureDatabaseCountMismatch')
    // Actual key events prove focus belonged to the application before the test types anything.
    const input = page.locator('dialog[open] .record-editor input[data-initial-focus]')
    const value = { expense: '12.34', weight: '65.123', activity: '27' }[options.editor]
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.type(value)
    result.keyboardChangedValue = (await input.inputValue()) === value
    if (!result.keyboardChangedValue) throw new Error('KeyboardDidNotEditMainField')
    const screenshotPath = resolve(options.output, `${sampleName}.png`)
    await page.screenshot({ path: screenshotPath })
    result.screenshot = relative(options.output, screenshotPath)
    await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click()
    await page
      .getByRole('dialog')
      .last()
      .getByRole('button', { name: '放弃修改', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    const after = await databaseDigest(page)
    result.databaseDigest = after.digest
    result.cancelPreservedDatabase = before.digest === after.digest
    if (!result.cancelPreservedDatabase) throw new Error('CancelModifiedDatabase')
    const finalDay = await page.evaluate(() => {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    })
    if (finalDay !== result.baseDate) throw new Error('CalendarDayChangedDuringSample')
    result.stage = 'completed'
    result.status = 'passed'
  } catch (error) {
    // Only fixed harness codes are recorded. Browser exceptions may include page content and are never logged.
    const message = error instanceof Error ? error.message : ''
    result.failure = failureCodes.has(message) ? message : 'StageDidNotComplete'
    log('sample.failed', { order: options.order, group: result.group, stage: result.stage })
  } finally {
    try {
      const collected = await page.evaluate(() => {
        const probe = window.__v4Performance
        if (!probe) return null
        probe.resources = performance.getEntriesByType('resource').map((entry) => {
          const resource = entry as PerformanceResourceTiming
          return {
            name: new URL(resource.name).pathname,
            initiatorType: resource.initiatorType,
            startTime: resource.startTime,
            responseEnd: resource.responseEnd,
            duration: resource.duration,
            transferSize: resource.transferSize,
            encodedBodySize: resource.encodedBodySize,
            decodedBodySize: resource.decodedBodySize,
          }
        })
        return {
          probe,
          rawPaint: performance.getEntriesByType('paint').map((entry) => entry.toJSON()),
          navigation: performance.getEntriesByType('navigation').map((entry) => entry.toJSON()),
          userAgent: navigator.userAgent,
          devicePixelRatio,
          appVersion: document
            .querySelector('[data-app-version]')
            ?.getAttribute('data-app-version'),
          serviceWorkerControlled: !!navigator.serviceWorker.controller,
        }
      })
      if (collected) {
        result.probe = collected.probe
        const probe = result.probe
        result.metrics = {
          fcp: probe.fcp,
          ready: probe.ready,
          chooser:
            probe.chooser !== null && probe.chooserStart !== null
              ? probe.chooser - probe.chooserStart
              : null,
          editor:
            probe.editor !== null && probe.editorStart !== null
              ? probe.editor - probe.editorStart
              : null,
        }
        if (
          collected.serviceWorkerControlled ||
          collected.appVersion !== '4.0.0' ||
          Object.values(result.metrics).some((metric) => metric === null || metric <= 0)
        ) {
          result.status = 'failed'
          result.failure ??= 'InvalidMeasurementEvidence'
        }
        saveJson(resolve(options.output, `${sampleName}-timing.json`), collected)
      }
      if (!result.screenshot) {
        const path = resolve(options.output, `${sampleName}-failure.png`)
        await page.screenshot({ path })
        result.screenshot = relative(options.output, path)
      }
    } catch {
      result.status = 'failed'
      result.failure ??= 'EvidenceCaptureFailed'
    }
    saveJson(resolve(options.output, `${sampleName}.json`), result)
    await context.close()
    log('sample.finished', { order: options.order, group: result.group, status: result.status })
  }
  return result
}

function summarize(samples: Sample[]) {
  return groups.map(({ dataset, editor }) => {
    const rows = samples.filter((row) => row.dataset === dataset && row.editor === editor)
    const metrics = Object.fromEntries(
      (['fcp', 'ready', 'chooser', 'editor'] as Metric[]).map((metric) => {
        const values = rows.map((row) => row.metrics[metric])
        const complete = values.length === 7 && values.every((value) => value !== null && value > 0)
        const numbers = values
          .filter((value): value is number => value !== null)
          .sort((a, b) => a - b)
        const limit =
          metric === 'ready' && dataset === 'F3' ? budgets.longHistoryReady : budgets[metric]
        // Missing samples never become zeros or a smaller, deceptively favourable median.
        const median = complete ? numbers[3] : null
        return [
          metric,
          {
            values,
            min: numbers.length ? numbers[0] : null,
            max: numbers.length ? numbers.at(-1) : null,
            median,
            limit,
            passed: median !== null && median <= limit,
          },
        ]
      }),
    )
    return {
      group: `${dataset}-${editor}`,
      sampleCount: rows.length,
      failedSamples: rows.filter((row) => row.status === 'failed').map((row) => row.order),
      dateConsistent: new Set(rows.map((row) => row.baseDate)).size === 1,
      metrics,
    }
  })
}

test('V4 frozen production protocol: 49 independent cold samples and separate observations', async ({
  browser,
}, testInfo) => {
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`
  const output = resolve('test-results/v4-performance', runId)
  mkdirSync(output, { recursive: true })
  const build = buildInventory()
  const origin = process.env.LIFEINDEX_V4_PERF_URL ?? `http://127.0.0.1:4190${build.basePath}`
  const baseURL = origin.endsWith('/') ? origin : `${origin}/`
  if (new URL(baseURL).pathname !== build.basePath) throw new Error('BuildBasePathMismatch')
  if (testInfo.config.workers !== 1 || testInfo.project.retries !== 0)
    throw new Error('InvalidRunnerConfiguration')
  const metadata = {
    schemaVersion: 1,
    runId,
    protocolVersion,
    fixtureVersion,
    seed,
    budgetVersion: budgets.version,
    budgets,
    environment: environment(),
    browser: { version: browser.version(), ...browserOptions, cpuRate: 4, networkThrottle: 'none' },
    baseURL,
    build,
    samplingOrder: 'F0 expense/weight/activity; F1 expense/weight/activity; F3 expense; seven each',
    exclusions: [],
    buildProvenance:
      process.env.LIFEINDEX_V4_PERF_BUILD_LABEL ?? 'coordinator-built-dist; label-not-provided',
  }
  saveJson(resolve(output, 'environment.json'), metadata)
  log('run.started', { runId, plannedBudgetSamples: 49, observations: 2 })
  const samples: Sample[] = []
  for (const group of groups) {
    for (let repetition = 1; repetition <= 7; repetition++) {
      samples.push(
        await sample(browser, {
          ...group,
          repetition,
          order: samples.length + 1,
          baseURL,
          output,
        }),
      )
      // Persist after every attempt, so interruption cannot silently discard the slow or failed prefix.
      saveJson(resolve(output, 'samples.json'), samples)
    }
  }
  const observations: Sample[] = []
  for (const observation of ['normal-motion', 'keyboard'] as const)
    observations.push(
      await sample(browser, {
        dataset: 'F1',
        editor: 'expense',
        repetition: 1,
        order: 50 + observations.length,
        baseURL,
        output,
        observation,
      }),
    )
  const summary = summarize(samples)
  const finalBuild = buildInventory()
  const artifactGate = {
    javascript:
      build.totals.javascriptGzip + build.totals.inlineScriptGzip <= budgets.javascriptGzip,
    css: build.totals.cssGzip <= budgets.cssGzip,
    unusualScripts: build.unusualScripts.length === 0,
    precacheObserved: build.precache.length > 0,
    unchangedBuild: finalBuild.buildHash === build.buildHash,
  }
  const passed =
    samples.length === 49 &&
    samples.every((row) => row.status === 'passed') &&
    observations.every((row) => row.status === 'passed') &&
    summary.every(
      (group) =>
        group.dateConsistent && Object.values(group.metrics).every((metric) => metric.passed),
    ) &&
    Object.values(artifactGate).every(Boolean)
  const report = {
    ...metadata,
    finishedAt: new Date().toISOString(),
    finalEnvironment: environment(),
    finalBuildHash: finalBuild.buildHash,
    passed,
    samples,
    observations,
    summary,
    artifactGate,
    resourceGroups: samples.map((row) => {
      const resources = row.probe?.resources ?? []
      const ready = row.probe?.ready ?? 0
      const interaction = row.probe?.chooserStart ?? Infinity
      return {
        order: row.order,
        beforeReady: resources.filter((resource) => resource.startTime <= ready),
        firstInteractionNew: resources.filter((resource) => resource.startTime >= interaction),
        transferBytes: resources.reduce((sum, resource) => sum + resource.transferSize, 0),
        encodedBodyBytes: resources.reduce((sum, resource) => sum + resource.encodedBodySize, 0),
        decodedBodyBytes: resources.reduce((sum, resource) => sum + resource.decodedBodySize, 0),
        chooserToTypeEventGap:
          row.probe?.editorStart !== null && row.probe?.chooser !== null && row.probe
            ? row.probe.editorStart! - row.probe.chooser!
            : null,
      }
    }),
    manualReviewRequired: [
      'late-font geometry and screenshots',
      'extreme samples; no outlier deletion',
      'physical iPhone remains unverified',
    ],
  }
  saveJson(resolve(output, 'report.json'), report)
  await testInfo.attach('complete-performance-report', {
    path: resolve(output, 'report.json'),
    contentType: 'application/json',
  })
  log('run.finished', { runId, passed, samples: samples.length })
  expect(
    passed,
    `Frozen performance contract failed; preserve complete report at ${relative(process.cwd(), output)}/report.json`,
  ).toBe(true)
})
