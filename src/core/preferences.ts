import { Engine } from './database'
import { fail } from './errors'
import type {
  LifeIndexServices,
  Preference,
  PreferenceKey,
  PreferenceValues,
  PreferencesSnapshot,
} from './types'
import { integer, iso, object, oneOf, requireValue } from './validation'

export const PREFERENCE_KEYS: readonly PreferenceKey[] = [
  'appearance',
  'weightTarget',
  'lastExportedAt',
  'localNoticeSeen',
]
export function validatePreference<K extends PreferenceKey>(
  key: K,
  value: unknown,
): PreferenceValues[K] {
  oneOf(key, PREFERENCE_KEYS)
  if (key === 'appearance') oneOf(value, ['system', 'light', 'dark'])
  if (key === 'weightTarget' && value !== null) integer(value, 1000, 1000000, 'weightTarget')
  if (key === 'lastExportedAt' && value !== null) iso(value)
  if (key === 'localNoticeSeen') requireValue(typeof value === 'boolean')
  return value as PreferenceValues[K]
}
export async function readPreferences(engine: Engine): Promise<PreferencesSnapshot> {
  const rows = await engine.db.preferences.toArray()
  requireValue(
    rows.length === PREFERENCE_KEYS.length &&
      PREFERENCE_KEYS.every((key) => rows.some((row) => row.key === key)),
  )
  return {
    values: Object.fromEntries(rows.map((row) => [row.key, row.value])) as PreferenceValues,
    revisions: Object.fromEntries(
      rows.map((row) => [row.key, row.revision]),
    ) as PreferencesSnapshot['revisions'],
  }
}
export function preferencesService(engine: Engine): LifeIndexServices['preferences'] {
  return {
    getAll: () => engine.read(() => readPreferences(engine)),
    set: (input, ctx) =>
      engine.write('setPreference', ctx, async () => {
        object(input, ['key', 'value', 'expectedEntityRevision'])
        if (input.key === 'lastExportedAt' && input.value !== null)
          requireValue(iso(input.value) <= engine.now(), 'lastExportedAt')
        const value = validatePreference(input.key, input.value),
          existing = await engine.db.preferences.get(input.key)
        if (!existing) fail('NotFound')
        if (existing.lastCommandId === ctx.commandId) {
          requireValue(existing.value === value)
          return { data: existing as Preference<typeof input.key>, changed: false }
        }
        engine.revision(existing, {
          id: ctx.commandId,
          expectedEntityRevision: input.expectedEntityRevision,
        })
        if (existing.value === value)
          return { data: existing as Preference<typeof input.key>, changed: false }
        if (engine.clock.now() < Date.parse(existing.updatedAt)) fail('ClockChanged')
        const entity = {
          ...existing,
          key: input.key,
          value,
          revision: integer(existing.revision + 1, 1, Number.MAX_SAFE_INTEGER),
          lastCommandId: ctx.commandId,
          updatedAt: engine.now(),
        } as Preference<typeof input.key>
        await engine.db.preferences.put(entity)
        return { data: entity, changed: true }
      }),
  }
}
