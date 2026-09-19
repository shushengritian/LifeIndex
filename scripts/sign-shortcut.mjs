import { existsSync, mkdtempSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

// Authoring tool only: inputs must be project-owned public templates, never exported personal shortcuts.
// Signing 'anyone' uses Apple's service; no third-party signer or installer is invoked.
const [sourceArgument, outputArgument] = process.argv.slice(2)
function fail(reason) {
  console.error(`[LifeIndex shortcut] ${reason}`)
  process.exit(1)
}
if (process.platform !== 'darwin') fail('Signing requires macOS.')
if (!sourceArgument || !outputArgument)
  fail('Usage: node scripts/sign-shortcut.mjs source.xml output.shortcut')
const source = resolve(sourceArgument)
const output = resolve(outputArgument)
if (!existsSync(source)) fail('Input does not exist.')
if (!output.endsWith('.shortcut')) fail('Output must use the .shortcut extension.')
if (existsSync(output)) fail('Output already exists; choose a new candidate filename.')

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 120_000 })
  // Do not print parsed template contents or system-service diagnostics containing arbitrary payloads.
  if (result.error || result.status !== 0)
    fail(`Command failed: ${command}. No successful artifact is claimed.`)
  return result.stdout
}
console.info('[LifeIndex shortcut] Validating template metadata.')
const template = JSON.parse(run('/usr/bin/plutil', ['-convert', 'json', '-o', '-', source]))
if (!Array.isArray(template.WFWorkflowActions) || !template.WFWorkflowActions.length)
  fail('Template must contain actions.')
for (const field of ['WFWorkflowClientVersion', 'WFWorkflowMinimumClientVersionString']) {
  if (typeof template[field] !== 'string' || !template[field]) fail(`Missing metadata: ${field}.`)
}
if (
  !Number.isInteger(template.WFWorkflowMinimumClientVersion) ||
  typeof template.WFWorkflowHasOutputFallback !== 'boolean' ||
  !Array.isArray(template.WFWorkflowOutputContentItemClasses)
)
  fail('Incomplete workflow metadata.')

// macOS 15.2 rejected the same plist under .xml; normalized XML with a .shortcut filename was verified.
// Keep scratch input for diagnosis, rather than issuing a recursive cleanup command.
const scratch = mkdtempSync(join(tmpdir(), 'lifeindex-shortcut-sign-'))
const normalized = join(scratch, 'unsigned.shortcut')
run('/usr/bin/plutil', ['-convert', 'xml1', '-o', normalized, source])
console.info('[LifeIndex shortcut] Signing public candidate with Apple.')
run('/usr/bin/shortcuts', ['sign', '--mode', 'anyone', '--input', normalized, '--output', output])
if (!existsSync(output) || statSync(output).size === 0)
  fail('Signer returned without a non-empty output.')
console.info(
  '[LifeIndex shortcut] Signed artifact created. Import and device behavior remain unverified.',
)
